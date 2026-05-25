'use client';
import { useEffect, useState } from 'react';
import { Settings, ExternalLink } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { ONYX_HTTP } from '@/lib/format';

interface HealthPayload {
  ok: boolean;
  session: string;
  uptime_s: number;
  ts: number;
}

export default function SettingsPage() {
  const blackout = useOnyx((s) => s.blackout);
  const session = useOnyx((s) => s.session);
  const connected = useOnyx((s) => s.connected);
  const [health, setHealth] = useState<HealthPayload | null>(null);

  useEffect(() => {
    const tick = () => {
      fetch(`${ONYX_HTTP}/health`).then((r) => r.json()).then(setHealth).catch(() => {});
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Settings size={14} />}
        title="SYSTEM SETTINGS"
        subtitle="Runtime configuration · providers · environment"
        meta={
          <>
            <Badge tone={connected ? 'ok' : 'error'}>{connected ? 'AGENT · LINKED' : 'AGENT · OFFLINE'}</Badge>
            <Badge tone="muted">SESSION · {session ?? '——'}</Badge>
            <Badge tone="muted">UPTIME · {health?.uptime_s ?? '—'}s</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-3 grid grid-cols-12 gap-3 overflow-auto auto-rows-min">
        <Panel title="ENDPOINTS" className="col-span-6">
          <div className="space-y-2 font-mono text-[11px]">
            <Row label="AGENT HTTP"   value={ONYX_HTTP} />
            <Row label="AGENT WS"     value={(process.env.NEXT_PUBLIC_ONYX_AGENT_WS ?? 'ws://127.0.0.1:4311/stream')} />
            <Row label="COCKPIT"      value="http://127.0.0.1:3000" />
            <Row label="HEALTH"       value={`${ONYX_HTTP}/health`} link />
            <Row label="REPLAY API"   value={`${ONYX_HTTP}/replay/window`} link />
            <Row label="DEMO API"     value={`${ONYX_HTTP}/demo/inject`} />
          </div>
        </Panel>

        <Panel title="INFERENCE PROVIDERS" className="col-span-6">
          <div className="space-y-2 font-mono text-[11px]">
            <Row label="ACTIVE"     value={blackout.provider.toUpperCase()} tone={blackout.online ? 'info' : 'warn'} />
            <Row label="ONLINE"     value={blackout.online ? 'TRUE' : 'FALSE'} tone={blackout.online ? 'ok' : 'critical'} />
            <Row label="MISTRAL"    value="codestral-latest" />
            <Row label="OLLAMA"     value="open-codestral-7b @ 127.0.0.1:11434" />
            <Row label="CACHE"      value="deterministic fallback" />
            <Row label="LAST REASON" value={blackout.reason} tone="muted" />
          </div>
        </Panel>

        <Panel title="CORAL SOURCE" className="col-span-6">
          <div className="space-y-2 font-mono text-[11px]">
            <Row label="NAME"       value="onyx_cognition" />
            <Row label="NAMESPACE"  value="onyx" />
            <Row label="TRANSPORT"  value="mcp · stdio" />
            <Row label="INGESTION"  value="streaming · jsonl" />
            <Row label="TABLES"     value="6" tone="info" />
          </div>
          <div className="mt-3 text-[10px] tracking-[0.18em] uppercase text-onyx-300">
            See <code className="text-cyan-glow font-mono">coral/manifest.yaml</code> for the full spec.
          </div>
        </Panel>

        <Panel title="KEYBINDS" className="col-span-6">
          <div className="space-y-1.5 font-mono text-[11px]">
            <Kbd k="⌘K / Ctrl+K" v="Open command palette" />
            <Kbd k="D"             v="Run cinematic 4-phase cascade" />
            <Kbd k="B"             v="Toggle blackout protocol" />
            <Kbd k="C"             v="Toggle cinema replay mode" />
            <Kbd k="Esc"           v="Close palette / overlay" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value, tone, link }: { label: string; value: string; tone?: 'info' | 'warn' | 'error' | 'critical' | 'ok' | 'muted'; link?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-onyx-300 tracking-[0.18em] uppercase text-[10px]">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-cyan-glow hover:text-cyan-glow/80 flex items-center gap-1 truncate">
          <span className="truncate max-w-[280px]">{value}</span>
          <ExternalLink size={10} />
        </a>
      ) : tone ? (
        <Badge tone={tone}>{value}</Badge>
      ) : (
        <span className="text-onyx-100 truncate max-w-[320px]">{value}</span>
      )}
    </div>
  );
}

function Kbd({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] tracking-[0.18em] uppercase text-onyx-100 px-2 py-0.5 border border-onyx-600/40 bg-onyx-900/60 min-w-[80px] text-center">{k}</span>
      <span className="text-onyx-300">{v}</span>
    </div>
  );
}
