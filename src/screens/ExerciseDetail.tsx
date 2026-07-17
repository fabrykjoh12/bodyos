import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { getExercise, exerciseName } from '@/data/exercises';
import { useStore } from '@/store/useStore';
import { e1rmSeries } from '@/lib/analytics';
import { formatWeight } from '@/lib/format';
import { relativeDay } from '@/lib/date';
import { findLastExerciseSession } from '@/lib/history';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { StrengthChart } from '@/components/progress/StrengthChart';
import { Chip } from '@/components/ui/Chip';
import { MuscleMap } from '@/components/exercise/MuscleMap';

export function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ex = id ? getExercise(id) : undefined;
  const sessions = useStore((s) => s.sessions);
  const unit = useStore((s) => s.user.settings.unit);
  const savedNote = useStore((s) => (id ? s.exerciseNotes[id] ?? '' : ''));
  const setExerciseNote = useStore((s) => s.setExerciseNote);
  const [note, setNote] = useState(savedNote);
  // Reset the draft when navigating between exercises (same component instance).
  useEffect(() => setNote(savedNote), [id, savedNote]);

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

      <div className="card py-5">
        <p className="label-tiny mb-3 text-center">Muscles worked</p>
        <MuscleMap primary={ex.primaryMuscle} secondary={ex.secondaryMuscles} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip tone="accent" className="capitalize">{ex.kind}</Chip>
        <Chip className="capitalize">{ex.pattern.replace(/-/g, ' ')}</Chip>
        <Chip tone="muted">{ex.defaultRepRange[0]}–{ex.defaultRepRange[1]} reps</Chip>
        {ex.secondaryMuscles.map((m) => (
          <Chip key={m} tone="muted" className="capitalize">{m}</Chip>
        ))}
      </div>

      <div className="card p-4">
        <p className="label-tiny mb-2">My notes</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => ex && setExerciseNote(ex.id, note)}
          placeholder="Add a personal cue or setup reminder…"
          rows={2}
          className="w-full resize-none rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-content placeholder:text-content-faint focus:border-accent focus:outline-none"
        />
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

      {ex.tips && ex.tips.length > 0 && (
        <div className="card border-accent/20 p-4">
          <p className="label-tiny mb-2">Form cues</p>
          <ul className="space-y-2">
            {ex.tips.map((tip, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-content-muted">
                <Lightbulb size={15} className="mt-0.5 shrink-0 text-accent" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

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
