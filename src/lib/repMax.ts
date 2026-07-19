import { round1 } from './volume';

// Inverse of the Epley 1RM model used across the app (see volume.ts):
//   e1RM = w * (1 + reps/30)  ⇒  w = e1RM / (1 + reps/30)
// so a rep-max table reads straight off a known/estimated 1RM.

/** Common rep targets to estimate working weights for. */
export const REP_MAX_TARGETS = [1, 3, 5, 8, 10, 12];

/** Predicted weight for `reps` reps given an estimated 1RM (inverse Epley). */
export function weightForReps(oneRepMax: number, reps: number): number {
  if (oneRepMax <= 0 || reps <= 0) return 0;
  if (reps === 1) return oneRepMax; // consistent with epley1RM's 1-rep case
  return oneRepMax / (1 + reps / 30);
}

export interface RepMaxRow {
  reps: number;
  weightKg: number;
}

/** A table of predicted working weights across common rep targets. */
export function repMaxTable(oneRepMax: number, targets: number[] = REP_MAX_TARGETS): RepMaxRow[] {
  return targets.map((reps) => ({ reps, weightKg: round1(weightForReps(oneRepMax, reps)) }));
}
