'use client';

import { motion } from 'framer-motion';
import { Layers, Network, ServerCrash, Shield, Workflow, Cpu } from 'lucide-react';

const features = [
  {
    title: 'Relational Operational Cognition',
    description: 'A unified intelligence platform that treats code, runtime, and telemetry as a cohesive relational dataset.',
    icon: Network,
  },
  {
    title: 'Workspace Replay Engine',
    description: 'Reconstructs failures by rewinding through filesystem changes, AST mutations, and runtime events.',
    icon: Workflow,
  },
  {
    title: 'Runtime Topology Monitor',
    description: 'Automatically discovers and maps services, endpoints, and processes into a live causal graph.',
    icon: Layers,
  },
  {
    title: 'Local-First Observability',
    description: 'Survives internet outages by routing inference locally and caching runtime state for offline continuity.',
    icon: Shield,
  },
  {
    title: 'Cross-Source SQL Correlation',
    description: 'Joins data across disparate streams—from GitHub commits to memory surges—using Coral SQL.',
    icon: ServerCrash,
  },
  {
    title: 'Execution Intelligence',
    description: 'Monitors filesystems, tracks runtime events, and correlates telemetry to provide actionable insights.',
    icon: Cpu,
  },
];

export function FeaturesSection() {
  return (
    <section className="py-32 surface-base relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-20 max-w-3xl">
          <h2 className="text-[13px] font-bold tracking-widest text-brand-violet uppercase mb-4">
            What is ONYX?
          </h2>
          <p className="text-4xl md:text-5xl font-semibold tracking-tight text-primary leading-tight">
            The execution intelligence layer for modern systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group p-8 rounded-2xl bg-surface-raised border border-line hover:border-strong transition-all duration-300 shadow-card hover:shadow-panel relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-violet/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="w-12 h-12 rounded-xl bg-surface-sunken border border-line flex items-center justify-center mb-6 text-brand-indigo group-hover:scale-110 transition-transform duration-300">
                <feature.icon size={20} strokeWidth={1.5} />
              </div>
              
              <h3 className="text-lg font-semibold text-primary mb-3">
                {feature.title}
              </h3>
              <p className="text-[15px] text-secondary leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
