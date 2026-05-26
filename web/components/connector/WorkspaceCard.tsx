'use client';
import { Link as LinkIcon, GitBranch, Folder, Trash2, RotateCcw, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { FrameworkBadge } from './FrameworkBadge';
import { detachWorkspaceApi, rescanWorkspaceApi, syncGithubApi } from '@/lib/workspace';
import { fmtShortTs, cn } from '@/lib/format';
import type { WorkspaceRow } from '@/lib/types';

export function WorkspaceCard({
  ws,
  active,
  onSelect,
}: {
  ws: WorkspaceRow;
  active?: boolean;
  onSelect?: () => void;
}) {
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
    if (result.ok)
      toast.success('GitHub synced', { description: `${result.indexed ?? 0} commits indexed` });
    else toast.error('GitHub sync failed', { description: result.error ?? 'unknown' });
  };

  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ y: -1 }}
      className={cn(
        'rounded-xl border text-left w-full p-3 transition bg-surface-raised hover:shadow-panel-lg cursor-pointer',
        active ? 'border-[#4F46E5] shadow-panel-lg' : 'border-line',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-surface-sunken flex items-center justify-center text-secondary shrink-0">
          <Folder size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[13px] font-semibold text-primary truncate">{ws.name}</span>
            {ws.status === 'demo' && <Badge tone="warn">Demo</Badge>}
            {ws.status === 'attached' && <Badge tone="ok">Attached</Badge>}
            {ws.status === 'error' && <Badge tone="critical">Error</Badge>}
            {active && <Badge tone="info">Active</Badge>}
          </div>
          <div className="text-[11px] text-tertiary font-mono truncate">{ws.path}</div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <FrameworkBadge framework={ws.framework} />
            {ws.package_manager && <Badge tone="muted">{ws.package_manager}</Badge>}
            {ws.language && <Badge tone="muted">{ws.language}</Badge>}
            <Badge tone="muted">{ws.file_count} files</Badge>
            {remote && (
              <span className="inline-flex items-center gap-1 text-[11px] text-tertiary">
                <LinkIcon size={10} /> {remote}
              </span>
            )}
            {ws.git_branch && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#4F46E5] dark:text-indigo-300">
                <GitBranch size={10} /> {ws.git_branch}
              </span>
            )}
          </div>
          <div className="mt-2 text-[10.5px] text-tertiary">
            Attached {fmtShortTs(ws.attached_at)}
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={rescan} title="Rescan" className="btn-icon !w-7 !h-7">
            <RotateCcw size={12} />
          </button>
          {ws.git_remote && (
            <button onClick={syncGh} title="Sync GitHub" className="btn-icon !w-7 !h-7">
              <RefreshCw size={12} />
            </button>
          )}
          <button
            onClick={detach}
            title="Detach"
            className="btn-icon !w-7 !h-7 hover:!text-[#EF4444]"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function prettifyRemote(remote: string): string {
  const m = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (m) return `${m[1]}/${m[2]}`;
  return remote.length > 40 ? remote.slice(0, 38) + '…' : remote;
}
