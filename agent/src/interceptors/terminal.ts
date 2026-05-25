import { bus } from '../bus/eventBus.js';

// The terminal interceptor in a full deployment would tap a PTY recorder
// (think `script` / `asciinema`) and parse exit codes + compiler output.
// For the local-first build we synthesise believable signals from the
// filesystem stream: rapid edits in `.ts` / `.tsx` files immediately
// produce a tsc-style typecheck wave with occasional warns.
//
// When demo mode is active, the orchestrator emits authoritative
// COMPILER_FAILURE / BUILD_CRASH events — this background pulser is
// designed to never crowd them out.

const FAILURE_CODES = ['TS2339', 'TS2345', 'TS2551', 'TS2304', 'TS7006'];

let burst = 0;
let lastEmit = 0;

export function startTerminal(): void {
  bus.on('file', (ev: { event: string; file: string; ts: number }) => {
    if (ev.event !== 'change') return;
    if (!/\.(ts|tsx)$/.test(ev.file)) return;
    burst += 1;
    const now = Date.now();
    if (now - lastEmit < 1500) return;
    lastEmit = now;

    // mild background — a typecheck pass that mostly succeeds
    const code = FAILURE_CODES[Math.floor(Math.random() * FAILURE_CODES.length)];
    const severity = burst >= 4 ? 'warn' : 'info';
    bus.emitReplayEvent({
      kind: 'COMPILER_WARN',
      severity,
      source: 'interceptor.terminal',
      target: 'tsc',
      payload: { code, file: ev.file, burst },
      duration_ms: 180 + Math.floor(Math.random() * 1400),
    });
    if (burst > 6) burst = 0;
  });
}
