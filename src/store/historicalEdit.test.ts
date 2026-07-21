import { beforeEach, describe, expect, it } from 'vitest';
import { useStore, switchActiveProfile } from './useStore';
import { LocalStorageRepository, profileStorageKey } from './repository';

/**
 * Historical corrections must keep derived data (PRs, streaks) consistent
 * with the edited source sessions — never stale.
 */
describe('historical editing with derived recomputation', () => {
  beforeEach(() => {
    switchActiveProfile(null);
    new LocalStorageRepository(profileStorageKey(null)).clear();
    useStore.getState().resetAll();
    useStore.getState().loadDemo();
  });

  it('editing a set to a new all-time top creates the PR', () => {
    const s = useStore.getState();
    const target = s.sessions.find((x) => x.status === 'completed' && !x.isDeload)!;
    const ex = target.exercises[0]!;
    const set = ex.sets.find((st) => st.completed && !st.isWarmup)!;

    useStore.getState().updateHistoricalSet(target.id, set.id, { weightKg: 500, reps: 5 });

    const prs = useStore.getState().personalRecords;
    const top = prs.filter((p) => p.exerciseId === ex.exerciseId && p.type === 'weight').at(-1)!;
    expect(top.value).toBe(500);
    // The edited session's stored recommendation is dropped (it described the
    // original result, not the corrected one).
    const edited = useStore.getState().sessions.find((x) => x.id === target.id)!;
    expect(edited.exercises[0]!.recommendation).toBeUndefined();
  });

  it('deleting a session removes its PRs and recomputes streaks', () => {
    const before = useStore.getState();
    const target = before.sessions.find((x) => x.status === 'completed' && !x.isDeload)!;
    const sessionCount = before.sessions.length;
    const streakCount = before.streakDates.length;

    useStore.getState().deleteSession(target.id);

    const after = useStore.getState();
    expect(after.sessions.length).toBe(sessionCount - 1);
    expect(after.personalRecords.every((p) => p.sessionId !== target.id)).toBe(true);
    expect(after.streakDates.length).toBe(streakCount - 1);
  });

  it('corrections persist and survive a reload of the namespace', () => {
    const s = useStore.getState();
    const target = s.sessions.find((x) => x.status === 'completed')!;
    const set = target.exercises[0]!.sets.find((st) => st.completed)!;
    useStore.getState().updateHistoricalSet(target.id, set.id, { reps: 99 });

    const raw = new LocalStorageRepository(profileStorageKey(null)).load()!;
    const persisted = raw.sessions.find((x) => x.id === target.id)!;
    const persistedSet = persisted.exercises[0]!.sets.find((st) => st.id === set.id)!;
    expect(persistedSet.reps).toBe(99);
  });

  it('rename persists and keeps a non-empty name', () => {
    const target = useStore.getState().sessions[0]!;
    useStore.getState().renameSession(target.id, '  Heavy Day  ');
    expect(useStore.getState().sessions.find((x) => x.id === target.id)!.name).toBe('Heavy Day');
    useStore.getState().renameSession(target.id, '   ');
    expect(useStore.getState().sessions.find((x) => x.id === target.id)!.name).toBe('Heavy Day');
  });
});
