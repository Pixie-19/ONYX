import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function fmtMs(n: number): string {
  if (n < 1) return `${(n * 1000).toFixed(0)}µs`;
  if (n < 1000) return `${n.toFixed(1)}ms`;
  return `${(n / 1000).toFixed(2)}s`;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)}KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)}MB`;
  return `${(n / 1024 ** 3).toFixed(2)}GB`;
}

export function fmtClock(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().slice(11, 23);
}

export function fmtShortTs(ts: number): string {
  return new Date(ts).toISOString().slice(11, 19);
}

export function fmtPct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export const ONYX_HTTP = process.env.NEXT_PUBLIC_ONYX_AGENT_HTTP ?? 'http://127.0.0.1:4311';
