import { db } from '../db/index.js';
import { bus } from '../bus/eventBus.js';
import type { TopologyGraph, TopologyNode, TopologyEdge, WSMessage } from '../types.js';

// The cockpit's 3D graph is derived from the latest execution_snapshots
// (one node per file, edges from imports) plus the active network probes
// (one node per outbound endpoint) plus a synthetic inference node that
// shows whether routing is on Mistral or Ollama.
//
// We recompute on a 1.5s cadence and after every snapshot — that's enough
// to feel alive without churning the GPU side.

interface State {
  graph: TopologyGraph;
}

const state: State = {
  graph: { ts: Date.now(), nodes: [], edges: [] },
};

const pulseDecay = new Map<string, { intensity: number; ts: number }>();

function bumpPulse(id: string, intensity = 1) {
  pulseDecay.set(id, { intensity: Math.min(1, intensity), ts: Date.now() });
}

function pulseFor(id: string): number {
  const e = pulseDecay.get(id);
  if (!e) return 0.05 + Math.random() * 0.05;
  const age = Date.now() - e.ts;
  return Math.max(0.05, e.intensity * Math.exp(-age / 2200));
}

function shortLabel(file: string): string {
  const parts = file.split('/');
  if (parts.length <= 2) return file;
  return `${parts[0]}/…/${parts[parts.length - 1]}`;
}

function groupFor(file: string): string {
  if (file.startsWith('agent/')) return 'agent';
  if (file.startsWith('web/')) return 'cockpit';
  if (file.startsWith('coral/')) return 'coral';
  return 'workspace';
}

function recompute(): TopologyGraph {
  // ---- file nodes from latest snapshots ----
  const snaps = db().prepare(`
    SELECT file, lang, complexity, imports_json, MAX(ts) AS ts
    FROM execution_snapshots
    GROUP BY file
    ORDER BY ts DESC
    LIMIT 80
  `).all() as any[];

  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const fileSet = new Set<string>();

  for (const s of snaps) {
    fileSet.add(s.file);
    nodes.push({
      id: `file:${s.file}`,
      label: shortLabel(s.file),
      kind: 'file',
      group: groupFor(s.file),
      complexity: Number(s.complexity ?? 0),
      health: s.complexity > 18 ? 'warn' : 'healthy',
      pulse: pulseFor(`file:${s.file}`),
      meta: { lang: s.lang, file: s.file },
    });
  }

  for (const s of snaps) {
    let imports: string[] = [];
    try { imports = JSON.parse(s.imports_json) as string[]; } catch { /* ignore */ }
    for (const imp of imports.slice(0, 8)) {
      // try resolve to a known file in the workspace
      const candidate = [...fileSet].find(f => f.includes(imp.replace(/^[./]+/, '')));
      const targetId = candidate ? `file:${candidate}` : `module:${imp}`;
      if (!candidate) {
        nodes.push({
          id: targetId,
          label: imp,
          kind: 'service',
          group: 'external',
          health: 'healthy',
          pulse: pulseFor(targetId),
        });
      }
      edges.push({
        id: `e:${s.file}->${imp}`,
        source: `file:${s.file}`,
        target: targetId,
        kind: 'import',
        weight: 0.4,
      });
    }
  }

  // ---- network endpoint nodes ----
  const eps = db().prepare(`
    SELECT endpoint, kind, MAX(ts) AS ts, AVG(rtt_ms) AS rtt,
           MAX(CASE WHEN status != 'healthy' THEN 1 ELSE 0 END) AS deg
    FROM network_trajectories
    WHERE ts >= (strftime('%s','now') - 60) * 1000
    GROUP BY endpoint
  `).all() as any[];

  for (const e of eps) {
    const id = `ep:${e.endpoint}`;
    nodes.push({
      id,
      label: e.endpoint,
      kind: 'endpoint',
      group: e.kind,
      health: e.deg ? 'warn' : 'healthy',
      pulse: pulseFor(id),
      meta: { rtt: Math.round(e.rtt ?? 0), kind: e.kind },
    });
    edges.push({
      id: `e:agent->${e.endpoint}`,
      source: 'svc:agent',
      target: id,
      kind: 'socket',
      weight: 0.6,
      latency_ms: Number((e.rtt ?? 0).toFixed(1)),
      status: e.deg ? 'degraded' : 'healthy',
    });
  }

  // ---- core service nodes ----
  nodes.push(
    { id: 'svc:agent',    label: 'onyx-agent',    kind: 'service', group: 'core', health: 'healthy', pulse: pulseFor('svc:agent') },
    { id: 'svc:cockpit',  label: 'onyx-cockpit',  kind: 'service', group: 'core', health: 'healthy', pulse: pulseFor('svc:cockpit') },
    { id: 'svc:bus',      label: 'event-bus',     kind: 'service', group: 'core', health: 'healthy', pulse: pulseFor('svc:bus') },
    { id: 'svc:coral',    label: 'coral.source',  kind: 'service', group: 'core', health: 'healthy', pulse: pulseFor('svc:coral') },
    { id: 'inf:mistral',  label: 'mistral.codestral', kind: 'inference', group: 'inference', health: 'healthy', pulse: pulseFor('inf:mistral') },
    { id: 'inf:ollama',   label: 'ollama.codestral-7b', kind: 'inference', group: 'inference', health: 'healthy', pulse: pulseFor('inf:ollama') },
  );
  edges.push(
    { id: 'e:cockpit-agent',     source: 'svc:cockpit',  target: 'svc:agent',    kind: 'socket',    weight: 1.0 },
    { id: 'e:agent-bus',         source: 'svc:agent',    target: 'svc:bus',      kind: 'call',      weight: 0.9 },
    { id: 'e:bus-coral',         source: 'svc:bus',      target: 'svc:coral',    kind: 'replay',    weight: 0.7 },
    { id: 'e:agent-mistral',     source: 'svc:agent',    target: 'inf:mistral',  kind: 'inference', weight: 0.5 },
    { id: 'e:agent-ollama',      source: 'svc:agent',    target: 'inf:ollama',   kind: 'inference', weight: 0.5 },
  );

  return { ts: Date.now(), nodes, edges };
}

export function currentTopology(): TopologyGraph {
  return state.graph;
}

export function startTopology(): void {
  // listen on hot signals to drive pulse intensity
  bus.on('event', (ev) => {
    if (ev.target) {
      if (ev.target.startsWith('host.')) {
        bumpPulse('svc:agent', 0.9);
      } else if (ev.target.includes(':')) {
        bumpPulse(`ep:${ev.target}`, 1);
      } else if (ev.target.includes('/')) {
        bumpPulse(`file:${ev.target}`, 1);
      }
    }
    bumpPulse('svc:bus', 0.5);
  });
  bus.on('workspace', (row) => bumpPulse(`file:${row.file}`, Math.min(1, 0.4 + row.burst_rate * 0.1)));
  bus.on('network', (row) => bumpPulse(`ep:${row.endpoint}`, row.status === 'healthy' ? 0.4 : 1));

  const tick = () => {
    state.graph = recompute();
    bus.emit('ws', { type: 'topology', payload: state.graph } satisfies WSMessage);
  };
  setTimeout(tick, 1200);
  setInterval(tick, 1500).unref();
}
