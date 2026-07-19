import { Trophy } from 'lucide-react';
import type { Unit } from '@/types';
import { formatWeight } from '@/lib/format';

/**
 * The in-session PR moment. Volt glow + a single shimmer sweep — reserved for
 * exactly this kind of celebration. Purely presentational — the parent owns
 * when it shows and auto-dismisses.
 */
export function PrCelebration({
  exerciseName,
  weightKg,
  reps,
  unit,
  weight,
  e1rm,
}: {
  exerciseName: string;
  weightKg: number;
  reps: number;
  unit: Unit;
  weight: boolean;
  e1rm: boolean;
}) {
  const label = weight && e1rm ? 'Heaviest set & best est. 1RM' : weight ? 'New heaviest set' : 'New best est. 1RM';
  return (
    <div
      role="status"
      aria-label="New personal record"
      className="shimmer-once animate-pop-in flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3.5 shadow-accent-glow"
    >
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-ink">
        <Trophy size={21} strokeWidth={2.5} />
        <span className="absolute inset-0 rounded-xl bg-accent animate-ping-once" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="label-tiny text-accent">New personal record</p>
        <p className="truncate text-sm font-bold text-content">
          {exerciseName} · <span className="tnum">{formatWeight(weightKg, unit)} × {reps}</span>
        </p>
        <p className="text-xs text-content-muted">{label}</p>
      </div>
    </div>
  );
}
