'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[ONYX route error]', error);
  }, [error]);

  return (
    <div className="h-full grid place-items-center p-10 surface-base">
      <div className="panel p-8 max-w-[560px] text-center">
        <div className="w-12 h-12 rounded-full mx-auto bg-[#FEF2F2] dark:bg-red-400/15 flex items-center justify-center">
          <AlertTriangle size={20} className="text-[#B91C1C] dark:text-red-300" />
        </div>
        <div className="mt-4 text-[18px] font-semibold text-primary">Something went wrong</div>
        <div className="text-[12.5px] text-secondary mt-1">Route-level exception</div>
        <div className="mt-5 p-3 rounded-md border border-line surface-inset text-left">
          <div className="text-[12px] text-[#B91C1C] dark:text-red-300 font-mono break-words">
            {error.message ?? 'Unknown error'}
          </div>
          {error.digest && (
            <div className="mt-1.5 text-[11px] text-tertiary font-mono">
              Digest · {error.digest}
            </div>
          )}
        </div>
        <button onClick={() => reset()} className="btn btn-primary h-9 px-4 mt-5 text-[12.5px]">
          <RotateCcw size={13} /> Reset route
        </button>
      </div>
    </div>
  );
}
