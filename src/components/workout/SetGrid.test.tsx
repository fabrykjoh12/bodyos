import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SetGrid } from './SetGrid';
import type { ExerciseSession, SetEntry } from '@/types';

function set(overrides: Partial<SetEntry>): SetEntry {
  return {
    id: overrides.id ?? 'set-1',
    exerciseId: 'ex',
    setNumber: 1,
    type: 'working',
    weightKg: 60,
    reps: 10,
    completed: true,
    isWarmup: false,
    ...overrides,
  };
}

function exercise(sets: SetEntry[], prevSets: { weightKg: number; reps: number }[]): ExerciseSession {
  return {
    id: 'es',
    exerciseId: 'ex',
    order: 0,
    repRange: [8, 12],
    restSec: 120,
    incrementKg: 2.5,
    status: 'active',
    sets,
    previous: prevSets.length
      ? { date: '2026-07-10T00:00:00.000Z', sets: prevSets, topWeightKg: Math.max(...prevSets.map((s) => s.weightKg)) }
      : undefined,
  };
}

describe('SetGrid beat markers', () => {
  it('flags a set that beats last time on load', () => {
    const ex = exercise([set({ weightKg: 65, reps: 10 })], [{ weightKg: 60, reps: 10 }]);
    render(<SetGrid exercise={ex} unit="kg" activeSetIndex={-1} highlightBeats />);
    expect(screen.getByLabelText('Beat last time')).toBeInTheDocument();
  });

  it('flags a set that beats last time on reps at equal load', () => {
    const ex = exercise([set({ weightKg: 60, reps: 11 })], [{ weightKg: 60, reps: 10 }]);
    render(<SetGrid exercise={ex} unit="kg" activeSetIndex={-1} highlightBeats />);
    expect(screen.getByLabelText('Beat last time')).toBeInTheDocument();
  });

  it('does not flag a set that only matched last time', () => {
    const ex = exercise([set({ weightKg: 60, reps: 10 })], [{ weightKg: 60, reps: 10 }]);
    render(<SetGrid exercise={ex} unit="kg" activeSetIndex={-1} highlightBeats />);
    expect(screen.queryByLabelText('Beat last time')).not.toBeInTheDocument();
  });

  it('does not flag when highlightBeats is off (e.g. deload)', () => {
    const ex = exercise([set({ weightKg: 65, reps: 10 })], [{ weightKg: 60, reps: 10 }]);
    render(<SetGrid exercise={ex} unit="kg" activeSetIndex={-1} />);
    expect(screen.queryByLabelText('Beat last time')).not.toBeInTheDocument();
  });

  it('compares each working set against its own index, skipping warm-ups', () => {
    const sets = [
      set({ id: 'w', weightKg: 40, reps: 10, isWarmup: true }),
      set({ id: 's1', weightKg: 60, reps: 10 }), // matches prev[0] → no beat
      set({ id: 's2', weightKg: 62.5, reps: 8 }), // beats prev[1] on load
    ];
    const ex = exercise(sets, [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 8 }]);
    render(<SetGrid exercise={ex} unit="kg" activeSetIndex={-1} highlightBeats />);
    expect(screen.getAllByLabelText('Beat last time')).toHaveLength(1);
  });
});
