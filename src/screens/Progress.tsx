import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, LineChart, Ruler, TrendingUp } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { exerciseName } from '@/data/exercises';
import { strengthTrends } from '@/lib/analytics';
import { sessionTotalVolume } from '@/lib/prstats';
import { formatVolume, formatWeight } from '@/lib/format';
import { diffInDays } from '@/lib/date';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/EmptyState';

export function Progress() {
  const navigate = useNavigate();
  const sessions = useStore((s) => s.sessions);
  const personalRecords = useStore((s) => s.personalRecords);
  const unit = useStore((s) => s.user.settings.unit);
  const daysPerWeek = useStore((s) => s.user.daysPerWeek);

  const completed = sessions.filter((s) => s.status === 'completed');
  const trends = useMemo(() => strengthTrends(sessions).slice(0, 4), [sessions]);

  const last4wVolume = completed
    .filter((s) => diffInDays(new Date().toISOString(), s.startedAt) < 28)
    .reduce((t, s) => t + sessionTotalVolume(s), 0);
  const plannedLast4w = daysPerWeek * 4;
  const doneLast4w = completed.filter((s) => diffInDays(new Date().toISOString(), s.startedAt) < 28).length;

  if (completed.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <ScreenHeader title="Progress" />
        <EmptyState
          icon={<TrendingUp size={24} />}
          title="No data yet"
          description="Complete your first workout to start tracking strength and volume."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Progress" subtitle="Strength, volume & photos" />

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Workouts" value={completed.length} sub="completed" />
        <Stat label="Records" value={personalRecords.filter((p) => p.type === 'weight').length} sub="personal bests" accent="caution" />
        <Stat label="4-week volume" value={formatVolume(last4wVolume, unit)} accent="accent" />
        <Stat label="Consistency" value={`${doneLast4w}/${plannedLast4w}`} sub="last 4 weeks" />
      </div>

      {/* Plain-language summary */}
      {trends[0] && trends[0].deltaKg > 0 && (
        <div className="card border-success/25 bg-success-soft p-4">
          <p className="text-sm text-content">
            <span className="font-semibold text-success">{exerciseName(trends[0].exerciseId)}</span> estimated 1RM is up{' '}
            <span className="tnum font-semibold">{formatWeight(trends[0].deltaKg, unit)}</span> over your last {trends[0].points} sessions.
          </p>
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content">Strength trends</h3>
          <button onClick={() => navigate('/progress/strength')} className="flex items-center text-xs font-medium text-accent">
            Details <ChevronRight size={14} />
          </button>
        </div>
        <div className="card divide-y divide-line">
          {trends.map((t) => (
            <button
              key={t.exerciseId}
              onClick={() => navigate(`/exercises/${t.exerciseId}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <LineChart size={16} className="text-accent" />
              <span className="flex-1 text-sm text-content">{exerciseName(t.exerciseId)}</span>
              <span className="tnum text-sm font-semibold text-content">{formatWeight(t.latest, unit)}</span>
              <span className={`tnum text-xs font-semibold ${t.deltaKg >= 0 ? 'text-success' : 'text-danger'}`}>
                {t.deltaKg >= 0 ? '↑' : '↓'} {formatWeight(Math.abs(t.deltaKg), unit, false)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <button onClick={() => navigate('/progress/photos')} className="card flex items-center gap-3 p-4 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <Camera size={18} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-content">Progress photos</p>
          <p className="text-xs text-content-muted">Private timeline & before/after compare</p>
        </div>
        <ChevronRight size={18} className="text-content-faint" />
      </button>

      <button onClick={() => navigate('/progress/measurements')} className="card flex items-center gap-3 p-4 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <Ruler size={18} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-content">Body measurements</p>
          <p className="text-xs text-content-muted">Body weight, waist, chest & arm over time</p>
        </div>
        <ChevronRight size={18} className="text-content-faint" />
      </button>
    </div>
  );
}
