'use client';
import { useOnyx } from '@/lib/store';
import { GitBranch, Film } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { ReplayConsole } from '@/components/panels/ReplayConsole';
import { Badge } from '@/components/ui/Badge';

export default function ReplayPage() {
  const events = useOnyx((s) => s.events);
  const cinema = useOnyx((s) => s.cinemaMode);
  const setCinema = useOnyx((s) => s.setCinema);
  const demo = useOnyx((s) => s.demo);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={<GitBranch size={14} />}
        title="CHRONO REPLAY · TEMPORAL EXECUTION"
        subtitle="Causal reconstruction over append-only replay_events"
        meta={
          <>
            <Badge tone="muted">{events.length} BUFFERED</Badge>
            <Badge tone={demo.phase === 3 ? 'info' : 'muted'}>PHASE {demo.phase} · {demo.label}</Badge>
            <button
              onClick={() => setCinema(!cinema)}
              className={'flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-3 py-1 border transition ' + (cinema ? 'text-violet-glow border-violet-glow/70 bg-violet-glow/10' : 'text-onyx-100 border-onyx-600/60 hover:border-violet-glow/60 hover:text-violet-glow')}
            >
              <Film size={11} /> {cinema ? 'EXIT CINEMA' : 'CINEMA MODE'}
            </button>
          </>
        }
      />
      <div className="flex-1 min-h-0 p-3">
        <ReplayConsole />
      </div>
    </div>
  );
}
