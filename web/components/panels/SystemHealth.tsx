'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';

export function SystemHealth() {
  const tele = useOnyx((s) => s.telemetry);
  const last = tele[tele.length - 1];
  const therm = last?.thermal_state ?? 'nominal';
  const score = useMemo(() => {
    if (!last) return 100;
    const penalty =
      last.cpu_load * 40 +
      last.mem_used_pct * 30 +
      last.mem_pressure * 15 +
      (therm === 'critical' ? 30 : therm === 'hot' ? 15 : therm === 'warm' ? 5 : 0);
    return Math.max(0, Math.round(100 - penalty));
  }, [last, therm]);

  const sev = score > 75 ? 'ok' : score > 45 ? 'warn' : 'critical';

  return (
    <Panel
      title="System health"
      right={`Score · ${score}`}
      className="h-full"
    >
      <div className="space-y-1">
        <Row
          label="Thermal"
          value={therm}
          tone={
            therm === 'critical'
              ? 'critical'
              : therm === 'hot'
                ? 'error'
                : therm === 'warm'
                  ? 'warn'
                  : 'ok'
          }
        />
        <Row
          label="CPU"
          value={`${((last?.cpu_load ?? 0) * 100).toFixed(1)}%`}
          tone={
            (last?.cpu_load ?? 0) > 0.9
              ? 'critical'
              : (last?.cpu_load ?? 0) > 0.7
                ? 'warn'
                : 'ok'
          }
        />
        <Row
          label="Memory"
          value={`${((last?.mem_used_pct ?? 0) * 100).toFixed(1)}%`}
          tone={
            (last?.mem_used_pct ?? 0) > 0.9
              ? 'critical'
              : (last?.mem_used_pct ?? 0) > 0.75
                ? 'warn'
                : 'ok'
          }
        />
        <Row
          label="Swap"
          value={`${((last?.swap_used_pct ?? 0) * 100).toFixed(1)}%`}
          tone={(last?.swap_used_pct ?? 0) > 0.5 ? 'warn' : 'ok'}
        />
        <Row
          label="Disk busy"
          value={`${((last?.disk_busy_pct ?? 0) * 100).toFixed(1)}%`}
          tone="info"
        />
        <Row label="Processes" value={String(last?.process_count ?? 0)} tone="info" />
        <Row label="Health" value={String(score)} tone={sev as any} />
      </div>
    </Panel>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'info' | 'warn' | 'error' | 'critical' | 'ok';
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-subtle last:border-b-0">
      <span className="text-[12px] text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[12.5px] text-primary font-medium tabular-nums">{value}</span>
        <Badge tone={tone}>{tone}</Badge>
      </div>
    </div>
  );
}
