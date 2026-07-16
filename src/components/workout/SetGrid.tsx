import { Check } from 'lucide-react';
import type { ExerciseSession, Unit } from '@/types';
import { formatWeight } from '@/lib/format';

interface SetGridProps {
  exercise: ExerciseSession;
  unit: Unit;
  /** Index of the current active set (first incomplete). */
  activeSetIndex: number;
}

/** Compact ledger of every set: completed, active, and upcoming. */
export function SetGrid({ exercise, unit, activeSetIndex }: SetGridProps) {
  return (
    <ol className="flex flex-col gap-1.5" aria-label="Sets">
      {exercise.sets.map((set, i) => {
        const isActive = i === activeSetIndex;
        const state = set.completed ? 'done' : isActive ? 'active' : 'upcoming';
        return (
          <li
            key={set.id}
            className={[
              'flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors',
              state === 'done' && 'border-line/60 bg-surface-2/60 text-content-muted',
              state === 'active' && 'border-accent/50 bg-accent-soft text-content',
              state === 'upcoming' && 'border-line/40 text-content-faint',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span
              className={[
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                set.completed ? 'bg-success text-ink' : isActive ? 'bg-accent text-ink' : 'bg-surface-3 text-content-faint',
              ].join(' ')}
            >
              {set.completed ? <Check size={13} strokeWidth={3} /> : set.setNumber}
            </span>
            {set.isWarmup && (
              <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-caution">
                Warmup
              </span>
            )}
            <span className="tnum ml-auto font-semibold text-content">
              {formatWeight(set.weightKg, unit, false)}
              <span className="ml-1 text-xs font-normal text-content-faint">{unit}</span>
            </span>
            <span className="tnum w-14 text-right font-semibold">
              {set.reps}
              <span className="ml-1 text-xs font-normal text-content-faint">reps</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
