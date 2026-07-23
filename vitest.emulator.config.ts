// Separate config for emulator-backed tests: vitest's `exclude` always wins over
// a CLI include filter, so the main config's exclusion of *.emulator.test.ts
// can't be overridden from the command line — this config targets ONLY them.
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  // Points src/lib/firebase.ts at the local emulators instead of the real
  // project — see the __FIREBASE_EMULATOR__ guard in loadFirebase().
  define: {
    __FIREBASE_EMULATOR__: JSON.stringify('true'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.emulator.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // All emulator test files share ONE Firestore emulator + project id, and
    // several call testEnv.clearFirestore() in afterEach/afterAll. Running
    // files in parallel lets one file's clear wipe another's in-flight data
    // (a real race we hit: a fresh-uid test observed a pre-existing doc).
    fileParallelism: false,
  },
});
