'use client';

import { motion } from 'framer-motion';
import { Layers, Folder, GitBranch, Search, Database, RotateCcw, Shield, Sparkles, Terminal, Code2 } from 'lucide-react';

const gridFeatures = [
  { label: 'Operational Graph', icon: Layers, desc: 'Live topology of services and files', status: 'streaming' },
  { label: 'Workspace Cognition', icon: Folder, desc: 'Filesystem and project structure visibility', status: 'active' },
  { label: 'GitHub Intelligence', icon: GitBranch, desc: 'Real-time commit tracking', status: 'synced' },
  { label: 'Runtime Discovery', icon: Search, desc: 'Automatic process and service detection', status: 'scanning' },
  { label: 'SQL Intelligence', icon: Database, desc: 'Relational queries over operations', status: 'ready' },
  { label: 'Replay Engine', icon: RotateCcw, desc: 'Chrono reconstruction with scrubbing', status: 'recording' },
  { label: 'Blackout Protocol', icon: Shield, desc: 'Autonomous continuity routing', status: 'standby' },
  { label: 'AI Cognition', icon: Sparkles, desc: 'Mistral/Ollama operational analyst', status: 'ready' },
  { label: 'Terminal Streaming', icon: Terminal, desc: 'Capture shell commands and output', status: 'listening' },
  { label: 'AST Monitoring', icon: Code2, desc: 'Abstract syntax tree parsing', status: 'active' },
];

export function WorkspaceSection() {
  return (
    <section className="py-32 surface-base relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <h2 className="text-[13px] font-bold tracking-widest text-brand-violet uppercase mb-4">
            Unified Integration
          </h2>
          <p className="text-4xl md:text-5xl font-semibold tracking-tight text-primary leading-tight">
            Everything you need. <br /> All in one layer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {gridFeatures.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: (i % 5) * 0.1, duration: 0.4 }}
              className="p-5 rounded-xl bg-surface-raised border border-line hover:border-brand-violet/50 shadow-sm hover:shadow-card transition-all duration-300 group flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-surface-sunken flex items-center justify-center text-primary group-hover:text-brand-violet transition-colors">
                  <feature.icon size={18} strokeWidth={1.5} />
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-base border border-line">
                  <span className={`w-1.5 h-1.5 rounded-full ${feature.status === 'standby' ? 'bg-signal-warn' : 'bg-signal-ok'}`} />
                  <span className="text-[10px] uppercase font-mono text-tertiary">{feature.status}</span>
                </div>
              </div>
              <h3 className="text-[14px] font-semibold text-primary mb-1">
                {feature.label}
              </h3>
              <p className="text-[12px] text-secondary leading-relaxed mt-auto">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
