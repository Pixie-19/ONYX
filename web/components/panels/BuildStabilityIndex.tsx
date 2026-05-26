'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { Sparkline } from '@/components/primitives/Sparkline';
import { Badge } from '@/components/ui/Badge';

export function BuildStabilityIndex() {
  const stability = useOnyx((s) => s.buildStability);
  const events = useOnyx((s) => s.events);

  const history = useMemo(() => {
    const buckets = new Array<number>(40).fill(100);
    const now = Date.now();
    for (const ev of events) {
      const age = now - ev.ts;
      if (age > 40 * 4000) continue;
      const idx = 39 - Math.floor(age / 4000);
      if (idx < 0 || idx > 39) continue;
      const penalty =
        ev.severity === 'critical' ? 5 : ev.severity === 'error' ? 3 : ev.severity === 'warn' ? 1 : 0;
      buckets[idx] = Math.max(0, buckets[idx] - penalty);
    }
    return buckets;
  }, [events]);

  const tone = stability > 80 ? 'ok' : stability > 50 ? 'warn' : 'critical';
  const stroke = tone === 'ok' ? '#10B981' : tone === 'warn' ? '#F59E0B' : '#DC2626';
  const fill = tone === 'ok' ? 'rgba(16,185,129,0.10)' : tone === 'warn' ? 'rgba(245,158,11,0.10)' : 'rgba(220,38,38,0.10)';

  return (
    <Panel
      title="Build stability index"
      right="Live · 4s buckets"
      badge={<Badge tone={tone as any}>{stability}</Badge>}
      className="h-full"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] eyebrow">Current score</div>
            <div className="metric-xl mt-0.5">
              {stability}
              <span className="text-[14px] text-tertiary font-normal ml-1.5">/ 100</span>
            </div>
          </div>
          <div className="flex-1 ml-8">
            <Sparkline
              values={history}
              stroke={stroke}
              fill={fill}
              width={360}
              height={64}
              thresholds={{ warn: 0.5, crit: 0.2 }}
              min={0}
              max={100}
            />
          </div>
        </div>
        <div className="text-[12px] text-secondary leading-relaxed">
          BSI is a 0–100 score derived from the rate and severity of replay events across the last
          5 minutes. Critical events apply a 5-point penalty per 4-second window, errors 3 points,
          warnings 1 point.
        </div>
      </div>
    </Panel>
  );
}
