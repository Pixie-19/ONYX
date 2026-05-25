'use client';
import { useState } from 'react';
import {
  Zap, GitBranch, Wifi, AlertOctagon, MemoryStick, Thermometer,
  Shield, Film,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { ONYX_HTTP, fmtShortTs } from '@/lib/format';

type InjectType = 'ast_spike' | 'latency' | 'api_failure' | 'compiler_crash' | 'memory_pressure' | 'thermal_alert' | 'blackout' | 'cascade';

interface DemoAction {
  type: InjectType;
  label: string;
  caption: string;
  icon: LucideIcon;
  tone: 'info' | 'warn' | 'error' | 'critical' | 'ok';
}

const ACTIONS: DemoAction[] = [
  { type: 'ast_spike',       label: 'TRIGGER AST SPIKE',        caption: 'Inject an AST_COMPLEXITY_SPIKE with high delta on agent/src/server.ts.', icon: GitBranch,    tone: 'warn'     },
  { type: 'latency',         label: 'INJECT LATENCY',           caption: 'Synthesise a LATENCY_SURGE on the outbound Mistral endpoint.',           icon: Wifi,         tone: 'warn'     },
  { type: 'api_failure',     label: 'SIMULATE API FAILURE',     caption: 'Emit a DEPENDENCY_DEGRADED event with retry pressure.',                  icon: AlertOctagon, tone: 'error'    },
  { type: 'compiler_crash',  label: 'TRIGGER COMPILER CRASH',   caption: 'Cascade COMPILER_FAILURE → BUILD_CRASH with TS2345 from tsc.',           icon: AlertOctagon, tone: 'critical' },
  { type: 'memory_pressure', label: 'PROVOKE MEMORY PRESSURE',  caption: 'Inject a MEMORY_PRESSURE event with elevated heap utilisation.',         icon: MemoryStick,  tone: 'warn'     },
  { type: 'thermal_alert',   label: 'RAISE THERMAL ALERT',      caption: 'Emit a THERMAL_ALERT with hot state and 88°C reading.',                  icon: Thermometer,  tone: 'warn'     },
  { type: 'blackout',        label: 'ACTIVATE BLACKOUT',        caption: 'Sever inference link · auto-restores after 6s.',                         icon: Shield,       tone: 'critical' },
  { type: 'cascade',         label: 'RUN FULL CASCADE',         caption: 'The cinematic 4-phase failure cascade · ~15s playback.',                 icon: Zap,          tone: 'critical' },
];

export default function DemoPage() {
  const demo = useOnyx((s) => s.demo);
  const events = useOnyx((s) => s.events);
  const blackout = useOnyx((s) => s.blackout);
  const cinema = useOnyx((s) => s.cinemaMode);
  const setCinema = useOnyx((s) => s.setCinema);
  const [busy, setBusy] = useState<string | null>(null);

  const inject = async (a: DemoAction) => {
    setBusy(a.type);
    try {
      const r = await fetch(`${ONYX_HTTP}/demo/inject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: a.type }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success(`${a.label} dispatched`, { description: a.caption });
    } catch (err) {
      toast.error(`${a.label} failed`, { description: String(err) });
    } finally {
      setBusy(null);
    }
  };

  const recentInjects = events.filter((e) => e.source === 'demo.inject' || e.source === 'demo.orchestrator').slice(-12).reverse();

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Zap size={14} />}
        title="DEMO ORCHESTRATOR"
        subtitle="Atomic event injection · cinematic cascade runner"
        meta={
          <>
            <Badge tone={demo.phase === 0 ? 'muted' : 'info'}>PHASE {demo.phase} · {demo.label}</Badge>
            <button
              onClick={() => setCinema(!cinema)}
              className={'flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-3 py-1 border transition ' + (cinema ? 'text-violet-glow border-violet-glow/70 bg-violet-glow/10' : 'text-onyx-100 border-onyx-600/60 hover:border-violet-glow/60 hover:text-violet-glow')}
            ><Film size={11} /> {cinema ? 'EXIT CINEMA' : 'CINEMA MODE'}</button>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-3 grid grid-cols-12 gap-3 overflow-auto auto-rows-min">
        <Panel title="INJECTION CONSOLE" right="8 ATOMIC SCENARIOS" className="col-span-8 min-h-[420px]">
          <div className="grid grid-cols-2 gap-2.5">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              const isBusy = busy === a.type;
              return (
                <motion.button
                  key={a.type}
                  onClick={() => inject(a)}
                  disabled={isBusy}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className="text-left relative panel p-3 hover:bg-onyx-700/30 transition disabled:opacity-60"
                  style={{
                    boxShadow: isBusy
                      ? '0 0 18px rgba(34,232,255,0.45), inset 0 0 0 1px rgba(34,232,255,0.55)'
                      : undefined,
                  }}
                >
                  <span className="bracket-top-l" />
                  <span className="bracket-top-r" />
                  <span className="bracket-bot-l" />
                  <span className="bracket-bot-r" />
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={13} className="text-cyan-glow" />
                    <span className="text-[11px] tracking-[0.22em] uppercase text-onyx-100">{a.label}</span>
                    <Badge tone={a.tone} className="ml-auto">{a.type}</Badge>
                  </div>
                  <p className="text-[11px] text-onyx-300 leading-relaxed">{a.caption}</p>
                  <div className="mt-2 text-[9.5px] tracking-[0.22em] uppercase text-onyx-300">
                    POST /demo/inject · {a.type}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </Panel>

        <Panel title="ORCHESTRATION STATE" className="col-span-4 min-h-[200px]">
          <div className="space-y-2 font-mono text-[11px]">
            <Row label="PHASE"        value={`${demo.phase} · ${demo.label}`}                tone={demo.phase === 0 ? 'muted' : 'info'} />
            <Row label="LAST UPDATE"  value={fmtShortTs(demo.ts)}                            tone="muted" />
            <Row label="ROUTING"      value={blackout.online ? blackout.provider.toUpperCase() : 'LOCAL FALLBACK'} tone={blackout.online ? 'info' : 'warn'} />
            <Row label="CINEMA"       value={cinema ? 'ENGAGED' : 'INACTIVE'}                tone={cinema ? 'info' : 'muted'} />
          </div>
        </Panel>

        <Panel title="RECENT INJECTIONS" right={`${recentInjects.length}`} className="col-span-12 min-h-[180px]" inner="p-0" scroll>
          <div className="font-mono text-[10.5px]">
            {recentInjects.map((e) => (
              <div key={e.id} className="px-3 py-1.5 border-b border-onyx-600/15 hover:bg-onyx-700/20 grid grid-cols-[100px_180px_1fr_200px] gap-3">
                <span className="text-onyx-300 tabular-nums">{fmtShortTs(e.ts)}</span>
                <Badge tone={e.severity as any}>{e.kind}</Badge>
                <span className="text-onyx-100 truncate">{e.target ?? e.source}</span>
                <span className="text-onyx-300 truncate">{e.trace_id}</span>
              </div>
            ))}
            {recentInjects.length === 0 && (
              <div className="px-3 py-4 text-[10px] uppercase tracking-[0.18em] text-onyx-300">no injections yet · fire a button above</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: 'info' | 'warn' | 'error' | 'critical' | 'ok' | 'muted' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-onyx-300 tracking-[0.18em] uppercase text-[10px]">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}
