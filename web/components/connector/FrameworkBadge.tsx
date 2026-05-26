'use client';
import { Badge } from '@/components/ui/Badge';
import { FRAMEWORK_META } from '@/lib/frameworks';
import type { Framework } from '@/lib/types';

export function FrameworkBadge({ framework }: { framework: Framework | null }) {
  const meta = FRAMEWORK_META[framework ?? 'unknown'];
  return (
    <Badge
      tone="muted"
      className="!text-[10.5px]"
      style={{ color: meta.color, borderColor: meta.color + '40' }}
    >
      {meta.label}
    </Badge>
  );
}
