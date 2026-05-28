'use client';

import { motion } from 'framer-motion';
import { Database, Terminal } from 'lucide-react';

const sqlCode = `SELECT e.commit_hash, e.file_path, r.cpu_spike, r.memory_surge
FROM workspace_entropy e
JOIN runtime_processes r
  ON e.process_id = r.id
WHERE r.crash_signal = true
  AND e.timestamp > (now() - interval '5 minutes')
ORDER BY r.severity DESC;`;

export function IntelligenceSection() {
  return (
    <section className="py-32 surface-base relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-surface-raised mb-6">
              <Database size={14} className="text-brand-indigo" />
              <span className="text-[12px] font-semibold text-primary uppercase tracking-wider">Coral Integration</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-primary leading-tight mb-6">
              Query operations <br/>as relational data.
            </h2>
            
            <p className="text-lg text-secondary leading-relaxed mb-8 max-w-lg">
              ONYX uses Coral to treat engineering workflows as queryable operational intelligence. Join data across disparate streams—from GitHub commits and AST mutations to runtime telemetry and crash signals—with standard SQL.
            </p>
            
            <ul className="space-y-4">
              {[
                'Unified schema for all operational data',
                'Real-time querying of live telemetry',
                'Full context joins across topology and events'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[15px] text-primary font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-violet" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-xl border border-line bg-ink-900 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-ink-900/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <div className="ml-4 text-[12px] font-mono text-white/40 flex items-center gap-2">
                <Terminal size={12} /> onyx-sql-engine
              </div>
            </div>
            <div className="p-6 overflow-x-auto bg-[#0d1117]">
              <pre className="font-mono text-[14px] leading-relaxed text-white/90">
                <code>
                  <span className="text-[#ff7b72]">SELECT</span> e.commit_hash, e.file_path, r.cpu_spike, r.memory_surge{'\n'}
                  <span className="text-[#ff7b72]">FROM</span> workspace_entropy e{'\n'}
                  <span className="text-[#ff7b72]">JOIN</span> runtime_processes r{'\n'}
                  {'  '}<span className="text-[#ff7b72]">ON</span> e.process_id <span className="text-[#79c0ff]">=</span> r.id{'\n'}
                  <span className="text-[#ff7b72]">WHERE</span> r.crash_signal <span className="text-[#79c0ff]">=</span> <span className="text-[#79c0ff]">true</span>{'\n'}
                  {'  '}<span className="text-[#ff7b72]">AND</span> e.timestamp <span className="text-[#79c0ff]">{'>'}</span> (<span className="text-[#d2a8ff]">now</span>() <span className="text-[#79c0ff]">-</span> <span className="text-[#ff7b72]">interval</span> <span className="text-[#a5d6ff]">'5 minutes'</span>){'\n'}
                  <span className="text-[#ff7b72]">ORDER BY</span> r.severity <span className="text-[#79c0ff]">DESC</span>;
                </code>
              </pre>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
