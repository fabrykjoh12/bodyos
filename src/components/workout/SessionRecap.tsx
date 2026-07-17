import type { Unit, WorkoutSession } from '@/types';
import { exerciseName } from '@/data/exercises';
import { formatWeight } from '@/lib/format';

/** Post-workout recap of what was actually lifted, per exercise (with RIR). */
export function SessionRecap({ session, unit }: { session: WorkoutSession; unit: Unit }) {
  const rows = session.exercises
    .map((ex) => ({
      id: ex.id,
      name: exerciseName(ex.exerciseId),
      sets: ex.sets.filter((s) => s.completed && !s.isWarmup),
    }))
    .filter((r) => r.sets.length > 0);

  if (rows.length === 0) return null;

  return (
    <div className="mt-5">
      <h2 className="mb-2 text-sm font-semibold text-content">This session</h2>
      <div className="card divide-y divide-line">
        {rows.map((r) => (
          <div key={r.id} className="px-4 py-3">
            <p className="text-sm font-semibold text-content">{r.name}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {r.sets.map((s) => (
                <span
                  key={s.id}
                  className="tnum inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-xs text-content-muted"
                >
                  <span className="font-semibold text-content">{formatWeight(s.weightKg, unit, false)}</span>
                  <span className="text-content-faint">{unit}</span>×{s.reps}
                  {s.rir !== undefined && (
                    <span className="text-content-faint">· {s.rir >= 4 ? '4+' : s.rir} RIR</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
