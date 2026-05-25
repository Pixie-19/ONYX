'use client';
import { useEffect, useState, useMemo } from 'react';
import { Shield, ArrowRight, Wifi, WifiOff, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { fmtClock, fmtShortTs, ONYX_HTTP } from '@/lib/format';

const PROVIDERS = [
  { id: 'mistral', label: 'mistral.codestral-latest', kind: 'cloud',  color: '#22e8ff' },
  { id: 'ollama',  label: 'ollama.open-codestral-7b', kind: 'local',  color: '#46f5b8' },
  { id: 'cache',   label: 'cached.deterministic',     kind: 'fallback', color: '#ffb84a' },
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

  const transitions = useMemo(() =>
    events.filter((e) => e.kind === 'BLACKOUT_ENTER' || e.kind === 'BLACKOUT_EXIT' || e.kind === 'INFERENCE_ROUTE')
      .slice(-20).reverse(),
    [events],
  );

  const uptime = now && blackout.since > 0 ? Math.max(0, Math.round((now - blackout.since) / 1000)) : 0;

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
        icon={<Shield size={14} />}
        title="BLACKOUT PROTOCOL"
        subtitle="Autonomous continuity · inference fallback routing"
        meta={
          <>
            <Badge tone={blackout.online ? 'ok' : 'critical'}>
              {blackout.online ? <Wifi size={10} /> : <WifiOff size={10} />}
              {blackout.online ? 'LINK · NOMINAL' : 'LINK · SEVERED'}
            </Badge>
            <Badge tone="muted">UPTIME · {uptime}s</Badge>
            <button
              onClick={toggle}
              className="text-[10px] uppercase tracking-[0.22em] px-3 py-1 border border-violet-glow/60 text-violet-glow hover:bg-violet-glow/10 transition"
            >
              {blackout.online ? 'SIMULATE BLACKOUT' : 'RESTORE LINK'}
            </button>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-3 grid grid-cols-12 gap-3 auto-rows-min overflow-auto">
        {/* Continuity status */}
        <Panel title="CONTINUITY INTEGRITY" right={blackout.reason} className="col-span-12">
          <div className="grid grid-cols-3 gap-4 items-center py-2">
            {PROVIDERS.map((p, i) => {
              const active = p.id === blackout.provider;
              return (
                <div key={p.id} className="relative">
                  <motion.div
                    initial={false}
                    animate={{
                      boxShadow: active
                        ? `0 0 0 1px ${p.color}aa, 0 0 24px ${p.color}55, inset 0 0 12px ${p.color}22`
                        : '0 0 0 1px rgba(80,101,131,0.35)',
                    }}
                    className={'panel relative p-3 ' + (active ? '' : 'opacity-60')}
                  >
                    <span className="bracket-top-l" style={{ borderColor: active ? p.color : undefined }} />
                    <span className="bracket-top-r" style={{ borderColor: active ? p.color : undefined }} />
                    <span className="bracket-bot-l" style={{ borderColor: active ? p.color : undefined }} />
                    <span className="bracket-bot-r" style={{ borderColor: active ? p.color : undefined }} />
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu size={12} style={{ color: p.color }} />
                      <span className="text-[10px] tracking-[0.22em] uppercase" style={{ color: p.color }}>{p.kind}</span>
                      {active && <Badge tone="ok" className="ml-auto">ACTIVE</Badge>}
                    </div>
                    <div className="font-mono text-[12px] text-onyx-100">{p.label}</div>
                    <div className="mt-2 text-[10px] tracking-[0.18em] uppercase text-onyx-300">
                      {p.id === 'mistral' ? 'requires outbound link · auth bearer'
                        : p.id === 'ollama'  ? 'local runtime · 127.0.0.1:11434'
                        : 'deterministic cached payloads · no network'}
                    </div>
                  </motion.div>
                  {i < PROVIDERS.length - 1 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 text-onyx-300">
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="ROUTING STATE" className="col-span-5">
          <div className="space-y-1.5 font-mono text-[11px]">
            <Row label="ONLINE"   value={blackout.online ? 'TRUE' : 'FALSE'} tone={blackout.online ? 'ok' : 'critical'} />
            <Row label="PROVIDER" value={blackout.provider.toUpperCase()} tone={blackout.online ? 'info' : 'warn'} />
            <Row label="REASON"   value={blackout.reason} tone="muted" />
            <Row label="SINCE"    value={blackout.since > 0 ? fmtClock(blackout.since) : '——'} tone="muted" />
            <Row label="UPTIME"   value={`${uptime}s`} tone="muted" />
          </div>
        </Panel>

        <Panel title="TRANSITION LOG" right={`${transitions.length} EVENTS`} className="col-span-7" inner="p-0" scroll>
          <div className="font-mono text-[10.5px]">
            {transitions.map((e) => (
              <div key={e.id} className="px-3 py-1.5 border-b border-onyx-600/15">
                <div className="flex items-center gap-2">
                  <span className="text-onyx-300 tabular-nums">{fmtShortTs(e.ts)}</span>
                  <Badge tone={e.kind === 'BLACKOUT_ENTER' ? 'critical' : e.kind === 'BLACKOUT_EXIT' ? 'ok' : 'info'}>{e.kind}</Badge>
                  <span className="text-onyx-100">{e.target}</span>
                </div>
              </div>
            ))}
            {transitions.length === 0 && (
              <div className="px-3 py-4 text-[10px] uppercase tracking-[0.18em] text-onyx-300">no inference route transitions yet</div>
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
