'use client';
import { useMemo } from 'react';
import { Activity, Cpu, MemoryStick, Thermometer, HardDrive, ArrowDown, ArrowUp } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Sparkline } from '@/components/primitives/Sparkline';
import { Badge } from '@/components/ui/Badge';
import { fmtPct } from '@/lib/format';

const COL = {
  cpu:     { stroke: '#4F46E5', fill: 'rgba(79,70,229,0.10)' },
  mem:     { stroke: '#7C3AED', fill: 'rgba(124,58,237,0.10)' },
  thermal: { stroke: '#EC4899', fill: 'rgba(236,72,153,0.10)' },
  disk:    { stroke: '#10B981', fill: 'rgba(16,185,129,0.10)' },
  swap:    { stroke: '#EF4444', fill: 'rgba(239,68,68,0.10)' },
  procs:   { stroke: '#3B82F6', fill: 'rgba(59,130,246,0.10)' },
  netIn:   { stroke: '#10B981', fill: 'rgba(16,185,129,0.10)' },
  netOut:  { stroke: '#F59E0B', fill: 'rgba(245,158,11,0.10)' },
  press:   { stroke: '#F59E0B', fill: 'rgba(245,158,11,0.10)' },
};

export default function TelemetryPage() {
  const telemetry = useOnyx((s) => s.telemetry);
  const network = useOnyx((s) => s.network);
  const last = telemetry[telemetry.length - 1];

  const cpu = useMemo(() => telemetry.map((t) => t.cpu_load), [telemetry]);
  const mem = useMemo(() => telemetry.map((t) => t.mem_used_pct), [telemetry]);
  const swap = useMemo(() => telemetry.map((t) => t.swap_used_pct), [telemetry]);
  const press = useMemo(() => telemetry.map((t) => Math.min(1, t.mem_pressure)), [telemetry]);
  const therm = useMemo(() => telemetry.map((t) => (t.cpu_temp_c ?? 0) / 100), [telemetry]);
  const disk = useMemo(() => telemetry.map((t) => t.disk_busy_pct), [telemetry]);
  const procs = useMemo(() => telemetry.map((t) => t.process_count / 600), [telemetry]);

  const netIn = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 60; i += 1) arr.push(0);
    for (const n of network.slice(-60)) arr.push(n.bytes_in);
    return arr.slice(-60);
  }, [network]);
  const netOut = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 60; i += 1) arr.push(0);
    for (const n of network.slice(-60)) arr.push(n.bytes_out);
    return arr.slice(-60);
  }, [network]);

  const thermalBand = last?.thermal_state ?? 'nominal';
  const thermalTone =
    thermalBand === 'critical'
      ? 'critical'
      : thermalBand === 'hot'
        ? 'error'
        : thermalBand === 'warm'
          ? 'warn'
          : 'ok';

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Activity size={16} />}
        title="Telemetry"
        subtitle="Realtime host state vector · 1 second grain"
        meta={
          <>
            <Badge tone={thermalTone as any}>Thermal · {thermalBand}</Badge>
            <Badge tone="muted">{telemetry.length} samples</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6 surface-base">
        <div className="grid grid-cols-12 gap-4 max-w-[1480px] mx-auto">
          {/* Top row — 4 hero metric cards */}
          <MetricCard
            className="col-span-3"
            icon={<Cpu size={14} />}
            label="CPU load"
            value={fmtPct(last?.cpu_load ?? 0, 1)}
            tone={(last?.cpu_load ?? 0) > 0.85 ? 'error' : (last?.cpu_load ?? 0) > 0.7 ? 'warn' : 'ok'}
            sparkline={cpu}
            colors={COL.cpu}
            thresholds={{ warn: 0.7, crit: 0.9 }}
          />
          <MetricCard
            className="col-span-3"
            icon={<MemoryStick size={14} />}
            label="Memory used"
            value={fmtPct(last?.mem_used_pct ?? 0, 1)}
            tone={(last?.mem_used_pct ?? 0) > 0.9 ? 'critical' : (last?.mem_used_pct ?? 0) > 0.75 ? 'warn' : 'ok'}
            sparkline={mem}
            colors={COL.mem}
            thresholds={{ warn: 0.7, crit: 0.9 }}
          />
          <MetricCard
            className="col-span-3"
            icon={<Thermometer size={14} />}
            label="Thermal"
            value={last?.cpu_temp_c ? `${last.cpu_temp_c.toFixed(1)}°C` : '—'}
            tone={thermalTone as any}
            sparkline={therm}
            colors={COL.thermal}
          />
          <MetricCard
            className="col-span-3"
            icon={<HardDrive size={14} />}
            label="Disk busy"
            value={fmtPct(last?.disk_busy_pct ?? 0, 1)}
            tone={(last?.disk_busy_pct ?? 0) > 0.85 ? 'error' : 'ok'}
            sparkline={disk}
            colors={COL.disk}
          />

          {/* Memory pressure window */}
          <Panel title="Memory pressure window" right={`${(last?.mem_pressure ?? 0).toFixed(3)}`} className="col-span-8">
            <Sparkline
              values={press}
              width={760}
              height={170}
              stroke={COL.press.stroke}
              fill={COL.press.fill}
              min={0}
              max={1}
              thresholds={{ warn: 0.4, crit: 0.7 }}
            />
            <div className="grid grid-cols-3 gap-3 mt-4">
              <Stat label="Swap used"     value={fmtPct(last?.swap_used_pct ?? 0, 1)} />
              <Stat label="Disk IOPS"     value={(last?.disk_iops ?? 0).toFixed(0)} />
              <Stat label="Process count" value={String(last?.process_count ?? 0)} />
            </div>
          </Panel>

          {/* Swap usage */}
          <Panel title="Swap" className="col-span-4">
            <Sparkline
              values={swap}
              width={300}
              height={170}
              stroke={COL.swap.stroke}
              fill={COL.swap.fill}
              min={0}
              max={1}
            />
            <div className="mt-3 text-[12px] text-secondary">
              Headroom · {((1 - (last?.swap_used_pct ?? 0)) * 100).toFixed(1)}%
            </div>
          </Panel>

          {/* Network I/O */}
          <Panel
            title="Network ingress"
            right={<span className="inline-flex items-center gap-1 text-[#047857] dark:text-emerald-300"><ArrowDown size={12} /> bytes / probe</span>}
            className="col-span-6"
          >
            <Sparkline
              values={netIn}
              width={520}
              height={160}
              stroke={COL.netIn.stroke}
              fill={COL.netIn.fill}
              min={0}
              max={Math.max(...netIn, 2048)}
            />
          </Panel>
          <Panel
            title="Network egress"
            right={<span className="inline-flex items-center gap-1 text-[#B45309] dark:text-amber-300"><ArrowUp size={12} /> bytes / probe</span>}
            className="col-span-6"
          >
            <Sparkline
              values={netOut}
              width={520}
              height={160}
              stroke={COL.netOut.stroke}
              fill={COL.netOut.fill}
              min={0}
              max={Math.max(...netOut, 1024)}
            />
          </Panel>

          {/* Process counts */}
          <Panel title="Process count" className="col-span-12">
            <div className="flex items-end gap-6">
              <div className="metric-xl">{last?.process_count ?? 0}</div>
              <div className="flex-1">
                <Sparkline
                  values={procs}
                  width={860}
                  height={70}
                  stroke={COL.procs.stroke}
                  fill={COL.procs.fill}
                  min={0}
                  max={1}
                />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
  sparkline,
  colors,
  thresholds,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'info' | 'warn' | 'error' | 'critical' | 'ok' | 'muted';
  sparkline: number[];
  colors: { stroke: string; fill: string };
  thresholds?: { warn?: number; crit?: number };
  className?: string;
}) {
  const dotColor =
    tone === 'ok'
      ? '#10B981'
      : tone === 'warn'
        ? '#F59E0B'
        : tone === 'error'
          ? '#EF4444'
          : tone === 'critical'
            ? '#DC2626'
            : '#9CA3AF';
  return (
    <div className={`panel ${className ?? ''}`}>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[12px] text-secondary">
            <span className="text-tertiary">{icon}</span>
            {label}
          </span>
          <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
        </div>
        <div className="mt-2 metric-xl">{value}</div>
        <div className="mt-2">
          <Sparkline
            values={sparkline}
            width={260}
            height={50}
            stroke={colors.stroke}
            fill={colors.fill}
            min={0}
            max={1}
            thresholds={thresholds}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line p-3 surface-inset">
      <div className="text-[11px] text-tertiary">{label}</div>
      <div className="text-[16px] font-semibold text-primary tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
