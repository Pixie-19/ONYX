'use client';
import { useMemo } from 'react';
import { Activity, Cpu, MemoryStick, Thermometer, HardDrive, Network as NetIcon } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Sparkline } from '@/components/primitives/Sparkline';
import { Badge } from '@/components/ui/Badge';
import { fmtPct } from '@/lib/format';

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
  const thermalTone = thermalBand === 'critical' ? 'critical' : thermalBand === 'hot' ? 'error' : thermalBand === 'warm' ? 'warn' : 'info';

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Activity size={14} />}
        title="CYBERNETICS · TELEMETRY"
        subtitle="Realtime host state vector · 1s grain"
        meta={
          <>
            <Badge tone={thermalTone}>THERMAL · {thermalBand.toUpperCase()}</Badge>
            <Badge tone="muted">{telemetry.length} SAMPLES</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-3 grid grid-cols-12 gap-3 auto-rows-min">
        <MetricCard
          icon={<Cpu size={12} />}
          label="CPU LOAD"
          value={fmtPct(last?.cpu_load ?? 0, 2)}
          tone={(last?.cpu_load ?? 0) > 0.85 ? 'error' : (last?.cpu_load ?? 0) > 0.7 ? 'warn' : 'info'}
          sparkline={cpu}
          colorPair={['#22e8ff', 'rgba(34,232,255,0.14)']}
          thresholds={{ warn: 0.7, crit: 0.9 }}
          className="col-span-3"
        />
        <MetricCard
          icon={<MemoryStick size={12} />}
          label="MEMORY USED"
          value={fmtPct(last?.mem_used_pct ?? 0, 2)}
          tone={(last?.mem_used_pct ?? 0) > 0.9 ? 'critical' : (last?.mem_used_pct ?? 0) > 0.75 ? 'warn' : 'info'}
          sparkline={mem}
          colorPair={['#9b6cff', 'rgba(155,108,255,0.14)']}
          thresholds={{ warn: 0.7, crit: 0.9 }}
          className="col-span-3"
        />
        <MetricCard
          icon={<Thermometer size={12} />}
          label="THERMAL"
          value={last?.cpu_temp_c ? `${last.cpu_temp_c.toFixed(1)}°C` : '—'}
          tone={thermalTone}
          sparkline={therm}
          colorPair={['#ff6cd6', 'rgba(255,108,214,0.14)']}
          className="col-span-3"
        />
        <MetricCard
          icon={<HardDrive size={12} />}
          label="DISK BUSY"
          value={fmtPct(last?.disk_busy_pct ?? 0, 2)}
          tone="info"
          sparkline={disk}
          colorPair={['#46f5b8', 'rgba(70,245,184,0.14)']}
          className="col-span-3"
        />

        <Panel title="MEMORY PRESSURE WINDOW" right={`${last?.mem_pressure?.toFixed(3) ?? '0.000'}`} className="col-span-6 h-[220px]">
          <Sparkline values={press} width={520} height={150} stroke="#ffb84a" fill="rgba(255,184,74,0.14)" min={0} max={1} thresholds={{ warn: 0.4, crit: 0.7 }} />
          <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
            <Stat label="Swap"   value={fmtPct(last?.swap_used_pct ?? 0, 2)} />
            <Stat label="Disk IOPS" value={(last?.disk_iops ?? 0).toFixed(0)} />
            <Stat label="Procs"  value={String(last?.process_count ?? 0)} />
          </div>
        </Panel>

        <Panel title="SWAP USAGE" className="col-span-3 h-[220px]">
          <Sparkline values={swap} width={240} height={150} stroke="#ff5d6f" fill="rgba(255,93,111,0.12)" min={0} max={1} />
          <div className="mt-2 text-[10.5px] text-onyx-300 tracking-[0.18em] uppercase">
            Headroom · {(((1 - (last?.swap_used_pct ?? 0)) * 100).toFixed(1))}%
          </div>
        </Panel>

        <Panel title="PROCESS COUNT" className="col-span-3 h-[220px]">
          <Sparkline values={procs} width={240} height={150} stroke="#22e8ff" fill="rgba(34,232,255,0.12)" min={0} max={1} />
          <div className="mt-2 text-[10.5px] text-onyx-300 tracking-[0.18em] uppercase">
            Latest · {last?.process_count ?? 0}
          </div>
        </Panel>

        <Panel title="NETWORK INGRESS · BYTES/PROBE" className="col-span-6 h-[200px]" badge={<Badge tone="info"><NetIcon size={10} /> IN</Badge>}>
          <Sparkline values={netIn} width={520} height={140} stroke="#46f5b8" fill="rgba(70,245,184,0.12)" min={0} max={Math.max(...netIn, 2048)} />
        </Panel>

        <Panel title="NETWORK EGRESS · BYTES/PROBE" className="col-span-6 h-[200px]" badge={<Badge tone="info"><NetIcon size={10} /> OUT</Badge>}>
          <Sparkline values={netOut} width={520} height={140} stroke="#ffb84a" fill="rgba(255,184,74,0.12)" min={0} max={Math.max(...netOut, 1024)} />
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, tone, sparkline, colorPair, thresholds, className }: {
  icon: React.ReactNode; label: string; value: string;
  tone: 'info' | 'warn' | 'error' | 'critical' | 'ok' | 'muted';
  sparkline: number[]; colorPair: [string, string];
  thresholds?: { warn?: number; crit?: number };
  className?: string;
}) {
  return (
    <Panel className={className + ' h-[150px]'}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-onyx-300">
          {icon}
          <span className="panel-label">{label}</span>
        </div>
        <Badge tone={tone}>{value}</Badge>
      </div>
      <Sparkline values={sparkline} width={240} height={70} stroke={colorPair[0]} fill={colorPair[1]} min={0} max={1} thresholds={thresholds} />
    </Panel>
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
