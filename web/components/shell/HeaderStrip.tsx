'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search, Zap, Shield, Film, Activity, ChevronDown, Wifi,
} from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { ONYX_HTTP } from '@/lib/format';
import { Tooltip } from '@/components/ui/Tooltip';
import { NotificationCenter } from '@/components/shell/NotificationCenter';
import { ProfileDropdown } from '@/components/shell/ProfileDropdown';

/**
 * Topbar — minimal, calm, premium.
 *
 * Layout:
 *  ┌─ workspace selector ─ search/command ─────────── status pills ─ actions ─ profile ─┐
 *
 * All status indicators (websocket, blackout, demo phase, BSI, clock) live
 * inline on the right as small pills + the action buttons live alongside.
 */
export function HeaderStrip() {
  const connected = useOnyx((s) => s.connected);
  const stability = useOnyx((s) => s.buildStability);
  const blackout = useOnyx((s) => s.blackout);
  const demo = useOnyx((s) => s.demo);
  const cinema = useOnyx((s) => s.cinemaMode);
  const setCinema = useOnyx((s) => s.setCinema);
  const setCommandOpen = useOnyx((s) => s.setCommandOpen);
  const workspaces = useOnyx((s) => s.workspaces);
  const activeId = useOnyx((s) => s.activeWorkspaceId);
  const active = workspaces.find((w) => w.id === activeId);

  const [clock, setClock] = useState<number | null>(null);
  useEffect(() => {
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const stabBand = stability > 80 ? 'ok' : stability > 50 ? 'warn' : 'error';

  const trigger = async () => {
    try {
      await fetch(`${ONYX_HTTP}/demo/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenario: 'cascade' }),
      });
    } catch {/* ignore */}
  };
  const blackoutSim = async () => {
    try {
      await fetch(`${ONYX_HTTP}/blackout/simulate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enable: blackout.online }),
      });
    } catch {/* ignore */}
  };

  return (
    <header className="relative h-14 flex items-center px-4 gap-3 border-b border-line bg-surface-raised z-20">
      {/* Workspace selector */}
      <Link
        href="/connect"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-sunken transition min-w-0 max-w-[260px]"
      >
        <div className="w-6 h-6 rounded-md surface-sunken flex items-center justify-center shrink-0">
          <span className="text-[10px] font-semibold text-secondary">
            {(active?.name ?? '··').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-medium text-primary truncate leading-tight">
            {active ? active.name : 'Select workspace'}
          </div>
          <div className="text-[10.5px] text-tertiary truncate leading-tight">
            {active ? active.framework : 'No workspace attached'}
          </div>
        </div>
        <ChevronDown size={13} className="text-tertiary shrink-0" />
      </Link>

      <div className="h-6 w-px bg-line" />

      {/* Command/search */}
      <button
        onClick={() => setCommandOpen(true)}
        className="flex items-center gap-2 px-3 h-9 rounded-md border border-line bg-surface-base hover:bg-surface-sunken transition min-w-[260px] max-w-[420px] flex-1"
      >
        <Search size={14} className="text-tertiary" />
        <span className="text-[12.5px] text-tertiary flex-1 text-left truncate">
          Search commands, queries, events…
        </span>
        <span className="kbd">⌘K</span>
      </button>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2">
        {/* Live status pills */}
        <Tooltip label="Agent websocket link" side="bottom">
          <span
            id="connected-pill"
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-medium ${
              connected
                ? 'text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] dark:text-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-400/30'
                : 'text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] dark:text-red-200 dark:bg-red-400/10 dark:border-red-400/30'
            }`}
          >
            <Wifi size={11} />
            {connected ? 'Linked' : 'Offline'}
          </span>
        </Tooltip>

        <Tooltip
          label={
            blackout.online
              ? `Inference routing → ${blackout.provider}`
              : 'Blackout active — local fallback'
          }
          side="bottom"
        >
          <span
            id="blackout-pill"
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-medium ${
              blackout.online
                ? 'text-secondary surface-sunken border border-line'
                : 'text-[#B45309] bg-[#FFFBEB] border border-[#FCD34D] dark:text-amber-200 dark:bg-amber-400/10 dark:border-amber-400/30'
            }`}
          >
            <Shield size={11} />
            {blackout.online ? blackout.provider : 'Local'}
          </span>
        </Tooltip>

        {demo.phase > 0 && (
          <Tooltip label="Active demo phase" side="bottom">
            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-medium text-[#4338CA] bg-[#EEF2FF] border border-[#C7D2FE] dark:text-indigo-200 dark:bg-indigo-400/10 dark:border-indigo-400/30">
              <Activity size={11} />
              Phase {demo.phase}
            </span>
          </Tooltip>
        )}

        <Tooltip label="Build Stability Index — last 5 min of replay_events" side="bottom">
          <span
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-medium ${
              stabBand === 'ok'
                ? 'text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] dark:text-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-400/30'
                : stabBand === 'warn'
                  ? 'text-[#B45309] bg-[#FFFBEB] border border-[#FCD34D] dark:text-amber-200 dark:bg-amber-400/10 dark:border-amber-400/30'
                  : 'text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] dark:text-red-200 dark:bg-red-400/10 dark:border-red-400/30'
            }`}
          >
            <span className="text-[10.5px] font-semibold tracking-wide uppercase opacity-70">BSI</span>
            <span className="tabular-nums">{stability}</span>
          </span>
        </Tooltip>

        <span className="hidden xl:inline text-[11.5px] text-tertiary tabular-nums" suppressHydrationWarning>
          {clock === null ? '—:—:—' : new Date(clock).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>

        <div className="h-6 w-px bg-line" />

        {/* Actions */}
        <Tooltip label="Run cinematic demo (D)" side="bottom">
          <button onClick={trigger} className="btn btn-accent h-8 px-3">
            <Zap size={13} />
            <span className="text-[12.5px]">Run demo</span>
          </button>
        </Tooltip>
        <Tooltip label="Simulate blackout protocol (B)" side="bottom">
          <button onClick={blackoutSim} className="btn btn-outline h-8 px-3">
            <Shield size={13} />
            <span className="text-[12.5px]">{blackout.online ? 'Blackout' : 'Restore'}</span>
          </button>
        </Tooltip>
        <Tooltip label="Toggle cinema mode (C)" side="bottom">
          <button
            onClick={() => setCinema(!cinema)}
            className={`btn-icon ${cinema ? 'text-[#7C3AED]' : ''}`}
            aria-label="cinema"
          >
            <Film size={14} />
          </button>
        </Tooltip>

        {/* Notifications */}
        <NotificationCenter />

        {/* Profile */}
        <ProfileDropdown />
      </div>
    </header>
  );
}
