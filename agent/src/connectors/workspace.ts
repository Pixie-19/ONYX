import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { bus, SESSION_ID } from '../bus/eventBus.js';
import { writeJsonl } from '../bus/jsonl.js';
import { detectFramework } from './framework.js';
import { config } from '../config.js';
import type { WorkspaceRow, Framework, WorkspaceStatus, WSMessage } from '../types.js';

/**
 * Source-of-truth manager for attached workspaces.
 *
 * Persists to SQLite (`workspaces` table), broadcasts state changes over the
 * websocket, and emits replay events for every connector action so the
 * intelligence engine and chrono replay can correlate workspace lifecycle
 * with downstream operational signal.
 */

const MAX_SCAN_FILES = 8000;

const IGNORED_DIR_NAMES = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.turbo', '.cache',
  'coverage', 'venv', '.venv', '__pycache__', '.idea', '.vscode',
  'target', 'out', '.gradle', '.parcel-cache',
]);

interface ConnectInput {
  path: string;
  name?: string;
  mode?: 'real' | 'demo';
}

interface ConnectError {
  ok: false;
  error: string;
}
interface ConnectSuccess {
  ok: true;
  workspace: WorkspaceRow;
}
type ConnectResult = ConnectSuccess | ConnectError;

function safeExec(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500 }).trim();
  } catch {
    return null;
  }
}

async function quickFileCount(root: string, max = MAX_SCAN_FILES): Promise<number> {
  let count = 0;
  const stack: string[] = [root];
  while (stack.length > 0 && count < max) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch { continue; }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.env') continue;
      if (IGNORED_DIR_NAMES.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else {
        count += 1;
        if (count >= max) break;
      }
    }
  }
  return count;
}

function persist(row: WorkspaceRow): void {
  db().prepare(`
    INSERT INTO workspaces
      (id, name, path, framework, package_manager, language, git_remote, git_branch,
       attached_at, last_seen_at, status, file_count, meta_json)
    VALUES (@id, @name, @path, @framework, @package_manager, @language, @git_remote, @git_branch,
            @attached_at, @last_seen_at, @status, @file_count, @meta_json)
    ON CONFLICT(path) DO UPDATE SET
      name             = excluded.name,
      framework        = excluded.framework,
      package_manager  = excluded.package_manager,
      language         = excluded.language,
      git_remote       = excluded.git_remote,
      git_branch       = excluded.git_branch,
      last_seen_at     = excluded.last_seen_at,
      status           = excluded.status,
      file_count       = excluded.file_count,
      meta_json        = excluded.meta_json
  `).run(row);
  writeJsonl('workspaces', row);
}

function rowOf(input: {
  id?: string;
  name: string;
  path: string;
  framework: Framework | null;
  package_manager: string | null;
  language: string | null;
  git_remote: string | null;
  git_branch: string | null;
  status: WorkspaceStatus;
  file_count: number;
  meta: Record<string, unknown>;
}): WorkspaceRow {
  const now = Date.now();
  return {
    id: input.id ?? `ws_${nanoid(10)}`,
    name: input.name,
    path: input.path,
    framework: input.framework,
    package_manager: input.package_manager,
    language: input.language,
    git_remote: input.git_remote,
    git_branch: input.git_branch,
    attached_at: now,
    last_seen_at: now,
    status: input.status,
    file_count: input.file_count,
    meta_json: JSON.stringify(input.meta ?? {}),
  };
}

const WATCH_LIFECYCLE: { onAttach: (ws: WorkspaceRow) => void; onDetach: (ws: WorkspaceRow) => void } = {
  onAttach: () => { /* wired from filesystem interceptor */ },
  onDetach: () => { /* wired from filesystem interceptor */ },
};

export function setWatchLifecycle(onAttach: (ws: WorkspaceRow) => void, onDetach: (ws: WorkspaceRow) => void): void {
  WATCH_LIFECYCLE.onAttach = onAttach;
  WATCH_LIFECYCLE.onDetach = onDetach;
}

