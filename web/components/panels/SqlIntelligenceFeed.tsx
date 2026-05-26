'use client';
import { useEffect, useState } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { fmtMs, fmtShortTs, ONYX_HTTP } from '@/lib/format';

export function SqlIntelligenceFeed() {
  const intel = useOnyx((s) => s.intelligence);
  const [selected, setSelected] = useState<string | null>(null);
  const [queries, setQueries] = useState<{ id: string; title: string; severity: string }[]>([]);

  useEffect(() => {
    fetch(`${ONYX_HTTP}/intelligence/queries`)
      .then((r) => r.json())
      .then((d) => setQueries(d.queries ?? []))
      .catch(() => {
        /* ignore */
      });
  }, []);

  const reversed = intel.slice().reverse();
  const active = selected ? reversed.find((r) => r.query_id === selected) : reversed[0];

  return (
    <Panel
      title="Relational execution engine"
      right={`${intel.length} executions`}
      className="h-full"
      inner="p-0"
    >
      <div className="grid grid-cols-[260px_1fr] h-full">
        <div className="border-r border-line overflow-auto surface-inset">
          {queries.map((q) => {
            const last = reversed.find((r) => r.query_id === q.id);
            const isActive = (selected ?? reversed[0]?.query_id) === q.id;
            return (
              <button
                key={q.id}
                onClick={() => setSelected(q.id)}
                className={`w-full text-left px-4 py-3 border-b border-subtle hover:bg-surface-sunken transition ${
                  isActive ? 'bg-surface-raised' : ''
                }`}
              >
                <div className="text-[11px] text-tertiary font-mono truncate">{q.id}</div>
                <div className="text-[12.5px] text-primary font-medium truncate mt-0.5">
                  {q.title.split(' — ')[0]}
                </div>
                {last && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                    <Badge tone={q.severity as any}>{last.rows.length} rows</Badge>
                    <span className="text-tertiary tabular-nums">{fmtMs(last.latency_ms)}</span>
                  </div>
                )}
              </button>
            );
          })}
          {queries.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] text-secondary">
              Loading queries…
            </div>
          )}
        </div>

        <div className="p-5 overflow-auto">
          {active ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[13.5px] font-semibold text-primary">{active.title}</div>
                <div className="flex items-center gap-2">
                  <Badge tone={active.severity as any}>{active.rows.length} rows</Badge>
                  <span className="text-[11.5px] text-tertiary tabular-nums">
                    {fmtMs(active.latency_ms)}
                  </span>
                  <span className="text-[11.5px] text-tertiary tabular-nums">
                    {fmtShortTs(active.ts)}
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-line surface-inset p-3 text-[12.5px] text-secondary leading-relaxed">
                {active.summary}
              </div>
              <ResultsTable rows={active.rows} />
            </div>
          ) : (
            <div className="py-8 text-center text-[12.5px] text-secondary">
              No executions yet — the SQL engine will populate as queries run
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function ResultsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-line surface-inset p-4 text-center text-[12px] text-secondary">
        Empty result set
      </div>
    );
  }
  const cols = Object.keys(rows[0]).slice(0, 6);
  return (
    <div className="rounded-md border border-line overflow-auto bg-surface-raised">
      <table className="w-full text-[12px] tabular-nums">
        <thead className="surface-inset">
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="px-3 py-2 text-left text-[11px] font-medium text-tertiary uppercase tracking-tight border-b border-line"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-subtle hover:bg-surface-sunken transition">
              {cols.map((c) => {
                const v = row[c];
                let s: string;
                if (v === null || v === undefined) s = '—';
                else if (typeof v === 'number') s = Number.isInteger(v) ? String(v) : v.toFixed(3);
                else s = String(v);
                return (
                  <td key={c} className="px-3 py-2 text-primary truncate max-w-[200px]">
                    {s}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
