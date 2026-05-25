'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Shield, Command, Film, Activity, Folder } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { fmtClock, ONYX_HTTP } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { Separator } from '@/components/ui/Separator';
import { FrameworkBadge } from '@/components/connector/FrameworkBadge';

export function HeaderStrip() {
  const session = useOnyx((s) => s.session);
  const connected = useOnyx((s) => s.connected);
  const stability = useOnyx((s) => s.buildStability);
  const blackout = useOnyx((s) => s.blackout);
  const demo = useOnyx((s) => s.demo);
  const cinema = useOnyx((s) => s.cinemaMode);
  const setCinema = useOnyx((s) => s.setCinema);
  const setCommandOpen = useOnyx((s) => s.setCommandOpen);
  const [clock, setClock] = useState<number | null>(null);

  useEffect(() => {
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 137);
    return () => clearInterval(id);
  }, []);

  const trigger = async () => {
    try {
      await fetch(`${ONYX_HTTP}/demo/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario: 'cascade' }) });
    } catch { /* ignore */ }
  };
  const blackoutSim = async () => {
    try {
      await fetch(`${ONYX_HTTP}/blackout/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enable: blackout.online }) });
    } catch { /* ignore */ }
  };

  const stabBand = stability > 80 ? 'ok' : stability > 50 ? 'warn' : 'error';
  const workspaces = useOnyx((s) => s.workspaces);
  const activeId = useOnyx((s) => s.activeWorkspaceId);
  const active = workspaces.find((w) => w.id === activeId);

  return (
    <header className="relative h-12 flex items-center px-4 border-b border-onyx-600/40 bg-onyx-950/70 backdrop-blur z-20 gap-3">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      <div className="text-[12px] font-display tracking-[0.32em] glow-cyan select-none">EXECUTION INTELLIGENCE INFRASTRUCTURE</div>
      <Separator orientation="vertical" className="h-5" />

      <Tooltip label={active ? `Active workspace · ${active.path}` : 'No workspace attached — click to connect'}>
        <Link href="/connect" className="flex items-center gap-1.5">
          <Folder size={11} className={active ? 'text-cyan-glow' : 'text-signal-warn'} />
          <Badge tone={active ? (active.status === 'demo' ? 'warn' : 'ok') : 'warn'}>
            {active ? (active.name.length > 22 ? active.name.slice(0, 22) + '…' : active.name) : 'NO WORKSPACE'}
          </Badge>
          {active?.framework && <FrameworkBadge framework={active.framework} />}
        </Link>
      </Tooltip>
      <Separator orientation="vertical" className="h-5" />

      <Tooltip label="Agent WebSocket link">
        <Badge tone={connected ? 'info' : 'error'} id="connected-pill">
          <Activity size={10} /> {connected ? 'AGENT · LINKED' : 'AGENT · OFFLINE'}
        </Badge>
      </Tooltip>
      <Tooltip label={blackout.online ? `Routing to ${blackout.provider}` : 'Blackout protocol active — local fallback'}>
        <span id="blackout-pill">
          <Badge tone={blackout.online ? 'info' : 'warn'}>
            <Shield size={10} /> {blackout.online ? `INFER · ${blackout.provider.toUpperCase()}` : 'BLACKOUT · LOCAL'}
          </Badge>
        </span>
      </Tooltip>
      <Tooltip label="Active demo phase">
        <Badge tone={demo.phase === 0 ? 'muted' : demo.phase === 2 ? 'error' : demo.phase === 3 ? 'info' : 'warn'}>
          PHASE {demo.phase} · {demo.label}
        </Badge>
      </Tooltip>
      {cinema && (
        <Badge tone="info" className="animate-pulse-slow">
          <Film size={10} /> CINEMA
        </Badge>
      )}

      <div className="ml-auto flex items-center gap-3 relative">
        <div className="text-[9.5px] tracking-[0.18em] uppercase text-onyx-300 hidden lg:block">
          SESSION <span className="text-onyx-100">{session ?? '——'}</span>
        </div>
        <Tooltip label="Build Stability Index — 0..100 derived from 5 min of replay_events">
          <span className="flex items-center gap-2">
            <span className="panel-label">BSI</span>
            <Badge tone={stabBand}>{String(stability).padStart(3, '0')}</Badge>
          </span>
        </Tooltip>
        <div className="font-mono text-xs text-onyx-100 tracking-wider tabular-nums" suppressHydrationWarning>
          {clock === null ? '——:——:——.———' : fmtClock(clock)}
        </div>
        <Separator orientation="vertical" className="h-5" />
        <Tooltip label="Open command palette (⌘K / Ctrl+K)">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 border border-onyx-600/60 text-onyx-100 hover:text-cyan-glow hover:border-cyan-glow/60 transition"
          >
            <Command size={11} /> ⌘ K
          </button>
        </Tooltip>
        <Tooltip label="Run cinematic 4-phase demo (D)">
          <button
            onClick={trigger}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-3 py-1 border border-cyan-glow/60 text-cyan-glow hover:bg-cyan-glow/10 transition shadow-cyan-glow"
          >
            <Zap size={11} /> Run Demo
          </button>
        </Tooltip>
        <Tooltip label="Simulate blackout protocol (B)">
          <button
            onClick={blackoutSim}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-3 py-1 border border-violet-glow/60 text-violet-glow hover:bg-violet-glow/10 transition"
          >
            <Shield size={11} /> {blackout.online ? 'Blackout' : 'Restore'}
          </button>
        </Tooltip>
        <Tooltip label="Toggle cinema mode (C)">
          <button
            onClick={() => setCinema(!cinema)}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 border border-onyx-600/60 text-onyx-100 hover:text-violet-glow hover:border-violet-glow/60 transition"
          >
            <Film size={11} /> {cinema ? 'Exit' : 'Cinema'}
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
