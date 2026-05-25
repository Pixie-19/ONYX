// Mirror of agent/src/types.ts — kept in sync manually since we don't ship a
// shared package in this hackathon build.

export type Severity = 'info' | 'warn' | 'error' | 'critical';
export type ThermalState = 'nominal' | 'warm' | 'hot' | 'critical';
export type NetworkStatus = 'healthy' | 'degraded' | 'retry' | 'offline';

export type EventKind =
  | 'FILE_MODIFIED' | 'FILE_DELETED'
  | 'AST_COMPLEXITY_SPIKE' | 'AST_DEPENDENCY_CHANGE'
  | 'SYNTAX_FAILURE' | 'COMPILER_WARN' | 'COMPILER_FAILURE' | 'BUILD_CRASH' | 'BUILD_SUCCESS' | 'HOT_RELOAD'
  | 'SOCKET_RETRY' | 'LATENCY_SURGE' | 'DEPENDENCY_DEGRADED'
  | 'MEMORY_PRESSURE' | 'CPU_SPIKE' | 'THERMAL_ALERT'
  | 'RULE_BREACH'
  | 'BLACKOUT_ENTER' | 'BLACKOUT_EXIT' | 'INFERENCE_ROUTE'
  | 'DEMO_PHASE'
  | 'WORKSPACE_CONNECTED' | 'WORKSPACE_DETACHED' | 'FRAMEWORK_DETECTED'
  | 'TERMINAL_ATTACHED' | 'TERMINAL_OUTPUT' | 'TERMINAL_EXITED'
  | 'DEV_SERVER_STARTED' | 'PORT_DISCOVERED' | 'PROCESS_CRASH' | 'RETRY_LOOP'
  | 'DEPENDENCY_CHANGED' | 'GITHUB_SYNCED';

export interface ReplayEvent {
  id: string;
  ts: number;
  seq: number;
  kind: EventKind;
  severity: Severity;
  trace_id: string;
  parent_trace_id?: string | null;
  source: string;
  target?: string;
  payload?: Record<string, unknown>;
  duration_ms?: number;
  session_id: string;
}

export interface SystemCyberneticsRow {
  id: string; ts: number;
  cpu_load: number; cpu_temp_c: number | null;
  mem_used_pct: number; mem_pressure: number;
  swap_used_pct: number;
  disk_busy_pct: number; disk_iops: number;
  thermal_state: ThermalState;
  process_count: number;
  session_id: string;
}

export interface NetworkTrajectoryRow {
  id: string; ts: number;
  endpoint: string;
  kind: 'localhost' | 'outbound' | 'dependency' | 'dns';
  port?: number | null;
  rtt_ms: number; jitter_ms: number;
  packet_loss: number; retries: number;
  status: NetworkStatus;
  bytes_in: number; bytes_out: number;
  session_id: string;
}

export interface WorkspaceEntropyRow {
  id: string; ts: number;
  file: string; lang: string | null;
  event: 'add' | 'change' | 'unlink' | 'rename';
  bytes_delta: number; ast_delta: number; complexity: number;
  syntax_fail: number; burst_rate: number;
  author?: string | null;
  session_id: string;
}

export interface TopologyNode {
  id: string; label: string;
  kind: 'file' | 'service' | 'endpoint' | 'process' | 'inference';
  group: string;
  complexity?: number;
  health: 'healthy' | 'warn' | 'critical';
  pulse: number;
  meta?: Record<string, unknown>;
}

export interface TopologyEdge {
  id: string; source: string; target: string;
  kind: 'import' | 'call' | 'socket' | 'inference' | 'replay';
  weight: number;
  latency_ms?: number;
  status?: 'healthy' | 'degraded' | 'retry' | 'offline';
}

