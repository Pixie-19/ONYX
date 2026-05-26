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

type InjectType =
  | 'ast_spike'
  | 'latency'
  | 'api_failure'
  | 'compiler_crash'
  | 'memory_pressure'
  | 'thermal_alert'
  | 'blackout'
  | 'cascade';

interface DemoAction {
  type: InjectType;
  label: string;
  caption: string;
  icon: LucideIcon;
  tone: 'info' | 'warn' | 'error' | 'critical' | 'ok';
}

const ACTIONS: DemoAction[] = [
  { type: 'ast_spike',       label: 'Trigger AST spike',         caption: 'Inject an AST_COMPLEXITY_SPIKE with high delta on agent/src/server.ts.', icon: GitBranch,    tone: 'warn' },
  { type: 'latency',         label: 'Inject latency',            caption: 'Synthesise a LATENCY_SURGE on the outbound Mistral endpoint.',           icon: Wifi,         tone: 'warn' },
  { type: 'api_failure',     label: 'Simulate API failure',      caption: 'Emit a DEPENDENCY_DEGRADED event with retry pressure.',                   icon: AlertOctagon, tone: 'error' },
  { type: 'compiler_crash',  label: 'Trigger compiler crash',    caption: 'Cascade COMPILER_FAILURE → BUILD_CRASH with TS2345 from tsc.',            icon: AlertOctagon, tone: 'critical' },
  { type: 'memory_pressure', label: 'Provoke memory pressure',   caption: 'Inject a MEMORY_PRESSURE event with elevated heap utilisation.',          icon: MemoryStick,  tone: 'warn' },
  { type: 'thermal_alert',   label: 'Raise thermal alert',       caption: 'Emit a THERMAL_ALERT with hot state and 88°C reading.',                   icon: Thermometer,  tone: 'warn' },
  { type: 'blackout',        label: 'Activate blackout',         caption: 'Sever inference link — auto-restores after 6 seconds.',                    icon: Shield,       tone: 'critical' },
  { type: 'cascade',         label: 'Run full cascade',          caption: 'The cinematic 4-phase failure cascade · ~15s playback.',                   icon: Zap,          tone: 'critical' },
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
      toast.success(a.label, { description: a.caption });
    } catch (err) {
      toast.error(a.label, { description: String(err) });
    } finally {
      setBusy(null);
    }
  };

  const recentInjects = events
    .filter((e) => e.source === 'demo.inject' || e.source === 'demo.orchestrator')
    .slice(-12)
    .reverse();

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Zap size={16} />}
        title="Demo orchestrator"
        subtitle="Atomic event injection · cinematic cascade runner"
        meta={
          <>
            <Badge tone={demo.phase === 0 ? 'muted' : 'info'}>
              Phase {demo.phase} · {demo.label}
            </Badge>
            <button
              onClick={() => setCinema(!cinema)}
              className={`btn ${cinema ? 'btn-primary' : 'btn-outline'} h-8 px-3 text-[12.5px]`}
            >
              <Film size={13} /> {cinema ? 'Exit cinema' : 'Cinema mode'}
            </button>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-4 overflow-auto auto-rows-min surface-base">
        <Panel title="Injection console" right="8 atomic scenarios" className="col-span-8 min-h-[420px]">
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              const isBusy = busy === a.type;
              const toneColor =
                a.tone === 'ok'
                  ? '#10B981'
                  : a.tone === 'warn'
                    ? '#F59E0B'
                    : a.tone === 'error'
                      ? '#EF4444'
                      : a.tone === 'critical'
                        ? '#DC2626'
                        : '#4F46E5';
              return (
                <motion.button
                  key={a.type}
                  onClick={() => inject(a)}
                  disabled={isBusy}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className="text-left rounded-xl border border-line bg-surface-raised hover:shadow-panel-lg p-4 transition disabled:opacity-60"
                  style={isBusy ? { boxShadow: '0 0 0 2px rgba(79,70,229,0.25), 0 8px 24px -12px rgba(79,70,229,0.30)' } : undefined}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center"
                      style={{ background: toneColor + '14', color: toneColor }}
                    >
                      <Icon size={14} />
                    </div>
                    <span className="text-[13px] font-semibold text-primary">{a.label}</span>
                    <Badge tone={a.tone} className="ml-auto">{a.type}</Badge>
                  </div>
                  <p className="text-[12.5px] text-secondary leading-relaxed">{a.caption}</p>
                  <div className="mt-2 text-[10.5px] text-tertiary font-mono">
                    POST /demo/inject · {a.type}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Orchestration state" className="col-span-4 min-h-[220px]">
          <div className="space-y-1">
            <Row label="Phase"       value={`${demo.phase} · ${demo.label}`} tone={demo.phase === 0 ? 'muted' : 'info'} />
            <Row label="Last update" value={fmtShortTs(demo.ts)} />
            <Row label="Routing"     value={blackout.online ? blackout.provider : 'Local fallback'} tone={blackout.online ? 'info' : 'warn'} />
            <Row label="Cinema"      value={cinema ? 'Engaged' : 'Inactive'} tone={cinema ? 'info' : 'muted'} />
          </div>
        </Panel>

        <Panel
          title="Recent injections"
          right={`${recentInjects.length}`}
          className="col-span-12 min-h-[200px]"
          inner="p-0"
          scroll
        >
          <div>
            {recentInjects.map((e) => (
              <div
                key={e.id}
                className="px-4 py-2.5 border-b border-subtle hover:bg-surface-sunken transition grid grid-cols-[100px_220px_1fr_220px] gap-4 items-center"
              >
                <span className="text-[11.5px] text-tertiary tabular-nums">{fmtShortTs(e.ts)}</span>
                <Badge tone={e.severity as any}>{e.kind.replace(/_/g, ' ').toLowerCase()}</Badge>
                <span className="text-[12.5px] text-primary truncate">{e.target ?? e.source}</span>
                <span className="text-[11.5px] text-tertiary truncate font-mono">{e.trace_id}</span>
              </div>
            ))}
            {recentInjects.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-secondary">
                No injections yet — fire a scenario above
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'info' | 'warn' | 'error' | 'critical' | 'ok' | 'muted';
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-subtle last:border-b-0">
      <span className="text-[12px] text-secondary">{label}</span>
      {tone ? (
        <Badge tone={tone}>{value}</Badge>
      ) : (
        <span className="text-[12.5px] text-primary font-medium">{value}</span>
      )}
    </div>
  );
}
