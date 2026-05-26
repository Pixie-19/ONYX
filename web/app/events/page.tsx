'use client';
import { useMemo, useState } from 'react';
import { Radio, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { fmtShortTs } from '@/lib/format';
import { KIND_TO_SEVERITY } from '@/lib/colors';
import type { Severity } from '@/lib/types';
import { cn } from '@/lib/format';

const SEVERITY_BUTTONS: { key: Severity | 'all'; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'info',     label: 'Info' },
  { key: 'warn',     label: 'Warn' },
  { key: 'error',    label: 'Error' },
  { key: 'critical', label: 'Critical' },
];

const SEV_COLOR: Record<string, string> = {
  info:     '#4F46E5',
  warn:     '#F59E0B',
  error:    '#EF4444',
  critical: '#DC2626',
};

export default function EventsPage() {
  const events = useOnyx((s) => s.events);
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.slice().reverse().filter((e) => {
      if (filter !== 'all' && e.severity !== filter) return false;
      if (!q) return true;
      return (
        e.kind.toLowerCase().includes(q) ||
        (e.target ?? '').toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        e.trace_id.toLowerCase().includes(q)
      );
    });
  }, [events, filter, query]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { info: 0, warn: 0, error: 0, critical: 0 };
    for (const e of events) c[e.severity] = (c[e.severity] ?? 0) + 1;
    return c;
  }, [events]);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Radio size={16} />}
        title="Event stream"
        subtitle="Append-only operational event bus · session scoped"
        meta={
          <>
            <CountChip color="#DC2626" label="critical" count={counts.critical} />
            <CountChip color="#EF4444" label="error" count={counts.error} />
            <CountChip color="#F59E0B" label="warn" count={counts.warn} />
            <CountChip color="#4F46E5" label="info" count={counts.info} />
            <Badge tone="muted">{events.length} total</Badge>
          </>
        }
      />

      <div className="px-6 py-3 border-b border-line flex items-center gap-3 bg-surface-raised">
        <div className="flex items-center gap-1">
          {SEVERITY_BUTTONS.map((b) => (
            <button
              key={b.key}
              onClick={() => setFilter(b.key)}
              className={cn(
                'text-[12px] font-medium px-3 h-8 rounded-md transition',
                filter === b.key
                  ? 'text-primary bg-surface-sunken'
                  : 'text-secondary hover:text-primary hover:bg-surface-sunken',
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 h-9 border border-line rounded-md bg-surface-base w-[360px]">
          <Search size={13} className="text-tertiary" />
          <input
            placeholder="Search kind, target, source, or trace…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[12.5px] text-primary placeholder:text-tertiary"
          />
          <span className="text-[11px] text-tertiary tabular-nums">
            {filtered.length}/{events.length}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto surface-base">
        <AnimatePresence initial={false}>
          {filtered.slice(0, 600).map((ev) => {
            const sev = (ev.severity ?? KIND_TO_SEVERITY[ev.kind] ?? 'info') as Severity;
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="grid grid-cols-[100px_220px_1fr_220px_70px] gap-4 px-6 py-2.5 border-b border-subtle hover:bg-surface-sunken transition items-center"
              >
                <span className="text-[11.5px] text-tertiary tabular-nums">
                  {fmtShortTs(ev.ts)}
                </span>
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-[6px] h-[6px] rounded-full shrink-0"
                    style={{ background: SEV_COLOR[sev] ?? '#4F46E5' }}
                  />
                  <span className="text-[12.5px] font-medium text-primary truncate">
                    {ev.kind.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </span>
                <span className="text-[12.5px] text-secondary truncate">{ev.target ?? ev.source}</span>
                <span className="text-[11.5px] text-tertiary truncate font-mono">{ev.trace_id}</span>
                <span className="text-[11.5px] text-tertiary text-right tabular-nums">#{ev.seq}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="px-6 py-16 text-center text-[12.5px] text-secondary">
            No events match the current filter
          </div>
        )}
      </div>
    </div>
  );
}

function CountChip({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-line surface-raised text-[12px]">
      <span className="w-[6px] h-[6px] rounded-full" style={{ background: color }} />
      <span className="text-secondary">{label}</span>
      <span className="font-semibold text-primary tabular-nums">{count}</span>
    </span>
  );
}
