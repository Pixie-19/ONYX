import * as React from 'react';
import { cn } from '@/lib/format';

interface Props extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Lightweight scroll area — keeps the native overflow but enforces our themed
 * scrollbar via the global CSS. Acts as a near-drop-in for shadcn's variant
 * without pulling in the full Radix scroll area implementation.
 */
export const ScrollArea = React.forwardRef<HTMLDivElement, Props>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('relative overflow-auto', className)} {...props}>
      {children}
    </div>
  ),
);
ScrollArea.displayName = 'ScrollArea';
