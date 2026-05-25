'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { SignalPill } from '@/components/primitives/SignalPill';
import { fmtShortTs } from '@/lib/format';

export function RulebookPanel() {
  const rules = useOnyx((s) => s.rules);
  const events = useOnyx((s) => s.events);

  // synthesise a base set of rules so the panel is never empty before the
  // demo orchestrator fires its first authoritative rule row.
  const synthetic = useMemo(() => {
    const cpuEvents = events.filter((e) => e.kind === 'CPU_SPIKE').length;
    const lat = events.filter((e) => e.kind === 'LATENCY_SURGE').length;
    const crash = events.filter((e) => e.kind === 'BUILD_CRASH').length;
    return [
      { id: 'r.cpu.spike',  name: 'cpu_load < 0.85 sustained',         observed: cpuEvents, threshold: 0, breached: cpuEvents > 0,  expression: 'COUNT(CPU_SPIKE) = 0' },
      { id: 'r.lat.p95',    name: 'p95 outbound latency < 600ms',      observed: lat,       threshold: 0, breached: lat > 0,        expression: 'p95(rtt_ms) < 600' },
      { id: 'r.build.ok',   name: 'no BUILD_CRASH in active window',   observed: crash,     threshold: 0, breached: crash > 0,      expression: 'COUNT(BUILD_CRASH) = 0' },
      { id: 'r.entropy',    name: 'avg saves/min ≤ 6 per file',         observed: 0,         threshold: 6, breached: false,          expression: 'AVG(burst_rate) <= 6' },
    ];
  }, [events]);

  const overlay = useMemo(() => {
    const m = new Map<string, typeof rules[0]>();
    for (const r of rules) m.set(r.rule_id, r);
    return m;
  }, [rules]);

  return (
    <Panel title="RULEBOOK CONSTRAINTS" right={`${synthetic.length} ACTIVE`} className="h-full" inner="p-3" scroll={true}>
      <div className="space-y-2 font-mono text-[11px]">
        {synthetic.map((r) => {
          const live = overlay.get(r.id);
          const breached = live ? live.breached === 1 : r.breached;
          return (
            <div key={r.id} className="border border-onyx-600/30 px-2 py-1.5 bg-onyx-900/40 hover:bg-onyx-700/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-onyx-100">{r.name}</span>
                <SignalPill severity={breached ? 'critical' : 'info'} label={breached ? 'BREACH' : 'NOMINAL'} />
              </div>
              <div className="text-[10px] text-onyx-300 truncate">{r.expression}</div>
              {live && (
                <div className="text-[10px] text-onyx-300 mt-1 tabular-nums">
                  observed {live.observed_value?.toFixed?.(2) ?? '—'} · threshold {live.threshold ?? '—'} · {fmtShortTs(live.ts)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
