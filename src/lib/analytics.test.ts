import { describe, expect, it } from 'vitest';
import {
  e1rmSeries,
  strengthTrends,
  weeklyVolume,
  last7DaysVolume,
  muscleBalance,
} from './analytics';
import { epley1RM, round1 } from './volume';
import type { WorkoutSession } from '@/types';

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

type ExSpec = { exId: string; sets: [number, number][] }; // [weightKg, reps]

function sess(startDaysAgo: number, exercises: ExSpec[]): WorkoutSession {
  return {
    id: `s-${startDaysAgo}-${exercises.map((e) => e.exId).join(',')}`,
    templateId: 't',
    name: 'W',
    focus: 'f',
    status: 'completed',
    startedAt: isoDaysAgo(startDaysAgo),
    exercises: exercises.map((e, i) => ({
      id: `e-${i}`,
      exerciseId: e.exId,
      order: i,
      repRange: [8, 12] as [number, number],
      restSec: 90,
      incrementKg: 2.5,
      status: 'done' as const,
      sets: e.sets.map(([weightKg, reps], j) => ({
        id: `set-${i}-${j}`,
        exerciseId: e.exId,
        setNumber: j + 1,
        type: 'working' as const,
        weightKg,
        reps,
        completed: true,
        isWarmup: false,
      })),
    })),
    currentExerciseIndex: 0,
  };
}

describe('e1rmSeries', () => {
  it('orders points oldest → newest regardless of input order', () => {
    const sessions = [
      sess(1, [{ exId: 'bicep-curl', sets: [[30, 8]] }]), // newer
      sess(6, [{ exId: 'bicep-curl', sets: [[25, 8]] }]), // older
    ];
    const series = e1rmSeries('bicep-curl', sessions);
    expect(series).toHaveLength(2);
    expect(series[0]!.value).toBe(round1(epley1RM(25, 8)));
    expect(series[1]!.value).toBe(round1(epley1RM(30, 8)));
    expect(new Date(series[0]!.date).getTime()).toBeLessThan(new Date(series[1]!.date).getTime());
  });

  it('skips sessions without the exercise or without completed working sets', () => {
    const sessions = [
      sess(2, [{ exId: 'triceps-pushdown', sets: [[40, 10]] }]), // different exercise
      sess(1, [{ exId: 'bicep-curl', sets: [[30, 8]] }]),
    ];
    expect(e1rmSeries('bicep-curl', sessions)).toHaveLength(1);
  });
});

describe('strengthTrends', () => {
  it('needs ≥2 points and reports the gain, sorted by delta desc', () => {
    const sessions = [
      sess(10, [{ exId: 'bicep-curl', sets: [[20, 10]] }, { exId: 'triceps-pushdown', sets: [[30, 10]] }]),
      sess(1, [{ exId: 'bicep-curl', sets: [[30, 10]] }, { exId: 'triceps-pushdown', sets: [[31, 10]] }]),
    ];
    const trends = strengthTrends(sessions);
    // bicep-curl gained ~10kg×(4/3) e1RM, triceps only ~1kg → bicep first.
    expect(trends[0]!.exerciseId).toBe('bicep-curl');
    expect(trends[0]!.deltaKg).toBeGreaterThan(trends[1]!.deltaKg);
    expect(trends[0]!.points).toBe(2);
  });

  it('excludes exercises with fewer than two data points', () => {
    const sessions = [sess(1, [{ exId: 'bicep-curl', sets: [[30, 8]] }])];
    expect(strengthTrends(sessions)).toHaveLength(0);
  });
});

describe('weeklyVolume', () => {
  it('buckets tonnage by week and labels the current week', () => {
    const sessions = [
      sess(1, [{ exId: 'bicep-curl', sets: [[10, 10]] }]), // this week → 100
      sess(9, [{ exId: 'bicep-curl', sets: [[20, 10]] }]), // ~1 week ago → 200
    ];
    const out = weeklyVolume(sessions, 6);
    expect(out).toHaveLength(6);
    expect(out[out.length - 1]).toEqual({ label: 'This wk', volume: 100 });
    expect(out[out.length - 2]!.volume).toBe(200);
  });
});

describe('last7DaysVolume', () => {
  it('returns 7 days and excludes anything older than 6 days', () => {
    const sessions = [
      sess(0, [{ exId: 'bicep-curl', sets: [[10, 10]] }]), // today → 100
      sess(8, [{ exId: 'bicep-curl', sets: [[50, 10]] }]), // excluded
    ];
    const out = last7DaysVolume(sessions);
    expect(out).toHaveLength(7);
    expect(out[6]!.volume).toBe(100); // today is the last bucket
    expect(out.reduce((t, d) => t + d.volume, 0)).toBe(100); // the 8-day-old one dropped
  });
});

describe('muscleBalance', () => {
  it('ranks muscles by set count with a percentage of the top', () => {
    const sessions = [
      sess(1, [
        { exId: 'bicep-curl', sets: [[20, 10], [20, 10], [20, 10], [20, 10]] }, // biceps ×4
        { exId: 'triceps-pushdown', sets: [[30, 10], [30, 10]] }, // triceps ×2
      ]),
    ];
    const bal = muscleBalance(sessions, 7);
    expect(bal[0]).toMatchObject({ muscle: 'biceps', sets: 4, pct: 100 });
    expect(bal[1]).toMatchObject({ muscle: 'triceps', sets: 2, pct: 50 });
  });
});
