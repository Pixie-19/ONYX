'use client';
import { useMemo } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  User, Github, Activity, Calendar, Mail, ExternalLink, Cpu, Zap, Brain, GitCommit,
} from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { ONYX_HTTP, fmtRelativeTime } from '@/lib/format';

export default function ProfilePage() {
  const { status: authStatus } = useSession();
  const session = useOnyx((s) => s.session);
  const connected = useOnyx((s) => s.connected);
  const authSession = useOnyx((s) => s.authSession);
  const githubConnection = useOnyx((s) => s.githubConnection);
  const githubCommits = useOnyx((s) => s.githubCommits);
  const githubSync = useOnyx((s) => s.githubSync);
  const events = useOnyx((s) => s.events);
  const blackout = useOnyx((s) => s.blackout);
  const buildStability = useOnyx((s) => s.buildStability);
  const userPreferences = useOnyx((s) => s.userPreferences);

  const user = authSession?.user ?? null;

  const stats = useMemo(() => {
    const eventTypes = new Set(events.map((e) => e.kind));
    const commitsByAuthor = new Map<string, number>();
    for (const c of githubCommits) {
      commitsByAuthor.set(c.author ?? '—', (commitsByAuthor.get(c.author ?? '—') ?? 0) + 1);
    }
    const myLogin = user?.github_login ?? null;
    const myCommits = myLogin ? (commitsByAuthor.get(myLogin) ?? 0) : 0;
    const totalSynced = Object.values(githubSync).reduce((acc, s) => acc + (s.commits ?? 0), 0);
    return {
      eventCount: events.length,
      eventKindCount: eventTypes.size,
      myCommits,
      totalSyncedCommits: totalSynced,
      reposSynced: Object.keys(githubSync).length,
    };
  }, [events, githubCommits, githubSync, user]);

  const recentMyCommits = useMemo(() => {
    if (!user?.github_login) return [];
    return githubCommits
      .filter((c) => c.author === user.github_login)
      .slice(-8)
      .reverse();
  }, [githubCommits, user]);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<User size={16} />}
        title="Profile Dashboard"
        subtitle="Your identity, GitHub presence, and live cognition footprint"
        meta={
          <>
            <Badge tone={connected ? 'ok' : 'error'}>
              {connected ? 'Agent linked' : 'Agent offline'}
            </Badge>
            <Badge tone={authStatus === 'authenticated' ? 'ok' : 'muted'}>
              {authStatus === 'authenticated' ? 'Signed in' : authStatus === 'loading' ? 'Loading' : 'Anonymous'}
            </Badge>
            <Badge tone="muted">Session · {session ?? '—'}</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-4 overflow-auto auto-rows-min surface-base">
        {/* Identity card */}
        <Panel className="col-span-12 lg:col-span-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-sunken shrink-0 flex items-center justify-center">
              {user?.github_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.github_avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User size={28} className="text-secondary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-primary truncate">
                {user?.name ?? 'Anonymous operator'}
              </h2>
              {user?.github_login && (
                <p className="text-[12.5px] text-secondary flex items-center gap-1.5 mt-0.5">
                  <Github size={12} />@{user.github_login}
                </p>
              )}
              {user?.email && (
                <p className="text-[12px] text-tertiary flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail size={11} />
                  {user.email}
                </p>
              )}
              {!user && (
                <button
                  onClick={() => signIn('github', { callbackUrl: '/profile' })}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#4338CA] text-white text-[12px] font-medium hover:bg-[#4338CA]/90 transition"
                >
                  <Github size={12} />
                  Sign in with GitHub
                </button>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <Row label="Created" value={user?.created_at ? fmtRelativeTime(user.created_at) : '—'} />
          <Row label="GitHub" value={githubConnection.connected ? 'Connected' : 'Disconnected'} tone={githubConnection.connected ? 'ok' : 'muted'} />
          <Row label="Repos synced" value={String(stats.reposSynced)} />
          <Row label="Last sync" value={githubConnection.last_sync_at ? fmtRelativeTime(githubConnection.last_sync_at) : 'Never'} />
        </Panel>

        {/* Live cognition footprint */}
        <Panel title="Cognition footprint" className="col-span-12 lg:col-span-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={<Activity size={14} />} label="Events" value={stats.eventCount} sub={`${stats.eventKindCount} kinds`} />
            <Stat icon={<GitCommit size={14} />} label="My commits" value={stats.myCommits} sub={`${stats.totalSyncedCommits} total synced`} />
            <Stat icon={<Cpu size={14} />} label="Build stability" value={`${buildStability}%`} sub={buildStability > 80 ? 'stable' : buildStability > 50 ? 'volatile' : 'critical'} tone={buildStability > 80 ? 'ok' : buildStability > 50 ? 'warn' : 'error'} />
            <Stat icon={<Brain size={14} />} label="AI provider" value={blackout.provider} sub={blackout.online ? 'online' : 'fallback'} tone={blackout.online ? 'ok' : 'warn'} />
          </div>

          <Separator className="my-4" />

          <div className="text-[11px] font-medium text-secondary uppercase tracking-tight mb-2">
            Active preferences
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12.5px]">
            <Pref k="Notifications" v={userPreferences.notificationsEnabled ? 'on' : 'off'} />
            <Pref k="AI routing"    v={userPreferences.aiRoutingEnabled ? 'on' : 'off'} />
            <Pref k="Telemetry"     v={userPreferences.telemetryEnabled ? 'on' : 'off'} />
            <Pref k="Theme"         v={userPreferences.theme} />
          </div>
        </Panel>

        {/* Recent commits */}
        <Panel title={user?.github_login ? `Recent commits · @${user.github_login}` : 'Recent commits'} className="col-span-12 lg:col-span-7" scroll>
          {recentMyCommits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <GitCommit size={20} className="text-tertiary mb-2" />
              <p className="text-[12.5px] text-secondary">
                {!user?.github_login
                  ? 'Connect a GitHub account to surface your commits.'
                  : 'No commits indexed yet for your account in the live stream.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentMyCommits.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 py-2 px-2 rounded hover:bg-surface-sunken transition"
                >
                  <span className="font-mono text-[11.5px] text-tertiary shrink-0 w-16 truncate">{c.short_sha}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] text-primary truncate">{c.message}</p>
                    <p className="text-[11px] text-tertiary">
                      {fmtRelativeTime(c.ts)} · +{c.additions} / -{c.deletions}
                    </p>
                  </div>
                  <Badge tone={c.risky_score > 0.6 ? 'warn' : 'muted'} dot={false}>
                    risk {Math.round(c.risky_score * 100)}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </Panel>

        {/* Sync status */}
        <Panel title="Repository sync" className="col-span-12 lg:col-span-5">
          {Object.keys(githubSync).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Github size={20} className="text-tertiary mb-2" />
              <p className="text-[12.5px] text-secondary">No repositories indexed yet.</p>
              <a
                href={`${ONYX_HTTP}/github/sync/list`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 text-[11px] text-[#4F46E5] dark:text-indigo-300 hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink size={10} />
                Open sync API
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(githubSync).map(([wsId, st]) => (
                <div key={wsId} className="flex items-center justify-between gap-3 py-2 px-2 rounded hover:bg-surface-sunken transition">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] text-primary truncate">{st.owner}/{st.repo}</p>
                    <p className="text-[11px] text-tertiary">
                      {st.commits} commits · {st.contributors} contributors · {st.pulls} pulls
                    </p>
                  </div>
                  <Badge tone={
                    st.state === 'ok' ? 'ok' :
                    st.state === 'error' ? 'error' :
                    st.state === 'rate_limited' ? 'warn' :
                    'muted'
                  }>
                    {st.state}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'error' | 'muted' | 'info' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-subtle last:border-b-0">
      <span className="text-[12px] text-secondary">{label}</span>
      {tone ? <Badge tone={tone}>{value}</Badge> : <span className="text-[12.5px] text-primary truncate max-w-[60%]">{value}</span>}
    </div>
  );
}

function Pref({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-surface-sunken">
      <span className="text-tertiary">{k}</span>
      <span className="text-primary font-medium capitalize">{v}</span>
    </div>
  );
}

function Stat({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  tone?: 'ok' | 'warn' | 'error' | 'info';
}) {
  return (
    <div className="rounded-lg border border-subtle bg-surface-sunken px-3 py-3">
      <div className="flex items-center gap-1.5 text-[11px] text-tertiary uppercase tracking-tight">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${
        tone === 'ok' ? 'text-[#047857] dark:text-emerald-300' :
        tone === 'warn' ? 'text-[#B45309] dark:text-amber-300' :
        tone === 'error' ? 'text-[#B91C1C] dark:text-red-300' :
        'text-primary'
      }`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-tertiary capitalize">{sub}</div>}
    </div>
  );
}
