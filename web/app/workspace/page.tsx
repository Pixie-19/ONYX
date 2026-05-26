'use client';
import { useMemo } from 'react';
import { Folder, FileCode } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Sparkline } from '@/components/primitives/Sparkline';
import { Badge } from '@/components/ui/Badge';
import { fmtShortTs } from '@/lib/format';

export default function WorkspacePage() {
  const workspace = useOnyx((s) => s.workspace);
  const events = useOnyx((s) => s.events);
  const topology = useOnyx((s) => s.topology);

  const velocity = useMemo(() => {
    const buckets = new Array<number>(36).fill(0);
    const now = Date.now();
    for (const w of workspace) {
      const age = now - w.ts;
      if (age > 36 * 5000) continue;
      const idx = 35 - Math.floor(age / 5000);
      if (idx >= 0 && idx < 36) buckets[idx] += 1;
    }
    return buckets;
  }, [workspace]);

  const fileRanking = useMemo(() => {
    const m = new Map<string, { events: number; bursts: number; lang: string; lastTs: number }>();
    for (const w of workspace) {
      const cur = m.get(w.file) ?? { events: 0, bursts: 0, lang: w.lang ?? '?', lastTs: 0 };
      m.set(w.file, {
        events: cur.events + 1,
        bursts: cur.bursts + w.burst_rate,
        lang: w.lang ?? cur.lang,
        lastTs: Math.max(cur.lastTs, w.ts),
      });
    }
    return [...m.entries()]
      .map(([file, v]) => ({ file, ...v, avgBurst: v.bursts / Math.max(1, v.events) }))
      .sort((a, b) => b.avgBurst - a.avgBurst)
      .slice(0, 14);
  }, [workspace]);

  const astEvents = useMemo(
    () =>
      events
        .filter((e) => e.kind === 'AST_COMPLEXITY_SPIKE' || e.kind === 'AST_DEPENDENCY_CHANGE')
        .slice(-30)
        .reverse(),
    [events],
  );

  const fileNodes = topology.nodes.filter((n) => n.kind === 'file');

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Folder size={16} />}
        title="Workspace cognition"
        subtitle="AST evolution · edit velocity · structural entropy"
        meta={
          <>
            <Badge tone="muted">{fileNodes.length} tracked files</Badge>
            <Badge tone="muted">{workspace.length} file events</Badge>
            <Badge tone="info">{astEvents.length} AST mutations</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-4 overflow-auto auto-rows-min surface-base">
        <Panel title="Edit velocity" right="5 second buckets" className="col-span-7 min-h-[260px]">
          <Sparkline
            values={velocity}
            width={620}
            height={170}
            stroke="#4F46E5"
            fill="rgba(79,70,229,0.10)"
            min={0}
            max={Math.max(2, ...velocity)}
          />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Stat label="Events · 3min" value={String(velocity.reduce((a, b) => a + b, 0))} />
            <Stat label="Peak / 5s" value={String(Math.max(0, ...velocity))} />
            <Stat label="Last window" value={String(velocity[velocity.length - 1] ?? 0)} />
          </div>
        </Panel>

        <Panel title="Entropy heatmap" right={`${fileRanking.length} hotspots`} className="col-span-5 min-h-[260px]" inner="p-0" scroll>
          <div>
            {fileRanking.map((f) => {
              const intensity = Math.min(1, f.avgBurst / 6);
              return (
                <div
                  key={f.file}
                  className="px-4 py-2.5 border-b border-subtle hover:bg-surface-sunken transition flex items-center gap-2"
                >
                  <FileCode size={13} className="text-tertiary shrink-0" />
                  <span className="text-[12.5px] text-primary truncate flex-1 font-mono">
                    {f.file}
                  </span>
                  <Badge tone="muted">{f.lang}</Badge>
                  <span className="text-[11px] text-tertiary tabular-nums w-10 text-right">
                    {f.events}×
                  </span>
                  <div className="w-[56px] h-[6px] rounded-full bg-surface-sunken overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${intensity * 100}%`,
                        background:
                          intensity > 0.6
                            ? 'linear-gradient(90deg, #4F46E5, #DC2626)'
                            : 'linear-gradient(90deg, #4F46E5, #7C3AED)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {fileRanking.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-secondary">
                Awaiting workspace activity…
              </div>
            )}
          </div>
        </Panel>

        <Panel title="AST mutation feed" right={`${astEvents.length}`} className="col-span-7 min-h-[280px]" inner="p-0" scroll>
          <div>
            {astEvents.map((e) => (
              <div
                key={e.id}
                className="px-4 py-2.5 border-b border-subtle hover:bg-surface-sunken transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-tertiary tabular-nums">
                    {fmtShortTs(e.ts)}
                  </span>
                  <Badge tone={e.severity as any}>
                    {e.kind.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                  <span className="text-[12.5px] text-primary truncate">{e.target}</span>
                </div>
                {e.payload && Object.keys(e.payload).length > 0 && (
                  <div className="text-[11.5px] text-tertiary mt-1 truncate font-mono">
                    {Object.entries(e.payload)
                      .slice(0, 4)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(' · ')}
                  </div>
                )}
              </div>
            ))}
            {astEvents.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-secondary">
                No AST mutations observed yet
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Structural footprint" right={`${fileNodes.length} files`} className="col-span-5 min-h-[280px]" inner="p-0" scroll>
          <div>
            {fileNodes.slice(0, 30).map((n) => (
              <div
                key={n.id}
                className="px-4 py-2 border-b border-subtle hover:bg-surface-sunken transition flex items-center gap-2"
              >
                <span
                  className="w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ background: '#4F46E5' }}
                />
                <span className="text-[12.5px] text-primary truncate flex-1 font-mono">{n.label}</span>
                <span className="text-[11.5px] text-tertiary tabular-nums">
                  {n.complexity?.toFixed?.(1) ?? '0.0'}
                </span>
              </div>
            ))}
            {fileNodes.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-secondary">
                Awaiting first execution snapshot…
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line surface-inset p-3">
      <div className="text-[11px] text-tertiary">{label}</div>
      <div className="text-[18px] font-semibold text-primary tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
