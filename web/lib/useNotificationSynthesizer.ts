'use client';
import { useEffect, useRef } from 'react';
import { useOnyx } from '@/lib/store';
import type { Notification, NotificationType, NotificationCategory, ReplayEvent, Severity } from '@/lib/types';

const AUTO_DISMISS_MS = 8000;
const SEEN_LIMIT = 256;

type Mapping = { type: NotificationType; category: NotificationCategory; titleFn: (e: ReplayEvent) => string };

const KIND_TO_NOTIFICATION: Partial<Record<ReplayEvent['kind'], Mapping>> = {
  COMPILER_WARN:        { type: 'compiler_warning',  category: 'system',         titleFn: (e) => `Compiler warning · ${(e.payload as any)?.file ?? e.source}` },
  COMPILER_FAILURE:     { type: 'compiler_warning',  category: 'system',         titleFn: (e) => `Compiler failure · ${(e.payload as any)?.file ?? e.source}` },
  BUILD_CRASH:          { type: 'runtime_crash',     category: 'system',         titleFn: (e) => `Build crash · ${(e.payload as any)?.reason ?? e.source}` },
  PROCESS_CRASH:        { type: 'runtime_crash',     category: 'infrastructure', titleFn: (e) => `Process crashed · ${(e.payload as any)?.command ?? e.source}` },
  THERMAL_ALERT:        { type: 'thermal_alert',     category: 'infrastructure', titleFn: (e) => `Thermal alert · ${(e.payload as any)?.state ?? 'hot'}` },
  PORT_DISCOVERED:      { type: 'port_collision',    category: 'infrastructure', titleFn: (e) => `Port discovered · :${(e.payload as any)?.port ?? '—'}` },
  DEPENDENCY_DEGRADED:  { type: 'dependency_failure',category: 'infrastructure', titleFn: (e) => `Dependency degraded · ${(e.payload as any)?.endpoint ?? e.source}` },
  BLACKOUT_ENTER:       { type: 'blackout_protocol', category: 'ai',             titleFn: () => 'Blackout protocol engaged' },
  BLACKOUT_EXIT:        { type: 'blackout_protocol', category: 'ai',             titleFn: () => 'Network restored' },
  INFERENCE_ROUTE:      { type: 'ai_cognition',      category: 'ai',             titleFn: (e) => `AI route · ${(e.payload as any)?.provider ?? '—'}` },
  GITHUB_SYNCED:        { type: 'github_sync',       category: 'github',         titleFn: (e) => `GitHub sync · ${(e.payload as any)?.repo ?? e.source}` },
  TERMINAL_ATTACHED:    { type: 'terminal_attach',   category: 'infrastructure', titleFn: (e) => `Terminal attached · ${(e.payload as any)?.command ?? e.source}` },
  TERMINAL_EXITED:      { type: 'terminal_attach',   category: 'infrastructure', titleFn: (e) => `Terminal exited · ${(e.payload as any)?.command ?? e.source}` },
  WORKSPACE_DETACHED:   { type: 'repo_disconnected', category: 'github',         titleFn: (e) => `Workspace detached · ${(e.payload as any)?.name ?? e.source}` },
  RULE_BREACH:          { type: 'system_alert',      category: 'system',         titleFn: (e) => `Rule breach · ${(e.payload as any)?.rule_name ?? e.source}` },
};

const NOISY: Set<ReplayEvent['kind']> = new Set([
  'FILE_MODIFIED','FILE_DELETED','AST_DEPENDENCY_CHANGE','HOT_RELOAD','BUILD_SUCCESS',
  'TERMINAL_OUTPUT','CPU_SPIKE','MEMORY_PRESSURE','SOCKET_RETRY','LATENCY_SURGE',
  'AST_COMPLEXITY_SPIKE','DEMO_PHASE',
]);

function shortMessage(ev: ReplayEvent): string {
  const p = ev.payload as any;
  if (p && typeof p === 'object') {
    const m = p.message ?? p.reason ?? p.detail ?? null;
    if (typeof m === 'string') return m.slice(0, 240);
  }
  return ev.target ?? ev.source ?? ev.kind;
}

const SEV_RANK: Record<Severity, number> = { info: 0, warn: 1, error: 2, critical: 3 };

