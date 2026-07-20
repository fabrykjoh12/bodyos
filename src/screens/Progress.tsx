import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, Ruler, TrendingUp, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { exerciseName } from '@/data/exercises';
import { e1rmSeries, muscleBalance, muscleTrainingMap, strengthTrends } from '@/lib/analytics';
import { sessionTotalVolume } from '@/lib/prstats';
import { formatVolume, formatWeight } from '@/lib/format';
import { diffInDays, relativeDay } from '@/lib/date';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Stat } from '@/components/ui/Stat';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConsistencyGrid } from '@/components/progress/ConsistencyGrid';
import { StrengthChart } from '@/components/progress/StrengthChart';
import { MuscleVolume } from '@/components/progress/MuscleVolume';
import { MuscleMap } from '@/components/exercise/MuscleMap';

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', quads: 'Legs', hamstrings: 'Hamstrings',
  glutes: 'Glutes', biceps: 'Biceps', triceps: 'Triceps', calves: 'Calves', core: 'Core', forearms: 'Forearms',
};

/** The single analytics home: strength, volume, balance, records, body. */
export function Progress() {
  const navigate = useNavigate();
  const sessions = useStore((s) => s.sessions);
  const personalRecords = useStore((s) => s.personalRecords);
  const unit = useStore((s) => s.user.settings.unit);
  const daysPerWeek = useStore((s) => s.user.daysPerWeek);

  const completed = useMemo(() => sessions.filter((s) => s.status === 'completed'), [sessions]);
  const trends = useMemo(() => strengthTrends(sessions), [sessions]);
  const [selected, setSelected] = useState<string | null>(trends[0]?.exerciseId ?? null);
  const series = useMemo(() => (selected ? e1rmSeries(selected, sessions) : []), [selected, sessions]);
  const trend = trends.find((t) => t.exerciseId === selected);

  const balance = useMemo(() => muscleBalance(sessions), [sessions]);
  const muscleHeat = useMemo(() => {
    const map = muscleTrainingMap(sessions);
    return Object.fromEntries(Object.entries(map).map(([m, v]) => [m, 0.3 + 0.7 * v]));
  }, [sessions]);

  const last4wVolume = completed
    .filter((s) => diffInDays(new Date().toISOString(), s.startedAt) < 28)
    .reduce((t, s) => t + sessionTotalVolume(s), 0);
  const plannedLast4w = daysPerWeek * 4;
  const doneLast4w = completed.filter((s) => diffInDays(new Date().toISOString(), s.startedAt) < 28).length;

  const prs = useMemo(
    () => personalRecords.filter((p) => p.type === 'weight').slice().reverse(),
    [personalRecords],
  );

  if (completed.length === 0) {
    return (
      <div className="flex flex-col gap-6 pb-4">
        <ScreenHeader title="Progress" />
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="Nothing to show yet"
          description="Finish your first workout and your strength trends, records and volume all start here."
        />
        <BodyLinks navigate={navigate} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7 pb-4">
      <ScreenHeader title="Progress" subtitle="Strength · volume · records" />

      {/* The numbers at a glance */}
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Workouts" value={completed.length} sub="completed" />
        <Stat label="Records" value={prs.length} sub="personal bests" />
        <Stat label="4-week volume" value={formatVolume(last4wVolume, unit)} sub="tonnage" />
        <Stat label="Consistency" value={`${doneLast4w}/${plannedLast4w}`} sub="last 4 weeks" />
      </div>

      {/* Strength trend per exercise */}
      {trends.length > 0 && (
        <section>
          <h3 className="label-tiny mb-3">Strength</h3>
          <div className="no-scrollbar bleed flex gap-2 overflow-x-auto pb-2">
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
            <div className="card mt-1 p-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="label-tiny">Current est. 1RM</p>
                  <p className="tnum mt-1 text-stat text-content">{formatWeight(trend.latest, unit)}</p>
                </div>
                <Chip tone={trend.deltaKg >= 0 ? 'success' : 'danger'}>
                  {trend.deltaKg >= 0 ? '↑' : '↓'} {formatWeight(Math.abs(trend.deltaKg), unit)} · {trend.deltaPct}%
                </Chip>
              </div>
              <StrengthChart data={series.map((p) => ({ label: p.label, value: p.value }))} unit={unit} />
            </div>
          )}
        </section>
      )}

      {/* Weekly volume vs growth ranges */}
      <MuscleVolume sessions={sessions} />

      {/* What you trained — the body */}
      {balance.length > 0 && (
        <section className="card p-6">
          <p className="label-tiny mb-4">Muscle balance · this week</p>
          <MuscleMap intensity={muscleHeat} legend="volume" />
          {balance[0] && (
            <p className="mt-4 text-center text-xs text-content-muted">
              Most trained:{' '}
              <span className="font-semibold text-content">{MUSCLE_LABELS[balance[0].muscle] ?? balance[0].muscle}</span>
              {' · '}
              <span className="tnum">{balance[0].sets} sets</span>
            </p>
          )}
        </section>
      )}

      {/* Consistency */}
      <section className="card p-6">
        <h3 className="label-tiny mb-4">Training consistency</h3>
        <ConsistencyGrid sessions={sessions} />
      </section>

      {/* Records */}
      {prs.length > 0 && (
        <section>
          <h3 className="label-tiny mb-1">Personal records</h3>
          <div className="row-list">
            {prs.map((pr) => (
              <button
                key={pr.id}
                onClick={() => navigate(`/exercises/${pr.exerciseId}`)}
                className="flex w-full items-center gap-3.5 py-3.5 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
                  <Trophy size={18} className="text-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-content">{exerciseName(pr.exerciseId)}</p>
                  <p className="tnum text-[13px] text-content-muted">{formatWeight(pr.value, unit)} × {pr.reps}</p>
                </div>
                <span className="shrink-0 text-xs text-content-faint">{relativeDay(pr.achievedAt)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <BodyLinks navigate={navigate} />
    </div>
  );
}

function BodyLinks({ navigate }: { navigate: (to: string) => void }) {
  return (
    <section>
      <h3 className="label-tiny mb-1">Body</h3>
      <div className="row-list">
        <button onClick={() => navigate('/progress/photos')} className="flex w-full items-center gap-3 py-3.5 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent">
            <Camera size={18} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-content">Progress photos</p>
            <p className="text-xs text-content-muted">Private timeline &amp; before/after compare</p>
          </div>
          <ChevronRight size={18} className="text-content-faint" />
        </button>
        <button onClick={() => navigate('/progress/measurements')} className="flex w-full items-center gap-3 py-3.5 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent">
            <Ruler size={18} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-content">Body measurements</p>
            <p className="text-xs text-content-muted">Body weight, waist, chest &amp; arm over time</p>
          </div>
          <ChevronRight size={18} className="text-content-faint" />
        </button>
      </div>
    </section>
  );
}
