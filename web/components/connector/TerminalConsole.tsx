'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Terminal as TerminalIcon,
  Power,
  RotateCcw,
  Activity,
  CircleDot,
  AlertOctagon,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import { Panel } from '@/components/primitives/Panel';
import { Badge } from '@/components/ui/Badge';
import { FrameworkBadge } from '@/components/connector/FrameworkBadge';
import { useOnyx } from '@/lib/store';
import {
  restartTerminalApi,
  stopTerminalApi,
  terminalBufferApi,
} from '@/lib/workspace';
import { cn, fmtBytes, fmtShortTs } from '@/lib/format';
import type { TerminalSession, TerminalChunk, TerminalSignal } from '@/lib/types';

const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

interface Props {
  session: TerminalSession;
  className?: string;
  height?: number;
}

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '');
}

function signalTone(signal: TerminalSignal | null | undefined): 'ok' | 'warn' | 'critical' | 'info' | 'muted' {
  switch (signal) {
    case 'boot':
    case 'hmr':
    case 'compile_success':
      return 'ok';
    case 'compile_warn':
      return 'warn';
    case 'compile_fail':
      return 'critical';
    case 'crash':
      return 'critical';
    default:
      return 'muted';
  }
}

function SignalIcon({ signal }: { signal: TerminalSignal | null | undefined }) {
  switch (signal) {
    case 'crash':
      return <Flame size={11} className="text-[#B91C1C]" />;
    case 'compile_fail':
      return <AlertOctagon size={11} className="text-[#B91C1C]" />;
    case 'compile_warn':
      return <AlertOctagon size={11} className="text-[#B45309]" />;
    case 'hmr':
    case 'compile_success':
    case 'boot':
      return <CheckCircle2 size={11} className="text-[#047857]" />;
    default:
      return <CircleDot size={11} className="text-tertiary" />;
  }
}

function lineTone(stream: 'stdout' | 'stderr', text: string): string {
  if (stream === 'stderr') return 'text-[#B91C1C] dark:text-red-300';
  if (/\bTS\d{4,5}:/i.test(text) || /(error|failed|fatal|crash)/i.test(text)) {
    return 'text-[#B45309] dark:text-amber-300';
  }
  if (/(compiled successfully|✓ ready|✓ compiled|ready in|hmr update|listening on|local:)/i.test(text)) {
    return 'text-[#047857] dark:text-emerald-300';
  }
  return 'text-primary';
}

