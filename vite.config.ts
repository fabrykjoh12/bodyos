/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// GitHub Pages serves this project from https://<user>.github.io/bodyos/,
// so production assets must resolve under that sub-path. Dev stays at root.
const BASE = '/bodyos/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE : '/',
  plugins: [
    react(),
    {
      // GitHub Pages has no SPA fallback: refreshing a deep link like
      // /bodyos/workouts would 404. Serving a copy of index.html as 404.html
      // makes the client router take over instead.
      name: 'spa-404-fallback',
      closeBundle() {
        const dist = path.resolve(__dirname, 'dist');
        const index = path.join(dist, 'index.html');
        if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'));
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
}));
