'use client';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useOnyx } from '@/lib/store';
import type { EventKind } from '@/lib/types';

// Map kinds that deserve a toast to their tone + label.
const TOAST_RULES: Partial<Record<EventKind, { type: 'error' | 'warning' | 'success' | 'info' | 'critical'; label: string }>> = {
  BUILD_CRASH:          { type: 'error',    label: 'Build crash' },
  COMPILER_FAILURE:     { type: 'error',    label: 'Compiler failure' },
  DEPENDENCY_DEGRADED:  { type: 'warning',  label: 'Dependency degraded' },
  LATENCY_SURGE:        { type: 'warning',  label: 'Latency surge' },
  BLACKOUT_ENTER:       { type: 'error',    label: 'Blackout protocol engaged' },
  BLACKOUT_EXIT:        { type: 'success',  label: 'Inference link restored' },
  RULE_BREACH:          { type: 'warning',  label: 'Rule breach' },
  THERMAL_ALERT:        { type: 'warning',  label: 'Thermal alert' },
};

/**
 * Watches the event stream and surfaces critical events as Sonner toasts.
 * Throttled per-kind so a cascade doesn't drown the user.
 */
export function ToastBridge() {
  const events = useOnyx((s) => s.events);
  const lastSeqRef = useRef<number>(0);
  const lastFireRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[events.length - 1];
    if (latest.seq <= lastSeqRef.current) return;
    lastSeqRef.current = latest.seq;

    const rule = TOAST_RULES[latest.kind];
    if (!rule) return;

    const now = Date.now();
    const prev = lastFireRef.current[latest.kind] ?? 0;
    if (now - prev < 2500) return; // throttle bursts
    lastFireRef.current[latest.kind] = now;

    const body = `${latest.target ?? latest.source}${latest.payload ? ' · ' + summarise(latest.payload) : ''}`;
    switch (rule.type) {
      case 'error':   toast.error(rule.label, { description: body }); break;
      case 'warning': toast.warning(rule.label, { description: body }); break;
      case 'success': toast.success(rule.label, { description: body }); break;
      default:        toast(rule.label, { description: body });
    }
  }, [events]);

  return null;
}

function summarise(p: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      parts.push(`${k}=${v}`);
    }
    if (parts.length >= 3) break;
  }
  return parts.join(' · ');
}
