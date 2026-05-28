import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import { bus } from '../bus/eventBus.js';
import { db } from '../db/index.js';
import { writeJsonl } from '../bus/jsonl.js';
import type { TerminalSession, WSMessage, Framework, WorkspaceProcessRow } from '../types.js';

/**
 * Terminal Attachment Subsystem.
 *
 * Spawns and supervises real dev processes (next dev, vite, npm run dev,
 * uvicorn, node servers …) on behalf of an attached ONYX workspace. The
 * primary surface is:
 *
 *   - `spawnTerminal({ cwd, command, args, workspace_id })`
 *   - `stopTerminal(id)` / `restartTerminal(id)`
 *   - `listTerminals()` / `getTerminal(id)` / `getTerminalBuffer(id)`
 *
 * Streams stdout/stderr through the websocket as throttled batches (~80ms
 * windows) so the cockpit never re-renders per byte. Parses the output for
 * port bindings, HMR success, compile failures, runtime crashes and routes
 * those signals into the replay engine and topology graph.
 *
 * Inputs are sanitised against a dev-command allowlist to prevent shell
 * injection — only known package managers and runtime binaries may be
 * spawned, and shell metacharacters are rejected outright.
 */

// ──────────── Tunables ────────────
const RING_LIMIT = 1200;           // recent lines retained per session for replay
const FLUSH_INTERVAL_MS = 80;      // chunk batch window
const MAX_RESTARTS = 8;
const MAX_CONCURRENT = 16;
const KILL_GRACE_MS = 800;

// ──────────── Allowlist ────────────
const ALLOWED_BIN = new Set([
  'npm', 'pnpm', 'yarn', 'bun', 'npx',
  'node', 'tsx', 'ts-node', 'deno',
  'python', 'python3', 'py',
  'next', 'vite', 'webpack', 'turbo', 'rollup', 'esbuild',
  'uvicorn', 'gunicorn', 'flask', 'django', 'fastapi',
  'manage.py',
  'go', 'cargo', 'rustc',
  'docker', 'docker-compose',
]);

