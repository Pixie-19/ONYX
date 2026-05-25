'use client';
import * as React from 'react';
import * as RT from '@radix-ui/react-tooltip';
import { cn } from '@/lib/format';

export const TooltipProvider = RT.Provider;
export const TooltipRoot = RT.Root;
export const TooltipTrigger = RT.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof RT.Content>,
  React.ComponentPropsWithoutRef<typeof RT.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <RT.Portal>
    <RT.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn('tooltip-content', className)}
      {...props}
    />
  </RT.Portal>
));
TooltipContent.displayName = 'TooltipContent';

interface TooltipProps {
  label: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delay?: number;
  children: React.ReactNode;
}

export function Tooltip({ label, side = 'right', align = 'center', delay = 80, children }: TooltipProps) {
  return (
    <TooltipProvider delayDuration={delay} skipDelayDuration={50}>
      <TooltipRoot>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align}>{label}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}
