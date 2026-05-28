'use client';
import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Github, Loader, Shield, AlertCircle } from 'lucide-react';

function SignInInner() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/';
  const errorParam = params.get('error');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('github', { callbackUrl });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center surface-base p-6">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface-raised shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <div className="w-12 h-12 rounded-lg bg-surface-sunken flex items-center justify-center mb-4">
            <Shield size={20} />
          </div>
          <h1 className="text-lg font-semibold text-primary tracking-tight">Sign in to ONYX</h1>
          <p className="text-[12.5px] text-tertiary mt-1">
            Authenticate with GitHub to attach your identity to the live execution stream.
          </p>

          {errorParam && (
            <div className="mt-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] text-[12px] font-medium flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>
                {errorParam === 'OAuthCallback' && 'GitHub rejected the callback. Verify the OAuth app callback URL matches NEXTAUTH_URL.'}
                {errorParam === 'AccessDenied' && 'Access denied. Permission was not granted.'}
                {errorParam === 'Configuration' && 'Auth is misconfigured. Check GITHUB_ID, GITHUB_SECRET, NEXTAUTH_SECRET.'}
                {!['OAuthCallback','AccessDenied','Configuration'].includes(errorParam) && `Sign-in error: ${errorParam}`}
              </span>
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#24292F] text-white text-[13px] font-medium hover:bg-[#1F2328] transition disabled:opacity-50"
          >
            {loading ? <Loader size={14} className="animate-spin" /> : <Github size={14} />}
            {loading ? 'Redirecting…' : 'Continue with GitHub'}
          </button>

          <p className="text-[11px] text-tertiary mt-4 leading-relaxed">
            ONYX requests <code className="font-mono text-[10.5px] px-1 py-0.5 bg-surface-sunken rounded">read:user</code>, <code className="font-mono text-[10.5px] px-1 py-0.5 bg-surface-sunken rounded">user:email</code>, <code className="font-mono text-[10.5px] px-1 py-0.5 bg-surface-sunken rounded">repo</code>, and <code className="font-mono text-[10.5px] px-1 py-0.5 bg-surface-sunken rounded">read:org</code> scopes for repository introspection. Tokens are stored server-side only.
          </p>
        </div>
        <div className="px-6 py-3 border-t border-line bg-surface-sunken text-[11px] text-tertiary text-center">
          ONYX · Execution Intelligence Infrastructure
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen surface-base" />}>
      <SignInInner />
    </Suspense>
  );
}
