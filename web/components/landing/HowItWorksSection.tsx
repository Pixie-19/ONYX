'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Code2, Database, Brain, Network, ShieldCheck } from 'lucide-react';

const steps = [
  { icon: Code2, label: 'Workspace Changes', desc: 'AST & runtime monitoring' },
  { icon: Network, label: 'Relational Layer', desc: 'Topology & telemetry graph' },
  { icon: Database, label: 'Coral SQL', desc: 'Cross-source correlation' },
  { icon: Brain, label: 'AI Cognition', desc: 'Automated intelligence' },
  { icon: ShieldCheck, label: 'Blackout Protocol', desc: 'Offline resilience' },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 surface-base relative border-y border-line overflow-hidden">
      <div className="absolute inset-0 bg-surface-sunken/30" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-[13px] font-bold tracking-widest text-brand-indigo uppercase mb-3">
            Architecture Flow
          </h2>
          <p className="text-3xl md:text-4xl font-semibold text-primary">
            How ONYX processes intelligence
          </p>
        </div>

        <div className="relative">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-line-strong -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4 relative z-10">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="flex flex-col items-center text-center relative"
              >
                <div className="w-16 h-16 rounded-2xl bg-surface-raised border-2 border-line flex items-center justify-center text-primary shadow-sm mb-4 relative z-10 group hover:border-brand-indigo transition-colors duration-300">
                  <step.icon size={24} strokeWidth={1.5} className="group-hover:text-brand-indigo transition-colors" />
                </div>
                
                {i < steps.length - 1 && (
                  <div className="md:hidden flex justify-center py-3">
                    <ArrowRight size={16} className="text-tertiary" />
                  </div>
                )}

                <h3 className="text-[15px] font-semibold text-primary mb-1">
                  {step.label}
                </h3>
                <p className="text-[13px] text-secondary max-w-[160px]">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
