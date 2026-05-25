import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import { bus, SESSION_ID } from '../bus/eventBus.js';
import type { ExecutionSnapshotRow } from '../types.js';

// Lightweight, dependency-free structural analyser.
//
// We deliberately avoid bundling tree-sitter binaries (Windows install pain)
// in the hackathon build. The Coral source spec still advertises tree-sitter
// as the AST contract; this analyser is a faithful proxy emitting the same
// shape — function/class/import counts, an LOC measure, and a cyclomatic
// complexity estimate. Swap the body of `analyse()` for a tree-sitter pass
// later without changing any consumers.

const FN_REGEX = /(?:^|\s)(?:async\s+)?function\s+\w+|=>\s*\{|\bdef\s+\w+|\bfn\s+\w+|\bfunc\s+\w+/g;
const CLASS_REGEX = /\bclass\s+\w+|\bstruct\s+\w+|\binterface\s+\w+|\btrait\s+\w+/g;
const IMPORT_REGEX = /(?:^|\n)\s*(?:import\s+[^;\n]+|from\s+['"][^'"]+['"]\s+import\s+[^;\n]+|require\(['"][^'"]+['"]\))/g;
const IMPORT_TARGET = /(?:from\s+|require\()\s*['"]([^'"]+)['"]/g;
const EXPORT_REGEX = /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g;
const COMPLEXITY_REGEX = /\b(if|else if|for|while|case|catch|&&|\|\||\?)/g;

const ALLOWED_LANGS = new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java']);

interface AnalysisResult {
  function_count: number;
  class_count: number;
  import_count: number;
  imports: string[];
  exports: string[];
  loc: number;
  complexity: number;
  fingerprint: string;
  syntax_fail: boolean;
}

function analyse(text: string): AnalysisResult {
  const fns = text.match(FN_REGEX) ?? [];
  const cls = text.match(CLASS_REGEX) ?? [];
  const imps = text.match(IMPORT_REGEX) ?? [];
  const cplx = text.match(COMPLEXITY_REGEX) ?? [];
  const loc = text.split('\n').filter(l => l.trim().length).length;

  const imports: string[] = [];
  for (const m of text.matchAll(IMPORT_TARGET)) imports.push(m[1]);

  const exports: string[] = [];
  for (const m of text.matchAll(EXPORT_REGEX)) exports.push(m[1]);

  // Crude syntax-failure heuristic: unbalanced brackets.
  const open = (text.match(/[\{\(\[]/g) ?? []).length;
  const close = (text.match(/[\}\)\]]/g) ?? []).length;
  const syntax_fail = Math.abs(open - close) > 3;

  const fingerprint = createHash('sha1')
    .update(`${fns.length}:${cls.length}:${imports.join(',')}:${loc}:${cplx.length}`)
    .digest('hex')
    .slice(0, 12);

  return {
    function_count: fns.length,
    class_count: cls.length,
    import_count: imps.length,
    imports,
    exports,
    loc,
    complexity: Number((cplx.length + fns.length * 0.5).toFixed(2)),
    fingerprint,
    syntax_fail,
  };
}

// per-file previous fingerprint, to compute delta
const lastByFile = new Map<string, { snapshotId: string; complexity: number; fingerprint: string }>();

export function startAst(): void {
  bus.on('file', async (ev: { event: 'add' | 'change' | 'unlink' | 'rename'; file: string; abs?: string; ts: number; displayFile?: string; workspace_id?: string }) => {
    if (ev.event === 'unlink') {
      lastByFile.delete(ev.displayFile ?? ev.file);
      return;
    }
    const key = ev.displayFile ?? ev.file;
    const lang = path.extname(ev.file).slice(1);
    if (!ALLOWED_LANGS.has(lang)) return;
    const abs = ev.abs ?? ev.file;
    let text: string;
    try {
      text = await readFile(abs, 'utf8');
    } catch { return; }
    if (text.length > 512_000) return; // skip pathologically large files

    const a = analyse(text);
    const prev = lastByFile.get(key);
    const delta = prev ? Math.abs(a.complexity - prev.complexity) : a.complexity;

    const snapshot: ExecutionSnapshotRow = {
      id: `es_${nanoid(12)}`,
      ts: Date.now(),
      file: key,
      lang,
      function_count: a.function_count,
      class_count: a.class_count,
      import_count: a.import_count,
      loc: a.loc,
      complexity: a.complexity,
      imports_json: JSON.stringify(a.imports),
      exports_json: JSON.stringify(a.exports),
      fingerprint: a.fingerprint,
      parent_id: prev?.snapshotId ?? null,
      session_id: SESSION_ID,
    };
    bus.emitSnapshot(snapshot);
    lastByFile.set(key, { snapshotId: snapshot.id, complexity: a.complexity, fingerprint: a.fingerprint });

    if (a.syntax_fail) {
      bus.emitReplayEvent({
        kind: 'SYNTAX_FAILURE',
        severity: 'error',
        source: 'interceptor.ast',
        target: key,
        payload: { complexity: a.complexity },
      });
    }

    if (delta > 8) {
      bus.emitReplayEvent({
        kind: 'AST_COMPLEXITY_SPIKE',
        severity: delta > 16 ? 'critical' : 'warn',
        source: 'interceptor.ast',
        target: key,
        payload: { complexity: a.complexity, delta: Number(delta.toFixed(2)) },
      });
    }

    if (prev && prev.fingerprint !== a.fingerprint) {
      bus.emitReplayEvent({
        kind: 'AST_DEPENDENCY_CHANGE',
        source: 'interceptor.ast',
        target: key,
        payload: { imports: a.imports.slice(0, 16) },
      });
    }
  });
}
