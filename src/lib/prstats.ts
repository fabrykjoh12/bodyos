import type { PersonalRecord, WorkoutSession } from '@/types';
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
