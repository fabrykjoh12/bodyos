import { describe, expect, it } from 'vitest';
import type { PersonalRecord, WorkoutSession } from '@/types';
import { buildShareModel } from './shareCard';

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 's1',
    templateId: 't1',
    name: 'Push',
    focus: 'Chest · Shoulders · Triceps',
    status: 'completed',
    startedAt: '2026-07-19T10:00:00.000Z',
    completedAt: '2026-07-19T10:52:00.000Z',
    currentExerciseIndex: 0,
    exercises: [
      {
        id: 'e1',
        exerciseId: 'bench-press',
        repRange: [6, 10],
        incrementKg: 2.5,
        restSec: 150,
        sets: [
          { id: 'a', setNumber: 0, weightKg: 40, reps: 8, completed: true, isWarmup: true },
          { id: 'b', setNumber: 1, weightKg: 80, reps: 8, completed: true },
          { id: 'c', setNumber: 2, weightKg: 80, reps: 7, completed: true },
          { id: 'd', setNumber: 3, weightKg: 80, reps: 6, completed: false },
        ],
      },
    ],
    ...overrides,
  } as WorkoutSession;
}

const pr: PersonalRecord = {
  id: 'pr1',
  exerciseId: 'bench-press',
  type: 'weight',
  value: 80,
  reps: 8,
  achievedAt: '2026-07-19T10:20:00.000Z',
  sessionId: 's1',
};

describe('buildShareModel', () => {
  it('summarises the session for the card', () => {
    const m = buildShareModel(makeSession(), [pr], 'kg');
    expect(m.title).toBe('Push');
    expect(m.isDeload).toBe(false);
    // Working sets only: 80×8 + 80×7 (warm-up and incomplete sets excluded
    // from the set count; volume follows sessionTotalVolume's rules).
    expect(m.sets).toBe(2);
    expect(m.durationText).toBe('52 min');
    expect(m.exercises).toBe(1);
    expect(m.prLines).toEqual(['Barbell Bench Press · 80 kg × 8']);
  });

  it('formats an e1rm PR line and flags deloads', () => {
    const m = buildShareModel(
      makeSession({ isDeload: true }),
      [{ ...pr, type: 'e1rm', value: 100 }],
      'kg',
    );
    expect(m.isDeload).toBe(true);
    expect(m.prLines[0]).toMatch(/est\. 1RM/);
    expect(m.prLines[0]).toContain('100 kg');
  });

  it('never reports a zero-minute duration', () => {
    const m = buildShareModel(makeSession({ completedAt: '2026-07-19T10:00:10.000Z' }), [], 'kg');
    expect(m.durationText).toBe('1 min');
  });
});
