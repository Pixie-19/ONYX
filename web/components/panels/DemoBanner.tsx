'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnyx } from '@/lib/store';
import { SignalPill } from '@/components/primitives/SignalPill';

const PHASE_LABELS: Record<number, { title: string; sub: string; color: string }> = {
  0: { title: 'IDLE',                 sub: 'Awaiting orchestrator command',     color: '#22e8ff' },
  1: { title: 'PHASE 1 · BASELINE',   sub: 'Healthy operational pulse',         color: '#46f5b8' },
  2: { title: 'PHASE 2 · CASCADE',    sub: 'Injected failure propagation',      color: '#ff5d6f' },
  3: { title: 'PHASE 3 · CHRONO',     sub: 'Causal reconstruction in progress', color: '#9b6cff' },
  4: { title: 'PHASE 4 · BLACKOUT',   sub: 'Inference routing fallback engaged',color: '#ffb84a' },
};

export function DemoBanner() {
  const demo = useOnyx((s) => s.demo);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (demo.phase === 0) { setVisible(false); return; }
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(id);
  }, [demo.phase, demo.ts]);

  const p = PHASE_LABELS[demo.phase] ?? PHASE_LABELS[0];

  return (
    <AnimatePresence>
      {visible && demo.phase > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <div className="panel px-6 py-3 min-w-[420px] text-center backdrop-blur-sm" style={{ boxShadow: `0 0 28px ${p.color}55, inset 0 0 0 1px ${p.color}66` }}>
            <span className="bracket-top-l" /><span className="bracket-top-r" /><span className="bracket-bot-l" /><span className="bracket-bot-r" />
            <div className="text-[11px] tracking-[0.32em] uppercase glow-cyan" style={{ color: p.color }}>{p.title}</div>
            <div className="text-onyx-100 text-sm tracking-[0.12em] mt-1">{p.sub}</div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <SignalPill severity="info" label={`SCENARIO · ${demo.label}`} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
