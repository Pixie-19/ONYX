'use client';
import { useMemo } from 'react';
import { FolderInput, Cpu, Plug } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { WorkspaceConnector } from '@/components/connector/WorkspaceConnector';
import { WorkspaceCard } from '@/components/connector/WorkspaceCard';
import { fmtShortTs } from '@/lib/format';
import type { WorkspaceProcessRow } from '@/lib/types';

export default function ConnectPage() {
  const workspaces = useOnyx((s) => s.workspaces);
  const activeId = useOnyx((s) => s.activeWorkspaceId);
  const setActive = useOnyx((s) => s.setActiveWorkspace);
  const processes = useOnyx((s) => s.workspaceProcesses);

  const services = useMemo(() => {
    const m = new Map<string, WorkspaceProcessRow>();
    for (const p of processes.slice().reverse()) {
      const key = p.port ? `port:${p.port}` : `pid:${p.pid}:${p.command}`;
      if (!m.has(key)) m.set(key, p);
      if (m.size >= 12) break;
    }
    return [...m.values()];
  }, [processes]);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<FolderInput size={16} />}
        title="Workspace connector"
        subtitle="Attach a real project · activate execution intelligence"
        meta={
          <>
            <Badge tone={workspaces.length > 0 ? 'ok' : 'warn'}>
              {workspaces.length} workspace{workspaces.length === 1 ? '' : 's'}
            </Badge>
            <Badge tone="muted">{services.length} runtime services</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6 surface-base">
        <div className="grid grid-cols-12 gap-4 max-w-[1320px] mx-auto">
          <div className="col-span-8">
            <WorkspaceConnector />
          </div>

          <div className="col-span-4 space-y-4">
            <Panel title="Attached workspaces" right={`${workspaces.length}`} className="min-h-[240px]">
              <div className="space-y-2 max-h-[460px] overflow-auto">
                {workspaces.map((ws) => (
                  <WorkspaceCard
                    key={ws.id}
                    ws={ws}
                    active={ws.id === activeId}
                    onSelect={() => setActive(ws.id)}
                  />
                ))}
                {workspaces.length === 0 && (
                  <div className="text-[12.5px] text-secondary leading-relaxed py-8 text-center">
                    No workspaces attached. Connect a real project above to activate the intelligence pipeline.
                  </div>
                )}
              </div>
            </Panel>

            <Panel
              title="Runtime discovery"
              right="Last 30s"
              badge={
                <span className="inline-flex items-center gap-1 text-[11.5px] text-[#047857] dark:text-emerald-300">
                  <Plug size={11} /> live
                </span>
              }
              className="min-h-[240px]"
            >
              <div className="space-y-1 max-h-[300px] overflow-auto">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-line bg-surface-raised"
                  >
                    <Cpu size={12} className="text-tertiary shrink-0" />
                    <span className="text-[12px] text-primary truncate flex-1 font-mono">
                      {s.command}
                    </span>
                    {s.port && <Badge tone="info">:{s.port}</Badge>}
                    <Badge tone="muted">{s.kind}</Badge>
                    <span className="text-[10.5px] text-tertiary tabular-nums">
                      {fmtShortTs(s.ts)}
                    </span>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="text-[12.5px] text-secondary py-6 text-center">
                    Probing common dev ports — start a dev server to populate.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
