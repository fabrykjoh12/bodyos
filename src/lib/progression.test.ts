import { describe, expect, it } from 'vitest';
import {
  aggregateDifficulty,
  recommendProgression,
  rirToDifficulty,
  roundToIncrement,
  type ProgressionInput,
} from './progression';

const base: Omit<ProgressionInput, 'workingSets'> = {
  exerciseId: 'bench',
  repRange: [8, 12],
  incrementKg: 2.5,
  kind: 'compound',
};

describe('rirToDifficulty', () => {
  it('maps low reps-in-reserve to hard (near failure)', () => {
    expect(rirToDifficulty(0)).toBe('hard');
    expect(rirToDifficulty(1)).toBe('hard');
  });
  it('maps mid reps-in-reserve to good (on target)', () => {
    expect(rirToDifficulty(2)).toBe('good');
    expect(rirToDifficulty(3)).toBe('good');
  });
  it('maps high reps-in-reserve to easy (room to add load)', () => {
    expect(rirToDifficulty(4)).toBe('easy');
    expect(rirToDifficulty(6)).toBe('easy');
  });
});

describe('roundToIncrement', () => {
  it('snaps to the nearest increment', () => {
    expect(roundToIncrement(61.2, 2.5)).toBe(60);
    expect(roundToIncrement(61.3, 2.5)).toBe(62.5);
    expect(roundToIncrement(24, 1)).toBe(24);
  });
});

describe('aggregateDifficulty', () => {
  it('is worst-biased and only easy when all easy', () => {
    expect(
      aggregateDifficulty([
        { weightKg: 1, reps: 1, difficulty: 'easy' },
        { weightKg: 1, reps: 1, difficulty: 'hard' },
      ]),
    ).toBe('hard');
    expect(
      aggregateDifficulty([
        { weightKg: 1, reps: 1, difficulty: 'easy' },
        { weightKg: 1, reps: 1, difficulty: 'easy' },
      ]),
    ).toBe('easy');
    expect(
      aggregateDifficulty([
        { weightKg: 1, reps: 1, difficulty: 'good' },
        { weightKg: 1, reps: 1, difficulty: 'easy' },
      ]),
    ).toBe('good');
    expect(aggregateDifficulty([{ weightKg: 1, reps: 1 }])).toBeUndefined();
  });
});

describe('recommendProgression — double progression', () => {
  it('increases weight when all sets hit the top of the range', () => {
    const rec = recommendProgression({
      ...base,
      workingSets: [
        { weightKg: 24, reps: 12 },
        { weightKg: 24, reps: 12 },
        { weightKg: 24, reps: 12 },
      ],
    });
    expect(rec.action).toBe('increase-weight');
    expect(rec.nextWeightKg).toBe(26.5); // 24 + 2.5
    expect(rec.targetMet).toBe(true);
    expect(rec.nextRepRange).toEqual([8, 12]);
  });

  it('gives a double jump for an easy compound top-out', () => {
    const rec = recommendProgression({
      ...base,
      workingSets: [
        { weightKg: 24, reps: 12, difficulty: 'easy' },
        { weightKg: 24, reps: 12, difficulty: 'easy' },
        { weightKg: 24, reps: 12, difficulty: 'easy' },
      ],
    });
    expect(rec.action).toBe('increase-weight');
    expect(rec.nextWeightKg).toBe(29); // 24 + 5
  });

  it('holds weight and adds reps when inside the range', () => {
    const rec = recommendProgression({
      ...base,
      workingSets: [
        { weightKg: 24, reps: 10 },
        { weightKg: 24, reps: 9 },
        { weightKg: 24, reps: 8 },
      ],
    });
    expect(rec.action).toBe('add-reps');
    expect(rec.nextWeightKg).toBe(24);
    expect(rec.targetMet).toBe(true);
  });

  it('maintains weight when the bottom of the range is missed', () => {
    const rec = recommendProgression({
      ...base,
      workingSets: [
        { weightKg: 60, reps: 7 },
        { weightKg: 60, reps: 6 },
        { weightKg: 60, reps: 5 },
      ],
    });
    expect(rec.action).toBe('maintain');
    expect(rec.nextWeightKg).toBe(60);
    expect(rec.targetMet).toBe(false);
  });

  it('reduces load on a second consecutive miss', () => {
    const rec = recommendProgression({
      ...base,
      priorStalls: 1,
      workingSets: [
        { weightKg: 60, reps: 6 },
        { weightKg: 60, reps: 5 },
      ],
    });
    expect(rec.action).toBe('reduce-load');
    expect(rec.nextWeightKg).toBeLessThan(60);
  });

  it('deloads after a prolonged stall', () => {
    const rec = recommendProgression({
      ...base,
      priorStalls: 2,
      workingSets: [
        { weightKg: 60, reps: 6, difficulty: 'failed' },
        { weightKg: 60, reps: 5 },
      ],
    });
    expect(rec.action).toBe('deload');
    expect(rec.nextWeightKg).toBe(55); // 60 − 2×2.5 (~10% in whole increments)
  });

  it('treats a failed difficulty as a miss even if reps are in range', () => {
    const rec = recommendProgression({
      ...base,
      workingSets: [
        { weightKg: 60, reps: 9, difficulty: 'failed' },
        { weightKg: 60, reps: 9 },
      ],
    });
    expect(rec.targetMet).toBe(false);
    expect(['maintain', 'reduce-load', 'deload']).toContain(rec.action);
  });

  it('uses the heaviest weight as the working reference across mixed sets', () => {
    const rec = recommendProgression({
      ...base,
      workingSets: [
        { weightKg: 20, reps: 12 }, // back-off / lighter set ignored for progression
        { weightKg: 24, reps: 12 },
        { weightKg: 24, reps: 12 },
      ],
    });
    expect(rec.action).toBe('increase-weight');
    expect(rec.nextWeightKg).toBe(26.5);
  });

  it('handles an empty set list without throwing', () => {
    const rec = recommendProgression({ ...base, workingSets: [] });
    expect(rec.action).toBe('maintain');
    expect(rec.targetMet).toBe(false);
  });
});
