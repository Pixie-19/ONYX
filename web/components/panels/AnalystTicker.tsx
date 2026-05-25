'use client';
import { useEffect, useRef } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { SignalPill } from '@/components/primitives/SignalPill';
import { fmtShortTs, ONYX_HTTP } from '@/lib/format';

export function AnalystTicker() {
  const analyst = useOnyx((s) => s.analyst);
  const intel = useOnyx((s) => s.intelligence);
  const blackout = useOnyx((s) => s.blackout);
  const lastTrigger = useRef<number>(0);

  // Periodically prompt the analyst with the freshest intelligence summary
  // so the ticker stays alive. Throttled — never more than once per 30s.
  useEffect(() => {
    const id = setInterval(async () => {
      if (intel.length === 0) return;
      if (Date.now() - lastTrigger.current < 30_000) return;
      lastTrigger.current = Date.now();
      const i = intel[intel.length - 1];
      const prompt = `Operational state digest — ${i.title}. SQL summary: ${i.summary}. Severity ${i.severity}. Provide a single-sentence operator insight.`;
      try {
        await fetch(`${ONYX_HTTP}/analyst`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
      } catch { /* ignore */ }
    }, 8000);
    return () => clearInterval(id);
  }, [intel]);

  const reversed = analyst.slice().reverse().slice(0, 12);

  return (
    <Panel
      title="ANALYST · ARCHITECTURAL INSIGHTS"
      right={`PROVIDER · ${blackout.provider.toUpperCase()}`}
      badge={<SignalPill severity={blackout.online ? 'info' : 'warn'} label={blackout.online ? 'LINKED' : 'BLACKOUT'} />}
      className="h-full"
      inner="p-0"
      scroll
    >
      <div className="font-mono text-[11px]">
        {reversed.map((a) => (
          <div key={a.id} className="px-3 py-2 border-b border-onyx-600/15 hover:bg-onyx-700/20">
            <div className="flex items-center gap-2 text-[10px] text-onyx-300 tracking-[0.18em] uppercase">
              <span className="tabular-nums">{fmtShortTs(a.ts)}</span>
              <SignalPill severity={a.provider === 'mistral' ? 'info' : a.provider === 'ollama' ? 'warn' : 'error'} label={a.provider.toUpperCase()} />
            </div>
            <div className="text-onyx-100 leading-relaxed mt-1">{a.text}</div>
          </div>
        ))}
        {reversed.length === 0 && (
          <div className="px-3 py-6 text-[10px] uppercase tracking-[0.18em] text-onyx-300">awaiting analyst digest…</div>
        )}
      </div>
    </Panel>
  );
}
