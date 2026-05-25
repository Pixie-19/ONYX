'use client';
import { useMemo } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { Sparkline } from '@/components/primitives/Sparkline';
import { SignalPill } from '@/components/primitives/SignalPill';

export function BuildStabilityIndex() {
  const stability = useOnyx((s) => s.buildStability);
  const events = useOnyx((s) => s.events);

  const history = useMemo(() => {
    // crude derived series: count severity-weighted events per 4s bucket
    const buckets = new Array<number>(40).fill(100);
    const now = Date.now();
    for (const ev of events) {
      const age = now - ev.ts;
      if (age > 40 * 4000) continue;
      const idx = 39 - Math.floor(age / 4000);
      if (idx < 0 || idx > 39) continue;
      const penalty = ev.severity === 'critical' ? 5 : ev.severity === 'error' ? 3 : ev.severity === 'warn' ? 1 : 0;
      buckets[idx] = Math.max(0, buckets[idx] - penalty);
    }
    return buckets;
  }, [events]);

  const band = stability > 80 ? 'info' : stability > 50 ? 'warn' : 'critical';

  return (
    <Panel
      title="BUILD STABILITY INDEX"
      right="LIVE · 4s BUCKETS"
      badge={<SignalPill severity={band as any} label={String(stability).padStart(3, '0')} />}
      className="h-full"
    >
      <div className="space-y-2">
        <Sparkline values={history} stroke="#46f5b8" fill="rgba(70,245,184,0.1)" width={260} height={56} thresholds={{ warn: 0.5, crit: 0.2 }} min={0} max={100} />
        <div className="text-[10px] tracking-[0.18em] uppercase text-onyx-300">
          BSI is a 0–100 score derived from the rate and severity of replay events across the last 5 minutes.
        </div>
      </div>
    </Panel>
  );
}
