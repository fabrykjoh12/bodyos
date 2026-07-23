// Emulator smoke test: proves the harness (firebase emulators:exec + rules-unit-testing
// against a live emulator) actually works before real tests depend on it.
// Run via: npm run test:emulator (starts+stops the emulator suite around vitest).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFile } from 'node:fs/promises';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-bodyos-test',
    firestore: {
      rules: await readFile('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('emulator harness smoke test', () => {
  it('denies an unauthenticated write to the legacy blob doc', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    const ref = doc(unauthed.firestore(), 'bodyos_app_state', 'someone');
    await assertFails(setDoc(ref, { data: {}, appVersion: 1, updatedAt: new Date() }));
  });

  it('allows an owner to read their own legacy blob doc', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'bodyos_app_state', 'user-1'), { seeded: true });
    });
    const owner = testEnv.authenticatedContext('user-1');
    const snap = await assertSucceeds(getDoc(doc(owner.firestore(), 'bodyos_app_state', 'user-1')));
    expect(snap.exists()).toBe(true);
  });
});
