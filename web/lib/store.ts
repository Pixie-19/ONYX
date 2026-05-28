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
  GithubSyncStatus,
  TerminalSession,
  TerminalChunk,
  Notification,
  NotificationCategory,
  UserProfile,
  AuthSession,
  GithubConnectionStatus,
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
  githubSync: Record<string, GithubSyncStatus>;
  terminals: TerminalSession[];
  terminalChunks: Record<string, TerminalChunk[]>;

  // ── notifications ─────────────────────────────────
  notifications: Notification[];
  notificationsUnread: number;
  notificationFilter: NotificationCategory;

  // ── auth & profile ────────────────────────────────
  authSession: AuthSession | null;
  githubConnection: GithubConnectionStatus;
  userPreferences: {
    theme: 'light' | 'dark' | 'system';
    aiProvider: 'mistral' | 'ollama' | 'cache';
    aiRoutingEnabled: boolean;
    notificationsEnabled: boolean;
    telemetryEnabled: boolean;
  };

  // ── cockpit ux state ─────────────────────────────────
  focusedSection: string | null;
  commandOpen: boolean;
  cinemaMode: boolean;

  setFocusedSection: (k: string | null) => void;
  setCommandOpen: (open: boolean) => void;
  toggleCinema: () => void;
  setCinema: (b: boolean) => void;
  setActiveWorkspace: (id: string | null) => void;

  // ── notification methods ──────────────────────────
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  setNotificationFilter: (f: NotificationCategory) => void;

  // ── auth methods ──────────────────────────────────
  setAuthSession: (session: AuthSession | null) => void;
  setGithubConnection: (conn: GithubConnectionStatus) => void;
  updateUserPreferences: (prefs: Partial<ONYXState['userPreferences']>) => void;

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
  ingestGithubSyncStatus: (s: GithubSyncStatus) => void;
  ingestNotification: (n: Notification) => void;
  ingestAuthSession: (s: AuthSession) => void;
  ingestTerminal: (t: TerminalSession) => void;
  ingestTerminalChunk: (c: TerminalChunk) => void;
  hydrateTerminalChunks: (id: string, chunks: TerminalChunk[]) => void;

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
    githubSync: {},
    terminals: [],
    terminalChunks: {},

    notifications: [],
    notificationsUnread: 0,
    notificationFilter: 'all',

    authSession: null,
    githubConnection: {
      connected: false,
      login: null,
      avatar_url: null,
      repos_synced: 0,
      last_sync_at: null,
      quota_remaining: null,
    },
    userPreferences: {
      theme: 'system',
      aiProvider: 'mistral',
      aiRoutingEnabled: true,
      notificationsEnabled: true,
      telemetryEnabled: true,
    },

    focusedSection: null,
    commandOpen: false,
    cinemaMode: false,

    setFocusedSection: (k) => set({ focusedSection: k }),
    setCommandOpen: (open) => set({ commandOpen: open }),
    toggleCinema: () => set((s) => ({ cinemaMode: !s.cinemaMode })),
    setCinema: (b) => set({ cinemaMode: b }),
    setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

    addNotification: (n) => set((s) => ({
      notifications: RING(100)(s.notifications, n),
      notificationsUnread: s.notificationsUnread + (n.read ? 0 : 1),
    })),
    markNotificationRead: (id) => set((s) => {
      const notif = s.notifications.find((n) => n.id === id);
      if (!notif || notif.read) return s;
      return {
        notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
        notificationsUnread: Math.max(0, s.notificationsUnread - 1),
      };
    }),
    clearNotifications: () => set({ notifications: [], notificationsUnread: 0 }),
    setNotificationFilter: (f) => set({ notificationFilter: f }),

    setAuthSession: (session) => set({ authSession: session }),
    setGithubConnection: (conn) => set({ githubConnection: conn }),
    updateUserPreferences: (prefs) => set((s) => ({
      userPreferences: { ...s.userPreferences, ...prefs },
    })),

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
    ingestGithubSyncStatus: (status) => set((s) => ({
      githubSync: { ...s.githubSync, [status.workspace_id]: status },
    })),
    ingestNotification: (n) => set((s) => ({
      notifications: RING(100)(s.notifications, n),
      notificationsUnread: s.notificationsUnread + (n.read ? 0 : 1),
    })),
    ingestAuthSession: (s) => set({ authSession: s }),
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
    hydrateTerminalChunks: (id, chunks) => set((s) => ({
      terminalChunks: { ...s.terminalChunks, [id]: chunks.slice(-400) },
    })),

    setConnected: (c) => set({ connected: c }),
  })),
);
