'use client';
import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { useOnyx } from '@/lib/store';
import { PageHeader } from '@/components/shell/PageHeader';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { AnalystTicker } from '@/components/panels/AnalystTicker';
import { fmtShortTs, ONYX_HTTP } from '@/lib/format';

const PROMPTS = [
  'Summarise operational state across the last 60 seconds.',
  'What failure cascades have we observed in the active session?',
  'Which files are showing the most workspace entropy right now?',
  'Are any rulebook constraints close to breaching?',
  'Predict the next 5 minutes of build stability given current pressure.',
];

export default function IntelligencePage() {
  const blackout = useOnyx((s) => s.blackout);
  const analyst = useOnyx((s) => s.analyst);
  const [prompt, setPrompt] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (p: string) => {
    if (!p.trim()) return;
    setPending(true);
    try {
      await fetch(`${ONYX_HTTP}/analyst`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      });
      setPrompt('');
    } finally {
      setPending(false);
    }
  };

  const reversed = analyst.slice().reverse();
  const latest = reversed[0];

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<Sparkles size={16} />}
        title="AI intelligence"
        subtitle="Operational cognition · Mistral · Ollama · cache · routed by blackout protocol"
        meta={
          <>
            <Badge tone={blackout.online ? 'info' : 'warn'}>
              Provider · {blackout.provider}
            </Badge>
            <Badge tone="muted">{analyst.length} digests</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-4 overflow-hidden surface-base">
        <div className="col-span-8 flex flex-col gap-4 min-h-0">
          {/* Latest report — hero card */}
          <div className="panel">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div>
                <div className="text-[12.5px] font-semibold text-primary">Latest structured report</div>
                <div className="text-[11.5px] text-secondary mt-0.5">
                  {latest ? `${latest.provider} · ${fmtShortTs(latest.ts)}` : 'awaiting first analyst digest'}
                </div>
              </div>
              {latest && (
                <Badge
                  tone={
                    latest.provider === 'mistral'
                      ? 'info'
                      : latest.provider === 'ollama'
                        ? 'warn'
                        : 'muted'
                  }
                >
                  {latest.provider}
                </Badge>
              )}
            </div>
            <div className="p-6">
              {latest ? (
                <>
                  <p className="text-[15px] leading-relaxed text-primary">{latest.text}</p>
                  <div className="mt-4 text-[11.5px] text-tertiary">
                    Origin · intelligence.analyst · trace {fmtShortTs(latest.ts)}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-[13px] text-secondary">
                  The analyst is awaiting its first dispatch. Use the prompt console below.
                </div>
              )}
            </div>
          </div>

          {/* Direct prompt console */}
          <Panel title="Direct prompt" right="Routed via blackout protocol">
            <div className="flex items-center gap-2">
              <input
                placeholder="Ask the analyst…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit(prompt);
                }}
                className="flex-1 h-10 px-3 rounded-md border border-line bg-surface-base text-[13px] text-primary placeholder:text-tertiary outline-none focus:border-[#4F46E5] focus:shadow-focus transition"
              />
              <button
                onClick={() => submit(prompt)}
                disabled={pending || !prompt.trim()}
                className="btn btn-accent h-10 px-4 text-[13px] disabled:opacity-50"
              >
                <Send size={13} /> {pending ? 'Routing…' : 'Dispatch'}
              </button>
            </div>
            <div className="mt-4 text-[11px] eyebrow">Quick prompts</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => submit(p)}
                  className="text-[12px] px-3 py-1.5 rounded-full border border-line bg-surface-raised hover:border-strong hover:bg-surface-sunken text-secondary transition"
                >
                  {p.length > 60 ? p.slice(0, 60) + '…' : p}
                </button>
              ))}
            </div>
          </Panel>

          {/* Digest stream */}
          <Panel
            title="Digest stream"
            right={`${reversed.length} entries`}
            className="flex-1 min-h-0"
            inner="p-0"
            scroll
          >
            <div>
              {reversed.map((a) => (
                <div key={a.id} className="px-5 py-3 border-b border-subtle hover:bg-surface-sunken transition">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-tertiary tabular-nums">{fmtShortTs(a.ts)}</span>
                    <Badge
                      tone={
                        a.provider === 'mistral'
                          ? 'info'
                          : a.provider === 'ollama'
                            ? 'warn'
                            : 'muted'
                      }
                    >
                      {a.provider}
                    </Badge>
                  </div>
                  <div className="text-[13.5px] text-primary leading-relaxed mt-1.5">{a.text}</div>
                </div>
              ))}
              {reversed.length === 0 && (
                <div className="px-5 py-8 text-center text-[12.5px] text-secondary">
                  Awaiting analyst routes…
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className="col-span-4 min-h-0">
          <AnalystTicker />
        </div>
      </div>
    </div>
  );
}
