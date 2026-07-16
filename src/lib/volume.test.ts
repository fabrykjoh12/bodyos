import { describe, expect, it } from 'vitest';
import { bestE1RM, epley1RM, sessionVolume, setVolume } from './volume';
import type { SetEntry } from '@/types';
import { kgToLb, lbToKg, formatWeight, formatRepRange } from './format';

describe('epley1RM', () => {
  it('returns the weight itself for a single rep', () => {
    expect(epley1RM(100, 1)).toBe(100);
  });
  it('increases with reps', () => {
    expect(epley1RM(100, 10)).toBeCloseTo(133.33, 1);
  });
  it('is zero for invalid input', () => {
    expect(epley1RM(0, 5)).toBe(0);
    expect(epley1RM(100, 0)).toBe(0);
  });
});

describe('volume', () => {
  it('multiplies weight by reps', () => {
    expect(setVolume(60, 8)).toBe(480);
  });
  it('ignores warmups and incomplete sets', () => {
    const sets: SetEntry[] = [
      { id: '1', exerciseId: 'e', setNumber: 1, type: 'warmup', weightKg: 40, reps: 10, completed: true, isWarmup: true },
      { id: '2', exerciseId: 'e', setNumber: 2, type: 'working', weightKg: 60, reps: 8, completed: true, isWarmup: false },
      { id: '3', exerciseId: 'e', setNumber: 3, type: 'working', weightKg: 60, reps: 8, completed: false, isWarmup: false },
    ];
    expect(sessionVolume(sets)).toBe(480);
  });
});

describe('bestE1RM', () => {
  it('picks the strongest estimated 1RM', () => {
    const best = bestE1RM([
      { weightKg: 60, reps: 10 },
      { weightKg: 70, reps: 5 },
    ]);
    expect(best).toBeCloseTo(81.67, 1);
  });
});

describe('unit conversion round-trips', () => {
  it('kg <-> lb is stable', () => {
    expect(lbToKg(kgToLb(60))).toBeCloseTo(60, 6);
  });
  it('formats kg and lb with the unit', () => {
    expect(formatWeight(60, 'kg')).toBe('60 kg');
    expect(formatWeight(60, 'lb')).toMatch(/lb$/);
  });
});

describe('formatRepRange', () => {
  it('collapses equal bounds', () => {
    expect(formatRepRange([8, 8])).toBe('8');
    expect(formatRepRange([8, 12])).toBe('8–12');
  });
});
