'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { fmtShortTs } from '@/lib/format';

/**
 * Thin live activity strip directly under the topbar. Renders a slow,
 * elegant scroll of recent events — purposeful, never frantic.
 */
export function WorkspaceTicker() {
  const events = useOnyx((s) => s.events);
  const workspace = useOnyx((s) => s.workspace);

  const lines = useMemo(() => {
    const a = events.slice(-30).reverse().map(
      (e) => `${fmtShortTs(e.ts)}  ·  ${e.kind.replace(/_/g, ' ').toLowerCase()}  ·  ${e.target ?? e.source}`,
    );
    const b = workspace.slice(-12).reverse().map(
      (w) => `${fmtShortTs(w.ts)}  ·  ${w.event}  ·  ${w.file}  ·  burst ${w.burst_rate.toFixed(1)}`,
    );
    return [...a, ...b];
  }, [events, workspace]);

  const fullText = lines.length
    ? lines.join('     •     ')
    : 'onyx · awaiting workspace activity — save any file in the watched workspace to populate the event bus';

  return (
    <div className="ticker px-4 py-1.5 border-b border-line bg-surface-base text-[11.5px] text-secondary">
      <span className="ticker-inner">
        {fullText}
        {'           '}
        {fullText}
      </span>
    </div>
  );
}
