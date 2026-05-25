import { spawn, type ChildProcess } from 'node:child_process';
import { nanoid } from 'nanoid';
import { bus } from '../bus/eventBus.js';
import type { TerminalSession, WSMessage } from '../types.js';

/**
 * Lightweight terminal attachment using Node's child_process — not a true PTY
 * (which would require node-pty native binaries that complicate Windows
 * installs), but functionally captures stdout/stderr, exit codes, and runtime
 * crash signals from any dev command. Streams chunks via the websocket.
 */

interface SpawnInput {
  workspace_id?: string | null;
  cwd: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

const sessions = new Map<string, { proc: ChildProcess; session: TerminalSession }>();

function publish(session: TerminalSession): void {
  bus.emit('ws', { type: 'terminal', payload: session } satisfies WSMessage);
}

export function spawnTerminal({ workspace_id, cwd, command, args = [], env }: SpawnInput): TerminalSession {
  const id = `term_${nanoid(10)}`;
  const proc = spawn(command, args, {
    cwd,
    env: { ...process.env, ...(env ?? {}) },
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const session: TerminalSession = {
    id,
    workspace_id: workspace_id ?? null,
    command,
    args,
    cwd,
    pid: proc.pid ?? null,
    started_at: Date.now(),
    exited_at: null,
    exit_code: null,
    status: 'running',
  };
  sessions.set(id, { proc, session });
  publish(session);

  bus.emitReplayEvent({
    kind: 'TERMINAL_ATTACHED',
    severity: 'info',
    source: 'connector.terminal',
    target: command,
    payload: { id, cwd, pid: proc.pid ?? null, workspace_id: workspace_id ?? null },
  });

  const emitChunk = (stream: 'stdout' | 'stderr', data: Buffer) => {
    const text = data.toString('utf8');
    if (!text) return;
    bus.emit('ws', { type: 'terminal_chunk', payload: { session_id: id, stream, data: text, ts: Date.now() } } satisfies WSMessage);

    // surface a few high-signal patterns as bus events
    if (/error|failed|fatal|crash/i.test(text)) {
      bus.emitReplayEvent({
        kind: 'COMPILER_WARN',
        severity: 'warn',
        source: 'connector.terminal',
        target: command,
        payload: { stream, snippet: text.slice(0, 240) },
      });
    } else if (/(ready|compiled successfully|listening on|hot reload)/i.test(text)) {
      bus.emitReplayEvent({
        kind: 'HOT_RELOAD',
        severity: 'info',
        source: 'connector.terminal',
        target: command,
        payload: { snippet: text.slice(0, 240) },
      });
    }
  };

  proc.stdout?.on('data', (d) => emitChunk('stdout', d));
  proc.stderr?.on('data', (d) => emitChunk('stderr', d));

  proc.on('exit', (code, signal) => {
    session.exited_at = Date.now();
    session.exit_code = code;
    session.status = code === 0 ? 'exited' : 'crashed';
    publish(session);
    bus.emitReplayEvent({
      kind: 'TERMINAL_EXITED',
      severity: code === 0 ? 'info' : 'warn',
      source: 'connector.terminal',
      target: command,
      payload: { id, exit_code: code, signal },
    });
    if (code !== 0) {
      bus.emitReplayEvent({
        kind: 'PROCESS_CRASH',
        severity: 'error',
        source: 'connector.terminal',
        target: command,
        payload: { id, exit_code: code, signal },
      });
    }
  });

  return session;
}

export function stopTerminal(id: string): { ok: boolean; error?: string } {
  const e = sessions.get(id);
  if (!e) return { ok: false, error: 'session not found' };
  try {
    if (e.proc.killed === false) {
      e.proc.kill('SIGTERM');
      setTimeout(() => { try { e.proc.kill('SIGKILL'); } catch {} }, 800);
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  return { ok: true };
}

export function listTerminals(): TerminalSession[] {
  return [...sessions.values()].map((e) => e.session);
}
