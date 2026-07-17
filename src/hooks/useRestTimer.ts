import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useInterval } from './useInterval';
import { haptics } from '@/lib/haptics';
import { playChime } from '@/lib/sound';

export interface RestTimerView {
  active: boolean;
  remainingSec: number;
  durationSec: number;
  progress: number; // 0..1 elapsed
  justFinished: boolean;
}

/** Derives a live-ticking view of the persisted rest timer. */
export function useRestTimer(): RestTimerView {
  const restTimer = useStore((s) => s.restTimer);
  const skipRest = useStore((s) => s.skipRest);
  const hapticFeedback = useStore((s) => s.user.settings.hapticFeedback);
  const restAlertSound = useStore((s) => s.user.settings.restAlertSound);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [justFinished, setJustFinished] = useState(false);

  const active = restTimer.endsAt !== null && restTimer.endsAt > nowMs;
  useInterval(() => setNowMs(Date.now()), restTimer.endsAt !== null ? 250 : null);

  useEffect(() => {
    if (restTimer.endsAt !== null && restTimer.endsAt <= nowMs) {
      // Timer elapsed: alert once (buzz + chime, each opt-out) and flag
      // completion, then clear.
      if (hapticFeedback) haptics.success();
      if (restAlertSound !== false) playChime();
      setJustFinished(true);
      const t = window.setTimeout(() => {
        setJustFinished(false);
        skipRest();
      }, 1500);
      return () => window.clearTimeout(t);
    }
    return;
  }, [restTimer.endsAt, nowMs, skipRest, hapticFeedback, restAlertSound]);

  const remainingMs = restTimer.endsAt ? Math.max(0, restTimer.endsAt - nowMs) : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const durationSec = restTimer.durationSec;
  const progress = durationSec > 0 ? 1 - remainingMs / (durationSec * 1000) : 0;

  return {
    active,
    remainingSec,
    durationSec,
    progress: Math.max(0, Math.min(1, progress)),
    justFinished,
  };
}