export interface TopologyGraph {
  ts: number;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface IntelligenceRow {
  id: string; ts: number;
  query_id: string; title: string;
  severity: Severity;
  rows: Record<string, unknown>[];
  summary: string;
  latency_ms: number;
}

// ─────────── Workspace connector ───────────

export type WorkspaceStatus = 'attached' | 'detached' | 'scanning' | 'error' | 'demo';
export type Framework =
  | 'next' | 'react' | 'vite' | 'node' | 'express' | 'fastify' | 'bun'
  | 'python' | 'fastapi' | 'django' | 'flask'
  | 'go' | 'rust' | 'java'
  | 'docker' | 'turborepo' | 'pnpm-workspaces'
  | 'unknown';

export interface WorkspaceRow {
  id: string;
  name: string;
  path: string;
  framework: Framework | null;
  package_manager: string | null;
  language: string | null;
  git_remote: string | null;
  git_branch: string | null;
  attached_at: number;
  last_seen_at: number;
  status: WorkspaceStatus;
  file_count: number;
  meta_json: string;
}

export interface WorkspaceProcessRow {
  id: string;
  ts: number;
  workspace_id: string | null;
  pid: number | null;
  command: string;
  port: number | null;
  kind: 'dev_server' | 'node' | 'python' | 'docker' | 'database' | 'worker' | 'unknown';
  status: 'running' | 'exited' | 'retrying' | 'crashed';
  retry_count: number;
  cpu_pct: number;
  mem_mb: number;
  meta_json: string;
}

export interface GithubCommitRow {
  id: string;
  workspace_id: string | null;
  sha: string;
  short_sha: string;
  author: string | null;
  author_email: string | null;
  message: string | null;
  ts: number;
  files_changed: number;
  additions: number;
  deletions: number;
  risky_score: number;
  meta_json: string;
}

export interface TerminalSession {
  id: string;
  workspace_id: string | null;
  command: string;
  args: string[];
  cwd: string;
  pid: number | null;
  started_at: number;
  exited_at: number | null;
  exit_code: number | null;
  status: 'running' | 'exited' | 'crashed';
}

export interface TerminalChunk {
  session_id: string;
  stream: 'stdout' | 'stderr';
  data: string;
  ts: number;
}

export interface RulebookRow {
  id: string; ts: number;
  rule_id: string; rule_name: string;
  domain: 'workspace' | 'network' | 'system' | 'execution' | 'build';
  target?: string | null;
  severity: 'info' | 'warn' | 'breach' | 'critical';
  expression: string;
  observed_value: number | null;
  threshold: number | null;
  breached: 0 | 1;
  streak: number;
  session_id: string;
}

export interface BlackoutState {
  online: boolean;
  provider: 'mistral' | 'ollama' | 'cache';
  since: number;
  reason: string;
}

export interface DemoPhase {
  phase: number;
  label: string;
  ts: number;
}

export type WSMessage =
  | { type: 'hello'; session_id: string; ts: number; build_stability: number }
  | { type: 'event'; payload: ReplayEvent }
  | { type: 'telemetry'; payload: SystemCyberneticsRow }
  | { type: 'network'; payload: NetworkTrajectoryRow }
  | { type: 'workspace'; payload: WorkspaceEntropyRow }
  | { type: 'topology'; payload: TopologyGraph }
  | { type: 'intelligence'; payload: IntelligenceRow }
  | { type: 'rule'; payload: RulebookRow }
  | { type: 'analyst'; payload: { id: string; ts: number; text: string; provider: string; trace_id?: string } }
  | { type: 'blackout'; payload: BlackoutState }
  | { type: 'demo'; payload: DemoPhase }
  | { type: 'build_stability'; payload: { index: number; ts: number } }
  | { type: 'workspace_list'; payload: WorkspaceRow[] }
  | { type: 'workspace_update'; payload: WorkspaceRow }
  | { type: 'workspace_process'; payload: WorkspaceProcessRow }
  | { type: 'github_commit'; payload: GithubCommitRow }
  | { type: 'terminal'; payload: TerminalSession }
  | { type: 'terminal_chunk'; payload: TerminalChunk };
