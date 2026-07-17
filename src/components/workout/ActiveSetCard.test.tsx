import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveSetCard } from './ActiveSetCard';

function renderCard(overrides: Partial<Parameters<typeof ActiveSetCard>[0]> = {}) {
  const props = {
    exerciseName: 'Bench Press',
    setNumber: 1,
    totalSets: 3,
    repRange: [8, 12] as [number, number],
    weightKg: 60,
    reps: 10,
    unit: 'kg' as const,
    incrementKg: 2.5,
    equipment: 'barbell' as const,
    isWarmup: false,
    objective: 'Complete 8–12 reps at 60 kg',
    showRir: false,
    onWeightChange: vi.fn(),
    onRepsChange: vi.fn(),
    onRirChange: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ActiveSetCard {...props} />) };
}

describe('ActiveSetCard', () => {
  it('shows the "beat last time" target for a working set', () => {
    renderCard({ beat: { weightKg: 60, reps: 10 } });
    expect(screen.getByText(/Beat last time/)).toBeInTheDocument();
    expect(screen.getByText(/60 kg × 10/)).toBeInTheDocument();
  });

  it('hides the beat target on a warm-up set', () => {
    renderCard({ beat: { weightKg: 60, reps: 10 }, isWarmup: true });
    expect(screen.queryByText(/Beat last time/)).not.toBeInTheDocument();
  });

  it('omits the beat target when there is no history', () => {
    renderCard({ beat: undefined });
    expect(screen.queryByText(/Beat last time/)).not.toBeInTheDocument();
  });

  it('surfaces the RIR picker only when enabled on a working set', () => {
    const { rerender, props } = renderCard({ showRir: false });
    expect(screen.queryByRole('group', { name: /reps in reserve/i })).not.toBeInTheDocument();
    rerender(<ActiveSetCard {...props} showRir />);
    expect(screen.getByRole('group', { name: /reps in reserve/i })).toBeInTheDocument();
  });

  it('reports weight and rep edits to its callbacks', () => {
    const { props } = renderCard();
    fireEvent.pointerDown(screen.getByLabelText('Increase Weight'));
    fireEvent.pointerUp(screen.getByLabelText('Increase Weight'));
    expect(props.onWeightChange).toHaveBeenCalledWith(62.5);
    fireEvent.pointerDown(screen.getByLabelText('Increase Reps'));
    fireEvent.pointerUp(screen.getByLabelText('Increase Reps'));
    expect(props.onRepsChange).toHaveBeenCalledWith(11);
  });
});
