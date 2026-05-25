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
  'Summarise operational state across the last 60s.',
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
        icon={<Sparkles size={14} />}
        title="AI OPERATIONAL COGNITION"
        subtitle="Mistral · Ollama · cache · auto-routed by blackout protocol"
        meta={
          <>
            <Badge tone={blackout.online ? 'info' : 'warn'}>PROVIDER · {blackout.provider.toUpperCase()}</Badge>
            <Badge tone="muted">{analyst.length} DIGESTS</Badge>
          </>
        }
      />

      <div className="flex-1 min-h-0 p-3 grid grid-cols-12 gap-3 overflow-hidden">
        <div className="col-span-7 flex flex-col gap-3 min-h-0">
          <Panel title="LATEST STRUCTURED REPORT" right={latest ? fmtShortTs(latest.ts) : '——'} className="h-[260px]">
            {latest ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge tone={latest.provider === 'mistral' ? 'info' : latest.provider === 'ollama' ? 'warn' : 'error'}>{latest.provider.toUpperCase()}</Badge>
                  <span className="text-[10.5px] tracking-[0.18em] uppercase text-onyx-300">CONFIDENCE · derived</span>
                </div>
                <p className="text-[13px] leading-relaxed text-onyx-100 font-sans">{latest.text}</p>
                <div className="text-[10px] tracking-[0.18em] uppercase text-onyx-300">
                  ORIGIN · intelligence.analyst · trace {fmtShortTs(latest.ts)}
                </div>
              </div>
            ) : (
              <div className="h-full grid place-items-center text-[10.5px] tracking-[0.22em] uppercase text-onyx-300">
                awaiting first analyst digest…
              </div>
            )}
          </Panel>

          <Panel title="DIRECT PROMPT" right="ROUTED VIA BLACKOUT PROTOCOL" className="h-[170px]">
            <div className="flex items-center gap-2">
              <input
                placeholder="› ask the analyst…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(prompt); }}
                className="flex-1 bg-onyx-900/60 border border-onyx-600/40 px-3 py-2 text-[12px] font-mono text-onyx-100 placeholder:text-onyx-300 outline-none focus:border-cyan-glow/60"
              />
              <button
                onClick={() => submit(prompt)}
                disabled={pending || !prompt.trim()}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-3 py-2 border border-cyan-glow/60 text-cyan-glow hover:bg-cyan-glow/10 transition disabled:opacity-40"
              >
                <Send size={12} /> {pending ? 'ROUTING…' : 'DISPATCH'}
              </button>
            </div>
            <div className="hr-label mt-3">QUICK PROMPTS</div>
            <div className="flex flex-wrap gap-1.5">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => submit(p)}
                  className="text-[10px] tracking-[0.12em] px-2 py-1 border border-onyx-600/40 text-onyx-100 hover:border-cyan-glow/60 hover:text-cyan-glow transition"
                >
                  {p.length > 60 ? p.slice(0, 60) + '…' : p}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="DIGEST STREAM" right={`${reversed.length} ENTRIES`} className="flex-1 min-h-0" inner="p-0" scroll>
            <div className="font-mono text-[11px]">
              {reversed.map((a) => (
                <div key={a.id} className="px-3 py-2 border-b border-onyx-600/15 hover:bg-onyx-700/20">
                  <div className="flex items-center gap-2 text-[10px] text-onyx-300 tracking-[0.18em] uppercase">
                    <span className="tabular-nums">{fmtShortTs(a.ts)}</span>
                    <Badge tone={a.provider === 'mistral' ? 'info' : a.provider === 'ollama' ? 'warn' : 'error'}>{a.provider.toUpperCase()}</Badge>
                  </div>
                  <div className="text-onyx-100 leading-relaxed mt-1 font-sans text-[12px]">{a.text}</div>
                </div>
              ))}
              {reversed.length === 0 && (
                <div className="px-3 py-6 text-[10px] uppercase tracking-[0.18em] text-onyx-300">awaiting analyst routes…</div>
              )}
            </div>
          </Panel>
        </div>

        <div className="col-span-5 min-h-0">
          <AnalystTicker />
        </div>
      </div>
    </div>
  );
}
