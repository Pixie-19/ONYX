'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, FolderInput } from 'lucide-react';
import { SECTIONS } from '@/lib/sections';
import { useOnyx } from '@/lib/store';
import { Badge } from '@/components/ui/Badge';
import { FrameworkBadge } from '@/components/connector/FrameworkBadge';

export default function LandingPage() {
  const connected = useOnyx((s) => s.connected);
  const session = useOnyx((s) => s.session);
  const workspaces = useOnyx((s) => s.workspaces);
  const router = useRouter();

  // While the WS hello hasn't landed yet, workspaces is `[]` — we can't
  // distinguish "no workspaces" from "still hydrating". Wait one tick after
  // the connection lands, then redirect if still empty.
  useEffect(() => {
    if (!connected) return;
    const t = setTimeout(() => {
      // re-read fresh state (avoid stale closure)
      const ws = useOnyx.getState().workspaces;
      if (ws.length === 0) router.replace('/connect');
    }, 350);
    return () => clearTimeout(t);
  }, [connected, router]);

  return (
    <div className="relative h-full overflow-auto">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 50% 30%, rgba(34,232,255,0.06), transparent 55%), radial-gradient(circle at 50% 90%, rgba(155,108,255,0.06), transparent 55%)',
      }} />

      <div className="relative max-w-[1180px] mx-auto px-10 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Badge tone={connected ? 'info' : 'error'}>{connected ? 'AGENT · LINKED' : 'AGENT · OFFLINE'}</Badge>
            <Badge tone="muted">SESSION · {session ?? '——'}</Badge>
            <Badge tone={workspaces.length > 0 ? 'ok' : 'warn'}>
              {workspaces.length} WORKSPACE{workspaces.length === 1 ? '' : 'S'}
            </Badge>
            <Badge tone="ok">VERSION · 0.2.0</Badge>
          </div>
          <h1 className="font-display text-[36px] tracking-[0.32em] glow-cyan text-onyx-100 leading-tight">
            ONYX
          </h1>
          <p className="text-[11px] tracking-[0.36em] uppercase text-onyx-300 mt-1">
            Autonomous Execution Intelligence Infrastructure
          </p>
          <p className="text-[13px] text-onyx-100/80 mt-6 max-w-[640px] leading-relaxed">
            A local-first execution intelligence platform. Attach a real project through the{' '}
            <Link href="/connect" className="text-cyan-glow underline-offset-2 hover:underline">Workspace Connector</Link>
            {' '}to begin streaming filesystem, AST, runtime, and network signal into the{' '}
            <code className="text-cyan-glow font-mono">onyx_cognition</code> relational source.
          </p>

          {workspaces.length === 0 ? (
            <div className="mt-6">
              <Link href="/connect" className="inline-flex items-center gap-2 px-4 py-2 border border-cyan-glow/70 text-cyan-glow hover:bg-cyan-glow/10 transition text-[11px] tracking-[0.22em] uppercase shadow-cyan-glow">
                <FolderInput size={12} /> Enter Workspace Connector
                <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-2 flex-wrap">
              <span className="panel-label">ATTACHED:</span>
              {workspaces.map((w) => (
                <Link key={w.id} href="/connect" className="flex items-center gap-1.5">
                  <Badge tone={w.status === 'demo' ? 'warn' : 'ok'}>{w.name}</Badge>
                  <FrameworkBadge framework={w.framework} />
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="mt-10 grid grid-cols-3 gap-3"
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.key}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.32 }}
              >
                <Link
                  href={s.href}
                  className="group relative panel block p-4 hover:bg-onyx-700/30 transition"
                >
                  <span className="bracket-top-l" />
                  <span className="bracket-top-r" />
                  <span className="bracket-bot-l" />
                  <span className="bracket-bot-r" />
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className="text-cyan-glow" strokeWidth={1.5} />
                    <span className="text-[11px] tracking-[0.22em] uppercase text-onyx-100">{s.label}</span>
                    <ArrowRight size={11} className="ml-auto text-onyx-300 group-hover:text-cyan-glow group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="text-[11px] text-onyx-300 leading-relaxed">{s.caption}</p>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="mt-10 text-[10px] tracking-[0.32em] uppercase text-onyx-300 text-center">
          ◐ LOCAL FIRST · ⌘K COMMAND · D DEMO · B BLACKOUT · C CINEMA ◑
        </div>
      </div>
    </div>
  );
}
