'use client';
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { fmtShortTs } from '@/lib/format';
import { KIND_TO_SEVERITY } from '@/lib/colors';
import type { Severity } from '@/lib/types';

const SEV_COLOR: Record<Severity, string> = {
  info:     '#4F46E5',
  warn:     '#F59E0B',
  error:    '#EF4444',
  critical: '#DC2626',
};

export function EventTimeline() {
  const events = useOnyx((s) => s.events);
  const rows = useMemo(() => events.slice().reverse().slice(0, 60), [events]);
  const counts = useMemo(() => {
    const c: Record<Severity, number> = { info: 0, warn: 0, error: 0, critical: 0 };
    for (const ev of events.slice(-200)) c[ev.severity] = (c[ev.severity] ?? 0) + 1;
    return c;
  }, [events]);

  return (
    <Panel
      title="Event timeline · replay_events"
      right={`${events.length} buffered`}
      badge={
        <div className="flex gap-1">
          <Badge tone="critical">{counts.critical}</Badge>
          <Badge tone="error">{counts.error}</Badge>
          <Badge tone="warn">{counts.warn}</Badge>
          <Badge tone="info">{counts.info}</Badge>
        </div>
      }
      className="h-full"
      inner="p-0"
      scroll
    >
      <div>
        <AnimatePresence initial={false}>
          {rows.map((ev) => {
            const sev = (ev.severity ?? KIND_TO_SEVERITY[ev.kind] ?? 'info') as Severity;
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-[90px_180px_1fr_auto] gap-3 px-4 py-2 border-b border-subtle hover:bg-surface-sunken transition items-center"
              >
                <span className="text-[11px] text-tertiary tabular-nums">{fmtShortTs(ev.ts)}</span>
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: SEV_COLOR[sev] }}
                  />
                  <span className="text-[12.5px] font-medium text-primary truncate">
                    {ev.kind.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </span>
                <span className="text-[12.5px] text-secondary truncate">{ev.target ?? ev.source}</span>
                <span className="text-[11px] text-tertiary tabular-nums">#{ev.seq}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-[12.5px] text-secondary">
            Awaiting events — is the agent online?
          </div>
        )}
      </div>
    </Panel>
  );
}
