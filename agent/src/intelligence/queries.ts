import type { Severity } from '../types.js';

export interface IntelligenceQuery {
  id: string;
  title: string;
  severity: Severity;
  sql: string;
  // optional summariser that runs over the rows the query produces
  summarise?: (rows: any[]) => string;
}

// The Relational Execution Engine — a curated set of cross-source SQL joins
// that produce operational intelligence. Each query is real SQL against the
// onyx_cognition schemas; the engine runs them on a rotating schedule and
// pushes the result onto the websocket.
export const ALL_QUERIES: IntelligenceQuery[] = [
  {
    id: 'q.failure_cascades',
    title: 'Failure cascades — events with > 2 downstream children in 10s',
    severity: 'critical',
    sql: `
      WITH children AS (
        SELECT parent_trace_id, COUNT(*) AS c
        FROM replay_events
        WHERE ts >= (strftime('%s','now') - 600) * 1000
          AND parent_trace_id IS NOT NULL
        GROUP BY parent_trace_id
      )
      SELECT e.id, e.ts, e.kind, e.severity, e.target, c.c AS downstream
      FROM replay_events e
      JOIN children c ON c.parent_trace_id = e.trace_id
      WHERE c.c >= 2
      ORDER BY e.ts DESC
      LIMIT 10`,
    summarise: (rows) =>
      rows.length === 0
        ? 'No failure cascades in the last 10 minutes.'
        : `${rows.length} cascade root(s) detected — latest at ${new Date(rows[0].ts).toISOString().slice(11,19)}: ${rows[0].kind} on ${rows[0].target ?? 'host'}.`,
  },
  {
    id: 'q.developer_friction',
    title: 'Developer friction — files with > 4 saves/min and rising complexity',
    severity: 'warn',
    sql: `
      SELECT w.file,
             AVG(w.burst_rate) AS avg_burst,
             MAX(s.complexity) AS peak_complexity,
             COUNT(*) AS events
      FROM workspace_entropy w
      LEFT JOIN execution_snapshots s ON s.file = w.file
      WHERE w.ts >= (strftime('%s','now') - 600) * 1000
      GROUP BY w.file
      HAVING avg_burst > 2 OR peak_complexity > 12
      ORDER BY avg_burst DESC
      LIMIT 12`,
    summarise: (rows) =>
      rows.length === 0
        ? 'Workspace entropy is stable.'
        : `${rows[0].file} shows ${Number(rows[0].avg_burst).toFixed(1)} saves/min at complexity ${Number(rows[0].peak_complexity ?? 0).toFixed(1)}.`,
  },
  {
    id: 'q.dependency_health',
    title: 'Dependency health — endpoints with p90 latency > 250ms',
    severity: 'warn',
    sql: `
      SELECT endpoint, kind,
             COUNT(*) AS samples,
             AVG(rtt_ms) AS mean_rtt,
             AVG(jitter_ms) AS mean_jitter,
             SUM(CASE WHEN status != 'healthy' THEN 1 ELSE 0 END) AS degraded
      FROM network_trajectories
      WHERE ts >= (strftime('%s','now') - 600) * 1000
      GROUP BY endpoint, kind
      HAVING mean_rtt > 250 OR degraded > 0
      ORDER BY degraded DESC, mean_rtt DESC
      LIMIT 12`,
    summarise: (rows) =>
      rows.length === 0
        ? 'All probed endpoints within nominal latency.'
        : `${rows[0].endpoint}: ${Math.round(rows[0].mean_rtt)}ms mean RTT · ${rows[0].degraded} degraded sample(s).`,
  },
  {
    id: 'q.instability_predict',
    title: 'Instability prediction — system + workspace + network co-stress',
    severity: 'critical',
    sql: `
      WITH s AS (
        SELECT AVG(cpu_load) AS cpu, AVG(mem_used_pct) AS mem, MAX(thermal_state) AS therm
        FROM system_cybernetics
        WHERE ts >= (strftime('%s','now') - 60) * 1000
      ),
      w AS (
        SELECT AVG(burst_rate) AS burst, COUNT(*) AS events
        FROM workspace_entropy
        WHERE ts >= (strftime('%s','now') - 60) * 1000
      ),
      n AS (
        SELECT SUM(CASE WHEN status != 'healthy' THEN 1 ELSE 0 END) AS degraded,
               AVG(rtt_ms) AS rtt
        FROM network_trajectories
        WHERE ts >= (strftime('%s','now') - 60) * 1000
      )
      SELECT s.cpu, s.mem, s.therm, w.burst, w.events, n.degraded, n.rtt,
             (COALESCE(s.cpu,0)*0.4 + COALESCE(s.mem,0)*0.2 + COALESCE(w.burst,0)*0.05 + COALESCE(n.degraded,0)*0.15) AS pressure
      FROM s, w, n`,
    summarise: (rows) => {
      const r = rows[0] ?? {};
      const p = Number(r.pressure ?? 0);
      const band = p > 0.7 ? 'critical' : p > 0.45 ? 'elevated' : 'nominal';
      return `Composite stress pressure ${(p * 100).toFixed(0)}% — ${band}.`;
    },
  },
  {
    id: 'q.dependency_bottleneck',
    title: 'Dependency bottlenecks — modules imported across high-entropy files',
    severity: 'info',
    sql: `
      WITH files AS (
        SELECT file FROM workspace_entropy
        WHERE ts >= (strftime('%s','now') - 600) * 1000
        GROUP BY file
        HAVING AVG(burst_rate) > 1.5
      )
      SELECT s.imports_json
      FROM execution_snapshots s
      JOIN files f ON f.file = s.file
      ORDER BY s.ts DESC
      LIMIT 50`,
    summarise: (rows) => {
      const counts = new Map<string, number>();
      for (const r of rows) {
        try {
          const list = JSON.parse(r.imports_json) as string[];
          for (const m of list) counts.set(m, (counts.get(m) ?? 0) + 1);
        } catch { /* ignore */ }
      }
      const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (ranked.length === 0) return 'No dominant module dependencies in the active hotspot.';
      return `Hottest imports: ${ranked.map(([m, c]) => `${m}×${c}`).join(', ')}.`;
    },
  },
];
