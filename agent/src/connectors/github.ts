import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { bus } from '../bus/eventBus.js';
import { writeJsonl } from '../bus/jsonl.js';
import { config } from '../config.js';
import { getWorkspace } from './workspace.js';
import type { GithubCommitRow, WSMessage } from '../types.js';

/**
 * GitHub Repository Integration.
 *
 * Server-side connector that fetches and indexes:
 *   • commit history (per workspace remote)
 *   • repository metadata (default branch, language, topics, stars)
 *   • branches
 *   • contributors
 *   • recent pull requests
 *
 * Authentication: a Personal Access Token (classic or fine-grained) can be
 * supplied either through the GITHUB_TOKEN env var or registered at runtime
 * via POST /github/auth/token. Tokens are kept in-memory and persisted to
 * `agent/data/.github-token.json` (gitignored, chmod 600 where supported)
 * — they are NEVER returned to the client.
 *
 * Device Flow scaffolding is included for future OAuth-App deployments.
 *
 * All sync activity is broadcast over the websocket as `github_sync_status`
 * messages so the cockpit can render live progress, retry handling, and
 * rate-limit warnings.
 */

// ──────────── Token store ────────────
interface TokenRecord {
  token: string;
  scope: string | null;
  label: string | null;
  registered_at: number;
}

const TOKEN_FILE = path.join(config.paths.agentRoot, 'data', '.github-token.json');

let runtimeToken: TokenRecord | null = null;

function loadPersistedToken(): void {
  try {
    if (!existsSync(TOKEN_FILE)) return;
    const raw = readFileSync(TOKEN_FILE, 'utf8');
    const parsed = JSON.parse(raw) as TokenRecord;
    if (parsed?.token) runtimeToken = parsed;
  } catch {
    /* ignore — bad file, treat as no-token */
  }
}
loadPersistedToken();

function persistToken(rec: TokenRecord | null): void {
  try {
    mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    if (rec === null) {
      try { writeFileSync(TOKEN_FILE, JSON.stringify({}), { encoding: 'utf8', mode: 0o600 }); } catch { /* ignore */ }
      return;
    }
    writeFileSync(TOKEN_FILE, JSON.stringify(rec), { encoding: 'utf8', mode: 0o600 });
    try { chmodSync(TOKEN_FILE, 0o600); } catch { /* posix-only */ }
  } catch {
    /* persistence is best-effort */
  }
}

function currentToken(): string | null {
  if (runtimeToken?.token) return runtimeToken.token;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  return null;
}

export function registerToken(token: string, label?: string): { ok: true; label: string | null } | { ok: false; error: string } {
  const t = (token ?? '').trim();
  // basic shape validation — github tokens are ASCII printable, no whitespace,
  // and never contain shell metacharacters; reject anything else outright.
  if (!t) return { ok: false, error: 'token is required' };
  if (t.length > 200) return { ok: false, error: 'token is too long' };
  if (/[\s\x00-\x1f]/.test(t)) return { ok: false, error: 'token contains invalid characters' };
  if (!/^[A-Za-z0-9_]{8,}$/.test(t.replace(/^github_pat_/, ''))) {
    // soft-warn — github tokens are typically `ghp_…`, `ghs_…`, `github_pat_…`
    // We allow any printable token, but reject obviously bogus shapes.
    if (!/^[\w.\-]+$/.test(t)) return { ok: false, error: 'token has unexpected shape' };
  }
  runtimeToken = {
    token: t,
    scope: null,
    label: label?.trim() || null,
    registered_at: Date.now(),
  };
  persistToken(runtimeToken);
  bus.emitReplayEvent({
    kind: 'GITHUB_SYNCED',
    severity: 'info',
    source: 'connector.github.auth',
    target: 'token.registered',
    payload: { label: runtimeToken.label, has_token: true },
  });
  return { ok: true, label: runtimeToken.label };
}

export function clearToken(): void {
  runtimeToken = null;
  persistToken(null);
}

export function authStatus(): {
  configured: boolean;
  source: 'runtime' | 'env' | 'none';
  label: string | null;
  registered_at: number | null;
} {
  if (runtimeToken?.token) {
    return { configured: true, source: 'runtime', label: runtimeToken.label, registered_at: runtimeToken.registered_at };
  }
  if (process.env.GITHUB_TOKEN) {
    return { configured: true, source: 'env', label: 'GITHUB_TOKEN env', registered_at: null };
  }
  return { configured: false, source: 'none', label: null, registered_at: null };
}

// ──────────── Remote parsing ────────────
interface ParsedRemote {
  owner: string;
  repo: string;
}

