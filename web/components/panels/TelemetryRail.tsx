'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { Sparkline } from '@/components/primitives/Sparkline';
import { SignalPill } from '@/components/primitives/SignalPill';
import { fmtPct } from '@/lib/format';

export function TelemetryRail() {
  const telemetry = useOnyx((s) => s.telemetry);
  const network = useOnyx((s) => s.network);
  const blackout = useOnyx((s) => s.blackout);

  const cpu = useMemo(() => telemetry.map((t) => t.cpu_load), [telemetry]);
  const mem = useMemo(() => telemetry.map((t) => t.mem_used_pct), [telemetry]);
  const press = useMemo(() => telemetry.map((t) => Math.min(1, t.mem_pressure)), [telemetry]);
  const rttSeries = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const n of network) {
      const arr = map.get(n.endpoint) ?? [];
      arr.push(n.rtt_ms);
      if (arr.length > 40) arr.shift();
      map.set(n.endpoint, arr);
    }
    return map;
  }, [network]);

  const latest = telemetry[telemetry.length - 1];
  const therm = latest?.thermal_state ?? 'nominal';
  const procs = latest?.process_count ?? 0;

  return (
    <Panel
      title="SYSTEM CYBERNETICS"
      right={`THERMAL · ${therm.toUpperCase()}`}
      badge={<SignalPill severity={therm === 'critical' ? 'critical' : therm === 'hot' ? 'error' : therm === 'warm' ? 'warn' : 'info'} label={therm.toUpperCase()} />}
      className="h-full"
    >
      <div className="space-y-3">
        <Metric label="CPU LOAD" value={fmtPct(latest?.cpu_load ?? 0, 1)} sub={`${procs} procs`}>
          <Sparkline values={cpu} stroke="#22e8ff" fill="rgba(34,232,255,0.12)" thresholds={{ warn: 0.7, crit: 0.9 }} min={0} max={1} />
        </Metric>
        <Metric label="MEMORY USED" value={fmtPct(latest?.mem_used_pct ?? 0, 1)} sub={`pressure ${fmtPct(latest?.mem_pressure ?? 0, 1)}`}>
          <Sparkline values={mem} stroke="#9b6cff" fill="rgba(155,108,255,0.12)" thresholds={{ warn: 0.7, crit: 0.9 }} min={0} max={1} />
        </Metric>
        <Metric label="MEM PRESSURE" value={(latest?.mem_pressure ?? 0).toFixed(3)} sub={`swap ${fmtPct(latest?.swap_used_pct ?? 0, 1)}`}>
          <Sparkline values={press} stroke="#ffb84a" fill="rgba(255,184,74,0.12)" min={0} max={1} />
        </Metric>

        <div className="hr-label">NETWORK TRAJECTORIES</div>

        {[...rttSeries.entries()].slice(0, 4).map(([ep, vals]) => {
          const last = vals[vals.length - 1] ?? 0;
          const sev = last > 800 ? 'critical' : last > 400 ? 'warn' : 'info';
          return (
            <Metric
              key={ep}
              label={ep}
              value={`${last.toFixed(1)}ms`}
              sub={sev === 'info' ? 'healthy' : sev}
            >
              <Sparkline
                values={vals}
                stroke={sev === 'critical' ? '#ff2d6b' : sev === 'warn' ? '#ffb84a' : '#46f5b8'}
                fill={sev === 'critical' ? 'rgba(255,45,107,0.12)' : sev === 'warn' ? 'rgba(255,184,74,0.12)' : 'rgba(70,245,184,0.12)'}
                thresholds={{ warn: 0.5, crit: 0.9 }}
                min={0}
                max={1500}
              />
            </Metric>
          );
        })}

        <div className="hr-label">INFERENCE ROUTING</div>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-onyx-300">PROVIDER</span>
          <SignalPill severity={blackout.online ? 'info' : 'warn'} label={blackout.provider.toUpperCase()} />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-onyx-300">REASON</span>
          <span className="text-onyx-100 tracking-wider">{blackout.reason}</span>
        </div>
      </div>
    </Panel>
  );
}

function Metric({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="panel-label">{label}</span>
        <span className="text-onyx-100 font-mono text-sm tabular-nums">{value}</span>
      </div>
      {children}
      {sub && <div className="text-[9.5px] text-onyx-300 tracking-[0.18em] uppercase mt-1">{sub}</div>}
    </div>
  );
}
