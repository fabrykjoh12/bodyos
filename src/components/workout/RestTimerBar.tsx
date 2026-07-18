import { Check, Minus, Plus, SkipForward } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useRestTimer } from '@/hooks/useRestTimer';
import { formatDuration } from '@/lib/format';

/** Slim, always-legible rest timer that sits above the primary action. */
export function RestTimerBar() {
  const { active, remainingSec, progress, justFinished } = useRestTimer();
  const addRestTime = useStore((s) => s.addRestTime);
  const skipRest = useStore((s) => s.skipRest);

  if (justFinished) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2 rounded-2xl border border-success/40 bg-success-soft py-3 text-success animate-flash-success"
      >
        <Check size={18} strokeWidth={3} />
        <span className="text-sm font-semibold">Rest complete — go</span>
      </div>
    );
  }

  if (!active) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="label-tiny shrink-0">Rest</span>
        <span className="tnum text-2xl font-bold tabular-nums text-content" aria-live="polite">
          {formatDuration(remainingSec)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => addRestTime(-15)}
            aria-label="Subtract 15 seconds"
            className="flex h-9 items-center gap-0.5 rounded-lg bg-surface-3 px-2.5 text-xs font-semibold text-content-muted hover:text-content"
          >
            <Minus size={13} /> 15s
          </button>
          <button
            type="button"
            onClick={() => addRestTime(15)}
            aria-label="Add 15 seconds"
            className="flex h-9 items-center gap-0.5 rounded-lg bg-surface-3 px-2.5 text-xs font-semibold text-content-muted hover:text-content"
          >
            <Plus size={13} /> 15s
          </button>
          <button
            type="button"
            onClick={skipRest}
            className="flex h-9 items-center gap-1 rounded-lg bg-surface-3 px-2.5 text-xs font-semibold text-content-muted hover:text-content"
          >
            <SkipForward size={13} /> Skip
          </button>
        </div>
      </div>
      <div className="h-1 w-full bg-surface-3">
        <div
          className="h-full bg-accent transition-[width] duration-300 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
