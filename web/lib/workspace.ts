import { ONYX_HTTP } from './format';
import type { WorkspaceRow } from './types';

export interface ConnectRequest {
  path: string;
  name?: string;
  mode?: 'real' | 'demo';
}

export async function connectWorkspaceApi(req: ConnectRequest): Promise<WorkspaceRow> {
  const r = await fetch(`${ONYX_HTTP}/workspace/connect`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  });
  const body = await r.json();
  if (!r.ok || !body.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
  return body.workspace as WorkspaceRow;
}

export async function detachWorkspaceApi(id: string): Promise<void> {
  const r = await fetch(`${ONYX_HTTP}/workspace/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export async function rescanWorkspaceApi(id: string): Promise<WorkspaceRow> {
  const r = await fetch(`${ONYX_HTTP}/workspace/${id}/scan`, { method: 'POST' });
  const body = await r.json();
  if (!r.ok || !body.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
  return body.workspace as WorkspaceRow;
}

export async function ensureDemoWorkspaceApi(): Promise<WorkspaceRow | null> {
  const r = await fetch(`${ONYX_HTTP}/workspace/demo`, { method: 'POST' });
  const body = await r.json();
  if (!body.ok) return null;
  return body.workspace as WorkspaceRow;
}

export async function listWorkspacesApi(): Promise<WorkspaceRow[]> {
  const r = await fetch(`${ONYX_HTTP}/workspace/list`);
  const body = await r.json();
  return (body.workspaces ?? []) as WorkspaceRow[];
}

export async function syncGithubApi(workspace_id: string): Promise<{ ok: boolean; indexed?: number; error?: string }> {
  const r = await fetch(`${ONYX_HTTP}/github/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspace_id }),
  });
  return r.json();
}

export async function spawnTerminalApi(req: { workspace_id?: string; cwd: string; command: string; args?: string[] }) {
  const r = await fetch(`${ONYX_HTTP}/terminal/spawn`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  });
  const body = await r.json();
  if (!r.ok || !body.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
  return body.session;
}

export async function stopTerminalApi(id: string): Promise<void> {
  const r = await fetch(`${ONYX_HTTP}/terminal/${id}/stop`, { method: 'POST' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}
