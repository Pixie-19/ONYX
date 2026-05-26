'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/format';

/**
 * Badge — semantic pill used everywhere across ONYX.
 * Tones map to the muted, premium palette from globals.css `.pill` rules,
 * but the actual visual is implemented locally for finer control.
 *
 * API preserved exactly: tone / dot / children / className / standard HTML attrs.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2 h-[20px] text-[11px] font-medium tracking-tight border rounded-full select-none whitespace-nowrap leading-none',
  {
    variants: {
      tone: {
        info:     'text-[#4338CA] border-[#C7D2FE] bg-[#EEF2FF] dark:text-indigo-200 dark:border-indigo-400/30 dark:bg-indigo-400/10',
        warn:     'text-[#B45309] border-[#FCD34D] bg-[#FFFBEB] dark:text-amber-200 dark:border-amber-400/30 dark:bg-amber-400/10',
        error:    'text-[#B91C1C] border-[#FCA5A5] bg-[#FEF2F2] dark:text-red-200 dark:border-red-400/30 dark:bg-red-400/10',
        critical: 'text-[#991B1B] border-[#F87171] bg-[#FEE2E2] dark:text-red-200 dark:border-red-400/40 dark:bg-red-500/15 animate-pulse-slow',
        ok:       'text-[#047857] border-[#A7F3D0] bg-[#ECFDF5] dark:text-emerald-200 dark:border-emerald-400/30 dark:bg-emerald-400/10',
        muted:    'text-secondary border-line bg-surface-sunken',
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
          className="w-[6px] h-[6px] rounded-full"
          style={{ background: 'currentColor', opacity: 0.85 }}
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  ),
);
Badge.displayName = 'Badge';