export function listWorkspaces(): WorkspaceRow[] {
  return db().prepare('SELECT * FROM workspaces ORDER BY last_seen_at DESC').all() as WorkspaceRow[];
}

export function getWorkspace(id: string): WorkspaceRow | null {
  return (db().prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as WorkspaceRow | undefined) ?? null;
}

function broadcastList(): void {
  bus.emit('ws', { type: 'workspace_list', payload: listWorkspaces() } satisfies WSMessage);
}

function broadcastUpdate(ws: WorkspaceRow): void {
  bus.emit('ws', { type: 'workspace_update', payload: ws } satisfies WSMessage);
}

export async function connectWorkspace(input: ConnectInput): Promise<ConnectResult> {
  const raw = input.path?.trim();
  if (!raw) return { ok: false, error: 'path is required' };

  const abs = path.resolve(raw);
  try {
    const s = await stat(abs);
    if (!s.isDirectory()) return { ok: false, error: `not a directory: ${abs}` };
  } catch {
    return { ok: false, error: `path does not exist: ${abs}` };
  }

  const existing = db().prepare('SELECT * FROM workspaces WHERE path = ?').get(abs) as WorkspaceRow | undefined;

  // detect framework
  const detection = await detectFramework(abs);

  // git remote + branch (best effort)
  const gitRemote = safeExec('git config --get remote.origin.url', abs);
  const gitBranch = safeExec('git rev-parse --abbrev-ref HEAD', abs);

  // quick file count
  const file_count = await quickFileCount(abs);

  const name = input.name?.trim() || path.basename(abs);
  const status: WorkspaceStatus = input.mode === 'demo' ? 'demo' : 'attached';

  const row = rowOf({
    id: existing?.id,
    name,
    path: abs,
    framework: detection.framework,
    package_manager: detection.package_manager,
    language: detection.language,
    git_remote: gitRemote,
    git_branch: gitBranch,
    status,
    file_count,
    meta: {
      scripts: detection.scripts,
      deps_count: detection.dependencies.length,
      ...detection.meta,
    },
  });

  persist(row);

  // emit lifecycle events
  bus.emitReplayEvent({
    kind: 'WORKSPACE_CONNECTED',
    severity: 'info',
    source: 'connector.workspace',
    target: row.name,
    payload: { id: row.id, path: row.path, framework: row.framework ?? 'unknown', file_count },
  });
  if (row.framework && row.framework !== 'unknown') {
    bus.emitReplayEvent({
      kind: 'FRAMEWORK_DETECTED',
      severity: 'info',
      source: 'connector.framework',
      target: row.framework,
      payload: { workspace_id: row.id, package_manager: row.package_manager ?? 'unknown' },
    });
  }

  WATCH_LIFECYCLE.onAttach(row);
  broadcastUpdate(row);
  broadcastList();

  return { ok: true, workspace: row };
}

export function detachWorkspace(id: string): { ok: boolean; error?: string } {
  const ws = getWorkspace(id);
  if (!ws) return { ok: false, error: 'workspace not found' };
  db().prepare('DELETE FROM workspaces WHERE id = ?').run(id);
  bus.emitReplayEvent({
    kind: 'WORKSPACE_DETACHED',
    severity: 'info',
    source: 'connector.workspace',
    target: ws.name,
    payload: { id: ws.id, path: ws.path },
  });
  WATCH_LIFECYCLE.onDetach(ws);
  broadcastList();
  return { ok: true };
}

export async function rescanWorkspace(id: string): Promise<ConnectResult> {
  const ws = getWorkspace(id);
  if (!ws) return { ok: false, error: 'workspace not found' };
  return connectWorkspace({ path: ws.path, name: ws.name, mode: ws.status === 'demo' ? 'demo' : 'real' });
}

