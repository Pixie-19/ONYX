'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { Sparkline } from '@/components/primitives/Sparkline';
import { Badge } from '@/components/ui/Badge';
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
      title="System cybernetics"
      right={`Thermal · ${therm}`}
      badge={
        <Badge
          tone={
            therm === 'critical'
              ? 'critical'
              : therm === 'hot'
                ? 'error'
                : therm === 'warm'
                  ? 'warn'
                  : 'ok'
          }
        >
          {therm}
        </Badge>
      }
      className="h-full"
    >
      <div className="space-y-4">
        <Metric label="CPU load" value={fmtPct(latest?.cpu_load ?? 0, 1)} sub={`${procs} procs`}>
          <Sparkline
            values={cpu}
            stroke="#4F46E5"
            fill="rgba(79,70,229,0.10)"
            thresholds={{ warn: 0.7, crit: 0.9 }}
            min={0}
            max={1}
          />
        </Metric>
        <Metric label="Memory used" value={fmtPct(latest?.mem_used_pct ?? 0, 1)} sub={`Pressure ${fmtPct(latest?.mem_pressure ?? 0, 1)}`}>
          <Sparkline
            values={mem}
            stroke="#7C3AED"
            fill="rgba(124,58,237,0.10)"
            thresholds={{ warn: 0.7, crit: 0.9 }}
            min={0}
            max={1}
          />
        </Metric>
        <Metric label="Memory pressure" value={(latest?.mem_pressure ?? 0).toFixed(3)} sub={`Swap ${fmtPct(latest?.swap_used_pct ?? 0, 1)}`}>
          <Sparkline values={press} stroke="#F59E0B" fill="rgba(245,158,11,0.10)" min={0} max={1} />
        </Metric>

        <div className="hr-label">Network trajectories</div>

        {[...rttSeries.entries()].slice(0, 4).map(([ep, vals]) => {
          const last = vals[vals.length - 1] ?? 0;
          const sev = last > 800 ? 'critical' : last > 400 ? 'warn' : 'ok';
          const color = sev === 'critical' ? '#DC2626' : sev === 'warn' ? '#F59E0B' : '#10B981';
          const fill =
            sev === 'critical'
              ? 'rgba(220,38,38,0.10)'
              : sev === 'warn'
                ? 'rgba(245,158,11,0.10)'
                : 'rgba(16,185,129,0.10)';
          return (
            <Metric key={ep} label={ep} value={`${last.toFixed(1)}ms`} sub={sev === 'ok' ? 'healthy' : sev}>
              <Sparkline values={vals} stroke={color} fill={fill} min={0} max={1500} />
            </Metric>
          );
        })}

        <div className="hr-label">Inference routing</div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-secondary">Provider</span>
          <Badge tone={blackout.online ? 'info' : 'warn'}>{blackout.provider}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-secondary">Reason</span>
          <span className="text-[12.5px] text-primary">{blackout.reason}</span>
        </div>
      </div>
    </Panel>
  );
}

function Metric({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] font-medium text-secondary">{label}</span>
        <span className="text-[13.5px] font-semibold text-primary tabular-nums">{value}</span>
      </div>
      {children}
      {sub && <div className="text-[11px] text-tertiary mt-1">{sub}</div>}
    </div>
  );
}
