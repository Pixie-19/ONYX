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

  // de-duplicate runtime services by port (latest wins)
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
        icon={<FolderInput size={14} />}
        title="WORKSPACE CONNECTOR"
        subtitle="Attach a real project · activate execution intelligence"
        meta={
          <>
            <Badge tone={workspaces.length > 0 ? 'ok' : 'warn'}>
              {workspaces.length} WORKSPACE{workspaces.length === 1 ? '' : 'S'}
            </Badge>
            <Badge tone="muted">{services.length} RUNTIME SERVICES</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="grid grid-cols-12 gap-4 max-w-[1280px] mx-auto">
          <div className="col-span-8">
            <WorkspaceConnector />
          </div>

          <div className="col-span-4 space-y-3">
            <Panel title="ATTACHED WORKSPACES" right={`${workspaces.length}`} className="min-h-[200px]">
              <div className="space-y-2 max-h-[420px] overflow-auto">
                {workspaces.map((ws) => (
                  <WorkspaceCard
                    key={ws.id}
                    ws={ws}
                    active={ws.id === activeId}
                    onSelect={() => setActive(ws.id)}
                  />
                ))}
                {workspaces.length === 0 && (
                  <div className="text-[10.5px] tracking-[0.18em] uppercase text-onyx-300 leading-relaxed py-6 text-center">
                    No workspaces attached. Connect a real project above to activate the intelligence pipeline.
                  </div>
                )}
              </div>
            </Panel>

            <Panel
              title="RUNTIME DISCOVERY"
              right="LAST 30s"
              badge={<Badge tone="info"><Plug size={10} /> LIVE</Badge>}
              className="min-h-[200px]"
            >
              <div className="space-y-1 font-mono text-[11px] max-h-[260px] overflow-auto">
                {services.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-2 py-1 border border-onyx-600/20 bg-onyx-900/40">
                    <Cpu size={11} className="text-cyan-glow shrink-0" />
                    <span className="text-onyx-100 truncate flex-1">{s.command}</span>
                    {s.port && <Badge tone="info" className="!py-0">:{s.port}</Badge>}
                    <Badge tone="muted" className="!py-0">{s.kind.toUpperCase()}</Badge>
                    <span className="text-onyx-300 tabular-nums text-[9.5px]">{fmtShortTs(s.ts)}</span>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="text-[10.5px] tracking-[0.18em] uppercase text-onyx-300 py-4 text-center">
                    Probing common dev ports… start a dev server to populate.
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
