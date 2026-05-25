'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { fmtShortTs } from '@/lib/format';

export function WorkspaceTicker() {
  const events = useOnyx((s) => s.events);
  const workspace = useOnyx((s) => s.workspace);

  const lines = useMemo(() => {
    const a = events.slice(-40).reverse().map((e) =>
      `${fmtShortTs(e.ts)} · ${e.kind} · ${e.target ?? e.source}`);
    const b = workspace.slice(-20).reverse().map((w) =>
      `${fmtShortTs(w.ts)} · ${w.event.toUpperCase()} · ${w.file} · burst=${w.burst_rate.toFixed(1)}`);
    return [...a, ...b];
  }, [events, workspace]);

  const fullText = lines.length ? lines.join('       ◢       ') : 'onyx · awaiting workspace activity · run any save in the watched workspace to populate the event bus';
  return (
    <div className="ticker px-3 py-1 border-t border-b border-onyx-600/40 bg-onyx-950/60 text-[10.5px] tracking-[0.14em] uppercase text-onyx-300">
      <span className="ticker-inner">
        {fullText}            {fullText}
      </span>
    </div>
  );
}
