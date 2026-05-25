import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../db/index.js';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedPath = path.resolve(config.paths.repoRoot, 'coral', 'fixtures', 'seed.jsonl');
if (!existsSync(seedPath)) {
  console.log('No seed fixture found, skipping.');
  process.exit(0);
}

const lines = readFileSync(seedPath, 'utf8').split('\n').filter(Boolean);
const handle = db();
const insertByTable: Record<string, (row: any) => void> = {
  workspace_entropy: (r) => handle.prepare(`
    INSERT OR REPLACE INTO workspace_entropy (id,ts,file,lang,event,bytes_delta,ast_delta,complexity,syntax_fail,burst_rate,author,session_id)
    VALUES (@id,@ts,@file,@lang,@event,@bytes_delta,@ast_delta,@complexity,@syntax_fail,@burst_rate,@author,@session_id)`).run(r),
  network_trajectories: (r) => handle.prepare(`
    INSERT OR REPLACE INTO network_trajectories (id,ts,endpoint,kind,port,rtt_ms,jitter_ms,packet_loss,retries,status,bytes_in,bytes_out,session_id)
    VALUES (@id,@ts,@endpoint,@kind,@port,@rtt_ms,@jitter_ms,@packet_loss,@retries,@status,@bytes_in,@bytes_out,@session_id)`).run(r),
  system_cybernetics: (r) => handle.prepare(`
    INSERT OR REPLACE INTO system_cybernetics (id,ts,cpu_load,cpu_temp_c,mem_used_pct,mem_pressure,swap_used_pct,disk_busy_pct,disk_iops,thermal_state,process_count,session_id)
    VALUES (@id,@ts,@cpu_load,@cpu_temp_c,@mem_used_pct,@mem_pressure,@swap_used_pct,@disk_busy_pct,@disk_iops,@thermal_state,@process_count,@session_id)`).run(r),
  execution_snapshots: (r) => handle.prepare(`
    INSERT OR REPLACE INTO execution_snapshots (id,ts,file,lang,function_count,class_count,import_count,loc,complexity,imports_json,exports_json,fingerprint,parent_id,session_id)
    VALUES (@id,@ts,@file,@lang,@function_count,@class_count,@import_count,@loc,@complexity,@imports_json,@exports_json,@fingerprint,@parent_id,@session_id)`).run(r),
  rulebook_constraints: (r) => handle.prepare(`
    INSERT OR REPLACE INTO rulebook_constraints (id,ts,rule_id,rule_name,domain,target,severity,expression,observed_value,threshold,breached,streak,session_id)
    VALUES (@id,@ts,@rule_id,@rule_name,@domain,@target,@severity,@expression,@observed_value,@threshold,@breached,@streak,@session_id)`).run(r),
  replay_events: (r) => handle.prepare(`
    INSERT OR REPLACE INTO replay_events (id,ts,seq,kind,severity,trace_id,parent_trace_id,source,target,payload_json,duration_ms,session_id)
    VALUES (@id,@ts,@seq,@kind,@severity,@trace_id,@parent_trace_id,@source,@target,@payload_json,@duration_ms,@session_id)`).run(r),
};

let n = 0;
for (const line of lines) {
  try {
    const { table, row } = JSON.parse(line) as { table: string; row: any };
    const fn = insertByTable[table];
    if (fn) { fn(row); n += 1; }
  } catch (e) {
    console.warn('skip seed line:', (e as Error).message);
  }
}
console.log(`seeded ${n} rows from coral/fixtures/seed.jsonl`);
