'use client';
import { useMemo } from 'react';
import { Database } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { SqlIntelligenceFeed } from '@/components/panels/SqlIntelligenceFeed';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { fmtShortTs, fmtMs } from '@/lib/format';

export default function SqlPage() {
  const intel = useOnyx((s) => s.intelligence);
  const history = useMemo(() => intel.slice().reverse(), [intel]);
  const totalLatency = useMemo(() => intel.reduce((a, b) => a + b.latency_ms, 0), [intel]);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Database size={14} />}
        title="RELATIONAL EXECUTION ENGINE"
        subtitle="Cross-source SQL joins · onyx_cognition"
        meta={
          <>
            <Badge tone="muted">{intel.length} EXECUTIONS</Badge>
            <Badge tone="info">Σ {fmtMs(totalLatency)}</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-3 grid grid-cols-[1fr_320px] gap-3">
        <SqlIntelligenceFeed />

        <Panel title="EXECUTION HISTORY" right={`${history.length} runs`} className="h-full" inner="p-0" scroll>
          <div className="font-mono text-[10.5px]">
            {history.map((r) => (
              <div key={r.id} className="px-3 py-2 border-b border-onyx-600/20 hover:bg-onyx-700/30">
                <div className="flex items-center gap-2">
                  <span className="text-onyx-300 tabular-nums">{fmtShortTs(r.ts)}</span>
                  <Badge tone={r.severity as any}>{r.rows.length} ROWS</Badge>
                  <span className="ml-auto text-onyx-300 text-[10px]">{fmtMs(r.latency_ms)}</span>
                </div>
                <div className="text-onyx-100 mt-1 truncate">{r.query_id}</div>
                <div className="text-[10px] text-cyan-glow/90 mt-1 line-clamp-2">{r.summary}</div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="px-3 py-4 text-[10px] uppercase tracking-[0.18em] text-onyx-300">no executions yet · awaiting engine cadence</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
