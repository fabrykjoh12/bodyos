import { describe, expect, it } from 'vitest';
import { cmToIn, inToCm, toDisplayLength, fromDisplayLength, lengthUnit } from './format';

describe('length conversion', () => {
  it('converts cm to inches and back', () => {
    expect(cmToIn(2.54)).toBeCloseTo(1, 5);
    expect(inToCm(1)).toBeCloseTo(2.54, 5);
    expect(cmToIn(inToCm(37.5))).toBeCloseTo(37.5, 5);
  });

  it('keeps cm for metric and converts for imperial', () => {
    expect(toDisplayLength(100, 'kg')).toBe(100);
    expect(toDisplayLength(2.54, 'lb')).toBeCloseTo(1, 5);
    expect(lengthUnit('kg')).toBe('cm');
    expect(lengthUnit('lb')).toBe('in');
  });

  it('round-trips a display length back to stored cm', () => {
    expect(fromDisplayLength(toDisplayLength(83, 'lb'), 'lb')).toBeCloseTo(83, 5);
    expect(fromDisplayLength(toDisplayLength(83, 'kg'), 'kg')).toBe(83);
  });
});
