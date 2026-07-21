import { Repeat2 } from 'lucide-react';
import type { Equipment, Unit } from '@/types';
import { NumericStepper } from '@/components/ui/NumericStepper';
import { PlateBar } from '@/components/workout/PlateBar';
import { formatRepRange, formatWeightValue } from '@/lib/format';

interface ActiveSetCardProps {
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  repRange: [number, number];
  weightKg: number;
  reps: number;
  unit: Unit;
  incrementKg: number;
  equipment: Equipment;
  isWarmup: boolean;
  objective: string;
  /** Last time's performance on this same working set — the number to beat. */
  beat?: { weightKg: number; reps: number };
  showRir: boolean;
  rir?: number;
  /** When provided, shows a swap button (only while the exercise is unstarted). */
  onSwap?: () => void;
  onWeightChange: (v: number) => void;
  onRepsChange: (v: number) => void;
  onRirChange: (rir: number | undefined) => void;
}

/**
 * The primary active-set interface. Weight and reps dominate visually so the
 * numbers read at a glance in a busy gym.
 */
export function ActiveSetCard({
  exerciseName,
  setNumber,
  totalSets,
  repRange,
  weightKg,
  reps,
  unit,
  incrementKg,
  equipment,
  isWarmup,
  objective,
  beat,
  showRir,
  rir,
  onSwap,
  onWeightChange,
  onRepsChange,
  onRirChange,
}: ActiveSetCardProps) {
  const weightStep = unit === 'kg' ? incrementKg || 2.5 : 2.5;
  return (
    <section className="card relative overflow-hidden p-6" aria-label="Active set">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-heading text-content [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
            {exerciseName}
          </h2>
          <p className="mt-1 text-sm text-content-muted">
            Set <span className="font-semibold text-content">{setNumber}</span> of {totalSets}
            <span className="mx-1.5 text-content-faint">·</span>
            {isWarmup ? (
              <span className="font-semibold text-caution">Warmup</span>
            ) : (
              <span className="tnum">{formatRepRange(repRange)} reps</span>
            )}
          </p>
        </div>
        {onSwap && (
          <button
            onClick={onSwap}
            aria-label="Swap exercise"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-content-faint transition-colors hover:bg-white/[0.09] hover:text-content"
          >
            <Repeat2 size={16} />
          </button>
        )}
      </div>

      <div className="inset-panel mt-4 px-4 py-3">
        <p className="label-tiny">Today’s objective</p>
        <p className="mt-1 text-sm font-medium text-content">{objective}</p>
        {beat && !isWarmup && (
          <p className="tnum mt-1.5 text-xs font-semibold text-ice">
            Beat last time · {formatWeightValue(beat.weightKg, unit)} {unit} × {beat.reps}
          </p>
        )}
      </div>

      <div className="mt-7 flex flex-col gap-5">
        <NumericStepper
          label="Weight"
          value={weightKg}
          unit={unit}
          step={weightStep}
          onChange={onWeightChange}
          format={(v) => formatWeightValue(v, unit)}
        />
        <NumericStepper label="Reps" value={reps} step={1} onChange={onRepsChange} />
      </div>

      {equipment === 'barbell' && weightKg > 0 && <PlateBar weightKg={weightKg} unit={unit} />}

      {showRir && !isWarmup && (
        <div className="inset-panel mt-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="label-tiny">Reps in reserve</p>
            {rir !== undefined && (
              <span className="tnum text-[11px] font-medium text-content-faint">
                RPE {rir >= 4 ? '6−' : 10 - rir}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex gap-1.5" role="group" aria-label="Reps in reserve">
            {[0, 1, 2, 3, 4].map((v) => {
              const selected = rir === v;
              return (
                <button
                  key={v}
                  aria-pressed={selected}
                  onClick={() => onRirChange(selected ? undefined : v)}
                  className={[
                    'tnum h-9 flex-1 rounded-lg text-sm font-semibold transition-colors',
                    selected
                      ? 'bg-accent text-ink'
                      : 'bg-surface-2 text-content-muted hover:text-content',
                  ].join(' ')}
                >
                  {v === 4 ? '4+' : v}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
