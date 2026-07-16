import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { exerciseName } from '@/data/exercises';
import { e1rmSeries, strengthTrends } from '@/lib/analytics';
import { formatWeight } from '@/lib/format';
import { relativeDay } from '@/lib/date';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { StrengthChart } from '@/components/progress/StrengthChart';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';

export function Stats() {
  const navigate = useNavigate();
  const sessions = useStore((s) => s.sessions);
  const personalRecords = useStore((s) => s.personalRecords);
  const unit = useStore((s) => s.user.settings.unit);

  const trends = useMemo(() => strengthTrends(sessions), [sessions]);
  const [selected, setSelected] = useState<string | null>(trends[0]?.exerciseId ?? null);
  const series = useMemo(() => (selected ? e1rmSeries(selected, sessions) : []), [selected, sessions]);
  const trend = trends.find((t) => t.exerciseId === selected);
  const prs = personalRecords.filter((p) => p.type === 'weight').slice().reverse();

  if (trends.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <ScreenHeader title="Stats" />
        <EmptyState icon={<BarChart3 size={24} />} title="No data yet" description="Complete a few sessions to see strength trends and records." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Stats" subtitle="Strength & records" />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {trends.map((t) => (
          <button
            key={t.exerciseId}
            onClick={() => setSelected(t.exerciseId)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              selected === t.exerciseId ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-content-muted'
            }`}
          >
            {exerciseName(t.exerciseId)}
          </button>
        ))}
      </div>

      {selected && trend && (
        <div className="card p-[18px]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="label-tiny">Current est. 1RM</p>
              <p className="tnum text-[26px] font-semibold text-content">{formatWeight(trend.latest, unit)}</p>
            </div>
            <Chip tone={trend.deltaKg >= 0 ? 'success' : 'danger'}>
              {trend.deltaKg >= 0 ? '↑' : '↓'} {formatWeight(Math.abs(trend.deltaKg), unit)} · {trend.deltaPct}%
            </Chip>
          </div>
          <StrengthChart data={series.map((p) => ({ label: p.label, value: p.value }))} unit={unit} />
          <p className="mt-3 text-sm text-content-muted">
            Over {trend.points} sessions, from{' '}
            <span className="tnum font-semibold text-content">{formatWeight(trend.first, unit)}</span> to{' '}
            <span className="tnum font-semibold text-content">{formatWeight(trend.latest, unit)}</span>.
          </p>
        </div>
      )}

      <section>
        <h3 className="label-tiny mb-3">All personal records</h3>
        <div className="flex flex-col gap-2.5">
          {prs.map((pr) => (
            <button
              key={pr.id}
              onClick={() => navigate(`/exercises/${pr.exerciseId}`)}
              className="card flex items-center gap-3.5 px-4 py-3 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
                <Trophy size={18} className="text-accent" />
              </span>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-content">{exerciseName(pr.exerciseId)}</p>
                <p className="tnum text-[13px] text-content-muted">{formatWeight(pr.value, unit)} × {pr.reps}</p>
              </div>
              <span className="text-xs text-content-faint">{relativeDay(pr.achievedAt)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
