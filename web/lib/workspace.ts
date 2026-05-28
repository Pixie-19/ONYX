import { ONYX_HTTP } from './format';
import type {
  WorkspaceRow,
  TerminalSession,
  TerminalChunk,
  GithubSyncStatus,
} from './types';

export interface ConnectRequest {
  path: string;
  name?: string;
  mode?: 'real' | 'demo';
}

/**
 * Network-level errors here are expected: the agent process may be down,
 * the cockpit may be running standalone, or the user may have unplugged
 * a workspace. We never want a click handler to surface a raw
 * `TypeError: Failed to fetch` overlay — every helper either resolves
 * with a domain-shaped result (often `null`) or rejects with a
 * normalized `AgentApiError` whose `.message` is safe to display.
 */
export class AgentApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'AgentApiError';
    this.status = status;
  }
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: AgentApiError }> {
  let r: Response;
  try {
    r = await fetch(url, init);
  } catch (err) {
    // Browser network failure — agent unreachable, CORS blocked, offline.
    const msg = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: new AgentApiError(`Agent unreachable: ${msg}`, 0) };
  }
  let body: unknown = null;
  try {
    body = await r.json();
  } catch {
    if (!r.ok) return { ok: false, error: new AgentApiError(`HTTP ${r.status}`, r.status) };
    return { ok: false, error: new AgentApiError('Invalid JSON response', r.status) };
  }
  if (!r.ok) {
    const errMsg = (body as any)?.error ?? `HTTP ${r.status}`;
    return { ok: false, error: new AgentApiError(String(errMsg), r.status) };
  }
  return { ok: true, data: body as T };
}

export async function connectWorkspaceApi(req: ConnectRequest): Promise<WorkspaceRow> {
  const res = await fetchJson<{ ok: boolean; error?: string; workspace?: WorkspaceRow }>(
    `${ONYX_HTTP}/workspace/connect`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    },
  );
  if (!res.ok) throw res.error;
  if (!res.data.ok || !res.data.workspace) throw new AgentApiError(res.data.error ?? 'Connect failed');
  return res.data.workspace;
}

export interface ConnectRemoteRequest {
  owner: string;
  repo: string;
  name?: string;
  default_branch?: string | null;
  language?: string | null;
  description?: string | null;
  visibility?: 'public' | 'private' | 'internal' | null;
  html_url?: string | null;
  ssh_url?: string | null;
  clone_url?: string | null;
  avatar_url?: string | null;
  stars?: number | null;
}

/**
 * Register a GitHub repository as a remote-only ONYX workspace. The agent
 * persists it under a synthetic `github://owner/repo` path — no local
 * filesystem watcher is created, but commit/branch/PR sync engages on
 * demand via `syncGithubApi(workspace_id)`.
 */
export async function connectRemoteWorkspaceApi(req: ConnectRemoteRequest): Promise<WorkspaceRow> {
  const res = await fetchJson<{ ok: boolean; error?: string; workspace?: WorkspaceRow }>(
    `${ONYX_HTTP}/workspace/connect-remote`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    },
  );
  if (!res.ok) throw res.error;
  if (!res.data.ok || !res.data.workspace) {
    throw new AgentApiError(res.data.error ?? 'Connect failed');
  }
  return res.data.workspace;
}

export async function detachWorkspaceApi(id: string): Promise<void> {
  const res = await fetchJson<{ ok?: boolean }>(`${ONYX_HTTP}/workspace/${id}`, { method: 'DELETE' });
  if (!res.ok) throw res.error;
}

export async function rescanWorkspaceApi(id: string): Promise<WorkspaceRow> {
  const res = await fetchJson<{ ok: boolean; error?: string; workspace?: WorkspaceRow }>(
    `${ONYX_HTTP}/workspace/${id}/scan`,
    { method: 'POST' },
  );
  if (!res.ok) throw res.error;
  if (!res.data.ok || !res.data.workspace) throw new AgentApiError(res.data.error ?? 'Rescan failed');
  return res.data.workspace;
}

export async function ensureDemoWorkspaceApi(): Promise<WorkspaceRow | null> {
  const res = await fetchJson<{ ok: boolean; workspace?: WorkspaceRow }>(
    `${ONYX_HTTP}/workspace/demo`,
    { method: 'POST' },
  );
  if (!res.ok) return null;
  if (!res.data.ok || !res.data.workspace) return null;
  return res.data.workspace;
}

export async function listWorkspacesApi(): Promise<WorkspaceRow[]> {
  const res = await fetchJson<{ workspaces?: WorkspaceRow[] }>(`${ONYX_HTTP}/workspace/list`);
  if (!res.ok) return [];
  return res.data.workspaces ?? [];
}

// ─── GitHub ─────────────────────────────────────────────────────────

export async function syncGithubApi(workspace_id: string): Promise<{ ok: boolean; indexed?: number; error?: string; status?: GithubSyncStatus }> {
  const res = await fetchJson<{ ok: boolean; indexed?: number; error?: string; status?: GithubSyncStatus }>(
    `${ONYX_HTTP}/github/sync`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspace_id }),
    },
  );
  if (!res.ok) return { ok: false, error: res.error.message };
  return res.data;
}

export async function githubAuthStatusApi(): Promise<{
  configured: boolean;
  source: 'runtime' | 'env' | 'none';
  label: string | null;
  registered_at: number | null;
}> {
  const res = await fetchJson<{
    configured: boolean;
    source: 'runtime' | 'env' | 'none';
    label: string | null;
    registered_at: number | null;
  }>(`${ONYX_HTTP}/github/auth/status`);
  if (!res.ok) {
    return { configured: false, source: 'none', label: null, registered_at: null };
  }
  return res.data;
}

