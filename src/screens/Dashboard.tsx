import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Camera, ChevronRight, Cloud, Dumbbell, Flame, Moon, Play, Plus, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useSyncStore } from '@/store/cloudSync';
import { exerciseName } from '@/data/exercises';
import { computeStreak, diffInDays, relativeDay } from '@/lib/date';
import { resolveTodayPlan, weekdayLabel } from '@/lib/plan';
import { formatVolume, formatWeight } from '@/lib/format';
import { sessionSetCount, sessionTotalVolume } from '@/lib/prstats';
import {
  e1rmSeries,
  last7DaysVolume,
  muscleBalance,
  muscleTrainingMap,
  strengthTrends,
  weeklyVolume,
  type DayVolume,
} from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
import { EmptyState } from '@/components/ui/EmptyState';
import { MuscleMap } from '@/components/exercise/MuscleMap';

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

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function Dashboard() {
  const navigate = useNavigate();
  const store = useStore();
  const { user, templates, sessions, weeklyPlan, personalRecords, activeSession } = store;
  const unit = user.settings.unit;
  const [range, setRange] = useState<'Week' | 'Month'>('Week');
  const syncStatus = useSyncStore((s) => s.status);
  const syncEmail = useSyncStore((s) => s.email);
  const showSignIn = syncStatus !== 'unconfigured' && syncEmail === null;

  const weekday = new Date().getDay();
  const todayPlan = useMemo(
    () => resolveTodayPlan(weeklyPlan, templates, weekday),
    [weeklyPlan, templates, weekday],
  );
  // The template the hero can start (rest days are handled separately).
  const heroTemplate =
    todayPlan.kind === 'today' || todayPlan.kind === 'next' || todayPlan.kind === 'suggested'
      ? todayPlan.template
      : todayPlan.kind === 'rest'
        ? todayPlan.next?.template
        : undefined;

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
  const muscleHeat = useMemo(() => {
    const map = muscleTrainingMap(sessions);
    // Floor trained muscles so even light work reads clearly on the map.
    return Object.fromEntries(Object.entries(map).map(([m, v]) => [m, 0.3 + 0.7 * v]));
  }, [sessions]);
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

  const startSession = (templateId: string | undefined, deload: boolean) => {
    if (!templateId) return;
    store.startSession(templateId, deload);
    const created = useStore.getState().activeSession;
    if (created) navigate(`/session/${created.id}`);
  };

  const heroEyebrow =
    todayPlan.kind === 'today' ? 'Today’s session' : todayPlan.kind === 'next' ? 'Next up' : 'Suggested';
  const nextDayLabel = todayPlan.kind === 'next' ? weekdayLabel(todayPlan.weekday, weekday) : null;

  return (
    <div className="stagger flex flex-col gap-7 pt-6 pb-4">
      {/* Masthead — the date sets the scene, the name is the headline */}
      <header className="flex items-end justify-between">
        <div>
          <p className="label-tiny">{todayLabel()}</p>
          <h1 className="mt-1.5 text-display text-content">
            {greeting()},<br />{user.name}
          </h1>
        </div>
        <button
          aria-label="Profile"
          onClick={() => navigate('/profile')}
          className="pressable mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-sm font-bold text-content shadow-card"
        >
          {initial}
        </button>
      </header>

      {/* Sign-in entry — always reachable in the content (not just the avatar,
          which the iOS status bar can cover in the installed PWA). */}
      {showSignIn && (
        <button
          onClick={() => navigate('/account')}
          className="card -my-2 flex items-center gap-3 p-3.5 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">
            <Cloud size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-content">Sign in to back up &amp; sync</span>
            <span className="block text-xs text-content-muted">Save your training and use it on any device</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-content-faint" />
        </button>
      )}

      {/* Today's session hero — honest about what's actually scheduled today */}
      {activeSession ? (
        <section className="card-hero border-accent/50 p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" /> In progress
          </span>
          <h2 className="mt-4 text-title text-content">{activeSession.name}</h2>
          <p className="mt-1.5 text-sm text-content-muted">{activeSession.focus}</p>
          <Button size="xl" fullWidth className="mt-6" onClick={() => navigate(`/session/${activeSession.id}`)}>
            <Play size={18} /> Resume session
          </Button>
        </section>
      ) : todayPlan.kind === 'none' ? (
        <EmptyState
          icon={<Plus size={28} />}
          title="No workout planned"
          description="Build a session to start training with progression."
          action={<Button onClick={() => navigate('/workouts/new')}>Create a workout</Button>}
        />
      ) : todayPlan.kind === 'rest' ? (
        <section className="card-hero p-6">
          <div className="flex items-center gap-2 text-content-muted">
            <Moon size={14} />
            <span className="label-tiny">Rest day</span>
          </div>
          <h2 className="mt-3 text-title text-content">Recovery day</h2>
          <p className="mt-2 text-sm leading-relaxed text-content-muted">
            No session scheduled today — recovery is where the growth happens.
            {todayPlan.next && <> Next up: <span className="font-semibold text-content">{todayPlan.next.template.name}</span>.</>}
          </p>
          {todayPlan.next && (
            <Button size="lg" variant="secondary" fullWidth className="mt-5" onClick={() => startSession(heroTemplate?.id, false)}>
              <Play size={16} /> Train anyway · {todayPlan.next.template.name}
            </Button>
          )}
        </section>
      ) : (
        <section className="card-hero p-6">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
              {heroEyebrow}
            </span>
            {nextDayLabel && <span className="text-[11px] font-semibold text-content-faint">{nextDayLabel}</span>}
          </div>
          <h2 className="mt-4 text-title text-content">{heroTemplate?.name}</h2>
          <p className="mt-1.5 text-sm text-content-muted">
            {heroTemplate?.focus} · {heroTemplate?.exercises.length} exercises
          </p>
          <div className="mt-6 flex items-center gap-2.5">
            <Button size="xl" fullWidth onClick={() => startSession(heroTemplate?.id, false)}>
              <Play size={18} /> Start session
            </Button>
            <Button
              size="xl"
              variant="secondary"
              className="shrink-0 px-4"
              onClick={() => startSession(heroTemplate?.id, true)}
              title="Lighter recovery session (~90% load, fewer sets)"
            >
              Deload
            </Button>
          </div>
        </section>
      )}

      {/* At a glance — counts that aren't already shown in the charts below */}
      <div className="card flex divide-x divide-line p-0">
        <StripCell label="Streak" value={streak} suffix="d" icon={streak > 0 ? <Flame size={12} className="text-accent" /> : undefined} />
        <StripCell label="Sessions" value={monthSessions} />
        <StripCell label="New PRs" value={newPRs} />
      </div>

      {/* Weekly volume */}
      {barTotal > 0 && (
        <section className="card p-6">
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <p className="label-tiny">{range === 'Week' ? 'Weekly volume' : 'Volume trend'}</p>
              <p className="tnum mt-1.5 text-stat text-content">{formatVolume(barTotal, unit)}</p>
            </div>
            <div className="flex gap-1 rounded-full bg-black/25 p-[3px]">
              {(['Week', 'Month'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ease-spring ${range === r ? 'bg-surface-3 text-content shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]' : 'text-content-muted'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-[120px] items-end gap-2">
            {bars.map((b, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div
                  className="w-full origin-bottom animate-grow-bar rounded-[6px]"
                  style={{
                    height: `${Math.max(2, (b.volume / barMax) * 100)}%`,
                    animationDelay: `${i * 45}ms`,
                    background: b.volume === 0 ? '#1E232B' : b.volume === barMax ? '#CDFB45' : '#333B45',
                    boxShadow: b.volume === barMax ? '0 4px 16px -4px rgba(205,251,69,0.4)' : undefined,
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
        <button onClick={() => navigate(`/exercises/${topTrend.exerciseId}`)} className="card p-6 text-left">
          <div className="mb-1 flex items-center justify-between">
            <span className="label-tiny">Est. 1RM · {exerciseName(topTrend.exerciseId)}</span>
            {topTrend.deltaPct > 0 && (
              <span className="flex items-center gap-1 text-success">
                <ArrowUp size={14} strokeWidth={2.6} />
                <span className="tnum text-[13px] font-semibold">{topTrend.deltaPct}%</span>
              </span>
            )}
          </div>
          <p className="tnum mb-3 mt-1.5 text-stat text-content">
            {formatWeight(topTrend.latest, unit, false)}<span className="text-[13px] text-content-faint"> {unit}</span>
          </p>
          <Sparkline values={spark.map((p) => p.value)} />
        </button>
      )}

      {/* Muscle balance — weekly training heatmap */}
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

      {/* Personal records — unboxed rows, the trophies speak */}
      {recentPRs.length > 0 && (
        <section>
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="label-tiny">Personal records</h3>
            <button onClick={() => navigate('/stats')} className="text-[13px] font-semibold text-accent">See all</button>
          </div>
          <div className="row-list">
            {recentPRs.map((pr) => (
              <div key={pr.id} className="flex items-center gap-3.5 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
                  <Trophy size={18} className="text-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-content">{exerciseName(pr.exerciseId)}</p>
                  <p className="tnum text-[13px] text-content-muted">{formatWeight(pr.value, unit)} × {pr.reps}</p>
                </div>
                <span className="shrink-0 text-xs text-content-faint">{relativeDay(pr.achievedAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <section>
          <h3 className="label-tiny mb-1">Recent sessions</h3>
          <div className="row-list">
            {recentSessions.map((s) => {
              const prCount = personalRecords.filter((p) => p.sessionId === s.id && p.type === 'weight').length;
              return (
                <div key={s.id} className="flex items-center gap-3 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14.5px] font-bold text-content">{s.name}</span>
                      {s.isDeload ? (
                        <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-content-muted">
                          Deload
                        </span>
                      ) : prCount > 0 ? (
                        <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                          {prCount} PR
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-content-faint">{relativeDay(s.completedAt ?? s.startedAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
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
      <button onClick={() => navigate('/progress')} className="card flex items-center gap-3 p-4 text-left">
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

function StripCell({ label, value, suffix, icon }: { label: string; value: number; suffix?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex-1 px-3 py-4 text-center">
      <p className="tnum flex items-center justify-center gap-1 text-[24px] font-semibold leading-none tracking-[-0.02em] text-content">
        {icon}
        <CountUp value={value} duration={700} />
        {suffix && <span className="text-[13px] font-medium text-content-faint">{suffix}</span>}
      </p>
      <p className="mt-2.5 label-tiny">{label}</p>
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
  const areaPts = `0,90 ${pts.join(' ')} 300,90`;
  return (
    <svg viewBox="0 0 300 90" preserveAspectRatio="none" style={{ width: '100%', height: 90, overflow: 'visible' }}>
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CDFB45" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#CDFB45" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#sparkfill)" points={areaPts} />
      <polyline fill="none" stroke="#CDFB45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts.join(' ')} />
      <circle cx={last[0]} cy={last[1]} r="4" fill="#CDFB45" stroke="#171B21" strokeWidth="2" />
    </svg>
  );
}
