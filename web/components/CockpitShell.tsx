'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useOnyxStream } from '@/lib/ws';
import { useOnyx } from '@/lib/store';
import { ONYX_HTTP } from '@/lib/format';
import { Sidebar } from '@/components/shell/Sidebar';
import { HeaderStrip } from '@/components/shell/HeaderStrip';
import { WorkspaceTicker } from '@/components/shell/WorkspaceTicker';
import { StatusBar } from '@/components/shell/StatusBar';
import { DemoBanner } from '@/components/panels/DemoBanner';
import { ToastBridge } from '@/components/overlays/ToastBridge';
import { CommandPalette } from '@/components/overlays/CommandPalette';
import { BlackoutOverlay } from '@/components/overlays/BlackoutOverlay';
import { ReplayCinema } from '@/components/overlays/ReplayCinema';
import { SonnerHost } from '@/components/overlays/SonnerHost';

/**
 * Persistent cockpit chrome — rendered once in the root layout.
 * Sidebar, top bar, ticker, status bar and all global overlays stay
 * mounted across route changes; only the main slot swaps.
 *
 * The websocket bridge mounts here exactly once — `useOnyxStream()` —
 * so a single connection serves the whole app via the Zustand store.
 */
export function CockpitShell({ children }: { children: ReactNode }) {
  useOnyxStream();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const blackout = useOnyx((s) => s.blackout);
  const cinema = useOnyx((s) => s.cinemaMode);
  const setCinema = useOnyx((s) => s.setCinema);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'd' || e.key === 'D') {
        fetch(`${ONYX_HTTP}/demo/run`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ scenario: 'cascade' }),
        }).catch(() => {});
      } else if (e.key === 'b' || e.key === 'B') {
        fetch(`${ONYX_HTTP}/blackout/simulate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ enable: blackout.online }),
        }).catch(() => {});
      } else if (e.key === 'c' || e.key === 'C') {
        setCinema(!cinema);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blackout.online, cinema, setCinema]);

  return (
    <div className="relative h-screen w-screen flex flex-row surface-base text-primary overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((x) => !x)}
      />

      <section className="flex-1 min-w-0 flex flex-col">
        <HeaderStrip />
        <WorkspaceTicker />
        <main className="flex-1 min-h-0 relative overflow-hidden surface-base">
          {children}
        </main>
        <StatusBar />
      </section>

      {/* overlays */}
      <DemoBanner />
      <BlackoutOverlay />
      <ReplayCinema />
      <CommandPalette />
      <ToastBridge />
      <SonnerHost />
    </div>
  );
}
