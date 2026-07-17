import type { Unit } from '@/types';

const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** Convert a kg value into the user's display unit. */
export function toDisplayWeight(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kgToLb(kg);
}

const CM_PER_IN = 2.54;

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN;
}

/** Body measurements are stored in cm; imperial (lb) users see inches. */
export function lengthUnit(unit: Unit): 'cm' | 'in' {
  return unit === 'kg' ? 'cm' : 'in';
}

/** Convert a stored-cm length into the user's display length unit. */
export function toDisplayLength(cm: number, unit: Unit): number {
  return unit === 'kg' ? cm : cmToIn(cm);
}

/** Convert a display-length value (cm or in) back to stored cm. */
export function fromDisplayLength(value: number, unit: Unit): number {
  return unit === 'kg' ? value : inToCm(value);
}

/** Round to a sensible gym increment for display (0.5 kg / 1 lb). */
export function roundDisplayWeight(value: number, unit: Unit): number {
  const step = unit === 'kg' ? 0.5 : 1;
  return Math.round(value / step) * step;
}

export function formatWeight(kg: number, unit: Unit, withUnit = true): string {
  const v = roundDisplayWeight(toDisplayWeight(kg, unit), unit);
  const str = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return withUnit ? `${str} ${unit}` : str;
}

/** Weight without unit, for large numeric displays. */
export function formatWeightValue(kg: number, unit: Unit): string {
  return formatWeight(kg, unit, false);
}

export function formatVolume(kg: number, unit: Unit): string {
  const v = toDisplayWeight(kg, unit);
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k ${unit}`;
  return `${Math.round(v)} ${unit}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatRepRange(range: [number, number]): string {
  return range[0] === range[1] ? `${range[0]}` : `${range[0]}–${range[1]}`;
}

export function pluralize(n: number, word: string, plural?: string): string {
  return n === 1 ? word : plural ?? `${word}s`;
}
