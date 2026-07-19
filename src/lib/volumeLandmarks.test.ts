import { describe, expect, it } from 'vitest';
import { classifyWeeklyVolume, MUSCLE_LANDMARKS } from './volumeLandmarks';
import { weeklyMuscleSets } from './analytics';
import type { MuscleGroup, WorkoutSession } from '@/types';

describe('classifyWeeklyVolume', () => {
  const m: MuscleGroup = 'chest'; // { mev: 10, mav: 20, mrv: 22 }

  it('flags volume below MEV as low', () => {
    expect(classifyWeeklyVolume(6, m).status).toBe('low');
  });
  it('treats MEV..MAV inclusive as the optimal growth range', () => {
    expect(classifyWeeklyVolume(10, m).status).toBe('optimal'); // == mev
    expect(classifyWeeklyVolume(15, m).status).toBe('optimal');
    expect(classifyWeeklyVolume(20, m).status).toBe('optimal'); // == mav
  });
  it('flags MAV..MRV as high', () => {
    expect(classifyWeeklyVolume(21, m).status).toBe('high');
    expect(classifyWeeklyVolume(22, m).status).toBe('high'); // == mrv
  });
  it('flags above MRV as over', () => {
    expect(classifyWeeklyVolume(24, m).status).toBe('over');
  });
  it('returns the muscle landmark alongside the status', () => {
    expect(classifyWeeklyVolume(12, m).landmark).toEqual(MUSCLE_LANDMARKS.chest);
  });
  it('defines landmarks for every muscle group with mev <= mav <= mrv', () => {
    for (const [muscle, l] of Object.entries(MUSCLE_LANDMARKS)) {
      expect(l.mev, muscle).toBeLessThanOrEqual(l.mav);
      expect(l.mav, muscle).toBeLessThanOrEqual(l.mrv);
    }
  });
});

// --- weeklyMuscleSets -------------------------------------------------------

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function session(startDaysAgo: number, exId: string, workingSets: number): WorkoutSession {
  return {
    id: `s-${startDaysAgo}-${exId}`,
    templateId: 't',
    name: 'W',
    focus: 'f',
    status: 'completed',
    startedAt: isoDaysAgo(startDaysAgo),
    exercises: [
      {
        id: 'e',
        exerciseId: exId,
        order: 0,
        repRange: [8, 12],
        restSec: 90,
        incrementKg: 2.5,
        status: 'done',
        sets: Array.from({ length: workingSets }, (_, i) => ({
          id: `set-${i}`,
          exerciseId: exId,
          setNumber: i + 1,
          type: 'working' as const,
          weightKg: 60,
          reps: 10,
          completed: true,
          isWarmup: false,
        })),
      },
    ],
    currentExerciseIndex: 0,
  };
}

describe('weeklyMuscleSets', () => {
  it('sums completed working sets by primary muscle within the window', () => {
    // bicep-curl → biceps; two recent sessions of 3 + 2 sets.
    const sessions = [session(1, 'bicep-curl', 3), session(4, 'bicep-curl', 2)];
    expect(weeklyMuscleSets(sessions, 7).biceps).toBe(5);
  });

  it('excludes sessions older than the window', () => {
    const sessions = [session(2, 'bicep-curl', 3), session(30, 'bicep-curl', 4)];
    expect(weeklyMuscleSets(sessions, 7).biceps).toBe(3);
  });
});
