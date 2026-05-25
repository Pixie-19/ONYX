import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const agentRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(agentRoot, '..');

function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

function envNumber(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: envNumber('ONYX_AGENT_PORT', 4311),
  host: env('ONYX_AGENT_HOST', '127.0.0.1'),
  workspaceRoot: path.resolve(env('ONYX_WORKSPACE_ROOT', repoRoot)),
  dbPath: path.resolve(env('ONYX_DB_PATH', path.join(agentRoot, 'data', 'onyx.db'))),
  jsonlDir: path.resolve(env('ONYX_JSONL_DIR', path.join(agentRoot, 'data', 'jsonl'))),
  blackout: {
    probe: env('ONYX_BLACKOUT_PROBE', 'https://api.mistral.ai/v1/models'),
    intervalMs: envNumber('ONYX_BLACKOUT_INTERVAL_MS', 5000),
    timeoutMs: envNumber('ONYX_BLACKOUT_TIMEOUT_MS', 1500),
  },
  mistral: {
    apiKey: env('MISTRAL_API_KEY', ''),
    model: env('MISTRAL_MODEL', 'codestral-latest'),
    endpoint: env('MISTRAL_ENDPOINT', 'https://api.mistral.ai/v1/chat/completions'),
  },
  ollama: {
    host: env('OLLAMA_HOST', 'http://127.0.0.1:11434'),
    model: env('OLLAMA_MODEL', 'open-codestral-7b'),
  },
  paths: {
    agentRoot,
    repoRoot,
  },
} as const;
