'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/format';

interface PanelProps {
  title?: string;
  badge?: ReactNode;
  right?: ReactNode;
  className?: string;
  inner?: string;
  children: ReactNode;
  scroll?: boolean;
}

/**
 * Modular surface card. Used as the building block for every page section.
 * Clean rounded chrome, soft shadow, no neon — premium, calm, scannable.
 *
 * API preserved: title / badge / right / inner / scroll / className still
 * work exactly as before so every existing page renders without changes.
 */
export function Panel({
  title,
  badge,
  right,
  className,
  inner,
  children,
  scroll = false,
}: PanelProps) {
  return (
    <div className={cn('panel flex flex-col', className)}>
      {(title || badge || right) && (
        <div className="flex-none flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
          <div className="flex items-center gap-2 min-w-0">
            {title && (
              <span className="text-[12.5px] font-semibold text-primary tracking-tight truncate">
                {title}
              </span>
            )}
            {badge}
          </div>
          {right && (
            <div className="text-[11.5px] text-secondary flex items-center gap-2 shrink-0">
              {right}
            </div>
          )}
        </div>
      )}
      <div
        className={cn(
          'flex-1 relative min-h-0',
          scroll && 'overflow-y-auto',
          inner ?? 'p-4',
        )}
      >
        {children}
      </div>
    </div>
  );
}
