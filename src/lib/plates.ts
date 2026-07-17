import type { Unit } from '@/types';
import { round1 } from '@/lib/volume';

// ---------------------------------------------------------------------------
// Plate calculator + warm-up ramp — pure helpers, no UI.
//
// Plate math runs in the user's *display* unit because plate denominations
// differ by unit (25 kg vs 45 lb, etc.). Warm-up weights come back in kg to
// match the SetEntry model.
// ---------------------------------------------------------------------------

/** Standard Olympic bar weight per unit. */
export const BAR_KG = 20;
export const BAR_LB = 45;

/** Common plate denominations per side, largest first. */
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const PLATES_LB = [45, 35, 25, 10, 5, 2.5];

export function defaultBar(unit: Unit): number {
  return unit === 'kg' ? BAR_KG : BAR_LB;
}

function defaultPlates(unit: Unit): number[] {
  return unit === 'kg' ? PLATES_KG : PLATES_LB;
}

export interface PlateResult {
  /** Bar weight used, in display unit. */
  bar: number;
  /** Plates to load on ONE side, largest first (display unit). */
  perSide: number[];
  /** Total weight actually loadable with the available plates (display unit). */
  achievable: number;
  /** Remainder that can't be loaded (display unit); 0 when exact. */
  leftover: number;
  exact: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Break a target total (in the display unit) into a per-side plate list.
 * Greedy largest-first; any unloadable remainder is reported as `leftover`.
 */
export function computePlates(
  totalDisplay: number,
  unit: Unit,
  opts?: { bar?: number; plates?: number[] },
): PlateResult {
  const bar = opts?.bar ?? defaultBar(unit);
  const plates = opts?.plates ?? defaultPlates(unit);

  if (totalDisplay <= bar) {
    return {
      bar,
      perSide: [],
      achievable: bar,
      leftover: round2(Math.max(0, totalDisplay - bar)),
      exact: round2(totalDisplay - bar) === 0,
    };
  }

  let remainingPerSide = round2((totalDisplay - bar) / 2);
  const perSide: number[] = [];
  for (const plate of plates) {
    while (remainingPerSide >= plate - 1e-9) {
      perSide.push(plate);
      remainingPerSide = round2(remainingPerSide - plate);
    }
  }

  const loadedPerSide = perSide.reduce((sum, p) => sum + p, 0);
  const achievable = round2(bar + loadedPerSide * 2);
  const leftover = round2(totalDisplay - achievable);
  return { bar, perSide, achievable, leftover, exact: Math.abs(leftover) < 1e-9 };
}

export interface WarmupSet {
  weightKg: number;
  reps: number;
  /** Fraction of the working weight (0 = empty bar). */
  fraction: number;
}

// Ramp toward the working weight: empty bar, then ~50/70/85%.
const WARMUP_RAMP: { fraction: number; reps: number }[] = [
  { fraction: 0, reps: 8 },
  { fraction: 0.5, reps: 5 },
  { fraction: 0.7, reps: 3 },
  { fraction: 0.85, reps: 2 },
];

/** Round a kg weight to the nearest loadable barbell increment (2.5 kg). */
function toLoadableKg(kg: number): number {
  return round1(Math.round(kg / 2.5) * 2.5);
}

/**
 * Generate ramping warm-up sets (in kg) up to a working weight. Returns [] when
 * the working weight isn't meaningfully above the bar (nothing to ramp).
 * Weights are de-duplicated and never reach the working weight itself.
 */
export function generateWarmups(
  workingKg: number,
  opts?: { barKg?: number },
): WarmupSet[] {
  const bar = opts?.barKg ?? BAR_KG;
  // Not enough range above the bar to bother warming up.
  if (workingKg <= bar + 2.5) return [];

  const out: WarmupSet[] = [];
  let lastWeight = -1;
  for (const step of WARMUP_RAMP) {
    const raw = step.fraction === 0 ? bar : workingKg * step.fraction;
    const weightKg = Math.max(bar, toLoadableKg(raw));
    // Skip anything that reaches the working set or repeats the prior rung.
    if (weightKg >= workingKg - 1e-9) continue;
    if (weightKg === lastWeight) continue;
    out.push({ weightKg, reps: step.reps, fraction: step.fraction });
    lastWeight = weightKg;
  }
  return out;
}
