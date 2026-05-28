import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Schemas live in /coral/schemas — load them at boot so the agent and the
// Coral source spec stay in lockstep.
const SCHEMA_FILES = [
  'workspace_entropy.sql',
  'network_trajectories.sql',
  'system_cybernetics.sql',
  'execution_snapshots.sql',
  'rulebook_constraints.sql',
  'replay_events.sql',
  'workspaces.sql',
  'workspace_processes.sql',
  'github_commits.sql',
  'github_sync_runs.sql',
];

function loadSchemas(): string {
  const coralDir = path.resolve(config.paths.repoRoot, 'coral', 'schemas');
  const fragments: string[] = [];
  for (const f of SCHEMA_FILES) {
    const p = path.join(coralDir, f);
    if (existsSync(p)) fragments.push(readFileSync(p, 'utf8'));
  }
  return fragments.join('\n');
}

export type OnyxDB = Database.Database;

let _db: OnyxDB | null = null;

export function db(): OnyxDB {
  if (_db) return _db;
  mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const instance = new Database(config.dbPath);
  instance.pragma('journal_mode = WAL');
  instance.pragma('synchronous = NORMAL');
  instance.pragma('foreign_keys = ON');
  instance.exec(loadSchemas());
  _db = instance;
  return instance;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
