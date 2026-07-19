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
        className="flex items-center justify-center gap-2 rounded-2xl border border-success/40 bg-success-soft py-3.5 text-success animate-flash-success"
      >
        <Check size={18} strokeWidth={3} />
        <span className="text-sm font-bold">Rest complete — go</span>
      </div>
    );
  }

  if (!active) return null;

  const chipBtn =
    'flex h-9 items-center gap-0.5 rounded-full bg-white/[0.06] px-3 text-xs font-semibold text-content-muted transition-all duration-150 ease-spring hover:text-content active:scale-95';

  return (
    <div className="card overflow-hidden animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="label-tiny shrink-0">Rest</span>
        <span className="tnum text-[1.75rem] font-bold tabular-nums tracking-[-0.02em] text-content" aria-live="polite">
          {formatDuration(remainingSec)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => addRestTime(-15)} aria-label="Subtract 15 seconds" className={chipBtn}>
            <Minus size={13} /> 15s
          </button>
          <button type="button" onClick={() => addRestTime(15)} aria-label="Add 15 seconds" className={chipBtn}>
            <Plus size={13} /> 15s
          </button>
          <button type="button" onClick={skipRest} className={chipBtn}>
            <SkipForward size={13} /> Skip
          </button>
        </div>
      </div>
      <div className="h-1 w-full bg-surface-2">
        <div
          className="h-full bg-accent transition-[width] duration-300 ease-linear"
          style={{ width: `${progress * 100}%`, boxShadow: '0 0 10px rgba(205,251,69,0.5)' }}
        />
      </div>
    </div>
  );
}
