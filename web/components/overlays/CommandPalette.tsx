'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useOnyx } from '@/lib/store';
import { ONYX_HTTP } from '@/lib/format';
import {
  Activity, Database, GitBranch, Layers, Network, Radio,
  Settings, Shield, Terminal, Zap, RefreshCcw, Sparkles, Play, Square,
  LayoutGrid, BarChart3, Folder, FolderInput,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Raycast-style command palette. Same actions and intelligence queries as
 * before — backend wiring (ONYX_HTTP endpoints, sonner toasts, blackout /
 * cinema toggles) is preserved exactly.
 */
export function CommandPalette() {
  const router = useRouter();
  const open = useOnyx((s) => s.commandOpen);
  const setOpen = useOnyx((s) => s.setCommandOpen);
  const setCinema = useOnyx((s) => s.setCinema);
  const blackout = useOnyx((s) => s.blackout);
  const cinemaMode = useOnyx((s) => s.cinemaMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const close = () => setOpen(false);
  const action = (label: string, fn: () => Promise<unknown> | unknown) => async () => {
    try {
      await fn();
      toast.success(label, { description: 'Dispatched to onyx-agent' });
    } catch (err) {
      toast.error(label, { description: String(err) });
    }
    close();
  };
  const nav = (href: string) => () => {
    router.push(href);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[14vh] px-4 bg-black/30 dark:bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[640px]">
        <Command label="ONYX command palette" loop>
          <Command.Input placeholder="Type a command, query or page name…" autoFocus />
          <Command.List>
            <Command.Empty>No matching command</Command.Empty>

            <Command.Group heading="Operations">
              <Command.Item
                onSelect={action('Run cascade demo', () =>
                  fetch(`${ONYX_HTTP}/demo/run`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ scenario: 'cascade' }),
                  }),
                )}
              >
                <Zap size={14} /> Run cascade demo
                <span cmdk-shortcut="">D</span>
              </Command.Item>
              <Command.Item
                onSelect={action(blackout.online ? 'Simulate blackout' : 'Restore inference link', () =>
                  fetch(`${ONYX_HTTP}/blackout/simulate`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ enable: blackout.online }),
                  }),
                )}
              >
                <Shield size={14} />
                {blackout.online ? 'Trigger blackout protocol' : 'Restore inference link'}
                <span cmdk-shortcut="">B</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCinema(!cinemaMode);
                  close();
                }}
              >
                {cinemaMode ? <Square size={14} /> : <Play size={14} />}
                {cinemaMode ? 'Exit cinema mode' : 'Enter cinema mode'}
                <span cmdk-shortcut="">C</span>
              </Command.Item>
              <Command.Item
                onSelect={action('Trigger analyst digest', () =>
                  fetch(`${ONYX_HTTP}/analyst`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ prompt: 'Summarise operational state in one sentence.' }),
                  }),
                )}
              >
                <Sparkles size={14} /> Trigger analyst digest
              </Command.Item>
              <Command.Item
                onSelect={action('Reload replay window', () => fetch(`${ONYX_HTTP}/replay/window`))}
              >
                <RefreshCcw size={14} /> Reload replay window
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Intelligence queries">
              {['q.failure_cascades', 'q.developer_friction', 'q.dependency_health', 'q.instability_predict', 'q.dependency_bottleneck'].map((q) => (
                <Command.Item
                  key={q}
                  onSelect={action(`Run ${q}`, () => fetch(`${ONYX_HTTP}/intelligence/run/${q}`))}
                >
                  <Database size={14} /> {q}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Navigation">
              <Command.Item onSelect={nav('/')}><LayoutGrid size={14} /> Overview</Command.Item>
              <Command.Item onSelect={nav('/graph')}><Layers size={14} /> Operational Graph</Command.Item>
              <Command.Item onSelect={nav('/telemetry')}><Activity size={14} /> Telemetry</Command.Item>
              <Command.Item onSelect={nav('/replay')}><GitBranch size={14} /> Replay Engine</Command.Item>
              <Command.Item onSelect={nav('/sql')}><Database size={14} /> SQL Intelligence</Command.Item>
              <Command.Item onSelect={nav('/infrastructure')}><Network size={14} /> Infrastructure</Command.Item>
              <Command.Item onSelect={nav('/workspace')}><Folder size={14} /> Workspace Cognition</Command.Item>
              <Command.Item onSelect={nav('/events')}><Radio size={14} /> Event Stream</Command.Item>
              <Command.Item onSelect={nav('/intelligence')}><Sparkles size={14} /> AI Intelligence</Command.Item>
              <Command.Item onSelect={nav('/stability')}><BarChart3 size={14} /> Build Stability</Command.Item>
              <Command.Item onSelect={nav('/blackout')}><Shield size={14} /> Blackout Protocol</Command.Item>
              <Command.Item onSelect={nav('/connect')}><FolderInput size={14} /> Workspace Connector</Command.Item>
              <Command.Item onSelect={nav('/demo')}><Terminal size={14} /> Demo Orchestrator</Command.Item>
              <Command.Item onSelect={nav('/settings')}><Settings size={14} /> Settings</Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
