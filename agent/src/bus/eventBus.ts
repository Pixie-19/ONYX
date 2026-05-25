import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { writeJsonl } from './jsonl.js';
import type {
  EventKind,
  ReplayEvent,
  Severity,
  WorkspaceEntropyRow,
  NetworkTrajectoryRow,
  SystemCyberneticsRow,
  ExecutionSnapshotRow,
  RulebookRow,
  WSMessage,
} from '../types.js';

export const SESSION_ID = `sess_${nanoid(10)}`;

// In-memory ring buffer of the most recent events, served on /events/recent
// so the cockpit can hydrate without replaying the entire log.
const RING_SIZE = 2048;
const ring: ReplayEvent[] = [];

let _seq = 0;
function nextSeq(): number {
  _seq += 1;
  return _seq;
}

/**
 * The ONYX Event Bus.
 *
 * Append-only, in-memory, low-latency. Every operational event observed by
 * any interceptor passes through here. Subscribers (websocket fanout, the
 * intelligence engine, the chrono replay, the demo orchestrator) listen on
 * `'event'`, while typed convenience listeners (`'telemetry'`, `'network'`,
 * `'workspace'`) fire alongside for downstream consumers that only care
 * about a slice.
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(64);
  }

  emitReplayEvent(input: {
    kind: EventKind;
    severity?: Severity;
    source: string;
    target?: string;
    trace_id?: string;
    parent_trace_id?: string | null;
    payload?: Record<string, unknown>;
    duration_ms?: number;
  }): ReplayEvent {
    const ev: ReplayEvent = {
      id: `rp_${nanoid(12)}`,
      ts: Date.now(),
      seq: nextSeq(),
      kind: input.kind,
      severity: input.severity ?? 'info',
      trace_id: input.trace_id ?? `trc_${nanoid(8)}`,
      parent_trace_id: input.parent_trace_id ?? null,
      source: input.source,
      target: input.target,
      payload: input.payload,
      duration_ms: input.duration_ms,
      session_id: SESSION_ID,
    };
    ring.push(ev);
    if (ring.length > RING_SIZE) ring.shift();
    persistReplayEvent(ev);
    this.emit('event', ev);
    this.emit('ws', { type: 'event', payload: ev } satisfies WSMessage);
    return ev;
  }

  // Convenience emitters for typed rows produced by the interceptors.
  emitWorkspace(row: WorkspaceEntropyRow) {
    persistWorkspace(row);
    this.emit('workspace', row);
    this.emit('ws', { type: 'workspace', payload: row } satisfies WSMessage);
  }
  emitTelemetry(row: SystemCyberneticsRow) {
    persistTelemetry(row);
    this.emit('telemetry', row);
    this.emit('ws', { type: 'telemetry', payload: row } satisfies WSMessage);
  }
  emitNetwork(row: NetworkTrajectoryRow) {
    persistNetwork(row);
    this.emit('network', row);
    this.emit('ws', { type: 'network', payload: row } satisfies WSMessage);
  }
  emitSnapshot(row: ExecutionSnapshotRow) {
    persistSnapshot(row);
    this.emit('snapshot', row);
  }
  emitRule(row: RulebookRow) {
    persistRule(row);
    this.emit('rule', row);
    this.emit('ws', { type: 'rule', payload: row } satisfies WSMessage);
  }

  recent(n = 256): ReplayEvent[] {
    return ring.slice(Math.max(0, ring.length - n));
  }
}

export const bus = new EventBus();

// ---------- persistence ----------
function persistReplayEvent(ev: ReplayEvent): void {
  const stmt = db().prepare(`
    INSERT INTO replay_events
      (id, ts, seq, kind, severity, trace_id, parent_trace_id, source, target, payload_json, duration_ms, session_id)
    VALUES (@id, @ts, @seq, @kind, @severity, @trace_id, @parent_trace_id, @source, @target, @payload_json, @duration_ms, @session_id)
  `);
  stmt.run({
    id: ev.id,
    ts: ev.ts,
    seq: ev.seq,
    kind: ev.kind,
    severity: ev.severity,
    trace_id: ev.trace_id,
    parent_trace_id: ev.parent_trace_id ?? null,
    source: ev.source,
    target: ev.target ?? null,
    payload_json: JSON.stringify(ev.payload ?? {}),
    duration_ms: ev.duration_ms ?? null,
    session_id: ev.session_id,
  });
  writeJsonl('replay_events', ev);
}

function persistWorkspace(row: WorkspaceEntropyRow): void {
  db().prepare(`
    INSERT OR REPLACE INTO workspace_entropy
      (id, ts, file, lang, event, bytes_delta, ast_delta, complexity, syntax_fail, burst_rate, author, session_id)
    VALUES (@id,@ts,@file,@lang,@event,@bytes_delta,@ast_delta,@complexity,@syntax_fail,@burst_rate,@author,@session_id)
  `).run(row);
  writeJsonl('workspace_entropy', row);
}

function persistTelemetry(row: SystemCyberneticsRow): void {
  db().prepare(`
    INSERT INTO system_cybernetics
      (id, ts, cpu_load, cpu_temp_c, mem_used_pct, mem_pressure, swap_used_pct, disk_busy_pct, disk_iops, thermal_state, process_count, session_id)
    VALUES (@id,@ts,@cpu_load,@cpu_temp_c,@mem_used_pct,@mem_pressure,@swap_used_pct,@disk_busy_pct,@disk_iops,@thermal_state,@process_count,@session_id)
  `).run(row);
  writeJsonl('system_cybernetics', row);
}

function persistNetwork(row: NetworkTrajectoryRow): void {
  db().prepare(`
    INSERT INTO network_trajectories
      (id, ts, endpoint, kind, port, rtt_ms, jitter_ms, packet_loss, retries, status, bytes_in, bytes_out, session_id)
    VALUES (@id,@ts,@endpoint,@kind,@port,@rtt_ms,@jitter_ms,@packet_loss,@retries,@status,@bytes_in,@bytes_out,@session_id)
  `).run({ ...row, port: row.port ?? null });
  writeJsonl('network_trajectories', row);
}

function persistSnapshot(row: ExecutionSnapshotRow): void {
  db().prepare(`
    INSERT INTO execution_snapshots
      (id, ts, file, lang, function_count, class_count, import_count, loc, complexity, imports_json, exports_json, fingerprint, parent_id, session_id)
    VALUES (@id,@ts,@file,@lang,@function_count,@class_count,@import_count,@loc,@complexity,@imports_json,@exports_json,@fingerprint,@parent_id,@session_id)
  `).run(row);
  writeJsonl('execution_snapshots', row);
}

function persistRule(row: RulebookRow): void {
  db().prepare(`
    INSERT INTO rulebook_constraints
      (id, ts, rule_id, rule_name, domain, target, severity, expression, observed_value, threshold, breached, streak, session_id)
    VALUES (@id,@ts,@rule_id,@rule_name,@domain,@target,@severity,@expression,@observed_value,@threshold,@breached,@streak,@session_id)
  `).run({ ...row, target: row.target ?? null });
  writeJsonl('rulebook_constraints', row);
}
