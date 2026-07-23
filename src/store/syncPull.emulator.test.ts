// Pull-fetch tests: verify pullRemote() correctly compares remote revs
// against local baselines against a REAL Firestore emulator.
import 'fake-indexeddb/auto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { drainQueue, pullRemote } from './syncEngine';
import { clearQueue, enqueueMutations, setEntityRev } from './syncQueue';
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
  const email = `test-${Math.random().toString(36).slice(2)}@example.com`;
  const cred = await createUserWithEmailAndPassword(fb.auth, email, 'password123');
  uid = cred.user.uid;
});

describe('pullRemote', () => {
  it('adopts an entity this device has never seen', async () => {
    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1', name: 'Push' } },
    ]);
    await drainQueue(uid);
    // Simulate a second device by resetting this device's baseline to "never synced".
    await setEntityRev(uid, 'template', 't1', 0);

    const patch = await pullRemote(uid);
    expect(patch.templates.upsert).toEqual([{ id: 't1', name: 'Push' }]);
  });

  it('does not re-adopt something this device already has at the current rev', async () => {
    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1' } },
    ]);
    await drainQueue(uid);
    // Baseline is already caught up (drainQueue set it) — nothing new to pull.
    const patch = await pullRemote(uid);
    expect(patch.templates.upsert).toEqual([]);
  });

  it('adopts a tombstoned deletion', async () => {
    await enqueueMutations(uid, [
      { entity: 'session', entityId: 's1', op: 'upsert', payload: { id: 's1' } },
    ]);
    await drainQueue(uid);
    await enqueueMutations(uid, [{ entity: 'session', entityId: 's1', op: 'delete' }]);
    await drainQueue(uid);

    const patch = await pullRemote(uid);
    expect(patch.sessions.deleteIds).toEqual(['s1']);
  });

  it('adopts meta and active-session singletons the same way', async () => {
    await enqueueMutations(uid, [
      { entity: 'meta', entityId: 'profile', op: 'upsert', payload: { user: { name: 'Remote' } } },
      { entity: 'active', entityId: 'current', op: 'upsert', payload: { id: 's1' } },
    ]);
    await drainQueue(uid);
    await setEntityRev(uid, 'meta', 'profile', 0);
    await setEntityRev(uid, 'active', 'current', 0);

    const patch = await pullRemote(uid);
    expect(patch.meta).toEqual({ user: { name: 'Remote' } });
    expect(patch.active).toEqual({ id: 's1' });
  });

  it('reports active: undefined when there is nothing new to adopt', async () => {
    const patch = await pullRemote(uid);
    expect(patch.active).toBeUndefined();
    expect(patch.meta).toBeNull();
  });
});
