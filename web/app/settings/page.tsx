'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, ExternalLink, Bell, Zap, Brain, Github, Eye, EyeOff } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
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
  const userPreferences = useOnyx((s) => s.userPreferences);
  const updateUserPreferences = useOnyx((s) => s.updateUserPreferences);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const tick = () => {
      fetch(`${ONYX_HTTP}/health`).then((r) => r.json()).then(setHealth).catch(() => {});
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, []);

  const handlePreferenceChange = (key: keyof typeof userPreferences, value: unknown) => {
    updateUserPreferences({ [key]: value });
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Settings size={16} />}
        title="Settings"
        subtitle="Configure notifications, preferences, and integrations"
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
        {/* Preferences section */}
        <Panel title="Preferences" className="col-span-6">
          <div className="space-y-4">
            <ToggleSetting
              label="Notifications"
              desc="Receive system and event notifications"
              checked={userPreferences.notificationsEnabled}
              onChange={(v) => handlePreferenceChange('notificationsEnabled', v)}
              icon={<Bell size={14} />}
            />
            <Separator />
            <ToggleSetting
              label="AI Routing"
              desc="Route inference requests through Mistral/Ollama"
              checked={userPreferences.aiRoutingEnabled}
              onChange={(v) => handlePreferenceChange('aiRoutingEnabled', v)}
              icon={<Brain size={14} />}
            />
            <Separator />
            <ToggleSetting
              label="Telemetry"
              desc="Send anonymous telemetry data"
              checked={userPreferences.telemetryEnabled}
              onChange={(v) => handlePreferenceChange('telemetryEnabled', v)}
              icon={<Zap size={14} />}
            />
            <Separator />
            <SelectSetting
              label="AI Provider"
              desc="Choose your preferred AI model provider"
              value={userPreferences.aiProvider}
              onChange={(v) => handlePreferenceChange('aiProvider', v)}
              options={[
                { value: 'mistral', label: 'Mistral (Cloud)' },
                { value: 'ollama', label: 'Ollama (Local)' },
                { value: 'cache', label: 'Cache (Fallback)' },
              ]}
            />
            <Separator />
            <SelectSetting
              label="Theme"
              desc="Choose your color scheme"
              value={userPreferences.theme}
              onChange={(v) => handlePreferenceChange('theme', v)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
          </div>
        </Panel>

        {/* AI & Inference */}
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

        {/* Endpoints */}
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

        {/* Coral source */}
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

        {/* Keybinds */}
        <Panel title="Keybinds" className="col-span-6">
          <div className="space-y-1">
            <Kbd k="⌘K / Ctrl K" v="Open command palette" />
            <Kbd k="D" v="Run cinematic 4-phase cascade" />
            <Kbd k="B" v="Toggle blackout protocol" />
            <Kbd k="C" v="Toggle cinema replay mode" />
            <Kbd k="Esc" v="Close palette or overlay" />
          </div>
        </Panel>

        {/* Advanced settings */}
        <Panel title="Advanced" className="col-span-6">
          <motion.div
            initial={false}
            animate={{ height: showAdvanced ? 'auto' : '40px' }}
            className="overflow-hidden"
          >
            {!showAdvanced ? (
              <button
                onClick={() => setShowAdvanced(true)}
                className="flex items-center gap-2 text-[12px] text-secondary hover:text-primary transition"
              >
                <Eye size={12} />
                Show advanced options
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setShowAdvanced(false)}
                  className="flex items-center gap-2 text-[12px] text-secondary hover:text-primary transition"
                >
                  <EyeOff size={12} />
                  Hide advanced options
                </button>
                <Separator />
                <div className="text-[12px] text-tertiary space-y-2">
                  <p>Event retention: 512 events</p>
                  <p>Telemetry window: 180 rows</p>
                  <p>Network tracking: 240 entries</p>
                  <p>Terminal buffer: 400 lines</p>
                </div>
              </div>
            )}
          </motion.div>
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

function ToggleSetting({
  label,
  desc,
  checked,
  onChange,
  icon,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1">
        <div className="text-tertiary">{icon}</div>
        <div>
          <p className="text-[12px] font-medium text-primary">{label}</p>
          <p className="text-[11px] text-tertiary">{desc}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition flex items-center px-0.5 shrink-0 ${
          checked
            ? 'bg-[#4338CA]'
            : 'bg-surface-sunken'
        }`}
      >
        <motion.div
          layout
          className={`w-5 h-5 rounded-full ${checked ? 'bg-white' : 'bg-secondary'}`}
        />
      </button>
    </div>
  );
}

function SelectSetting({
  label,
  desc,
  value,
  onChange,
  options,
}: {
  label: string;
  desc: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[12px] font-medium text-primary">{label}</p>
        <p className="text-[11px] text-tertiary">{desc}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2.5 py-1.5 rounded bg-surface-sunken border border-line text-[12px] text-primary outline-none hover:bg-surface-inset transition"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
