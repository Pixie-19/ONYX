'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ShieldAlert, Radio, Cpu, RefreshCcw } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { ONYX_HTTP, fmtClock } from '@/lib/format';

/**
 * Full-cockpit emergency overlay shown when the blackout monitor reports
 * `online === false`. Doesn't take focus away from the cockpit content —
 * it sits at z-50 with pointer-events allowed only on the action affordance.
 */
export function BlackoutOverlay() {
  const blackout = useOnyx((s) => s.blackout);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (blackout.online) return;
    const id = setInterval(() => setNow(Date.now()), 333);
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
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="absolute top-[58px] left-1/2 -translate-x-1/2 pointer-events-auto"
          >
            <div
              className="panel px-6 py-3 min-w-[520px] text-center backdrop-blur-md"
              style={{
                boxShadow: '0 0 30px rgba(255,45,107,0.45), inset 0 0 0 1px rgba(255,45,107,0.55)',
              }}
            >
              <span className="bracket-top-l" style={{ borderColor: '#ff2d6b' }} />
              <span className="bracket-top-r" style={{ borderColor: '#ff2d6b' }} />
              <span className="bracket-bot-l" style={{ borderColor: '#ff2d6b' }} />
              <span className="bracket-bot-r" style={{ borderColor: '#ff2d6b' }} />

              <div className="flex items-center justify-center gap-3 mb-1">
                <ShieldAlert size={16} className="text-signal-critical" />
                <span className="emergency-banner text-sm">LOCAL AUTONOMOUS MODE ACTIVE</span>
                <Radio size={14} className="text-signal-critical animate-pulse" />
              </div>
              <div className="text-[10.5px] tracking-[0.22em] uppercase text-onyx-100 flex justify-center gap-3 mt-1">
                <span className="flex items-center gap-1.5"><Cpu size={11} /> INFER · {blackout.provider.toUpperCase()}</span>
                <span>·</span>
                <span suppressHydrationWarning>SINCE · {now ? fmtClock(blackout.since) : '——:——:——.———'}</span>
                <span>·</span>
                <span>REASON · {blackout.reason}</span>
              </div>
              <div className="mt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => fetch(`${ONYX_HTTP}/blackout/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enable: false }) })}
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-3 py-1.5 border border-signal-critical/70 text-signal-critical hover:bg-signal-critical/10 transition"
                >
                  <RefreshCcw size={11} /> ATTEMPT LINK RECOVERY
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
