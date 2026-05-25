import { watch, type FSWatcher } from 'chokidar';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { nanoid } from 'nanoid';
import { bus, SESSION_ID } from '../bus/eventBus.js';
import { setWatchLifecycle } from '../connectors/workspace.js';
import type { WorkspaceEntropyRow, WorkspaceRow } from '../types.js';

// burst-rate accounting — rolling 60s window of saves per file
const recent = new Map<string, number[]>(); // file -> ts[]
const BURST_WINDOW_MS = 60_000;

function burstRate(file: string, now: number): number {
  const arr = recent.get(file) ?? [];
  const cut = now - BURST_WINDOW_MS;
  const trimmed = arr.filter(t => t >= cut);
  trimmed.push(now);
  recent.set(file, trimmed);
  return trimmed.length / (BURST_WINDOW_MS / 60_000);
}

function langFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.ts': case '.tsx': return 'ts';
    case '.js': case '.jsx': case '.mjs': case '.cjs': return 'js';
    case '.py': return 'py';
    case '.go': return 'go';
    case '.rs': return 'rs';
    case '.java': return 'java';
    case '.json': return 'json';
    case '.yaml': case '.yml': return 'yaml';
    case '.sql': return 'sql';
    case '.md': return 'md';
    default: return ext.replace('.', '') || 'unknown';
  }
}

const IGNORED = [
  /(^|[\/\\])\../,
  /node_modules/,
  /\.next/,
  /dist/,
  /\.git/,
  /\.tsbuildinfo/,
  /agent[\/\\]data/,
  /coverage/,
  /\.turbo/,
  /\.cache/,
  /\.venv/,
  /__pycache__/,
];

interface AttachedWatcher {
  watcher: FSWatcher;
  workspace: WorkspaceRow;
}

const watchers = new Map<string, AttachedWatcher>(); // workspace.id -> watcher

function emitEvent(workspace: WorkspaceRow, event: 'add' | 'change' | 'unlink' | 'rename', filePath: string): void {
  const rel = path.relative(workspace.path, filePath).replaceAll('\\', '/');
  if (!rel || rel.startsWith('..')) return;
  // also relay an absolute-ish display path namespaced by workspace
  const displayFile = `${workspace.name}/${rel}`;
  void (async () => {
    let bytes = 0;
    if (event !== 'unlink') {
      try { bytes = (await stat(filePath)).size; } catch { /* ignore */ }
    }
    const now = Date.now();
    const burst = burstRate(displayFile, now);

    const row: WorkspaceEntropyRow = {
      id: `we_${nanoid(10)}`,
      ts: now,
      file: displayFile,
      lang: langFor(rel),
      event,
      bytes_delta: bytes,
      ast_delta: 0,
      complexity: 0,
      syntax_fail: 0,
      burst_rate: Number(burst.toFixed(2)),
      author: 'local',
      session_id: SESSION_ID,
    };
    bus.emitWorkspace(row);
    // emit a normalised 'file' signal for AST analyzer — pass the ABSOLUTE path
    // so the analyzer can read the actual file contents.
    bus.emit('file', { event, file: rel, abs: filePath, workspace_id: workspace.id, ts: now, displayFile });

    bus.emitReplayEvent({
      kind: event === 'unlink' ? 'FILE_DELETED' : 'FILE_MODIFIED',
      severity: burst > 6 ? 'warn' : 'info',
      source: 'interceptor.filesystem',
      target: displayFile,
      payload: { event, bytes, burst_rate: row.burst_rate, workspace_id: workspace.id },
    });
  })();
}

function attachOne(workspace: WorkspaceRow): void {
  if (watchers.has(workspace.id)) return;
  const w = watch(workspace.path, {
    ignored: IGNORED,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 25 },
    depth: 12,
  });

  w.on('add',    (p) => emitEvent(workspace, 'add', p));
  w.on('change', (p) => emitEvent(workspace, 'change', p));
  w.on('unlink', (p) => emitEvent(workspace, 'unlink', p));
  w.on('ready',  () => {
    bus.emitReplayEvent({
      kind: 'DEMO_PHASE',
      source: 'interceptor.filesystem',
      payload: { phase: 'fs.ready', workspace: workspace.name, path: workspace.path },
    });
  });

  watchers.set(workspace.id, { watcher: w, workspace });
}

function detachOne(workspace: WorkspaceRow): void {
  const entry = watchers.get(workspace.id);
  if (!entry) return;
  void entry.watcher.close();
  watchers.delete(workspace.id);
}

export function startFilesystem(): void {
  // Wire up to the workspace lifecycle — every attach/detach hooks the watcher.
  setWatchLifecycle(attachOne, detachOne);
}

export function watchedWorkspaceIds(): string[] {
  return [...watchers.keys()];
}
