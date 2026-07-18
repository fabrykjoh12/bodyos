import { Check, Pencil, TrendingUp } from 'lucide-react';
import type { ExerciseSession, SetEntry, Unit } from '@/types';
import { formatWeight } from '@/lib/format';

interface SetGridProps {
  exercise: ExerciseSession;
  unit: Unit;
  /** Index of the current active set (first incomplete). */
  activeSetIndex: number;
  /** Flag completed working sets that beat last time's same set. */
  highlightBeats?: boolean;
  /** When provided, tapping a logged set opens it for editing. */
  onEditSet?: (set: SetEntry) => void;
}

/** True when a logged working set beats last time's same working set —
 *  heavier, or the same load for more reps. */
function beatsPrevious(set: SetEntry, prev?: { weightKg: number; reps: number }): boolean {
  if (!prev) return false;
  const EPS = 1e-6;
  return set.weightKg > prev.weightKg + EPS || (Math.abs(set.weightKg - prev.weightKg) < EPS && set.reps > prev.reps);
}

/** Compact ledger of every set: completed, active, and upcoming. */
export function SetGrid({ exercise, unit, activeSetIndex, highlightBeats = false, onEditSet }: SetGridProps) {
  let workingIdx = -1;
  return (
    <ol className="flex flex-col gap-1.5" aria-label="Sets">
      {exercise.sets.map((set, i) => {
        const isActive = i === activeSetIndex;
        const state = set.completed ? 'done' : isActive ? 'active' : 'upcoming';
        const thisWorkingIdx = set.isWarmup ? -1 : (workingIdx += 1);
        const prev = thisWorkingIdx >= 0 ? exercise.previous?.sets[thisWorkingIdx] : undefined;
        const beat = highlightBeats && set.completed && !set.isWarmup && beatsPrevious(set, prev);
        const editable = set.completed && !!onEditSet;
        const rowClass = [
          'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors',
          state === 'done' && 'border-line/60 bg-surface-2/60 text-content-muted',
          state === 'active' && 'border-accent/50 bg-accent-soft text-content',
          state === 'upcoming' && 'border-line/40 text-content-faint',
        ]
          .filter(Boolean)
          .join(' ');
        const rowContent = (
          <>
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
            {set.rir !== undefined && (
              <span className="tnum rounded bg-surface-3 px-1.5 py-0.5 text-[0.6rem] font-semibold text-content-muted">
                {set.rir >= 4 ? '4+' : set.rir} RIR
              </span>
            )}
            {beat && (
              <span
                className="flex items-center gap-0.5 rounded bg-accent/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-accent"
                aria-label="Beat last time"
              >
                <TrendingUp size={11} strokeWidth={2.5} /> Beat
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
            {editable && <Pencil size={13} className="ml-1.5 shrink-0 text-content-faint" aria-hidden />}
          </>
        );
        return (
          <li key={set.id}>
            {editable ? (
              <button
                type="button"
                onClick={() => onEditSet!(set)}
                aria-label={`Edit set ${set.setNumber}`}
                className={rowClass + ' text-left hover:border-line-strong'}
              >
                {rowContent}
              </button>
            ) : (
              <div className={rowClass}>{rowContent}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
