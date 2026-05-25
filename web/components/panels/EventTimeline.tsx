'use client';
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { SignalPill } from '@/components/primitives/SignalPill';
import { fmtShortTs } from '@/lib/format';
import { KIND_TO_SEVERITY, severityClass } from '@/lib/colors';
import type { Severity } from '@/lib/types';

export function EventTimeline() {
  const events = useOnyx((s) => s.events);
  // newest first
  const rows = useMemo(() => events.slice().reverse().slice(0, 60), [events]);
  const counts = useMemo(() => {
    const c: Record<Severity, number> = { info: 0, warn: 0, error: 0, critical: 0 };
    for (const ev of events.slice(-200)) c[ev.severity] = (c[ev.severity] ?? 0) + 1;
    return c;
  }, [events]);

  return (
    <Panel
      title="EVENT TIMELINE · REPLAY_EVENTS"
      right={`${events.length} BUFFERED`}
      badge={
        <div className="flex gap-1">
          <SignalPill severity="critical" label={`${counts.critical}`} />
          <SignalPill severity="error" label={`${counts.error}`} />
          <SignalPill severity="warn" label={`${counts.warn}`} />
          <SignalPill severity="info" label={`${counts.info}`} />
        </div>
      }
      className="h-full"
      inner="p-0"
      scroll
    >
      <div className="font-mono text-[11px]">
        <AnimatePresence initial={false}>
          {rows.map((ev) => {
            const sev = (ev.severity ?? KIND_TO_SEVERITY[ev.kind] ?? 'info') as Severity;
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-[88px_120px_1fr_auto] gap-2 px-3 py-1 border-b border-onyx-600/20 hover:bg-onyx-700/30"
              >
                <span className="text-onyx-300 tabular-nums">{fmtShortTs(ev.ts)}</span>
                <span className={severityClass(sev)}>{ev.kind}</span>
                <span className="text-onyx-100 truncate">{ev.target ?? ev.source}</span>
                <span className="text-onyx-300">#{ev.seq}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {rows.length === 0 && (
          <div className="px-3 py-6 text-onyx-300 text-[10px] tracking-[0.18em] uppercase">awaiting events · agent online?</div>
        )}
      </div>
    </Panel>
  );
}
