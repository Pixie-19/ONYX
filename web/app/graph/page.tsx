'use client';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { Layers, Filter, Circle } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/format';

const NODE_COLOR: Record<string, string> = {
  file:      '#4F46E5',
  service:   '#7C3AED',
  endpoint:  '#10B981',
  process:   '#F59E0B',
  inference: '#EC4899',
};

const TopologyGraphView = dynamic(
  () =>
    import('@/components/topology/TopologyGraph').then((m) => m.TopologyGraphView),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center text-secondary text-[12.5px]">
        Initialising operational topology…
      </div>
    ),
  },
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

  const degraded = graph.edges.filter(
    (e) => e.status === 'degraded' || e.status === 'offline' || e.status === 'retry',
  ).length;

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Layers size={16} />}
        title="Operational graph"
        subtitle="Live causal topology · onyx_cognition"
        meta={
          <>
            <KindBadge color={NODE_COLOR.file} label="Files" count={counts.file} />
            <KindBadge color={NODE_COLOR.service} label="Services" count={counts.service} />
            <KindBadge color={NODE_COLOR.endpoint} label="Endpoints" count={counts.endpoint} />
            <KindBadge color={NODE_COLOR.inference} label="Inference" count={counts.inference} />
            <Badge tone={degraded ? 'warn' : 'ok'}>
              {degraded ? `${degraded} degraded` : 'All links healthy'}
            </Badge>
          </>
        }
      />

      <div className="relative flex-1 min-h-0 surface-base">
        <TopologyGraphView />

        {/* Group filter card */}
        <div className="absolute top-4 left-4 panel py-3 px-4 z-10 max-w-[300px]">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Filter size={12} className="text-secondary" />
            <span className="text-[11.5px] font-semibold text-secondary">Group</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={groupFilter === null}
              onClick={() => setGroupFilter(null)}
              label="All"
            />
            {groups.map((g) => (
              <FilterChip
                key={g}
                active={groupFilter === g}
                onClick={() => setGroupFilter(g === groupFilter ? null : g)}
                label={g}
              />
            ))}
          </div>
        </div>

        <NodeInspector groupFilter={groupFilter} />
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[11.5px] font-medium px-2.5 h-[24px] rounded-full border transition',
        active
          ? 'border-[#4F46E5] text-white bg-[#4F46E5]'
          : 'border-line text-secondary hover:border-strong hover:text-primary surface-raised',
      )}
    >
      {label}
    </button>
  );
}

function KindBadge({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-line surface-raised text-[12px]">
      <Circle size={8} fill={color} stroke="none" />
      <span className="text-secondary">{label}</span>
      <span className="font-semibold text-primary tabular-nums">{count}</span>
    </span>
  );
}

function NodeInspector({ groupFilter }: { groupFilter: string | null }) {
  const graph = useOnyx((s) => s.topology);
  const visible = groupFilter
    ? graph.nodes.filter((n) => n.group === groupFilter)
    : graph.nodes;
  const top = useMemo(() => {
    return [...visible]
      .sort((a, b) => (b.pulse ?? 0) - (a.pulse ?? 0))
      .slice(0, 12);
  }, [visible]);

  return (
    <div className="absolute top-4 right-4 panel z-10 w-[320px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <span className="text-[12.5px] font-semibold text-primary">Hottest nodes</span>
        <span className="text-[11px] text-tertiary">{visible.length} visible</span>
      </div>
      <div className="p-2 space-y-0.5 max-h-[400px] overflow-auto">
        {top.map((n) => (
          <div
            key={n.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-sunken"
          >
            <span
              className="w-[7px] h-[7px] rounded-full shrink-0"
              style={{ background: NODE_COLOR[n.kind] ?? '#4F46E5' }}
            />
            <span className="text-[12px] text-primary truncate flex-1">{n.label}</span>
            <span
              className={cn(
                'text-[11px] font-medium tabular-nums px-1.5 rounded',
                n.health === 'critical'
                  ? 'text-[#B91C1C] bg-[#FEF2F2]'
                  : n.health === 'warn'
                    ? 'text-[#B45309] bg-[#FFFBEB]'
                    : 'text-secondary',
              )}
            >
              {Math.round((n.pulse ?? 0) * 100)}
            </span>
          </div>
        ))}
        {top.length === 0 && (
          <div className="px-2 py-3 text-[12px] text-secondary text-center">
            No nodes in selection
          </div>
        )}
      </div>
    </div>
  );
}
