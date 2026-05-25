'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { SignalPill } from '@/components/primitives/SignalPill';

export function NetworkIntegrity() {
  const network = useOnyx((s) => s.network);
  const grouped = useMemo(() => {
    const m = new Map<string, { samples: number; mean: number; jitter: number; degraded: number; offline: number; status: string }>();
    for (const n of network) {
      const cur = m.get(n.endpoint) ?? { samples: 0, mean: 0, jitter: 0, degraded: 0, offline: 0, status: 'healthy' };
      const next = {
        samples: cur.samples + 1,
        mean: (cur.mean * cur.samples + n.rtt_ms) / (cur.samples + 1),
        jitter: Math.max(cur.jitter, n.jitter_ms),
        degraded: cur.degraded + (n.status === 'degraded' || n.status === 'retry' ? 1 : 0),
        offline: cur.offline + (n.status === 'offline' ? 1 : 0),
        status: n.status,
      };
      m.set(n.endpoint, next);
    }
    return [...m.entries()];
  }, [network]);

  return (
    <Panel title="NETWORK INTEGRITY" right={`${grouped.length} ENDPOINTS`} className="h-full" inner="p-0 flex flex-col" scroll={true}>
      <div className="font-mono text-[11px] flex-none">
        <div className="grid grid-cols-[1fr_70px_60px_60px_80px] gap-2 px-3 py-1.5 border-b border-onyx-600/30 text-onyx-300">
          <span className="panel-label">ENDPOINT</span>
          <span className="panel-label text-right">RTT</span>
          <span className="panel-label text-right">JITTER</span>
          <span className="panel-label text-right">SAMPLES</span>
          <span className="panel-label text-right">STATUS</span>
        </div>
      </div>
      <div className="font-mono text-[11px] flex-1 overflow-y-auto">
        {grouped.map(([ep, v]) => {
          const sev = v.offline > 0 ? 'critical' : v.degraded > 0 ? 'warn' : v.mean > 400 ? 'warn' : 'info';
          return (
            <div key={ep} className="grid grid-cols-[1fr_70px_60px_60px_80px] gap-2 px-3 py-1.5 border-b border-onyx-600/15 hover:bg-onyx-700/30">
              <span className="text-onyx-100 truncate">{ep}</span>
              <span className="text-onyx-100 text-right tabular-nums">{v.mean.toFixed(1)}ms</span>
              <span className="text-onyx-300 text-right tabular-nums">{v.jitter.toFixed(1)}ms</span>
              <span className="text-onyx-300 text-right tabular-nums">{v.samples}</span>
              <span className="text-right"><SignalPill severity={sev as any} label={v.status.toUpperCase()} /></span>
            </div>
          );
        })}
        {grouped.length === 0 && (
          <div className="px-3 py-6 text-[10px] uppercase tracking-[0.18em] text-onyx-300">probing endpoints…</div>
        )}
      </div>
    </Panel>
  );
}
