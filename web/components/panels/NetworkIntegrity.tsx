'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';

export function NetworkIntegrity() {
  const network = useOnyx((s) => s.network);
  const grouped = useMemo(() => {
    const m = new Map<
      string,
      { samples: number; mean: number; jitter: number; degraded: number; offline: number; status: string }
    >();
    for (const n of network) {
      const cur =
        m.get(n.endpoint) ??
        { samples: 0, mean: 0, jitter: 0, degraded: 0, offline: 0, status: 'healthy' };
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
    <Panel
      title="Network integrity"
      right={`${grouped.length} endpoints`}
      className="h-full"
      inner="p-0 flex flex-col"
      scroll
    >
      <div className="grid grid-cols-[1fr_80px_72px_72px_100px] gap-3 px-4 py-2 border-b border-line surface-inset text-[11px] text-tertiary font-medium">
        <span>Endpoint</span>
        <span className="text-right">RTT</span>
        <span className="text-right">Jitter</span>
        <span className="text-right">Samples</span>
        <span className="text-right">Status</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {grouped.map(([ep, v]) => {
          const sev =
            v.offline > 0
              ? 'critical'
              : v.degraded > 0
                ? 'warn'
                : v.mean > 400
                  ? 'warn'
                  : 'ok';
          return (
            <div
              key={ep}
              className="grid grid-cols-[1fr_80px_72px_72px_100px] gap-3 px-4 py-2 border-b border-subtle hover:bg-surface-sunken transition items-center"
            >
              <span className="text-[12.5px] text-primary truncate font-mono">{ep}</span>
              <span className="text-[12px] text-primary text-right tabular-nums">{v.mean.toFixed(1)}ms</span>
              <span className="text-[12px] text-secondary text-right tabular-nums">{v.jitter.toFixed(1)}ms</span>
              <span className="text-[12px] text-secondary text-right tabular-nums">{v.samples}</span>
              <span className="text-right">
                <Badge tone={sev as any}>{v.status}</Badge>
              </span>
            </div>
          );
        })}
        {grouped.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-secondary">Probing endpoints…</div>
        )}
      </div>
    </Panel>
  );
}
