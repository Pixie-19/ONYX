'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Github, Search, Lock, Globe, Star, GitFork, Loader2, X, Check,
  AlertCircle, RefreshCw, GitBranch, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Separator } from '@/components/ui/Separator';
import { useOnyx } from '@/lib/store';
import { cn, fmtRelativeTime } from '@/lib/format';
import {
  connectRemoteWorkspaceApi,
  listGithubRepositoriesApi,
  syncGithubApi,
  type NormalizedGithubRepo,
} from '@/lib/workspace';

/**
 * RepoBrowserModal
 *
 * Linear/Vercel-style picker. Lists every repository the authenticated
 * user can access (public + private when `repo` scope is granted), with
 * server-side search, infinite scroll and skeleton hydration.
 *
 * Selecting a repository registers it as a remote-only ONYX workspace
 * (synthetic `github://owner/repo` path) and immediately kicks off a
 * commit/branch/PR sync.
 *
 * The modal renders nothing when `open` is false; all in-flight requests
 * are aborted when the user closes mid-fetch so we never set state on an
 * unmounted tree.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected?: (workspaceId: string) => void;
}

const PER_PAGE = 30;

export function RepoBrowserModal({ open, onClose, onConnected }: Props) {
  const { status: authStatus } = useSession();
  const workspaces = useOnyx((s) => s.workspaces);
  const setActive = useOnyx((s) => s.setActiveWorkspace);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [repos, setRepos] = useState<NormalizedGithubRepo[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string; retry_at?: number | null } | null>(null);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Already-attached remote workspaces — we annotate the list rows with this.
  const attachedFullNames = useMemo(() => {
    const set = new Set<string>();
    for (const w of workspaces) {
      if (!w.path?.startsWith('github://')) continue;
      const slug = w.path.slice('github://'.length);
      if (slug) set.add(slug.toLowerCase());
    }
    return set;
  }, [workspaces]);

  // ── debounce search input (250ms) ─────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // ── focus input on open ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // ── escape closes ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !connectingId) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, connectingId]);

  // ── fetch on (open || search change), reset list ──────────────────────
  const load = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      if (authStatus !== 'authenticated') return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (mode === 'replace') setLoading(true);
      else setLoadingMore(true);
      setError(null);
      const res = await listGithubRepositoriesApi({
        search: debounced || undefined,
        page: nextPage,
        per_page: PER_PAGE,
        sort: 'updated',
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      if (res.error) {
        setError({ message: res.error, code: res.code, retry_at: res.rate_limit_reset });
        if (mode === 'replace') setRepos([]);
      } else {
        setRepos((prev) => {
          const incoming = res.repositories ?? [];
          if (mode === 'replace') return incoming;
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...incoming.filter((r) => !seen.has(r.id))];
        });
        setHasNext(!!res.has_next);
        setRateLimitRemaining(res.rate_limit_remaining ?? null);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [authStatus, debounced],
  );

  useEffect(() => {
    if (!open) return;
    setPage(1);
    void load(1, 'replace');
  }, [open, debounced, load]);

  // ── infinite scroll sentinel ──────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const root = scrollRef.current ?? null;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && hasNext && !loading && !loadingMore && !error) {
            const next = page + 1;
            setPage(next);
            void load(next, 'append');
            break;
          }
        }
      },
      { root, rootMargin: '200px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [open, hasNext, loading, loadingMore, error, page, load]);

  // ── cleanup on close ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    setSearch('');
    setDebounced('');
    setRepos([]);
    setPage(1);
    setError(null);
    setLoading(false);
    setLoadingMore(false);
    setConnectingId(null);
  }, [open]);

  const handleConnect = async (repo: NormalizedGithubRepo) => {
    if (connectingId) return;
    setConnectingId(repo.id);
    try {
      const ws = await connectRemoteWorkspaceApi({
        owner: repo.owner.login,
        repo: repo.name,
        name: repo.full_name,
        default_branch: repo.default_branch,
        language: repo.language,
        description: repo.description,
        visibility: repo.visibility,
        html_url: repo.html_url,
        ssh_url: repo.ssh_url,
        clone_url: repo.clone_url,
        avatar_url: repo.owner.avatar_url,
        stars: repo.stargazers_count,
      });
      setActive(ws.id);
      toast.success('Repository connected', {
        description: `${repo.full_name} · syncing commits…`,
      });
      // Kick off background sync — non-blocking, status streams via WS.
      void syncGithubApi(ws.id).then((r) => {
        if (r.ok) {
          toast.success('Repository synced', {
            description: `${repo.full_name} · ${r.indexed ?? 0} commit${r.indexed === 1 ? '' : 's'} indexed`,
          });
        } else if (r.error) {
          toast.error('Sync failed', { description: r.error });
        }
      });
      onConnected?.(ws.id);
      onClose();
    } catch (err: any) {
      toast.error('Connect failed', { description: err?.message ?? String(err) });
    } finally {
      setConnectingId(null);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => { if (!connectingId) onClose(); }}
        className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[1px]"
      />
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.16 }}
        role="dialog"
        aria-modal="true"
        aria-label="Connect GitHub repository"
        className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="bg-surface-raised border border-line rounded-xl shadow-2xl w-full max-w-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[80vh]">
          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="px-5 py-3.5 flex items-center gap-3 border-b border-line">
            <div className="w-8 h-8 rounded-md bg-surface-sunken flex items-center justify-center">
              <Github size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-primary leading-tight">
                Connect a GitHub repository
              </div>
              <div className="text-[11.5px] text-tertiary leading-tight mt-0.5">
                {authStatus === 'authenticated'
                  ? 'Pick any repository from your account to monitor in ONYX'
                  : 'Sign in to GitHub to browse your repositories'}
              </div>
            </div>
            {rateLimitRemaining !== null && authStatus === 'authenticated' && (
              <Badge tone="muted" dot={false}>
                {rateLimitRemaining} api calls left
              </Badge>
            )}
            <button
              onClick={onClose}
              disabled={!!connectingId}
              className="p-1.5 hover:bg-surface-sunken rounded-md transition disabled:opacity-50"
              aria-label="close"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Auth gate ───────────────────────────────────────────── */}
          {authStatus !== 'authenticated' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-surface-sunken flex items-center justify-center">
                <Github size={20} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-primary">Sign in with GitHub</p>
                <p className="text-[12px] text-secondary mt-1 max-w-sm mx-auto leading-relaxed">
                  ONYX needs OAuth access to list your repositories. We never store your token in the browser.
                </p>
              </div>
              <button
                onClick={() => signIn('github', { callbackUrl: typeof window !== 'undefined' ? window.location.href : '/' })}
                disabled={authStatus === 'loading'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#4338CA] text-white text-sm font-medium rounded-md hover:bg-[#4338CA]/90 transition disabled:opacity-50"
              >
                {authStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
                {authStatus === 'loading' ? 'Loading…' : 'Continue with GitHub'}
              </button>
            </div>
          )}

          {/* ── Search bar (auth only) ───────────────────────────────── */}
          {authStatus === 'authenticated' && (
            <>
              <div className="px-5 py-2.5 border-b border-line flex items-center gap-2">
                <Search size={14} className="text-tertiary shrink-0" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search repositories…"
                  className="flex-1 bg-transparent outline-none text-[13px] text-primary placeholder:text-tertiary"
                />
                {loading && <Loader2 size={13} className="animate-spin text-tertiary" />}
                <button
                  onClick={() => { setPage(1); void load(1, 'replace'); }}
                  className="p-1 hover:bg-surface-sunken rounded transition text-tertiary"
                  aria-label="refresh"
                  disabled={loading}
                >
                  <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
                </button>
              </div>

              {/* ── List body ────────────────────────────────────────── */}
              <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
                {/* Initial loading skeletons */}
                {loading && repos.length === 0 && (
                  <div className="p-2 space-y-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-md">
                        <Skeleton className="w-7 h-7 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-1/3" />
                          <Skeleton className="h-2.5 w-2/3" />
                        </div>
                        <Skeleton className="h-3 w-12" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Error state */}
                {error && !loading && (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-10 h-10 mx-auto rounded-full bg-[#FEF2F2] dark:bg-red-500/10 flex items-center justify-center">
                      <AlertCircle size={16} className="text-[#B91C1C] dark:text-red-300" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-primary">
                        {error.code === 'RATE_LIMITED' ? 'GitHub rate limit hit' :
                          error.code === 'TOKEN_INVALID' ? 'GitHub token rejected' :
                          'Could not load repositories'}
                      </p>
                      <p className="text-[12px] text-secondary mt-1 max-w-sm mx-auto break-words">
                        {error.message}
                      </p>
                      {error.code === 'RATE_LIMITED' && error.retry_at && (
                        <p className="text-[11.5px] text-tertiary mt-1">
                          retry {fmtRelativeTime(error.retry_at)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => { setPage(1); void load(1, 'replace'); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-line hover:bg-surface-sunken transition"
                    >
                      <RefreshCw size={11} /> Retry
                    </button>
                  </div>
                )}

                {/* Empty state */}
                {!loading && !error && repos.length === 0 && (
                  <div className="p-10 text-center">
                    <div className="text-[12.5px] text-secondary">
                      {debounced
                        ? `No repositories matching "${debounced}".`
                        : 'No repositories found on this GitHub account.'}
                    </div>
                  </div>
                )}

                {/* Result rows */}
                {repos.length > 0 && (
                  <div className="p-1.5">
                    {repos.map((r) => {
                      const attached = attachedFullNames.has(r.full_name.toLowerCase());
                      const connecting = connectingId === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => !attached && !connectingId && handleConnect(r)}
                          disabled={attached || !!connectingId}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition group',
                            attached
                              ? 'bg-[#ECFDF5]/40 dark:bg-emerald-400/5 cursor-default'
                              : connecting
                                ? 'bg-surface-sunken cursor-wait'
                                : 'hover:bg-surface-sunken disabled:opacity-50 disabled:cursor-not-allowed',
                          )}
                        >
                          {r.owner.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.owner.avatar_url}
                              alt={r.owner.login}
                              className="w-7 h-7 rounded-full bg-surface-sunken object-cover shrink-0"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-surface-sunken shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-medium text-primary truncate">
                                {r.full_name}
                              </span>
                              {r.private ? (
                                <Lock size={10} className="text-tertiary shrink-0" />
                              ) : (
                                <Globe size={10} className="text-tertiary shrink-0" />
                              )}
                              {r.fork && (
                                <GitFork size={10} className="text-tertiary shrink-0" />
                              )}
                              {r.archived && (
                                <Badge tone="muted" dot={false} className="!h-[16px] !text-[9.5px] !px-1.5">
                                  archived
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-tertiary truncate">
                              {r.language && (
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
                                  {r.language}
                                </span>
                              )}
                              {r.default_branch && (
                                <span className="inline-flex items-center gap-1">
                                  <GitBranch size={10} /> {r.default_branch}
                                </span>
                              )}
                              {r.pushed_at && (
                                <span>updated {fmtRelativeTime(r.pushed_at)}</span>
                              )}
                              {r.stargazers_count > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <Star size={10} /> {r.stargazers_count}
                                </span>
                              )}
                            </div>
                          </div>
                          {attached ? (
                            <Badge tone="ok" dot={false}>
                              <Check size={10} className="-ml-0.5 mr-0.5" /> connected
                            </Badge>
                          ) : connecting ? (
                            <Loader2 size={14} className="animate-spin text-[#4F46E5] shrink-0" />
                          ) : (
                            <span className="text-[11px] text-tertiary opacity-0 group-hover:opacity-100 transition">
                              Connect →
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Sentinel + load-more state */}
                    <div ref={sentinelRef} className="h-6" />
                    {loadingMore && (
                      <div className="py-3 flex items-center justify-center text-[11.5px] text-tertiary gap-2">
                        <Loader2 size={11} className="animate-spin" /> loading more…
                      </div>
                    )}
                    {!hasNext && repos.length > 0 && !loadingMore && (
                      <div className="py-3 text-center text-[11px] text-tertiary">
                        — end of list —
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Footer ──────────────────────────────────────────── */}
              <Separator />
              <div className="px-5 py-2.5 flex items-center justify-between gap-3">
                <span className="text-[11px] text-tertiary">
                  {repos.length > 0 && `${repos.length} repository${repos.length === 1 ? '' : 'ies'}`}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href="https://github.com/settings/developers"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-tertiary hover:text-primary inline-flex items-center gap-1 transition"
                  >
                    Manage OAuth <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
