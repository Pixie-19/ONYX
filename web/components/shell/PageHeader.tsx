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

/** Per-route page header — short uppercase title, slim subtitle, right meta strip. */
export function PageHeader({ icon, title, subtitle, meta, className }: Props) {
  return (
    <header className={cn('px-4 py-3 border-b border-onyx-600/30 flex items-center gap-3 bg-onyx-950/40 backdrop-blur', className)}>
      {icon && <span className="text-cyan-glow">{icon}</span>}
      <div className="flex items-baseline gap-3 min-w-0">
        <h1 className="text-[13px] font-display tracking-[0.32em] uppercase text-onyx-100 glow-cyan truncate">{title}</h1>
        {subtitle && (
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-onyx-300 truncate">{subtitle}</p>
        )}
      </div>
      {meta && <div className="ml-auto flex items-center gap-2">{meta}</div>}
    </header>
  );
}

export function PageMeta({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

export { Badge };
