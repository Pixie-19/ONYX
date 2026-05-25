'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { SignalPill } from '@/components/primitives/SignalPill';
import { fmtShortTs, ONYX_HTTP } from '@/lib/format';
import { severityClass } from '@/lib/colors';
import type { ReplayEvent, Severity } from '@/lib/types';

interface ReplayState {
  events: ReplayEvent[];
  windowFrom: number;
  windowTo: number;
  cursor: number;     // 0..1
  playing: boolean;
}

export function ReplayConsole() {
  const liveEvents = useOnyx((s) => s.events);
  const [state, setState] = useState<ReplayState>({
    events: [],
    windowFrom: 0,
    windowTo: 0,
    cursor: 1,
    playing: false,
  });
  const [mounted, setMounted] = useState(false);

  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    const to = Date.now();
    const from = to - 5 * 60_000;
    try {
      const r = await fetch(`${ONYX_HTTP}/replay/window?from=${from}&to=${to}`);
      const d = await r.json() as { events: ReplayEvent[] };
      setState((s) => ({ ...s, events: d.events ?? [], windowFrom: from, windowTo: to, cursor: 1 }));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    setMounted(true);
    setState((s) => ({ ...s, windowFrom: Date.now() - 5 * 60_000, windowTo: Date.now() }));
    void load();
  }, []);

  // also keep up with live tail when cursor is at 1
  useEffect(() => {
    if (state.cursor < 0.995) return;
    setState((s) => ({
      ...s,
      events: liveEvents.slice(-256),
      windowTo: Date.now(),
      windowFrom: Date.now() - 5 * 60_000,
    }));
  }, [liveEvents, state.cursor]);

  // playback
  useEffect(() => {
    if (!state.playing) {
      if (tick.current) { clearInterval(tick.current); tick.current = null; }
      return;
    }
    tick.current = setInterval(() => {
      setState((s) => {
        const next = Math.min(1, s.cursor + 1 / 120);
        return { ...s, cursor: next, playing: next < 1 };
      });
    }, 80);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [state.playing]);

  const cursorTs = state.windowFrom + (state.windowTo - state.windowFrom) * state.cursor;
  const visible = useMemo(() => state.events.filter((e) => e.ts <= cursorTs), [state.events, cursorTs]);

  // causal cluster: anything in last 1.5s of cursor
  const cluster = useMemo(() => visible.filter((e) => e.ts >= cursorTs - 1500), [visible, cursorTs]);

  return (
    <Panel
      title="CHRONO REPLAY · CAUSAL RECONSTRUCTION"
      right={`${visible.length}/${state.events.length} EVENTS`}
      className="h-full"
      inner="p-0"
    >
      <div className="grid grid-rows-[1fr_auto] h-full">
        <div className="p-3 overflow-auto font-mono text-[10.5px]">
          <div className="hr-label mb-2" suppressHydrationWarning>
            CURSOR · {mounted ? fmtShortTs(cursorTs) : '——:——:——'}
          </div>
          <CausalTree events={cluster} />
        </div>
        <div className="border-t border-onyx-600/30 p-3 space-y-2 bg-onyx-900/40">
          <Scrubber state={state} setState={setState} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setState((s) => ({ ...s, cursor: 0, playing: true }))}
              className="text-[10px] uppercase tracking-[0.22em] px-3 py-1.5 border border-cyan-glow/60 text-cyan-glow hover:bg-cyan-glow/10"
            >▶ PLAY</button>
            <button
              onClick={() => setState((s) => ({ ...s, playing: false }))}
              className="text-[10px] uppercase tracking-[0.22em] px-3 py-1.5 border border-onyx-600 text-onyx-100 hover:bg-onyx-700/40"
            >❚❚ PAUSE</button>
            <button
              onClick={load}
              className="text-[10px] uppercase tracking-[0.22em] px-3 py-1.5 border border-violet-glow/60 text-violet-glow hover:bg-violet-glow/10"
            >↺ RELOAD</button>
            <div className="ml-auto text-[10px] tracking-[0.18em] uppercase text-onyx-300" suppressHydrationWarning>
              {mounted ? <>WINDOW · {fmtShortTs(state.windowFrom)} → {fmtShortTs(state.windowTo)}</> : <>WINDOW · ——</>}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Scrubber({ state, setState }: { state: ReplayState; setState: React.Dispatch<React.SetStateAction<ReplayState>> }) {
  const ref = useRef<HTMLDivElement>(null);

  // distribute events along the bar as ticks
  const ticks = useMemo(() => {
    if (state.events.length === 0) return [];
    return state.events.map((e) => {
      const u = (e.ts - state.windowFrom) / Math.max(1, state.windowTo - state.windowFrom);
      return { u: Math.max(0, Math.min(1, u)), severity: e.severity as Severity };
    });
  }, [state.events, state.windowFrom, state.windowTo]);

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setState((s) => ({ ...s, cursor: u, playing: false }));
  };

  return (
    <div
      ref={ref}
      onMouseDown={onMove}
      onMouseMove={(e) => { if (e.buttons === 1) onMove(e); }}
      className="relative h-7 bg-onyx-950 border border-onyx-600/40 cursor-pointer select-none"
    >
      {ticks.map((t, i) => (
        <span
          key={i}
          className="absolute top-1 bottom-1"
          style={{
            left: `${(t.u * 100).toFixed(2)}%`,
            width: 1,
            background:
              t.severity === 'critical' ? '#ff2d6b' :
              t.severity === 'error' ? '#ff5d6f' :
              t.severity === 'warn' ? '#ffb84a' : '#22e8ff',
            opacity: 0.55,
          }}
        />
      ))}
      <span
        className="absolute top-0 bottom-0 w-[1.5px] bg-cyan-glow shadow-cyan-glow"
        style={{ left: `${(state.cursor * 100).toFixed(2)}%` }}
      />
    </div>
  );
}

