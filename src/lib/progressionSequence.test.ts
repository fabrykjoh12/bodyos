import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import { countPriorStalls, prefillFor } from './history';

// Multi-session sequences through the real prefill path — the exact surface a
// lifter sees at the start of each workout. Range 6–10 @ 2.5 kg increments.

const RANGE: [number, number] = [6, 10];
const INC = 2.5;
const EX = 'bench-press';

let clock = 0;
function session(weightKg: number, reps: number[], opts: { deload?: boolean } = {}): WorkoutSession {
  clock += 1;
  const day = String(clock).padStart(2, '0');
  return {
    id: `s${clock}`,
    templateId: 't1',
    name: 'Push',
    focus: 'Chest',
    status: 'completed',
    startedAt: `2026-06-${day}T10:00:00.000Z`,
    completedAt: `2026-06-${day}T11:00:00.000Z`,
    currentExerciseIndex: 0,
    ...(opts.deload ? { isDeload: true } : {}),
    exercises: [
      {
        id: `e${clock}`,
        exerciseId: EX,
        order: 0,
        repRange: RANGE,
        restSec: 150,
        incrementKg: INC,
        status: 'done' as const,
        sets: reps.map((r, i) => ({
          id: `set${clock}-${i}`,
          exerciseId: EX,
          setNumber: i + 1,
          type: 'working' as const,
          weightKg,
          reps: r,
          completed: true,
          isWarmup: false,
        })),
      },
    ],
  } as WorkoutSession;
}

function prefill(sessions: WorkoutSession[]) {
  return prefillFor(EX, RANGE, INC, undefined, sessions);
}

describe('progression sequences (prefill = what the lifter is told next)', () => {
  it('progresses weight after a full top-of-range session', () => {
    const r = prefill([session(60, [10, 10, 10])]);
    expect(r.weightKg).toBe(62.5);
    expect(r.targetReps).toBe(6); // restart at the bottom of the range
  });

  it('holds the weight while inside the range', () => {
    const r = prefill([session(60, [8, 7, 7])]);
    expect(r.weightKg).toBe(60);
  });

  it('does NOT double-count the most recent session as its own prior stall', () => {
    // ONE missed session (below bottom of range). The correct call is
    // "repeat the weight and consolidate" — not the second-miss backoff.
    const r = prefill([session(100, [4, 5, 5])]);
    expect(r.weightKg).toBe(100);
  });

  it('backs off ~5% after the second consecutive miss', () => {
    const r = prefill([
      session(100, [5, 5, 5]), // first miss
      session(100, [4, 5, 5]), // second miss
    ]);
    expect(r.weightKg).toBeLessThan(100);
    expect(r.weightKg).toBeGreaterThanOrEqual(90); // one ~5% notch, not a deload
  });

  it('deloads ~10% after a third session stuck at the same load', () => {
    const r = prefill([
      session(100, [5, 5, 5]),
      session(100, [5, 4, 4]),
      session(100, [4, 4, 4]),
    ]);
    expect(r.weightKg).toBeLessThanOrEqual(90);
  });

  it('a single top-range set does not clear a stall when the other sets fell short', () => {
    // All sets must break the top of the range to progress — the stall ledger
    // must judge with the same rule, or this lifter neither progresses nor
    // ever escalates toward a reset.
    const stalls = countPriorStalls(EX, 100, RANGE[1], [session(100, [10, 7, 7])]);
    expect(stalls).toBe(1);
  });

  it('a genuinely completed session clears the stall streak', () => {
    const older = session(100, [5, 5, 5]);
    const newest = session(100, [10, 10, 10]); // created later → most recent
    const stalls = countPriorStalls(EX, 100, RANGE[1], [older, newest]);
    expect(stalls).toBe(0);
  });

  it('deload sessions never count toward stalls or prefill history', () => {
    const r = prefill([
      session(100, [8, 8, 8]),
      session(90, [8, 8, 8], { deload: true }), // most recent, must be ignored
    ]);
    expect(r.weightKg).toBe(100);
    const stalls = countPriorStalls(EX, 100, RANGE[1], [session(90, [5, 5, 5], { deload: true })]);
    expect(stalls).toBe(0);
  });

  it('long normal progression sequence never spuriously reduces load', () => {
    // 6→8→10 reps at 60, unlock 62.5, then 6→7 at 62.5 — a healthy block.
    const history = [
      session(60, [6, 6, 6]),
      session(60, [8, 7, 7]),
      session(60, [10, 10, 10]),
      session(62.5, [6, 6, 6]),
      session(62.5, [7, 7, 6]),
    ];
    const r = prefill(history);
    expect(r.weightKg).toBe(62.5); // keep building — no backoff, no deload
  });
});
