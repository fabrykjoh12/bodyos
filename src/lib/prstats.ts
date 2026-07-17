import type { ExerciseSession, PersonalRecord, WorkoutSession } from '@/types';
import { uid } from './id';
import { epley1RM, round1, setVolume } from './volume';

/**
 * Detect new personal records set during a session, compared against the
 * best prior records. Returns only genuinely new PRs (weight and e1RM).
 */
export function detectPersonalRecords(
  session: WorkoutSession,
  existing: PersonalRecord[],
): PersonalRecord[] {
  const bestWeight = new Map<string, number>();
  const bestE1RM = new Map<string, number>();
  for (const pr of existing) {
    if (pr.type === 'weight') {
      bestWeight.set(pr.exerciseId, Math.max(bestWeight.get(pr.exerciseId) ?? 0, pr.value));
    }
    if (pr.type === 'e1rm') {
      bestE1RM.set(pr.exerciseId, Math.max(bestE1RM.get(pr.exerciseId) ?? 0, pr.value));
    }
  }

  const found: PersonalRecord[] = [];
  const at = session.completedAt ?? session.startedAt;

  for (const ex of session.exercises) {
    const working = ex.sets.filter((s) => s.completed && !s.isWarmup && s.reps > 0);
    if (working.length === 0) continue;

    const topWeight = Math.max(...working.map((s) => s.weightKg));
    const priorWeight = bestWeight.get(ex.exerciseId) ?? 0;
    if (topWeight > priorWeight) {
      const heaviest = working.find((s) => s.weightKg === topWeight)!;
      found.push({
        id: uid('pr'),
        exerciseId: ex.exerciseId,
        type: 'weight',
        value: topWeight,
        reps: heaviest.reps,
        weightKg: topWeight,
        achievedAt: at,
        sessionId: session.id,
      });
      bestWeight.set(ex.exerciseId, topWeight);
    }

    const topE1RM = round1(
      working.reduce((best, s) => Math.max(best, epley1RM(s.weightKg, s.reps)), 0),
    );
    const priorE1RM = bestE1RM.get(ex.exerciseId) ?? 0;
    if (topE1RM > priorE1RM + 0.4) {
      found.push({
        id: uid('pr'),
        exerciseId: ex.exerciseId,
        type: 'e1rm',
        value: topE1RM,
        achievedAt: at,
        sessionId: session.id,
      });
      bestE1RM.set(ex.exerciseId, topE1RM);
    }
  }

  return found;
}

export interface LiveSetPr {
  setId: string;
  weightKg: number;
  reps: number;
  /** Beats the all-time heaviest completed set for this exercise. */
  weight: boolean;
  /** Beats the all-time best estimated 1RM for this exercise. */
  e1rm: boolean;
}

/**
 * For the most-recently-completed working set in `ex`, report whether it just
 * set a new all-time weight and/or e1RM PR — comparing against prior records
 * *and* the exercise's other completed working sets this session, so only a
 * genuinely new top celebrates (and not every set once you're above baseline).
 *
 * Ephemeral: used for the in-session celebration only. `detectPersonalRecords`
 * at completion stays the single source of recorded PR truth. Callers should
 * skip deloads.
 */
export function liveSetPr(ex: ExerciseSession, existing: PersonalRecord[]): LiveSetPr | null {
  const working = ex.sets.filter((s) => s.completed && !s.isWarmup && s.reps > 0);
  if (working.length === 0) return null;

  // The set logged last (latest completedAt) is the candidate.
  const candidate = working.reduce((a, b) => ((b.completedAt ?? '') >= (a.completedAt ?? '') ? b : a));
  const others = working.filter((s) => s.id !== candidate.id);

  let bestWeight = 0;
  let bestE1RM = 0;
  for (const pr of existing) {
    if (pr.exerciseId !== ex.exerciseId) continue;
    if (pr.type === 'weight') bestWeight = Math.max(bestWeight, pr.value);
    if (pr.type === 'e1rm') bestE1RM = Math.max(bestE1RM, pr.value);
  }
  for (const s of others) {
    bestWeight = Math.max(bestWeight, s.weightKg);
    bestE1RM = Math.max(bestE1RM, epley1RM(s.weightKg, s.reps));
  }

  const weight = candidate.weightKg > bestWeight;
  const e1rm = round1(epley1RM(candidate.weightKg, candidate.reps)) > round1(bestE1RM) + 0.4;
  if (!weight && !e1rm) return null;
  return { setId: candidate.id, weightKg: candidate.weightKg, reps: candidate.reps, weight, e1rm };
}

export function sessionTotalVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, ex) =>
      total +
      ex.sets
        .filter((s) => s.completed && !s.isWarmup)
        .reduce((v, s) => v + setVolume(s.weightKg, s.reps), 0),
    0,
  );
}

export function sessionSetCount(session: WorkoutSession): number {
  return session.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed && !s.isWarmup).length,
    0,
  );
}
