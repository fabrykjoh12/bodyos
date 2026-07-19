import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Check } from 'lucide-react';
import type { Routine } from '@/data/routines';
import { ROUTINES } from '@/data/routines';
import { useStore } from '@/store/useStore';
import { weekdayName } from '@/lib/date';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';

export function Routines() {
  const navigate = useNavigate();
  const applyRoutine = useStore((s) => s.applyRoutine);
  const [pending, setPending] = useState<Routine | null>(null);

  const apply = (r: Routine) => {
    applyRoutine(r);
    setPending(null);
    navigate('/workouts');
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      <ScreenHeader title="Starter routines" subtitle="Pick a split — we build & schedule it" back="/workouts" />

      <div className="flex flex-col gap-3">
        {ROUTINES.map((r) => (
          <section key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-content">{r.name}</h3>
                <p className="mt-1 text-sm text-content-muted">{r.description}</p>
              </div>
              <Chip tone="accent" className="shrink-0">{r.daysPerWeek}×/wk</Chip>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.days.map((d) => (
                <span key={d.name} className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-medium text-content-muted">
                  {d.name}
                </span>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-content-faint">
              <CalendarDays size={13} />
              {r.schedule.map((sc) => weekdayName(sc.weekday)).join(' · ')}
            </div>

            <Button variant="secondary" fullWidth className="mt-4" onClick={() => setPending(r)}>
              Use this routine
            </Button>
          </section>
        ))}
      </div>

      <Sheet open={pending !== null} onClose={() => setPending(null)} title={pending ? `Use ${pending.name}?` : ''}>
        {pending && (
          <>
            <p className="text-sm text-content-muted">
              This adds {pending.days.length} workout{pending.days.length > 1 ? 's' : ''} to your library and schedules
              {' '}{pending.schedule.length} session{pending.schedule.length > 1 ? 's' : ''} across the week. Existing
              workouts are kept.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button fullWidth onClick={() => apply(pending)}>
                <Check size={18} /> Add &amp; schedule
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setPending(null)}>Cancel</Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
