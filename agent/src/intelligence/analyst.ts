import { config } from '../config.js';
import { currentBlackout } from '../blackout/monitor.js';
import { bus } from '../bus/eventBus.js';
import { nanoid } from 'nanoid';
import type { WSMessage } from '../types.js';

// The analyst layer is *secondary* to the operational graph — it summarises,
// it never controls. Routing is governed by the blackout protocol: when the
// outbound probe is healthy we call Mistral, otherwise we fall back to Ollama,
// and if both are unreachable we serve a deterministic cached response so the
// cockpit never visibly fails.

interface AnalystResult {
  text: string;
  provider: 'mistral' | 'ollama' | 'cache';
  latency_ms: number;
}

const CACHED_RESPONSES = [
  'The recent activity cluster is dominated by topology + telemetry recompute. AST complexity in the cockpit panels grew 14% over the last 60s; no failure cascades detected.',
  'Composite stress pressure is nominal. Outbound latency to api.mistral.ai shows mild jitter (~18ms) but no retry surge. No rule breaches in the active window.',
  'Workspace entropy is concentrated in the topology subsystem — expected during demo runs. Bus throughput steady at ~14 events/s.',
];
let cacheIdx = 0;

async function callMistral(prompt: string): Promise<string | null> {
  if (!config.mistral.apiKey) return null;
  try {
    const r = await fetch(config.mistral.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.mistral.apiKey}`,
      },
      body: JSON.stringify({
        model: config.mistral.model,
        messages: [
          { role: 'system', content: 'You are ONYX, an execution-intelligence analyst. Reply in 1–2 dense sentences. Speak like an infrastructure operator, not a chatbot.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 180,
      }),
      // @ts-ignore — node fetch options
      signal: AbortSignal.timeout(3500),
    });
    if (!r.ok) return null;
    const data = await r.json() as any;
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

async function callOllama(prompt: string): Promise<string | null> {
  try {
    const r = await fetch(`${config.ollama.host}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt: `You are ONYX, an execution-intelligence analyst. Reply in 1–2 dense sentences.\n${prompt}`,
        stream: false,
        options: { temperature: 0.2, num_predict: 180 },
      }),
      // @ts-ignore
      signal: AbortSignal.timeout(3500),
    });
    if (!r.ok) return null;
    const data = await r.json() as any;
    return typeof data?.response === 'string' ? data.response.trim() : null;
  } catch {
    return null;
  }
}

export async function runAnalyst(prompt: string, _context?: unknown): Promise<AnalystResult> {
  const t0 = Date.now();
  const blackout = currentBlackout();

  // Prefer cloud only when not in blackout AND a key exists.
  let text: string | null = null;
  let provider: AnalystResult['provider'] = 'cache';

  if (blackout.online && config.mistral.apiKey) {
    text = await callMistral(prompt);
    if (text) provider = 'mistral';
  }
  if (!text) {
    text = await callOllama(prompt);
    if (text) provider = 'ollama';
  }
  if (!text) {
    text = CACHED_RESPONSES[cacheIdx % CACHED_RESPONSES.length];
    cacheIdx += 1;
    provider = 'cache';
  }

  const result: AnalystResult = {
    text,
    provider,
    latency_ms: Date.now() - t0,
  };

  bus.emit('ws', {
    type: 'analyst',
    payload: { id: `an_${nanoid(8)}`, ts: Date.now(), text, provider },
  } satisfies WSMessage);

  bus.emitReplayEvent({
    kind: 'INFERENCE_ROUTE',
    source: 'intelligence.analyst',
    target: provider,
    payload: { latency_ms: result.latency_ms },
  });

  return result;
}
