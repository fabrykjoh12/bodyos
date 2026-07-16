import type {
  AppData,
  ExerciseSession,
  PreviousPerformance,
  SetEntry,
  WorkoutSession,
  WorkoutTemplate,
} from '@/types';
import { requireExercise } from '@/data/exercises';
import { uid } from './id';
import { now } from './date';
import { bestE1RM, round1 } from './volume';
import { recommendProgression } from './progression';

/** Most recent completed ExerciseSession for an exercise, newest first. */
export function findLastExerciseSession(
  exerciseId: string,
  sessions: WorkoutSession[],
): { session: WorkoutSession; exercise: ExerciseSession } | undefined {
  const ordered = [...sessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  for (const session of ordered) {
    const exercise = session.exercises.find(
      (e) => e.exerciseId === exerciseId && e.sets.some((set) => set.completed && !set.isWarmup),
    );
    if (exercise) return { session, exercise };
  }
  return undefined;
}

export function toPreviousPerformance(
  session: WorkoutSession,
  exercise: ExerciseSession,
): PreviousPerformance {
  const working = exercise.sets.filter((s) => s.completed && !s.isWarmup);
  const sets = working.map((s) => ({ weightKg: s.weightKg, reps: s.reps }));
  return {
    date: session.completedAt ?? session.startedAt,
    sets,
    topWeightKg: Math.max(0, ...sets.map((s) => s.weightKg)),
    estimated1RM: round1(bestE1RM(sets)),
  };
}

/**
 * Count how many recent consecutive completed sessions used the same top
 * weight without breaking into the top of the rep range. Used to escalate
 * a stall toward a reduce / deload recommendation.
 */
export function countPriorStalls(
  exerciseId: string,
  currentTopWeight: number,
  repTop: number,
  sessions: WorkoutSession[],
): number {
  const ordered = [...sessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  let stalls = 0;
  for (const s of ordered) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const working = ex.sets.filter((set) => set.completed && !set.isWarmup);
    if (working.length === 0) continue;
    const top = Math.max(...working.map((w) => w.weightKg));
    const hitTop = working.some((w) => w.weightKg >= top - 1e-9 && w.reps >= repTop);
    if (Math.abs(top - currentTopWeight) < 1e-9 && !hitTop) {
      stalls += 1;
    } else {
      break;
    }
  }
  return stalls;
}

/** Smart-prefilled working weight/reps for the next time this exercise is done. */
export function prefillFor(
  exerciseId: string,
  repRange: [number, number],
  incrementKg: number,
  startWeightKg: number | undefined,
  sessions: WorkoutSession[],
): { weightKg: number; targetReps: number; previous?: PreviousPerformance } {
  const last = findLastExerciseSession(exerciseId, sessions);
  if (!last) {
    return { weightKg: startWeightKg ?? 20, targetReps: repRange[1] };
  }
  const previous = toPreviousPerformance(last.session, last.exercise);
  const workingSets = last.exercise.sets
    .filter((s) => s.completed && !s.isWarmup)
    .map((s) => ({ weightKg: s.weightKg, reps: s.reps, difficulty: s.difficulty }));
  const ex = requireExercise(exerciseId);
  const rec = recommendProgression({
    exerciseId,
    repRange,
    incrementKg,
    kind: ex.kind,
    workingSets,
    priorStalls: countPriorStalls(exerciseId, previous.topWeightKg, repRange[1], sessions),
  });
  return {
    weightKg: rec.nextWeightKg > 0 ? rec.nextWeightKg : previous.topWeightKg,
    targetReps: rec.nextRepRange[0],
    previous,
  };
}

/** Build a fresh active WorkoutSession from a template with smart prefill. */
export function buildActiveSession(
  template: WorkoutTemplate,
  data: Pick<AppData, 'sessions'>,
): WorkoutSession {
  const exercises: ExerciseSession[] = [...template.exercises]
    .sort((a, b) => a.order - b.order)
    .map((we, index) => {
      const ex = requireExercise(we.exerciseId);
      const { weightKg, targetReps, previous } = prefillFor(
        we.exerciseId,
        we.repRange,
        ex.defaultIncrementKg,
        we.startWeightKg,
        data.sessions,
      );
      const sets: SetEntry[] = we.sets.map((ts, i) => ({
        id: uid('set'),
        exerciseId: we.exerciseId,
        setNumber: i + 1,
        type: ts.type,
        weightKg: ts.type === 'warmup' ? round1(weightKg * 0.5) : weightKg,
        reps: ts.type === 'warmup' ? Math.max(repTopHalf(we.repRange), 8) : targetReps,
        completed: false,
        isWarmup: ts.type === 'warmup',
      }));
      return {
        id: uid('exs'),
        exerciseId: we.exerciseId,
        order: index,
        repRange: we.repRange,
        restSec: we.restSec,
        incrementKg: ex.defaultIncrementKg,
        notes: we.notes,
        status: index === 0 ? 'active' : 'pending',
        sets,
        previous,
      };
    });

  return {
    id: uid('ses'),
    templateId: template.id,
    name: template.name,
    focus: template.focus,
    status: 'active',
    startedAt: now(),
    exercises,
    currentExerciseIndex: 0,
  };
}

function repTopHalf(range: [number, number]): number {
  return Math.round((range[0] + range[1]) / 2);
}
