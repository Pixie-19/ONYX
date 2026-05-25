'use client';
import { useEffect, useState } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { SignalPill } from '@/components/primitives/SignalPill';
import { fmtMs, fmtShortTs, ONYX_HTTP } from '@/lib/format';

export function SqlIntelligenceFeed() {
  const intel = useOnyx((s) => s.intelligence);
  const [selected, setSelected] = useState<string | null>(null);
  const [queries, setQueries] = useState<{ id: string; title: string; severity: string }[]>([]);

  useEffect(() => {
    fetch(`${ONYX_HTTP}/intelligence/queries`)
      .then((r) => r.json())
      .then((d) => setQueries(d.queries ?? []))
      .catch(() => { /* ignore */ });
  }, []);

  const reversed = intel.slice().reverse();
  const active = selected ? reversed.find((r) => r.query_id === selected) : reversed[0];

  return (
    <Panel
      title="RELATIONAL EXECUTION ENGINE · SQL"
      right={`${intel.length} EXECUTIONS`}
      className="h-full"
      inner="p-0"
    >
      <div className="grid grid-cols-[200px_1fr] h-full">
        <div className="border-r border-onyx-600/30 overflow-auto">
          {queries.map((q) => {
            const last = reversed.find((r) => r.query_id === q.id);
            const isActive = (selected ?? reversed[0]?.query_id) === q.id;
            return (
              <button
                key={q.id}
                onClick={() => setSelected(q.id)}
                className={`w-full text-left px-3 py-2 border-b border-onyx-600/20 hover:bg-onyx-700/30 ${isActive ? 'bg-onyx-700/40' : ''}`}
              >
                <div className="text-[10px] tracking-[0.16em] uppercase text-onyx-300 font-mono truncate">{q.id}</div>
                <div className="text-[11px] text-onyx-100 truncate">{q.title.split(' — ')[0]}</div>
                {last && (
                  <div className="mt-1 flex items-center gap-1 text-[9.5px] text-onyx-300">
                    <SignalPill severity={q.severity as any} label={String(last.rows.length)} />
                    <span className="tabular-nums">{fmtMs(last.latency_ms)}</span>
                  </div>
                )}
              </button>
            );
          })}
          {queries.length === 0 && (
            <div className="px-3 py-6 text-[10px] uppercase tracking-[0.18em] text-onyx-300">loading queries…</div>
          )}
        </div>

        <div className="p-3 overflow-auto font-mono text-[11px]">
          {active ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-onyx-100">{active.title}</div>
                <div className="flex items-center gap-2 text-[10px] text-onyx-300">
                  <SignalPill severity={active.severity} label={`${active.rows.length} ROWS`} />
                  <span>{fmtMs(active.latency_ms)}</span>
                  <span>{fmtShortTs(active.ts)}</span>
                </div>
              </div>
              <div className="text-[11px] text-cyan-glow/90 px-2 py-2 bg-onyx-900/60 border border-onyx-600/30 rounded-[2px]">{active.summary}</div>
              <ResultsTable rows={active.rows} />
            </div>
          ) : (
            <div className="text-onyx-300 text-[10px] uppercase tracking-[0.18em]">no executions yet…</div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function ResultsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <div className="text-onyx-300 text-[10px] uppercase tracking-[0.18em]">empty result set</div>;
  }
  const cols = Object.keys(rows[0]).slice(0, 6);
  return (
    <div className="overflow-auto border border-onyx-600/30">
      <table className="w-full text-[10.5px] tabular-nums">
        <thead className="bg-onyx-900/60">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-2 py-1 text-left panel-label sticky top-0 bg-onyx-900/80">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-onyx-600/15 hover:bg-onyx-700/20">
              {cols.map((c) => {
                const v = row[c];
                let s: string;
                if (v === null || v === undefined) s = '—';
                else if (typeof v === 'number') s = Number.isInteger(v) ? String(v) : v.toFixed(3);
                else s = String(v);
                return <td key={c} className="px-2 py-1 text-onyx-100 truncate max-w-[180px]">{s}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
