'use client';

import { LandingPage } from '@/components/landing/LandingPage';

/**
 * Root route — marketing / landing page.
 * The dashboard lives under /overview and sibling routes;
 * the CockpitShell is skipped for this path (see AppShell).
 */
export default function HomePage() {
  return <LandingPage />;
}
