import type { TopologyEdge, TopologyGraph, TopologyNode } from './types';

const HEALTH_RANK: Record<TopologyNode['health'], number> = {
  healthy: 0,
  warn: 1,
  critical: 2,
};

const STATUS_RANK: Record<NonNullable<TopologyEdge['status']>, number> = {
  healthy: 0,
  degraded: 1,
  retry: 2,
  offline: 3,
};

const safe = (v: unknown): string => (v ?? '').toString().trim();

const hashString = (input: string): string => {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
};

const fallbackNodeId = (node: TopologyNode): string =>
  `node:${safe(node.kind)}:${safe(node.group)}:${safe(node.label)}`;

const fallbackEdgeId = (edge: TopologyEdge): string =>
  `edge:${safe(edge.kind)}:${safe(edge.source)}:${safe(edge.target)}`;

const mergeNode = (a: TopologyNode, b: TopologyNode): TopologyNode => ({
  ...a,
  ...b,
  label: safe(b.label) ? b.label : a.label,
  kind: b.kind ?? a.kind,
  group: safe(b.group) ? b.group : a.group,
  complexity: b.complexity ?? a.complexity,
  health: HEALTH_RANK[b.health] > HEALTH_RANK[a.health] ? b.health : a.health,
  pulse: Math.max(a.pulse ?? 0, b.pulse ?? 0),
  meta: { ...(a.meta ?? {}), ...(b.meta ?? {}) },
});

const mergeEdge = (a: TopologyEdge, b: TopologyEdge): TopologyEdge => {
  const aStatus = a.status ?? 'healthy';
  const bStatus = b.status ?? 'healthy';
  return {
    ...a,
    ...b,
    weight: Math.max(a.weight ?? 0, b.weight ?? 0),
    status: STATUS_RANK[bStatus] > STATUS_RANK[aStatus] ? bStatus : aStatus,
    latency_ms: b.latency_ms ?? a.latency_ms,
  };
};

export interface NormalizedTopology {
  graph: TopologyGraph;
  hash: string;
  stats: {
    inputNodes: number;
    inputEdges: number;
    mergedNodes: number;
    mergedEdges: number;
    droppedEdges: number;
    droppedNodes: number;
  };
}

export const normalizeTopologyGraph = (graph: TopologyGraph): NormalizedTopology => {
  const nodeMap = new Map<string, TopologyNode>();
  let mergedNodes = 0;
  let droppedNodes = 0;

  for (const raw of graph.nodes ?? []) {
    const id = safe(raw.id) || fallbackNodeId(raw);
    if (!id) {
      droppedNodes += 1;
      continue;
    }
    const next: TopologyNode = { ...raw, id };
    const existing = nodeMap.get(id);
    if (existing) {
      nodeMap.set(id, mergeNode(existing, next));
      mergedNodes += 1;
    } else {
      nodeMap.set(id, next);
    }
  }

  const nodes = Array.from(nodeMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  const nodeIds = new Set(nodes.map((n) => n.id));

  const edgeMap = new Map<string, TopologyEdge>();
  let mergedEdges = 0;
  let droppedEdges = 0;

  for (const raw of graph.edges ?? []) {
    const id = safe(raw.id) || fallbackEdgeId(raw);
    if (!id) {
      droppedEdges += 1;
      continue;
    }
    if (!nodeIds.has(raw.source) || !nodeIds.has(raw.target)) {
      droppedEdges += 1;
      continue;
    }
    const next: TopologyEdge = { ...raw, id };
    const existing = edgeMap.get(id);
    if (existing) {
      edgeMap.set(id, mergeEdge(existing, next));
      mergedEdges += 1;
    } else {
      edgeMap.set(id, next);
    }
  }

  const edges = Array.from(edgeMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  const hashPayload = [
    nodes.map((n) => `${n.id}|${n.kind}|${n.group}|${n.label}|${n.health}|${n.pulse}|${n.complexity ?? ''}`).join('||'),
    edges.map((e) => `${e.id}|${e.kind}|${e.source}|${e.target}|${e.status ?? 'healthy'}|${e.weight}`).join('||'),
  ].join('::');
  const hash = hashString(hashPayload);

  const stats = {
    inputNodes: graph.nodes?.length ?? 0,
    inputEdges: graph.edges?.length ?? 0,
    mergedNodes,
    mergedEdges,
    droppedEdges,
    droppedNodes,
  };

  if (process.env.NODE_ENV !== 'production') {
    if (mergedNodes || mergedEdges || droppedEdges || droppedNodes) {
      // eslint-disable-next-line no-console
      console.warn('[ONYX] topology normalization', stats);
    }
  }

  return {
    graph: {
      ts: graph.ts,
      nodes,
      edges,
    },
    hash,
    stats,
  };
};
