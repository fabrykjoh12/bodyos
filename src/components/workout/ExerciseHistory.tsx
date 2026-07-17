import { useState } from 'react';
import { ChevronDown, History } from 'lucide-react';
import type { ExerciseSession, Unit } from '@/types';
import { formatWeight } from '@/lib/format';
import { relativeDay } from '@/lib/date';

/** Collapsible previous-performance panel — secondary to the active set. */
export function ExerciseHistory({ exercise, unit }: { exercise: ExerciseSession; unit: Unit }) {
  const [open, setOpen] = useState(false);
  const prev = exercise.previous;

  if (!prev || prev.sets.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-content-faint">
        No history yet — this becomes your baseline.
      </div>
    );
  }

  const summary = prev.sets.map((s) => s.reps).join(', ');

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <History size={16} className="text-content-faint" />
        <div className="min-w-0 flex-1">
          <p className="label-tiny">Last time · {relativeDay(prev.date)}</p>
          <p className="tnum truncate text-sm font-semibold text-ice">
            {formatWeight(prev.topWeightKg, unit)} × {summary}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-content-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="label-tiny">Recent sets</p>
              <ul className="mt-1 space-y-0.5">
                {prev.sets.map((s, i) => (
                  <li key={i} className="tnum text-content-muted">
                    {formatWeight(s.weightKg, unit, false)} {unit} × {s.reps}
                    {s.rir !== undefined && (
                      <span className="text-content-faint"> · {s.rir >= 4 ? '4+' : s.rir} RIR</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label-tiny">Est. 1RM</p>
              <p className="tnum mt-1 text-lg font-bold text-content">
                {prev.estimated1RM ? formatWeight(prev.estimated1RM, unit) : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
