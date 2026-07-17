import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GymMode } from './GymMode';
import { useStore } from '@/store/useStore';
import { requireExercise } from '@/data/exercises';

function startSessionAndRender() {
  const templateId = useStore.getState().templates[0]!.id;
  useStore.getState().startSession(templateId);
  const session = useStore.getState().activeSession!;
  render(
    <MemoryRouter initialEntries={[`/session/${session.id}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/session/:id" element={<GymMode />} />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return session;
}

describe('GymMode integration', () => {
  beforeEach(() => {
    useStore.getState().resetAll();
  });

  it('renders the active set for the running session', () => {
    const session = startSessionAndRender();
    const firstExName = requireExercise(session.exercises[0]!.exerciseId).name;
    expect(screen.getByRole('heading', { name: firstExName })).toBeInTheDocument();
    expect(screen.getByText(/Today’s objective/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log set/i })).toBeInTheDocument();
  });

  it('logs a set and advances to the next set', () => {
    startSessionAndRender();
    const ex0 = () => useStore.getState().activeSession!.exercises[0]!;
    expect(ex0().sets.filter((s) => s.completed).length).toBe(0);

    // The active card announces "Set 1 of N" before logging.
    const card = screen.getByLabelText('Active set');
    expect(within(card).getByText(/Set/)).toHaveTextContent(/Set\s*1\s*of/);

    fireEvent.click(screen.getByRole('button', { name: /log set/i }));

    // Store advanced: one working set completed, weight carried to set 2.
    expect(ex0().sets.filter((s) => s.completed).length).toBe(1);
    expect(within(screen.getByLabelText('Active set')).getByText(/Set/)).toHaveTextContent(/Set\s*2\s*of/);
  });

  it('shows the "no longer active" fallback when the route id does not match', () => {
    const templateId = useStore.getState().templates[0]!.id;
    useStore.getState().startSession(templateId);
    render(
      <MemoryRouter initialEntries={['/session/does-not-exist']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/session/:id" element={<GymMode />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/no longer active/i)).toBeInTheDocument();
  });
});
