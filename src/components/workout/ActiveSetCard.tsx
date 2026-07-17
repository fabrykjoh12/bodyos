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
  onWeightChange: (v: number) => void;
  onRepsChange: (v: number) => void;
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
  onWeightChange,
  onRepsChange,
}: ActiveSetCardProps) {
  const weightStep = unit === 'kg' ? incrementKg || 2.5 : 2.5;
  return (
    <section className="card-2 relative overflow-hidden p-5" aria-label="Active set">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-content">{exerciseName}</h2>
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
    </section>
  );
}
