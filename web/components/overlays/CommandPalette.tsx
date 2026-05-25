'use client';
import { useEffect } from 'react';
import { Command } from 'cmdk';
import { useOnyx } from '@/lib/store';
import { ONYX_HTTP } from '@/lib/format';
import {
  Activity, Database, GitBranch, Layers, Network, Radio,
  Settings, Shield, Terminal, Zap, RefreshCcw, Sparkles, Play, Square,
} from 'lucide-react';
import { toast } from 'sonner';

export function CommandPalette() {
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
      toast.success(label, { description: 'dispatched to onyx-agent' });
    } catch (err) {
      toast.error(label, { description: String(err) });
    }
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4 bg-onyx-950/60 backdrop-blur-[2px]"
      onClick={close}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[640px]">
        <Command label="ONYX command console" loop>
          <Command.Input placeholder="› command, query, target…" autoFocus />
          <Command.List>
            <Command.Empty>NO MATCHING DIRECTIVE</Command.Empty>

            <Command.Group heading="OPERATIONS">
              <Command.Item onSelect={action('Run cascade demo', () => fetch(`${ONYX_HTTP}/demo/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario: 'cascade' }) }))}>
                <Zap size={13} /> Run cascade demo
                <span cmdk-shortcut="">D</span>
              </Command.Item>
              <Command.Item onSelect={action(blackout.online ? 'Simulate blackout' : 'Restore inference link', () => fetch(`${ONYX_HTTP}/blackout/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enable: blackout.online }) }))}>
                <Shield size={13} /> {blackout.online ? 'Trigger blackout protocol' : 'Restore inference link'}
                <span cmdk-shortcut="">B</span>
              </Command.Item>
              <Command.Item onSelect={() => { setCinema(!cinemaMode); close(); }}>
                {cinemaMode ? <Square size={13} /> : <Play size={13} />}
                {cinemaMode ? 'Exit cinema mode' : 'Enter cinema mode'}
                <span cmdk-shortcut="">C</span>
              </Command.Item>
              <Command.Item onSelect={action('Trigger analyst digest', () => fetch(`${ONYX_HTTP}/analyst`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'Summarise operational state in one sentence.' }) }))}>
                <Sparkles size={13} /> Trigger analyst digest
              </Command.Item>
              <Command.Item onSelect={action('Reload replay window', () => fetch(`${ONYX_HTTP}/replay/window`))}>
                <RefreshCcw size={13} /> Reload replay window
              </Command.Item>
            </Command.Group>

            <Command.Group heading="INTELLIGENCE QUERIES">
              {['q.failure_cascades','q.developer_friction','q.dependency_health','q.instability_predict','q.dependency_bottleneck'].map((q) => (
                <Command.Item
                  key={q}
                  onSelect={action(`Run ${q}`, () => fetch(`${ONYX_HTTP}/intelligence/run/${q}`))}
                >
                  <Database size={13} /> {q}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="NAVIGATION">
              <Command.Item><Layers   size={13} /> Operational Graph</Command.Item>
              <Command.Item><Activity size={13} /> Telemetry</Command.Item>
              <Command.Item><GitBranch size={13} /> Replay Engine</Command.Item>
              <Command.Item><Network  size={13} /> Infrastructure</Command.Item>
              <Command.Item><Radio    size={13} /> Event Stream</Command.Item>
              <Command.Item><Terminal size={13} /> Console</Command.Item>
              <Command.Item><Settings size={13} /> System Settings</Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