function CausalTree({ events }: { events: ReplayEvent[] }) {
  // group by trace_id, then nest by parent_trace_id
  const byTrace = useMemo(() => {
    const m = new Map<string, ReplayEvent[]>();
    for (const e of events) {
      const arr = m.get(e.trace_id) ?? [];
      arr.push(e);
      m.set(e.trace_id, arr);
    }
    return m;
  }, [events]);

  const roots = useMemo(() => events.filter((e) => !e.parent_trace_id || !byTrace.has(e.parent_trace_id)).slice(0, 30), [events, byTrace]);

  if (events.length === 0) {
    return <div className="text-onyx-300 text-[10px] uppercase tracking-[0.18em]">no events in window cursor zone</div>;
  }
  return (
    <div className="space-y-1">
      {roots.map((e) => <CausalRow key={e.id} ev={e} byTrace={byTrace} depth={0} />)}
    </div>
  );
}

function CausalRow({ ev, byTrace, depth }: { ev: ReplayEvent; byTrace: Map<string, ReplayEvent[]>; depth: number }) {
  const children = useMemo(() => {
    const out: ReplayEvent[] = [];
    for (const arr of byTrace.values()) {
      for (const e of arr) {
        if (e.parent_trace_id === ev.trace_id && e.id !== ev.id) out.push(e);
      }
    }
    return out;
  }, [ev.trace_id, byTrace]);

  return (
    <div>
      <div
        className="flex items-center gap-2"
        style={{ paddingLeft: depth * 14 }}
      >
        <span className="text-onyx-300 tabular-nums w-[88px]">{fmtShortTs(ev.ts)}</span>
        <span className={severityClass(ev.severity)}>{ev.kind}</span>
        <span className="text-onyx-100 truncate">{ev.target ?? ev.source}</span>
      </div>
      {children.slice(0, 8).map((c) => <CausalRow key={c.id} ev={c} byTrace={byTrace} depth={depth + 1} />)}
    </div>
  );
}
