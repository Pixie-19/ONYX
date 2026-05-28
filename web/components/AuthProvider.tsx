'use client';
import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';

/**
 * SessionProvider host.
 *
 * - `refetchOnWindowFocus={false}` prevents the focus-refetch loop that, if
 *   the session route ever returns a 500, would hammer the endpoint forever.
 * - `refetchInterval={0}` disables auto-polling — we only need the session at
 *   mount and after explicit signIn/signOut.
 * - `basePath="/api/auth"` is the default and explicit here so that any
 *   future route group changes don't silently break the client.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      basePath="/api/auth"
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      {children}
    </SessionProvider>
  );
}
