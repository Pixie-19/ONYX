'use client';
import { Link as LinkIcon, GitBranch, Folder, Trash2, RotateCcw, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { FrameworkBadge } from './FrameworkBadge';
import { detachWorkspaceApi, rescanWorkspaceApi, syncGithubApi } from '@/lib/workspace';
import { fmtShortTs, cn } from '@/lib/format';
import type { WorkspaceRow } from '@/lib/types';

export function WorkspaceCard({ ws, active, onSelect }: { ws: WorkspaceRow; active?: boolean; onSelect?: () => void }) {
  const remote = ws.git_remote ? prettifyRemote(ws.git_remote) : null;

  const detach = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await detachWorkspaceApi(ws.id);
      toast.success('Workspace detached', { description: ws.name });
    } catch (err) {
      toast.error('Detach failed', { description: String(err) });
    }
  };
  const rescan = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await rescanWorkspaceApi(ws.id);
      toast.success('Workspace rescanned', { description: ws.name });
    } catch (err) {
      toast.error('Rescan failed', { description: String(err) });
    }
  };
  const syncGh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await syncGithubApi(ws.id);
    if (result.ok) toast.success('GitHub synced', { description: `${result.indexed ?? 0} commits indexed` });
    else toast.error('GitHub sync failed', { description: result.error ?? 'unknown' });
  };

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -1 }}
      className={cn(
        'panel relative text-left w-full p-3 transition',
        active && 'focus-aura',
      )}
    >
      <span className="bracket-top-l" />
      <span className="bracket-top-r" />
      <span className="bracket-bot-l" />
      <span className="bracket-bot-r" />

      <div className="flex items-start gap-3">
        <div className="text-cyan-glow mt-0.5"><Folder size={14} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-display tracking-[0.18em] uppercase text-onyx-100 truncate">{ws.name}</span>
            {ws.status === 'demo' && <Badge tone="warn">DEMO</Badge>}
            {ws.status === 'attached' && <Badge tone="ok">ATTACHED</Badge>}
            {ws.status === 'error' && <Badge tone="critical">ERROR</Badge>}
            {active && <Badge tone="info">ACTIVE</Badge>}
          </div>
          <div className="text-[10px] text-onyx-300 font-mono truncate">{ws.path}</div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <FrameworkBadge framework={ws.framework} />
            {ws.package_manager && <Badge tone="muted">{ws.package_manager.toUpperCase()}</Badge>}
            {ws.language && <Badge tone="muted">{ws.language.toUpperCase()}</Badge>}
            <Badge tone="muted">{ws.file_count} FILES</Badge>
            {remote && (
              <span className="flex items-center gap-1 text-[10px] text-onyx-300">
                <LinkIcon size={10} /> {remote}
              </span>
            )}
            {ws.git_branch && (
              <span className="flex items-center gap-1 text-[10px] text-cyan-glow">
                <GitBranch size={10} /> {ws.git_branch}
              </span>
            )}
          </div>
          <div className="mt-2 text-[9.5px] tracking-[0.18em] uppercase text-onyx-300">
            attached {fmtShortTs(ws.attached_at)}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <button onClick={rescan}  title="Rescan"      className="p-1 text-onyx-300 hover:text-cyan-glow transition"><RotateCcw size={12} /></button>
          {ws.git_remote && (
            <button onClick={syncGh} title="Sync GitHub" className="p-1 text-onyx-300 hover:text-violet-glow transition"><Cpu size={12} /></button>
          )}
          <button onClick={detach}  title="Detach"      className="p-1 text-onyx-300 hover:text-signal-error transition"><Trash2 size={12} /></button>
        </div>
      </div>
    </motion.button>
  );
}

function prettifyRemote(remote: string): string {
  const m = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (m) return `${m[1]}/${m[2]}`;
  return remote.length > 40 ? remote.slice(0, 38) + '…' : remote;
}
