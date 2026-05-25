import { db } from '../db/index.js';
import { bus } from '../bus/eventBus.js';
import type { ReplayEvent, WSMessage } from '../types.js';

/**
 * Chrono Replay — causal reconstruction of an arbitrary time window.
 *
 * Events are pulled from `replay_events` ordered by `seq` so causal parent
 * links are intact. The cockpit's replay console scrubs across this set;
 * the demo orchestrator can also call `replayWindow` directly when running
 * the cinematic Phase 3 reconstruction.
 */
export function replayWindow(from: number, to: number): ReplayEvent[] {
  const rows = db().prepare(`
    SELECT id, ts, seq, kind, severity, trace_id, parent_trace_id, source, target, payload_json, duration_ms, session_id
    FROM replay_events
    WHERE ts BETWEEN ? AND ?
    ORDER BY seq ASC
    LIMIT 2048
  `).all(from, to) as any[];

  return rows.map((r) => ({
    id: r.id,
    ts: r.ts,
    seq: r.seq,
    kind: r.kind,
    severity: r.severity,
    trace_id: r.trace_id,
    parent_trace_id: r.parent_trace_id,
    source: r.source,
    target: r.target ?? undefined,
    payload: JSON.parse(r.payload_json ?? '{}'),
    duration_ms: r.duration_ms ?? undefined,
    session_id: r.session_id,
  }));
}

/**
 * Build stability index — a 0..100 score derived from the rate and severity
 * of replay_events in the last 5 minutes. The cockpit pins this in the
 * header strip so judges always see something moving.
 */
let lastIndex = 100;

export function buildStabilityIndex(): number {
  try {
    const r = db().prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN severity = 'critical' THEN 5 ELSE 0 END), 0) AS crit,
        COALESCE(SUM(CASE WHEN severity = 'error'    THEN 3 ELSE 0 END), 0) AS err,
        COALESCE(SUM(CASE WHEN severity = 'warn'     THEN 1 ELSE 0 END), 0) AS warn
      FROM replay_events
      WHERE ts >= (strftime('%s','now') - 300) * 1000
    `).get() as any;
    const penalty = Math.min(100, (r.crit ?? 0) + (r.err ?? 0) + (r.warn ?? 0) * 0.4);
    lastIndex = Math.max(0, 100 - penalty);
    return Math.round(lastIndex);
  } catch {
    return lastIndex;
  }
}

setInterval(() => {
  bus.emit('ws', { type: 'build_stability', payload: { index: buildStabilityIndex(), ts: Date.now() } } satisfies WSMessage);
}, 2000).unref();
