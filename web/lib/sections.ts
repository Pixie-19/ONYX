import type { LucideIcon } from 'lucide-react';
import {
  Activity, BarChart3, Database, GitBranch, Network, Radio, Shield,
  Settings, Layers, Folder, Sparkles, Zap, FolderInput,
} from 'lucide-react';

export interface SectionDef {
  key: string;
  label: string;
  short: string;
  icon: LucideIcon;
  href: string;
  /** Optional descriptor — shown in tooltip + landing tile. */
  caption?: string;
}

export const SECTIONS: SectionDef[] = [
  { key: 'connect',        label: 'Workspace Connector',     short: 'CONNECT', href: '/connect',        icon: FolderInput, caption: 'Attach local projects, terminals, GitHub repos.' },
  { key: 'graph',          label: 'Operational Graph',       short: 'GRAPH',  href: '/graph',          icon: Layers,    caption: 'Live topology of services, files, endpoints, and inference routes.' },
  { key: 'telemetry',      label: 'Telemetry',               short: 'TELEM',  href: '/telemetry',      icon: Activity,  caption: 'Cybernetics: CPU, memory, thermal, disk, processes.' },
  { key: 'replay',         label: 'Replay Engine',           short: 'REPLAY', href: '/replay',         icon: GitBranch, caption: 'Chrono replay — causal reconstruction with scrubbing.' },
  { key: 'sql',            label: 'SQL Intelligence',        short: 'SQL',    href: '/sql',            icon: Database,  caption: 'Cross-source relational queries over onyx_cognition.' },
  { key: 'infrastructure', label: 'Infrastructure',          short: 'INFRA',  href: '/infrastructure', icon: Network,   caption: 'Runtime services, endpoints, processes, sockets.' },
  { key: 'events',         label: 'Event Stream',            short: 'EVENTS', href: '/events',         icon: Radio,     caption: 'Append-only event bus with severity filters and search.' },
  { key: 'intelligence',   label: 'AI Cognition',            short: 'AI',     href: '/intelligence',   icon: Sparkles,  caption: 'Mistral / Ollama operational analyst — structured reports.' },
  { key: 'stability',      label: 'Build Stability',         short: 'STAB',   href: '/stability',      icon: BarChart3, caption: 'BSI, rulebook constraints, compiler loop frequency.' },
  { key: 'workspace',      label: 'Workspace Cognition',     short: 'WORK',   href: '/workspace',      icon: Folder,    caption: 'AST evolution, edit velocity, workspace entropy.' },
  { key: 'blackout',       label: 'Blackout Protocol',       short: 'BLACK',  href: '/blackout',       icon: Shield,    caption: 'Autonomous continuity — inference fallback routing.' },
  { key: 'demo',           label: 'Demo Orchestrator',       short: 'DEMO',   href: '/demo',           icon: Zap,       caption: 'Trigger cinematic cascades for live presentations.' },
  { key: 'settings',       label: 'System Settings',         short: 'SET',    href: '/settings',       icon: Settings,  caption: 'Configuration, providers, environment.' },
];

export function sectionForPath(pathname: string): SectionDef | null {
  if (pathname === '/' || pathname === '') return null;
  const match = SECTIONS.find((s) => pathname === s.href || pathname.startsWith(s.href + '/'));
  return match ?? null;
}
