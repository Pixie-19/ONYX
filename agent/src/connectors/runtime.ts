import net from 'node:net';
import si from 'systeminformation';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { bus } from '../bus/eventBus.js';
import { writeJsonl } from '../bus/jsonl.js';
import { listWorkspaces } from './workspace.js';
import type { WorkspaceProcessRow, WSMessage } from '../types.js';

/**
 * Runtime Discovery Engine.
 *
 * Periodically scans:
 *   1. Common dev-server ports for listeners (TCP connect probe).
 *   2. Top processes via systeminformation.
 *
 * Persists observations in `workspace_processes` and emits PORT_DISCOVERED
 * and DEV_SERVER_STARTED events when a new port goes live.
 */

const COMMON_DEV_PORTS = [
  { port: 3000, kind: 'dev_server' as const, hint: 'next / vite' },
  { port: 3001, kind: 'dev_server' as const, hint: 'next / vite' },
  { port: 4173, kind: 'dev_server' as const, hint: 'vite preview' },
  { port: 5173, kind: 'dev_server' as const, hint: 'vite' },
  { port: 5174, kind: 'dev_server' as const, hint: 'vite' },
  { port: 8000, kind: 'dev_server' as const, hint: 'django / fastapi' },
  { port: 8080, kind: 'dev_server' as const, hint: 'http server' },
  { port: 8888, kind: 'dev_server' as const, hint: 'jupyter' },
  { port: 4311, kind: 'node'       as const, hint: 'onyx-agent' },
  { port: 11434, kind: 'node'      as const, hint: 'ollama' },
  { port: 5432, kind: 'database'   as const, hint: 'postgres' },
  { port: 3306, kind: 'database'   as const, hint: 'mysql' },
  { port: 6379, kind: 'database'   as const, hint: 'redis' },
  { port: 27017, kind: 'database'  as const, hint: 'mongo' },
];

const DEV_COMMAND_PATTERNS: Array<{ re: RegExp; kind: WorkspaceProcessRow['kind'] }> = [
  { re: /(next|vite|webpack|nodemon|tsc.*--watch|bun.*dev|pnpm.*dev|npm.*dev|yarn.*dev)/i, kind: 'dev_server' },
  { re: /(uvicorn|gunicorn|django|flask|fastapi)/i, kind: 'dev_server' },
  { re: /\bnode\b/i, kind: 'node' },
  { re: /(python|python3)/i, kind: 'python' },
  { re: /docker/i, kind: 'docker' },
];

function classifyCommand(cmd: string): WorkspaceProcessRow['kind'] {
  for (const p of DEV_COMMAND_PATTERNS) {
    if (p.re.test(cmd)) return p.kind;
  }
  return 'unknown';
}

function probeTcp(port: number, timeoutMs = 350): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    const finish = (ok: boolean) => { if (done) return; done = true; s.destroy(); resolve(ok); };
    s.setTimeout(timeoutMs);
    s.once('connect', () => finish(true));
    s.once('timeout', () => finish(false));
    s.once('error', () => finish(false));
    s.connect(port, '127.0.0.1');
  });
}

function persist(row: WorkspaceProcessRow): void {
  db().prepare(`
    INSERT INTO workspace_processes
      (id, ts, workspace_id, pid, command, port, kind, status, retry_count, cpu_pct, mem_mb, meta_json)
    VALUES (@id,@ts,@workspace_id,@pid,@command,@port,@kind,@status,@retry_count,@cpu_pct,@mem_mb,@meta_json)
  `).run(row);
  writeJsonl('workspace_processes', row);
}

interface PortState { firstSeen: number; lastSeen: number; firedDev: boolean; }
const portState = new Map<number, PortState>();

export async function discoverOnce(): Promise<void> {
  const workspaces = listWorkspaces().filter((w) => w.status === 'attached' || w.status === 'demo');
  // Prefer a local workspace as the discovery anchor — remote-only rows
  // (github://owner/repo) have no on-disk processes to attribute to.
  const localWorkspaces = workspaces.filter((w) => !w.path.startsWith('github://'));
  const wsForCwd = localWorkspaces[0]?.id ?? null;

  // ── port probes ──
  await Promise.all(COMMON_DEV_PORTS.map(async (p) => {
    const open = await probeTcp(p.port);
    if (!open) {
      // mark previously-running ports as exited on first miss
      if (portState.has(p.port)) {
        const st = portState.get(p.port)!;
        if (Date.now() - st.lastSeen > 6000) {
          portState.delete(p.port);
        }
      }
      return;
    }
    const now = Date.now();
    const prev = portState.get(p.port);
    const state: PortState = prev
      ? { ...prev, lastSeen: now }
      : { firstSeen: now, lastSeen: now, firedDev: false };
    portState.set(p.port, state);

    const row: WorkspaceProcessRow = {
      id: `wp_${nanoid(10)}`,
      ts: now,
      workspace_id: wsForCwd,
      pid: null,
      command: `localhost:${p.port}`,
      port: p.port,
      kind: p.kind,
      status: 'running',
      retry_count: 0,
      cpu_pct: 0,
      mem_mb: 0,
      meta_json: JSON.stringify({ hint: p.hint }),
    };
    persist(row);
    bus.emit('ws', { type: 'workspace_process', payload: row } satisfies WSMessage);

    if (!prev) {
      bus.emitReplayEvent({
        kind: 'PORT_DISCOVERED',
        severity: 'info',
        source: 'connector.runtime',
        target: `localhost:${p.port}`,
        payload: { kind: p.kind, hint: p.hint },
      });
    }
    if (!state.firedDev && p.kind === 'dev_server') {
      state.firedDev = true;
      bus.emitReplayEvent({
        kind: 'DEV_SERVER_STARTED',
        severity: 'info',
        source: 'connector.runtime',
        target: `localhost:${p.port}`,
        payload: { hint: p.hint },
      });
    }
  }));

  // ── process inventory (top by cpu+mem) ──
  try {
    const procs = await si.processes();
    const top = (procs.list ?? [])
      .filter((p: any) => p.pid && p.command)
      .sort((a: any, b: any) => (b.cpu + b.mem) - (a.cpu + a.mem))
      .slice(0, 10);

    for (const p of top) {
      const command = String(p.command || p.name || '').slice(0, 240);
      const kind = classifyCommand(command);
      if (kind === 'unknown') continue;
      const row: WorkspaceProcessRow = {
        id: `wp_${nanoid(10)}`,
        ts: Date.now(),
        workspace_id: wsForCwd,
        pid: p.pid,
        command,
        port: null,
        kind,
        status: 'running',
        retry_count: 0,
        cpu_pct: Number((p.cpu ?? 0).toFixed(2)),
        mem_mb: Number(((p.memRss ?? p.mem ?? 0) as number).toFixed(1)),
        meta_json: JSON.stringify({ name: p.name ?? null }),
      };
      persist(row);
      bus.emit('ws', { type: 'workspace_process', payload: row } satisfies WSMessage);
    }
  } catch {
    // systeminformation may be partially unavailable on some platforms — soft-fail
  }
}

export function listRuntimeServices(limit = 80): WorkspaceProcessRow[] {
  return db().prepare(`
    SELECT * FROM workspace_processes
    WHERE ts >= (strftime('%s','now') - 30) * 1000
    ORDER BY ts DESC
    LIMIT ?
  `).all(limit) as WorkspaceProcessRow[];
}

export function startRuntimeDiscovery(): void {
  void discoverOnce();
  setInterval(discoverOnce, 4000).unref();
}
