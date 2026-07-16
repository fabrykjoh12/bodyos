/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import fs from 'node:fs';

// GitHub Pages serves this project from https://<user>.github.io/bodyos/,
// so production assets must resolve under that sub-path. Dev stays at root.
const BASE = '/bodyos/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE : '/',
  plugins: [
    react(),
    // Offline-first PWA: Workbox precaches the app shell + all hashed chunks,
    // fonts, and exercise photos so BodyOS works fully offline in the gym.
    // The hand-authored public/manifest.webmanifest + icon are kept as-is
    // (manifest: false), so the plugin only adds the service worker + registration.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      injectRegister: 'auto',
      workbox: {
        // Precache every built asset. Fonts (woff2) and exercise photos (webp)
        // are included so the whole shell is available with no network.
        globPatterns: ['**/*.{js,css,html,svg,webp,png,ico,woff,woff2,webmanifest}'],
        // SPA deep links (e.g. /bodyos/workouts) resolve to the precached shell
        // when offline; the client router takes over from there.
        navigateFallback: `${BASE}index.html`,
        // Fontsource variable fonts can exceed the 2 MiB default.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
      // Keep the dev server free of a service worker so `npm run dev` never
      // serves stale cached assets.
      devOptions: { enabled: false },
    }),
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
