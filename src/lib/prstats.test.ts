import { describe, expect, it } from 'vitest';
import { liveSetPr } from './prstats';
import { epley1RM, round1 } from './volume';
import type { ExerciseSession, PersonalRecord, SetEntry } from '@/types';

function set(o: Partial<SetEntry> & { id: string }): SetEntry {
  return {
    exerciseId: 'bench',
    setNumber: 1,
    type: 'working',
    weightKg: 60,
    reps: 8,
    completed: true,
    isWarmup: false,
    ...o,
  };
}

function ex(sets: SetEntry[]): ExerciseSession {
  return {
    id: 'es',
    exerciseId: 'bench',
    order: 0,
    repRange: [6, 10],
    restSec: 120,
    incrementKg: 2.5,
    status: 'active',
    sets,
  };
}

const weightPr = (value: number): PersonalRecord => ({
  id: `pr-w-${value}`,
  exerciseId: 'bench',
  type: 'weight',
  value,
  achievedAt: '2026-07-01T00:00:00.000Z',
});
const e1rmPr = (value: number): PersonalRecord => ({
  id: `pr-e-${value}`,
  exerciseId: 'bench',
  type: 'e1rm',
  value,
  achievedAt: '2026-07-01T00:00:00.000Z',
});

describe('liveSetPr', () => {
  it('flags a new all-time heaviest set', () => {
    const sets = [set({ id: 's1', weightKg: 105, reps: 3, completedAt: '2026-07-17T10:00:00.000Z' })];
    const pr = liveSetPr(ex(sets), [weightPr(100), e1rmPr(200)]);
    expect(pr?.weight).toBe(true);
  });

  it('does not flag a set below prior bests', () => {
    const sets = [set({ id: 's1', weightKg: 90, reps: 5, completedAt: '2026-07-17T10:00:00.000Z' })];
    // e1rm of 90x5 ≈ 105, well below the 200 e1rm PR and 100 weight PR.
    expect(liveSetPr(ex(sets), [weightPr(100), e1rmPr(200)])).toBeNull();
  });

  it('evaluates the latest-logged set, not the heaviest earlier one', () => {
    const sets = [
      set({ id: 's1', weightKg: 110, reps: 3, completedAt: '2026-07-17T10:00:00.000Z' }), // earlier, already a top
      set({ id: 's2', weightKg: 100, reps: 3, completedAt: '2026-07-17T10:05:00.000Z' }), // latest, below s1
    ];
    // Candidate is s2 (latest). It doesn't beat s1's 110, so no weight PR.
    const pr = liveSetPr(ex(sets), [weightPr(100)]);
    expect(pr?.weight ?? false).toBe(false);
  });

  it('flags an e1RM PR even when weight is not a record', () => {
    // 100 kg × 8 → e1RM ≈ 126.7, beating a 120 e1rm PR, but weight (100) ties the weight PR.
    const sets = [set({ id: 's1', weightKg: 100, reps: 8, completedAt: '2026-07-17T10:00:00.000Z' })];
    const pr = liveSetPr(ex(sets), [weightPr(100), e1rmPr(120)]);
    expect(pr?.weight).toBe(false);
    expect(pr?.e1rm).toBe(true);
    expect(round1(epley1RM(100, 8))).toBeGreaterThan(120);
  });

  it('ignores warm-ups and returns null with no completed working sets', () => {
    const sets = [set({ id: 'w', weightKg: 200, reps: 5, isWarmup: true, completedAt: '2026-07-17T10:00:00.000Z' })];
    expect(liveSetPr(ex(sets), [])).toBeNull();
  });
});
