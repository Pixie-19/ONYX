'use client';
import { useEffect, useState, useMemo } from 'react';
import { Shield, ArrowRight, Wifi, WifiOff, Cloud, Server, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { fmtClock, fmtShortTs, ONYX_HTTP } from '@/lib/format';

const PROVIDERS = [
  {
    id: 'mistral',
    label: 'mistral.codestral-latest',
    kind: 'cloud',
    icon: Cloud,
    color: '#4F46E5',
    desc: 'Requires outbound link · authenticated bearer',
  },
  {
    id: 'ollama',
    label: 'ollama.open-codestral-7b',
    kind: 'local',
    icon: Server,
    color: '#10B981',
    desc: 'Local runtime · 127.0.0.1:11434',
  },
  {
    id: 'cache',
    label: 'cached.deterministic',
    kind: 'fallback',
    icon: Database,
    color: '#F59E0B',
    desc: 'Deterministic cached payloads · no network',
  },
] as const;

export default function BlackoutPage() {
  const blackout = useOnyx((s) => s.blackout);
  const events = useOnyx((s) => s.events);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const transitions = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.kind === 'BLACKOUT_ENTER' ||
            e.kind === 'BLACKOUT_EXIT' ||
            e.kind === 'INFERENCE_ROUTE',
        )
        .slice(-20)
        .reverse(),
    [events],
  );

  const uptime =
    now && blackout.since > 0 ? Math.max(0, Math.round((now - blackout.since) / 1000)) : 0;

  const toggle = async () => {
    await fetch(`${ONYX_HTTP}/blackout/simulate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enable: blackout.online }),
    });
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Shield size={16} />}
        title="Blackout protocol"
        subtitle="Autonomous continuity · inference fallback routing"
        meta={
          <>
            <Badge tone={blackout.online ? 'ok' : 'critical'}>
              {blackout.online ? <Wifi size={11} /> : <WifiOff size={11} />}
              {blackout.online ? 'Link nominal' : 'Link severed'}
            </Badge>
            <Badge tone="muted">Uptime · {uptime}s</Badge>
            <button
              onClick={toggle}
              className={`btn ${blackout.online ? 'btn-outline' : 'btn-accent'} h-8 px-3 text-[12.5px]`}
            >
              {blackout.online ? 'Simulate blackout' : 'Restore link'}
            </button>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-4 auto-rows-min overflow-auto surface-base">
        {/* Provider chain */}
        <Panel title="Continuity integrity" right={blackout.reason} className="col-span-12">
          <div className="grid grid-cols-3 gap-6 items-stretch py-2">
            {PROVIDERS.map((p, i) => {
              const active = p.id === blackout.provider;
              const Icon = p.icon;
              return (
                <div key={p.id} className="relative">
                  <motion.div
                    initial={false}
                    animate={{ scale: active ? 1 : 0.99, opacity: active ? 1 : 0.6 }}
                    transition={{ duration: 0.3 }}
                    className={`rounded-xl border p-4 transition ${
                      active
                        ? 'border-[#4F46E5] dark:border-indigo-400/40 bg-[#FAFBFF] dark:bg-indigo-400/[0.04] shadow-panel-lg'
                        : 'border-line bg-surface-raised'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-md flex items-center justify-center"
                        style={{ background: p.color + '14', color: p.color }}
                      >
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="text-[11.5px] text-tertiary capitalize">{p.kind}</div>
                        <div className="text-[12.5px] font-semibold text-primary">{p.id}</div>
                      </div>
                      {active && <Badge tone="ok" className="ml-auto">Active</Badge>}
                    </div>
                    <div className="mt-3 font-mono text-[12px] text-secondary truncate">
                      {p.label}
                    </div>
                    <div className="mt-2 text-[11.5px] text-tertiary leading-relaxed">{p.desc}</div>
                  </motion.div>
                  {i < PROVIDERS.length - 1 && (
                    <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 text-tertiary z-10">
                      <ArrowRight size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Routing state" className="col-span-5">
          <div className="space-y-1">
            <Row label="Online" value={blackout.online ? 'true' : 'false'} tone={blackout.online ? 'ok' : 'critical'} />
            <Row label="Provider" value={blackout.provider} tone={blackout.online ? 'info' : 'warn'} />
            <Row label="Reason" value={blackout.reason} />
            <Row label="Since" value={blackout.since > 0 ? fmtClock(blackout.since) : '—'} />
            <Row label="Uptime" value={`${uptime}s`} />
          </div>
        </Panel>

        <Panel title="Transition log" right={`${transitions.length} events`} className="col-span-7" inner="p-0" scroll>
          <div>
            {transitions.map((e) => (
              <div
                key={e.id}
                className="px-4 py-2.5 border-b border-subtle flex items-center gap-3"
              >
                <span className="text-[11px] text-tertiary tabular-nums">{fmtShortTs(e.ts)}</span>
                <Badge
                  tone={
                    e.kind === 'BLACKOUT_ENTER'
                      ? 'critical'
                      : e.kind === 'BLACKOUT_EXIT'
                        ? 'ok'
                        : 'info'
                  }
                >
                  {e.kind.replace(/_/g, ' ').toLowerCase()}
                </Badge>
                <span className="text-[12.5px] text-primary truncate">{e.target}</span>
              </div>
            ))}
            {transitions.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-secondary">
                No inference route transitions yet
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
