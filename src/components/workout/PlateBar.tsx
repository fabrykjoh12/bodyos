import type { Unit } from '@/types';
import { computePlates } from '@/lib/plates';
import { roundDisplayWeight, toDisplayWeight } from '@/lib/format';

interface PlateBarProps {
  weightKg: number;
  unit: Unit;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/**
 * Per-side plate breakdown for a barbell load — so you know exactly how to load
 * the bar without doing the arithmetic mid-set.
 */
export function PlateBar({ weightKg, unit }: PlateBarProps) {
  const total = roundDisplayWeight(toDisplayWeight(weightKg, unit), unit);
  const { bar, perSide, leftover, exact } = computePlates(total, unit);

  return (
    <div className="mt-2 rounded-xl bg-surface px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="label-tiny">
          Per side · {fmt(bar)} {unit} bar
        </p>
        {!exact && leftover > 0 && (
          <span className="text-[11px] font-medium text-content-faint">
            +{fmt(leftover)} {unit} unracked
          </span>
        )}
      </div>
      {perSide.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {perSide.map((p, i) => (
            <span
              key={i}
              className="tnum inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border border-line bg-surface-2 px-1.5 text-xs font-semibold text-content"
            >
              {fmt(p)}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-content-muted">Just the bar</p>
      )}
    </div>
  );
}
