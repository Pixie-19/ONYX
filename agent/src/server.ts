import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { config } from './config.js';
import { db } from './db/index.js';
import { bus, SESSION_ID } from './bus/eventBus.js';
import { closeJsonl } from './bus/jsonl.js';
import { startFilesystem } from './interceptors/filesystem.js';
import { startSystem } from './interceptors/system.js';
import { startNetwork } from './interceptors/network.js';
import { startTerminal } from './interceptors/terminal.js';
import { startAst } from './interceptors/ast.js';
import { startIntelligence, runQueryById, ALL_QUERIES } from './intelligence/engine.js';
import { startTopology, currentTopology } from './intelligence/topology.js';
import { startBlackoutMonitor, currentBlackout } from './blackout/monitor.js';
import { runAnalyst } from './intelligence/analyst.js';
import { runDemo, demoState, inject, type InjectType } from './demo/orchestrator.js';
import { replayWindow, buildStabilityIndex } from './chrono/replay.js';
import {
  connectWorkspace, detachWorkspace, rescanWorkspace,
  listWorkspaces, getWorkspace, restoreWorkspaces,
} from './connectors/workspace.js';
import { startRuntimeDiscovery, listRuntimeServices } from './connectors/runtime.js';
import { syncRepo } from './connectors/github.js';
import { spawnTerminal, stopTerminal, listTerminals } from './connectors/terminal.js';
import type { WSMessage } from './types.js';

// ---------- bootstrap ----------
db(); // open + run DDL

const app = Fastify({
  logger: { level: 'info', transport: undefined },
  disableRequestLogging: true,
});

await app.register(cors, { origin: true });
await app.register(websocket, {
  options: { perMessageDeflate: false, maxPayload: 1 << 20 },
});

// ---------- WebSocket fanout ----------
type Client = { send: (msg: string) => void };
const clients = new Set<Client>();

function broadcast(msg: WSMessage): void {
  const payload = JSON.stringify(msg);
  for (const c of clients) {
    try { c.send(payload); } catch { /* dead socket */ }
  }
}

bus.on('ws', (msg: WSMessage) => broadcast(msg));

app.get('/stream', { websocket: true }, (socket /* WebSocket — @fastify/websocket v10+ passes the raw ws */) => {
  const send = (s: string) => {
    if (socket.readyState === socket.OPEN) socket.send(s);
  };
  const client: Client = { send };
  clients.add(client);

  // hello + hydration
  send(JSON.stringify({
    type: 'hello',
    session_id: SESSION_ID,
    ts: Date.now(),
    build_stability: buildStabilityIndex(),
  } satisfies WSMessage));

  // hydrate recent events
  for (const ev of bus.recent(128)) {
    send(JSON.stringify({ type: 'event', payload: ev } satisfies WSMessage));
  }
  // hydrate current topology
  send(JSON.stringify({ type: 'topology', payload: currentTopology() } satisfies WSMessage));
  // hydrate current blackout state
  send(JSON.stringify({ type: 'blackout', payload: currentBlackout() } satisfies WSMessage));
  // hydrate workspace list
  send(JSON.stringify({ type: 'workspace_list', payload: listWorkspaces() } satisfies WSMessage));

  socket.on('close', () => clients.delete(client));
  socket.on('error', () => clients.delete(client));
});

// ---------- REST endpoints ----------
app.get('/health', async () => ({
  ok: true,
  session: SESSION_ID,
  uptime_s: Math.round(process.uptime()),
  ts: Date.now(),
}));

app.get('/events/recent', async (req) => {
  const limit = Math.min(Number((req.query as any)?.limit ?? 256), 4096);
  return { events: bus.recent(limit) };
});

app.get('/replay/window', async (req) => {
  const q = req.query as any;
  const from = Number(q?.from ?? Date.now() - 5 * 60_000);
  const to = Number(q?.to ?? Date.now());
  return { window: { from, to }, events: replayWindow(from, to) };
});

app.get('/intelligence/queries', async () => ({ queries: ALL_QUERIES.map(q => ({ id: q.id, title: q.title, severity: q.severity })) }));

app.get('/intelligence/run/:id', async (req, reply) => {
  const id = (req.params as any).id as string;
  const row = await runQueryById(id);
  if (!row) { reply.code(404); return { error: 'query not found' }; }
  return row;
});

app.get('/topology', async () => currentTopology());

app.post('/analyst', async (req) => {
  const body = (req.body as any) ?? {};
  const text = await runAnalyst(body.prompt ?? 'Summarise the last 60s of operational state', body.context);
  return text;
});

