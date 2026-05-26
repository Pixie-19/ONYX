import type { Severity } from './types';

export const SEVERITY_TO_PILL: Record<Severity, string> = {
  info:     'info',
  warn:     'warn',
  error:    'error',
  critical: 'critical',
};

export const KIND_TO_SEVERITY: Record<string, Severity> = {
  FILE_MODIFIED:          'info',
  FILE_DELETED:           'warn',
  AST_COMPLEXITY_SPIKE:   'warn',
  AST_DEPENDENCY_CHANGE:  'info',
  SYNTAX_FAILURE:         'error',
  COMPILER_WARN:          'info',
  COMPILER_FAILURE:       'critical',
  BUILD_CRASH:            'critical',
  SOCKET_RETRY:           'warn',
  LATENCY_SURGE:          'warn',
  DEPENDENCY_DEGRADED:    'error',
  MEMORY_PRESSURE:        'warn',
  CPU_SPIKE:              'warn',
  THERMAL_ALERT:          'warn',
  RULE_BREACH:            'error',
  BLACKOUT_ENTER:         'warn',
  BLACKOUT_EXIT:          'info',
  INFERENCE_ROUTE:        'info',
  DEMO_PHASE:             'info',
};

// Premium palette — calm, semantic, legible on light + dark surfaces.
export const NODE_COLOR: Record<string, string> = {
  file:      '#4F46E5', // indigo
  service:   '#7C3AED', // violet
  endpoint:  '#10B981', // emerald
  process:   '#F59E0B', // amber
  inference: '#EC4899', // pink
};

export const EDGE_COLOR: Record<string, string> = {
  import:    '#6366F1',
  call:      '#8B5CF6',
  socket:    '#10B981',
  inference: '#EC4899',
  replay:    '#F59E0B',
};

export const STATUS_COLOR: Record<string, string> = {
  healthy:  '#10B981',
  warn:     '#F59E0B',
  critical: '#DC2626',
  degraded: '#F59E0B',
  retry:    '#F59E0B',
  offline:  '#EF4444',
};

export function severityClass(s: Severity): string {
  switch (s) {
    case 'info':
      return 'text-[#4F46E5] dark:text-indigo-300';
    case 'warn':
      return 'text-[#B45309] dark:text-amber-300';
    case 'error':
      return 'text-[#B91C1C] dark:text-red-300';
    case 'critical':
      return 'text-[#991B1B] dark:text-red-300 font-semibold';
  }
}
