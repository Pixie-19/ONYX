'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Folder, FolderInput, Github, Terminal as TerminalIcon, History, ArrowRight, Sparkles } from 'lucide-react';
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
  { id: 'local',    title: 'Open Local Workspace',  caption: 'Attach a real local repository — ONYX scans the source tree, detects the framework, and starts streaming filesystem + AST telemetry.', icon: Folder,        accent: '#22e8ff', status: 'available' },
  { id: 'terminal', title: 'Attach Running Terminal', caption: 'Spawn and capture a dev command (next dev, vite, npm run dev). ONYX parses stdout for build/HMR/crash signal.',                          icon: TerminalIcon,  accent: '#9b6cff', status: 'available' },
  { id: 'github',   title: 'Connect GitHub Repository', caption: 'Index recent commits from the workspace remote into the relational store for failure-correlation joins.',                              icon: Github,        accent: '#46f5b8', status: 'available' },
  { id: 'session',  title: 'Import Previous Session', caption: 'Restore workspaces persisted from a prior ONYX session — done automatically on agent boot.',                                             icon: History,       accent: '#ffb84a', status: 'beta' },
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
      setPath(''); setName('');
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
    <div className="relative panel p-6 backdrop-blur-md min-w-[860px]">
      <span className="bracket-top-l" />
      <span className="bracket-top-r" />
      <span className="bracket-bot-l" />
      <span className="bracket-bot-r" />

      <div className="flex items-center gap-3 mb-2">
        <FolderInput size={16} className="text-cyan-glow" />
        <span className="text-[12px] tracking-[0.36em] uppercase text-cyan-glow glow-cyan">ONYX WORKSPACE CONNECTOR</span>
        <Badge tone="muted" className="ml-auto">{workspaces.length} ATTACHED</Badge>
      </div>
      <p className="text-[12px] text-onyx-300 leading-relaxed max-w-[640px]">
        ONYX must connect to a real project before telemetry interception begins. Choose a connection slot below — once
        attached, the operational graph initialises and every filesystem, AST, runtime, and network signal will stream
        through the event bus.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {SLOTS.map((slot) => {
          const Icon = slot.icon;
          const active = openSlot === slot.id;
          return (
            <motion.div
              key={slot.id}
              layout
              className={cn(
                'panel relative p-3 transition cursor-pointer overflow-hidden',
                active && 'focus-aura',
              )}
              onClick={() => setOpenSlot(active ? null : slot.id)}
              whileHover={{ y: -1 }}
            >
              <span className="bracket-top-l" />
              <span className="bracket-top-r" />
              <span className="bracket-bot-l" />
              <span className="bracket-bot-r" />
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={14} style={{ color: slot.accent }} />
                <span className="text-[11px] tracking-[0.22em] uppercase text-onyx-100">{slot.title}</span>
                {slot.status === 'beta' && <Badge tone="warn" className="ml-auto">BETA</Badge>}
                {slot.status === 'available' && <ArrowRight size={12} className="ml-auto text-onyx-300" />}
              </div>
              <p className="text-[11px] text-onyx-300 leading-relaxed">{slot.caption}</p>

              {active && slot.id === 'local' && (
                <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <Field label="ABSOLUTE PATH"  value={path} onChange={setPath} placeholder="C:\\Projects\\my-app  or  /Users/dev/my-app" autoFocus />
                  <Field label="DISPLAY NAME"   value={name} onChange={setName} placeholder="(optional — defaults to folder basename)" />
                  <div className="flex items-center justify-between">
                    <button
                      disabled={pending || !path.trim()}
                      onClick={submitLocal}
                      className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-3 py-1.5 border border-cyan-glow/60 text-cyan-glow hover:bg-cyan-glow/10 transition disabled:opacity-40"
                    >
                      {pending ? 'ATTACHING…' : 'ATTACH WORKSPACE'}
                    </button>
                    <button
                      type="button"
                      onClick={useDemo}
                      disabled={pending}
                      className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-3 py-1.5 border border-violet-glow/60 text-violet-glow hover:bg-violet-glow/10 transition disabled:opacity-40"
                    >
                      <Sparkles size={11} /> USE ONYX REPO AS DEMO
                    </button>
                  </div>
                </div>
              )}

              {active && slot.id === 'terminal' && (
                <div className="mt-3 text-[10.5px] text-onyx-300 leading-relaxed" onClick={(e) => e.stopPropagation()}>
                  Attach a workspace first — terminal sessions spawn from <code className="text-cyan-glow">/workspace/[id]/terminal</code>.
                </div>
              )}
              {active && slot.id === 'github' && (
                <div className="mt-3 text-[10.5px] text-onyx-300 leading-relaxed" onClick={(e) => e.stopPropagation()}>
                  Attach a local workspace with a github remote — ONYX will detect and offer the sync action from the workspace card. Set <code className="text-cyan-glow">GITHUB_TOKEN</code> in the agent env for private repos.
                </div>
              )}
              {active && slot.id === 'session' && (
                <div className="mt-3 text-[10.5px] text-onyx-300 leading-relaxed" onClick={(e) => e.stopPropagation()}>
                  Sessions are restored automatically on agent boot from the <code className="text-cyan-glow">workspaces</code> table — nothing to do here.
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 hr-label">SCANNING SUBSYSTEM</div>
      <div className="mt-2 flex items-center gap-6">
        <ScanAnimation size={120} />
        <div className="text-[11px] text-onyx-300 leading-relaxed max-w-[420px]">
          On attach: <span className="text-onyx-100">chokidar</span> spins up a per-workspace watcher,
          the AST analyser snapshots structural state into <code className="text-cyan-glow">execution_snapshots</code>,
          and the runtime discovery engine probes dev ports to seed
          <code className="text-cyan-glow"> workspace_processes</code>. Topology nodes materialise in real time.
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, autoFocus }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <div>
      <div className="panel-label mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-onyx-900/60 border border-onyx-600/40 px-3 py-2 text-[12px] font-mono text-onyx-100 placeholder:text-onyx-300 outline-none focus:border-cyan-glow/60"
      />
    </div>
  );
}