export function useNotificationSynthesizer(): void {
  const seenRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastBlackoutOnlineRef = useRef<boolean | null>(null);
  const lastGithubStateRef = useRef<Record<string, string>>({});
  const lastTerminalStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const { addNotification, markNotificationRead } = useOnyx.getState();

    const remember = (key: string) => {
      const set = seenRef.current;
      if (set.has(key)) return false;
      set.add(key);
      if (set.size > SEEN_LIMIT) seenRef.current = new Set(Array.from(set).slice(-SEEN_LIMIT));
      return true;
    };

    const scheduleDismiss = (id: string, sev: Severity) => {
      if (SEV_RANK[sev] >= SEV_RANK.error) return;
      const t = setTimeout(() => {
        markNotificationRead(id);
        timersRef.current.delete(id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(id, t);
    };

    const emit = (n: Notification) => {
      addNotification(n);
      scheduleDismiss(n.id, n.severity);
    };

    // ── events → notifications ────────────────────────────────────────
    const unsubEvents = useOnyx.subscribe(
      (s) => s.events,
      (events) => {
        if (!events || events.length === 0) return;
        const recent = events.slice(-12);
        for (const ev of recent) {
          if (NOISY.has(ev.kind)) continue;
          if (!remember(`ev:${ev.id}`)) continue;
          const map = KIND_TO_NOTIFICATION[ev.kind];
          if (!map) continue;
          emit({
            id: `n-${ev.id}`,
            ts: ev.ts,
            type: map.type,
            category: map.category,
            title: map.titleFn(ev),
            message: shortMessage(ev),
            severity: ev.severity,
            read: false,
            event: ev,
          });
        }
      },
      { fireImmediately: false },
    );

    // ── blackout transitions ──────────────────────────────────────────
    const unsubBlackout = useOnyx.subscribe(
      (s) => s.blackout,
      (b) => {
        if (lastBlackoutOnlineRef.current === null) {
          lastBlackoutOnlineRef.current = b.online;
          return;
        }
        if (lastBlackoutOnlineRef.current === b.online) return;
        lastBlackoutOnlineRef.current = b.online;
        const id = `n-blk-${b.since}-${b.online ? 'restore' : 'enter'}`;
        if (!remember(id)) return;
        emit({
          id,
          ts: Date.now(),
          type: 'blackout_protocol',
          category: 'ai',
          title: b.online ? 'Network restored' : 'Blackout protocol engaged',
          message: b.online
            ? `Provider ${b.provider} is reachable again.`
            : `Routing through ${b.provider} fallback — ${b.reason || 'connectivity lost'}.`,
          severity: b.online ? 'info' : 'critical',
          read: false,
        });
      },
      { fireImmediately: false },
    );

    // ── github sync transitions ──────────────────────────────────────
    const unsubGithub = useOnyx.subscribe(
      (s) => s.githubSync,
      (sync) => {
        for (const [wsId, st] of Object.entries(sync)) {
          const prev = lastGithubStateRef.current[wsId];
          if (prev === st.state) continue;
          lastGithubStateRef.current[wsId] = st.state;
          if (st.state === 'ok') {
            const id = `n-gh-ok-${wsId}-${st.last_synced_at ?? Date.now()}`;
            if (!remember(id)) continue;
            emit({
              id,
              ts: st.last_synced_at ?? Date.now(),
              type: 'github_sync',
              category: 'github',
              title: `GitHub synced · ${st.owner}/${st.repo}`,
              message: `${st.commits} commits · ${st.contributors} contributors · ${st.pulls} pulls`,
              severity: 'info',
              read: false,
            });
          } else if (st.state === 'error') {
            const id = `n-gh-err-${wsId}-${Date.now()}`;
            if (!remember(id)) continue;
            emit({
              id,
              ts: Date.now(),
              type: 'repo_disconnected',
              category: 'github',
              title: `GitHub sync failed · ${st.owner}/${st.repo}`,
              message: st.error ?? 'Sync error',
              severity: 'error',
              read: false,
            });
          } else if (st.state === 'rate_limited') {
            const id = `n-gh-rate-${wsId}-${Date.now()}`;
            if (!remember(id)) continue;
            emit({
              id,
              ts: Date.now(),
              type: 'repo_disconnected',
              category: 'github',
              title: `GitHub rate-limited · ${st.owner}/${st.repo}`,
              message: 'Quota exhausted — waiting for reset.',
              severity: 'warn',
              read: false,
            });
          }
        }
      },
      { fireImmediately: false },
    );

    // ── terminal status transitions ───────────────────────────────────
    const unsubTerm = useOnyx.subscribe(
      (s) => s.terminals,
      (terminals) => {
        for (const t of terminals) {
          const prev = lastTerminalStatusRef.current[t.id];
          if (prev === t.status) continue;
          lastTerminalStatusRef.current[t.id] = t.status;
          if (t.status === 'crashed') {
            const id = `n-term-crash-${t.id}-${t.exited_at ?? Date.now()}`;
            if (!remember(id)) continue;
            emit({
              id,
              ts: t.exited_at ?? Date.now(),
              type: 'runtime_crash',
              category: 'infrastructure',
              title: `Terminal crashed · ${t.command}`,
              message: `Exit code ${t.exit_code ?? '—'}`,
              severity: 'error',
              read: false,
            });
          } else if (prev === undefined && t.status === 'running') {
            const id = `n-term-attach-${t.id}-${t.started_at}`;
            if (!remember(id)) continue;
            emit({
              id,
              ts: t.started_at,
              type: 'terminal_attach',
              category: 'infrastructure',
              title: `Terminal attached · ${t.command}`,
              message: t.detected_framework ? `Framework: ${t.detected_framework}` : 'Streaming live output.',
              severity: 'info',
              read: false,
            });
          }
        }
      },
      { fireImmediately: false },
    );

    return () => {
      unsubEvents();
      unsubBlackout();
      unsubGithub();
      unsubTerm();
      for (const t of timersRef.current.values()) clearTimeout(t);
      timersRef.current.clear();
    };
  }, []);
}
