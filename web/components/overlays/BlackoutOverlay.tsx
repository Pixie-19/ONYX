'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ShieldAlert, Cpu, RefreshCcw } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { ONYX_HTTP, fmtClock } from '@/lib/format';

/**
 * Full-cockpit emergency notification shown when the blackout monitor reports
 * `online === false`. Controlled, calm — no panic flashing. Sits at z-50
 * with pointer-events allowed only on the recovery affordance.
 */
export function BlackoutOverlay() {
  const blackout = useOnyx((s) => s.blackout);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (blackout.online) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [blackout.online]);

  return (
    <AnimatePresence>
      {!blackout.online && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="blackout-vignette"
        >
          <span className="siren-strip" />
          <span className="siren-strip" style={{ top: 'auto', bottom: 0 }} />

          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="absolute top-[72px] left-1/2 -translate-x-1/2 pointer-events-auto"
          >
            <div
              className="rounded-xl border bg-surface-raised shadow-panel-lg px-5 py-4 min-w-[500px]"
              style={{ borderColor: 'rgba(245, 158, 11, 0.35)', backdropFilter: 'blur(10px)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#FFFBEB] dark:bg-amber-400/15">
                  <ShieldAlert size={18} className="text-[#B45309] dark:text-amber-300" />
                </div>
                <div className="flex flex-col">
                  <span className="emergency-banner">Local autonomous mode active</span>
                  <span className="text-[12px] text-secondary mt-0.5">
                    Cloud inference is unreachable — routing to local fallback.
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11.5px] text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Cpu size={11} />
                  <span className="text-tertiary">Provider</span>
                  <span className="text-primary font-medium">{blackout.provider}</span>
                </span>
                <span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
                  <span className="text-tertiary">Since</span>
                  <span className="text-primary tabular-nums">
                    {now ? fmtClock(blackout.since) : '—:—:—'}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-tertiary">Reason</span>
                  <span className="text-primary">{blackout.reason}</span>
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() =>
                    fetch(`${ONYX_HTTP}/blackout/simulate`, {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ enable: false }),
                    })
                  }
                  className="btn btn-primary h-8 px-3"
                >
                  <RefreshCcw size={13} />
                  <span className="text-[12.5px]">Attempt link recovery</span>
                </button>
                <a
                  href="/blackout"
                  className="btn btn-outline h-8 px-3"
                >
                  <span className="text-[12.5px]">Open continuity center</span>
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
