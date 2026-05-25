'use client';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { Layers, Filter } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/format';
import { NODE_COLOR } from '@/lib/colors';

const TopologyGraphView = dynamic(
  () => import('@/components/topology/TopologyGraph').then((m) => m.TopologyGraphView),
  { ssr: false, loading: () => <div className="absolute inset-0 grid place-items-center text-onyx-300 text-[10px] tracking-[0.2em] uppercase">initialising operational topology…</div> },
);

export default function GraphPage() {
  const graph = useOnyx((s) => s.topology);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { file: 0, service: 0, endpoint: 0, inference: 0, process: 0 } as Record<string, number>;
    for (const n of graph.nodes) c[n.kind] = (c[n.kind] ?? 0) + 1;
    return c;
  }, [graph.nodes]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const n of graph.nodes) set.add(n.group);
    return [...set];
  }, [graph.nodes]);

  const degraded = graph.edges.filter((e) => e.status === 'degraded' || e.status === 'offline' || e.status === 'retry').length;

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Layers size={14} />}
        title="OPERATIONAL GRAPH"
        subtitle="Live causal topology · ONYX_COGNITION"
        meta={
          <>
            <Tooltip label="File / module nodes"><Badge tone="info" style={{ color: NODE_COLOR.file, borderColor: NODE_COLOR.file + '88' }}>FILES {counts.file}</Badge></Tooltip>
            <Tooltip label="Service nodes"><Badge tone="info" style={{ color: NODE_COLOR.service, borderColor: NODE_COLOR.service + '88' }}>SERVICES {counts.service}</Badge></Tooltip>
            <Tooltip label="Network endpoints"><Badge tone="info" style={{ color: NODE_COLOR.endpoint, borderColor: NODE_COLOR.endpoint + '88' }}>ENDPOINTS {counts.endpoint}</Badge></Tooltip>
            <Tooltip label="Inference targets"><Badge tone="info" style={{ color: NODE_COLOR.inference, borderColor: NODE_COLOR.inference + '88' }}>INFERENCE {counts.inference}</Badge></Tooltip>
            <Badge tone={degraded ? 'warn' : 'ok'}>{degraded ? `${degraded} DEGRADED` : 'ALL LINKS OK'}</Badge>
          </>
        }
      />

      <div className="relative flex-1 min-h-0">
        <TopologyGraphView />

        {/* Group filter chips */}
        <div className="absolute top-3 left-3 panel py-2 px-3 z-10 backdrop-blur-sm">
          <span className="bracket-top-l" />
          <span className="bracket-top-r" />
          <span className="bracket-bot-l" />
          <span className="bracket-bot-r" />
          <div className="flex items-center gap-2 mb-2">
            <Filter size={11} className="text-cyan-glow" />
            <span className="panel-label">GROUP FILTER</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
            <button
              onClick={() => setGroupFilter(null)}
              className={cn(
                'text-[9.5px] tracking-[0.18em] uppercase px-2 py-1 border rounded-[2px]',
                groupFilter === null ? 'text-cyan-glow border-cyan-glow/70 bg-cyan-glow/10' : 'text-onyx-300 border-onyx-600/40 hover:border-onyx-300',
              )}
            >ALL</button>
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setGroupFilter(g === groupFilter ? null : g)}
                className={cn(
                  'text-[9.5px] tracking-[0.18em] uppercase px-2 py-1 border rounded-[2px]',
                  groupFilter === g ? 'text-cyan-glow border-cyan-glow/70 bg-cyan-glow/10' : 'text-onyx-300 border-onyx-600/40 hover:border-onyx-300',
                )}
              >{g}</button>
            ))}
          </div>
        </div>

        {/* Inspector */}
        <NodeInspector groupFilter={groupFilter} />
      </div>
    </div>
  );
}

function NodeInspector({ groupFilter }: { groupFilter: string | null }) {
  const graph = useOnyx((s) => s.topology);
  const visible = groupFilter ? graph.nodes.filter((n) => n.group === groupFilter) : graph.nodes;
  const top = useMemo(() => {
    return [...visible]
      .sort((a, b) => (b.pulse ?? 0) - (a.pulse ?? 0))
      .slice(0, 12);
  }, [visible]);

  return (
    <div className="absolute top-3 right-3 panel py-2 px-3 z-10 backdrop-blur-sm w-[300px]">
      <span className="bracket-top-l" />
      <span className="bracket-top-r" />
      <span className="bracket-bot-l" />
      <span className="bracket-bot-r" />
      <div className="flex items-center justify-between mb-2">
        <span className="panel-label">HOTTEST NODES</span>
        <span className="text-[9.5px] tracking-[0.18em] uppercase text-onyx-300">{visible.length} VISIBLE</span>
      </div>
      <div className="space-y-1 max-h-[360px] overflow-auto">
        {top.map((n) => (
          <div key={n.id} className="flex items-center gap-2 text-[10.5px] font-mono">
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{ background: NODE_COLOR[n.kind] ?? '#22e8ff', boxShadow: `0 0 6px ${NODE_COLOR[n.kind] ?? '#22e8ff'}` }}
            />
            <span className="text-onyx-100 truncate flex-1">{n.label}</span>
            <Badge tone={n.health === 'critical' ? 'critical' : n.health === 'warn' ? 'warn' : 'info'} className="!py-0">{Math.round((n.pulse ?? 0) * 100)}</Badge>
          </div>
        ))}
        {top.length === 0 && (
          <div className="text-[10px] tracking-[0.18em] uppercase text-onyx-300">no nodes in selection</div>
        )}
      </div>
    </div>
  );
}
