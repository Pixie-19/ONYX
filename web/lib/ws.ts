'use client';
import { useEffect, useRef } from 'react';
import { useOnyx } from './store';
import type { WSMessage, TopologyGraph } from './types';

const WS_URL = process.env.NEXT_PUBLIC_ONYX_AGENT_WS ?? 'ws://127.0.0.1:4311/stream';

/**
 * Single global websocket bridge. Mounted once at the cockpit root.
 * Reconnects with linear backoff. All messages flow into the Zustand store.
 */
export function useOnyxStream(): void {
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    let pendingTopology: TopologyGraph | null = null;
    let flushScheduled = false;

    let ws: WebSocket | null = null;
    let stop = false;
    let attempt = 0;

    const flushTopology = () => {
      if (!pendingTopology) return;
      useOnyx.getState().ingestTopology(pendingTopology);
      pendingTopology = null;
      flushScheduled = false;
    };

    const scheduleTopologyFlush = (g: TopologyGraph) => {
      pendingTopology = g;
      if (flushScheduled) return;
      flushScheduled = true;
      if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
        window.requestAnimationFrame(flushTopology);
      } else {
        setTimeout(flushTopology, 16);
      }
    };

    const connect = () => {
      if (stop) return;
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        attempt = 0;
        useOnyx.getState().setConnected(true);
      };
      ws.onclose = () => {
        useOnyx.getState().setConnected(false);
        attempt += 1;
        const delay = Math.min(8000, 600 + attempt * 600);
        setTimeout(connect, delay);
      };
      ws.onerror = () => { try { ws?.close(); } catch { /* ignore */ } };
      ws.onmessage = (e) => {
        let msg: WSMessage;
        try { msg = JSON.parse(e.data as string) as WSMessage; }
        catch { return; }
        const s = useOnyx.getState();
        switch (msg.type) {
          case 'hello':              s.ingestHello(msg); break;
          case 'event':              s.ingestEvent(msg.payload); break;
          case 'telemetry':          s.ingestTelemetry(msg.payload); break;
          case 'network':            s.ingestNetwork(msg.payload); break;
          case 'workspace':          s.ingestWorkspace(msg.payload); break;
          case 'topology':           scheduleTopologyFlush(msg.payload); break;
          case 'intelligence':       s.ingestIntelligence(msg.payload); break;
          case 'rule':               s.ingestRule(msg.payload); break;
          case 'analyst':            s.ingestAnalyst(msg.payload); break;
          case 'blackout':           s.ingestBlackout(msg.payload); break;
          case 'demo':               s.ingestDemo(msg.payload); break;
          case 'build_stability':    s.ingestBuildStability(msg.payload.index); break;
          case 'workspace_list':     s.ingestWorkspaceList(msg.payload); break;
          case 'workspace_update':   s.ingestWorkspaceUpdate(msg.payload); break;
          case 'workspace_process':  s.ingestWorkspaceProcess(msg.payload); break;
          case 'github_commit':      s.ingestGithubCommit(msg.payload); break;
          case 'terminal':           s.ingestTerminal(msg.payload); break;
          case 'terminal_chunk':     s.ingestTerminalChunk(msg.payload); break;
        }
      };
    };

    connect();
    return () => {
      stop = true;
      pendingTopology = null;
      ws?.close();
    };
  }, []);
}
