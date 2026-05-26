'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnyx } from '@/lib/store';
import { Activity, AlertTriangle, Film, Shield, Zap } from 'lucide-react';

const PHASE_LABELS: Record<
  number,
  { title: string; sub: string; tone: 'info' | 'ok' | 'error' | 'warn' | 'violet'; icon: React.ReactNode }
> = {
  0: { title: 'Idle',          sub: 'Awaiting orchestrator command',     tone: 'info',   icon: <Zap size={14} /> },
  1: { title: 'Phase 1 · Baseline',  sub: 'Healthy operational pulse',        tone: 'ok',     icon: <Activity size={14} /> },
  2: { title: 'Phase 2 · Cascade',   sub: 'Injected failure propagation',     tone: 'error',  icon: <AlertTriangle size={14} /> },
  3: { title: 'Phase 3 · Chrono',    sub: 'Causal reconstruction in progress', tone: 'violet', icon: <Film size={14} /> },
  4: { title: 'Phase 4 · Blackout',  sub: 'Inference routing fallback engaged', tone: 'warn',  icon: <Shield size={14} /> },
};

export function DemoBanner() {
  const demo = useOnyx((s) => s.demo);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (demo.phase === 0) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(id);
  }, [demo.phase, demo.ts]);

  const p = PHASE_LABELS[demo.phase] ?? PHASE_LABELS[0];

  const toneClass =
    p.tone === 'ok'
      ? 'text-[#047857] bg-[#ECFDF5] border-[#A7F3D0] dark:text-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-400/30'
      : p.tone === 'error'
        ? 'text-[#B91C1C] bg-[#FEF2F2] border-[#FCA5A5] dark:text-red-200 dark:bg-red-400/10 dark:border-red-400/30'
        : p.tone === 'warn'
          ? 'text-[#B45309] bg-[#FFFBEB] border-[#FCD34D] dark:text-amber-200 dark:bg-amber-400/10 dark:border-amber-400/30'
          : p.tone === 'violet'
            ? 'text-[#6D28D9] bg-[#F5F3FF] border-[#DDD6FE] dark:text-violet-200 dark:bg-violet-400/10 dark:border-violet-400/30'
            : 'text-[#4338CA] bg-[#EEF2FF] border-[#C7D2FE] dark:text-indigo-200 dark:bg-indigo-400/10 dark:border-indigo-400/30';

  return (
    <AnimatePresence>
      {visible && demo.phase > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <div
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-panel-lg ${toneClass}`}
            style={{ minWidth: 360, backdropFilter: 'blur(8px)' }}
          >
            <span className="opacity-80">{p.icon}</span>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold tracking-tight leading-tight">{p.title}</span>
              <span className="text-[11.5px] opacity-80 leading-tight">{p.sub}</span>
            </div>
            <span className="ml-3 text-[11px] opacity-70">{demo.label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