function parseRemote(remote: string | null | undefined): ParsedRemote | null {
  if (!remote) return null;
  // git@github.com:owner/repo.git OR https://github.com/owner/repo(.git)?
  const ssh = remote.match(/git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  const https = remote.match(/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?\/?$/);
  if (https) return { owner: https[1], repo: https[2] };
  return null;
}

// ──────────── HTTP helper with retry + rate-limit awareness ────────────
async function gh(
  endpoint: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: any; remaining: number | null } | { ok: false; status: number; error: string; rate_limited: boolean; retry_after_ms: number }> {
  const headers: Record<string, string> = {
    'accept': 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'onyx-agent/0.1',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const token = currentToken();
  if (token) headers['authorization'] = `Bearer ${token}`;

  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const r = await fetch(`https://api.github.com${endpoint}`, {
        ...init,
        headers,
        // @ts-ignore — Node 20 supports AbortSignal.timeout
        signal: AbortSignal.timeout(8000),
      });
      const remaining = Number(r.headers.get('x-ratelimit-remaining') ?? NaN);
      if (r.status === 403 || r.status === 429) {
        const reset = Number(r.headers.get('x-ratelimit-reset') ?? 0) * 1000;
        const retryAfter = Math.max(0, reset - Date.now());
        return { ok: false, status: r.status, error: 'rate limit exceeded', rate_limited: true, retry_after_ms: retryAfter };
      }
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        return { ok: false, status: r.status, error: `${r.status} ${r.statusText}: ${body.slice(0, 200)}`, rate_limited: false, retry_after_ms: 0 };
      }
      const data = await r.json();
      return { ok: true, data, remaining: Number.isFinite(remaining) ? remaining : null };
    } catch (err) {
      lastErr = (err as Error).message;
      // linear backoff
      await new Promise((res) => setTimeout(res, 300 * (attempt + 1)));
    }
  }
  return { ok: false, status: 0, error: lastErr || 'network failure', rate_limited: false, retry_after_ms: 0 };
}

// ──────────── Payload shapes ────────────
interface CommitPayload {
  sha: string;
  commit: { author?: { name?: string; email?: string; date?: string }; message?: string };
  stats?: { total?: number; additions?: number; deletions?: number };
  files?: Array<{ filename: string; status: string; additions: number; deletions: number }>;
  author?: { login?: string; avatar_url?: string } | null;
}

interface RepoMeta {
  description: string | null;
  default_branch: string | null;
  language: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  topics: string[];
  html_url: string | null;
  pushed_at: number | null;
}

interface BranchInfo {
  name: string;
  sha: string;
  protected: boolean;
}

interface ContributorInfo {
  login: string;
  contributions: number;
  avatar_url: string | null;
  html_url: string | null;
}

interface PullInfo {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  user: string | null;
  created_at: number;
  updated_at: number;
  merged: boolean;
}

export interface GithubSyncStatus {
  workspace_id: string;
  owner: string;
  repo: string;
  state: 'idle' | 'syncing' | 'ok' | 'error' | 'rate_limited';
  last_synced_at: number | null;
  commits: number;
  branches: number;
  contributors: number;
  pulls: number;
  repo_meta: RepoMeta | null;
  branches_list: BranchInfo[];
  contributors_list: ContributorInfo[];
  pulls_list: PullInfo[];
  remaining_quota: number | null;
  error: string | null;
}

// ──────────── In-memory sync status registry ────────────
const STATUS = new Map<string, GithubSyncStatus>();

function persistStatus(status: GithubSyncStatus): void {
  try {
    db().prepare(`
      INSERT INTO github_sync_runs (id, ts, workspace_id, owner, repo, state, last_synced_at,
        commits, contributors, branches, pulls, remaining_quota, error, meta_json)
      VALUES (@id, @ts, @workspace_id, @owner, @repo, @state, @last_synced_at,
        @commits, @contributors, @branches, @pulls, @remaining_quota, @error, @meta_json)
    `).run({
      id: nanoid(),
      ts: Date.now(),
      workspace_id: status.workspace_id,
      owner: status.owner,
      repo: status.repo,
      state: status.state,
      last_synced_at: status.last_synced_at,
      commits: status.commits,
      contributors: status.contributors,
      branches: status.branches,
      pulls: status.pulls,
      remaining_quota: status.remaining_quota,
      error: status.error,
      meta_json: '{}',
    });
  } catch {
    // Persistence is best-effort — never block live broadcast on a DB write.
  }
}

function broadcastStatus(status: GithubSyncStatus): void {
  STATUS.set(status.workspace_id, status);
  persistStatus(status);
  bus.emit('ws', { type: 'github_sync_status', payload: status } satisfies WSMessage);
}

export function getSyncStatus(workspaceId: string): GithubSyncStatus | null {
  return STATUS.get(workspaceId) ?? null;
}

