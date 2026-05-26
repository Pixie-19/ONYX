'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Folder, FolderInput, Github, Terminal as TerminalIcon, History, ArrowRight, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { connectWorkspaceApi, ensureDemoWorkspaceApi } from '@/lib/workspace';
import { useOnyx } from '@/lib/store';
import { ScanAnimation } from './ScanAnimation';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/format';

interface Slot {
  id: 'local' | 'terminal' | 'github' | 'session';
  title: string;
  caption: string;
  icon: typeof Folder;
  accent: string;
  status: 'available' | 'beta';
}

const SLOTS: Slot[] = [
  {
    id: 'local',
    title: 'Open local workspace',
    caption:
      'Attach a real local repository. ONYX scans the source tree, detects the framework, and starts streaming filesystem and AST telemetry.',
    icon: Folder,
    accent: '#4F46E5',
    status: 'available',
  },
  {
    id: 'terminal',
    title: 'Attach running terminal',
    caption:
      'Spawn and capture a dev command (next dev, vite, npm run dev). ONYX parses stdout for build, HMR, and crash signal.',
    icon: TerminalIcon,
    accent: '#7C3AED',
    status: 'available',
  },
  {
    id: 'github',
    title: 'Connect GitHub repository',
    caption:
      'Index recent commits from the workspace remote into the relational store for failure-correlation joins.',
    icon: Github,
    accent: '#10B981',
    status: 'available',
  },
  {
    id: 'session',
    title: 'Import previous session',
    caption:
      'Restore workspaces persisted from a prior ONYX session — done automatically on agent boot.',
    icon: History,
    accent: '#F59E0B',
    status: 'beta',
  },
];

export function WorkspaceConnector({ onAttached }: { onAttached?: () => void }) {
  const workspaces = useOnyx((s) => s.workspaces);
  const [openSlot, setOpenSlot] = useState<Slot['id'] | null>(null);
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);

  const submitLocal = async () => {
    if (!path.trim()) return;
    setPending(true);
    try {
      const ws = await connectWorkspaceApi({ path: path.trim(), name: name.trim() || undefined });
      toast.success('Workspace attached', { description: ws.name });
      setOpenSlot(null);
      setPath('');
      setName('');
      onAttached?.();
    } catch (err) {
      toast.error('Attach failed', { description: String(err) });
    } finally {
      setPending(false);
    }
  };

  const useDemo = async () => {
    setPending(true);
    try {
      const ws = await ensureDemoWorkspaceApi();
      if (ws) toast.success('Demo workspace ready', { description: ws.name });
      else toast.error('Could not attach demo workspace');
      onAttached?.();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] dark:bg-indigo-400/15 flex items-center justify-center">
          <FolderInput size={16} className="text-[#4F46E5] dark:text-indigo-300" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-primary">Workspace connector</div>
          <div className="text-[12px] text-secondary">
            Attach a real project to activate the intelligence pipeline
          </div>
        </div>
        <Badge tone="muted" className="ml-auto">
          {workspaces.length} attached
        </Badge>
      </div>
      <p className="text-[12.5px] text-secondary leading-relaxed max-w-[700px]">
        ONYX must connect to a real project before telemetry interception begins. Choose a slot
        below — once attached, the operational graph initialises and every filesystem, AST, runtime
        and network signal streams through the event bus.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {SLOTS.map((slot) => {
          const Icon = slot.icon;
          const active = openSlot === slot.id;
          return (
            <motion.div
              key={slot.id}
              layout
              onClick={() => setOpenSlot(active ? null : slot.id)}
              whileHover={{ y: -1 }}
              className={cn(
                'rounded-xl border bg-surface-raised hover:shadow-panel-lg p-4 transition cursor-pointer',
                active ? 'border-[#4F46E5] shadow-panel-lg' : 'border-line',
              )}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: slot.accent + '14', color: slot.accent }}
                >
                  <Icon size={14} />
                </div>
                <span className="text-[13px] font-semibold text-primary">{slot.title}</span>
                {slot.status === 'beta' && <Badge tone="warn" className="ml-auto">Beta</Badge>}
                {slot.status === 'available' && !active && (
                  <ArrowRight size={13} className="ml-auto text-tertiary" />
                )}
              </div>
              <p className="text-[12.5px] text-secondary leading-relaxed">{slot.caption}</p>

              {active && slot.id === 'local' && (
                <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                  <Field
                    label="Absolute path"
                    value={path}
                    onChange={setPath}
                    placeholder="C:\Projects\my-app  or  /Users/dev/my-app"
                    autoFocus
                  />
                  <Field
                    label="Display name"
                    value={name}
                    onChange={setName}
                    placeholder="(optional — defaults to folder basename)"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      disabled={pending || !path.trim()}
                      onClick={submitLocal}
                      className="btn btn-accent h-9 px-3 text-[12.5px] disabled:opacity-50"
                    >
                      {pending ? 'Attaching…' : 'Attach workspace'}
                    </button>
                    <button
                      type="button"
                      onClick={useDemo}
                      disabled={pending}
                      className="btn btn-outline h-9 px-3 text-[12.5px] disabled:opacity-50"
                    >
                      <Sparkles size={12} /> Use ONYX repo as demo
                    </button>
                  </div>
                </div>
              )}

              {active && slot.id === 'terminal' && (
                <div className="mt-3 text-[12px] text-secondary leading-relaxed" onClick={(e) => e.stopPropagation()}>
                  Attach a workspace first — terminal sessions spawn from{' '}
                  <code className="text-[#4F46E5] font-mono dark:text-indigo-300">
                    /workspace/[id]/terminal
                  </code>
                  .
                </div>
              )}
              {active && slot.id === 'github' && (
                <div className="mt-3 text-[12px] text-secondary leading-relaxed" onClick={(e) => e.stopPropagation()}>
                  Attach a local workspace with a github remote — ONYX will detect and offer the
                  sync action from the workspace card. Set{' '}
                  <code className="text-[#4F46E5] font-mono dark:text-indigo-300">GITHUB_TOKEN</code> in the agent env for private
                  repos.
                </div>
              )}
              {active && slot.id === 'session' && (
                <div className="mt-3 text-[12px] text-secondary leading-relaxed" onClick={(e) => e.stopPropagation()}>
                  Sessions are restored automatically on agent boot from the{' '}
                  <code className="text-[#4F46E5] font-mono dark:text-indigo-300">workspaces</code> table — nothing to do here.
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 hr-label">Scanning subsystem</div>
      <div className="mt-3 flex items-center gap-6">
        <ScanAnimation size={120} />
        <div className="text-[12.5px] text-secondary leading-relaxed max-w-[460px]">
          On attach: <span className="text-primary font-medium">chokidar</span> spins up a
          per-workspace watcher, the AST analyser snapshots structural state into{' '}
          <code className="text-[#4F46E5] font-mono dark:text-indigo-300">execution_snapshots</code>, and
          the runtime discovery engine probes dev ports to seed{' '}
          <code className="text-[#4F46E5] font-mono dark:text-indigo-300">workspace_processes</code>.
          Topology nodes materialise in real time.
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <div className="text-[11.5px] font-medium text-secondary mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-9 px-3 rounded-md border border-line bg-surface-raised text-[12.5px] text-primary placeholder:text-tertiary font-mono outline-none focus:border-[#4F46E5] focus:shadow-focus transition"
      />
    </div>
  );
}
