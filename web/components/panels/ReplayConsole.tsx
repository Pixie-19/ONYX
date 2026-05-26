'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { Panel } from '@/components/primitives/Panel';
import { fmtShortTs, ONYX_HTTP } from '@/lib/format';
import type { ReplayEvent, Severity } from '@/lib/types';

interface ReplayState {
  events: ReplayEvent[];
  windowFrom: number;
  windowTo: number;
  cursor: number;
  playing: boolean;
}

const SEV_COLOR: Record<Severity, string> = {
  info:     '#4F46E5',
  warn:     '#F59E0B',
  error:    '#EF4444',
  critical: '#DC2626',
};

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
      const d = (await r.json()) as { events: ReplayEvent[] };
      setState((s) => ({
        ...s,
        events: d.events ?? [],
        windowFrom: from,
        windowTo: to,
        cursor: 1,
      }));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    setMounted(true);
    setState((s) => ({ ...s, windowFrom: Date.now() - 5 * 60_000, windowTo: Date.now() }));
    void load();
  }, []);

  useEffect(() => {
    if (state.cursor < 0.995) return;
    setState((s) => ({
      ...s,
      events: liveEvents.slice(-256),
      windowTo: Date.now(),
      windowFrom: Date.now() - 5 * 60_000,
    }));
  }, [liveEvents, state.cursor]);

  useEffect(() => {
    if (!state.playing) {
      if (tick.current) {
        clearInterval(tick.current);
        tick.current = null;
      }
      return;
    }
    tick.current = setInterval(() => {
      setState((s) => {
        const next = Math.min(1, s.cursor + 1 / 120);
        return { ...s, cursor: next, playing: next < 1 };
      });
    }, 80);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [state.playing]);

  const cursorTs = state.windowFrom + (state.windowTo - state.windowFrom) * state.cursor;
  const visible = useMemo(
    () => state.events.filter((e) => e.ts <= cursorTs),
    [state.events, cursorTs],
  );
  const cluster = useMemo(
    () => visible.filter((e) => e.ts >= cursorTs - 1500),
    [visible, cursorTs],
  );

  return (
    <Panel
      title="Chrono replay · causal reconstruction"
      right={`${visible.length} / ${state.events.length} events`}
      className="h-full"
      inner="p-0"
    >
      <div className="grid grid-rows-[1fr_auto] h-full">
        <div className="p-5 overflow-auto">
          <div className="hr-label mb-3" suppressHydrationWarning>
            Cursor · {mounted ? fmtShortTs(cursorTs) : '—:—:—'}
          </div>
          <CausalTree events={cluster} />
        </div>
        <div className="border-t border-line p-4 space-y-3 surface-inset">
          <Scrubber state={state} setState={setState} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setState((s) => ({ ...s, cursor: 0, playing: true }))}
              className="btn btn-accent h-8 px-3 text-[12.5px]"
            >
              <Play size={12} /> Play
            </button>
            <button
              onClick={() => setState((s) => ({ ...s, playing: false }))}
              className="btn btn-outline h-8 px-3 text-[12.5px]"
            >
              <Pause size={12} /> Pause
            </button>
            <button
              onClick={load}
              className="btn btn-ghost h-8 px-3 text-[12.5px]"
            >
              <RotateCcw size={12} /> Reload
            </button>
            <div className="ml-auto text-[11.5px] text-tertiary" suppressHydrationWarning>
              {mounted ? (
                <>
                  Window · {fmtShortTs(state.windowFrom)} → {fmtShortTs(state.windowTo)}
                </>
              ) : (
                'Window · —'
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Scrubber({
  state,
  setState,
}: {
  state: ReplayState;
  setState: React.Dispatch<React.SetStateAction<ReplayState>>;
}) {
  const ref = useRef<HTMLDivElement>(null);

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
      onMouseMove={(e) => {
        if (e.buttons === 1) onMove(e);
      }}
      className="relative h-9 rounded-md border border-line bg-surface-raised cursor-pointer select-none overflow-hidden"
    >
      {ticks.map((t, i) => (
        <span
          key={i}
          className="absolute top-1 bottom-1"
          style={{
            left: `${(t.u * 100).toFixed(2)}%`,
            width: 1.5,
            background: SEV_COLOR[t.severity] ?? '#4F46E5',
            opacity: 0.65,
          }}
        />
      ))}
      <span
        className="absolute top-0 bottom-0 w-[2px] bg-[#4F46E5]"
        style={{ left: `${(state.cursor * 100).toFixed(2)}%` }}
      />
    </div>
  );
}

function CausalTree({ events }: { events: ReplayEvent[] }) {
  const byTrace = useMemo(() => {
    const m = new Map<string, ReplayEvent[]>();
    for (const e of events) {
      const arr = m.get(e.trace_id) ?? [];
      arr.push(e);
      m.set(e.trace_id, arr);
    }
    return m;
  }, [events]);

  const roots = useMemo(
    () =>
      events
        .filter((e) => !e.parent_trace_id || !byTrace.has(e.parent_trace_id))
        .slice(0, 30),
    [events, byTrace],
  );

  if (events.length === 0) {
    return (
      <div className="text-[12.5px] text-secondary py-6 text-center">
        No events in cursor zone
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {roots.map((e) => (
        <CausalRow key={e.id} ev={e} byTrace={byTrace} depth={0} />
      ))}
    </div>
  );
}

function CausalRow({
  ev,
  byTrace,
  depth,
}: {
  ev: ReplayEvent;
  byTrace: Map<string, ReplayEvent[]>;
  depth: number;
}) {
  const children = useMemo(() => {
    const out: ReplayEvent[] = [];
    for (const arr of byTrace.values()) {
      for (const e of arr) {
        if (e.parent_trace_id === ev.trace_id && e.id !== ev.id) out.push(e);
      }
    }
    return out;
  }, [ev.trace_id, ev.id, byTrace]);

  const sev = (ev.severity ?? 'info') as Severity;
  const color = SEV_COLOR[sev];

  return (
    <div>
      <div
        className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-md hover:bg-surface-sunken"
        style={{ paddingLeft: depth * 18 + 8 }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="text-[11.5px] text-tertiary tabular-nums w-[80px] shrink-0">
          {fmtShortTs(ev.ts)}
        </span>
        <span className="text-[12.5px] font-medium" style={{ color }}>
          {ev.kind.replace(/_/g, ' ').toLowerCase()}
        </span>
        <span className="text-[12.5px] text-secondary truncate">
          {ev.target ?? ev.source}
        </span>
      </div>
      {children.slice(0, 8).map((c) => (
        <CausalRow key={c.id} ev={c} byTrace={byTrace} depth={depth + 1} />
      ))}
    </div>
  );
}
