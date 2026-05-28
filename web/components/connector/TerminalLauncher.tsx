'use client';
import { useEffect, useMemo, useState } from 'react';
import { Play, Terminal as TerminalIcon, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { spawnTerminalApi } from '@/lib/workspace';
import { cn } from '@/lib/format';
import type { WorkspaceRow, TerminalSession, Framework } from '@/lib/types';

/**
 * Inline launcher — picks a dev command (from package.json scripts, or one of
 * the framework-aware presets) and spawns a real supervised process via the
 * agent. Lives inside the terminal slot of the Workspace Connector and on
 * the per-workspace terminal page.
 */

interface CommandSuggestion {
  label: string;
  command: string;
  hint?: string;
  priority: number;
}

function presetsFor(framework: Framework | null | undefined, pm: string | null): CommandSuggestion[] {
  const out: CommandSuggestion[] = [];
  const run = pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : pm === 'bun' ? 'bun' : 'npm';
  const runArg = pm === 'pnpm' || pm === 'yarn' || pm === 'bun' ? '' : 'run ';
  switch (framework) {
    case 'next':
      out.push({ label: 'next dev', command: `${run} ${runArg}dev`, hint: 'next dev', priority: 10 });
      out.push({ label: 'next build', command: `${run} ${runArg}build`, hint: 'production build', priority: 5 });
      break;
    case 'vite':
      out.push({ label: 'vite dev', command: `${run} ${runArg}dev`, hint: 'vite dev server', priority: 10 });
      break;
    case 'react':
      out.push({ label: 'start', command: `${run} start`, hint: 'react-scripts start', priority: 10 });
      break;
    case 'bun':
      out.push({ label: 'bun dev', command: 'bun dev', hint: 'bun runtime', priority: 10 });
      break;
    case 'fastapi':
      out.push({ label: 'uvicorn', command: 'uvicorn main:app --reload', hint: 'fastapi reload', priority: 10 });
      break;
    case 'django':
      out.push({ label: 'manage.py runserver', command: 'python manage.py runserver', hint: 'django dev server', priority: 10 });
      break;
    case 'flask':
      out.push({ label: 'flask run', command: 'flask run --debug', hint: 'flask dev server', priority: 10 });
      break;
    case 'node':
    case 'express':
    case 'fastify':
      out.push({ label: 'dev', command: `${run} ${runArg}dev`, hint: 'package dev script', priority: 10 });
      out.push({ label: 'start', command: `${run} start`, hint: 'package start script', priority: 5 });
      break;
    case 'python':
      out.push({ label: 'python main.py', command: 'python main.py', hint: 'python script', priority: 8 });
      break;
    default:
      out.push({ label: 'dev', command: `${run} ${runArg}dev`, hint: 'package dev script', priority: 5 });
  }
  return out;
}

function metaScripts(ws: WorkspaceRow, pm: string | null): CommandSuggestion[] {
  try {
    const meta = JSON.parse(ws.meta_json ?? '{}');
    const scripts = (meta?.scripts ?? {}) as Record<string, string>;
    const run = pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : pm === 'bun' ? 'bun' : 'npm';
    const runArg = pm === 'pnpm' || pm === 'yarn' || pm === 'bun' ? '' : 'run ';
    const priority = (name: string) => {
      if (/^(dev|start|serve)$/i.test(name)) return 9;
      if (/dev|start|serve/i.test(name)) return 7;
      if (/build|test|lint/i.test(name)) return 2;
      return 4;
    };
    return Object.keys(scripts)
      .filter((name) => !/^(prepare|postinstall)$/i.test(name))
      .map((name) => ({
        label: name,
        command: `${run} ${runArg}${name}`.trim(),
        hint: scripts[name],
        priority: priority(name),
      }));
  } catch {
    return [];
  }
}

export function TerminalLauncher({
  workspace,
  onSpawned,
  className,
}: {
  workspace: WorkspaceRow;
  onSpawned?: (session: TerminalSession) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const suggestions = useMemo(() => {
    const pm = workspace.package_manager;
    const fromScripts = metaScripts(workspace, pm);
    const fromPresets = presetsFor(workspace.framework, pm);
    // dedupe by command, prefer scripts (real package.json) over presets
    const seen = new Set<string>();
    const all = [...fromScripts, ...fromPresets].filter((s) => {
      const key = s.command;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return all.sort((a, b) => b.priority - a.priority).slice(0, 8);
  }, [workspace]);

  // reset custom state when workspace changes
  useEffect(() => {
    setCustom('');
    setShowCustom(false);
  }, [workspace.id]);

  const spawn = async (command: string) => {
    if (!command.trim()) return;
    setBusy(command);
    try {
      const session = await spawnTerminalApi({
        workspace_id: workspace.id,
        cwd: workspace.path,
        command,
      });
      toast.success('Terminal spawned', { description: command });
      onSpawned?.(session);
    } catch (err) {
      toast.error('Spawn failed', { description: String(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-[11.5px] text-secondary">
        Pick a dev command — ONYX spawns the process under supervision and streams stdout, stderr,
        ports, HMR signals and crash signatures through the event bus.
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s.command}
            onClick={() => spawn(s.command)}
            disabled={busy !== null}
            title={s.hint}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11.5px] transition',
              'border-line bg-surface-raised hover:border-[#4F46E5] hover:shadow-panel-lg',
              busy === s.command && 'opacity-60',
            )}
          >
            {busy === s.command ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Play size={11} className="text-[#4F46E5]" />
            )}
            <span className="font-mono">{s.label}</span>
            {s.priority >= 8 && (
              <Zap size={10} className="text-[#F59E0B]" />
            )}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11.5px] transition',
            'border-dashed border-line bg-surface-raised hover:border-[#4F46E5]',
            showCustom && 'border-[#4F46E5] text-[#4F46E5]',
          )}
        >
          <TerminalIcon size={11} />
          <span>custom</span>
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. npm run dev"
            className="flex-1 h-8 px-2 rounded-md border border-line bg-surface-raised text-[12px] font-mono outline-none focus:border-[#4F46E5] focus:shadow-focus"
          />
          <button
            onClick={() => spawn(custom)}
            disabled={busy !== null || !custom.trim()}
            className="btn btn-accent h-8 px-3 text-[12px] disabled:opacity-50"
          >
            {busy === custom ? 'Spawning…' : 'Spawn'}
          </button>
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <Badge tone="muted">cwd · {workspace.path}</Badge>
        {workspace.framework && <Badge tone="info">{workspace.framework}</Badge>}
        {workspace.package_manager && <Badge tone="muted">{workspace.package_manager}</Badge>}
      </div>
    </div>
  );
}
