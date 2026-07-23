// Engine tests: push a real IndexedDB-queued mutation through the real
// Firestore emulator and verify optimistic-concurrency conflict handling —
// the actual fix for audit finding #8 (whole-blob LWW silently losing data
// on concurrent edits from two devices).
import 'fake-indexeddb/auto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { drainQueue, pushMutation } from './syncEngine';
import { clearQueue, enqueueMutations, getEntityRev, listQueuedMutations } from './syncQueue';
import { loadFirebase } from '@/lib/firebase';

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
  // Fresh user per test — emulator Auth accepts any email, no real delivery.
  const email = `test-${Math.random().toString(36).slice(2)}@example.com`;
  const cred = await createUserWithEmailAndPassword(fb.auth, email, 'password123');
  uid = cred.user.uid;
});

describe('pushMutation: no conflict', () => {
  it('writes a fresh template with rev 1 and advances the local baseline', async () => {
    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1', name: 'Push' } },
    ]);
    const [m] = await listQueuedMutations(uid);
    const outcome = await pushMutation(uid, m!);
    expect(outcome).toEqual({ result: 'synced' });
    expect(await getEntityRev(uid, 'template', 't1')).toBe(1);

    const fb = await loadFirebase();
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(fb!.db, 'users', uid, 'templates', 't1'));
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.payload).toEqual({ id: 't1', name: 'Push' });
    expect(snap.data()?.rev).toBe(1);
  });

  it('deletes an entity and writes a tombstone', async () => {
    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1' } },
    ]);
    await drainQueue(uid);

    await enqueueMutations(uid, [{ entity: 'template', entityId: 't1', op: 'delete' }]);
    const summary = await drainQueue(uid);
    expect(summary).toEqual({ synced: 1, conflicts: 0, failed: 0, remoteWon: [] });

    const fb = await loadFirebase();
    const { doc, getDoc } = await import('firebase/firestore');
    const entitySnap = await getDoc(doc(fb!.db, 'users', uid, 'templates', 't1'));
    expect(entitySnap.exists()).toBe(false);
    const tombSnap = await getDoc(doc(fb!.db, 'users', uid, 'tombstones', 'template_t1'));
    expect(tombSnap.exists()).toBe(true);
  });
});

describe('pushMutation: conflict (another device wrote first)', () => {
  it('shelves the loser and lets whichever mutation is newer win', async () => {
    // Device A pushes first, establishing rev 1 on the server.
    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1', name: 'from A' } },
    ]);
    await drainQueue(uid);

    // This device's local baseline is stale (still thinks rev 0) — simulate by
    // resetting it, so our next push looks like it never saw device A's write.
    const { setEntityRev } = await import('./syncQueue');
    await setEntityRev(uid, 'template', 't1', 0);

    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1', name: 'from B' } },
    ]);
    const [m] = await listQueuedMutations(uid);
    const outcome = await pushMutation(uid, m!);
    expect(outcome.result).toBe('conflict');

    // Whichever write's queuedAt is later wins the doc; the other is shelved.
    const fb = await loadFirebase();
    const { doc, getDoc, getDocs, collection } = await import('firebase/firestore');
    const snap = await getDoc(doc(fb!.db, 'users', uid, 'templates', 't1'));
    expect(snap.exists()).toBe(true);
    const shelved = await getDocs(collection(fb!.db, 'users', uid, 'conflicts'));
    expect(shelved.size).toBe(1);
    // Between the two payloads, one is live and the other is shelved — never both lost.
    const liveName = snap.data()?.payload?.name;
    const shelvedName = shelved.docs[0]!.data().payload?.name;
    expect(new Set([liveName, shelvedName])).toEqual(new Set(['from A', 'from B']));
  });

  it('never forces a delete through a concurrent edit', async () => {
    await enqueueMutations(uid, [
      { entity: 'session', entityId: 's1', op: 'upsert', payload: { id: 's1' } },
    ]);
    await drainQueue(uid);

    const { setEntityRev } = await import('./syncQueue');
    await setEntityRev(uid, 'session', 's1', 0); // stale baseline, as if from before A's write

    await enqueueMutations(uid, [{ entity: 'session', entityId: 's1', op: 'delete' }]);
    const [m] = await listQueuedMutations(uid);
    const outcome = await pushMutation(uid, m!);
    expect(outcome).toEqual({ result: 'conflict', wonByUs: false });

    const fb = await loadFirebase();
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(fb!.db, 'users', uid, 'sessions', 's1'));
    expect(snap.exists()).toBe(true); // survives — not silently deleted
  });
});

describe('drainQueue', () => {
  it('drains multiple entities in one pass and empties the queue', async () => {
    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1' } },
      { entity: 'session', entityId: 's1', op: 'upsert', payload: { id: 's1' } },
      { entity: 'meta', entityId: 'profile', op: 'upsert', payload: { user: {} } },
    ]);
    const summary = await drainQueue(uid);
    expect(summary).toEqual({ synced: 3, conflicts: 0, failed: 0, remoteWon: [] });
    expect(await listQueuedMutations(uid)).toHaveLength(0);
  });

  it('is a no-op on an empty queue', async () => {
    expect(await drainQueue(uid)).toEqual({ synced: 0, conflicts: 0, failed: 0, remoteWon: [] });
  });
});
