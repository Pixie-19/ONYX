import { nanoid } from 'nanoid';
import { bus, SESSION_ID } from '../bus/eventBus.js';
import { simulateBlackout } from '../blackout/monitor.js';
import { replayWindow } from '../chrono/replay.js';
import type { RulebookRow, WSMessage } from '../types.js';

export type InjectType =
  | 'ast_spike'
  | 'latency'
  | 'api_failure'
  | 'compiler_crash'
  | 'memory_pressure'
  | 'thermal_alert'
  | 'blackout'
  | 'cascade';

interface DemoState {
  active: boolean;
  scenario: string;
  phase: number;
  label: string;
  started_at: number | null;
}

const state: DemoState = {
  active: false,
  scenario: 'idle',
  phase: 0,
  label: 'IDLE',
  started_at: null,
};

export function demoState(): DemoState {
  return state;
}

function setPhase(phase: number, label: string) {
  state.phase = phase;
  state.label = label;
  bus.emit('ws', { type: 'demo', payload: { phase, label, ts: Date.now() } } satisfies WSMessage);
  bus.emitReplayEvent({
    kind: 'DEMO_PHASE',
    source: 'demo.orchestrator',
    target: label,
    payload: { phase },
  });
}

function emitRule(name: string, expression: string, observed: number, threshold: number, breached: boolean, target?: string) {
  const row: RulebookRow = {
    id: `rb_${nanoid(10)}`,
    ts: Date.now(),
    rule_id: `r.${name}`,
    rule_name: name,
    domain: 'execution',
    target: target ?? null,
    severity: breached ? 'breach' : 'info',
    expression,
    observed_value: observed,
    threshold,
    breached: breached ? 1 : 0,
    streak: breached ? 1 : 0,
    session_id: SESSION_ID,
  };
  bus.emitRule(row);
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Cinematic 4-phase cascade — the showpiece script.
 *
 * Phase 1 — healthy baseline pulse
 * Phase 2 — injected failure cascade:
 *   commit → AST mutation → CPU spike → socket retries → latency surge → compiler crash
 * Phase 3 — chrono replay reconstruction of the cascade
 * Phase 4 — blackout protocol activation (inference reroutes to Ollama)
 */
export async function runDemo(scenario: string = 'cascade'): Promise<void> {
  if (state.active) return;
  state.active = true;
  state.scenario = scenario;
  state.started_at = Date.now();

  try {
    // ---- Phase 1: healthy baseline ----
    setPhase(1, 'HEALTHY_BASELINE');
    await delay(2500);

    // ---- Phase 2: failure cascade ----
    setPhase(2, 'FAILURE_CASCADE');
    const trace_commit = `trc_${nanoid(8)}`;
    bus.emitReplayEvent({
      kind: 'DEMO_PHASE',
      severity: 'info',
      source: 'demo.orchestrator',
      target: 'agent/src/server.ts',
      trace_id: trace_commit,
      payload: { phase: 'commit' },
    });
    await delay(600);

    const trace_ast = `trc_${nanoid(8)}`;
    bus.emitReplayEvent({
      kind: 'AST_COMPLEXITY_SPIKE',
      severity: 'warn',
      source: 'demo.orchestrator',
      target: 'agent/src/server.ts',
      trace_id: trace_ast,
      parent_trace_id: trace_commit,
      payload: { complexity: 28.4, delta: 17.1 },
    });
    await delay(800);

    const trace_cpu = `trc_${nanoid(8)}`;
    bus.emitReplayEvent({
      kind: 'CPU_SPIKE',
      severity: 'warn',
      source: 'demo.orchestrator',
      target: 'host.cpu',
      trace_id: trace_cpu,
      parent_trace_id: trace_ast,
      payload: { cpu_load: 0.94 },
    });
    await delay(700);

    const trace_socket = `trc_${nanoid(8)}`;
    bus.emitReplayEvent({
      kind: 'SOCKET_RETRY',
      severity: 'warn',
      source: 'demo.orchestrator',
      target: 'api.mistral.ai:443',
      trace_id: trace_socket,
      parent_trace_id: trace_cpu,
      payload: { retries: 3 },
    });
    await delay(500);

    const trace_lat = `trc_${nanoid(8)}`;
    bus.emitReplayEvent({
      kind: 'LATENCY_SURGE',
      severity: 'error',
      source: 'demo.orchestrator',
      target: 'api.mistral.ai:443',
      trace_id: trace_lat,
      parent_trace_id: trace_socket,
      payload: { rtt_ms: 1812 },
    });
    await delay(600);

    const trace_compile = `trc_${nanoid(8)}`;
    bus.emitReplayEvent({
      kind: 'COMPILER_FAILURE',
      severity: 'critical',
      source: 'demo.orchestrator',
      target: 'tsc',
      trace_id: trace_compile,
      parent_trace_id: trace_ast,
      payload: { code: 'TS2345', file: 'agent/src/server.ts' },
    });
    emitRule('build.must_not_crash', 'COUNT(BUILD_CRASH) = 0', 1, 0, true, 'tsc');

    await delay(400);
    bus.emitReplayEvent({
      kind: 'BUILD_CRASH',
      severity: 'critical',
      source: 'demo.orchestrator',
      target: 'tsc',
      trace_id: `trc_${nanoid(8)}`,
      parent_trace_id: trace_compile,
      payload: { exit_code: 2 },
    });
    await delay(2400);

    // ---- Phase 3: chrono replay reconstruction ----
    setPhase(3, 'CHRONO_REPLAY');
    const since = state.started_at!;
    const window = replayWindow(since, Date.now());
    bus.emit('ws', {
      type: 'event',
      payload: {
        id: `rp_${nanoid(10)}`,
        ts: Date.now(),
        seq: -1,
        kind: 'DEMO_PHASE',
        severity: 'info',
        trace_id: `trc_${nanoid(8)}`,
        parent_trace_id: null,
        source: 'demo.orchestrator',
        target: `window=${window.length}`,
        payload: { phase: 'replay-fired' },
        session_id: SESSION_ID,
      },
    } satisfies WSMessage);
    await delay(3500);

    // ---- Phase 4: blackout protocol ----
    setPhase(4, 'BLACKOUT_PROTOCOL');
    simulateBlackout(true);
    await delay(4500);
    simulateBlackout(false);
    await delay(1000);

    setPhase(0, 'IDLE');
  } finally {
    state.active = false;
    state.scenario = 'idle';
    state.started_at = null;
  }
}

/**
 * One-shot synthetic event injection — used by the /demo page to fire
 * individual scenarios without running the full 4-phase cascade.
 */
export function inject(type: InjectType): { ok: true; type: InjectType } {
  if (type === 'cascade') {
    void runDemo('cascade');
    return { ok: true, type };
  }
  if (type === 'blackout') {
    simulateBlackout(true);
    // auto-release after 6 seconds
    setTimeout(() => simulateBlackout(false), 6000);
    return { ok: true, type };
  }
  if (type === 'ast_spike') {
    bus.emitReplayEvent({
      kind: 'AST_COMPLEXITY_SPIKE',
      severity: 'warn',
      source: 'demo.inject',
      target: 'agent/src/server.ts',
      payload: { complexity: 32.1, delta: 21.4, injected: true },
    });
    return { ok: true, type };
  }
  if (type === 'latency') {
    bus.emitReplayEvent({
      kind: 'LATENCY_SURGE',
      severity: 'warn',
      source: 'demo.inject',
      target: 'api.mistral.ai:443',
      payload: { rtt_ms: 1620, injected: true },
    });
    return { ok: true, type };
  }
  if (type === 'api_failure') {
    bus.emitReplayEvent({
      kind: 'DEPENDENCY_DEGRADED',
      severity: 'error',
      source: 'demo.inject',
      target: 'api.mistral.ai:443',
      payload: { kind: 'outbound', retries: 4, injected: true },
    });
    return { ok: true, type };
  }
  if (type === 'compiler_crash') {
    const trace = `trc_${nanoid(8)}`;
    bus.emitReplayEvent({
      kind: 'COMPILER_FAILURE',
      severity: 'critical',
      source: 'demo.inject',
      target: 'tsc',
      trace_id: trace,
      payload: { code: 'TS2345', file: 'agent/src/server.ts', injected: true },
    });
    setTimeout(() => {
      bus.emitReplayEvent({
        kind: 'BUILD_CRASH',
        severity: 'critical',
        source: 'demo.inject',
        target: 'tsc',
        parent_trace_id: trace,
        payload: { exit_code: 2, injected: true },
      });
    }, 350);
    return { ok: true, type };
  }
  if (type === 'memory_pressure') {
    bus.emitReplayEvent({
      kind: 'MEMORY_PRESSURE',
      severity: 'warn',
      source: 'demo.inject',
      target: 'host.memory',
      payload: { mem_used_pct: 0.94, injected: true },
    });
    return { ok: true, type };
  }
  if (type === 'thermal_alert') {
    bus.emitReplayEvent({
      kind: 'THERMAL_ALERT',
      severity: 'warn',
      source: 'demo.inject',
      target: 'host.thermal',
      payload: { thermal: 'hot', cpu_temp_c: 88, injected: true },
    });
    return { ok: true, type };
  }
  return { ok: true, type };
}
