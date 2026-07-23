/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Injected at build time (vite define). */
declare const __APP_VERSION__: string;
declare const __BUILD_SHA__: string;
/** Injected ONLY by vitest.emulator.config.ts — always undefined in a real build. */
declare const __FIREBASE_EMULATOR__: string | undefined;
