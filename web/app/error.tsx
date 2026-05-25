'use client';

import { useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[ONYX route error]', error);
  }, [error]);

  return (
    <div className="h-full grid place-items-center p-10">
      <div className="panel p-6 max-w-[560px] text-center relative">
        <span className="bracket-top-l" />
        <span className="bracket-top-r" />
        <span className="bracket-bot-l" />
        <span className="bracket-bot-r" />
        <div className="font-display text-[24px] tracking-[0.32em] text-signal-error glow-err">FAULT</div>
        <div className="text-[10px] tracking-[0.32em] uppercase text-onyx-300 mt-1">
          ROUTE-LEVEL EXCEPTION
        </div>
        <div className="mt-4 p-3 border border-signal-error/40 bg-signal-error/[0.06] text-signal-error text-[11px] font-mono break-words text-left">
          {error.message ?? 'Unknown error'}
          {error.digest && <div className="mt-1 opacity-70">DIGEST · {error.digest}</div>}
        </div>
        <button
          onClick={() => reset()}
          className="mt-4 px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] border border-cyan-glow/60 text-cyan-glow hover:bg-cyan-glow/10 transition"
        >RESET ROUTE</button>
      </div>
    </div>
  );
}
