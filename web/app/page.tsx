'use client';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity, ArrowUpRight, AlertTriangle, CheckCircle2, Cpu, Database, FolderInput,
  GitBranch, Layers, MemoryStick, Network, Radio, Shield, Sparkles, BarChart3,
} from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { Sparkline } from '@/components/primitives/Sparkline';
import { fmtPct, fmtShortTs } from '@/lib/format';
import { FrameworkBadge } from '@/components/connector/FrameworkBadge';

/**
 * Executive Overview — the new ONYX landing page.
 * Calm, dense in *information* but light on visual noise. Cards above the
 * fold give the operator a single-glance answer to "is everything OK?",
 * with deeper detail flowing into focused panels below.
 *
 * All metrics here are derived from the live store (websocket-backed). No
 * placeholders. No mocked data. Telemetry / events / topology / blackout
 * are read directly from useOnyx.
 */
export default function OverviewPage() {
  const router = useRouter();
  const connected = useOnyx((s) => s.connected);
  const session = useOnyx((s) => s.session);
  const workspaces = useOnyx((s) => s.workspaces);
  const stability = useOnyx((s) => s.buildStability);
  const telemetry = useOnyx((s) => s.telemetry);
  const events = useOnyx((s) => s.events);
  const network = useOnyx((s) => s.network);
  const topology = useOnyx((s) => s.topology);
  const blackout = useOnyx((s) => s.blackout);
  const analyst = useOnyx((s) => s.analyst);
  const intel = useOnyx((s) => s.intelligence);

  useEffect(() => {
    if (!connected) return;
    const t = setTimeout(() => {
      const ws = useOnyx.getState().workspaces;
      if (ws.length === 0) router.replace('/connect');
    }, 350);
    return () => clearTimeout(t);
  }, [connected, router]);

  const last = telemetry[telemetry.length - 1];

  const cpuSeries = useMemo(() => telemetry.slice(-60).map((t) => t.cpu_load), [telemetry]);
  const memSeries = useMemo(() => telemetry.slice(-60).map((t) => t.mem_used_pct), [telemetry]);
  const stabilitySeries = useMemo(() => {
    const buckets = new Array<number>(48).fill(0);
    const now = Date.now();
    let total = 0, fails = 0;
    for (let i = 0; i < 48; i += 1) {
      const t0 = now - (48 - i) * 10_000;
      const t1 = t0 + 10_000;
      const window = events.filter((e) => e.ts >= t0 && e.ts < t1);
      total = window.length;
      fails = window.filter((e) => e.severity === 'critical' || e.severity === 'error').length;
      buckets[i] = total === 0 ? 1 : Math.max(0, 1 - fails / total);
    }
    return buckets;
  }, [events]);

  const recent = events.slice(-1).pop();
  const last60s = useMemo(() => events.filter((e) => e.ts > Date.now() - 60_000), [events]);
  const critRecent = useMemo(
    () => events.filter((e) => e.severity === 'critical' || e.severity === 'error').slice(-6).reverse(),
    [events],
  );

  const services = topology.nodes.filter((n) => n.kind === 'service' || n.kind === 'inference');
  const degraded = network.filter((n) => n.status !== 'healthy').length;
  const offline = network.filter((n) => n.status === 'offline').length;

  const latestInsight = analyst.slice().reverse()[0];

  return (
    <div className="h-full overflow-auto surface-base">
      <div className="max-w-[1480px] mx-auto px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-end justify-between mb-8 flex-wrap gap-4"
        >
          <div>
            <div className="eyebrow mb-2">Overview</div>
            <h1 className="text-[28px] font-semibold tracking-tight text-primary leading-tight">
              Operational state
            </h1>
            <p className="text-[13.5px] text-secondary mt-1">
              {workspaces.length > 0
                ? `Streaming live signal from ${workspaces.length} workspace${workspaces.length === 1 ? '' : 's'} · session ${session ?? '—'}`
                : 'No workspace attached — connect a project to start streaming signal.'}
            </p>
          </div>
          {workspaces.length === 0 && (
            <Link href="/connect" className="btn btn-accent h-9 px-4 text-[13px]">
              <FolderInput size={14} /> Open Workspace Connector
            </Link>
          )}
          {workspaces.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-tertiary">Attached:</span>
              {workspaces.map((w) => (
                <Link
                  key={w.id}
                  href="/connect"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md surface-raised border border-line hover:border-strong text-[12px] text-primary"
                >
                  <span className="font-medium">{w.name}</span>
                  <FrameworkBadge framework={w.framework} />
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* KPI strip — system health, stability, throughput, blackout */}
        <div className="grid grid-cols-12 gap-4">
          <Kpi
            className="col-span-3"
            label="Build stability"
            value={stability.toString()}
            unit="/ 100"
            tone={stability > 80 ? 'ok' : stability > 50 ? 'warn' : 'error'}
            sparkline={stabilitySeries}
            footer={
              <Link href="/stability" className="link-row">
                Open stability
                <ArrowUpRight size={12} />
              </Link>
            }
            icon={<BarChart3 size={15} />}
          />
          <Kpi
            className="col-span-3"
            label="CPU load"
            value={fmtPct(last?.cpu_load ?? 0, 0)}
            unit=""
            tone={(last?.cpu_load ?? 0) > 0.85 ? 'error' : (last?.cpu_load ?? 0) > 0.7 ? 'warn' : 'ok'}
            sparkline={cpuSeries}
            sparklineColor="#4F46E5"
            sparklineFill="rgba(79,70,229,0.10)"
            footer={
              <span className="text-[11.5px] text-tertiary">
                Thermal {last?.thermal_state ?? 'nominal'}
              </span>
            }
            icon={<Cpu size={15} />}
          />
          <Kpi
            className="col-span-3"
            label="Memory used"
            value={fmtPct(last?.mem_used_pct ?? 0, 0)}
            unit=""
            tone={(last?.mem_used_pct ?? 0) > 0.9 ? 'critical' : (last?.mem_used_pct ?? 0) > 0.75 ? 'warn' : 'ok'}
            sparkline={memSeries}
            sparklineColor="#7C3AED"
            sparklineFill="rgba(124,58,237,0.10)"
            footer={
              <span className="text-[11.5px] text-tertiary">
                Pressure {(last?.mem_pressure ?? 0).toFixed(2)}
              </span>
            }
            icon={<MemoryStick size={15} />}
          />
          <Kpi
            className="col-span-3"
            label="Inference routing"
            value={blackout.online ? blackout.provider : 'Local'}
            unit=""
            tone={blackout.online ? 'ok' : 'warn'}
            stringValue
            icon={<Shield size={15} />}
            footer={
              <Link href="/blackout" className="link-row">
                Continuity center
                <ArrowUpRight size={12} />
              </Link>
            }
          />
        </div>

        {/* Two-column main */}
        <div className="grid grid-cols-12 gap-4 mt-4">
          {/* Left column: topology preview + AI insight */}
          <div className="col-span-8 flex flex-col gap-4">
            <div className="panel">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <div>
                  <div className="text-[12.5px] font-semibold text-primary">Live topology</div>
                  <div className="text-[11.5px] text-secondary mt-0.5">
                    {topology.nodes.length} nodes · {topology.edges.length} edges
                  </div>
                </div>
                <Link href="/graph" className="btn btn-outline h-8 px-3 text-[12.5px]">
                  Open graph <ArrowUpRight size={13} />
                </Link>
              </div>
              <div className="p-5">
                <TopologyPreview />
              </div>
            </div>

            <div className="panel">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#F5F3FF] dark:bg-violet-400/15 flex items-center justify-center">
                    <Sparkles size={14} className="text-[#7C3AED] dark:text-violet-300" />
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold text-primary">
                      Latest AI intelligence
                    </div>
                    <div className="text-[11.5px] text-secondary mt-0.5">
                      {latestInsight
                        ? `${latestInsight.provider} · ${fmtShortTs(latestInsight.ts)}`
                        : 'No digest yet — analyst is idle'}
                    </div>
                  </div>
                </div>
                <Link href="/intelligence" className="btn btn-outline h-8 px-3 text-[12.5px]">
                  Open intelligence <ArrowUpRight size={13} />
                </Link>
              </div>
              <div className="p-5">
                {latestInsight ? (
                  <p className="text-[14px] leading-relaxed text-primary max-w-[820px]">
                    {latestInsight.text}
                  </p>
                ) : (
                  <p className="text-[13px] text-secondary">
                    The operational analyst is awaiting its first dispatch. Trigger a digest from the
                    command palette ⌘K or use the Intelligence page.
                  </p>
                )}
                <div className="mt-4 flex items-center gap-3 text-[11.5px] text-tertiary">
                  <span>{intel.length} intelligence queries executed</span>
                  <span>·</span>
                  <span>{analyst.length} analyst digests</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: service health + recent failures + nav */}
          <div className="col-span-4 flex flex-col gap-4">
            <div className="panel">
              <div className="px-5 py-4 border-b border-line">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12.5px] font-semibold text-primary">Service health</div>
                    <div className="text-[11.5px] text-secondary mt-0.5">
                      {services.length} services · {events.length} events buffered
                    </div>
                  </div>
                  {degraded === 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#047857] dark:text-emerald-300">
                      <CheckCircle2 size={13} /> All healthy
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#B45309] dark:text-amber-300">
                      <AlertTriangle size={13} /> {degraded} degraded
                      {offline > 0 && ` · ${offline} offline`}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3">
                {services.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-surface-sunken"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        background:
                          s.health === 'critical'
                            ? '#EF4444'
                            : s.health === 'warn'
                              ? '#F59E0B'
                              : '#10B981',
                      }}
                    />
                    <span className="text-[12.5px] text-primary truncate flex-1">{s.label}</span>
                    <span className="text-[11px] text-tertiary tabular-nums">
                      {Math.round((s.pulse ?? 0) * 100)}
                    </span>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="text-[12px] text-secondary p-2 text-center">
                    No services discovered yet.
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="px-5 py-4 border-b border-line">
                <div className="text-[12.5px] font-semibold text-primary">Recent failures</div>
                <div className="text-[11.5px] text-secondary mt-0.5">
                  Critical + error events
                </div>
              </div>
              <div className="p-2">
                {critRecent.map((e) => (
                  <Link
                    key={e.id}
                    href="/events"
                    className="block px-3 py-2.5 rounded-md hover:bg-surface-sunken"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background: e.severity === 'critical' ? '#DC2626' : '#EF4444',
                        }}
                      />
                      <span className="text-[12.5px] font-medium text-primary truncate flex-1">
                        {e.kind.replace(/_/g, ' ').toLowerCase()}
                      </span>
                      <span className="text-[11px] text-tertiary tabular-nums">
                        {fmtShortTs(e.ts)}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-secondary truncate ml-3.5 mt-0.5">
                      {e.target ?? e.source}
                    </div>
                  </Link>
                ))}
                {critRecent.length === 0 && (
                  <div className="text-[12px] text-secondary p-3 text-center">
                    No critical events. System nominal.
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="px-5 py-4 border-b border-line">
                <div className="text-[12.5px] font-semibold text-primary">Throughput</div>
                <div className="text-[11.5px] text-secondary mt-0.5">Last 60 seconds</div>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <Stat label="Events" value={String(last60s.length)} sub="/ min" />
                <Stat label="SQL exec" value={String(intel.length)} sub="total" />
                <Stat label="Topology" value={String(topology.nodes.length)} sub="nodes" />
                <Stat label="Network" value={String(network.length)} sub="samples" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick navigation grid */}
        <div className="mt-8">
          <div className="eyebrow mb-3">Explore</div>
          <div className="grid grid-cols-4 gap-3">
            <NavTile href="/graph" icon={<Layers size={15} />} title="Graph" desc="Live topology of services, files, endpoints" />
            <NavTile href="/telemetry" icon={<Activity size={15} />} title="Telemetry" desc="CPU, memory, thermal, disk, processes" />
            <NavTile href="/replay" icon={<GitBranch size={15} />} title="Replay" desc="Causal reconstruction with scrubbing" />
            <NavTile href="/sql" icon={<Database size={15} />} title="SQL" desc="Cross-source relational queries" />
            <NavTile href="/infrastructure" icon={<Network size={15} />} title="Infrastructure" desc="Runtime services, processes, sockets" />
            <NavTile href="/events" icon={<Radio size={15} />} title="Events" desc="Append-only event stream" />
            <NavTile href="/intelligence" icon={<Sparkles size={15} />} title="Intelligence" desc="Operational AI cognition" />
            <NavTile href="/blackout" icon={<Shield size={15} />} title="Blackout" desc="Continuity & fallback routing" />
          </div>
        </div>

        <div className="mt-8 mb-4 text-[11.5px] text-tertiary text-center">
          ⌘K command palette · D demo · B blackout · C cinema
        </div>
      </div>
    </div>
  );
}

