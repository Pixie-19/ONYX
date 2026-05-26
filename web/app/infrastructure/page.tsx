'use client';
import { useMemo } from 'react';
import { Network as NetIcon, Server, Plug, AlertTriangle } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { NetworkIntegrity } from '@/components/panels/NetworkIntegrity';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { fmtShortTs } from '@/lib/format';

export default function InfrastructurePage() {
  const network = useOnyx((s) => s.network);
  const topology = useOnyx((s) => s.topology);
  const events = useOnyx((s) => s.events);

  const services = useMemo(
    () => topology.nodes.filter((n) => n.kind === 'service' || n.kind === 'inference'),
    [topology.nodes],
  );
  const endpoints = useMemo(
    () => topology.nodes.filter((n) => n.kind === 'endpoint'),
    [topology.nodes],
  );

  const recentNetEvents = useMemo(
    () =>
      events
        .filter((e) => ['SOCKET_RETRY', 'LATENCY_SURGE', 'DEPENDENCY_DEGRADED'].includes(e.kind))
        .slice(-12)
        .reverse(),
    [events],
  );

  const offlineCount = network.filter((n) => n.status === 'offline').length;
  const degradedCount = network.filter((n) => n.status !== 'healthy').length;

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<NetIcon size={16} />}
        title="Infrastructure"
        subtitle="Runtime services, endpoints, processes, socket integrity"
        meta={
          <>
            <Badge tone="muted">{services.length} services</Badge>
            <Badge tone="muted">{endpoints.length} endpoints</Badge>
            <Badge tone={degradedCount ? 'warn' : 'ok'}>
              {degradedCount ? `${degradedCount} degraded` : 'All healthy'}
            </Badge>
            {offlineCount > 0 && <Badge tone="critical">{offlineCount} offline</Badge>}
          </>
        }
      />

      <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-4 overflow-auto surface-base">
        <Panel
          title="Service map"
          right="Core topology"
          className="col-span-7 min-h-[320px]"
          badge={
            <span className="inline-flex items-center gap-1 text-[11.5px] text-secondary">
              <Server size={12} /> core
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-2.5">
            {services.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-line p-3 hover:bg-surface-sunken transition"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-[8px] h-[8px] rounded-full"
                    style={{ background: s.kind === 'inference' ? '#EC4899' : '#7C3AED' }}
                  />
                  <span className="text-[12.5px] font-medium text-primary">{s.label}</span>
                  <Badge
                    tone={
                      s.health === 'critical' ? 'critical' : s.health === 'warn' ? 'warn' : 'ok'
                    }
                    className="ml-auto"
                  >
                    {s.health}
                  </Badge>
                </div>
                <div className="text-[11.5px] text-tertiary">
                  Group <span className="text-secondary">{s.group}</span> · Pulse{' '}
                  <span className="text-secondary tabular-nums">
                    {Math.round((s.pulse ?? 0) * 100)}
                  </span>
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <div className="col-span-2 py-6 text-center text-[12px] text-secondary">
                No services in topology yet
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Active endpoints"
          right={`${endpoints.length} live`}
          className="col-span-5 min-h-[320px]"
          badge={
            <span className="inline-flex items-center gap-1 text-[11.5px] text-secondary">
              <Plug size={12} /> sockets
            </span>
          }
        >
          <div className="space-y-1">
            {endpoints.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-sunken"
              >
                <span
                  className="w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ background: e.health === 'warn' ? '#F59E0B' : '#10B981' }}
                />
                <span className="text-[12.5px] text-primary truncate flex-1">{e.label}</span>
                <span className="text-[11px] text-tertiary tabular-nums">
                  {(e.meta?.rtt as number ?? 0).toFixed(0)}ms
                </span>
              </div>
            ))}
            {endpoints.length === 0 && (
              <div className="py-6 text-center text-[12px] text-secondary">
                No probed endpoints
              </div>
            )}
          </div>
        </Panel>

        <div className="col-span-7 min-h-[280px]">
          <NetworkIntegrity />
        </div>

        <Panel
          title="Recent socket incidents"
          right={`${recentNetEvents.length}`}
          className="col-span-5 min-h-[280px]"
          badge={
            <span className="inline-flex items-center gap-1 text-[11.5px] text-[#B45309] dark:text-amber-300">
              <AlertTriangle size={12} /> net
            </span>
          }
          inner="p-0"
          scroll
        >
          <div>
            {recentNetEvents.map((e) => (
              <div
                key={e.id}
                className="px-4 py-2.5 border-b border-subtle hover:bg-surface-sunken transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-tertiary tabular-nums">
                    {fmtShortTs(e.ts)}
                  </span>
                  <Badge tone={e.severity as any}>
                    {e.kind.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                </div>
                <div className="text-[12.5px] text-primary mt-0.5">{e.target}</div>
              </div>
            ))}
            {recentNetEvents.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-secondary">
                No socket incidents in window
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
