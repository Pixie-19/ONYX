import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { bus } from '../bus/eventBus.js';
import { writeJsonl } from '../bus/jsonl.js';
import { getWorkspace } from './workspace.js';
import type { GithubCommitRow, WSMessage } from '../types.js';

/**
 * Anonymous GitHub commit indexer.
 *
 * Pulls recent commits from `api.github.com` for public repos — no OAuth in
 * the hackathon build. Workspaces with private remotes can wire a
 * GITHUB_TOKEN through the env later; the request honours
 * `Authorization: Bearer ${GITHUB_TOKEN}` when present.
 */

interface ParsedRemote {
  owner: string;
  repo: string;
}

function parseRemote(remote: string | null | undefined): ParsedRemote | null {
  if (!remote) return null;
  // git@github.com:owner/repo.git OR https://github.com/owner/repo(.git)?
  const ssh = remote.match(/git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  const https = remote.match(/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?\/?$/);
  if (https) return { owner: https[1], repo: https[2] };
  return null;
}

interface CommitPayload {
  sha: string;
  commit: {
    author?: { name?: string; email?: string; date?: string };
    message?: string;
  };
  stats?: { total?: number; additions?: number; deletions?: number };
  files?: Array<{ filename: string; status: string; additions: number; deletions: number }>;
}

async function fetchCommits(owner: string, repo: string, per_page = 30): Promise<CommitPayload[]> {
  const headers: Record<string, string> = { 'accept': 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers['authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${per_page}`, {
    headers,
    // @ts-ignore
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`github api ${r.status}: ${await r.text()}`);
  return (await r.json()) as CommitPayload[];
}

function riskyScore(c: CommitPayload): number {
  // crude heuristic — multi-file lockfile / config / migration commits ranked higher
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

export async function syncRepo(workspaceId: string): Promise<{ ok: true; indexed: number } | { ok: false; error: string }> {
  const ws = getWorkspace(workspaceId);
  if (!ws) return { ok: false, error: 'workspace not found' };
  const parsed = parseRemote(ws.git_remote);
  if (!parsed) return { ok: false, error: 'workspace has no parseable github remote' };

  let commits: CommitPayload[];
  try {
    commits = await fetchCommits(parsed.owner, parsed.repo);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const stmt = db().prepare(`
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
      author: c.commit.author?.name ?? null,
      author_email: c.commit.author?.email ?? null,
      message: (c.commit.message ?? '').split('\n')[0].slice(0, 240),
      ts: c.commit.author?.date ? Date.parse(c.commit.author.date) : Date.now(),
      files_changed: c.files?.length ?? 0,
      additions: c.stats?.additions ?? 0,
      deletions: c.stats?.deletions ?? 0,
      risky_score: riskyScore(c),
      meta_json: JSON.stringify({ owner: parsed.owner, repo: parsed.repo }),
    };
    stmt.run(row);
    writeJsonl('github_commits', row);
    bus.emit('ws', { type: 'github_commit', payload: row } satisfies WSMessage);
    indexed += 1;
  }

  bus.emitReplayEvent({
    kind: 'GITHUB_SYNCED',
    severity: 'info',
    source: 'connector.github',
    target: `${parsed.owner}/${parsed.repo}`,
    payload: { workspace_id: ws.id, indexed },
  });

  return { ok: true, indexed };
}
