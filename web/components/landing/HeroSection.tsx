'use client';

import { motion } from 'framer-motion';
import { ArrowRight, FolderInput, Layers, Activity, GitBranch, SearchCode, Shield, Database } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/format';

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles: Array<{ x: number, y: number, vx: number, vy: number, size: number, opacity: number }> = [];

    const init = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.1,
        });
      }
    };
    init();

    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 58, 237, ${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(79, 70, 229, ${(120 - dist) / 120 * 0.15})`;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden surface-base pt-24 pb-16">
      {/* Topology Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <canvas ref={canvasRef} className="absolute inset-0 opacity-40 dark:opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-base/50 to-surface-base" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-violet/10 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full flex flex-col items-center text-center">
        
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
          }}
          className="max-w-4xl flex flex-col items-center"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-surface-raised/80 backdrop-blur-md shadow-card">
              <span className="w-2 h-2 rounded-full bg-signal-ok animate-pulse" />
              <span className="text-[13px] font-medium text-primary tracking-wide">ONYX System Online</span>
              <span className="text-line-strong ml-1 mr-1">|</span>
              <span className="text-[13px] text-tertiary">v2.0 Beta</span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tight text-primary leading-[1.05] mb-8">
            Operational Cognition for <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-indigo via-brand-violet to-brand-indigo bg-[length:200%_auto] animate-sweep">
              Modern Engineering Systems
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={fadeUp} className="text-[17px] md:text-xl text-secondary leading-relaxed max-w-3xl mb-12">
            ONYX transforms codebases, runtime telemetry, terminal processes, GitHub activity, infrastructure events, and AI cognition into a unified relational intelligence layer powered by Coral.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Link
              href="/connect"
              className="group inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-medium transition-all hover:scale-[1.02] active:scale-[0.98] shadow-card hover:shadow-panel"
            >
              Launch ONYX
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              href="/connect"
              className="group inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-surface-raised border border-line hover:border-strong text-primary font-medium transition-all hover:bg-surface-sunken"
            >
              <FolderInput size={16} className="text-secondary group-hover:text-primary transition-colors" />
              Open Workspace
            </Link>

            <Link
              href="/graph"
              className="group inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-surface-raised border border-line hover:border-strong text-primary font-medium transition-all hover:bg-surface-sunken"
            >
              <Layers size={16} className="text-secondary group-hover:text-primary transition-colors" />
              View Operational Graph
            </Link>
          </motion.div>
        </motion.div>

        {/* Metrics Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
          className="w-full mt-24 pt-8 border-t border-line grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-4"
        >
          <MetricItem icon={<Activity />} label="Live Runtime Telemetry" />
          <MetricItem icon={<GitBranch />} label="GitHub Intelligence" />
          <MetricItem icon={<SearchCode />} label="AST Monitoring" />
          <MetricItem icon={<Shield />} label="Local-First AI Routing" />
          <MetricItem icon={<Database />} label="SQL Correlation Engine" />
        </motion.div>
      </div>
    </section>
  );
}

function MetricItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2.5 p-4 rounded-xl hover:bg-surface-sunken/50 transition-colors cursor-default">
      <div className="w-10 h-10 rounded-full bg-surface-raised border border-line flex items-center justify-center text-brand-violet shadow-sm">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 18, strokeWidth: 1.5 })}
      </div>
      <span className="text-[13px] font-medium text-secondary">{label}</span>
    </div>
  );
}
