import type { SetEntry } from '@/types';

/**
 * Estimated 1-rep max using the Epley formula.
 * e1RM = w * (1 + reps/30). Returns the raw weight for a single rep.
 */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Total tonnage (weight × reps) across completed working sets. */
export function setVolume(weightKg: number, reps: number): number {
  return Math.max(0, weightKg) * Math.max(0, reps);
}

export function sessionVolume(sets: SetEntry[]): number {
  return sets
    .filter((s) => s.completed && !s.isWarmup)
    .reduce((total, s) => total + setVolume(s.weightKg, s.reps), 0);
}

/** Best estimated 1RM across a group of completed sets. */
export function bestE1RM(sets: { weightKg: number; reps: number }[]): number {
  return sets.reduce((best, s) => Math.max(best, epley1RM(s.weightKg, s.reps)), 0);
}

export function totalReps(sets: SetEntry[]): number {
  return sets.filter((s) => s.completed && !s.isWarmup).reduce((t, s) => t + s.reps, 0);
}
