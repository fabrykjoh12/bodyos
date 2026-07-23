// Firestore rules tests for the normalized sync collections, run against a
// REAL emulated Firestore + the actual firestore.rules file (not a mock).
// Run via: npm run test:emulator
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { readFile } from 'node:fs/promises';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-bodyos-test',
    firestore: { rules: await readFile('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

const OWNER = 'owner-uid';
const OTHER = 'other-uid';

function validEntity(payload: unknown, rev = 1) {
  return { payload, rev, updatedAt: serverTimestamp() };
}

describe('normalized collection rules: templates (representative of templates/sessions/measurements/meta/active)', () => {
  it('denies an unauthenticated read and write', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    const ref = doc(unauthed.firestore(), 'users', OWNER, 'templates', 't1');
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, validEntity({ id: 't1' })));
  });

  it('denies a different signed-in user reading or writing the owner’s entity', async () => {
    const other = testEnv.authenticatedContext(OTHER);
    const ref = doc(other.firestore(), 'users', OWNER, 'templates', 't1');
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, validEntity({ id: 't1' })));
  });

  it('allows the owner to create, read, update, and delete their own entity', async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    const ref = doc(owner.firestore(), 'users', OWNER, 'templates', 't1');
    await assertSucceeds(setDoc(ref, validEntity({ id: 't1', name: 'Push' })));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(setDoc(ref, validEntity({ id: 't1', name: 'Push Day' }, 2)));
    await assertSucceeds(deleteDoc(ref));
  });

  it('rejects a malformed entity (missing rev)', async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    const ref = doc(owner.firestore(), 'users', OWNER, 'templates', 't1');
    await assertFails(setDoc(ref, { payload: {}, updatedAt: serverTimestamp() }));
  });

  it('rejects a client-supplied updatedAt (no clock spoofing)', async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    const ref = doc(owner.firestore(), 'users', OWNER, 'templates', 't1');
    await assertFails(setDoc(ref, { payload: {}, rev: 1, updatedAt: new Date() }));
  });

  it('rejects a non-integer rev', async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    const ref = doc(owner.firestore(), 'users', OWNER, 'templates', 't1');
    await assertFails(setDoc(ref, { payload: {}, rev: 1.5, updatedAt: serverTimestamp() }));
  });
});

describe('meta and active collections use the same entity shape', () => {
  it('allows the owner to write meta/profile and active/current', async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    await assertSucceeds(
      setDoc(doc(owner.firestore(), 'users', OWNER, 'meta', 'profile'), validEntity({ user: {} })),
    );
    await assertSucceeds(
      setDoc(
        doc(owner.firestore(), 'users', OWNER, 'active', 'current'),
        validEntity({ id: 's1' }),
      ),
    );
  });
});

describe('tombstones are write-once', () => {
  it('lets the owner create a tombstone but never update it', async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    const ref = doc(owner.firestore(), 'users', OWNER, 'tombstones', 'template_t1');
    await assertSucceeds(
      setDoc(ref, { entity: 'template', entityId: 't1', deletedAt: serverTimestamp() }),
    );
    await assertFails(
      setDoc(ref, { entity: 'template', entityId: 't1', deletedAt: serverTimestamp() }),
    );
  });

  it('denies a tombstone missing required fields', async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    const ref = doc(owner.firestore(), 'users', OWNER, 'tombstones', 'template_t1');
    await assertFails(setDoc(ref, { entity: 'template' }));
  });
});

describe('conflict shelf', () => {
  it('lets the owner create and later dismiss (delete) a shelved conflict', async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    const ref = doc(owner.firestore(), 'users', OWNER, 'conflicts', 'c1');
    await assertSucceeds(
      setDoc(ref, {
        entity: 'template',
        entityId: 't1',
        payload: { name: 'stale' },
        shelvedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(deleteDoc(ref));
  });

  it('denies another user reading a shelved conflict', async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    const ref = doc(owner.firestore(), 'users', OWNER, 'conflicts', 'c1');
    await assertSucceeds(
      setDoc(ref, {
        entity: 'template',
        entityId: 't1',
        payload: {},
        shelvedAt: serverTimestamp(),
      }),
    );
    const other = testEnv.authenticatedContext(OTHER);
    await assertFails(getDoc(doc(other.firestore(), 'users', OWNER, 'conflicts', 'c1')));
  });
});

describe('everything else stays denied by default', () => {
  it('denies reads/writes to an unlisted collection', async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    const ref = doc(owner.firestore(), 'users', OWNER, 'somethingElse', 'x');
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { anything: true }));
  });
});