function Kpi({
  className,
  label,
  value,
  unit,
  tone,
  sparkline,
  sparklineColor = '#10B981',
  sparklineFill = 'rgba(16,185,129,0.10)',
  footer,
  icon,
  stringValue,
}: {
  className?: string;
  label: string;
  value: string;
  unit?: string;
  tone: 'ok' | 'warn' | 'error' | 'critical';
  sparkline?: number[];
  sparklineColor?: string;
  sparklineFill?: string;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  stringValue?: boolean;
}) {
  const toneColor =
    tone === 'ok'
      ? '#10B981'
      : tone === 'warn'
        ? '#F59E0B'
        : tone === 'error'
          ? '#EF4444'
          : '#DC2626';
  return (
    <div className={`panel ${className ?? ''}`}>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-medium text-secondary">{label}</span>
          <span className="text-tertiary">{icon}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          {stringValue ? (
            <span className="text-[22px] font-semibold tracking-tight text-primary capitalize">
              {value}
            </span>
          ) : (
            <>
              <span className="metric-xl">{value}</span>
              {unit && <span className="text-[13px] text-tertiary">{unit}</span>}
            </>
          )}
          <span
            className="ml-auto w-2 h-2 rounded-full"
            style={{ background: toneColor }}
            aria-hidden
          />
        </div>
        {sparkline && (
          <div className="mt-3">
            <Sparkline
              values={sparkline}
              width={240}
              height={36}
              stroke={sparklineColor}
              fill={sparklineFill}
              min={0}
              max={1}
            />
          </div>
        )}
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11.5px] text-tertiary">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="metric-md">{value}</span>
        {sub && <span className="text-[11.5px] text-tertiary">{sub}</span>}
      </div>
    </div>
  );
}

