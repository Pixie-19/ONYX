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

export function Panel({ title, badge, right, className, inner, children, scroll = false }: PanelProps) {
  return (
    <div className={cn('panel flex flex-col', className)}>
      <span className="bracket-top-l" />
      <span className="bracket-top-r" />
      <span className="bracket-bot-l" />
      <span className="bracket-bot-r" />
      {(title || badge || right) && (
        <div className="flex-none flex items-center justify-between px-3 py-2 border-b border-onyx-600/40 relative">
          <div className="flex items-center gap-2">
            {title && <span className="panel-label">{title}</span>}
            {badge}
          </div>
          {right && <div className="text-[10px] uppercase tracking-[0.18em] text-onyx-300">{right}</div>}
        </div>
      )}
      <div className={cn('flex-1 relative min-h-0', scroll && 'overflow-y-auto', inner ?? 'p-3')}>
        {children}
      </div>
    </div>
  );
}
