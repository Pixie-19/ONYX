import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { CockpitShell } from '@/components/CockpitShell';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ONYX · Execution Intelligence Infrastructure',
  description:
    'Autonomous execution intelligence infrastructure — a relational cognition platform for software execution.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#F7F8FA',
  width: 'device-width',
  initialScale: 1,
};

// ONYX is a realtime websocket-driven cockpit — static prerendering is
// pointless (every panel depends on live state). Force every route to
// render at request time so the build never tries to serialise the
// pre-hydration shell.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <CockpitShell>{children}</CockpitShell>
      </body>
    </html>
  );
}
