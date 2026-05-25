'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { SignalPill } from '@/components/primitives/SignalPill';

export function SystemHealth() {
  const tele = useOnyx((s) => s.telemetry);
  const last = tele[tele.length - 1];
  const therm = last?.thermal_state ?? 'nominal';
  const score = useMemo(() => {
    if (!last) return 100;
    const penalty = last.cpu_load * 40 + last.mem_used_pct * 30 + last.mem_pressure * 15
      + (therm === 'critical' ? 30 : therm === 'hot' ? 15 : therm === 'warm' ? 5 : 0);
    return Math.max(0, Math.round(100 - penalty));
  }, [last, therm]);

  const sev = score > 75 ? 'info' : score > 45 ? 'warn' : 'critical';

  return (
    <Panel title="SYSTEM HEALTH" right={`SCORE · ${score.toString().padStart(3, '0')}`} className="h-full">
      <div className="space-y-2 text-[11px] font-mono">
        <Row label="THERMAL"    value={therm.toUpperCase()} sev={therm === 'critical' ? 'critical' : therm === 'hot' ? 'error' : therm === 'warm' ? 'warn' : 'info'} />
        <Row label="CPU"        value={`${((last?.cpu_load ?? 0) * 100).toFixed(1)}%`} sev={(last?.cpu_load ?? 0) > 0.9 ? 'critical' : (last?.cpu_load ?? 0) > 0.7 ? 'warn' : 'info'} />
        <Row label="MEMORY"     value={`${((last?.mem_used_pct ?? 0) * 100).toFixed(1)}%`} sev={(last?.mem_used_pct ?? 0) > 0.9 ? 'critical' : (last?.mem_used_pct ?? 0) > 0.75 ? 'warn' : 'info'} />
        <Row label="SWAP"       value={`${((last?.swap_used_pct ?? 0) * 100).toFixed(1)}%`} sev={(last?.swap_used_pct ?? 0) > 0.5 ? 'warn' : 'info'} />
        <Row label="DISK BUSY"  value={`${((last?.disk_busy_pct ?? 0) * 100).toFixed(1)}%`} sev="info" />
        <Row label="PROCS"      value={`${last?.process_count ?? 0}`} sev="info" />
        <Row label="HEALTH"     value={String(score).padStart(3, '0')} sev={sev as any} />
      </div>
    </Panel>
  );
}

function Row({ label, value, sev }: { label: string; value: string; sev: 'info' | 'warn' | 'error' | 'critical' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-onyx-300 tracking-[0.18em] uppercase text-[10px]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-onyx-100 tabular-nums">{value}</span>
        <SignalPill severity={sev} label={sev.toUpperCase()} />
      </div>
    </div>
  );
}
