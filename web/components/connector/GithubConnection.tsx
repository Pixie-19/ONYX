'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Github,
  GitBranch,
  KeyRound,
  Loader2,
  RefreshCw,
  Users,
  GitPullRequest,
  Star,
  GitFork,
  ExternalLink,
  CheckCircle2,
  AlertOctagon,
  Lock,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import {
  githubAuthStatusApi,
  githubClearTokenApi,
  githubRegisterTokenApi,
  githubSyncStatusApi,
  syncGithubApi,
} from '@/lib/workspace';
import { useOnyx } from '@/lib/store';
import { cn, fmtShortTs } from '@/lib/format';
import type { GithubSyncStatus, WorkspaceRow } from '@/lib/types';

function parseRemote(remote: string | null): { owner: string; repo: string; href: string } | null {
  if (!remote) return null;
  const ssh = remote.match(/git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (ssh) return { owner: ssh[1], repo: ssh[2], href: `https://github.com/${ssh[1]}/${ssh[2]}` };
  const https = remote.match(/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?\/?$/);
  if (https) return { owner: https[1], repo: https[2], href: `https://github.com/${https[1]}/${https[2]}` };
  return null;
}

export function GithubConnection({ workspace }: { workspace: WorkspaceRow }) {
  const wsCommits = useOnyx((s) => s.githubCommits);
  const liveStatus = useOnyx((s) => s.githubSync[workspace.id] ?? null);

  const [auth, setAuth] = useState<{
    configured: boolean;
    source: 'runtime' | 'env' | 'none';
    label: string | null;
  } | null>(null);

  const [token, setToken] = useState('');
  const [tokenLabel, setTokenLabel] = useState('');
  const [tokenSubmitting, setTokenSubmitting] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hydratedStatus, setHydratedStatus] = useState<GithubSyncStatus | null>(null);

  const remote = parseRemote(workspace.git_remote);
  const status = liveStatus ?? hydratedStatus;

  useEffect(() => {
    void (async () => {
      try {
        const s = await githubAuthStatusApi();
        setAuth(s);
      } catch {
        /* offline tolerant */
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await githubSyncStatusApi(workspace.id);
      if (!cancelled) setHydratedStatus(s);
    })();
    return () => { cancelled = true; };
  }, [workspace.id]);

  const commitsForRepo = useMemo(() => {
    if (!remote) return [];
    return wsCommits
      .filter((c) => c.workspace_id === workspace.id)
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8);
  }, [wsCommits, workspace.id, remote]);

  const onSync = async () => {
    if (!remote) {
      toast.error('No GitHub remote', { description: 'This workspace has no github.com origin.' });
      return;
    }
    setSyncing(true);
    try {
      const r = await syncGithubApi(workspace.id);
      if (r.ok) {
        toast.success('Sync complete', { description: `${r.indexed ?? 0} commits indexed` });
      } else {
        toast.error('Sync failed', { description: r.error ?? 'unknown error' });
      }
    } finally {
      setSyncing(false);
    }
  };

  const onRegisterToken = async () => {
    if (!token.trim()) return;
    setTokenSubmitting(true);
    try {
      const r = await githubRegisterTokenApi(token.trim(), tokenLabel.trim() || undefined);
      if (r.ok) {
        toast.success('Token registered', { description: tokenLabel || 'github access' });
        setShowTokenInput(false);
        setToken('');
        setTokenLabel('');
        const s = await githubAuthStatusApi();
        setAuth(s);
      } else {
        toast.error('Token rejected', { description: r.error ?? 'unknown' });
      }
    } finally {
      setTokenSubmitting(false);
    }
  };

  const onClearToken = async () => {
    await githubClearTokenApi();
    setAuth({ configured: false, source: 'none', label: null });
    toast.success('Token cleared');
  };

  return (
    <div className="space-y-3">
      {/* ── Header card ── */}
      <div className="rounded-lg border border-line bg-surface-raised p-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#10B98114] text-[#10B981] flex items-center justify-center shrink-0">
            <Github size={14} />
          </div>
          <div className="flex-1 min-w-0">
            {remote ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-primary">
                    {remote.owner}/{remote.repo}
                  </span>
                  <a
                    href={remote.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-tertiary hover:text-[#4F46E5]"
                    title="Open on GitHub"
                  >
                    <ExternalLink size={11} />
                  </a>
                  <StateBadge status={status} syncing={syncing} />
                </div>
                <div className="text-[11.5px] text-tertiary truncate mt-0.5 font-mono">
                  {workspace.git_remote}
                </div>
                {workspace.git_branch && (
                  <div className="inline-flex items-center gap-1 text-[11px] text-[#4F46E5] dark:text-indigo-300 mt-1.5">
                    <GitBranch size={10} /> {workspace.git_branch}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[12.5px] text-secondary">
                No <code className="font-mono">github.com</code> remote detected — initialise a remote
                origin in this workspace to enable connection.
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button
              onClick={onSync}
              disabled={!remote || syncing || status?.state === 'syncing'}
              className="btn btn-accent h-7 px-2.5 text-[11.5px] disabled:opacity-50"
            >
              {syncing || status?.state === 'syncing' ? (
                <>
                  <Loader2 size={11} className="animate-spin" /> syncing…
                </>
              ) : (
                <>
                  <RefreshCw size={11} /> sync
                </>
              )}
            </button>
            <AuthIndicator
              auth={auth}
              onOpen={() => setShowTokenInput((v) => !v)}
              showing={showTokenInput}
            />
          </div>
        </div>
      </div>

      {/* ── Token registration ── */}
      {showTokenInput && (
        <div className="rounded-lg border border-[#4F46E5]/40 bg-[#EEF2FF] dark:bg-indigo-400/10 p-3 space-y-2">
          <div className="flex items-center gap-2 text-[12px] font-medium text-primary">
            <KeyRound size={12} className="text-[#4F46E5]" />
            Register GitHub Personal Access Token
          </div>
          <p className="text-[11.5px] text-secondary leading-relaxed">
            Tokens are held server-side only — never returned to the browser. Required scopes for
            private repos: <code className="font-mono">repo</code>. Generate one at{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noreferrer"
              className="text-[#4F46E5] hover:underline"
            >
              github.com/settings/tokens
            </a>
            .
          </p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_… or github_pat_…"
            className="w-full h-8 px-2 rounded-md border border-line bg-surface-raised text-[12px] font-mono outline-none focus:border-[#4F46E5] focus:shadow-focus"
          />
          <input
            value={tokenLabel}
            onChange={(e) => setTokenLabel(e.target.value)}
            placeholder="label (optional)"
            className="w-full h-8 px-2 rounded-md border border-line bg-surface-raised text-[12px] outline-none focus:border-[#4F46E5]"
          />
          <div className="flex gap-2">
            <button
              onClick={onRegisterToken}
              disabled={!token.trim() || tokenSubmitting}
              className="btn btn-accent h-8 px-2.5 text-[12px] disabled:opacity-50"
            >
              {tokenSubmitting ? <Loader2 size={11} className="animate-spin" /> : <KeyRound size={11} />} register
            </button>
            <button
              onClick={() => { setShowTokenInput(false); setToken(''); }}
              className="btn btn-outline h-8 px-2.5 text-[12px]"
            >
              cancel
            </button>
            {auth?.configured && (
              <button
                onClick={onClearToken}
                className="btn btn-outline h-8 px-2.5 text-[12px] !text-[#B91C1C] !border-[#FCA5A5]"
              >
                clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Repo meta ── */}
      {status?.repo_meta && (
        <div className="rounded-lg border border-line bg-surface-raised p-3 space-y-2">
          {status.repo_meta.description && (
            <p className="text-[12px] text-secondary leading-relaxed">
              {status.repo_meta.description}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-secondary">
            {status.repo_meta.language && <Badge tone="info">{status.repo_meta.language}</Badge>}
            {status.repo_meta.default_branch && (
              <span className="inline-flex items-center gap-1 text-[#4F46E5] dark:text-indigo-300">
                <GitBranch size={10} /> {status.repo_meta.default_branch}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Star size={10} /> {status.repo_meta.stars}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitFork size={10} /> {status.repo_meta.forks}
            </span>
            <span className="inline-flex items-center gap-1">
              <AlertOctagon size={10} /> {status.repo_meta.open_issues} open
            </span>
            {status.repo_meta.topics.slice(0, 4).map((t) => (
              <Badge key={t} tone="muted">#{t}</Badge>
            ))}
            {status.remaining_quota !== null && (
              <span className="ml-auto text-[10.5px] text-tertiary">
                api quota: {status.remaining_quota}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Sync stats ── */}
      {status && status.state !== 'idle' && (
        <div className="grid grid-cols-4 gap-2">
          <Stat icon={<GitBranch size={11} />} label="branches" value={status.branches} />
          <Stat icon={<Users size={11} />} label="contributors" value={status.contributors} />
          <Stat icon={<GitPullRequest size={11} />} label="pull requests" value={status.pulls} />
          <Stat icon={<RefreshCw size={11} />} label="commits indexed" value={status.commits} />
        </div>
      )}

      {/* ── Contributors row ── */}
      {status?.contributors_list && status.contributors_list.length > 0 && (
        <div className="rounded-lg border border-line bg-surface-raised p-3">
          <div className="flex items-center gap-2 mb-2">
            <Users size={11} className="text-tertiary" />
            <span className="text-[11.5px] font-semibold text-primary">Top contributors</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {status.contributors_list.slice(0, 10).map((c) => (
              <a
                key={c.login}
                href={c.html_url ?? '#'}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`${c.login} · ${c.contributions} commits`}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-line hover:border-[#4F46E5] bg-surface-sunken transition"
              >
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[#4F46E5]" />
                )}
                <span className="text-[11px] font-mono text-primary">{c.login}</span>
                <span className="text-[10px] text-tertiary tabular-nums">{c.contributions}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Latest commits ── */}
      {commitsForRepo.length > 0 && (
        <div className="rounded-lg border border-line bg-surface-raised">
          <div className="px-3 py-2 border-b border-line text-[11.5px] font-semibold text-primary">
            Latest commits
          </div>
          <div className="max-h-[200px] overflow-auto">
            {commitsForRepo.map((c) => (
              <div
                key={c.id}
                className="px-3 py-2 border-b border-subtle hover:bg-surface-sunken transition flex items-start gap-2"
              >
                <span className="font-mono text-[10.5px] text-[#4F46E5] dark:text-indigo-300 tabular-nums shrink-0">
                  {c.short_sha}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-primary truncate">{c.message}</div>
                  <div className="text-[10.5px] text-tertiary flex items-center gap-1.5">
                    <span>{c.author ?? 'anon'}</span>
                    <span>·</span>
                    <span>{fmtShortTs(c.ts)}</span>
                    <span>·</span>
                    <span>+{c.additions} −{c.deletions}</span>
                  </div>
                </div>
                {c.risky_score > 0.35 && (
                  <Badge tone={c.risky_score > 0.6 ? 'critical' : 'warn'}>
                    risk {(c.risky_score * 100).toFixed(0)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent PRs ── */}
      {status?.pulls_list && status.pulls_list.length > 0 && (
        <div className="rounded-lg border border-line bg-surface-raised">
          <div className="px-3 py-2 border-b border-line text-[11.5px] font-semibold text-primary">
            Recent pull requests
          </div>
          <div className="max-h-[180px] overflow-auto">
            {status.pulls_list.slice(0, 8).map((p) => (
              <div
                key={p.number}
                className="px-3 py-2 border-b border-subtle hover:bg-surface-sunken transition flex items-center gap-2"
              >
                <Badge tone={p.state === 'merged' ? 'info' : p.state === 'open' ? 'ok' : 'muted'}>
                  #{p.number}
                </Badge>
                <span className="text-[12px] text-primary truncate flex-1">{p.title}</span>
                <span className="text-[10.5px] text-tertiary">{p.user ?? 'anon'}</span>
                <span className="text-[10.5px] text-tertiary">{fmtShortTs(p.updated_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {status?.state === 'error' && status.error && (
        <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] dark:bg-red-500/10 px-3 py-2 text-[11.5px] text-[#B91C1C] dark:text-red-200">
          <span className="font-semibold">Sync error:</span> {status.error}
        </div>
      )}
      {status?.state === 'rate_limited' && (
        <div className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] dark:bg-amber-500/10 px-3 py-2 text-[11.5px] text-[#B45309] dark:text-amber-200">
          GitHub API rate limit reached — {auth?.configured ? 'wait for reset' : 'register a token to extend the quota.'}
        </div>
      )}
    </div>
  );
}

function StateBadge({ status, syncing }: { status: GithubSyncStatus | null; syncing: boolean }) {
  if (syncing || status?.state === 'syncing') return <Badge tone="info">syncing</Badge>;
  if (!status) return <Badge tone="muted">not synced</Badge>;
  switch (status.state) {
    case 'ok':
      return (
        <Badge tone="ok">
          synced {status.last_synced_at ? `· ${fmtShortTs(status.last_synced_at)}` : ''}
        </Badge>
      );
    case 'error':
      return <Badge tone="critical">error</Badge>;
    case 'rate_limited':
      return <Badge tone="warn">rate-limited</Badge>;
    default:
      return <Badge tone="muted">idle</Badge>;
  }
}

function AuthIndicator({
  auth,
  onOpen,
  showing,
}: {
  auth: { configured: boolean; source: 'runtime' | 'env' | 'none'; label: string | null } | null;
  onOpen: () => void;
  showing: boolean;
}) {
  const configured = !!auth?.configured;
  return (
    <button
      onClick={onOpen}
      className={cn(
        'inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition',
        configured
          ? 'text-[#047857] border-[#A7F3D0] bg-[#ECFDF5] dark:text-emerald-200 dark:border-emerald-400/30 dark:bg-emerald-400/10'
          : 'text-secondary border-line bg-surface-sunken hover:border-[#4F46E5]',
        showing && '!border-[#4F46E5]',
      )}
    >
      {configured ? <Lock size={10} /> : <Unlock size={10} />}
      {configured ? (auth?.source === 'env' ? 'env token' : 'token set') : 'no token'}
    </button>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-surface-raised px-2.5 py-2">
      <div className="flex items-center gap-1 text-[10.5px] text-tertiary">
        {icon}
        {label}
      </div>
      <div className="text-[15px] font-semibold text-primary tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
