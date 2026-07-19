import { useEffect } from 'react';

/**
 * Keep the screen awake while `active` (Screen Wake Lock API). The lock is
 * silently skipped where unsupported (older Safari, all test environments),
 * re-acquired when the tab becomes visible again (the OS releases it on
 * blur/lock), and released on cleanup.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
        // If the effect died while the promise was in flight, let go at once.
        if (cancelled) await sentinel.release();
      } catch {
        // Denied (low battery, browser policy) — the app works fine without it.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
