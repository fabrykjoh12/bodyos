import { beforeEach, describe, expect, it } from 'vitest';
import { useStore, switchActiveProfile } from './useStore';
import { LocalStorageRepository, profileStorageKey } from './repository';

describe('partial workouts are recorded honestly', () => {
  beforeEach(() => {
    switchActiveProfile(null);
    new LocalStorageRepository(profileStorageKey(null)).clear();
    useStore.getState().resetAll();
    useStore.getState().loadDemo();
  });

  it('marks untouched exercises as skipped, with no recommendation', () => {
    const templateId = useStore.getState().templates[0]!.id;
    useStore.getState().startSession(templateId);
    // Log exactly one set of the first exercise, then finish.
    useStore.getState().logActiveSet();
    const completedId = useStore.getState().completeSession();
    expect(completedId).not.toBeNull();

    const session = useStore.getState().sessions.find((s) => s.id === completedId)!;
    const [first, ...rest] = session.exercises;
    expect(first!.status).toBe('done'); // the exercise with work is done
    expect(first!.sets.some((s) => s.completed)).toBe(true);
    for (const ex of rest) {
      expect(ex.status).toBe('skipped');
      expect(ex.recommendation).toBeUndefined();
    }
  });

  it('a fully performed session has no skipped exercises', () => {
    const templateId = useStore.getState().templates[0]!.id;
    useStore.getState().startSession(templateId);
    // Log every set of every exercise.
    for (let guard = 0; guard < 100; guard++) {
      const active = useStore.getState().activeSession!;
      const ex = active.exercises[active.currentExerciseIndex]!;
      if (ex.sets.every((s) => s.completed)) {
        if (active.currentExerciseIndex >= active.exercises.length - 1) break;
        useStore.getState().nextExercise();
      } else {
        useStore.getState().logActiveSet();
      }
    }
    const completedId = useStore.getState().completeSession();
    const session = useStore.getState().sessions.find((s) => s.id === completedId)!;
    expect(session.exercises.every((ex) => ex.status !== 'skipped')).toBe(true);
  });
});
