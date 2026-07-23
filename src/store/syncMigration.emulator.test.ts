import 'fake-indexeddb/auto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { migrateFromBlob } from './syncMigration';
import { clearQueue, getEntityRev } from './syncQueue';
import { loadFirebase } from '@/lib/firebase';
import { createEmptyData } from '@/data/seed';

let testEnv: RulesTestEnvironment;
let uid: string;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-bodyos-test',
    firestore: { rules: await readFile('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
  await clearQueue(uid);
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  const fb = await loadFirebase();
  if (!fb) throw new Error('emulator client did not initialize');
  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  const email = `test-${Math.random().toString(36).slice(2)}@example.com`;
  const cred = await createUserWithEmailAndPassword(fb.auth, email, 'password123');
  uid = cred.user.uid;
});

async function seedLegacyBlob(data: unknown) {
  const fb = await loadFirebase();
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  await setDoc(doc(fb!.db, 'bodyos_app_state', uid), {
    data,
    appVersion: 1,
    updatedAt: serverTimestamp(),
  });
}

describe('migrateFromBlob', () => {
  it('marks a brand-new account (no blob) as migrated without fanning anything out', async () => {
    const result = await migrateFromBlob(uid);
    expect(result).toBe('no-blob');
    // Idempotent: calling again sees the marker and does nothing further.
    expect(await migrateFromBlob(uid)).toBe('already-migrated');
  });

  it('fans out templates/sessions/measurements/meta/active from the legacy blob', async () => {
    const local = createEmptyData();
    local.templates = [
      {
        id: 't1',
        name: 'Push',
        focus: 'Chest',
        split: 'full-body',
        exercises: [],
        estimatedMinutes: 45,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    local.sessions = [
      {
        id: 's1',
        templateId: 't1',
        name: 'Push',
        focus: 'Chest',
        status: 'completed',
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T01:00:00.000Z',
        exercises: [],
        currentExerciseIndex: 0,
      },
    ];
    local.user.name = 'Real User';
    await seedLegacyBlob(local);

    const result = await migrateFromBlob(uid);
    expect(result).toBe('migrated');

    const fb = await loadFirebase();
    const { doc, getDoc } = await import('firebase/firestore');
    const templateSnap = await getDoc(doc(fb!.db, 'users', uid, 'templates', 't1'));
    expect(templateSnap.exists()).toBe(true);
    expect(templateSnap.data()?.payload.name).toBe('Push');
    expect(templateSnap.data()?.rev).toBe(1);

    const sessionSnap = await getDoc(doc(fb!.db, 'users', uid, 'sessions', 's1'));
    expect(sessionSnap.exists()).toBe(true);

    const metaSnap = await getDoc(doc(fb!.db, 'users', uid, 'meta', 'profile'));
    expect(metaSnap.data()?.payload.user.name).toBe('Real User');

    // Local baselines are seeded so this device doesn't immediately re-push
    // (or misread rev 1 as a remote edit from someone else).
    expect(await getEntityRev(uid, 'template', 't1')).toBe(1);
    expect(await getEntityRev(uid, 'session', 's1')).toBe(1);
    expect(await getEntityRev(uid, 'meta', 'profile')).toBe(1);
  });

  it('migrates the active session when one exists', async () => {
    const local = createEmptyData();
    local.activeSession = {
      id: 'active1',
      templateId: 't1',
      name: 'Push',
      focus: 'Chest',
      status: 'active',
      startedAt: '2026-01-01T00:00:00.000Z',
      exercises: [],
      currentExerciseIndex: 0,
    };
    await seedLegacyBlob(local);
    await migrateFromBlob(uid);

    const fb = await loadFirebase();
    const { doc, getDoc } = await import('firebase/firestore');
    const activeSnap = await getDoc(doc(fb!.db, 'users', uid, 'active', 'current'));
    expect(activeSnap.exists()).toBe(true);
    expect(activeSnap.data()?.payload.id).toBe('active1');
  });

  it('never re-migrates once the marker exists, even if the blob changes afterward', async () => {
    const local = createEmptyData();
    await seedLegacyBlob(local);
    await migrateFromBlob(uid);

    const changed = createEmptyData();
    changed.templates = [
      {
        id: 'sneaky',
        name: 'Should not appear',
        focus: 'x',
        split: 'full-body',
        exercises: [],
        estimatedMinutes: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    await seedLegacyBlob(changed);
    expect(await migrateFromBlob(uid)).toBe('already-migrated');

    const fb = await loadFirebase();
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(fb!.db, 'users', uid, 'templates', 'sneaky'));
    expect(snap.exists()).toBe(false);
  });

  it('leaves the legacy blob doc intact after migrating (rollback window)', async () => {
    const local = createEmptyData();
    await seedLegacyBlob(local);
    await migrateFromBlob(uid);

    const fb = await loadFirebase();
    const { doc, getDoc } = await import('firebase/firestore');
    const blobSnap = await getDoc(doc(fb!.db, 'bodyos_app_state', uid));
    expect(blobSnap.exists()).toBe(true);
  });
});
