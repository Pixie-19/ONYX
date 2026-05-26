'use client';
import { useEffect, useState } from 'react';
import { useOnyx } from '@/lib/store';
import { Cpu, MemoryStick, Wifi, Database, AudioWaveform, Bot } from 'lucide-react';
import { fmtPct } from '@/lib/format';

/**
 * Bottom status bar — tight system summary line.
 * Reads telemetry, network, intelligence, blackout state from the store.
 * Calm, monospaced numerics, no flicker.
 */
export function StatusBar() {
  const tele = useOnyx((s) => s.telemetry);
  const network = useOnyx((s) => s.network);
  const intel = useOnyx((s) => s.intelligence);
  const blackout = useOnyx((s) => s.blackout);
  const session = useOnyx((s) => s.session);
  const events = useOnyx((s) => s.events);
  const [clock, setClock] = useState<number | null>(null);

  useEffect(() => {
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const last = tele[tele.length - 1];
  const recentDeg = network.slice(-30).filter((n) => n.status !== 'healthy').length;
  const evPerMin = events.filter((e) => e.ts > Date.now() - 60_000).length;

  return (
    <footer className="relative h-9 px-4 flex items-center gap-5 border-t border-line bg-surface-raised text-[11.5px]">
      <Cell icon={<Cpu size={11.5} />} label="CPU" value={fmtPct(last?.cpu_load ?? 0, 1)} />
      <Cell icon={<MemoryStick size={11.5} />} label="Memory" value={fmtPct(last?.mem_used_pct ?? 0, 1)} />
      <Cell
        icon={<Wifi size={11.5} />}
        label="Network"
        value={recentDeg ? `${recentDeg} degraded` : 'Healthy'}
        tone={recentDeg ? 'warn' : 'ok'}
      />
      <Cell icon={<Database size={11.5} />} label="SQL" value={`${intel.length} exec`} />
      <Cell icon={<AudioWaveform size={11.5} />} label="Events" value={`${evPerMin}/min`} />
      <Cell
        icon={<Bot size={11.5} />}
        label="Route"
        value={blackout.provider}
        tone={blackout.online ? 'info' : 'warn'}
      />

      <div className="ml-auto flex items-center gap-4 text-[11.5px] text-tertiary">
        <span>
          Session <span className="text-secondary tabular-nums">{session ?? '—'}</span>
        </span>
        <span className="text-secondary tabular-nums" suppressHydrationWarning>
          {clock === null
            ? '—:—:—'
            : new Date(clock).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="heartbeat" />
          <span className="text-secondary">Operational</span>
        </span>
      </div>
    </footer>
  );
}

function Cell({
  icon,
  label,
  value,
  tone = 'info',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'info' | 'warn' | 'error' | 'ok';
}) {
  const toneClass =
    tone === 'ok'
      ? 'text-[#047857] dark:text-emerald-300'
      : tone === 'warn'
        ? 'text-[#B45309] dark:text-amber-300'
        : tone === 'error'
          ? 'text-[#B91C1C] dark:text-red-300'
          : 'text-primary';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-tertiary">{icon}</span>
      <span className="text-tertiary">{label}</span>
      <span className={`tabular-nums font-medium ${toneClass}`}>{value}</span>
    </div>
  );
}
