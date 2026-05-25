'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Film, ChevronRight } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import type { ReplayEvent } from '@/lib/types';
import { fmtShortTs } from '@/lib/format';
import { KIND_TO_SEVERITY, severityClass } from '@/lib/colors';

/**
 * Active only when the demo orchestrator transitions to phase 3 (chrono) OR
 * the user toggles cinema mode manually. Applies a violet vignette across the
 * cockpit and surfaces a horizontal causal cascade above the topology.
 */
export function ReplayCinema() {
  const cinema = useOnyx((s) => s.cinemaMode);
  const demoPhase = useOnyx((s) => s.demo.phase);
  const events = useOnyx((s) => s.events);
  const setCinema = useOnyx((s) => s.setCinema);

  const active = cinema || demoPhase === 3;

  // Automatically exit cinema when phase advances past 3
  useEffect(() => {
    if (!cinema) return;
    if (demoPhase > 3) setCinema(false);
  }, [demoPhase, cinema, setCinema]);

  // pull the last DEMO_PHASE root and its descendants
  const cascade = (() => {
    if (!active) return [] as ReplayEvent[];
    const recent = events.slice(-128);
    const root = [...recent].reverse().find((e) => e.kind === 'AST_COMPLEXITY_SPIKE' || e.kind === 'FILE_MODIFIED');
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
            className="absolute top-[58px] left-1/2 -translate-x-1/2 z-[55] pointer-events-none"
          >
            <div className="panel px-6 py-2 min-w-[640px] backdrop-blur-md" style={{ boxShadow: '0 0 28px rgba(155,108,255,0.4), inset 0 0 0 1px rgba(155,108,255,0.5)' }}>
              <span className="bracket-top-l" style={{ borderColor: '#9b6cff' }} />
              <span className="bracket-top-r" style={{ borderColor: '#9b6cff' }} />
              <span className="bracket-bot-l" style={{ borderColor: '#9b6cff' }} />
              <span className="bracket-bot-r" style={{ borderColor: '#9b6cff' }} />
              <div className="flex items-center gap-2 mb-1.5">
                <Film size={13} className="text-violet-glow" />
                <span className="text-[10.5px] tracking-[0.36em] uppercase text-violet-glow glow-violet">CINEMATIC REPLAY · CAUSAL RECONSTRUCTION</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10.5px] overflow-x-auto pb-1">
                {cascade.length === 0 ? (
                  <span className="text-onyx-300 tracking-[0.18em] uppercase text-[10px]">awaiting causal anchor…</span>
                ) : (
                  cascade.map((e, i) => {
                    const sev = (e.severity ?? KIND_TO_SEVERITY[e.kind] ?? 'info');
                    return (
                      <span key={e.id} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight size={11} className="text-onyx-300" />}
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className={`${severityClass(sev)} tracking-[0.12em] uppercase whitespace-nowrap`}
                        >
                          {e.kind.replace(/_/g, ' ')}
                        </motion.span>
                        <span className="text-onyx-300 tabular-nums text-[9.5px]">{fmtShortTs(e.ts)}</span>
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
