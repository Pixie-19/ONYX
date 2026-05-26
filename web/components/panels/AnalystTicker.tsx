'use client';
import { useEffect, useRef } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { fmtShortTs, ONYX_HTTP } from '@/lib/format';

export function AnalystTicker() {
  const analyst = useOnyx((s) => s.analyst);
  const intel = useOnyx((s) => s.intelligence);
  const blackout = useOnyx((s) => s.blackout);
  const lastTrigger = useRef<number>(0);

  useEffect(() => {
    const id = setInterval(async () => {
      if (intel.length === 0) return;
      if (Date.now() - lastTrigger.current < 30_000) return;
      lastTrigger.current = Date.now();
      const i = intel[intel.length - 1];
      const prompt = `Operational state digest — ${i.title}. SQL summary: ${i.summary}. Severity ${i.severity}. Provide a single-sentence operator insight.`;
      try {
        await fetch(`${ONYX_HTTP}/analyst`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
      } catch {
        /* ignore */
      }
    }, 8000);
    return () => clearInterval(id);
  }, [intel]);

  const reversed = analyst.slice().reverse().slice(0, 12);

  return (
    <Panel
      title="Analyst · architectural insights"
      right={`Provider · ${blackout.provider}`}
      badge={
        <Badge tone={blackout.online ? 'info' : 'warn'}>
          {blackout.online ? 'Linked' : 'Blackout'}
        </Badge>
      }
      className="h-full"
      inner="p-0"
      scroll
    >
      <div>
        {reversed.map((a) => (
          <div
            key={a.id}
            className="px-4 py-3 border-b border-subtle hover:bg-surface-sunken transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-tertiary tabular-nums">{fmtShortTs(a.ts)}</span>
              <Badge
                tone={
                  a.provider === 'mistral'
                    ? 'info'
                    : a.provider === 'ollama'
                      ? 'warn'
                      : 'muted'
                }
              >
                {a.provider}
              </Badge>
            </div>
            <div className="text-[13px] text-primary leading-relaxed mt-1.5">{a.text}</div>
          </div>
        ))}
        {reversed.length === 0 && (
          <div className="px-4 py-8 text-center text-[12.5px] text-secondary">
            Awaiting first analyst digest…
          </div>
        )}
      </div>
    </Panel>
  );
}