export function TerminalConsole({ session, className, height = 360 }: Props) {
  const chunks = useOnyx((s) => s.terminalChunks[session.id] ?? []);
  const hydrateChunks = useOnyx((s) => s.hydrateTerminalChunks);
  const [autoscroll, setAutoscroll] = useState(true);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const hydrated = useRef(false);

  // Hydrate ring-buffer from server when console mounts for this session.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    let cancelled = false;
    (async () => {
      const r = await terminalBufferApi(session.id, 600);
      if (cancelled || !r) return;
      hydrateChunks(session.id, r.buffer);
    })();
    return () => { cancelled = true; };
  }, [session.id, hydrateChunks]);

  // Auto-scroll to bottom on new chunk, unless user scrolled up.
  useEffect(() => {
    if (!autoscroll) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chunks, autoscroll]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoscroll(distanceFromBottom < 60);
  };

  const lines = useMemo(() => {
    // Split each chunk by newlines so a single rapid chunk still renders crisply.
    const out: { id: string; stream: 'stdout' | 'stderr'; text: string; ts: number }[] = [];
    chunks.slice(-400).forEach((c, ci) => {
      const segs = stripAnsi(c.data).split(/\r?\n/);
      segs.forEach((seg, si) => {
        if (si === segs.length - 1 && seg === '') return;
        out.push({ id: `${ci}:${si}`, stream: c.stream, text: seg, ts: c.ts });
      });
    });
    return out.slice(-400);
  }, [chunks]);

  const restart = async () => {
    try {
      await restartTerminalApi(session.id);
      toast.success('Terminal restarted', { description: session.command });
    } catch (err) {
      toast.error('Restart failed', { description: String(err) });
    }
  };
  const stop = async () => {
    try {
      await stopTerminalApi(session.id);
      toast.success('Terminal stopped', { description: session.command });
    } catch (err) {
      toast.error('Stop failed', { description: String(err) });
    }
  };

  const statusTone: 'ok' | 'warn' | 'critical' | 'muted' =
    session.status === 'running' ? 'ok'
    : session.status === 'crashed' ? 'critical'
    : 'muted';

  const ports = session.ports ?? [];
  const totalBytes = session.total_bytes ?? 0;

  return (
    <Panel
      title="Terminal stream"
      badge={
        <span className="inline-flex items-center gap-1.5 text-[11px] text-secondary">
          <TerminalIcon size={11} />
          <span className="font-mono truncate max-w-[200px]">{session.command}</span>
        </span>
      }
      right={
        <div className="flex items-center gap-1.5">
          <Badge tone={statusTone}>{session.status}</Badge>
          {session.detected_framework && (
            <FrameworkBadge framework={session.detected_framework} />
          )}
          <button
            onClick={restart}
            title="Restart"
            className="btn-icon !w-6 !h-6 !text-tertiary hover:!text-[#4F46E5]"
            disabled={session.status !== 'running' && session.status !== 'crashed'}
          >
            <RotateCcw size={11} />
          </button>
          <button
            onClick={stop}
            title="Kill"
            className="btn-icon !w-6 !h-6 hover:!text-[#EF4444]"
            disabled={session.status !== 'running'}
          >
            <Power size={11} />
          </button>
        </div>
      }
      className={cn('min-h-[280px]', className)}
      inner="p-0"
    >
      <div className="flex flex-col h-full">
        <div className="flex-none px-3 py-2 border-b border-line bg-surface-sunken flex items-center gap-2 flex-wrap text-[11px]">
          <span className="inline-flex items-center gap-1 text-secondary">
            <SignalIcon signal={session.last_signal} />
            <span>last:</span>
            <Badge tone={signalTone(session.last_signal)}>
              {session.last_signal ?? 'idle'}
            </Badge>
          </span>
          <span className="text-secondary">·</span>
          <span className="text-secondary">pid</span>
          <span className="font-mono text-primary">{session.pid ?? '—'}</span>
          {ports.length > 0 && (
            <>
              <span className="text-secondary">·</span>
              <span className="inline-flex items-center gap-1">
                <Activity size={10} className="text-tertiary" />
                {ports.map((p) => (
                  <Badge tone="info" key={p}>:{p}</Badge>
                ))}
              </span>
            </>
          )}
          <span className="text-secondary">·</span>
          <span className="text-secondary">{fmtBytes(totalBytes)}</span>
          {(session.restart_count ?? 0) > 0 && (
            <>
              <span className="text-secondary">·</span>
              <span className="text-secondary">restarts</span>
              <span className="font-mono text-primary">{session.restart_count}</span>
            </>
          )}
          {!autoscroll && (
            <button
              onClick={() => {
                setAutoscroll(true);
                const el = scrollerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
              }}
              className="ml-auto text-[10.5px] text-[#4F46E5] hover:underline"
            >
              ↓ jump to live
            </button>
          )}
        </div>

        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex-1 min-h-0 overflow-y-auto bg-[#0B0B12] dark:bg-[#0B0B12] font-mono text-[11.5px] leading-[1.55]"
          style={{ height }}
        >
          <div className="py-1">
            {lines.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-tertiary">
                Awaiting output…
              </div>
            )}
            {lines.map((l) => (
              <div
                key={l.id + ':' + l.ts}
                className={cn('px-3 py-0.5 whitespace-pre-wrap break-words', lineTone(l.stream, l.text))}
                style={l.stream === 'stderr' ? { background: 'rgba(239,68,68,0.05)' } : undefined}
              >
                <span className="text-tertiary mr-2 tabular-nums select-none">
                  {fmtShortTs(l.ts)}
                </span>
                {l.text || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
