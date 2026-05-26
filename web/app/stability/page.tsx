'use client';
import { useMemo } from 'react';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Sparkline } from '@/components/primitives/Sparkline';
import { Badge } from '@/components/ui/Badge';
import { BuildStabilityIndex } from '@/components/panels/BuildStabilityIndex';
import { RulebookPanel } from '@/components/panels/RulebookPanel';
import { fmtShortTs } from '@/lib/format';

export default function StabilityPage() {
  const stability = useOnyx((s) => s.buildStability);
  const events = useOnyx((s) => s.events);

  const tone = stability > 80 ? 'ok' : stability > 50 ? 'warn' : 'critical';

  const loopHist = useMemo(() => {
    const buckets = new Array<number>(40).fill(0);
    const now = Date.now();
    for (const e of events) {
      if (e.kind !== 'COMPILER_WARN' && e.kind !== 'COMPILER_FAILURE') continue;
      const age = now - e.ts;
      if (age > 40 * 10_000) continue;
      const idx = 39 - Math.floor(age / 10_000);
      if (idx >= 0 && idx < 40) buckets[idx] += 1;
    }
    return buckets;
  }, [events]);

  const recentEvents = events.filter((e) => e.ts > Date.now() - 5 * 60_000);
  const failureRatio =
    recentEvents.length === 0
      ? 0
      : recentEvents.filter((e) => e.severity === 'critical' || e.severity === 'error').length /
        recentEvents.length;

  const crashes = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.kind === 'BUILD_CRASH' || e.kind === 'COMPILER_FAILURE' || e.kind === 'SYNTAX_FAILURE',
        )
        .slice(-12)
        .reverse(),
    [events],
  );

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<BarChart3 size={16} />}
        title="Build stability"
        subtitle="Composite stability score derived from 5 minutes of replay events"
        meta={
          <>
            <Badge tone={tone as any}>BSI · {stability}</Badge>
            <Badge tone={failureRatio > 0.2 ? 'critical' : failureRatio > 0.1 ? 'warn' : 'ok'}>
              Failure density · {(failureRatio * 100).toFixed(0)}%
            </Badge>
            <Badge tone="muted">{recentEvents.length} events / 5min</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-4 overflow-auto auto-rows-min surface-base">
        <div className="col-span-6 min-h-[280px]">
          <BuildStabilityIndex />
        </div>

        <Panel title="Compiler loop frequency" right="10s buckets" className="col-span-6 min-h-[280px]">
          <Sparkline
            values={loopHist}
            width={520}
            height={160}
            stroke="#F59E0B"
            fill="rgba(245,158,11,0.10)"
            min={0}
            max={Math.max(2, ...loopHist)}
          />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Total cycles" value={String(loopHist.reduce((a, b) => a + b, 0))} />
            <Stat label="Peak per 10s" value={String(Math.max(0, ...loopHist))} />
            <Stat label="Last window" value={String(loopHist[loopHist.length - 1] ?? 0)} />
          </div>
        </Panel>

        <div className="col-span-7 min-h-[300px]">
          <RulebookPanel />
        </div>

        <Panel
          title="Recent crashes"
          right={`${crashes.length}`}
          className="col-span-5 min-h-[300px]"
          badge={
            <span className="inline-flex items-center gap-1 text-[11.5px] text-[#B91C1C] dark:text-red-300">
              <AlertTriangle size={12} /> risk
            </span>
          }
          inner="p-0"
          scroll
        >
          <div>
            {crashes.map((c) => (
              <div
                key={c.id}
                className="px-4 py-2.5 border-b border-subtle hover:bg-surface-sunken transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-tertiary tabular-nums">{fmtShortTs(c.ts)}</span>
                  <Badge tone={c.severity as any}>
                    {c.kind.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                </div>
                <div className="text-[12.5px] text-primary mt-1 truncate">{c.target ?? c.source}</div>
              </div>
            ))}
            {crashes.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-secondary">
                No crash events in window
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line surface-inset p-3">
      <div className="text-[11px] text-tertiary">{label}</div>
      <div className="text-[18px] font-semibold text-primary tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
