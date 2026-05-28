'use client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useOnyx } from '@/lib/store';

/**
 * Mirrors NextAuth session → Zustand auth/github stores.
 *
 * Defensive against:
 *  - session === undefined while the v5 client is hydrating
 *  - session.user being null/undefined
 *  - the `/api/auth/session` route transiently failing (status === 'unauthenticated' after error)
 */
export function useAuthSync(): void {
  const session = useSession();
  const setAuthSession = useOnyx((s) => s.setAuthSession);
  const setGithubConnection = useOnyx((s) => s.setGithubConnection);
  const lastSig = useRef<string>('');

  useEffect(() => {
    if (session.status === 'loading') return;

    const data = session.data;
    const u: any = data?.user ?? null;
    const sig = u
      ? `${u.email ?? ''}|${u.github_login ?? ''}|${u.github_avatar_url ?? ''}`
      : 'anon';

    // Skip redundant updates — keeps the store stable and avoids
    // re-renders on every focus tick.
    if (sig === lastSig.current) return;
    lastSig.current = sig;

    if (u) {
      setAuthSession({
        user: {
          id: u.email || u.github_login || 'unknown',
          name: u.name || u.github_login || 'User',
          email: u.email ?? null,
          github_login: u.github_login ?? null,
          github_avatar_url: u.github_avatar_url ?? u.image ?? null,
          created_at: Date.now(),
          theme: 'system',
          notifications_enabled: true,
          ai_provider: 'mistral',
          ai_routing_enabled: true,
          telemetry_enabled: true,
        },
        // Access token is stripped from the client session for safety —
        // we only mark presence here; real fetches go through the agent.
        github_access_token: null,
        github_token_expires_at: null,
        authenticated: true,
      });

      if (u.github_login) {
        setGithubConnection({
          connected: true,
          login: u.github_login,
          avatar_url: u.github_avatar_url ?? u.image ?? null,
          repos_synced: 0,
          last_sync_at: null,
          quota_remaining: null,
        });
      }
    } else {
      setAuthSession(null);
      setGithubConnection({
        connected: false,
        login: null,
        avatar_url: null,
        repos_synced: 0,
        last_sync_at: null,
        quota_remaining: null,
      });
    }
  }, [session.status, session.data, setAuthSession, setGithubConnection]);
}
