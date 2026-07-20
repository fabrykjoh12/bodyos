import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageRepository, MemoryRepository, loadOrCreate, parseBackup } from './repository';
import { createSeedData } from '@/data/seed';
import { useStore } from './useStore';

describe('repository', () => {
  it('round-trips app data through memory', () => {
    const repo = new MemoryRepository();
    const data = createSeedData();
    repo.save(data);
    const loaded = repo.load();
    expect(loaded?.templates.length).toBe(data.templates.length);
    expect(loaded?.user.goal).toBe(data.user.goal);
  });

  it('creates a truly empty account when storage is empty', () => {
    const repo = new MemoryRepository();
    const data = loadOrCreate(repo);
    // A fresh install must never contain training the user didn't log.
    expect(data.templates.length).toBe(0);
    expect(data.sessions.length).toBe(0);
    expect(data.personalRecords.length).toBe(0);
    expect(data.user.onboarded).toBe(false);
    // Subsequent load returns the persisted copy, not a new blank.
    expect(repo.load()?.user.id).toBe(data.user.id);
  });

  it('backfills missing collections on load', () => {
    const repo = new LocalStorageRepository('bodyos.test.migrate');
    const partial = { ...createSeedData(), photos: undefined } as never;
    window.localStorage.setItem('bodyos.test.migrate', JSON.stringify(partial));
    const loaded = repo.load();
    expect(Array.isArray(loaded?.photos)).toBe(true);
    repo.clear();
  });
});

describe('parseBackup', () => {
  it('accepts a real exported backup and normalizes missing collections', () => {
    const { photos, ...withoutPhotos } = createSeedData();
    void photos;
    const result = parseBackup(JSON.stringify(withoutPhotos));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.templates.length).toBeGreaterThan(0);
      expect(Array.isArray(result.data.photos)).toBe(true); // backfilled
    }
  });

  it('rejects invalid JSON', () => {
    const result = parseBackup('{ not json');
    expect(result.ok).toBe(false);
  });

  it('rejects unrelated JSON that lacks the AppData shape', () => {
    const result = parseBackup(JSON.stringify({ hello: 'world', version: 1 }));
    expect(result.ok).toBe(false);
  });
});

describe('store — core workout flow', () => {
  beforeEach(() => {
    useStore.getState().resetAll();
    useStore.getState().loadDemo();
  });

  it('starts a session with smart-prefilled weights from history', () => {
    const templateId = useStore.getState().templates[0]!.id;
    useStore.getState().startSession(templateId);
    const active = useStore.getState().activeSession;
    expect(active).not.toBeNull();
    expect(active!.exercises[0]!.sets[0]!.weightKg).toBeGreaterThan(0);
    // Previous performance should be attached from seeded history.
    expect(active!.exercises[0]!.previous?.sets.length).toBeGreaterThan(0);
  });

  it('copies the logged weight to the next set and starts the rest timer', () => {
    const templateId = useStore.getState().templates[0]!.id;
    useStore.getState().startSession(templateId);
    useStore.getState().setWeight(62.5);
    useStore.getState().setReps(9);
    useStore.getState().logActiveSet();

    const ex = useStore.getState().activeSession!.exercises[0]!;
    expect(ex.sets[0]!.completed).toBe(true);
    expect(ex.sets[1]!.weightKg).toBe(62.5); // carried forward
    expect(useStore.getState().restTimer.endsAt).not.toBeNull();
  });

  it('undo restores the set to incomplete', () => {
    const templateId = useStore.getState().templates[0]!.id;
    useStore.getState().startSession(templateId);
    useStore.getState().logActiveSet();
    expect(useStore.getState().activeSession!.exercises[0]!.sets[0]!.completed).toBe(true);
    useStore.getState().undoLastSet();
    expect(useStore.getState().activeSession!.exercises[0]!.sets[0]!.completed).toBe(false);
    expect(useStore.getState().restTimer.endsAt).toBeNull();
  });

  it('completing a session archives it with a progression recommendation', () => {
    const before = useStore.getState().sessions.length;
    const templateId = useStore.getState().templates[0]!.id;
    useStore.getState().startSession(templateId);

    // Log every set of every exercise.
    let guard = 0;
    while (useStore.getState().activeSession && guard < 60) {
      const active = useStore.getState().activeSession!;
      const idx = active.currentExerciseIndex;
      const ex = active.exercises[idx]!;
      const hasIncomplete = ex.sets.some((s) => !s.completed);
      if (hasIncomplete) {
        useStore.getState().logActiveSet();
      } else if (idx < active.exercises.length - 1) {
        useStore.getState().nextExercise();
      } else {
        break;
      }
      guard += 1;
    }

    const id = useStore.getState().completeSession();
    expect(id).not.toBeNull();
    expect(useStore.getState().activeSession).toBeNull();
    expect(useStore.getState().sessions.length).toBe(before + 1);
    const saved = useStore.getState().sessions.find((s) => s.id === id)!;
    expect(saved.status).toBe('completed');
    expect(saved.exercises[0]!.recommendation).toBeDefined();
    expect(saved.exercises[0]!.recommendation!.reason.length).toBeGreaterThan(0);
  });
});
