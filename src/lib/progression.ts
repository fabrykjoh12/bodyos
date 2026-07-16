import type {
  Difficulty,
  ExerciseKind,
  ExerciseSession,
  ProgressionAction,
  ProgressionRecommendation,
} from '@/types';
import { formatRepRange } from './format';

// ---------------------------------------------------------------------------
// Progressive overload engine
//
// Model: DOUBLE PROGRESSION (the default for hypertrophy).
//   - The user trains within a rep range at a fixed working weight.
//   - When every working set reaches the TOP of the range, add weight and
//     restart at the bottom of the range.
//   - Otherwise keep the weight and try to add reps.
//   - Repeated failure to progress triggers a reduce / deload path.
//
// Every recommendation carries a human-readable `reason` — recommendations
// must never read as unexplained AI output.
// ---------------------------------------------------------------------------

export interface WorkingSetResult {
  weightKg: number;
  reps: number;
  difficulty?: Difficulty;
}

export interface ProgressionInput {
  exerciseId: string;
  repRange: [number, number];
  incrementKg: number;
  kind: ExerciseKind;
  /** This session's completed working sets. */
  workingSets: WorkingSetResult[];
  /**
   * Number of *prior* consecutive sessions already spent at the current top
   * weight without breaking through to the top of the range. Drives the
   * reduce / deload path. 0 means "no history of stalling".
   */
  priorStalls?: number;
}

/** Snap a weight to the nearest increment on a grid anchored at zero. */
export function roundToIncrement(weightKg: number, incrementKg: number): number {
  if (incrementKg <= 0) return Math.round(weightKg * 10) / 10;
  return Math.round(weightKg / incrementKg) * incrementKg;
}

/** Strip floating-point dust without moving the value off the lifter's grid. */
function dedust(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Worst-biased aggregate difficulty across sets ("easy" only if all easy). */
export function aggregateDifficulty(
  sets: WorkingSetResult[],
): Difficulty | undefined {
  const rated = sets.map((s) => s.difficulty).filter(Boolean) as Difficulty[];
  if (rated.length === 0) return undefined;
  if (rated.includes('failed')) return 'failed';
  if (rated.includes('hard')) return 'hard';
  if (rated.every((d) => d === 'easy')) return 'easy';
  return 'good';
}

function build(
  input: ProgressionInput,
  action: ProgressionAction,
  nextWeightKg: number,
  nextRepRange: [number, number],
  headline: string,
  reason: string,
  targetMet: boolean,
): ProgressionRecommendation {
  return {
    exerciseId: input.exerciseId,
    action,
    // Progression adds/removes whole increments relative to the weight the
    // lifter actually used, so we only strip FP dust here — snapping to a
    // zero-anchored grid would shift off-grid loads (e.g. 24 kg dumbbells).
    nextWeightKg: Math.max(0, dedust(nextWeightKg)),
    nextRepRange,
    headline,
    reason,
    targetMet,
  };
}

export function recommendProgression(
  input: ProgressionInput,
): ProgressionRecommendation {
  const [lo, hi] = input.repRange;
  const priorStalls = input.priorStalls ?? 0;
  const completed = input.workingSets.filter((s) => s.reps > 0 && s.weightKg >= 0);

  if (completed.length === 0) {
    return build(
      input,
      'maintain',
      input.workingSets[0]?.weightKg ?? 0,
      input.repRange,
      'No sets logged',
      'Nothing was logged for this exercise — keep the same plan next session.',
      false,
    );
  }

  const topWeight = Math.max(...completed.map((s) => s.weightKg));
  const topSets = completed.filter((s) => s.weightKg >= topWeight - 1e-9);
  const minReps = Math.min(...topSets.map((s) => s.reps));
  const allHitTop = topSets.every((s) => s.reps >= hi);
  const allHitBottom = topSets.every((s) => s.reps >= lo);
  const diff = aggregateDifficulty(completed);
  const rangeStr = formatRepRange(input.repRange);

  // --- Rule 1: missed the prescription (failed, or below the bottom) --------
  if (diff === 'failed' || !allHitBottom) {
    if (priorStalls >= 2) {
      // Deload by whole increments closest to a ~10% reduction.
      const steps = Math.max(1, Math.round((topWeight * 0.1) / input.incrementKg));
      const next = topWeight - steps * input.incrementKg;
      return build(
        input,
        'deload',
        next,
        input.repRange,
        'Deload recommended',
        `Stalled for ${priorStalls + 1} sessions. Drop to ${next.toFixed(
          1,
        )} kg, rebuild clean reps, then progress again.`,
        false,
      );
    }
    if (priorStalls === 1) {
      const steps = Math.max(1, Math.round((topWeight * 0.05) / input.incrementKg));
      const next = topWeight - steps * input.incrementKg;
      return build(
        input,
        'reduce-load',
        next,
        input.repRange,
        'Back off slightly',
        `Second miss at this load — ease off to ${next.toFixed(
          1,
        )} kg so form and reps recover, then push again.`,
        false,
      );
    }
    return build(
      input,
      'maintain',
      topWeight,
      input.repRange,
      'Target missed',
      `You fell short of ${lo} reps. Repeat ${topWeight.toFixed(
        1,
      )} kg next session and consolidate before adding load.`,
      false,
    );
  }

  // --- Rule 2: every top set hit the top of the range → add weight ----------
  if (allHitTop) {
    // Easy compound lifts can take a double jump; otherwise one increment.
    const jump =
      diff === 'easy' && input.kind === 'compound'
        ? input.incrementKg * 2
        : input.incrementKg;
    const next = topWeight + jump;
    const easyNote =
      diff === 'easy'
        ? ' It felt easy, so this jump is well earned.'
        : diff === 'hard'
          ? ' It was hard, so hold the reps steady as you add load.'
          : '';
    return build(
      input,
      'increase-weight',
      next,
      input.repRange,
      'Target completed',
      `Every set reached ${hi} reps. Move to ${next.toFixed(
        1,
      )} kg and start again at ${lo} reps.${easyNote}`,
      true,
    );
  }

  // --- Rule 3: inside the range → keep weight, add reps (double progression) -
  const bestSet = topSets.reduce((b, s) => (s.reps > b.reps ? s : b), topSets[0]!);
  const target = Math.min(hi, minReps + 1);
  return build(
    input,
    'add-reps',
    topWeight,
    input.repRange,
    'On track',
    `You're inside the ${rangeStr} range at ${topWeight.toFixed(
      1,
    )} kg. Keep the weight and beat ${bestSet.reps} reps — aim for ${target}+ on every set to unlock more load.`,
    true,
  );
}

/**
 * Build a recommendation directly from a completed ExerciseSession.
 * `priorStalls` should be supplied by the caller from session history.
 */
export function recommendFromExerciseSession(
  session: ExerciseSession,
  kind: ExerciseKind,
  priorStalls = 0,
): ProgressionRecommendation {
  const workingSets: WorkingSetResult[] = session.sets
    .filter((s) => s.completed && !s.isWarmup)
    .map((s) => ({
      weightKg: s.weightKg,
      reps: s.reps,
      difficulty: s.difficulty,
    }));

  const withOverride: WorkingSetResult[] =
    session.difficulty && workingSets.length > 0
      ? workingSets.map((s, i) =>
          i === workingSets.length - 1 ? { ...s, difficulty: session.difficulty } : s,
        )
      : workingSets;

  return recommendProgression({
    exerciseId: session.exerciseId,
    repRange: session.repRange,
    incrementKg: session.incrementKg,
    kind,
    workingSets: withOverride,
    priorStalls,
  });
}
