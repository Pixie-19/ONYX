'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/format';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2 py-[2px] text-[10px] font-mono uppercase tracking-[0.18em] border rounded-[2px] select-none',
  {
    variants: {
      tone: {
        info:     'text-signal-info     border-signal-info/55     bg-signal-info/[0.06]',
        warn:     'text-signal-warn     border-signal-warn/55     bg-signal-warn/[0.06]',
        error:    'text-signal-error    border-signal-error/55    bg-signal-error/[0.06]',
        critical: 'text-signal-critical border-signal-critical/70 bg-signal-critical/[0.08] animate-pulse-slow',
        ok:       'text-signal-ok       border-signal-ok/55       bg-signal-ok/[0.06]',
        muted:    'text-onyx-300        border-onyx-600/40        bg-onyx-700/30',
      },
      dot: {
        true:  '',
        false: '',
      },
    },
    defaultVariants: { tone: 'info', dot: true },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, dot, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ tone, dot }), className)} {...props}>
      {dot && (
        <span
          className="w-[5px] h-[5px] rounded-full"
          style={{ background: 'currentColor', boxShadow: '0 0 6px currentColor' }}
        />
      )}
      {children}
    </span>
  ),
);
Badge.displayName = 'Badge';
