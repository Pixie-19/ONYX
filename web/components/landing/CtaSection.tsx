'use client';

import { motion } from 'framer-motion';
import { ArrowRight, FolderInput, Layers } from 'lucide-react';
import Link from 'next/link';

export function CtaSection() {
  return (
    <section className="py-32 relative overflow-hidden surface-base border-t border-line">
      {/* Background visual */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-base via-brand-violet/5 to-surface-base pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-indigo/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
      >
        <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-primary mb-10 leading-tight">
          Turn development chaos into <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-indigo to-brand-violet">
            operational intelligence.
          </span>
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="/connect"
            className="group inline-flex items-center justify-center gap-2 h-14 px-8 rounded-xl bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-semibold text-lg transition-all hover:scale-[1.02] shadow-panel hover:shadow-panel-lg"
          >
            Launch ONYX
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/connect"
            className="group inline-flex items-center justify-center gap-2 h-14 px-8 rounded-xl border border-line bg-surface-raised hover:border-strong text-primary font-semibold text-lg transition-all hover:bg-surface-sunken"
          >
            <FolderInput size={18} className="text-secondary group-hover:text-primary transition-colors" />
            Connect Workspace
          </Link>
          
          <Link
            href="/graph"
            className="group inline-flex items-center justify-center gap-2 h-14 px-8 rounded-xl border border-line bg-surface-raised hover:border-strong text-primary font-semibold text-lg transition-all hover:bg-surface-sunken"
          >
            <Layers size={18} className="text-secondary group-hover:text-primary transition-colors" />
            Explore Runtime
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
