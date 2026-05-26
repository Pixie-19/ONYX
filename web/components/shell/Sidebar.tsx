'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Folder, ChevronsLeft, ChevronsRight, Terminal, LayoutGrid,
} from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { SECTIONS } from '@/lib/sections';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/format';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

// Light visual grouping — keeps the rail scannable without dense dividers.
const GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Overview',     keys: ['overview'] },
  { label: 'Intelligence', keys: ['graph', 'telemetry', 'replay', 'sql', 'intelligence'] },
  { label: 'Operations',   keys: ['infrastructure', 'events', 'stability', 'workspace'] },
  { label: 'Continuity',   keys: ['blackout'] },
  { label: 'Workspace',    keys: ['connect', 'demo', 'settings'] },
];

export function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const events = useOnyx((s) => s.events);
  const intel = useOnyx((s) => s.intelligence);
  const network = useOnyx((s) => s.network);
  const blackout = useOnyx((s) => s.blackout);
  const setCommandOpen = useOnyx((s) => s.setCommandOpen);

  // Live activity counters per route — drives the small dot indicator.
  const counts = useMemo(() => {
    const since = Date.now() - 30_000;
    const recent = (pred?: (e: any) => boolean) =>
      events.filter((e) => e.ts > since && (pred ? pred(e) : true)).length;
    return {
      graph:          recent((e) => e.kind.startsWith('AST_') || e.kind === 'FILE_MODIFIED'),
      telemetry:      recent((e) => ['CPU_SPIKE', 'MEMORY_PRESSURE', 'THERMAL_ALERT'].includes(e.kind)),
      replay:         recent(),
      sql:            intel.length,
      infrastructure: recent((e) => ['SOCKET_RETRY', 'LATENCY_SURGE', 'DEPENDENCY_DEGRADED'].includes(e.kind))
                      + network.filter((n) => n.status !== 'healthy').length,
      stability:      recent((e) => ['BUILD_CRASH', 'COMPILER_FAILURE'].includes(e.kind)),
      blackout:       blackout.online ? 0 : 1,
      events:         events.length,
      intelligence:   intel.length,
      workspace:      recent((e) => e.kind === 'FILE_MODIFIED' || e.kind === 'AST_DEPENDENCY_CHANGE'),
      overview:       0,
      demo:           0,
      settings:       0,
      connect:        0,
    } as Record<string, number>;
  }, [events, intel, network, blackout]);

  // We extend SECTIONS with a virtual "Overview" item at the top.
  const overviewItem = {
    key: 'overview',
    label: 'Overview',
    short: 'OVR',
    icon: LayoutGrid,
    href: '/',
    caption: 'Executive summary of the running platform.',
  };
  const allItems = [overviewItem, ...SECTIONS];

  return (
    <aside
      className={cn(
        'relative h-full flex flex-col border-r border-line bg-surface-raised z-10',
        'transition-[width] duration-200',
        collapsed ? 'w-[64px]' : 'w-[236px]',
      )}
    >
      {/* Brand row */}
      <div className="relative flex items-center justify-between px-3 h-14 border-b border-line">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <Brand collapsed={collapsed} />
        </Link>
        <button
          onClick={onToggle}
          className="btn-icon shrink-0"
          aria-label="toggle sidebar"
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 overflow-auto py-3">
        {GROUPS.map((g, gi) => {
          const items = g.keys
            .map((k) => allItems.find((s) => s.key === k))
            .filter(Boolean) as typeof allItems;
          if (items.length === 0) return null;
          return (
            <div key={g.label} className={cn(gi > 0 && 'mt-3')}>
              {!collapsed && (
                <div className="px-4 pb-1.5 eyebrow text-[10px] tracking-[0.10em]">
                  {g.label}
                </div>
              )}
              <div className="flex flex-col">
                {items.map((s) => {
                  const isActive =
                    s.href === '/'
                      ? pathname === '/'
                      : pathname === s.href || pathname.startsWith(s.href + '/');
                  const Icon = s.icon;
                  const count = counts[s.key] ?? 0;
                  const link = (
                    <Link
                      key={s.key}
                      href={s.href}
                      className={cn(
                        'rail-item',
                        isActive && 'active',
                        collapsed && 'justify-center !px-0 !mx-2',
                      )}
                    >
                      <Icon size={16} strokeWidth={1.7} className="shrink-0" />
                      {!collapsed && (
                        <span className="truncate">{s.label}</span>
                      )}
                      {!collapsed && count > 0 && !isActive && (
                        <span className="ml-auto text-[10.5px] font-medium text-tertiary tabular-nums">
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                      {collapsed && count > 0 && !isActive && (
                        <span className="activity-dot" style={{ right: 8, top: 8, transform: 'none' }} />
                      )}
                    </Link>
                  );
                  return collapsed ? (
                    <Tooltip key={s.key} label={s.label} side="right">
                      {link}
                    </Tooltip>
                  ) : (
                    <div key={s.key}>{link}</div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="mt-3 mx-3 hairline" />

        {/* Command palette opener */}
        <div className="mt-2">
          {collapsed ? (
            <Tooltip label="Command palette · ⌘K" side="right">
              <button
                onClick={() => setCommandOpen(true)}
                className="rail-item w-auto justify-center !px-0 !mx-2"
              >
                <Terminal size={16} strokeWidth={1.7} />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={() => setCommandOpen(true)}
              className="rail-item w-auto"
            >
              <Terminal size={16} strokeWidth={1.7} />
              <span>Command palette</span>
              <span className="kbd ml-auto">⌘K</span>
            </button>
          )}
        </div>
      </nav>

      {/* Footer — workspace + status */}
      <div className="relative border-t border-line px-3 py-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <span className="heartbeat" />
          </div>
        ) : (
          <FooterWorkspace />
        )}
      </div>
    </aside>
  );
}

function FooterWorkspace() {
  const workspaces = useOnyx((s) => s.workspaces);
  const activeId = useOnyx((s) => s.activeWorkspaceId);
  const active = workspaces.find((w) => w.id === activeId);
  const blackout = useOnyx((s) => s.blackout);

  return (
    <div className="space-y-2">
      <Link
        href="/connect"
        className="flex items-center gap-2.5 p-2 -mx-1 rounded-lg hover:bg-surface-sunken transition group"
      >
        <div
          className={cn(
            'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
            active ? 'bg-indigo-50 dark:bg-indigo-400/10' : 'surface-sunken',
          )}
        >
          <Folder
            size={14}
            className={active ? 'text-[#4F46E5]' : 'text-secondary'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-medium text-primary truncate">
            {active ? active.name : 'No workspace'}
          </div>
          <div className="text-[11px] text-tertiary truncate">
            {active ? active.framework : 'Click to attach'}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 px-2 text-[11px]">
        <span className="heartbeat" />
        <span className="text-secondary">
          {blackout.online ? `Inference · ${blackout.provider}` : 'Autonomous mode'}
        </span>
      </div>
    </div>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-7 h-7 rounded-md bg-[#111827] dark:bg-white flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 64 64" className="text-white dark:text-[#111827]">
          <path
            d="M16 14 L48 14 L52 22 L52 42 L48 50 L16 50 L12 42 L12 22 Z"
            fill="currentColor"
            opacity="0.95"
          />
        </svg>
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="text-[14px] font-semibold tracking-tight text-primary leading-none">
            ONYX
          </div>
          <div className="text-[10.5px] text-tertiary mt-0.5 leading-none">
            Execution intelligence
          </div>
        </div>
      )}
    </div>
  );
}
