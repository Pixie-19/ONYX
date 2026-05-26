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
        icon={<Database size={16} />}
        title="SQL intelligence"
        subtitle="Cross-source relational queries · onyx_cognition"
        meta={
          <>
            <Badge tone="muted">{intel.length} executions</Badge>
            <Badge tone="info">Σ {fmtMs(totalLatency)}</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-6 grid grid-cols-[1fr_360px] gap-4 surface-base">
        <SqlIntelligenceFeed />

        <Panel title="Execution history" right={`${history.length} runs`} inner="p-0" scroll>
          <div>
            {history.map((r) => (
              <div
                key={r.id}
                className="px-4 py-3 border-b border-subtle hover:bg-surface-sunken transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-tertiary tabular-nums">
                    {fmtShortTs(r.ts)}
                  </span>
                  <Badge tone={r.severity as any}>{r.rows.length} rows</Badge>
                  <span className="ml-auto text-[11px] text-tertiary tabular-nums">
                    {fmtMs(r.latency_ms)}
                  </span>
                </div>
                <div className="text-[12.5px] font-medium text-primary mt-1 truncate">
                  {r.query_id}
                </div>
                <div className="text-[11.5px] text-secondary mt-0.5 line-clamp-2">
                  {r.summary}
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="px-4 py-6 text-[12px] text-secondary text-center">
                No executions yet · awaiting engine cadence
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
