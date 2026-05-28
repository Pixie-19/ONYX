'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

const ERROR_DETAILS: Record<string, { title: string; detail: string }> = {
  Configuration: {
    title: 'Auth misconfigured',
    detail: 'GITHUB_ID / GITHUB_SECRET / NEXTAUTH_SECRET are missing or invalid. Check the server env.',
  },
  AccessDenied: {
    title: 'Access denied',
    detail: 'You denied the OAuth consent prompt. To continue, retry sign-in and accept the permissions.',
  },
  Verification: {
    title: 'Verification failed',
    detail: 'The sign-in link expired or was already used. Try again.',
  },
  OAuthCallback: {
    title: 'OAuth callback failed',
    detail: 'GitHub rejected the redirect URI. The OAuth app callback URL must exactly match NEXTAUTH_URL/api/auth/callback/github.',
  },
  OAuthSignin: {
    title: 'OAuth start failed',
    detail: 'Could not initiate the GitHub authorization flow. Verify network access from the cockpit host to github.com.',
  },
  Default: {
    title: 'Sign-in error',
    detail: 'An unexpected error occurred during sign-in. Open the agent logs for details.',
  },
};

function ErrorInner() {
  const params = useSearchParams();
  const code = params.get('error') ?? 'Default';
  const info = ERROR_DETAILS[code] ?? ERROR_DETAILS.Default;

  return (
    <div className="min-h-screen flex items-center justify-center surface-base p-6">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface-raised shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <div className="w-12 h-12 rounded-lg bg-[#FEF2F2] dark:bg-red-500/15 flex items-center justify-center mb-4">
            <AlertTriangle size={20} className="text-[#B91C1C] dark:text-red-200" />
          </div>
          <h1 className="text-lg font-semibold text-primary tracking-tight">{info.title}</h1>
          <p className="text-[12.5px] text-tertiary mt-1 leading-relaxed">{info.detail}</p>

          <div className="mt-4 p-3 rounded-lg bg-surface-sunken border border-line">
            <p className="text-[10.5px] text-tertiary uppercase tracking-tight font-medium mb-1">Error code</p>
            <code className="font-mono text-[12px] text-primary">{code}</code>
          </div>

          <div className="mt-6 flex gap-2">
            <Link
              href="/auth/signin"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#4338CA] text-white text-[13px] font-medium hover:bg-[#4338CA]/90 transition"
            >
              Try again
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-line text-secondary text-[13px] font-medium hover:bg-surface-sunken transition"
            >
              <ArrowLeft size={13} />
              Cockpit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen surface-base" />}>
      <ErrorInner />
    </Suspense>
  );
}
