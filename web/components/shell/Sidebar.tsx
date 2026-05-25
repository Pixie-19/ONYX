'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, Terminal } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { SECTIONS } from '@/lib/sections';
import { Tooltip } from '@/components/ui/Tooltip';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/format';

interface Props {
  expanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ expanded, onToggle }: Props) {
  const pathname = usePathname();
  const events = useOnyx((s) => s.events);
  const intel = useOnyx((s) => s.intelligence);
  const network = useOnyx((s) => s.network);
  const blackout = useOnyx((s) => s.blackout);
  const setCommandOpen = useOnyx((s) => s.setCommandOpen);

  // Live activity counts per section — drives the activity dot indicator.
  const counts = useMemo(() => {
    const since = Date.now() - 30_000;
    const recent = (pred?: (e: any) => boolean) =>
      events.filter((e) => e.ts > since && (pred ? pred(e) : true)).length;
    return {
      graph:          recent((e) => e.kind.startsWith('AST_') || e.kind === 'FILE_MODIFIED'),
      telemetry:      recent((e) => ['CPU_SPIKE','MEMORY_PRESSURE','THERMAL_ALERT'].includes(e.kind)),
      replay:         recent(),
      sql:            intel.length,
      infrastructure: recent((e) => ['SOCKET_RETRY','LATENCY_SURGE','DEPENDENCY_DEGRADED'].includes(e.kind))
                      + network.filter((n) => n.status !== 'healthy').length,
      stability:      recent((e) => ['BUILD_CRASH','COMPILER_FAILURE'].includes(e.kind)),
      blackout:       blackout.online ? 0 : 1,
      events:         events.length,
      intelligence:   intel.length,
      workspace:      recent((e) => e.kind === 'FILE_MODIFIED' || e.kind === 'AST_DEPENDENCY_CHANGE'),
      demo:           0,
      settings:       0,
    } as Record<string, number>;
  }, [events, intel, network, blackout]);

  return (
    <aside
      className={cn(
        'relative h-full flex flex-col border-r border-onyx-600/40 bg-onyx-950/80 backdrop-blur z-10',
        'transition-[width] duration-200',
        expanded ? 'w-[220px]' : 'w-[64px]',
      )}
    >
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      <div className="relative flex items-center justify-between px-3 h-12 border-b border-onyx-600/40">
        <Link href="/" className="flex items-center gap-2">
          <Brand expanded={expanded} />
        </Link>
        <button
          onClick={onToggle}
          className="text-onyx-300 hover:text-cyan-glow transition p-1"
          aria-label="toggle sidebar"
        >
          {expanded ? <ChevronsLeft size={14} /> : <ChevronsRight size={14} />}
        </button>
      </div>

      <nav className="relative flex-1 overflow-auto py-2">
        {SECTIONS.map((s) => {
          const isActive = pathname === s.href || pathname.startsWith(s.href + '/');
          const Icon = s.icon;
          const count = counts[s.key] ?? 0;
          const node = (
            <Link
              key={s.key}
              href={s.href}
              className={cn('rail-item w-full', isActive && 'active')}
              style={{ flexDirection: expanded ? 'row' : 'column', justifyContent: expanded ? 'flex-start' : 'center', gap: expanded ? 12 : 4, padding: expanded ? '10px 14px' : '10px 0' }}
            >
              <Icon size={expanded ? 16 : 18} strokeWidth={1.5} />
              <span
                className={cn(
                  'tracking-[0.18em] uppercase',
                  expanded ? 'text-[11px]' : 'text-[8.5px]',
                )}
              >
                {expanded ? s.label : s.short}
              </span>
              {count > 0 && !isActive && <span className="activity-dot" />}
            </Link>
          );
          return expanded ? node : (
            <Tooltip key={s.key} label={s.label}>{node}</Tooltip>
          );
        })}

        <div className="my-2 mx-3 border-t border-onyx-600/30" />

        {/* Console — opens command palette */}
        <Tooltip label="Open Command Palette · ⌘K">
          <button
            onClick={() => setCommandOpen(true)}
            className={cn('rail-item w-full')}
            style={{ flexDirection: expanded ? 'row' : 'column', justifyContent: expanded ? 'flex-start' : 'center', gap: expanded ? 12 : 4, padding: expanded ? '10px 14px' : '10px 0' }}
          >
            <Terminal size={expanded ? 16 : 18} strokeWidth={1.5} />
            <span className={cn('tracking-[0.18em] uppercase', expanded ? 'text-[11px]' : 'text-[8.5px]')}>
              {expanded ? 'Console · ⌘K' : 'CMD'}
            </span>
          </button>
        </Tooltip>
      </nav>

      <div className="relative border-t border-onyx-600/40 px-3 py-3 space-y-1.5">
        {expanded ? (
          <>
            <div className="flex items-center justify-between text-[9.5px] tracking-[0.18em] uppercase text-onyx-300">
              <span>Active Workspace</span>
              <span className="flex items-center gap-1.5"><span className="heartbeat" /> ALIVE</span>
            </div>
            <ActiveWorkspaceBadge />
            <Badge tone={blackout.online ? 'info' : 'critical'} className="w-full justify-center">
              {blackout.online ? 'INFER · LINKED' : 'AUTONOMOUS MODE'}
            </Badge>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="heartbeat" />
          </div>
        )}
      </div>
    </aside>
  );
}

function ActiveWorkspaceBadge() {
  const workspaces = useOnyx((s) => s.workspaces);
  const activeId = useOnyx((s) => s.activeWorkspaceId);
  const active = workspaces.find((w) => w.id === activeId);
  if (!active) {
    return (
      <Link href="/connect" className="block">
        <Badge tone="warn" className="w-full justify-center">NO WORKSPACE · ATTACH ↗</Badge>
      </Link>
    );
  }
  return (
    <Link href="/connect" className="block">
      <Badge tone={active.status === 'demo' ? 'warn' : 'ok'} className="w-full justify-center truncate">
        {active.name.length > 22 ? active.name.slice(0, 22) + '…' : active.name}
      </Badge>
    </Link>
  );
}

function Brand({ expanded }: { expanded: boolean }) {
  if (!expanded) {
    return (
      <svg width="22" height="22" viewBox="0 0 64 64" className="text-cyan-glow drop-shadow-[0_0_4px_rgba(34,232,255,0.5)]">
        <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.65" />
        <circle cx="32" cy="32" r="3" fill="currentColor" />
        <path d="M10 32 H 20 M 44 32 H 54 M 32 10 V 20 M 32 44 V 54" stroke="currentColor" strokeWidth="1.4" opacity="0.85" />
      </svg>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 64 64" className="text-cyan-glow">
        <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.65" />
        <circle cx="32" cy="32" r="3" fill="currentColor" />
        <path d="M10 32 H 20 M 44 32 H 54 M 32 10 V 20 M 32 44 V 54" stroke="currentColor" strokeWidth="1.4" opacity="0.85" />
      </svg>
      <div className="text-[13px] font-display tracking-[0.32em] text-cyan-glow glow-cyan select-none">ONYX</div>
    </div>
  );
}
