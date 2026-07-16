import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useInterval } from './useInterval';
import { haptics } from '@/lib/haptics';

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
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [justFinished, setJustFinished] = useState(false);

  const active = restTimer.endsAt !== null && restTimer.endsAt > nowMs;
  useInterval(() => setNowMs(Date.now()), restTimer.endsAt !== null ? 250 : null);

  useEffect(() => {
    if (restTimer.endsAt !== null && restTimer.endsAt <= nowMs) {
      // Timer elapsed: buzz once and flag completion, then clear.
      haptics.success();
      setJustFinished(true);
      const t = window.setTimeout(() => {
        setJustFinished(false);
        skipRest();
      }, 1500);
      return () => window.clearTimeout(t);
    }
    return;
  }, [restTimer.endsAt, nowMs, skipRest]);

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
