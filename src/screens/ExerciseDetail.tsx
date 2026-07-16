import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getExercise, exerciseName } from '@/data/exercises';
import { useStore } from '@/store/useStore';
import { e1rmSeries } from '@/lib/analytics';
import { formatWeight } from '@/lib/format';
import { relativeDay } from '@/lib/date';
import { findLastExerciseSession } from '@/lib/history';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { StrengthChart } from '@/components/progress/StrengthChart';
import { Chip } from '@/components/ui/Chip';
import { ExerciseThumb } from '@/components/exercise/ExerciseThumb';

export function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ex = id ? getExercise(id) : undefined;
  const sessions = useStore((s) => s.sessions);
  const unit = useStore((s) => s.user.settings.unit);

  const series = useMemo(() => (id ? e1rmSeries(id, sessions) : []), [id, sessions]);
  const last = id ? findLastExerciseSession(id, sessions) : undefined;

  if (!ex) {
    return (
      <div className="flex flex-col gap-4">
        <ScreenHeader title="Exercise" back />
        <p className="card p-4 text-sm text-content-muted">Exercise not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title={ex.name} subtitle={`${ex.primaryMuscle} · ${ex.equipment}`} back />

      <div className="flex justify-center overflow-hidden rounded-2xl border border-line bg-surface py-4">
        <ExerciseThumb id={ex.id} muscle={ex.primaryMuscle} size={160} rounded="rounded-2xl" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip tone="accent" className="capitalize">{ex.kind}</Chip>
        <Chip className="capitalize">{ex.pattern.replace(/-/g, ' ')}</Chip>
        <Chip tone="muted">{ex.defaultRepRange[0]}–{ex.defaultRepRange[1]} reps</Chip>
        {ex.secondaryMuscles.map((m) => (
          <Chip key={m} tone="muted" className="capitalize">{m}</Chip>
        ))}
      </div>

      {series.length >= 2 && (
        <div className="card p-4">
          <p className="label-tiny mb-2">Estimated 1RM</p>
          <StrengthChart data={series.map((p) => ({ label: p.label, value: p.value }))} unit={unit} />
        </div>
      )}

      {last && (
        <div className="card p-4">
          <p className="label-tiny">Last performed · {relativeDay(last.session.startedAt)}</p>
          <ul className="mt-2 space-y-1">
            {last.exercise.sets
              .filter((s) => s.completed && !s.isWarmup)
              .map((s) => (
                <li key={s.id} className="tnum text-sm text-content-muted">
                  {formatWeight(s.weightKg, unit)} × {s.reps}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="card p-4">
        <p className="label-tiny mb-2">How to perform</p>
        <ol className="space-y-2">
          {ex.instructions.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-content-muted">
              <span className="tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-content-faint">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {ex.substitutions.length > 0 && (
        <div className="card p-4">
          <p className="label-tiny mb-2">Substitutions</p>
          <div className="flex flex-col gap-2">
            {ex.substitutions.map((sid) => (
              <button
                key={sid}
                onClick={() => navigate(`/exercises/${sid}`)}
                className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-sm text-content hover:border-line-strong"
              >
                {exerciseName(sid)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
