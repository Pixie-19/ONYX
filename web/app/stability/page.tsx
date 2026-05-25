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

  // Compiler-loop frequency: count compiler events per 10s bucket
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

  // Failure density: critical + error events / total in last 5min
  const recentEvents = events.filter((e) => e.ts > Date.now() - 5 * 60_000);
  const failureRatio = recentEvents.length === 0 ? 0
    : (recentEvents.filter((e) => e.severity === 'critical' || e.severity === 'error').length / recentEvents.length);

  // Crashes timeline
  const crashes = useMemo(
    () => events.filter((e) => e.kind === 'BUILD_CRASH' || e.kind === 'COMPILER_FAILURE' || e.kind === 'SYNTAX_FAILURE').slice(-12).reverse(),
    [events],
  );

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<BarChart3 size={14} />}
        title="BUILD STABILITY COMMAND"
        subtitle="Composite stability score derived from 5min of replay_events"
        meta={
          <>
            <Badge tone={tone as any}>BSI · {String(stability).padStart(3,'0')}</Badge>
            <Badge tone={failureRatio > 0.2 ? 'critical' : failureRatio > 0.1 ? 'warn' : 'ok'}>FAILURE DENSITY · {(failureRatio * 100).toFixed(0)}%</Badge>
            <Badge tone="muted">{recentEvents.length} EVENTS / 5MIN</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-3 grid grid-cols-12 gap-3 overflow-auto auto-rows-min">
        <div className="col-span-6 min-h-[260px]">
          <BuildStabilityIndex />
        </div>

        <Panel title="COMPILER LOOP FREQUENCY" right="10s BUCKETS" className="col-span-6 min-h-[260px]">
          <Sparkline values={loopHist} width={520} height={140} stroke="#ffb84a" fill="rgba(255,184,74,0.14)" min={0} max={Math.max(2, ...loopHist)} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="TOTAL CYCLES"   value={String(loopHist.reduce((a,b)=>a+b,0))} />
            <Stat label="PEAK PER 10S"   value={String(Math.max(0, ...loopHist))} />
            <Stat label="LAST WINDOW"    value={String(loopHist[loopHist.length - 1] ?? 0)} />
          </div>
        </Panel>

        <div className="col-span-7 min-h-[280px]">
          <RulebookPanel />
        </div>

        <Panel title="RECENT CRASHES" right={`${crashes.length}`} className="col-span-5 min-h-[280px]" badge={<Badge tone="critical"><AlertTriangle size={10} /> RISK</Badge>} inner="p-0" scroll>
          <div className="font-mono text-[10.5px]">
            {crashes.map((c) => (
              <div key={c.id} className="px-3 py-2 border-b border-onyx-600/15 hover:bg-onyx-700/20">
                <div className="flex items-center gap-2">
                  <span className="text-onyx-300 tabular-nums">{fmtShortTs(c.ts)}</span>
                  <Badge tone={c.severity as any}>{c.kind}</Badge>
                </div>
                <div className="text-onyx-100 mt-0.5 truncate">{c.target ?? c.source}</div>
              </div>
            ))}
            {crashes.length === 0 && (
              <div className="px-3 py-4 text-[10px] uppercase tracking-[0.18em] text-onyx-300">no crash events in window</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-onyx-600/30 px-2 py-1.5 bg-onyx-900/40">
      <div className="panel-label">{label}</div>
      <div className="text-onyx-100 font-mono text-[13px] tabular-nums">{value}</div>
    </div>
  );
}
