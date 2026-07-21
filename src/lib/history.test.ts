import { describe, expect, it } from 'vitest';
import { prefillFor } from './history';

describe('prefillFor — first-session honesty', () => {
  it('never invents a load when there is no history and no template weight', () => {
    const r = prefillFor('bench-press', [6, 10], 2.5, undefined, []);
    expect(r.weightKg).toBe(0); // explicit "set your starting weight" state
    expect(r.previous).toBeUndefined();
    expect(r.targetReps).toBe(10);
  });

  it('honours an explicit template starting weight', () => {
    const r = prefillFor('bench-press', [6, 10], 2.5, 40, []);
    expect(r.weightKg).toBe(40);
  });
});
