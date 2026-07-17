import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Camera, ChevronRight, Dumbbell, Play, Plus, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { exerciseName } from '@/data/exercises';
import { computeStreak, diffInDays, relativeDay } from '@/lib/date';
import { formatVolume, formatWeight } from '@/lib/format';
import { sessionSetCount, sessionTotalVolume } from '@/lib/prstats';
import {
  e1rmSeries,
  last7DaysVolume,
  muscleBalance,
  strengthTrends,
  weeklyVolume,
  type DayVolume,
} from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', quads: 'Legs', hamstrings: 'Hamstrings',
  glutes: 'Glutes', biceps: 'Biceps', triceps: 'Triceps', calves: 'Calves', core: 'Core', forearms: 'Forearms',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const navigate = useNavigate();
  const store = useStore();
  const { user, templates, sessions, weeklyPlan, personalRecords, activeSession } = store;
  const unit = user.settings.unit;
  const [range, setRange] = useState<'Week' | 'Month'>('Week');

  const todayTemplate = useMemo(() => {
    const wd = new Date().getDay();
    const planned = weeklyPlan[wd];
    const fromPlan = planned ? templates.find((t) => t.id === planned) : undefined;
    if (fromPlan) return fromPlan;
    for (let i = 1; i <= 7; i += 1) {
      const id = weeklyPlan[(wd + i) % 7];
      const t = id ? templates.find((x) => x.id === id) : undefined;
      if (t) return t;
    }
    return templates[0];
  }, [weeklyPlan, templates]);

  const completed = sessions.filter((s) => s.status === 'completed');
  const streak = computeStreak(store.streakDates);
  const monthSessions = completed.filter((s) => diffInDays(new Date().toISOString(), s.startedAt) < 30).length;
  const newPRs = personalRecords.filter(
    (p) => p.type === 'weight' && diffInDays(new Date().toISOString(), p.achievedAt) < 7,
  ).length;

  const trends = useMemo(() => strengthTrends(sessions), [sessions]);
  const topTrend = trends[0];
  const spark = useMemo(
    () => (topTrend ? e1rmSeries(topTrend.exerciseId, sessions) : []),
    [topTrend, sessions],
  );
  const balance = useMemo(() => muscleBalance(sessions), [sessions]);
  const bars: DayVolume[] = useMemo(
    () =>
      range === 'Week'
        ? last7DaysVolume(sessions)
        : weeklyVolume(sessions, 6).map((v) => ({ day: v.label.replace('This wk', 'Now').replace('-', '').replace('w', ''), volume: v.volume })),
    [range, sessions],
  );
  const barTotal = bars.reduce((t, b) => t + b.volume, 0);
  const barMax = Math.max(1, ...bars.map((b) => b.volume));

  const recentPRs = personalRecords.filter((p) => p.type === 'weight').slice(-3).reverse();
  const recentSessions = completed.slice(0, 3);

  const initial = (user.name || 'A').slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col gap-3 pt-3">
      {/* Header */}
      <header className="mb-1 flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-content-muted">{greeting()}</p>
          <h1 className="mt-0.5 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-content">
            {user.name}
          </h1>
        </div>
        <button
          aria-label="Profile"
          onClick={() => navigate('/profile')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-content"
        >
          {initial}
        </button>
      </header>

      {/* Today's session hero */}
      {todayTemplate ? (
        <section className="rounded-2xl border border-accent bg-surface p-[18px] shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink">
              Today’s session
            </span>
            {store.streakDates[0] && (
              <span className="tnum text-[11px] text-content-faint">
                Last {relativeDay(store.streakDates[0]).toLowerCase()}
              </span>
            )}
          </div>
          <h2 className="text-[26px] font-extrabold tracking-[-0.03em] text-content">{todayTemplate.name}</h2>
          <p className="mt-1 text-sm text-content-muted">
            {todayTemplate.focus} · {todayTemplate.exercises.length} exercises
          </p>
          {activeSession ? (
            <Button size="xl" fullWidth className="mt-4" onClick={() => navigate(`/session/${activeSession.id}`)}>
              <Play size={18} /> Resume session
            </Button>
          ) : (
            <Button
              size="xl"
              fullWidth
              className="mt-4"
              onClick={() => {
                store.startSession(todayTemplate.id);
                const created = useStore.getState().activeSession;
                if (created) navigate(`/session/${created.id}`);
              }}
            >
              <Play size={18} /> Start session
            </Button>
          )}
        </section>
      ) : (
        <EmptyState
          icon={<Plus size={24} />}
          title="No workout planned"
          description="Build a session to start training with progression."
          action={<Button onClick={() => navigate('/workouts/new')}>Create a workout</Button>}
        />
      )}

      {/* At a glance — counts that aren't already shown in the charts below */}
      <div className="card flex divide-x divide-line p-0">
        <StripCell label="Streak" value={String(streak)} suffix="d" />
        <StripCell label="Sessions" value={String(monthSessions)} />
        <StripCell label="New PRs" value={String(newPRs)} />
      </div>

      {/* Weekly volume */}
      {barTotal > 0 && (
        <section className="card p-[18px]">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <p className="label-tiny">{range === 'Week' ? 'Weekly volume' : 'Volume trend'}</p>
              <p className="tnum mt-1 text-[26px] font-semibold tracking-[-0.02em] text-content">
                {formatVolume(barTotal, unit)}
              </p>
            </div>
            <div className="flex gap-1 rounded-lg bg-surface-2 p-[3px]">
              {(['Week', 'Month'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${range === r ? 'bg-surface-3 text-content' : 'text-content-muted'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-[120px] items-end gap-2">
            {bars.map((b, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className="w-full origin-bottom animate-grow-bar rounded-[5px]"
                  style={{
                    height: `${Math.max(2, (b.volume / barMax) * 100)}%`,
                    background: b.volume === 0 ? '#21262C' : b.volume === barMax ? '#CDFB45' : '#363D45',
                  }}
                />
                <span className="tnum text-[11px] text-content-faint">{b.day}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Est 1RM sparkline */}
      {topTrend && spark.length >= 2 && (
        <button onClick={() => navigate(`/exercises/${topTrend.exerciseId}`)} className="card p-[18px] text-left">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[15px] font-bold text-content">Est. 1RM · {exerciseName(topTrend.exerciseId)}</span>
            {topTrend.deltaPct > 0 && (
              <span className="flex items-center gap-1 text-success">
                <ArrowUp size={14} strokeWidth={2.6} />
                <span className="tnum text-[13px] font-semibold">{topTrend.deltaPct}%</span>
              </span>
            )}
          </div>
          <p className="tnum mb-2 text-[22px] font-semibold text-content">
            {formatWeight(topTrend.latest, unit, false)}<span className="text-[13px] text-content-faint"> {unit}</span>
          </p>
          <Sparkline values={spark.map((p) => p.value)} />
        </button>
      )}

      {/* Muscle balance */}
      {balance.length > 0 && (
        <section className="card p-[18px]">
          <p className="label-tiny mb-4">Muscle balance · this week</p>
          <div className="flex flex-col gap-3">
            {balance.map((m) => (
              <div key={m.muscle}>
                <div className="mb-1.5 flex justify-between">
                  <span className="text-[13px] font-semibold text-content-muted">{MUSCLE_LABELS[m.muscle] ?? m.muscle}</span>
                  <span className="tnum text-xs text-content-faint">{m.sets} sets</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded bg-surface-2">
                  <div
                    className="h-full rounded"
                    style={{ width: `${m.pct}%`, background: m.pct >= 80 ? '#CDFB45' : '#363D45' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Personal records */}
      {recentPRs.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="label-tiny">Personal records</h3>
            <button onClick={() => navigate('/stats')} className="text-[13px] font-semibold text-accent">See all</button>
          </div>
          <div className="flex flex-col gap-3">
            {recentPRs.map((pr) => (
              <div key={pr.id} className="card flex items-center gap-3.5 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
                  <Trophy size={19} className="text-accent" />
                </span>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-content">{exerciseName(pr.exerciseId)}</p>
                  <p className="tnum text-[13px] text-content-muted">{formatWeight(pr.value, unit)} × {pr.reps}</p>
                </div>
                <span className="text-xs text-content-faint">{relativeDay(pr.achievedAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <section>
          <h3 className="label-tiny mb-3">Recent sessions</h3>
          <div className="flex flex-col gap-2.5">
            {recentSessions.map((s) => {
              const prCount = personalRecords.filter((p) => p.sessionId === s.id && p.type === 'weight').length;
              return (
                <div key={s.id} className="card flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-bold text-content">{s.name}</span>
                      {prCount > 0 && (
                        <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-accent">
                          {prCount} PR
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-content-faint">{relativeDay(s.completedAt ?? s.startedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-sm font-semibold text-content">{formatVolume(sessionTotalVolume(s), unit)}</p>
                    <p className="tnum text-[11.5px] text-content-faint">{sessionSetCount(s)} sets</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Photo reminder */}
      <button onClick={() => navigate('/progress')} className="card mb-2 flex items-center gap-3 p-4 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <Camera size={18} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-content">Progress photos</p>
          <p className="text-xs text-content-muted">Private timeline & before/after</p>
        </div>
        <ChevronRight size={18} className="text-content-faint" />
      </button>

      {completed.length === 0 && (
        <p className="pb-2 text-center text-xs text-content-faint">
          <Dumbbell size={12} className="mr-1 inline" /> Log your first session to unlock stats.
        </p>
      )}
    </div>
  );
}

function StripCell({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="flex-1 px-3 py-3.5 text-center">
      <p className="tnum text-[22px] font-semibold leading-none tracking-[-0.02em] text-content">
        {value}
        {suffix && <span className="text-[13px] font-medium text-content-faint">{suffix}</span>}
      </p>
      <p className="mt-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-content-faint">{label}</p>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 2;
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 300;
    const y = 90 - ((v - min) / span) * 80;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1]!.split(',');
  return (
    <svg viewBox="0 0 300 90" preserveAspectRatio="none" style={{ width: '100%', height: 90, overflow: 'visible' }}>
      <polyline fill="none" stroke="#CDFB45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts.join(' ')} />
      <circle cx={last[0]} cy={last[1]} r="4" fill="#CDFB45" stroke="#1B1F24" strokeWidth="2" />
    </svg>
  );
}
