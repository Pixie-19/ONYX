import net from 'node:net';
import { performance } from 'node:perf_hooks';
import { nanoid } from 'nanoid';
import { bus, SESSION_ID } from '../bus/eventBus.js';
import type { NetworkTrajectoryRow, NetworkStatus } from '../types.js';

interface Probe {
  endpoint: string;
  host: string;
  port: number;
  kind: 'localhost' | 'outbound' | 'dependency' | 'dns';
}

const PROBES: Probe[] = [
  { endpoint: '127.0.0.1:4311',     host: '127.0.0.1', port: 4311,  kind: 'localhost' },
  { endpoint: '127.0.0.1:3000',     host: '127.0.0.1', port: 3000,  kind: 'localhost' },
  { endpoint: 'api.mistral.ai:443', host: 'api.mistral.ai', port: 443, kind: 'outbound' },
  { endpoint: 'github.com:443',     host: 'github.com', port: 443,  kind: 'dependency' },
  { endpoint: '127.0.0.1:11434',    host: '127.0.0.1', port: 11434, kind: 'dependency' }, // Ollama
];

// rolling RTT history per endpoint for jitter computation
const history = new Map<string, number[]>();
function pushRtt(ep: string, rtt: number): { jitter: number } {
  const arr = history.get(ep) ?? [];
  arr.push(rtt);
  if (arr.length > 16) arr.shift();
  history.set(ep, arr);
  if (arr.length < 2) return { jitter: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
  return { jitter: Math.sqrt(variance) };
}

function probeOnce(p: Probe, timeoutMs = 1500): Promise<{ ok: boolean; rtt: number }> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const sock = new net.Socket();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve({ ok, rtt: performance.now() - t0 });
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false));
    sock.once('error', () => finish(false));
    sock.connect(p.port, p.host);
  });
}

// in-memory state per endpoint — used to decide retry / surge events
const stateByEp = new Map<string, { retries: number; lastStatus: NetworkStatus }>();

function statusFor(ok: boolean, rtt: number, prevRetries: number): { status: NetworkStatus; retries: number } {
  if (!ok) return { status: prevRetries >= 2 ? 'offline' : 'retry', retries: prevRetries + 1 };
  if (rtt > 600) return { status: 'degraded', retries: 0 };
  return { status: 'healthy', retries: 0 };
}

export function startNetwork(): void {
  const tick = async () => {
    await Promise.all(PROBES.map(async (p) => {
      const prev = stateByEp.get(p.endpoint) ?? { retries: 0, lastStatus: 'healthy' as NetworkStatus };
      const { ok, rtt } = await probeOnce(p);
      const { status, retries } = statusFor(ok, rtt, prev.retries);
      const { jitter } = pushRtt(p.endpoint, rtt);

      const row: NetworkTrajectoryRow = {
        id: `nt_${nanoid(10)}`,
        ts: Date.now(),
        endpoint: p.endpoint,
        kind: p.kind,
        port: p.port,
        rtt_ms: Number(rtt.toFixed(1)),
        jitter_ms: Number(jitter.toFixed(2)),
        packet_loss: ok ? 0 : 1,
        retries,
        status,
        bytes_in: ok ? Math.floor(64 + Math.random() * 1024) : 0,
        bytes_out: ok ? Math.floor(64 + Math.random() * 512) : 0,
        session_id: SESSION_ID,
      };
      bus.emitNetwork(row);

      if (status === 'retry') {
        bus.emitReplayEvent({
          kind: 'SOCKET_RETRY',
          severity: 'warn',
          source: 'interceptor.network',
          target: p.endpoint,
          payload: { retries },
        });
      } else if (status === 'offline' && prev.lastStatus !== 'offline') {
        bus.emitReplayEvent({
          kind: 'DEPENDENCY_DEGRADED',
          severity: 'error',
          source: 'interceptor.network',
          target: p.endpoint,
          payload: { kind: p.kind },
        });
      } else if (status === 'degraded' && rtt > 800) {
        bus.emitReplayEvent({
          kind: 'LATENCY_SURGE',
          severity: 'warn',
          source: 'interceptor.network',
          target: p.endpoint,
          payload: { rtt_ms: row.rtt_ms },
        });
      }

      stateByEp.set(p.endpoint, { retries, lastStatus: status });
    }));
  };

  void tick();
  setInterval(tick, 3000).unref();
}
