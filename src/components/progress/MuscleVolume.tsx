import { useMemo } from 'react';
import type { MuscleGroup, WorkoutSession } from '@/types';
import { weeklyMuscleSets } from '@/lib/analytics';
import { classifyWeeklyVolume, type VolumeStatus } from '@/lib/volumeLandmarks';

const LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
};

const DOT: Record<VolumeStatus, string> = {
  low: 'bg-content-faint',
  optimal: 'bg-success',
  high: 'bg-caution',
  over: 'bg-danger',
};

/**
 * Weekly working sets per muscle vs. its growth range (MEV–MAV landmarks).
 * Read-only analytics — never blocks training, just informs planning.
 */
export function MuscleVolume({ sessions }: { sessions: WorkoutSession[] }) {
  const rows = useMemo(() => {
    const sets = weeklyMuscleSets(sessions, 7);
    return (Object.entries(sets) as [MuscleGroup, number][])
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([muscle, n]) => ({ muscle, sets: n, ...classifyWeeklyVolume(n, muscle) }));
  }, [sessions]);

  if (rows.length === 0) return null;

  return (
    <section className="card p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="label-tiny">Weekly volume by muscle</h3>
        <span className="text-[11px] text-content-faint">last 7 days</span>
      </div>
      <p className="mb-3 text-xs text-content-faint">
        Working sets vs. the growth range (shaded band).
      </p>
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const ceil = Math.max(r.landmark.mrv, r.sets);
          const bandLeft = (r.landmark.mev / ceil) * 100;
          const bandWidth = ((r.landmark.mav - r.landmark.mev) / ceil) * 100;
          const fill = Math.min(100, (r.sets / ceil) * 100);
          return (
            <li key={r.muscle} className="flex items-center gap-3">
              <span className="w-[4.5rem] shrink-0 text-sm text-content">{LABELS[r.muscle]}</span>
              <div
                className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2"
                title={r.label}
              >
                <span
                  className="absolute inset-y-0 rounded-full bg-surface-3"
                  style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
                  aria-hidden
                />
                <span
                  className={`absolute inset-y-0 left-0 rounded-full ${DOT[r.status]}`}
                  style={{ width: `${fill}%` }}
                />
              </div>
              <span className="tnum w-6 text-right text-sm font-semibold text-content">
                {r.sets}
              </span>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${DOT[r.status]}`}
                aria-label={r.label}
              />
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-content-faint">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-content-faint" /> below range
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-success" /> in range
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-caution" /> near max
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-danger" /> over
        </span>
      </p>
    </section>
  );
}
