// Conflict-shelf tests: a real rev conflict (via drainQueue) shelves the
// loser; verify listConflicts/dismissConflict/restoreConflict all work
// against the real emulator through the actual cloudSync.ts module.
import 'fake-indexeddb/auto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { createEmptyData } from '@/data/seed';
import type { AppData } from '@/types';
import { loadFirebase } from '@/lib/firebase';
import {
  dismissConflict,
  initCloudSync,
  listConflicts,
  notifyLocalWrite,
  registerSync,
  restoreConflict,
} from './cloudSync';
import { drainQueue } from './syncEngine';
import { clearQueue, enqueueMutations, setEntityRev } from './syncQueue';

let testEnv: RulesTestEnvironment;
let current: AppData;

registerSync({
  getLocalData: () => current,
  // Mirrors the real store's persist() -> notifyLocalWrite(data) chain
  // (useStore.ts's replaceAll action), so restoreConflict's "apply then
  // re-push" behavior actually exercises the push path in this test too.
  applyRemote: (data) => {
    current = data;
    notifyLocalWrite(data);
  },
  switchProfile: () => {},
});
initCloudSync();

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

async function signInFreshUser(): Promise<string> {
  const fb = await loadFirebase();
  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  const email = `test-${Math.random().toString(36).slice(2)}@example.com`;
  const cred = await createUserWithEmailAndPassword(fb!.auth, email, 'password123');
  return cred.user.uid;
}

describe('conflict shelf', () => {
  it('lists a shelved conflict after a real rev conflict, then can dismiss it', async () => {
    current = createEmptyData();
    const uid = await signInFreshUser();

    // Seed a template that's already "synced" (rev 1) so the next write races.
    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1', name: 'from A' } },
    ]);
    await drainQueue(uid);
    // Force a conflict: reset our baseline as if we never saw that write.
    await setEntityRev(uid, 'template', 't1', 0);
    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1', name: 'from B' } },
    ]);
    await drainQueue(uid);

    const conflicts = await listConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.entity).toBe('template');
    expect(conflicts[0]!.entityId).toBe('t1');

    const result = await dismissConflict(conflicts[0]!.id);
    expect(result.error).toBeNull();
    expect(await listConflicts()).toHaveLength(0);
  });

  it('restoreConflict applies the shelved payload locally and re-pushes it as the new live value', async () => {
    current = createEmptyData();
    current.templates = [];
    const uid = await signInFreshUser();

    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1', name: 'from A' } },
    ]);
    await drainQueue(uid);
    await setEntityRev(uid, 'template', 't1', 0);
    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1', name: 'from B' } },
    ]);
    await drainQueue(uid);

    const [conflict] = await listConflicts();
    expect(conflict).toBeDefined();
    const losingName = conflict!.payload as { name: string };

    const result = await restoreConflict(conflict!);
    expect(result.error).toBeNull();

    // Applied locally.
    expect(current.templates.find((t) => t.id === 't1')?.name).toBe(losingName.name);
    // Removed from the shelf.
    expect(await listConflicts()).toHaveLength(0);
    // And pushed back up as the live value.
    const fb = await loadFirebase();
    const { doc, getDoc } = await import('firebase/firestore');
    const ref = doc(fb!.db, 'users', uid, 'templates', 't1');
    const snap = await waitForDoc(
      () => getDoc(ref),
      (s) => s.data()?.payload.name === losingName.name,
    );
    expect(snap.data()?.payload.name).toBe(losingName.name);
  });
});
