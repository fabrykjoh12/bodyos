// Integration test for the actual cloudSync.ts wiring (not just the
// underlying primitives, which have their own dedicated emulator tests) —
// exercises the real sign-in bootstrap (migrate -> pull -> catch-up -> drain)
// and a local write flowing all the way to Firestore, through the real
// module singletons (registerSync/notifyLocalWrite/initCloudSync).
import 'fake-indexeddb/auto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { createEmptyData } from '@/data/seed';
import type { AppData } from '@/types';
import { loadFirebase } from '@/lib/firebase';
import { deleteCloudData, initCloudSync, notifyLocalWrite, registerSync } from './cloudSync';
import { clearQueue } from './syncQueue';

let testEnv: RulesTestEnvironment;
let current: AppData;

registerSync({
  getLocalData: () => current,
  applyRemote: (data) => {
    current = data;
  },
  switchProfile: () => {
    // The real store namespaces by profile; this test only ever uses one
    // account at a time, so there's nothing to actually switch.
  },
});
initCloudSync();

/** Poll the actual Firestore doc rather than the sync status string — the
 *  status can flip through 'syncing' -> 'synced' fast enough (or already be
 *  'synced' as a leftover from a previous test) that polling it directly is
 *  race-prone. Polling the real invariant we care about isn't. */
async function waitForDoc<T extends { exists(): boolean }>(
  getSnap: () => Promise<T>,
  predicate: (snap: T) => boolean,
  timeoutMs = 10000,
): Promise<T> {
  const start = Date.now();
  for (;;) {
    const snap = await getSnap();
    if (predicate(snap)) return snap;
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for Firestore doc');
    await new Promise((r) => setTimeout(r, 100));
  }
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-bodyos-test',
    firestore: { rules: await readFile('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
  const fb = await loadFirebase();
  const uid = fb?.auth.currentUser?.uid;
  if (uid) await clearQueue(uid);
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('cloudSync bootstrap (real module wiring)', () => {
  it('signs in, bootstraps a never-synced local template up to Firestore', async () => {
    current = createEmptyData();
    current.templates = [
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

    const fb = await loadFirebase();
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const email = `test-${Math.random().toString(36).slice(2)}@example.com`;
    const cred = await createUserWithEmailAndPassword(fb!.auth, email, 'password123');
    const uid = cred.user.uid;

    const { doc, getDoc } = await import('firebase/firestore');
    const ref = doc(fb!.db, 'users', uid, 'templates', 't1');
    const remoteTemplate = await waitForDoc(
      () => getDoc(ref),
      (s) => s.exists(),
    );
    expect(remoteTemplate.data()?.payload.name).toBe('Push');

    // Now simulate a further local edit via the real notifyLocalWrite path.
    const edited: AppData = {
      ...current,
      templates: [{ ...current.templates[0]!, name: 'Push Day' }],
    };
    current = edited;
    notifyLocalWrite(edited);

    await waitForDoc(
      () => getDoc(ref),
      (s) => s.data()?.payload.name === 'Push Day',
    );
  });

  it('deleteCloudData purges every normalized collection, not just the legacy blob', async () => {
    current = createEmptyData();
    current.templates = [
      {
        id: 't2',
        name: 'Pull',
        focus: 'Back',
        split: 'full-body',
        exercises: [],
        estimatedMinutes: 40,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const fb = await loadFirebase();
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const email = `test-${Math.random().toString(36).slice(2)}@example.com`;
    const cred = await createUserWithEmailAndPassword(fb!.auth, email, 'password123');
    const uid = cred.user.uid;

    const { doc, getDoc } = await import('firebase/firestore');
    const ref = doc(fb!.db, 'users', uid, 'templates', 't2');
    await waitForDoc(
      () => getDoc(ref),
      (s) => s.exists(),
    );

    const result = await deleteCloudData();
    expect(result.error).toBeNull();

    const snap = await getDoc(ref);
    expect(snap.exists()).toBe(false);
  });
});
