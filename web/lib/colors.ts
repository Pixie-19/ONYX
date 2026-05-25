import type { Severity } from './types';

export const SEVERITY_TO_PILL: Record<Severity, string> = {
  info:     'info',
  warn:     'warn',
  error:    'error',
  critical: 'critical',
};

export const KIND_TO_SEVERITY: Record<string, Severity> = {
  FILE_MODIFIED: 'info',
  FILE_DELETED: 'warn',
  AST_COMPLEXITY_SPIKE: 'warn',
  AST_DEPENDENCY_CHANGE: 'info',
  SYNTAX_FAILURE: 'error',
  COMPILER_WARN: 'info',
  COMPILER_FAILURE: 'critical',
  BUILD_CRASH: 'critical',
  SOCKET_RETRY: 'warn',
  LATENCY_SURGE: 'warn',
  DEPENDENCY_DEGRADED: 'error',
  MEMORY_PRESSURE: 'warn',
  CPU_SPIKE: 'warn',
  THERMAL_ALERT: 'warn',
  RULE_BREACH: 'error',
  BLACKOUT_ENTER: 'warn',
  BLACKOUT_EXIT: 'info',
  INFERENCE_ROUTE: 'info',
  DEMO_PHASE: 'info',
};

export const NODE_COLOR: Record<string, string> = {
  file:      '#22e8ff',
  service:   '#9b6cff',
  endpoint:  '#46f5b8',
  process:   '#ffb84a',
  inference: '#ff6cd6',
};

export const EDGE_COLOR: Record<string, string> = {
  import:    '#22e8ff',
  call:      '#9b6cff',
  socket:    '#46f5b8',
  inference: '#ff6cd6',
  replay:    '#ffb84a',
};

export const STATUS_COLOR: Record<string, string> = {
  healthy:  '#46f5b8',
  warn:     '#ffb84a',
  critical: '#ff2d6b',
  degraded: '#ffb84a',
  retry:    '#ffb84a',
  offline:  '#ff5d6f',
};

export function severityClass(s: Severity): string {
  switch (s) {
    case 'info': return 'text-signal-info glow-cyan';
    case 'warn': return 'text-signal-warn glow-warn';
    case 'error': return 'text-signal-error glow-err';
    case 'critical': return 'text-signal-critical glow-err';
  }
}
