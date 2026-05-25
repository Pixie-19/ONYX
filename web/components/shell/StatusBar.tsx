'use client';
import { useEffect, useState } from 'react';
import { useOnyx } from '@/lib/store';
import { Cpu, MemoryStick, Wifi, Database, AudioWaveform, Bot } from 'lucide-react';
import { fmtClock, fmtPct } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

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
    const id = setInterval(() => setClock(Date.now()), 173);
    return () => clearInterval(id);
  }, []);

  const last = tele[tele.length - 1];
  const recentDeg = network.slice(-30).filter((n) => n.status !== 'healthy').length;
  const evPerMin = events.filter((e) => e.ts > Date.now() - 60_000).length;

  return (
    <footer className="relative h-9 px-3 flex items-center gap-4 border-t border-onyx-600/40 bg-onyx-950/85 backdrop-blur z-10">
      <div className="absolute inset-0 grid-bg opacity-15 pointer-events-none" />
      <Cell icon={<Cpu size={11} />} label="CPU"  value={fmtPct(last?.cpu_load ?? 0, 1)} />
      <Cell icon={<MemoryStick size={11} />} label="MEM" value={fmtPct(last?.mem_used_pct ?? 0, 1)} />
      <Cell icon={<Wifi size={11} />} label="NET" value={`${recentDeg ? recentDeg + ' DEG' : 'OK'}`} sev={recentDeg ? 'warn' : 'info'} />
      <Cell icon={<Database size={11} />} label="SQL" value={`${intel.length} EXEC`} />
      <Cell icon={<AudioWaveform size={11} />} label="EV/MIN" value={`${evPerMin}`} />
      <Cell icon={<Bot size={11} />} label="ROUTE" value={blackout.provider.toUpperCase()} sev={blackout.online ? 'info' : 'warn'} />

      <div className="ml-auto flex items-center gap-3 text-[9.5px] tracking-[0.22em] uppercase text-onyx-300">
        <span>SESSION <span className="text-onyx-100">{session ?? '——'}</span></span>
        <span className="text-onyx-100 font-mono tabular-nums" suppressHydrationWarning>
          {clock === null ? '——:——:——.———' : fmtClock(clock)}
        </span>
        <span className="flex items-center gap-1.5"><span className="heartbeat" />NOMINAL</span>
      </div>
    </footer>
  );
}

function Cell({ icon, label, value, sev = 'info' as 'info' | 'warn' | 'error' | 'critical' | 'ok' }: { icon: React.ReactNode; label: string; value: string; sev?: 'info' | 'warn' | 'error' | 'critical' | 'ok' }) {
  return (
    <div className="flex items-center gap-1.5 relative">
      <span className="text-onyx-300">{icon}</span>
      <span className="text-[9px] tracking-[0.22em] uppercase text-onyx-300">{label}</span>
      <Badge tone={sev} className="!py-0 !text-[9.5px]">{value}</Badge>
    </div>
  );
}
