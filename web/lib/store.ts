'use client';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  ReplayEvent,
  SystemCyberneticsRow,
  NetworkTrajectoryRow,
  WorkspaceEntropyRow,
  TopologyGraph,
  IntelligenceRow,
  RulebookRow,
  BlackoutState,
  DemoPhase,
  WorkspaceRow,
  WorkspaceProcessRow,
  GithubCommitRow,
  TerminalSession,
  TerminalChunk,
} from './types';
import { normalizeTopologyGraph } from './topology-normalize';

interface AnalystLine {
  id: string;
  ts: number;
  text: string;
  provider: string;
}

interface ONYXState {
  session: string | null;
  connected: boolean;
  buildStability: number;

  events: ReplayEvent[];
  telemetry: SystemCyberneticsRow[];
  network: NetworkTrajectoryRow[];
  workspace: WorkspaceEntropyRow[];
  topology: TopologyGraph;
  topologyHash: string;
  topologyVersion: number;
  intelligence: IntelligenceRow[];
  rules: RulebookRow[];
  analyst: AnalystLine[];
  blackout: BlackoutState;
  demo: DemoPhase;

  // ── connector layer ────────────────────────────────
  workspaces: WorkspaceRow[];
  activeWorkspaceId: string | null;
  workspaceProcesses: WorkspaceProcessRow[];
  githubCommits: GithubCommitRow[];
  terminals: TerminalSession[];
  terminalChunks: Record<string, TerminalChunk[]>;

  // ── cockpit ux state ─────────────────────────────────
  focusedSection: string | null;
  commandOpen: boolean;
  cinemaMode: boolean;

  setFocusedSection: (k: string | null) => void;
  setCommandOpen: (open: boolean) => void;
  toggleCinema: () => void;
  setCinema: (b: boolean) => void;
  setActiveWorkspace: (id: string | null) => void;

  ingestHello: (m: { session_id: string; build_stability: number }) => void;
  ingestEvent: (ev: ReplayEvent) => void;
  ingestTelemetry: (row: SystemCyberneticsRow) => void;
  ingestNetwork: (row: NetworkTrajectoryRow) => void;
  ingestWorkspace: (row: WorkspaceEntropyRow) => void;
  ingestTopology: (g: TopologyGraph) => void;
  ingestIntelligence: (i: IntelligenceRow) => void;
  ingestRule: (r: RulebookRow) => void;
  ingestAnalyst: (a: { id: string; ts: number; text: string; provider: string }) => void;
  ingestBlackout: (b: BlackoutState) => void;
  ingestDemo: (d: DemoPhase) => void;
  ingestBuildStability: (i: number) => void;
  ingestWorkspaceList: (list: WorkspaceRow[]) => void;
  ingestWorkspaceUpdate: (ws: WorkspaceRow) => void;
  ingestWorkspaceProcess: (p: WorkspaceProcessRow) => void;
  ingestGithubCommit: (c: GithubCommitRow) => void;
  ingestTerminal: (t: TerminalSession) => void;
  ingestTerminalChunk: (c: TerminalChunk) => void;

  setConnected: (c: boolean) => void;
}

const RING = (max: number) => <T,>(arr: T[], next: T): T[] => {
  const out = arr.length >= max ? arr.slice(arr.length - max + 1) : arr.slice();
  out.push(next);
  return out;
};

export const useOnyx = create<ONYXState>()(
  subscribeWithSelector((set) => ({
    session: null,
    connected: false,
    buildStability: 100,

    events: [],
    telemetry: [],
    network: [],
    workspace: [],
    topology: { ts: 0, nodes: [], edges: [] },
    topologyHash: 'boot',
    topologyVersion: 0,
    intelligence: [],
    rules: [],
    analyst: [],
    blackout: { online: true, provider: 'mistral', since: 0, reason: 'boot' },
    demo: { phase: 0, label: 'IDLE', ts: 0 },

    workspaces: [],
    activeWorkspaceId: null,
    workspaceProcesses: [],
    githubCommits: [],
    terminals: [],
    terminalChunks: {},

    focusedSection: null,
    commandOpen: false,
    cinemaMode: false,

    setFocusedSection: (k) => set({ focusedSection: k }),
    setCommandOpen: (open) => set({ commandOpen: open }),
    toggleCinema: () => set((s) => ({ cinemaMode: !s.cinemaMode })),
    setCinema: (b) => set({ cinemaMode: b }),
    setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

    ingestHello: (m) => set({ session: m.session_id, buildStability: m.build_stability ?? 100 }),
    ingestEvent: (ev) => set((s) => ({ events: RING(512)(s.events, ev) })),
    ingestTelemetry: (row) => set((s) => ({ telemetry: RING(180)(s.telemetry, row) })),
    ingestNetwork: (row) => set((s) => ({ network: RING(240)(s.network, row) })),
    ingestWorkspace: (row) => set((s) => ({ workspace: RING(180)(s.workspace, row) })),
    ingestTopology: (g) => set((s) => {
      const { graph, hash } = normalizeTopologyGraph(g);
      if (hash === s.topologyHash) return s;
      return {
        topology: graph,
        topologyHash: hash,
        topologyVersion: s.topologyVersion + 1,
      };
    }),
    ingestIntelligence: (i) => set((s) => ({ intelligence: RING(40)(s.intelligence, i) })),
    ingestRule: (r) => set((s) => ({ rules: RING(80)(s.rules, r) })),
    ingestAnalyst: (a) => set((s) => ({ analyst: RING(40)(s.analyst, a) })),
    ingestBlackout: (b) => set({ blackout: b }),
    ingestDemo: (d) => set({ demo: d }),
    ingestBuildStability: (i) => set({ buildStability: i }),

    ingestWorkspaceList: (list) => set((s) => ({
      workspaces: list,
      activeWorkspaceId: s.activeWorkspaceId && list.some((w) => w.id === s.activeWorkspaceId)
        ? s.activeWorkspaceId
        : (list[0]?.id ?? null),
    })),
    ingestWorkspaceUpdate: (ws) => set((s) => {
      const idx = s.workspaces.findIndex((w) => w.id === ws.id);
      const next = idx === -1 ? [ws, ...s.workspaces] : s.workspaces.map((w) => w.id === ws.id ? ws : w);
      return {
        workspaces: next,
        activeWorkspaceId: s.activeWorkspaceId ?? ws.id,
      };
    }),
    ingestWorkspaceProcess: (p) => set((s) => ({ workspaceProcesses: RING(160)(s.workspaceProcesses, p) })),
    ingestGithubCommit: (c) => set((s) => ({ githubCommits: RING(120)(s.githubCommits, c) })),
    ingestTerminal: (t) => set((s) => {
      const idx = s.terminals.findIndex((x) => x.id === t.id);
      const next = idx === -1 ? [t, ...s.terminals].slice(0, 12) : s.terminals.map((x) => x.id === t.id ? t : x);
      return { terminals: next };
    }),
    ingestTerminalChunk: (c) => set((s) => {
      const arr = s.terminalChunks[c.session_id] ?? [];
      const trimmed = arr.length >= 400 ? arr.slice(arr.length - 399) : arr.slice();
      trimmed.push(c);
      return { terminalChunks: { ...s.terminalChunks, [c.session_id]: trimmed } };
    }),

    setConnected: (c) => set({ connected: c }),
  })),
);
