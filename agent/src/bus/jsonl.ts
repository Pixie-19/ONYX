import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const streams = new Map<string, WriteStream>();

function streamFor(table: string): WriteStream {
  const cached = streams.get(table);
  if (cached) return cached;
  mkdirSync(config.jsonlDir, { recursive: true });
  const file = path.join(config.jsonlDir, `${table}.jsonl`);
  const s = createWriteStream(file, { flags: 'a' });
  streams.set(table, s);
  return s;
}

/**
 * Mirror a row into the JSONL ingestion path that the Coral source spec tails.
 * One file per table — `agent/data/jsonl/<table>.jsonl`.
 */
export function writeJsonl(table: string, row: unknown): void {
  try {
    streamFor(table).write(JSON.stringify({ table, row }) + '\n');
  } catch {
    // best-effort — never crash the event bus on disk hiccups
  }
}

export function closeJsonl(): void {
  for (const s of streams.values()) s.end();
  streams.clear();
}