app.post('/demo/run', async (req) => {
  const body = (req.body as any) ?? {};
  runDemo(body.scenario ?? 'cascade');
  return { ok: true, ts: Date.now() };
});

app.post('/demo/inject', async (req, reply) => {
  const body = (req.body as any) ?? {};
  const type = body.type as InjectType | undefined;
  const allowed: InjectType[] = ['ast_spike','latency','api_failure','compiler_crash','memory_pressure','thermal_alert','blackout','cascade'];
  if (!type || !allowed.includes(type)) {
    reply.code(400);
    return { error: 'invalid inject type', allowed };
  }
  return inject(type);
});

app.get('/demo/state', async () => demoState());

app.get('/blackout', async () => currentBlackout());

app.post('/blackout/simulate', async (req) => {
  const body = (req.body as any) ?? {};
  const { simulateBlackout } = await import('./blackout/monitor.js');
  simulateBlackout(Boolean(body.enable));
  return currentBlackout();
});

// ──────────────── Workspace Connector ────────────────

app.get('/workspace/list', async () => ({ workspaces: listWorkspaces() }));

app.post('/workspace/connect', async (req, reply) => {
  const body = (req.body as any) ?? {};
  const result = await connectWorkspace({
    path: String(body.path ?? ''),
    name: body.name ? String(body.name) : undefined,
    mode: body.mode === 'demo' ? 'demo' : 'real',
  });
  if (!result.ok) { reply.code(400); return result; }
  return result;
});

app.delete('/workspace/:id', async (req, reply) => {
  const id = (req.params as any).id as string;
  const r = detachWorkspace(id);
  if (!r.ok) { reply.code(404); return r; }
  return r;
});

app.post('/workspace/:id/scan', async (req, reply) => {
  const id = (req.params as any).id as string;
  const r = await rescanWorkspace(id);
  if (!r.ok) { reply.code(400); return r; }
  return r;
});

app.post('/workspace/demo', async () => {
  const { ensureDemoWorkspace } = await import('./connectors/workspace.js');
  const ws = await ensureDemoWorkspace();
  return ws ? { ok: true, workspace: ws } : { ok: false, error: 'failed to attach demo workspace' };
});

app.get('/workspace/:id', async (req, reply) => {
  const id = (req.params as any).id as string;
  const ws = getWorkspace(id);
  if (!ws) { reply.code(404); return { error: 'not found' }; }
  return ws;
});

// ──────────────── Runtime Discovery ────────────────
app.get('/runtime/services', async () => ({ services: listRuntimeServices() }));

// ──────────────── GitHub ────────────────
app.post('/github/sync', async (req, reply) => {
  const body = (req.body as any) ?? {};
  const id = String(body.workspace_id ?? '');
  if (!id) { reply.code(400); return { ok: false, error: 'workspace_id required' }; }
  const r = await syncRepo(id);
  if (!r.ok) { reply.code(400); }
  return r;
});

// ──────────────── Terminal Attachment ────────────────
app.get('/terminal/list', async () => ({ terminals: listTerminals() }));

app.post('/terminal/spawn', async (req, reply) => {
  const body = (req.body as any) ?? {};
  const cwd = String(body.cwd ?? '').trim();
  const command = String(body.command ?? '').trim();
  if (!cwd || !command) { reply.code(400); return { ok: false, error: 'cwd and command required' }; }
  const session = spawnTerminal({
    workspace_id: body.workspace_id ?? null,
    cwd,
    command,
    args: Array.isArray(body.args) ? body.args.map((a: unknown) => String(a)) : [],
  });
  return { ok: true, session };
});

app.post('/terminal/:id/stop', async (req, reply) => {
  const id = (req.params as any).id as string;
  const r = stopTerminal(id);
  if (!r.ok) { reply.code(404); return r; }
  return r;
});

// ---------- start interceptors + engines ----------
startFilesystem();
startAst();
startSystem();
startNetwork();
startTerminal();
startIntelligence();
startTopology();
startBlackoutMonitor();
startRuntimeDiscovery();

// Restore previously-attached workspaces from disk.
await restoreWorkspaces();

bus.emitReplayEvent({
  kind: 'DEMO_PHASE',
  source: 'agent.boot',
  payload: { phase: 0, label: 'AGENT_ONLINE' },
});

// ---------- listen ----------
try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`ONYX agent online · ws://${config.host}:${config.port}/stream · session=${SESSION_ID}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// ---------- graceful shutdown ----------
function shutdown(signal: string) {
  app.log.info(`shutdown signal: ${signal}`);
  closeJsonl();
  app.close().finally(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
