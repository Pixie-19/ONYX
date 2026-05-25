'use client';
import { Badge } from '@/components/ui/Badge';
import { FRAMEWORK_META } from '@/lib/frameworks';
import type { Framework } from '@/lib/types';

export function FrameworkBadge({ framework }: { framework: Framework | null }) {
  const meta = FRAMEWORK_META[framework ?? 'unknown'];
  return (
    <Badge
      tone="info"
      className="!text-[10px]"
      style={{ color: meta.color, borderColor: meta.color + '88', boxShadow: `0 0 8px ${meta.color}33` }}
    >
      {meta.label}
    </Badge>
  );
}
