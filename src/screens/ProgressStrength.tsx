import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { exerciseName } from '@/data/exercises';
import { e1rmSeries, strengthTrends } from '@/lib/analytics';
import { formatWeight } from '@/lib/format';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { StrengthChart } from '@/components/progress/StrengthChart';
import { Chip } from '@/components/ui/Chip';

export function ProgressStrength() {
  const sessions = useStore((s) => s.sessions);
  const unit = useStore((s) => s.user.settings.unit);
  const trends = useMemo(() => strengthTrends(sessions), [sessions]);
  const [selected, setSelected] = useState<string | null>(trends[0]?.exerciseId ?? null);

  const series = useMemo(
    () => (selected ? e1rmSeries(selected, sessions) : []),
    [selected, sessions],
  );
  const trend = trends.find((t) => t.exerciseId === selected);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <ScreenHeader title="Strength" subtitle="Estimated 1RM over time" back="/progress" />

      <div className="no-scrollbar bleed flex gap-2 overflow-x-auto pb-1">
        {trends.map((t) => (
          <button
            key={t.exerciseId}
            onClick={() => setSelected(t.exerciseId)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              selected === t.exerciseId ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-content-muted'
            }`}
          >
            {exerciseName(t.exerciseId)}
          </button>
        ))}
      </div>

      {selected && trend && (
        <>
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="label-tiny">Current est. 1RM</p>
                <p className="tnum text-2xl font-bold text-content">{formatWeight(trend.latest, unit)}</p>
              </div>
              <Chip tone={trend.deltaKg >= 0 ? 'success' : 'danger'}>
                {trend.deltaKg >= 0 ? '↑' : '↓'} {formatWeight(Math.abs(trend.deltaKg), unit)}
              </Chip>
            </div>
            <StrengthChart data={series.map((p) => ({ label: p.label, value: p.value }))} unit={unit} />
          </div>

          <p className="px-1 text-sm text-content-muted">
            Over {trend.points} sessions, your estimated 1RM went from{' '}
            <span className="tnum font-semibold text-content">{formatWeight(trend.first, unit)}</span> to{' '}
            <span className="tnum font-semibold text-content">{formatWeight(trend.latest, unit)}</span>.
          </p>
        </>
      )}
    </div>
  );
}
