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
        icon={<GitBranch size={16} />}
        title="Chrono replay"
        subtitle="Causal reconstruction over append-only replay_events"
        meta={
          <>
            <Badge tone="muted">{events.length} buffered</Badge>
            {demo.phase > 0 && (
              <Badge tone="info">Phase {demo.phase} · {demo.label}</Badge>
            )}
            <button
              onClick={() => setCinema(!cinema)}
              className={`btn ${cinema ? 'btn-primary' : 'btn-outline'} h-8 px-3 text-[12.5px]`}
            >
              <Film size={13} /> {cinema ? 'Exit cinema' : 'Cinema mode'}
            </button>
          </>
        }
      />
      <div className="flex-1 min-h-0 p-6 surface-base">
        <div className="h-full max-w-[1480px] mx-auto">
          <ReplayConsole />
        </div>
      </div>
    </div>
  );
}