export function listSyncStatuses(): GithubSyncStatus[] {
  return [...STATUS.values()];
}

// ──────────── Risky-commit heuristic (unchanged from prior build) ────────────
function riskyScore(c: CommitPayload): number {
  const msg = (c.commit.message ?? '').toLowerCase();
  const files = (c.files ?? []).map((f) => f.filename);
  let s = 0;
  if (files.some((f) => /package-lock|pnpm-lock|yarn\.lock|bun\.lockb|poetry\.lock/i.test(f))) s += 0.25;
  if (files.some((f) => /migration|schema|model/i.test(f))) s += 0.2;
  if (files.some((f) => /\.env|secret|key/i.test(f))) s += 0.15;
  if (/wip|fixme|todo|hack/i.test(msg)) s += 0.1;
  if (/revert|hotfix|rollback/i.test(msg)) s += 0.25;
  if ((c.stats?.total ?? 0) > 800) s += 0.2;
  return Math.min(1, s);
}

// ──────────── Sync orchestration ────────────
export async function syncRepo(
  workspaceId: string,
): Promise<{ ok: true; indexed: number; status: GithubSyncStatus } | { ok: false; error: string; status?: GithubSyncStatus }> {
  const ws = getWorkspace(workspaceId);
  if (!ws) return { ok: false, error: 'workspace not found' };
  const parsed = parseRemote(ws.git_remote);
  if (!parsed) return { ok: false, error: 'workspace has no parseable github remote' };

  const baseStatus: GithubSyncStatus = STATUS.get(workspaceId) ?? {
    workspace_id: workspaceId,
    owner: parsed.owner,
    repo: parsed.repo,
    state: 'idle',
    last_synced_at: null,
    commits: 0,
    branches: 0,
    contributors: 0,
    pulls: 0,
    repo_meta: null,
    branches_list: [],
    contributors_list: [],
    pulls_list: [],
    remaining_quota: null,
    error: null,
  };

  const status: GithubSyncStatus = { ...baseStatus, state: 'syncing', owner: parsed.owner, repo: parsed.repo, error: null };
  broadcastStatus(status);

  // ── 1. repo metadata ──
  const meta = await gh(`/repos/${parsed.owner}/${parsed.repo}`);
  if (!meta.ok) {
    const failed: GithubSyncStatus = {
      ...status,
      state: meta.rate_limited ? 'rate_limited' : 'error',
      error: meta.error,
    };
    broadcastStatus(failed);
    return { ok: false, error: meta.error, status: failed };
  }
  status.remaining_quota = meta.remaining;
  status.repo_meta = {
    description: meta.data.description ?? null,
    default_branch: meta.data.default_branch ?? null,
    language: meta.data.language ?? null,
    stars: Number(meta.data.stargazers_count ?? 0),
    forks: Number(meta.data.forks_count ?? 0),
    open_issues: Number(meta.data.open_issues_count ?? 0),
    topics: Array.isArray(meta.data.topics) ? meta.data.topics.slice(0, 12) : [],
    html_url: meta.data.html_url ?? null,
    pushed_at: meta.data.pushed_at ? Date.parse(meta.data.pushed_at) : null,
  };
  broadcastStatus({ ...status });

  // ── 2. commits ──
  const commitsRes = await gh(`/repos/${parsed.owner}/${parsed.repo}/commits?per_page=40`);
  if (!commitsRes.ok) {
    const failed: GithubSyncStatus = {
      ...status,
      state: commitsRes.rate_limited ? 'rate_limited' : 'error',
      error: commitsRes.error,
    };
    broadcastStatus(failed);
    return { ok: false, error: commitsRes.error, status: failed };
  }
  status.remaining_quota = commitsRes.remaining;

  const commits = commitsRes.data as CommitPayload[];
  const insertStmt = db().prepare(`
    INSERT INTO github_commits
      (id, workspace_id, sha, short_sha, author, author_email, message, ts,
       files_changed, additions, deletions, risky_score, meta_json)
    VALUES (@id,@workspace_id,@sha,@short_sha,@author,@author_email,@message,@ts,
            @files_changed,@additions,@deletions,@risky_score,@meta_json)
    ON CONFLICT(workspace_id, sha) DO UPDATE SET
      risky_score = excluded.risky_score,
      files_changed = excluded.files_changed,
      additions = excluded.additions,
      deletions = excluded.deletions
  `);

  let indexed = 0;
  for (const c of commits) {
    const row: GithubCommitRow = {
      id: `gc_${nanoid(10)}`,
      workspace_id: ws.id,
      sha: c.sha,
      short_sha: c.sha.slice(0, 7),
      author: c.commit.author?.name ?? c.author?.login ?? null,
      author_email: c.commit.author?.email ?? null,
      message: (c.commit.message ?? '').split('\n')[0].slice(0, 240),
      ts: c.commit.author?.date ? Date.parse(c.commit.author.date) : Date.now(),
      files_changed: c.files?.length ?? 0,
      additions: c.stats?.additions ?? 0,
      deletions: c.stats?.deletions ?? 0,
      risky_score: riskyScore(c),
      meta_json: JSON.stringify({
        owner: parsed.owner,
        repo: parsed.repo,
        author_login: c.author?.login ?? null,
        avatar_url: c.author?.avatar_url ?? null,
      }),
    };
    insertStmt.run(row);
    writeJsonl('github_commits', row);
    bus.emit('ws', { type: 'github_commit', payload: row } satisfies WSMessage);
    indexed += 1;
  }
  status.commits = indexed;
  broadcastStatus({ ...status });

  // ── 3. branches ──
  const branchesRes = await gh(`/repos/${parsed.owner}/${parsed.repo}/branches?per_page=30`);
  if (branchesRes.ok) {
    status.remaining_quota = branchesRes.remaining;
    status.branches_list = (branchesRes.data as any[]).map((b) => ({
      name: String(b.name),
      sha: String(b.commit?.sha ?? '').slice(0, 40),
      protected: Boolean(b.protected),
    }));
    status.branches = status.branches_list.length;
    broadcastStatus({ ...status });
  }

  // ── 4. contributors ──
  const contributorsRes = await gh(`/repos/${parsed.owner}/${parsed.repo}/contributors?per_page=30`);
  if (contributorsRes.ok) {
    status.remaining_quota = contributorsRes.remaining;
    const list = Array.isArray(contributorsRes.data) ? contributorsRes.data : [];
    status.contributors_list = list.map((c: any) => ({
      login: String(c.login ?? 'unknown'),
      contributions: Number(c.contributions ?? 0),
      avatar_url: c.avatar_url ?? null,
      html_url: c.html_url ?? null,
    }));
    status.contributors = status.contributors_list.length;
    broadcastStatus({ ...status });
  }

  // ── 5. pull requests ──
  const pullsRes = await gh(`/repos/${parsed.owner}/${parsed.repo}/pulls?state=all&per_page=20&sort=updated&direction=desc`);
  if (pullsRes.ok) {
    status.remaining_quota = pullsRes.remaining;
    const list = Array.isArray(pullsRes.data) ? pullsRes.data : [];
    status.pulls_list = list.map((p: any) => ({
      number: Number(p.number),
      title: String(p.title ?? '').slice(0, 200),
      state: (p.merged_at ? 'merged' : (p.state ?? 'closed')) as PullInfo['state'],
      user: p.user?.login ?? null,
      created_at: p.created_at ? Date.parse(p.created_at) : 0,
      updated_at: p.updated_at ? Date.parse(p.updated_at) : 0,
      merged: Boolean(p.merged_at),
    }));
    status.pulls = status.pulls_list.length;
    broadcastStatus({ ...status });
  }

  status.state = 'ok';
  status.last_synced_at = Date.now();
  status.error = null;
  broadcastStatus({ ...status });

  bus.emitReplayEvent({
    kind: 'GITHUB_SYNCED',
    severity: 'info',
    source: 'connector.github',
    target: `${parsed.owner}/${parsed.repo}`,
    payload: {
      workspace_id: ws.id,
      indexed,
      branches: status.branches,
      contributors: status.contributors,
      pulls: status.pulls,
      remaining_quota: status.remaining_quota,
    },
  });

  return { ok: true, indexed, status };
}

// ──────────── Device Flow (OAuth App) ────────────
// Scaffolded — activates when GITHUB_CLIENT_ID is configured.

interface DeviceFlowSession {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_at: number;
}

export async function deviceFlowStart(): Promise<
  | { ok: true; session: Omit<DeviceFlowSession, 'device_code'> & { device_code_short: string } }
  | { ok: false; error: string }
> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return { ok: false, error: 'GITHUB_CLIENT_ID not configured — register a Personal Access Token instead' };
  }
  try {
    const r = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId, scope: 'repo read:user' }),
      // @ts-ignore
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return { ok: false, error: `device flow start ${r.status}` };
    const data = (await r.json()) as any;
    return {
      ok: true,
      session: {
        device_code_short: String(data.device_code).slice(0, 8) + '…',
        user_code: String(data.user_code),
        verification_uri: String(data.verification_uri ?? 'https://github.com/login/device'),
        interval: Number(data.interval ?? 5),
        expires_at: Date.now() + Number(data.expires_in ?? 900) * 1000,
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