function NavTile({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="panel block p-4 group hover:shadow-panel-lg transition"
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="w-7 h-7 rounded-md surface-sunken flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="text-[13.5px] font-semibold text-primary">{title}</span>
        <ArrowUpRight
          size={13}
          className="ml-auto text-tertiary group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition"
        />
      </div>
      <p className="text-[12px] text-secondary leading-relaxed">{desc}</p>
    </Link>
  );
}

function TopologyPreview() {
  const topology = useOnyx((s) => s.topology);
  // Simple density visualisation: a row of node-kind columns with counts
  const groups: { kind: string; count: number; color: string; label: string }[] = [
    { kind: 'file',      count: topology.nodes.filter((n) => n.kind === 'file').length,      color: '#4F46E5', label: 'Files' },
    { kind: 'service',   count: topology.nodes.filter((n) => n.kind === 'service').length,   color: '#7C3AED', label: 'Services' },
    { kind: 'endpoint',  count: topology.nodes.filter((n) => n.kind === 'endpoint').length,  color: '#10B981', label: 'Endpoints' },
    { kind: 'process',   count: topology.nodes.filter((n) => n.kind === 'process').length,   color: '#F59E0B', label: 'Processes' },
    { kind: 'inference', count: topology.nodes.filter((n) => n.kind === 'inference').length, color: '#EC4899', label: 'Inference' },
  ];
  const max = Math.max(1, ...groups.map((g) => g.count));
  return (
    <div className="grid grid-cols-5 gap-4">
      {groups.map((g) => (
        <div key={g.kind} className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
            <span className="text-[11.5px] text-secondary">{g.label}</span>
          </div>
          <div className="text-[22px] font-semibold text-primary tabular-nums">{g.count}</div>
          <div className="mt-2 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(g.count / max) * 100}%`,
                background: g.color,
                opacity: 0.7,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
