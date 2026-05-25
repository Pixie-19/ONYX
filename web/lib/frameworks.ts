import type { Framework } from './types';

export const FRAMEWORK_META: Record<Framework, { label: string; color: string; group: string }> = {
  next:              { label: 'Next.js',         color: '#ffffff', group: 'web' },
  react:             { label: 'React',           color: '#61dafb', group: 'web' },
  vite:              { label: 'Vite',            color: '#bd34fe', group: 'web' },
  node:              { label: 'Node.js',         color: '#46f5b8', group: 'server' },
  express:           { label: 'Express',         color: '#46f5b8', group: 'server' },
  fastify:           { label: 'Fastify',         color: '#22e8ff', group: 'server' },
  bun:               { label: 'Bun',             color: '#f4d35e', group: 'server' },
  python:            { label: 'Python',          color: '#ffb84a', group: 'server' },
  fastapi:           { label: 'FastAPI',         color: '#22e8ff', group: 'server' },
  django:            { label: 'Django',          color: '#46f5b8', group: 'server' },
  flask:             { label: 'Flask',           color: '#9b6cff', group: 'server' },
  go:                { label: 'Go',              color: '#22e8ff', group: 'server' },
  rust:              { label: 'Rust',            color: '#ffb84a', group: 'server' },
  java:              { label: 'Java',            color: '#ff5d6f', group: 'server' },
  docker:            { label: 'Docker',          color: '#22e8ff', group: 'infra' },
  turborepo:         { label: 'Turborepo',       color: '#9b6cff', group: 'infra' },
  'pnpm-workspaces': { label: 'pnpm workspaces', color: '#ff6cd6', group: 'infra' },
  unknown:           { label: 'Unknown',         color: '#506583', group: 'unknown' },
};

export const PACKAGE_MANAGER_META: Record<string, { label: string; color: string }> = {
  npm:    { label: 'npm',    color: '#ff5d6f' },
  pnpm:   { label: 'pnpm',   color: '#ff6cd6' },
  yarn:   { label: 'yarn',   color: '#22e8ff' },
  bun:    { label: 'Bun',    color: '#f4d35e' },
  pip:    { label: 'pip',    color: '#ffb84a' },
  poetry: { label: 'poetry', color: '#9b6cff' },
};
