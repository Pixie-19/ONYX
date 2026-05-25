'use client';
import * as React from 'react';
import { cn } from '@/lib/format';

interface ResizableProps {
  /** Initial pixel size of the FIRST pane. */
  initial: number;
  /** Min size of the first pane. */
  min?: number;
  /** Max size of the first pane. */
  max?: number;
  direction?: 'horizontal' | 'vertical';
  className?: string;
  children: [React.ReactNode, React.ReactNode];
}

/**
 * Two-pane drag-to-resize splitter. No external dependency — keeps mount weight
 * small and avoids shadcn's resizable wrapper. The handle is themed via CSS.
 */
export function Resizable({
  initial, min = 120, max = 1200, direction = 'horizontal', className, children,
}: ResizableProps) {
  const [size, setSize] = React.useState(initial);
  const dragging = React.useRef(false);
  const startRef = React.useRef({ pos: 0, size: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startRef.current.pos = direction === 'horizontal' ? e.clientX : e.clientY;
    startRef.current.size = size;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const cur = direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = cur - startRef.current.pos;
    let next = startRef.current.size + delta;
    next = Math.max(min, Math.min(max, next));
    setSize(next);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
  };

  const isH = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className={cn(isH ? 'flex flex-row min-w-0' : 'flex flex-col min-h-0', className)}
    >
      <div style={isH ? { width: size } : { height: size }} className="min-w-0 min-h-0 overflow-hidden">
        {children[0]}
      </div>
      <div
        role="separator"
        aria-orientation={isH ? 'vertical' : 'horizontal'}
        className={cn('resize-handle', !isH && 'row')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden">{children[1]}</div>
    </div>
  );
}
