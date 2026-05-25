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

  // edit velocity over time (events per 5s bucket, last 3min)
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

  // per-file entropy ranking
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

  // AST evolution: number of execution_snapshots (proxy: AST_DEPENDENCY_CHANGE events)
  const astEvents = useMemo(
    () => events.filter((e) => e.kind === 'AST_COMPLEXITY_SPIKE' || e.kind === 'AST_DEPENDENCY_CHANGE').slice(-30).reverse(),
    [events],
  );

  const fileNodes = topology.nodes.filter((n) => n.kind === 'file');

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Folder size={14} />}
        title="WORKSPACE COGNITION"
        subtitle="AST evolution · edit velocity · structural entropy"
        meta={
          <>
            <Badge tone="muted">{fileNodes.length} TRACKED FILES</Badge>
            <Badge tone="muted">{workspace.length} FILE EVENTS</Badge>
            <Badge tone="info">{astEvents.length} AST MUTATIONS</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-3 grid grid-cols-12 gap-3 overflow-auto auto-rows-min">
        <Panel title="EDIT VELOCITY" right="5s BUCKETS" className="col-span-7 min-h-[220px]">
          <Sparkline values={velocity} width={520} height={150} stroke="#22e8ff" fill="rgba(34,232,255,0.14)" min={0} max={Math.max(2, ...velocity)} />
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat label="EVENTS · 3MIN"  value={String(velocity.reduce((a,b)=>a+b,0))} />
            <Stat label="PEAK / 5S"      value={String(Math.max(0, ...velocity))} />
            <Stat label="LAST WINDOW"    value={String(velocity[velocity.length-1] ?? 0)} />
          </div>
        </Panel>

        <Panel title="ENTROPY HEATMAP" right={`${fileRanking.length} HOTSPOTS`} className="col-span-5 min-h-[220px]" inner="p-0" scroll>
          <div className="font-mono text-[10.5px]">
            {fileRanking.map((f) => {
              const intensity = Math.min(1, f.avgBurst / 6);
              return (
                <div key={f.file} className="px-3 py-1.5 border-b border-onyx-600/15 hover:bg-onyx-700/20 flex items-center gap-2">
                  <FileCode size={11} className="text-onyx-300 shrink-0" />
                  <span className="text-onyx-100 truncate flex-1">{f.file}</span>
                  <Badge tone="muted" className="!py-0">{f.lang}</Badge>
                  <span className="text-onyx-300 tabular-nums w-12 text-right">{f.events}×</span>
                  <div className="w-[42px] h-[6px] bg-onyx-900 border border-onyx-600/40 relative">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${intensity * 100}%`,
                        background: intensity > 0.6 ? 'linear-gradient(90deg, rgba(34,232,255,0.4), #ff2d6b)' : 'linear-gradient(90deg, rgba(34,232,255,0.4), #22e8ff)',
                        boxShadow: '0 0 4px currentColor',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {fileRanking.length === 0 && (
              <div className="px-3 py-4 text-[10px] uppercase tracking-[0.18em] text-onyx-300">awaiting workspace activity…</div>
            )}
          </div>
        </Panel>

        <Panel title="AST MUTATION FEED" right={`${astEvents.length}`} className="col-span-7 min-h-[260px]" inner="p-0" scroll>
          <div className="font-mono text-[10.5px]">
            {astEvents.map((e) => (
              <div key={e.id} className="px-3 py-1.5 border-b border-onyx-600/15 hover:bg-onyx-700/20">
                <div className="flex items-center gap-2">
                  <span className="text-onyx-300 tabular-nums">{fmtShortTs(e.ts)}</span>
                  <Badge tone={e.severity as any}>{e.kind}</Badge>
                  <span className="text-onyx-100 truncate">{e.target}</span>
                </div>
                {e.payload && Object.keys(e.payload).length > 0 && (
                  <div className="text-[10px] text-onyx-300 mt-0.5 truncate">
                    {Object.entries(e.payload).slice(0,4).map(([k,v]) => `${k}=${v}`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            {astEvents.length === 0 && (
              <div className="px-3 py-4 text-[10px] uppercase tracking-[0.18em] text-onyx-300">no AST mutations observed yet</div>
            )}
          </div>
        </Panel>

        <Panel title="STRUCTURAL FOOTPRINT" right={`${fileNodes.length} FILES`} className="col-span-5 min-h-[260px]" inner="p-0" scroll>
          <div className="font-mono text-[10.5px]">
            {fileNodes.slice(0, 30).map((n) => (
              <div key={n.id} className="px-3 py-1.5 border-b border-onyx-600/15 hover:bg-onyx-700/20 flex items-center gap-2">
                <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: '#22e8ff', boxShadow: '0 0 4px #22e8ff' }} />
                <span className="text-onyx-100 truncate flex-1">{n.label}</span>
                <span className="text-onyx-300 tabular-nums">{n.complexity?.toFixed?.(1) ?? '0.0'}</span>
              </div>
            ))}
            {fileNodes.length === 0 && (
              <div className="px-3 py-4 text-[10px] uppercase tracking-[0.18em] text-onyx-300">awaiting first execution_snapshot…</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-onyx-600/30 px-2 py-1.5 bg-onyx-900/40">
      <div className="panel-label">{label}</div>
      <div className="text-onyx-100 font-mono text-[13px] tabular-nums">{value}</div>
    </div>
  );
}
