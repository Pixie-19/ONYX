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

  // Derive a service-level view from topology service/inference nodes
  const services = useMemo(() => {
    return topology.nodes.filter((n) => n.kind === 'service' || n.kind === 'inference');
  }, [topology.nodes]);

  const endpoints = useMemo(() => topology.nodes.filter((n) => n.kind === 'endpoint'), [topology.nodes]);

  const recentNetEvents = useMemo(
    () => events.filter((e) => ['SOCKET_RETRY','LATENCY_SURGE','DEPENDENCY_DEGRADED'].includes(e.kind)).slice(-12).reverse(),
    [events],
  );

  const offlineCount = network.filter((n) => n.status === 'offline').length;
  const degradedCount = network.filter((n) => n.status !== 'healthy').length;

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<NetIcon size={14} />}
        title="RUNTIME INFRASTRUCTURE"
        subtitle="Local services, endpoints, processes, socket integrity"
        meta={
          <>
            <Badge tone="muted">{services.length} SERVICES</Badge>
            <Badge tone="muted">{endpoints.length} ENDPOINTS</Badge>
            <Badge tone={degradedCount ? 'warn' : 'ok'}>{degradedCount ? `${degradedCount} DEGRADED` : 'ALL OK'}</Badge>
            {offlineCount > 0 && <Badge tone="critical">{offlineCount} OFFLINE</Badge>}
          </>
        }
      />

      <div className="flex-1 min-h-0 p-3 grid grid-cols-12 grid-rows-[auto_1fr] gap-3 overflow-auto">
        <Panel
          title="SERVICE MAP"
          right="CORE TOPOLOGY"
          className="col-span-7 row-span-1 min-h-[300px]"
          badge={<Badge tone="info"><Server size={10} /> CORE</Badge>}
        >
          <div className="grid grid-cols-2 gap-2">
            {services.map((s) => (
              <div key={s.id} className="border border-onyx-600/30 px-3 py-2 bg-onyx-900/40 hover:bg-onyx-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-[6px] h-[6px] rounded-full"
                    style={{ background: s.kind === 'inference' ? '#ff6cd6' : '#9b6cff', boxShadow: `0 0 6px ${s.kind === 'inference' ? '#ff6cd6' : '#9b6cff'}` }}
                  />
                  <span className="text-onyx-100 font-mono text-[12px]">{s.label}</span>
                  <Badge tone={s.health === 'critical' ? 'critical' : s.health === 'warn' ? 'warn' : 'info'} className="ml-auto">{s.health.toUpperCase()}</Badge>
                </div>
                <div className="text-[10px] tracking-[0.18em] uppercase text-onyx-300">
                  GROUP {s.group} · PULSE {Math.round((s.pulse ?? 0) * 100)}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="ACTIVE ENDPOINTS"
          right={`${endpoints.length} LIVE`}
          className="col-span-5 min-h-[300px]"
          badge={<Badge tone="info"><Plug size={10} /> SOCKETS</Badge>}
        >
          <div className="space-y-1.5 font-mono text-[11px]">
            {endpoints.map((e) => (
              <div key={e.id} className="flex items-center gap-2">
                <span
                  className="w-[5px] h-[5px] rounded-full"
                  style={{ background: e.health === 'warn' ? '#ffb84a' : '#46f5b8', boxShadow: '0 0 4px currentColor' }}
                />
                <span className="text-onyx-100 truncate flex-1">{e.label}</span>
                <Badge tone={e.health === 'warn' ? 'warn' : 'ok'} className="!py-0">
                  {(e.meta?.rtt as number ?? 0).toFixed(0)}ms
                </Badge>
              </div>
            ))}
            {endpoints.length === 0 && (
              <div className="text-[10px] uppercase tracking-[0.18em] text-onyx-300">no probed endpoints</div>
            )}
          </div>
        </Panel>

        <div className="col-span-7 min-h-[260px]">
          <NetworkIntegrity />
        </div>

        <Panel
          title="RECENT SOCKET INCIDENTS"
          right={`${recentNetEvents.length}`}
          className="col-span-5 min-h-[260px]"
          badge={<Badge tone="warn"><AlertTriangle size={10} /> NET</Badge>}
          inner="p-0"
          scroll
        >
          <div className="font-mono text-[10.5px]">
            {recentNetEvents.map((e) => (
              <div key={e.id} className="px-3 py-2 border-b border-onyx-600/15 hover:bg-onyx-700/20">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-onyx-300 tabular-nums">{fmtShortTs(e.ts)}</span>
                  <Badge tone={e.severity as any}>{e.kind}</Badge>
                </div>
                <div className="text-onyx-100">{e.target}</div>
              </div>
            ))}
            {recentNetEvents.length === 0 && (
              <div className="px-3 py-4 text-[10px] uppercase tracking-[0.18em] text-onyx-300">no socket incidents in window</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
