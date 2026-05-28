'use client';

import { motion } from 'framer-motion';
import { GitCommit, Activity, XCircle, MemoryStick, RotateCcw } from 'lucide-react';

const timelineEvents = [
  { icon: GitCommit, label: 'Commit Pushed', time: '14:32:01', desc: 'main branch updated', color: 'text-secondary' },
  { icon: Activity, label: 'Latency Spike', time: '14:32:45', desc: 'p99 > 800ms', color: 'text-signal-warn' },
  { icon: XCircle, label: 'API Failure', time: '14:33:12', desc: '503 Service Unavailable', color: 'text-signal-error' },
  { icon: MemoryStick, label: 'Memory Surge', time: '14:33:30', desc: 'OOM threshold reached', color: 'text-signal-critical' },
  { icon: RotateCcw, label: 'Replay Engine', time: '14:34:05', desc: 'Full reconstruction started', color: 'text-brand-indigo' },
];

export function ReplaySection() {
  return (
    <section className="py-32 surface-raised relative overflow-hidden border-t border-line">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <h2 className="text-[13px] font-bold tracking-widest text-brand-indigo uppercase mb-4">
            Chrono Replay Engine
          </h2>
          <p className="text-4xl md:text-5xl font-semibold tracking-tight text-primary leading-tight mb-6">
            Traverse operational history.
          </p>
          <p className="text-lg text-secondary leading-relaxed">
            ONYX acts as a flight recorder for your engineering systems. Rewind, replay, and reconstruct past operational states with absolute precision and full relational context.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto mt-16">
          {/* Timeline Line */}
          <div className="absolute top-8 left-[31px] md:left-1/2 bottom-0 w-[2px] bg-line md:-translate-x-1/2 z-0" />

          <div className="space-y-12">
            {timelineEvents.map((event, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                  className={`relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 ${isEven ? 'md:flex-row-reverse' : ''}`}
                >
                  <div className={`flex-1 w-full md:text-${isEven ? 'left' : 'right'} pl-16 md:pl-0`}>
                    <div className="p-5 bg-surface-base border border-line rounded-xl shadow-sm hover:shadow-card hover:border-strong transition-all duration-300">
                      <div className="flex items-center gap-3 mb-2 justify-start md:justify-start">
                         <span className="text-[12px] font-mono text-tertiary bg-surface-sunken px-2 py-1 rounded-md">{event.time}</span>
                         <h3 className="text-[15px] font-semibold text-primary">{event.label}</h3>
                      </div>
                      <p className="text-[14px] text-secondary">{event.desc}</p>
                    </div>
                  </div>

                  <div className="absolute left-0 md:relative md:left-auto w-16 flex justify-center shrink-0">
                    <div className="w-12 h-12 rounded-full bg-surface-raised border-4 border-surface-raised shadow-[0_0_0_1px_var(--color-line)] flex items-center justify-center z-10">
                      <event.icon size={20} className={event.color} strokeWidth={2} />
                    </div>
                  </div>

                  <div className="hidden md:block flex-1" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
