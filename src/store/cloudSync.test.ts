import { describe, expect, it } from 'vitest';
import { backoffMs } from './cloudSync';

describe('backoffMs', () => {
  it('doubles from 2s and caps at 5 minutes', () => {
    expect(backoffMs(0)).toBe(2000);
    expect(backoffMs(1)).toBe(4000);
    expect(backoffMs(3)).toBe(16000);
    expect(backoffMs(20)).toBe(5 * 60 * 1000);
  });
});
