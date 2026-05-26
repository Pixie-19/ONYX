'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { fmtShortTs } from '@/lib/format';

export function RulebookPanel() {
  const rules = useOnyx((s) => s.rules);
  const events = useOnyx((s) => s.events);

  const synthetic = useMemo(() => {
    const cpuEvents = events.filter((e) => e.kind === 'CPU_SPIKE').length;
    const lat = events.filter((e) => e.kind === 'LATENCY_SURGE').length;
    const crash = events.filter((e) => e.kind === 'BUILD_CRASH').length;
    return [
      { id: 'r.cpu.spike',  name: 'CPU load below 0.85 sustained',         observed: cpuEvents, threshold: 0, breached: cpuEvents > 0,  expression: 'COUNT(CPU_SPIKE) = 0' },
      { id: 'r.lat.p95',    name: 'p95 outbound latency below 600ms',      observed: lat,       threshold: 0, breached: lat > 0,        expression: 'p95(rtt_ms) < 600' },
      { id: 'r.build.ok',   name: 'No BUILD_CRASH in active window',       observed: crash,     threshold: 0, breached: crash > 0,      expression: 'COUNT(BUILD_CRASH) = 0' },
      { id: 'r.entropy',    name: 'Average saves/min ≤ 6 per file',         observed: 0,         threshold: 6, breached: false,          expression: 'AVG(burst_rate) <= 6' },
    ];
  }, [events]);

  const overlay = useMemo(() => {
    const m = new Map<string, typeof rules[0]>();
    for (const r of rules) m.set(r.rule_id, r);
    return m;
  }, [rules]);

  return (
    <Panel
      title="Rulebook constraints"
      right={`${synthetic.length} active`}
      className="h-full"
      scroll
    >
      <div className="space-y-2">
        {synthetic.map((r) => {
          const live = overlay.get(r.id);
          const breached = live ? live.breached === 1 : r.breached;
          return (
            <div
              key={r.id}
              className="rounded-lg border border-line p-3 hover:bg-surface-sunken transition"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[12.5px] font-medium text-primary">{r.name}</span>
                <Badge tone={breached ? 'critical' : 'ok'}>{breached ? 'Breach' : 'Nominal'}</Badge>
              </div>
              <div className="text-[11.5px] text-tertiary font-mono">{r.expression}</div>
              {live && (
                <div className="text-[11px] text-tertiary mt-1 tabular-nums">
                  Observed {live.observed_value?.toFixed?.(2) ?? '—'} · threshold {live.threshold ?? '—'} · {fmtShortTs(live.ts)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