/** Restore all previously-attached workspaces on agent boot. */
export async function restoreWorkspaces(): Promise<void> {
  const rows = listWorkspaces();
  for (const ws of rows) {
    // Remote-only workspaces (github://owner/repo) have no on-disk path —
    // skip the existence check, leave their status alone, and never wire
    // a filesystem watcher.
    if (ws.path.startsWith('github://')) {
      continue;
    }
    if (existsSync(ws.path)) {
      WATCH_LIFECYCLE.onAttach(ws);
      bus.emitReplayEvent({
        kind: 'WORKSPACE_CONNECTED',
        severity: 'info',
        source: 'connector.workspace.restore',
        target: ws.name,
        payload: { id: ws.id, restored: true },
      });
    } else {
      db().prepare('UPDATE workspaces SET status = ? WHERE id = ?').run('error', ws.id);
    }
  }
  broadcastList();
}

/**
 * Register a workspace from a GitHub remote (no local clone required).
 *
 * This enables the "Connect any GitHub repo" flow: ONYX persists the
 * remote-only workspace under a synthetic `github://owner/repo` path so
 * the unique-path constraint never collides with a real local checkout.
 * Filesystem watchers / AST snapshots are skipped — the workspace exists
 * purely as a sync target for commits, branches, contributors and PRs.
 *
 * If the user later runs `connectWorkspace` against the same repo on
 * disk, both rows coexist (different `path` values) so neither flow
 * disturbs the other.
 */
interface RemoteConnectInput {
  owner: string;
  repo: string;
  name?: string;
  default_branch?: string | null;
  language?: string | null;
  description?: string | null;
  visibility?: 'public' | 'private' | null;
  html_url?: string | null;
  ssh_url?: string | null;
  clone_url?: string | null;
  avatar_url?: string | null;
  stars?: number | null;
}

export async function connectRemoteWorkspace(input: RemoteConnectInput): Promise<ConnectResult> {
  const owner = (input.owner ?? '').trim().toLowerCase();
  const repo = (input.repo ?? '').trim().toLowerCase();
  if (!owner || !repo) return { ok: false, error: 'owner and repo are required' };
  if (!/^[a-z0-9._-]+$/.test(owner) || !/^[a-z0-9._-]+$/.test(repo)) {
    return { ok: false, error: 'invalid owner/repo characters' };
  }

  const syntheticPath = `github://${owner}/${repo}`;
  const existing = db().prepare('SELECT * FROM workspaces WHERE path = ?').get(syntheticPath) as WorkspaceRow | undefined;
  const gitRemote = input.clone_url ?? input.html_url ?? `https://github.com/${owner}/${repo}.git`;
  const branch = input.default_branch ?? null;
  const name = input.name?.trim() || `${owner}/${repo}`;

  const row = rowOf({
    id: existing?.id,
    name,
    path: syntheticPath,
    framework: null,
    package_manager: null,
    language: input.language ?? null,
    git_remote: gitRemote,
    git_branch: branch,
    status: 'attached',
    file_count: 0,
    meta: {
      remote_only: true,
      provider: 'github',
      owner,
      repo,
      visibility: input.visibility ?? null,
      description: input.description ?? null,
      html_url: input.html_url ?? `https://github.com/${owner}/${repo}`,
      ssh_url: input.ssh_url ?? null,
      avatar_url: input.avatar_url ?? null,
      stars: input.stars ?? null,
    },
  });

  persist(row);

  bus.emitReplayEvent({
    kind: 'WORKSPACE_CONNECTED',
    severity: 'info',
    source: 'connector.workspace.remote',
    target: row.name,
    payload: { id: row.id, owner, repo, remote_only: true },
  });

  // Remote workspaces don't get filesystem watchers, but we still publish
  // them through the same broadcast channel so the cockpit list updates.
  broadcastUpdate(row);
  broadcastList();

  return { ok: true, workspace: row };
}

/** Auto-connect the ONYX repo itself as a demo workspace. */
export async function ensureDemoWorkspace(): Promise<WorkspaceRow | null> {
  const repoRoot = config.paths.repoRoot;
  const existing = db().prepare('SELECT * FROM workspaces WHERE path = ?').get(repoRoot) as WorkspaceRow | undefined;
  if (existing) return existing;
  const result = await connectWorkspace({ path: repoRoot, name: 'ONYX · Demo Workspace', mode: 'demo' });
  return result.ok ? result.workspace : null;
}
