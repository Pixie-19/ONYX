'use client';
import { useMemo, useState } from 'react';
import { Radio, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { fmtShortTs } from '@/lib/format';
import { KIND_TO_SEVERITY, severityClass } from '@/lib/colors';
import type { Severity } from '@/lib/types';

const SEVERITY_BUTTONS: { key: Severity | 'all'; label: string }[] = [
  { key: 'all',      label: 'ALL' },
  { key: 'info',     label: 'INFO' },
  { key: 'warn',     label: 'WARN' },
  { key: 'error',    label: 'ERROR' },
  { key: 'critical', label: 'CRIT' },
];

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
        icon={<Radio size={14} />}
        title="EVENT BUS · APPEND-ONLY"
        subtitle="Every operational event ever observed · session-scoped"
        meta={
          <>
            <Badge tone="critical">{counts.critical}</Badge>
            <Badge tone="error">{counts.error}</Badge>
            <Badge tone="warn">{counts.warn}</Badge>
            <Badge tone="info">{counts.info}</Badge>
            <Badge tone="muted">{events.length} TOTAL</Badge>
          </>
        }
      />

      <div className="px-3 py-2 border-b border-onyx-600/30 flex items-center gap-3 bg-onyx-950/40">
        <div className="flex items-center gap-1.5">
          {SEVERITY_BUTTONS.map((b) => (
            <button
              key={b.key}
              onClick={() => setFilter(b.key)}
              className={'text-[9.5px] tracking-[0.22em] uppercase px-2.5 py-1 border rounded-[2px] ' + (filter === b.key ? 'text-cyan-glow border-cyan-glow/70 bg-cyan-glow/10' : 'text-onyx-300 border-onyx-600/40 hover:border-onyx-300')}
            >{b.label}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 px-2 py-1 border border-onyx-600/40 bg-onyx-900/40 w-[320px]">
          <Search size={12} className="text-onyx-300" />
          <input
            placeholder="search kind / target / source / trace…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[11px] text-onyx-100 placeholder:text-onyx-300 font-mono"
          />
          <span className="text-[9.5px] tracking-[0.22em] uppercase text-onyx-300">{filtered.length}/{events.length}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto font-mono text-[11px]">
        <AnimatePresence initial={false}>
          {filtered.slice(0, 600).map((ev) => {
            const sev = (ev.severity ?? KIND_TO_SEVERITY[ev.kind] ?? 'info') as Severity;
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-[100px_180px_1fr_220px_80px] gap-3 px-4 py-1 border-b border-onyx-600/20 hover:bg-onyx-700/30"
              >
                <span className="text-onyx-300 tabular-nums">{fmtShortTs(ev.ts)}</span>
                <span className={severityClass(sev)}>{ev.kind}</span>
                <span className="text-onyx-100 truncate">{ev.target ?? ev.source}</span>
                <span className="text-onyx-300 truncate">{ev.trace_id}</span>
                <span className="text-onyx-300 text-right">#{ev.seq}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="px-6 py-10 text-[10px] tracking-[0.18em] uppercase text-onyx-300">
            no events match the current filter
          </div>
        )}
      </div>
    </div>
  );
}
