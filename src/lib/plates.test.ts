import { describe, expect, it } from 'vitest';
import { computePlates, generateWarmups, BAR_KG } from './plates';

describe('computePlates', () => {
  it('breaks a clean kg load into the largest plates per side', () => {
    // 100 kg = 20 bar + 80, so 40 per side = 25 + 15
    const r = computePlates(100, 'kg');
    expect(r.bar).toBe(20);
    expect(r.perSide).toEqual([25, 15]);
    expect(r.achievable).toBe(100);
    expect(r.exact).toBe(true);
    expect(r.leftover).toBe(0);
  });

  it('breaks 60 kg into a single 20 per side', () => {
    const r = computePlates(60, 'kg');
    expect(r.perSide).toEqual([20]);
    expect(r.exact).toBe(true);
  });

  it('handles a load equal to the bar (no plates)', () => {
    const r = computePlates(20, 'kg');
    expect(r.perSide).toEqual([]);
    expect(r.exact).toBe(true);
    expect(r.achievable).toBe(20);
  });

  it('treats a load below the bar as bar-only with leftover', () => {
    const r = computePlates(15, 'kg');
    expect(r.perSide).toEqual([]);
    expect(r.achievable).toBe(20);
  });

  it('reports an unloadable remainder as leftover', () => {
    // 101 kg: 40.5 per side → 25+15 = 40, 0.5 short per side → 1 kg leftover total
    const r = computePlates(101, 'kg');
    expect(r.perSide).toEqual([25, 15]);
    expect(r.achievable).toBe(100);
    expect(r.leftover).toBe(1);
    expect(r.exact).toBe(false);
  });

  it('uses lb plates and a 45 lb bar in pounds', () => {
    // 135 lb = 45 bar + 90 → 45 per side (one 45)
    const r = computePlates(135, 'lb');
    expect(r.bar).toBe(45);
    expect(r.perSide).toEqual([45]);
    expect(r.exact).toBe(true);
  });

  it('respects custom bar + plate sets', () => {
    const r = computePlates(50, 'kg', { bar: 10, plates: [10, 5] });
    // 40 to split → 20 per side → 10 + 10
    expect(r.perSide).toEqual([10, 10]);
    expect(r.achievable).toBe(50);
  });
});

describe('generateWarmups', () => {
  it('ramps from the empty bar toward a heavy working weight', () => {
    const sets = generateWarmups(100, { barKg: BAR_KG });
    expect(sets.length).toBeGreaterThanOrEqual(3);
    // First rung is the empty bar.
    expect(sets[0]!.weightKg).toBe(20);
    expect(sets[0]!.fraction).toBe(0);
    // Monotonically increasing and always below the working weight.
    for (let i = 1; i < sets.length; i++) {
      expect(sets[i]!.weightKg).toBeGreaterThan(sets[i - 1]!.weightKg);
      expect(sets[i]!.weightKg).toBeLessThan(100);
    }
  });

  it('rounds warm-up weights to loadable 2.5 kg increments', () => {
    const sets = generateWarmups(100);
    for (const s of sets) expect(s.weightKg % 2.5).toBe(0);
  });

  it('returns nothing when the working weight is at or near the bar', () => {
    expect(generateWarmups(20)).toEqual([]);
    expect(generateWarmups(22)).toEqual([]);
  });

  it('de-duplicates rungs that round to the same weight', () => {
    const sets = generateWarmups(40);
    const weights = sets.map((s) => s.weightKg);
    expect(new Set(weights).size).toBe(weights.length);
  });
});
