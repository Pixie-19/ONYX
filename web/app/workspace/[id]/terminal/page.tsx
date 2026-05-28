'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Terminal as TerminalIcon, ArrowLeft, X } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { TerminalConsole } from '@/components/connector/TerminalConsole';
import { TerminalLauncher } from '@/components/connector/TerminalLauncher';
import { useOnyx } from '@/lib/store';
import { fmtShortTs, cn } from '@/lib/format';
import type { TerminalSession } from '@/lib/types';

export default function WorkspaceTerminalPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params?.id ?? '';

  const workspaces = useOnyx((s) => s.workspaces);
  const terminals = useOnyx((s) => s.terminals);

  const workspace = workspaces.find((w) => w.id === workspaceId) ?? null;
  const wsTerminals = useMemo(
    () => terminals.filter((t) => t.workspace_id === workspaceId),
    [terminals, workspaceId],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // pick a session by default — prefer running, else most recent
  useEffect(() => {
    if (selectedId && wsTerminals.some((t) => t.id === selectedId)) return;
    const running = wsTerminals.find((t) => t.status === 'running');
    setSelectedId(running?.id ?? wsTerminals[0]?.id ?? null);
  }, [wsTerminals, selectedId]);

  const selected = wsTerminals.find((t) => t.id === selectedId) ?? null;

  if (!workspace) {
    return (
      <div className="h-full flex flex-col">
        <PageHeader
          icon={<TerminalIcon size={16} />}
          title="Terminal"
          subtitle="Workspace not found"
          meta={
            <Link href="/connect" className="btn btn-outline h-7 px-2.5 text-[11.5px]">
              <ArrowLeft size={11} /> back to connector
            </Link>
          }
        />
        <div className="flex-1 p-6 surface-base text-[13px] text-secondary">
          Workspace <code className="font-mono">{workspaceId}</code> is not attached. Open the
          connector page and attach it first.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<TerminalIcon size={16} />}
        title={`${workspace.name} · terminal`}
        subtitle="Real-time stdout / stderr · port discovery · framework signals"
        meta={
          <>
            <Badge tone="muted">{wsTerminals.length} session{wsTerminals.length === 1 ? '' : 's'}</Badge>
            <Link href="/connect" className="btn btn-outline h-7 px-2.5 text-[11.5px]">
              <ArrowLeft size={11} /> connector
            </Link>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-4 overflow-auto auto-rows-min surface-base">
        <Panel
          title="Launch dev command"
          className="col-span-12 min-h-[140px]"
        >
          <TerminalLauncher
            workspace={workspace}
            onSpawned={(s) => setSelectedId(s.id)}
          />
        </Panel>

        <Panel
          title="Sessions"
          right={`${wsTerminals.length}`}
          className="col-span-4 min-h-[360px]"
          inner="p-0"
          scroll
        >
          <div>
            {wsTerminals.map((t) => (
              <SessionRow
                key={t.id}
                session={t}
                active={selectedId === t.id}
                onClick={() => setSelectedId(t.id)}
              />
            ))}
            {wsTerminals.length === 0 && (
              <div className="px-4 py-8 text-center text-[12px] text-secondary">
                No terminal sessions yet — pick a dev command above to spawn one.
              </div>
            )}
          </div>
        </Panel>

        <div className="col-span-8 min-h-[360px]">
          {selected ? (
            <TerminalConsole session={selected} height={460} />
          ) : (
            <Panel title="Terminal stream" className="min-h-[360px]">
              <div className="text-center py-10 text-[12.5px] text-secondary">
                Select or spawn a session to start streaming.
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionRow({
  session,
  active,
  onClick,
}: {
  session: TerminalSession;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 border-b border-subtle hover:bg-surface-sunken transition',
        active && 'bg-[#EEF2FF] dark:bg-indigo-400/10',
      )}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-mono text-[12px] text-primary truncate flex-1">{session.command}</span>
        <Badge
          tone={
            session.status === 'running' ? 'ok'
              : session.status === 'crashed' ? 'critical'
                : 'muted'
          }
        >
          {session.status}
        </Badge>
      </div>
      <div className="flex items-center gap-1.5 text-[10.5px] text-tertiary flex-wrap">
        <span>pid {session.pid ?? '—'}</span>
        <span>·</span>
        <span>{fmtShortTs(session.started_at)}</span>
        {session.ports && session.ports.length > 0 && (
          <>
            <span>·</span>
            {session.ports.map((p) => (
              <span key={p} className="font-mono text-[#4F46E5] dark:text-indigo-300">:{p}</span>
            ))}
          </>
        )}
        {(session.restart_count ?? 0) > 0 && (
          <>
            <span>·</span>
            <span>↻{session.restart_count}</span>
          </>
        )}
        {session.last_signal === 'crash' && (
          <X size={10} className="text-[#B91C1C] ml-auto" />
        )}
      </div>
    </button>
  );
}
