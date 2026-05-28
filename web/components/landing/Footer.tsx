'use client';

import { Github, Twitter, ExternalLink, Activity, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const navLinks = [
  { label: 'Overview', href: '/overview' },
  { label: 'Operational Graph', href: '/graph' },
  { label: 'Replay Engine', href: '/replay' },
  { label: 'SQL Intelligence', href: '/sql' },
  { label: 'Workspace Connector', href: '/connect' },
  { label: 'AI Cognition', href: '/intelligence' },
  { label: 'Blackout Protocol', href: '/blackout' },
];

const socialLinks = [
  { icon: Twitter, href: 'https://x.com/SealRishita', label: 'X' },
  { icon: Github, href: 'https://github.com/Pixie-19', label: 'GitHub' },
];

export function Footer() {
  return (
    <footer className="relative border-t-[1.5px] border-line bg-surface-base overflow-hidden">
      {/* Subtle top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">

          {/* SECTION 1 — BRANDING */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink-900 dark:bg-white flex items-center justify-center border-[1.5px] border-transparent shadow-[3px_3px_0px_rgba(0,0,0,0.1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.15)] transition-transform hover:-translate-y-0.5">
                <svg width="20" height="20" viewBox="0 0 64 64" className="text-white dark:text-ink-900">
                  <path d="M16 14 L48 14 L52 22 L52 42 L48 50 L16 50 L12 42 L12 22 Z" fill="currentColor" opacity="0.95" />
                </svg>
              </div>
              <span className="font-bold text-xl text-primary tracking-tight">ONYX</span>
            </div>

            <p className="text-[15px] text-secondary leading-relaxed max-w-md">
              Operational cognition infrastructure for modern engineering systems.
            </p>

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-[13px] font-medium text-secondary bg-surface-base w-fit px-3.5 py-2 rounded-lg border-[1.5px] border-line shadow-[2px_2px_0px_rgba(0,0,0,0.04)] dark:shadow-[2px_2px_0px_rgba(255,255,255,0.03)] cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Local-first • Coral-powered • Real-time
              </div>
            </div>
          </div>

          {/* SECTION 2 — NAVIGATION */}
          <div className="lg:col-span-4 flex flex-col">
            <h3 className="font-semibold text-primary text-[13px] tracking-widest uppercase mb-6 opacity-80">
              Platform
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="group relative text-[14px] text-secondary hover:text-primary transition-colors w-fit flex items-center"
                >
                  <span className="relative z-10 transition-transform duration-200 group-hover:translate-x-1 inline-block">
                    {link.label}
                  </span>
                  <motion.span
                    className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-primary/20 transition-all duration-300 group-hover:w-full"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* SECTION 3 — CONTACTS */}
          <div className="lg:col-span-3 flex flex-col">
            <h3 className="font-semibold text-primary text-[13px] tracking-widest uppercase mb-6 opacity-80">
              Connect
            </h3>
            <div className="flex flex-col space-y-3">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-3 rounded-xl border-[1.5px] border-line bg-surface-base hover:bg-surface-sunken hover:border-strong transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_rgba(0,0,0,0.04)] dark:hover:shadow-[3px_3px_0px_rgba(255,255,255,0.04)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-sunken border-[1.5px] border-line flex items-center justify-center group-hover:bg-surface-base transition-colors">
                        <Icon size={14} className="text-tertiary group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-[14px] font-medium text-secondary group-hover:text-primary transition-colors">
                        {link.label}
                      </span>
                    </div>
                    <ExternalLink size={14} className="text-tertiary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </a>
                );
              })}
            </div>
          </div>

        </div>

        {/* BOTTOM BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t-[1.5px] border-line">
          <div className="text-[13px] text-tertiary font-medium">
            © {new Date().getFullYear()} ONYX. Built for operational intelligence.
          </div>

          <div className="flex items-center gap-4 text-[13px] text-tertiary">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-sunken border-[1.5px] border-line shadow-[1.5px_1.5px_0px_rgba(0,0,0,0.04)] dark:shadow-[1.5px_1.5px_0px_rgba(255,255,255,0.03)]">
              <Activity size={12} className="text-emerald-500" />
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">v1.2.0</span>
            </div>
            <div className="h-4 w-[1.5px] bg-line" />
            <div className="flex items-center gap-1.5 hover:text-secondary transition-colors cursor-default group">
              <Sparkles size={12} className="group-hover:text-amber-500 transition-colors" />
              <span className="font-medium">Powered by Coral</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}

