import { create } from 'zustand';
import { registerSW } from 'virtual:pwa-register';

// Service-worker update lifecycle. `registerType: 'prompt'` means a new
// version sits waiting until the user applies it — nothing ever reloads the
// app on its own (an auto-reload mid-workout is unacceptable).

interface SwUpdateState {
  /** A new version is downloaded and waiting. */
  needRefresh: boolean;
  /** Activate the new version (reloads the app). User-initiated only. */
  apply: () => void;
}

export const useSwUpdate = create<SwUpdateState>(() => ({
  needRefresh: false,
  apply: () => {},
}));

export function initSwUpdates(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const update = registerSW({
      onNeedRefresh() {
        useSwUpdate.setState({ needRefresh: true, apply: () => void update(true) });
      },
    });
  } catch {
    // SW registration failing must never break the app.
  }
}