export async function githubRegisterTokenApi(token: string, label?: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetchJson<{ ok: boolean; error?: string }>(
    `${ONYX_HTTP}/github/auth/token`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, label }),
    },
  );
  if (!res.ok) return { ok: false, error: res.error.message };
  return res.data;
}

export async function githubClearTokenApi(): Promise<void> {
  await fetchJson(`${ONYX_HTTP}/github/auth/token`, { method: 'DELETE' });
}

export async function githubSyncStatusApi(workspace_id: string): Promise<GithubSyncStatus | null> {
  const res = await fetchJson<{ ok: boolean; status?: GithubSyncStatus }>(
    `${ONYX_HTTP}/github/status/${workspace_id}`,
  );
  if (!res.ok) return null;
  if (!res.data.ok || !res.data.status) return null;
  return res.data.status;
}

// ─── User-scoped repository listing (Next.js /api proxy) ──────────────────

export interface NormalizedGithubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  description: string | null;
  language: string | null;
  default_branch: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: number | null;
  updated_at: number | null;
  archived: boolean;
  fork: boolean;
  visibility: 'public' | 'private' | 'internal';
  topics: string[];
  owner: { login: string; avatar_url: string; html_url: string; type: string };
}

export interface ListReposResult {
  repositories: NormalizedGithubRepo[];
  page: number;
  per_page: number;
  has_next: boolean;
  total_count: number | null;
  rate_limit_remaining: number | null;
  rate_limit_reset: number | null;
  user?: { login: string | null; avatar_url: string | null };
  error?: string;
  code?: 'AUTH_REQUIRED' | 'RATE_LIMITED' | 'TOKEN_INVALID' | 'GITHUB_ERROR' | 'NETWORK';
  status?: number;
}

export async function listGithubRepositoriesApi(opts: {
  search?: string;
  page?: number;
  per_page?: number;
  sort?: 'updated' | 'pushed' | 'created' | 'full_name';
  signal?: AbortSignal;
} = {}): Promise<ListReposResult> {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.per_page) params.set('per_page', String(opts.per_page));
  if (opts.sort) params.set('sort', opts.sort);

  let r: Response;
  try {
    r = await fetch(`/api/github/repositories?${params.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      signal: opts.signal,
      cache: 'no-store',
    });
  } catch (err) {
    return {
      repositories: [], page: opts.page ?? 1, per_page: opts.per_page ?? 30,
      has_next: false, total_count: null, rate_limit_remaining: null, rate_limit_reset: null,
      error: (err as Error).message, code: 'NETWORK', status: 0,
    };
  }
  let body: any = null;
  try { body = await r.json(); } catch { /* ignore */ }
  if (!r.ok) {
    return {
      repositories: [], page: opts.page ?? 1, per_page: opts.per_page ?? 30,
      has_next: false, total_count: null,
      rate_limit_remaining: body?.rate_limit_remaining ?? null,
      rate_limit_reset: body?.retry_at ?? null,
      error: body?.error ?? `HTTP ${r.status}`,
      code: body?.code,
      status: r.status,
    };
  }
  return body as ListReposResult;
}

// ─── Terminal ───────────────────────────────────────────────────────

export interface SpawnTerminalRequest {
  workspace_id?: string;
  cwd: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export async function spawnTerminalApi(req: SpawnTerminalRequest): Promise<TerminalSession> {
  const res = await fetchJson<{ ok: boolean; error?: string; session?: TerminalSession }>(
    `${ONYX_HTTP}/terminal/spawn`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    },
  );
  if (!res.ok) throw res.error;
  if (!res.data.ok || !res.data.session) throw new AgentApiError(res.data.error ?? 'Spawn failed');
  return res.data.session;
}

export async function stopTerminalApi(id: string): Promise<void> {
  const res = await fetchJson<{ ok?: boolean }>(`${ONYX_HTTP}/terminal/${id}/stop`, { method: 'POST' });
  if (!res.ok) throw res.error;
}

export async function restartTerminalApi(id: string): Promise<TerminalSession> {
  const res = await fetchJson<{ ok: boolean; error?: string; session?: TerminalSession }>(
    `${ONYX_HTTP}/terminal/${id}/restart`,
    { method: 'POST' },
  );
  if (!res.ok) throw res.error;
  if (!res.data.ok || !res.data.session) throw new AgentApiError(res.data.error ?? 'Restart failed');
  return res.data.session;
}

export async function listTerminalsApi(): Promise<TerminalSession[]> {
  const res = await fetchJson<{ terminals?: TerminalSession[] }>(`${ONYX_HTTP}/terminal/list`);
  if (!res.ok) return [];
  return res.data.terminals ?? [];
}

export async function terminalBufferApi(id: string, limit = 600): Promise<{ session: TerminalSession; buffer: TerminalChunk[] } | null> {
  const res = await fetchJson<{
    ok: boolean;
    session: TerminalSession;
    buffer: Array<{ stream: 'stdout' | 'stderr'; data: string; ts: number }>;
  }>(`${ONYX_HTTP}/terminal/${id}/buffer?limit=${limit}`);
  if (!res.ok) return null;
  if (!res.data.ok) return null;
  const buffer: TerminalChunk[] = res.data.buffer.map((b) => ({
    session_id: id,
    stream: b.stream,
    data: b.data,
    ts: b.ts,
  }));
  return { session: res.data.session, buffer };
}
