import { useMemo } from 'react';
import type { Unit } from '@/types';
import { repMaxTable } from '@/lib/repMax';
import { formatWeightValue } from '@/lib/format';

/** Compact grid of predicted working weights across rep targets, from an e1RM. */
export function RepMaxTable({ oneRepMax, unit }: { oneRepMax: number; unit: Unit }) {
  const rows = useMemo(() => repMaxTable(oneRepMax), [oneRepMax]);
  return (
    <div className="grid grid-cols-3 gap-2">
      {rows.map((r) => (
        <div key={r.reps} className="rounded-lg bg-surface-2 px-2 py-2.5 text-center">
          <p className="tnum text-[15px] font-semibold text-content">
            {formatWeightValue(r.weightKg, unit)}
          </p>
          <p className="text-[11px] text-content-faint">
            {r.reps} rep{r.reps > 1 ? 's' : ''}
          </p>
        </div>
      ))}
    </div>
  );
}
