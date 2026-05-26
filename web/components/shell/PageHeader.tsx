'use client';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/format';

interface Props {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  /** Right-side meta: typically badges and small live counters. */
  meta?: ReactNode;
  className?: string;
}

/**
 * Per-route page header — large, calm title with a quiet subtitle and an
 * optional right-side meta strip (status pills, counters, action buttons).
 */
export function PageHeader({ icon, title, subtitle, meta, className }: Props) {
  return (
    <header
      className={cn(
        'px-6 py-5 border-b border-line flex items-center gap-4 bg-surface-raised',
        className,
      )}
    >
      {icon && (
        <div className="w-9 h-9 rounded-lg surface-sunken flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <h1 className="text-[18px] font-semibold tracking-tight text-primary leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12.5px] text-secondary mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {meta && (
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          {meta}
        </div>
      )}
    </header>
  );
}

export function PageMeta({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

export { Badge };
