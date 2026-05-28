// /api/github/repositories
//
// Lists the authenticated user's GitHub repositories so the cockpit can show
// a Linear/Vercel-style picker. The session's GitHub access token is read
// server-side only — the browser never receives it.
//
// Query params:
//   - search?: string     case-insensitive name/full_name/description filter
//   - page?:   number     1-based page index (default 1)
//   - per_page?: number   1..100 (default 30)
//   - sort?:   'updated' | 'pushed' | 'created' | 'full_name'
//   - affiliation?: string (default: 'owner,collaborator,organization_member')
//
// Returns a normalised, browser-safe payload. Any GitHub API error is
// surfaced as a non-200 response with a JSON `{ error }` body so the client
// can render a clean error state.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface GithubRepoRaw {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  default_branch: string | null;
  pushed_at: string | null;
  updated_at: string | null;
  archived: boolean;
  disabled: boolean;
  visibility: 'public' | 'private' | 'internal';
  clone_url: string;
  ssh_url: string;
  topics?: string[];
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
    type: string;
  };
}

export interface NormalizedRepo {
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
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
    type: string;
  };
}

function toMs(d: string | null): number | null {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : null;
}

function normalize(r: GithubRepoRaw): NormalizedRepo {
  return {
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    private: !!r.private,
    html_url: r.html_url,
    clone_url: r.clone_url,
    ssh_url: r.ssh_url,
    description: r.description,
    language: r.language,
    default_branch: r.default_branch,
    stargazers_count: r.stargazers_count ?? 0,
    forks_count: r.forks_count ?? 0,
    open_issues_count: r.open_issues_count ?? 0,
    pushed_at: toMs(r.pushed_at),
    updated_at: toMs(r.updated_at),
    archived: !!r.archived,
    fork: !!r.fork,
    visibility: (r.visibility ?? (r.private ? 'private' : 'public')) as NormalizedRepo['visibility'],
    topics: Array.isArray(r.topics) ? r.topics.slice(0, 8) : [],
    owner: {
      login: r.owner?.login ?? 'unknown',
      avatar_url: r.owner?.avatar_url ?? '',
      html_url: r.owner?.html_url ?? '',
      type: r.owner?.type ?? 'User',
    },
  };
}

export async function GET(req: Request) {
  // Session lives in the JWT cookie; reading it server-side avoids exposing
  // the access token to the client.
  const session = await auth().catch(() => null);
  const token = (session?.user as any)?.github_access_token as string | undefined | null;
  const login = (session?.user as any)?.github_login as string | undefined | null;

  if (!session || !token) {
    return NextResponse.json(
      { error: 'unauthenticated', code: 'AUTH_REQUIRED', repositories: [] },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const search = (url.searchParams.get('search') ?? '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
  const perPageRaw = Number(url.searchParams.get('per_page') ?? '30') || 30;
  const per_page = Math.min(100, Math.max(1, perPageRaw));
  const sort = (url.searchParams.get('sort') ?? 'updated') as 'updated' | 'pushed' | 'created' | 'full_name';
  const affiliation =
    url.searchParams.get('affiliation') ?? 'owner,collaborator,organization_member';

  // The /user/repos endpoint covers public + private repos with `repo` scope.
  // Use server-side search filtering when a search string is supplied so we
  // don't paginate through the entire account just to satisfy a substring.
  const ghParams = new URLSearchParams({
    per_page: String(per_page),
    page: String(page),
    sort,
    direction: 'desc',
    affiliation,
  });

  let endpoint = `https://api.github.com/user/repos?${ghParams.toString()}`;
  if (search) {
    // GitHub's repo search needs a different endpoint shape and includes
    // private repos when the token grants `repo` scope.
    const q = login ? `${search} in:name,description user:${login}` : `${search} in:name,description`;
    const searchParams = new URLSearchParams({
      q,
      per_page: String(per_page),
      page: String(page),
      sort: sort === 'full_name' ? 'updated' : sort,
      order: 'desc',
    });
    endpoint = `https://api.github.com/search/repositories?${searchParams.toString()}`;
  }

  let r: Response;
  try {
    r = await fetch(endpoint, {
      method: 'GET',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        'user-agent': 'onyx-cockpit/0.1',
      },
      // Surface explicit timeouts so a hung GitHub call doesn't tie up the route.
      signal: AbortSignal.timeout(10_000),
      // Caching is intentionally disabled — repo list is per-user state.
      cache: 'no-store',
    });
  } catch (err) {
    return NextResponse.json(
      { error: `network: ${(err as Error).message}`, code: 'NETWORK', repositories: [] },
      { status: 502 },
    );
  }

  const remaining = Number(r.headers.get('x-ratelimit-remaining') ?? NaN);
  const resetEpoch = Number(r.headers.get('x-ratelimit-reset') ?? NaN);

  if (r.status === 401 || r.status === 403) {
    // Distinguish rate-limited from token-rejected.
    if (Number.isFinite(remaining) && remaining === 0 && Number.isFinite(resetEpoch)) {
      return NextResponse.json(
        {
          error: 'github rate limit exceeded',
          code: 'RATE_LIMITED',
          retry_at: resetEpoch * 1000,
          repositories: [],
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: 'github rejected the access token', code: 'TOKEN_INVALID', repositories: [] },
      { status: r.status },
    );
  }

  if (!r.ok) {
    const body = await r.text().catch(() => '');
    return NextResponse.json(
      { error: `github ${r.status}: ${body.slice(0, 200)}`, code: 'GITHUB_ERROR', repositories: [] },
      { status: r.status },
    );
  }

  const json = await r.json().catch(() => null);
  const list: GithubRepoRaw[] = search
    ? (Array.isArray((json as any)?.items) ? (json as any).items : [])
    : Array.isArray(json) ? json : [];

  // Link header drives pagination — convert it into a simple `has_next` flag.
  const linkHeader = r.headers.get('link') ?? '';
  const hasNext = /rel="next"/.test(linkHeader);
  const totalCount: number | null = search && typeof (json as any)?.total_count === 'number'
    ? (json as any).total_count
    : null;

  const repositories = list.map(normalize);

  return NextResponse.json({
    repositories,
    page,
    per_page,
    has_next: hasNext || (totalCount !== null && page * per_page < totalCount),
    total_count: totalCount,
    rate_limit_remaining: Number.isFinite(remaining) ? remaining : null,
    rate_limit_reset: Number.isFinite(resetEpoch) ? resetEpoch * 1000 : null,
    user: {
      login: (session.user as any)?.github_login ?? null,
      avatar_url: (session.user as any)?.github_avatar_url ?? null,
    },
  });
}
