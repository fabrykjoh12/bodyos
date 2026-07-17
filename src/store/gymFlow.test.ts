import { beforeEach, describe, expect, it } from 'vitest';
import type { WorkoutTemplate } from '@/types';
import { useStore } from './useStore';
import { now } from '@/lib/date';

const S = () => useStore.getState();

/** A deterministic 2-exercise superset, 2 working sets each. */
function supersetTemplate(): WorkoutTemplate {
  const set = () => ({ type: 'working' as const, targetReps: 12 });
  return {
    id: 'test-superset',
    name: 'SS Test',
    focus: 'test',
    split: 'custom',
    estimatedMinutes: 20,
    createdAt: now(),
    updatedAt: now(),
    exercises: [
      { id: 'we1', exerciseId: 'bicep-curl', order: 0, repRange: [10, 15], restSec: 60, supersetGroup: 'g', sets: [set(), set()] },
      { id: 'we2', exerciseId: 'triceps-pushdown', order: 1, repRange: [10, 15], restSec: 60, supersetGroup: 'g', sets: [set(), set()] },
    ],
  };
}

describe('gym flow — supersets', () => {
  beforeEach(() => {
    S().resetAll();
    S().saveTemplate(supersetTemplate());
    S().startSession('test-superset');
  });

  it('alternates to the partner within a round without resting', () => {
    expect(S().activeSession!.currentExerciseIndex).toBe(0);
    S().logActiveSet();
    const a = S().activeSession!;
    expect(a.exercises[0]!.sets[0]!.completed).toBe(true);
    expect(a.currentExerciseIndex).toBe(1); // moved to partner
    expect(S().restTimer.endsAt).toBeNull(); // no rest mid-round
  });

  it('rests after completing a round (wrapping back to the first member)', () => {
    S().logActiveSet(); // ex0 set0 -> ex1
    S().logActiveSet(); // ex1 set0 -> back to ex0 (new round)
    const a = S().activeSession!;
    expect(a.exercises[1]!.sets[0]!.completed).toBe(true);
    expect(a.currentExerciseIndex).toBe(0);
    expect(S().restTimer.endsAt).not.toBeNull(); // rest after the round
  });

  it('completes every set of both members through the alternating flow', () => {
    S().logActiveSet(); // ex0 s0
    S().logActiveSet(); // ex1 s0
    S().logActiveSet(); // ex0 s1
    S().logActiveSet(); // ex1 s1
    const a = S().activeSession!;
    expect(a.exercises.every((ex) => ex.sets.every((s) => s.completed))).toBe(true);
  });

  it('undo returns to the exercise whose set was logged', () => {
    S().logActiveSet(); // ex0 s0 -> now on ex1
    expect(S().activeSession!.currentExerciseIndex).toBe(1);
    S().undoLastSet();
    const a = S().activeSession!;
    expect(a.currentExerciseIndex).toBe(0); // back to the undone exercise
    expect(a.exercises[0]!.sets[0]!.completed).toBe(false);
  });
});

describe('gym flow — warm-ups, swap, RIR', () => {
  beforeEach(() => {
    S().resetAll();
    // templates[0] is the seeded Push day; exercise 0 is a barbell bench press.
    S().startSession(S().templates[0]!.id);
  });

  it('prepends generated warm-up sets before the working sets', () => {
    const before = S().activeSession!.exercises[0]!.sets.length;
    S().addWarmupSets(0);
    const sets = S().activeSession!.exercises[0]!.sets;
    expect(sets.length).toBeGreaterThan(before);
    expect(sets[0]!.isWarmup).toBe(true);
    expect(sets.some((s) => !s.isWarmup)).toBe(true); // working sets still there
  });

  it('swaps an unstarted exercise but refuses once a set is logged', () => {
    S().swapExercise(0, 'db-bench-press');
    expect(S().activeSession!.exercises[0]!.exerciseId).toBe('db-bench-press');
    // Log a set, then a further swap should be a no-op.
    S().logActiveSet();
    S().swapExercise(0, 'machine-chest-press');
    expect(S().activeSession!.exercises[0]!.exerciseId).toBe('db-bench-press');
  });

  it('records reps-in-reserve and derives a per-set difficulty', () => {
    S().setRir(1);
    const set0 = S().activeSession!.exercises[0]!.sets[0]!;
    expect(set0.rir).toBe(1);
    expect(set0.difficulty).toBe('hard'); // 0-1 RIR => hard
    S().setRir(undefined);
    expect(S().activeSession!.exercises[0]!.sets[0]!.rir).toBeUndefined();
  });
});

describe('deload sessions', () => {
  beforeEach(() => S().resetAll());

  it('starts lighter, with fewer sets, and is flagged', () => {
    const tplId = S().templates[0]!.id;
    S().startSession(tplId, false);
    const normal = S().activeSession!.exercises[0]!;
    const normalWeight = normal.sets.find((s) => !s.isWarmup)!.weightKg;
    const normalSets = normal.sets.filter((s) => !s.isWarmup).length;
    S().abandonSession();

    S().startSession(tplId, true);
    const active = S().activeSession!;
    expect(active.isDeload).toBe(true);
    const dl = active.exercises[0]!;
    const dlWeight = dl.sets.find((s) => !s.isWarmup)!.weightKg;
    const dlSets = dl.sets.filter((s) => !s.isWarmup).length;
    expect(dlWeight).toBeLessThan(normalWeight);
    expect(dlSets).toBeLessThanOrEqual(2);
    expect(dlSets).toBeLessThanOrEqual(normalSets);
  });

  it('does not record personal records for a deload', () => {
    const before = S().personalRecords.length;
    S().startSession(S().templates[0]!.id, true);
    let guard = 0;
    while (S().activeSession && guard < 80) {
      const a = S().activeSession!;
      const ex = a.exercises[a.currentExerciseIndex]!;
      if (ex.sets.some((s) => !s.completed)) S().logActiveSet();
      else if (a.currentExerciseIndex < a.exercises.length - 1) S().nextExercise();
      else break;
      guard += 1;
    }
    S().completeSession();
    expect(S().personalRecords.length).toBe(before);
  });
});

describe('exercise notes', () => {
  beforeEach(() => S().resetAll());

  it('sets and clears a durable per-exercise note', () => {
    S().setExerciseNote('deadlift', '  mixed grip over 180  ');
    expect(S().exerciseNotes.deadlift).toBe('mixed grip over 180'); // trimmed
    S().setExerciseNote('deadlift', '   ');
    expect(S().exerciseNotes.deadlift).toBeUndefined(); // blank clears
  });
});
