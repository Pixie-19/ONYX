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
        icon={<Settings size={16} />}
        title="Settings"
        subtitle="Runtime configuration · providers · environment"
        meta={
          <>
            <Badge tone={connected ? 'ok' : 'error'}>
              {connected ? 'Agent linked' : 'Agent offline'}
            </Badge>
            <Badge tone="muted">Session · {session ?? '—'}</Badge>
            <Badge tone="muted">Uptime · {health?.uptime_s ?? '—'}s</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-4 overflow-auto auto-rows-min surface-base">
        <Panel title="Endpoints" className="col-span-6">
          <div>
            <Row label="Agent HTTP" value={ONYX_HTTP} />
            <Row label="Agent WS" value={process.env.NEXT_PUBLIC_ONYX_AGENT_WS ?? 'ws://127.0.0.1:4311/stream'} />
            <Row label="Cockpit" value="http://127.0.0.1:3000" />
            <Row label="Health" value={`${ONYX_HTTP}/health`} link />
            <Row label="Replay API" value={`${ONYX_HTTP}/replay/window`} link />
            <Row label="Demo API" value={`${ONYX_HTTP}/demo/inject`} />
          </div>
        </Panel>

        <Panel title="Inference providers" className="col-span-6">
          <div>
            <Row label="Active" value={blackout.provider} tone={blackout.online ? 'info' : 'warn'} />
            <Row label="Online" value={blackout.online ? 'true' : 'false'} tone={blackout.online ? 'ok' : 'critical'} />
            <Row label="Mistral" value="codestral-latest" />
            <Row label="Ollama" value="open-codestral-7b @ 127.0.0.1:11434" />
            <Row label="Cache" value="deterministic fallback" />
            <Row label="Last reason" value={blackout.reason} />
          </div>
        </Panel>

        <Panel title="Coral source" className="col-span-6">
          <div>
            <Row label="Name" value="onyx_cognition" />
            <Row label="Namespace" value="onyx" />
            <Row label="Transport" value="mcp · stdio" />
            <Row label="Ingestion" value="streaming · jsonl" />
            <Row label="Tables" value="6" tone="info" />
          </div>
          <div className="mt-4 text-[12px] text-secondary">
            See <code className="text-[#4F46E5] font-mono">coral/manifest.yaml</code> for the full spec.
          </div>
        </Panel>

        <Panel title="Keybinds" className="col-span-6">
          <div className="space-y-1">
            <Kbd k="⌘K / Ctrl K" v="Open command palette" />
            <Kbd k="D" v="Run cinematic 4-phase cascade" />
            <Kbd k="B" v="Toggle blackout protocol" />
            <Kbd k="C" v="Toggle cinema replay mode" />
            <Kbd k="Esc" v="Close palette or overlay" />
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
  link,
}: {
  label: string;
  value: string;
  tone?: 'info' | 'warn' | 'error' | 'critical' | 'ok' | 'muted';
  link?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-subtle last:border-b-0">
      <span className="text-[12px] text-secondary">{label}</span>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-[12.5px] text-[#4F46E5] dark:text-indigo-300 hover:underline flex items-center gap-1 truncate max-w-[60%]"
        >
          <span className="truncate font-mono">{value}</span>
          <ExternalLink size={11} className="shrink-0" />
        </a>
      ) : tone ? (
        <Badge tone={tone}>{value}</Badge>
      ) : (
        <span className="text-[12.5px] text-primary font-mono truncate max-w-[60%]">{value}</span>
      )}
    </div>
  );
}

function Kbd({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-subtle last:border-b-0">
      <span className="kbd min-w-[100px] text-center">{k}</span>
      <span className="text-[12.5px] text-secondary">{v}</span>
    </div>
  );
}
