import { config } from '../config.js';
import { bus } from '../bus/eventBus.js';
import type { WSMessage } from '../types.js';

interface BlackoutState {
  online: boolean;
  provider: 'mistral' | 'ollama' | 'cache';
  since: number;
  reason: string;
}

let state: BlackoutState = {
  online: true,
  provider: 'mistral',
  since: Date.now(),
  reason: 'boot',
};
let simulated: { active: boolean } = { active: false };

export function currentBlackout(): BlackoutState {
  return state;
}

function broadcast(reason: string) {
  bus.emit('ws', { type: 'blackout', payload: state } satisfies WSMessage);
  bus.emitReplayEvent({
    kind: state.online ? 'BLACKOUT_EXIT' : 'BLACKOUT_ENTER',
    severity: state.online ? 'info' : 'warn',
    source: 'blackout.monitor',
    target: state.provider,
    payload: { reason },
  });
}

function transition(online: boolean, provider: BlackoutState['provider'], reason: string) {
  const changed = online !== state.online || provider !== state.provider;
  state = { online, provider, since: changed ? Date.now() : state.since, reason };
  if (changed) broadcast(reason);
}

async function probe(): Promise<boolean> {
  try {
    const r = await fetch(config.blackout.probe, {
      method: 'GET',
      // @ts-ignore
      signal: AbortSignal.timeout(config.blackout.timeoutMs),
    });
    return r.status > 0 && r.status < 500;
  } catch {
    return false;
  }
}

export function startBlackoutMonitor(): void {
  const tick = async () => {
    if (simulated.active) return; // simulation overrides reality
    const online = await probe();
    if (online && config.mistral.apiKey) {
      transition(true, 'mistral', 'probe-ok');
    } else if (!online) {
      transition(false, 'ollama', 'probe-fail');
    } else {
      // online but no api key — route to ollama
      transition(true, 'ollama', 'no-mistral-key');
    }
  };
  void tick();
  setInterval(tick, config.blackout.intervalMs).unref();
}

export function simulateBlackout(enable: boolean): void {
  simulated.active = enable;
  if (enable) {
    transition(false, 'ollama', 'simulated');
    // immediately reroute the analyst layer and emit a route-change replay event
    bus.emitReplayEvent({
      kind: 'INFERENCE_ROUTE',
      severity: 'warn',
      source: 'blackout.router',
      target: 'ollama',
      payload: { simulated: true },
    });
  } else {
    transition(true, 'mistral', 'simulation-cleared');
  }
}
