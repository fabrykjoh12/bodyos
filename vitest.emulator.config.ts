// Separate config for emulator-backed tests: vitest's `exclude` always wins over
// a CLI include filter, so the main config's exclusion of *.emulator.test.ts
// can't be overridden from the command line — this config targets ONLY them.
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
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
  },
});
