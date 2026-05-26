'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Film, ChevronRight } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import type { ReplayEvent } from '@/lib/types';
import { fmtShortTs } from '@/lib/format';
import { KIND_TO_SEVERITY } from '@/lib/colors';

const sevColor: Record<string, string> = {
  info:     '#4F46E5',
  warn:     '#F59E0B',
  error:    '#EF4444',
  critical: '#DC2626',
};

/**
 * Active during demo phase 3 (chrono) or when the user toggles cinema
 * manually. Applies a soft violet wash and surfaces a horizontal causal
 * cascade above the topology. Minimal, cinematic, never overwhelming.
 */
export function ReplayCinema() {
  const cinema = useOnyx((s) => s.cinemaMode);
  const demoPhase = useOnyx((s) => s.demo.phase);
  const events = useOnyx((s) => s.events);
  const setCinema = useOnyx((s) => s.setCinema);

  const active = cinema || demoPhase === 3;

  useEffect(() => {
    if (!cinema) return;
    if (demoPhase > 3) setCinema(false);
  }, [demoPhase, cinema, setCinema]);

  const cascade = (() => {
    if (!active) return [] as ReplayEvent[];
    const recent = events.slice(-128);
    const root = [...recent].reverse().find(
      (e) => e.kind === 'AST_COMPLEXITY_SPIKE' || e.kind === 'FILE_MODIFIED',
    );
    if (!root) return recent.slice(-8);
    const visited = new Set<string>([root.trace_id]);
    const out = [root];
    let progress = true;
    while (progress) {
      progress = false;
      for (const e of recent) {
        if (e.parent_trace_id && visited.has(e.parent_trace_id) && !visited.has(e.trace_id)) {
          visited.add(e.trace_id);
          out.push(e);
          progress = true;
        }
      }
    }
    return out.slice(0, 10);
  })();

  return (
    <AnimatePresence>
      {active && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="replay-vignette"
          />
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.32 }}
            className="absolute top-[72px] left-1/2 -translate-x-1/2 z-[55] pointer-events-none"
          >
            <div
              className="rounded-xl border bg-surface-raised shadow-panel-lg px-5 py-3 min-w-[640px]"
              style={{ borderColor: 'rgba(124, 58, 237, 0.32)', backdropFilter: 'blur(10px)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-md bg-[#F5F3FF] dark:bg-violet-400/15 flex items-center justify-center">
                  <Film size={13} className="text-[#7C3AED] dark:text-violet-300" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-semibold text-primary leading-tight">
                    Cinematic replay
                  </span>
                  <span className="text-[11px] text-secondary leading-tight">
                    Causal reconstruction in progress
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {cascade.length === 0 ? (
                  <span className="text-tertiary text-[11.5px]">Awaiting causal anchor…</span>
                ) : (
                  cascade.map((e, i) => {
                    const sev = e.severity ?? KIND_TO_SEVERITY[e.kind] ?? 'info';
                    const color = sevColor[sev] ?? '#4F46E5';
                    return (
                      <span key={e.id} className="flex items-center gap-1.5">
                        {i > 0 && <ChevronRight size={12} className="text-tertiary" />}
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11px] font-medium whitespace-nowrap border"
                          style={{
                            color,
                            borderColor: color + '40',
                            background: color + '12',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: color }}
                          />
                          {e.kind.replace(/_/g, ' ').toLowerCase()}
                        </motion.span>
                        <span className="text-tertiary text-[10.5px] tabular-nums">
                          {fmtShortTs(e.ts)}
                        </span>
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