const SHELL_INJECTION_RE = /[;&|`$<>\\'"]|\$\(|&&|\|\|/;
const ABSOLUTE_PATH_TRAVERSAL_RE = /\.\.[\\\/]/;

interface SpawnInput {
  workspace_id?: string | null;
  cwd: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface BufferedLine {
  stream: 'stdout' | 'stderr';
  data: string;
  ts: number;
}

interface SessionEntry {
  proc: ChildProcess | null;
  session: TerminalSession;
  buffer: BufferedLine[];
  pending: { stdout: string; stderr: string };
  flushTimer: NodeJS.Timeout | null;
  detectedPorts: Set<number>;
  spawnInput: SpawnInput;
}

const sessions = new Map<string, SessionEntry>();

// ──────────── Public sanitiser (also reusable in tests) ────────────
export function sanitizeCommand(
  command: string,
  args: string[] = [],
): { ok: true; bin: string; args: string[] } | { ok: false; error: string } {
  const c = (command ?? '').trim();
  if (!c) return { ok: false, error: 'empty command' };
  if (SHELL_INJECTION_RE.test(c)) return { ok: false, error: 'forbidden characters in command' };
  if (ABSOLUTE_PATH_TRAVERSAL_RE.test(c)) return { ok: false, error: 'path traversal in command' };

  // command may be a single token ("vite") or a phrase ("npm run dev")
  const parts = c.split(/\s+/);
  const head = path.basename(parts[0]).toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, '');
  const inlineArgs = parts.slice(1);
  const allArgs = [...inlineArgs, ...args].map((a) => String(a));

  if (!ALLOWED_BIN.has(head)) {
    return { ok: false, error: `binary '${head}' is not in the dev-command allowlist` };
  }
  for (const a of allArgs) {
    if (SHELL_INJECTION_RE.test(a)) return { ok: false, error: `forbidden characters in arg '${a}'` };
    if (ABSOLUTE_PATH_TRAVERSAL_RE.test(a)) return { ok: false, error: `path traversal in arg '${a}'` };
  }
  return { ok: true, bin: parts[0], args: allArgs };
}

// ──────────── Framework inference from invocation ────────────
function inferFramework(command: string, args: string[]): Framework | null {
  const blob = [command, ...args].join(' ').toLowerCase();
  if (/\bnext\b/.test(blob)) return 'next';
  if (/\bvite\b/.test(blob)) return 'vite';
  if (/\bturbo\b/.test(blob)) return 'turborepo';
  if (/\bbun\b/.test(blob) && /dev|start|serve/.test(blob)) return 'bun';
  if (/(uvicorn|fastapi)/.test(blob)) return 'fastapi';
  if (/(django|manage\.py)/.test(blob)) return 'django';
  if (/\bflask\b/.test(blob)) return 'flask';
  if (/^python|^py\b/.test(blob)) return 'python';
  if (/(^node\b|tsx|ts-node)/.test(blob)) return 'node';
  if (/docker/.test(blob)) return 'docker';
  return null;
}

// ──────────── Output pattern matchers ────────────
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

const PORT_REGEXES: RegExp[] = [
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\]):(\d{2,5})/gi,
  /listening on\s+(?:port\s+)?:?(\d{2,5})/gi,
  /local:\s*https?:\/\/[^\s:]+:(\d{2,5})/gi,
  /^\s*port\s*[:=]\s*(\d{2,5})/gim,
  /(?:server|app)\s+(?:started|running).*?:(\d{2,5})/gi,
  /:- Local:.*?:(\d{2,5})/gi,
];

const HMR_RE = /(compiled successfully|✓ ready|✓ compiled|hmr update|hot.?(?:re)?load|fast refresh|page reload)/i;
const BOOT_RE = /(ready in|server.*?started|listening on|started server|app running on|server running|local:\s+https?:\/\/)/i;
const ERROR_RE = /(error[:\s]|failed[:\s]|cannot find module|module not found|syntaxerror|typeerror|referenceerror|enoent|eaddrinuse|address already in use)/i;
const CRASH_RE = /(uncaughtexception|unhandledrejection|fatal:|segmentation fault|process exited|core dumped|panic:)/i;
const TS_ERROR_RE = /\bTS\d{4,5}:/;

// ──────────── Helpers ────────────
function publishSession(entry: SessionEntry): void {
  bus.emit('ws', { type: 'terminal', payload: entry.session } satisfies WSMessage);
}

function persistPortDiscovery(entry: SessionEntry, port: number): void {
  const row: WorkspaceProcessRow = {
    id: `wp_${nanoid(10)}`,
    ts: Date.now(),
    workspace_id: entry.session.workspace_id ?? null,
    pid: entry.session.pid,
    command: entry.session.command,
    port,
    kind: 'dev_server',
    status: 'running',
    retry_count: entry.session.restart_count ?? 0,
    cpu_pct: 0,
    mem_mb: 0,
    meta_json: JSON.stringify({
      via: 'terminal',
      session_id: entry.session.id,
      framework: entry.session.detected_framework ?? null,
    }),
  };
  try {
    db()
      .prepare(
        `INSERT INTO workspace_processes
          (id, ts, workspace_id, pid, command, port, kind, status, retry_count, cpu_pct, mem_mb, meta_json)
         VALUES (@id,@ts,@workspace_id,@pid,@command,@port,@kind,@status,@retry_count,@cpu_pct,@mem_mb,@meta_json)`,
      )
      .run(row);
    writeJsonl('workspace_processes', row);
    bus.emit('ws', { type: 'workspace_process', payload: row } satisfies WSMessage);
  } catch {
    /* silent — duplicate-ish writes are fine */
  }
}

function scanForSignals(entry: SessionEntry, text: string, stream: 'stdout' | 'stderr'): void {
  const clean = text.replace(ANSI_RE, '');

  // ── port discovery ──
  for (const re of PORT_REGEXES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(clean)) !== null) {
      const p = Number(m[1]);
      if (!Number.isFinite(p) || p < 100 || p > 65535) continue;
      if (entry.detectedPorts.has(p)) continue;
      entry.detectedPorts.add(p);
      entry.session.ports = [...entry.detectedPorts].sort((a, b) => a - b);

      persistPortDiscovery(entry, p);

      bus.emitReplayEvent({
        kind: 'PORT_DISCOVERED',
        severity: 'info',
        source: 'connector.terminal',
        target: `localhost:${p}`,
        payload: {
          session_id: entry.session.id,
          command: entry.session.command,
          framework: entry.session.detected_framework ?? null,
        },
      });
      publishSession(entry);
    }
  }

  // ── boot ──
  if (BOOT_RE.test(clean) && entry.session.last_signal !== 'boot') {
    entry.session.last_signal = 'boot';
    bus.emitReplayEvent({
      kind: 'DEV_SERVER_STARTED',
      severity: 'info',
      source: 'connector.terminal',
      target: entry.session.command,
      payload: {
        session_id: entry.session.id,
        framework: entry.session.detected_framework ?? null,
      },
    });
    publishSession(entry);
  }

  // ── HMR / compile success ──
  if (HMR_RE.test(clean)) {
    entry.session.last_signal = 'hmr';
    bus.emitReplayEvent({
      kind: 'HOT_RELOAD',
      severity: 'info',
      source: 'connector.terminal',
      target: entry.session.command,
      payload: {
        session_id: entry.session.id,
        snippet: clean.slice(0, 200).trim(),
      },
    });
  }

  // ── crash ──
  if (CRASH_RE.test(clean)) {
    entry.session.last_signal = 'crash';
    bus.emitReplayEvent({
      kind: 'BUILD_CRASH',
      severity: 'critical',
      source: 'connector.terminal',
      target: entry.session.command,
      payload: {
        session_id: entry.session.id,
        snippet: clean.slice(0, 400).trim(),
      },
    });
    return;
  }

  // ── compile / runtime error ──
  if (TS_ERROR_RE.test(clean) || (stream === 'stderr' && ERROR_RE.test(clean))) {
    entry.session.last_signal = 'compile_fail';
    bus.emitReplayEvent({
      kind: TS_ERROR_RE.test(clean) ? 'SYNTAX_FAILURE' : 'COMPILER_FAILURE',
      severity: 'error',
      source: 'connector.terminal',
      target: entry.session.command,
      payload: {
        session_id: entry.session.id,
        stream,
        snippet: clean.slice(0, 320).trim(),
      },
    });
  } else if (ERROR_RE.test(clean) && stream === 'stdout') {
    entry.session.last_signal = 'compile_warn';
    bus.emitReplayEvent({
      kind: 'COMPILER_WARN',
      severity: 'warn',
      source: 'connector.terminal',
      target: entry.session.command,
      payload: {
        session_id: entry.session.id,
        stream,
        snippet: clean.slice(0, 240).trim(),
      },
    });
  }
}

function scheduleFlush(entry: SessionEntry): void {
  if (entry.flushTimer) return;
  entry.flushTimer = setTimeout(() => {
    entry.flushTimer = null;
    flush(entry);
  }, FLUSH_INTERVAL_MS);
}

function flush(entry: SessionEntry): void {
  const { stdout, stderr } = entry.pending;
  entry.pending.stdout = '';
  entry.pending.stderr = '';
  if (stdout) emitChunk(entry, 'stdout', stdout);
  if (stderr) emitChunk(entry, 'stderr', stderr);
}

function emitChunk(entry: SessionEntry, stream: 'stdout' | 'stderr', text: string): void {
  if (!text) return;
  const ts = Date.now();
  entry.buffer.push({ stream, data: text, ts });
  while (entry.buffer.length > RING_LIMIT) entry.buffer.shift();

  entry.session.total_bytes = (entry.session.total_bytes ?? 0) + Buffer.byteLength(text, 'utf8');

  bus.emit('ws', {
    type: 'terminal_chunk',
    payload: { session_id: entry.session.id, stream, data: text, ts },
  } satisfies WSMessage);

  scanForSignals(entry, text, stream);
}

// ──────────── Public API ────────────
export function spawnTerminal(
  input: SpawnInput,
): { ok: true; session: TerminalSession } | { ok: false; error: string } {
  // dedupe — running process with identical (workspace_id, command) is reused
  const existing = [...sessions.values()].find(
    (e) =>
      e.session.workspace_id === (input.workspace_id ?? null) &&
      e.session.command === input.command &&
      e.session.status === 'running',
  );
  if (existing) return { ok: true, session: existing.session };

  if (sessions.size >= MAX_CONCURRENT) {
    // garbage-collect exited sessions before refusing
    for (const [id, entry] of sessions) {
      if (entry.session.status !== 'running') sessions.delete(id);
    }
    if (sessions.size >= MAX_CONCURRENT) {
      return { ok: false, error: `max concurrent terminals reached (${MAX_CONCURRENT})` };
    }
  }

  // validate cwd
  try {
    const s = fs.statSync(input.cwd);
    if (!s.isDirectory()) return { ok: false, error: `cwd is not a directory: ${input.cwd}` };
  } catch {
    return { ok: false, error: `cwd does not exist: ${input.cwd}` };
  }

  const cleaned = sanitizeCommand(input.command, input.args ?? []);
  if (!cleaned.ok) return cleaned;

  const onWin = process.platform === 'win32';
  const id = `term_${nanoid(10)}`;
  let proc: ChildProcess;
  try {
    proc = spawn(cleaned.bin, cleaned.args, {
      cwd: input.cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        TERM: process.env.TERM ?? 'xterm-256color',
        NODE_ENV: process.env.NODE_ENV ?? 'development',
        ...(input.env ?? {}),
      },
      // shell:true is required on Windows for npm/pnpm/yarn .cmd shims. We've
      // already validated the binary against the allowlist and rejected any
      // shell metacharacters in args, so the shell expansion surface is
      // limited to the allowlisted binary name and validated arguments.
      shell: onWin,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      windowsHide: true,
    });
  } catch (err) {
    return { ok: false, error: `spawn failed: ${(err as Error).message}` };
  }

  const framework = inferFramework(cleaned.bin, cleaned.args);

  const session: TerminalSession = {
    id,
    workspace_id: input.workspace_id ?? null,
    command: input.command,
    args: cleaned.args,
    cwd: input.cwd,
    pid: proc.pid ?? null,
    started_at: Date.now(),
    exited_at: null,
    exit_code: null,
    status: 'running',
    detected_framework: framework,
    ports: [],
    last_signal: null,
    restart_count: 0,
    total_bytes: 0,
  };

  const entry: SessionEntry = {
    proc,
    session,
    buffer: [],
    pending: { stdout: '', stderr: '' },
    flushTimer: null,
    detectedPorts: new Set(),
    spawnInput: input,
  };
  sessions.set(id, entry);
  publishSession(entry);

  bus.emitReplayEvent({
    kind: 'TERMINAL_ATTACHED',
    severity: 'info',
    source: 'connector.terminal',
    target: input.command,
    payload: {
      id,
      cwd: input.cwd,
      pid: proc.pid ?? null,
      workspace_id: input.workspace_id ?? null,
      framework,
    },
  });

  wireProcess(entry);
  return { ok: true, session };
}

function wireProcess(entry: SessionEntry): void {
  const { proc, session } = entry;
  if (!proc) return;

  proc.stdout?.on('data', (d: Buffer) => {
    entry.pending.stdout += d.toString('utf8');
    scheduleFlush(entry);
  });
  proc.stderr?.on('data', (d: Buffer) => {
    entry.pending.stderr += d.toString('utf8');
    scheduleFlush(entry);
  });
  proc.on('error', (err) => {
    bus.emitReplayEvent({
      kind: 'PROCESS_CRASH',
      severity: 'error',
      source: 'connector.terminal',
      target: session.command,
      payload: { session_id: session.id, error: (err as Error).message },
    });
    session.status = 'crashed';
    session.last_signal = 'crash';
    publishSession(entry);
  });
  proc.on('exit', (code, signal) => {
    if (entry.flushTimer) {
      clearTimeout(entry.flushTimer);
      entry.flushTimer = null;
    }
    flush(entry);
    session.exited_at = Date.now();
    session.exit_code = code;
    session.status = code === 0 ? 'exited' : 'crashed';
    publishSession(entry);
    bus.emitReplayEvent({
      kind: 'TERMINAL_EXITED',
      severity: code === 0 ? 'info' : 'warn',
      source: 'connector.terminal',
      target: session.command,
      payload: { id: session.id, exit_code: code, signal: signal ?? null },
    });
    if (code !== 0 && code !== null) {
      bus.emitReplayEvent({
        kind: 'PROCESS_CRASH',
        severity: 'error',
        source: 'connector.terminal',
        target: session.command,
        payload: { id: session.id, exit_code: code, signal: signal ?? null },
      });
    }
  });
}

export function stopTerminal(id: string): { ok: boolean; error?: string } {
  const e = sessions.get(id);
  if (!e) return { ok: false, error: 'session not found' };

  if (e.flushTimer) {
    clearTimeout(e.flushTimer);
    e.flushTimer = null;
    flush(e);
  }

  if (e.proc && !e.proc.killed && e.proc.exitCode === null) {
    try {
      e.proc.kill('SIGTERM');
      const proc = e.proc;
      setTimeout(() => {
        try {
          if (!proc.killed) proc.kill('SIGKILL');
        } catch {
          /* already gone */
        }
      }, KILL_GRACE_MS);
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  } else {
    // already-exited session — synthesize a clean state update
    e.session.status = 'exited';
    publishSession(e);
  }
  return { ok: true };
}

export function restartTerminal(
  id: string,
): { ok: true; session: TerminalSession } | { ok: false; error: string } {
  const e = sessions.get(id);
  if (!e) return { ok: false, error: 'session not found' };
  const prev = e.session;
  if ((prev.restart_count ?? 0) >= MAX_RESTARTS) {
    return { ok: false, error: 'max restart count reached' };
  }

  // ensure previous process is fully terminated
  if (e.proc && !e.proc.killed && e.proc.exitCode === null) {
    try {
      e.proc.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }

  const cleaned = sanitizeCommand(prev.command, []);
  if (!cleaned.ok) return cleaned;
  const onWin = process.platform === 'win32';
  let proc: ChildProcess;
  try {
    proc = spawn(cleaned.bin, cleaned.args, {
      cwd: prev.cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        TERM: process.env.TERM ?? 'xterm-256color',
        ...(e.spawnInput.env ?? {}),
      },
      shell: onWin,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch (err) {
    return { ok: false, error: `restart spawn failed: ${(err as Error).message}` };
  }

  e.proc = proc;
  e.buffer = [];
  e.pending = { stdout: '', stderr: '' };
  e.detectedPorts.clear();
  e.session = {
    ...prev,
    pid: proc.pid ?? null,
    started_at: Date.now(),
    exited_at: null,
    exit_code: null,
    status: 'running',
    ports: [],
    last_signal: null,
    restart_count: (prev.restart_count ?? 0) + 1,
    total_bytes: 0,
  };
  publishSession(e);

  bus.emitReplayEvent({
    kind: 'TERMINAL_ATTACHED',
    severity: 'info',
    source: 'connector.terminal.restart',
    target: prev.command,
    payload: { id, restart_count: e.session.restart_count },
  });

  wireProcess(e);
  return { ok: true, session: e.session };
}

export function listTerminals(): TerminalSession[] {
  return [...sessions.values()].map((e) => e.session);
}

export function getTerminal(id: string): TerminalSession | null {
  return sessions.get(id)?.session ?? null;
}

export function getTerminalBuffer(id: string, limit = 600): BufferedLine[] {
  const e = sessions.get(id);
  if (!e) return [];
  return e.buffer.slice(Math.max(0, e.buffer.length - limit));
}

/** Graceful shutdown — used by process signal handlers. */
export function killAllTerminals(): void {
  for (const e of sessions.values()) {
    try {
      if (e.proc && !e.proc.killed) e.proc.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}
