'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { CockpitShell } from '@/components/CockpitShell';

/**
 * AppShell — route-aware layout switcher.
 *
 * "/" renders children directly (the marketing landing page) without
 * any dashboard chrome.  Every other route gets the full CockpitShell
 * (sidebar, header, websocket bridge, overlays, etc.).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Landing / marketing page — no dashboard shell
  if (pathname === '/') {
    return <>{children}</>;
  }

  // All other routes — full cockpit dashboard
  return <CockpitShell>{children}</CockpitShell>;
}
