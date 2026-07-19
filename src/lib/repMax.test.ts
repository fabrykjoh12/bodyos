import { describe, expect, it } from 'vitest';
import { weightForReps, repMaxTable, REP_MAX_TARGETS } from './repMax';
import { epley1RM } from './volume';

describe('weightForReps', () => {
  it('returns the 1RM itself for a single rep', () => {
    expect(weightForReps(100, 1)).toBe(100);
  });

  it('inverts the Epley model (weightForReps ∘ epley1RM ≈ identity)', () => {
    // A set of 80kg × 8 → e1RM, back to 8 reps should recover ~80.
    const e1rm = epley1RM(80, 8);
    expect(weightForReps(e1rm, 8)).toBeCloseTo(80, 6);
  });

  it('predicts lighter weights as reps increase', () => {
    const w3 = weightForReps(100, 3);
    const w10 = weightForReps(100, 10);
    expect(w3).toBeGreaterThan(w10);
    expect(w10).toBeCloseTo(75, 5); // 100 / (1 + 10/30)
  });

  it('returns 0 for non-positive inputs', () => {
    expect(weightForReps(0, 5)).toBe(0);
    expect(weightForReps(100, 0)).toBe(0);
    expect(weightForReps(-100, 5)).toBe(0);
  });
});

describe('repMaxTable', () => {
  it('produces a rounded row for every default target, strictly descending', () => {
    const rows = repMaxTable(120);
    expect(rows.map((r) => r.reps)).toEqual(REP_MAX_TARGETS);
    expect(rows[0]!.weightKg).toBe(120); // 1-rep row == the 1RM
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.weightKg).toBeLessThan(rows[i - 1]!.weightKg);
      expect(rows[i]!.weightKg).toBe(Math.round(rows[i]!.weightKg * 10) / 10); // round1
    }
  });
});
