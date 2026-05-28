// ─────────────────────────────────────────────────────────────────────────────
// Auth.js v5 (next-auth ^5.0.0-beta) — single source of truth for ONYX auth.
//
// In v5, `NextAuth(config)` returns *an object* `{ handlers, auth, signIn,
// signOut }` — not a function. Re-exporting it as { GET, POST } directly
// triggers a runtime "Function.prototype.apply was called on #<Object>"
// crash. The fix is:
//
//     export const { handlers, auth, signIn, signOut } = NextAuth(config)
//     // then in route.ts:  export const { GET, POST } = handlers
//
// We also wrap every callback so a thrown exception or undefined return can
// never produce a malformed JSON response from /api/auth/session.
// ─────────────────────────────────────────────────────────────────────────────

import NextAuth, { type NextAuthConfig, type Session } from 'next-auth';
import GitHub from 'next-auth/providers/github';

// ── env diagnostics (logged once on import; never throw) ────────────────────
const env = {
  GITHUB_ID: process.env.GITHUB_ID ?? process.env.AUTH_GITHUB_ID ?? '',
  GITHUB_SECRET: process.env.GITHUB_SECRET ?? process.env.AUTH_GITHUB_SECRET ?? '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? '',
};

if (process.env.NODE_ENV !== 'production') {
  const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `[onyx/auth] Missing env vars: ${missing.join(', ')} — auth will run in dev-fallback mode.`,
    );
  }
}

// ── provider list (only register GitHub when both id & secret are present) ──
const providers: NextAuthConfig['providers'] = [];
if (env.GITHUB_ID && env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { scope: 'read:user user:email repo read:org' },
      },
    }),
  );
}

// ── safe callback wrappers ─────────────────────────────────────────────────
// In v5, throwing inside a callback returns 500 + HTML (which then breaks
// SessionProvider's JSON parse). Catch everything and return a sensible
// fallback so /api/auth/session always emits valid JSON.
function safeJwt({ token, account, profile }: any) {
  try {
    if (account && profile) {
      token.accessToken = account.access_token ?? null;
      token.githubLogin = (profile as any).login ?? null;
      token.githubId = (profile as any).id ?? null;
      token.avatar_url = (profile as any).avatar_url ?? null;
      token.html_url = (profile as any).html_url ?? null;
    }
    return token ?? {};
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[onyx/auth] jwt callback failed:', err);
    }
    return token ?? {};
  }
}

function safeSession({ session, token }: any): Session {
  try {
    const safe: Session = session ?? ({ user: {}, expires: new Date(Date.now() + 30 * 86400_000).toISOString() } as Session);
    if (!safe.user) (safe as any).user = {};
    const u: any = safe.user;
    u.github_login = token?.githubLogin ?? null;
    u.github_id = token?.githubId ?? null;
    u.github_avatar_url = token?.avatar_url ?? null;
    u.github_html_url = token?.html_url ?? null;
    // We expose the access token *only* server-side; never to the browser.
    if (typeof window === 'undefined') {
      u.github_access_token = token?.accessToken ?? null;
    } else {
      u.github_access_token = null;
    }
    return safe;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[onyx/auth] session callback failed:', err);
    }
    return session ?? ({ user: {}, expires: new Date(Date.now() + 86400_000).toISOString() } as Session);
  }
}

export const authConfig: NextAuthConfig = {
  providers,
  trustHost: true,
  secret: env.NEXTAUTH_SECRET || 'onyx-dev-fallback-secret-do-not-use-in-prod',
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    jwt: safeJwt,
    session: safeSession,
    async signIn() {
      return true;
    },
    async redirect({ url, baseUrl }) {
      try {
        if (url.startsWith('/')) return `${baseUrl}${url}`;
        if (new URL(url).origin === baseUrl) return url;
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
  },
  events: {
    async signIn({ user, account }) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log(`[onyx/auth] signIn: ${user?.email ?? user?.name ?? '?'} via ${account?.provider ?? '?'}`);
      }
    },
  },
  debug: false, // keep off — debug emits to stderr and confuses Next's logger
};

// `NextAuth(...)` returns an object — destructure the bits we need.
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
