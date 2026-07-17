import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight, Flame, Plus, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { requireExercise } from '@/data/exercises';
import { formatRepRange, formatWeight, lbToKg } from '@/lib/format';
import { generateWarmups, BAR_KG, BAR_LB } from '@/lib/plates';
import { haptics } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import { ActiveSetCard } from '@/components/workout/ActiveSetCard';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { UndoBar } from '@/components/workout/UndoBar';
import { SetGrid } from '@/components/workout/SetGrid';
import { ExerciseHistory } from '@/components/workout/ExerciseHistory';
import { DifficultyPicker } from '@/components/workout/DifficultyPicker';

export function GymMode() {
  const navigate = useNavigate();
  const { id } = useParams();
  const session = useStore((s) => s.activeSession);
  const unit = useStore((s) => s.user.settings.unit);
  const setWeight = useStore((s) => s.setWeight);
  const setReps = useStore((s) => s.setReps);
  const logActiveSet = useStore((s) => s.logActiveSet);
  const addSet = useStore((s) => s.addSet);
  const addWarmupSets = useStore((s) => s.addWarmupSets);
  const nextExercise = useStore((s) => s.nextExercise);
  const goToExercise = useStore((s) => s.goToExercise);
  const setDifficulty = useStore((s) => s.setExerciseDifficulty);
  const abandonSession = useStore((s) => s.abandonSession);
  const completeSession = useStore((s) => s.completeSession);

  const [confirmQuit, setConfirmQuit] = useState(false);

  const exIndex = session?.currentExerciseIndex ?? 0;
  const exercise = session?.exercises[exIndex];
  const activeSetIndex = useMemo(
    () => exercise?.sets.findIndex((s) => !s.completed) ?? -1,
    [exercise],
  );

  if (!session || session.id !== id || !exercise) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-content-muted">This workout is no longer active.</p>
        <Button onClick={() => navigate('/')}>Back to home</Button>
      </div>
    );
  }

  const meta = requireExercise(exercise.exerciseId);
  const activeSet = activeSetIndex >= 0 ? exercise.sets[activeSetIndex] : null;
  const exerciseDone = activeSetIndex < 0;
  const isLastExercise = exIndex === session.exercises.length - 1;
  const completedWorking = exercise.sets.filter((s) => s.completed && !s.isWarmup).length;
  const totalWorking = exercise.sets.filter((s) => !s.isWarmup).length;

  // Offer generated warm-up sets at the start of a barbell exercise.
  const firstWorking = exercise.sets.find((s) => !s.isWarmup);
  const barKg = unit === 'kg' ? BAR_KG : lbToKg(BAR_LB);
  const canWarmup =
    meta.equipment === 'barbell' &&
    !exercise.sets.some((s) => s.isWarmup) &&
    completedWorking === 0 &&
    !!firstWorking &&
    generateWarmups(firstWorking.weightKg, { barKg }).length > 0;

  const objective = activeSet
    ? `Complete ${formatRepRange(exercise.repRange)} reps at ${formatWeight(activeSet.weightKg, unit)}`
    : 'All sets logged';

  const handleLog = () => {
    haptics.success();
    logActiveSet();
  };

  const handleFinish = () => {
    const completedId = completeSession();
    if (completedId) navigate(`/session/${completedId}/complete`, { replace: true });
    else navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col bg-base px-4 pb-4 safe-top">
      {/* Header: exercise position + quit */}
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-2 border-b border-line/60 bg-base/85 px-4 py-3 backdrop-blur-md">
        <IconButton label="Exit workout" onClick={() => setConfirmQuit(true)}>
          <X size={22} />
        </IconButton>
        <div className="min-w-0 flex-1 text-center">
          <p className="label-tiny">
            Exercise {exIndex + 1} / {session.exercises.length}
          </p>
          <p className="truncate text-sm font-semibold text-content">{session.name}</p>
        </div>
        <span className="tnum w-11 text-right text-sm font-semibold text-content-muted">
          {completedWorking}/{totalWorking}
        </span>
      </header>

      {/* Exercise quick-nav */}
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {session.exercises.map((ex, i) => {
          const done = ex.sets.every((s) => s.completed);
          const active = i === exIndex;
          return (
            <button
              key={ex.id}
              onClick={() => goToExercise(i)}
              className={[
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-accent bg-accent-soft text-accent'
                  : done
                    ? 'border-success/30 bg-success-soft text-success'
                    : 'border-line bg-surface text-content-muted',
              ].join(' ')}
            >
              {done && <Check size={12} strokeWidth={3} />}
              {requireExercise(ex.exerciseId).name.split(' ').slice(-1)[0]}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-3">
        {activeSet ? (
          <ActiveSetCard
            exerciseName={meta.name}
            setNumber={activeSet.setNumber}
            totalSets={exercise.sets.length}
            repRange={exercise.repRange}
            weightKg={activeSet.weightKg}
            reps={activeSet.reps}
            unit={unit}
            incrementKg={exercise.incrementKg}
            equipment={meta.equipment}
            isWarmup={activeSet.isWarmup}
            objective={objective}
            onWeightChange={setWeight}
            onRepsChange={setReps}
          />
        ) : (
          <section className="card-2 flex flex-col items-center gap-2 p-6 text-center animate-pop-in">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-ink">
              <Check size={26} strokeWidth={3} />
            </span>
            <h2 className="text-lg font-bold text-content">{meta.name} complete</h2>
            <p className="text-sm text-content-muted">
              {completedWorking} sets logged. Rate it to sharpen your next recommendation.
            </p>
          </section>
        )}

        {exercise.notes && (
          <p className="rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-content-muted">
            {exercise.notes}
          </p>
        )}

        <RestTimerBar />
        <UndoBar />

        {/* Difficulty appears once at least one set is done */}
        {completedWorking > 0 && (
          <div className="card p-4">
            <DifficultyPicker
              value={exercise.difficulty}
              onChange={(d) => setDifficulty(exIndex, d)}
            />
          </div>
        )}

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="label-tiny">Sets</span>
            <div className="flex items-center gap-4">
              {canWarmup && (
                <button
                  onClick={() => addWarmupSets(exIndex)}
                  className="flex items-center gap-1 text-xs font-semibold text-content-muted hover:text-content"
                >
                  <Flame size={14} /> Warm-up
                </button>
              )}
              <button
                onClick={() => addSet(exIndex)}
                className="flex items-center gap-1 text-xs font-semibold text-accent"
              >
                <Plus size={14} /> Add set
              </button>
            </div>
          </div>
          <SetGrid exercise={exercise} unit={unit} activeSetIndex={activeSetIndex} />
        </div>

        <ExerciseHistory exercise={exercise} unit={unit} />
      </div>

      {/* Primary sticky action */}
      <div className="sticky bottom-0 -mx-4 mt-3 border-t border-line/60 bg-base/90 px-4 py-3 backdrop-blur-md safe-bottom">
        {!exerciseDone ? (
          <Button size="xl" fullWidth onClick={handleLog} variant="primary">
            <Check size={22} strokeWidth={3} /> Log Set
          </Button>
        ) : !isLastExercise ? (
          <Button size="xl" fullWidth onClick={nextExercise} variant="secondary">
            Next exercise <ChevronRight size={20} />
          </Button>
        ) : (
          <Button size="xl" fullWidth onClick={handleFinish} variant="success">
            <Check size={22} strokeWidth={3} /> Finish workout
          </Button>
        )}
      </div>

      <Sheet open={confirmQuit} onClose={() => setConfirmQuit(false)} title="Leave this workout?">
        <p className="text-sm text-content-muted">
          Your progress is saved automatically — you can resume anytime from the home screen.
          Discarding removes this session entirely.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="secondary" fullWidth onClick={() => { setConfirmQuit(false); navigate('/'); }}>
            Keep it & leave
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              abandonSession();
              navigate('/', { replace: true });
            }}
          >
            Discard workout
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
