'use client';

import { motion } from 'framer-motion';
import { CloudOff, Cpu, HardDrive, Wifi, ShieldAlert } from 'lucide-react';

export function BlackoutSection() {
  return (
    <section className="py-32 surface-base relative overflow-hidden border-t border-line">
      {/* Background gradients for blackout feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-900/5 to-surface-base pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1 relative h-[500px] w-full rounded-2xl border border-line bg-surface-raised shadow-panel flex items-center justify-center overflow-hidden"
          >
            {/* Visual simulation of blackout routing */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-sunken via-surface-base to-surface-base" />
            
            <div className="relative flex flex-col items-center gap-12 w-full max-w-sm">
              <motion.div 
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-4 px-6 py-4 rounded-xl border border-line bg-surface-base shadow-sm w-full"
              >
                <div className="w-10 h-10 rounded-full bg-signal-error/10 flex items-center justify-center text-signal-error">
                  <CloudOff size={20} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-primary">Cloud Connection</div>
                  <div className="text-[12px] text-signal-error font-medium">Disconnected</div>
                </div>
              </motion.div>

              <div className="relative h-16 w-px bg-line-strong">
                <motion.div 
                  initial={{ top: 0, opacity: 1 }}
                  animate={{ top: '100%', opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute left-1/2 -translate-x-1/2 w-1.5 h-4 bg-brand-indigo rounded-full"
                />
              </div>

              <div className="flex items-center gap-4 px-6 py-4 rounded-xl border-2 border-brand-indigo bg-brand-indigo/5 shadow-[0_0_20px_rgba(79,70,229,0.15)] w-full relative overflow-hidden">
                <div className="absolute inset-0 bg-brand-indigo/10 animate-pulse" />
                <div className="w-10 h-10 rounded-full bg-brand-indigo text-white flex items-center justify-center relative z-10">
                  <Cpu size={20} />
                </div>
                <div className="relative z-10">
                  <div className="text-[14px] font-semibold text-primary">Ollama Local Inference</div>
                  <div className="text-[12px] text-brand-indigo font-medium">Active Fallback Routing</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-surface-raised mb-6">
              <ShieldAlert size={14} className="text-signal-error" />
              <span className="text-[12px] font-semibold text-primary uppercase tracking-wider">Blackout Protocol</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-primary leading-tight mb-6">
              Never lose operational continuity.
            </h2>
            
            <p className="text-lg text-secondary leading-relaxed mb-10 max-w-lg">
              When the internet fails, ONYX doesn't. The platform automatically reroutes AI inference to local models, freezes stable dependencies, and serves cached responses to maintain uninterrupted runtime continuity.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: Cpu, label: 'Local Inference', desc: 'Seamless Ollama fallback' },
                { icon: HardDrive, label: 'Cached Continuity', desc: 'Offline state reconstruction' },
                { icon: ShieldAlert, label: 'Stable Dependencies', desc: 'Frozen execution states' },
                { icon: Wifi, label: 'Full Recovery', desc: 'Sync on reconnection' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-2 p-4 rounded-xl border border-line bg-surface-raised">
                  <item.icon size={18} className="text-brand-indigo mb-1" />
                  <div className="text-[14px] font-semibold text-primary">{item.label}</div>
                  <div className="text-[13px] text-secondary">{item.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
