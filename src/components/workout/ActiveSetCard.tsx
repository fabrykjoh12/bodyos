import { Repeat2 } from 'lucide-react';
import type { Equipment, Unit } from '@/types';
import { NumericStepper } from '@/components/ui/NumericStepper';
import { Chip } from '@/components/ui/Chip';
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
    <section className="card-2 relative overflow-hidden p-5" aria-label="Active set">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-xl font-bold text-content">{exerciseName}</h2>
            {onSwap && (
              <button
                onClick={onSwap}
                aria-label="Swap exercise"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-content-faint hover:bg-surface-2 hover:text-content"
              >
                <Repeat2 size={16} />
              </button>
            )}
          </div>
          <p className="mt-0.5 text-sm text-content-muted">
            Set <span className="font-semibold text-content">{setNumber}</span> of {totalSets}
          </p>
        </div>
        {isWarmup ? (
          <Chip tone="caution">Warmup</Chip>
        ) : (
          <Chip tone="accent">{formatRepRange(repRange)} reps</Chip>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-surface px-3.5 py-2.5">
        <p className="label-tiny">Today’s objective</p>
        <p className="mt-0.5 text-sm font-medium text-content">{objective}</p>
        {beat && !isWarmup && (
          <p className="tnum mt-1 text-xs font-semibold text-ice">
            Beat last time · {formatWeightValue(beat.weightKg, unit)} {unit} × {beat.reps}
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
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

      {equipment === 'barbell' && <PlateBar weightKg={weightKg} unit={unit} />}

      {showRir && !isWarmup && (
        <div className="mt-2 rounded-xl bg-surface px-3.5 py-2.5">
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
