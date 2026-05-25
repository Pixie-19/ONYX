import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Framework } from '../types.js';

interface DetectionResult {
  framework: Framework;
  package_manager: string | null;
  language: string | null;
  scripts: Record<string, string>;
  dependencies: string[];
  meta: Record<string, unknown>;
}

const PRESENCE_PROBES: Array<{ file: string; framework?: Framework; package_manager?: string; language?: string; meta?: Record<string, unknown> }> = [
  { file: 'next.config.js',     framework: 'next',           language: 'ts' },
  { file: 'next.config.mjs',    framework: 'next',           language: 'ts' },
  { file: 'next.config.ts',     framework: 'next',           language: 'ts' },
  { file: 'vite.config.ts',     framework: 'vite',           language: 'ts' },
  { file: 'vite.config.js',     framework: 'vite',           language: 'js' },
  { file: 'turbo.json',         framework: 'turborepo' },
  { file: 'pnpm-workspace.yaml',framework: 'pnpm-workspaces' },
  { file: 'pnpm-lock.yaml',     package_manager: 'pnpm' },
  { file: 'bun.lockb',          package_manager: 'bun' },
  { file: 'yarn.lock',          package_manager: 'yarn' },
  { file: 'package-lock.json',  package_manager: 'npm' },
  { file: 'Dockerfile',         framework: 'docker' },
  { file: 'docker-compose.yml', framework: 'docker' },
  { file: 'docker-compose.yaml',framework: 'docker' },
  { file: 'requirements.txt',   language: 'py' },
  { file: 'pyproject.toml',     language: 'py' },
  { file: 'go.mod',             framework: 'go',             language: 'go' },
  { file: 'Cargo.toml',         framework: 'rust',           language: 'rs' },
  { file: 'pom.xml',            framework: 'java',           language: 'java' },
  { file: 'tsconfig.json',      language: 'ts' },
];

const DEP_SIGNATURES: Array<{ dep: string; framework: Framework }> = [
  { dep: 'next',          framework: 'next' },
  { dep: 'react',         framework: 'react' },
  { dep: 'vite',          framework: 'vite' },
  { dep: 'express',       framework: 'express' },
  { dep: 'fastify',       framework: 'fastify' },
  { dep: 'fastapi',       framework: 'fastapi' },
  { dep: 'django',        framework: 'django' },
  { dep: 'flask',         framework: 'flask' },
];

export async function detectFramework(workspacePath: string): Promise<DetectionResult> {
  const result: DetectionResult = {
    framework: 'unknown',
    package_manager: null,
    language: null,
    scripts: {},
    dependencies: [],
    meta: {},
  };

  // ── file presence probes ──
  for (const probe of PRESENCE_PROBES) {
    const p = path.join(workspacePath, probe.file);
    if (existsSync(p)) {
      if (probe.framework && result.framework === 'unknown') result.framework = probe.framework;
      if (probe.package_manager && !result.package_manager) result.package_manager = probe.package_manager;
      if (probe.language && !result.language) result.language = probe.language;
      if (probe.meta) result.meta = { ...result.meta, ...probe.meta };
    }
  }

  // ── package.json (Node ecosystem) ──
  const pkgPath = path.join(workspacePath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const raw = await readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(raw) as {
        name?: string;
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        type?: string;
        engines?: Record<string, string>;
      };
      result.scripts = pkg.scripts ?? {};
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      result.dependencies = Object.keys(deps);

      // signature match — first hit wins, with Next > React priority preserved.
      for (const sig of DEP_SIGNATURES) {
        if (deps[sig.dep] && (result.framework === 'unknown' || (sig.framework === 'next' && result.framework === 'react'))) {
          result.framework = sig.framework;
          break;
        }
      }

      if (!result.package_manager) result.package_manager = 'npm';
      if (!result.language) {
        if (deps['typescript'] || existsSync(path.join(workspacePath, 'tsconfig.json'))) result.language = 'ts';
        else result.language = 'js';
      }
      if (pkg.name) result.meta.package_name = pkg.name;
      if (pkg.engines?.node) result.meta.node_engine = pkg.engines.node;
    } catch {
      // unreadable package.json — keep what we have
    }
  }

  // ── Python ──
  if (result.language === 'py' && result.framework === 'unknown') {
    const reqPath = path.join(workspacePath, 'requirements.txt');
    if (existsSync(reqPath)) {
      try {
        const txt = await readFile(reqPath, 'utf8');
        if (/^\s*fastapi/m.test(txt)) result.framework = 'fastapi';
        else if (/^\s*django/m.test(txt)) result.framework = 'django';
        else if (/^\s*flask/m.test(txt)) result.framework = 'flask';
        else result.framework = 'python';
      } catch { /* ignore */ }
    } else {
      result.framework = 'python';
    }
  }

  if (result.framework === 'unknown' && result.dependencies.length > 0) {
    result.framework = 'node';
  }

  // sanity: workspace must actually exist + be a directory
  try {
    const s = await stat(workspacePath);
    if (!s.isDirectory()) throw new Error('not a directory');
  } catch {
    result.framework = 'unknown';
  }

  return result;
}
