import { nanoid } from 'nanoid';
import { performance } from 'node:perf_hooks';
import { db } from '../db/index.js';
import { bus } from '../bus/eventBus.js';
import { ALL_QUERIES, type IntelligenceQuery } from './queries.js';
import type { IntelligenceRow, WSMessage } from '../types.js';

export { ALL_QUERIES };

export async function runQueryById(id: string): Promise<IntelligenceRow | null> {
  const q = ALL_QUERIES.find(q => q.id === id);
  if (!q) return null;
  return runQuery(q);
}

function runQuery(q: IntelligenceQuery): IntelligenceRow {
  const t0 = performance.now();
  let rows: any[] = [];
  try {
    rows = db().prepare(q.sql).all() as any[];
  } catch (err) {
    rows = [{ error: (err as Error).message }];
  }
  const summary = q.summarise ? q.summarise(rows) : `${rows.length} row(s) returned.`;
  const row: IntelligenceRow = {
    id: `iq_${nanoid(10)}`,
    ts: Date.now(),
    query_id: q.id,
    title: q.title,
    severity: q.severity,
    rows: rows.slice(0, 12),
    summary,
    latency_ms: Number((performance.now() - t0).toFixed(1)),
  };
  bus.emit('ws', { type: 'intelligence', payload: row } satisfies WSMessage);
  return row;
}

// The intelligence engine cycles through queries on a rotating cadence so
// each panel refresh feels alive without thrashing SQLite.
export function startIntelligence(): void {
  let i = 0;
  const tick = () => {
    const q = ALL_QUERIES[i % ALL_QUERIES.length];
    i += 1;
    runQuery(q);
  };
  // initial burst — fire all once at boot
  setTimeout(() => { for (const q of ALL_QUERIES) runQuery(q); }, 2500);
  // rotation — one query every 4s
  setInterval(tick, 4000).unref();
}
