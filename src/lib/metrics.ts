import type { ExerciseMetric, Unit } from '@/types';
import { getExercise } from '@/data/exercises';
import { formatWeightValue } from './format';

// Metric-aware helpers so planks, pull-ups and carries are never displayed
// (or judged) as "0 kg × N reps".

export function metricOf(exerciseId: string): ExerciseMetric {
  return getExercise(exerciseId)?.metric ?? 'load-reps';
}

/** The unit shown next to the "reps" number. */
export function repsUnit(metric: ExerciseMetric): string {
  return metric === 'duration' ? 's' : 'reps';
}

/** Stepper label for the reps field. */
export function repsLabel(metric: ExerciseMetric): string {
  return metric === 'duration' ? 'Seconds' : 'Reps';
}

/** Sensible reps-field step. Duration moves in 5-second notches. */
export function repsStep(metric: ExerciseMetric): number {
  return metric === 'duration' ? 5 : 1;
}

/** Weight stepper label, or null when load isn't tracked at all. */
export function weightLabel(metric: ExerciseMetric): string | null {
  if (metric === 'duration') return null;
  return metric === 'bodyweight-reps' ? 'Added weight' : 'Weight';
}

/** One set, described honestly: "60 kg × 8", "BW × 12", "+10 kg × 8", "45 s". */
export function describeSet(
  metric: ExerciseMetric,
  weightKg: number,
  reps: number,
  unit: Unit,
): string {
  if (metric === 'duration') return `${reps} s`;
  if (metric === 'bodyweight-reps') {
    return weightKg > 0 ? `BW +${formatWeightValue(weightKg, unit)} ${unit} × ${reps}` : `BW × ${reps}`;
  }
  return `${formatWeightValue(weightKg, unit)} ${unit} × ${reps}`;
}
