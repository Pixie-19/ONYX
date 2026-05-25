'use client';
import { cn } from '@/lib/format';
import type { Severity } from '@/lib/types';

interface SignalPillProps {
  severity: Severity | 'ok' | 'breach';
  label: string;
  className?: string;
}

export function SignalPill({ severity, label, className }: SignalPillProps) {
  const cls = severity === 'breach' ? 'critical' : severity;
  return (
    <span className={cn('pill', cls, className)}>
      <span className="dot" />
      {label}
    </span>
  );
}
