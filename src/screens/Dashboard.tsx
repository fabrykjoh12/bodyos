import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Cloud, Dumbbell, Flame, Moon, Play, Plus, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useSyncStore } from '@/store/cloudSync';
import { computeStreak, diffInDays, relativeDay } from '@/lib/date';
import { resolveTodayPlan, weekdayLabel } from '@/lib/plan';
import { formatVolume } from '@/lib/format';
import { sessionSetCount, sessionTotalVolume } from '@/lib/prstats';
import { last7DaysVolume, weeklyVolume, type DayVolume } from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
import { EmptyState } from '@/components/ui/EmptyState';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
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
  const monthSessions = completed.filter(
    (s) => diffInDays(new Date().toISOString(), s.startedAt) < 30,
  ).length;
  const newPRs = personalRecords.filter(
    (p) => p.type === 'weight' && diffInDays(new Date().toISOString(), p.achievedAt) < 7,
  ).length;

  const bars: DayVolume[] = useMemo(
    () =>
      range === 'Week'
        ? last7DaysVolume(sessions)
        : weeklyVolume(sessions, 6).map((v) => ({
            day: v.label.replace('This wk', 'Now').replace('-', '').replace('w', ''),
            volume: v.volume,
          })),
    [range, sessions],
  );
  const barTotal = bars.reduce((t, b) => t + b.volume, 0);
  const barMax = Math.max(1, ...bars.map((b) => b.volume));

  const recentSessions = completed.slice(0, 3);

  const initial = (user.name || 'A').slice(0, 1).toUpperCase();

  const startSession = (templateId: string | undefined, deload: boolean) => {
    if (!templateId) return;
    store.startSession(templateId, deload);
    const created = useStore.getState().activeSession;
    if (created) navigate(`/session/${created.id}`);
  };

  const heroEyebrow =
    todayPlan.kind === 'today'
      ? 'Today’s session'
      : todayPlan.kind === 'next'
        ? 'Next up'
        : 'Suggested';
  const nextDayLabel = todayPlan.kind === 'next' ? weekdayLabel(todayPlan.weekday, weekday) : null;

  return (
    <div className="stagger flex flex-col gap-7 pt-6 pb-4">
      {/* Masthead — the date sets the scene, the name is the headline */}
      <header className="flex items-end justify-between">
        <div>
          <p className="label-tiny">{todayLabel()}</p>
          <h1 className="mt-1.5 text-display text-content">
            {greeting()},<br />
            {user.name}
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

      {/* Demo-data notice: `currentPhase` is only ever set by the demo seed,
          so this identifies accounts still carrying history the user never
          logged. One tap wipes it (keeping workouts, plan and settings). */}
      {user.currentPhase === 'Lean bulk' && sessions.length > 0 && (
        <section className="card border-caution/30 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-caution-soft text-caution">
              <Sparkles size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-content">This is demo training data</p>
              <p className="mt-0.5 text-xs leading-snug text-content-muted">
                These sessions and records are examples, not your training. Clear them to start your
                own log — your workouts and weekly plan stay.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => store.clearHistory()}
              >
                Clear demo data
              </Button>
            </div>
          </div>
        </section>
      )}

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
            <span className="block text-sm font-semibold text-content">
              Sign in to back up &amp; sync
            </span>
            <span className="block text-xs text-content-muted">
              Save your training and use it on any device
            </span>
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
          <Button
            size="xl"
            fullWidth
            className="mt-6"
            onClick={() => navigate(`/session/${activeSession.id}`)}
          >
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
            {todayPlan.next && (
              <>
                {' '}
                Next up:{' '}
                <span className="font-semibold text-content">{todayPlan.next.template.name}</span>.
              </>
            )}
          </p>
          {todayPlan.next && (
            <Button
              size="lg"
              variant="secondary"
              fullWidth
              className="mt-5"
              onClick={() => startSession(heroTemplate?.id, false)}
            >
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
            {nextDayLabel && (
              <span className="text-[11px] font-semibold text-content-faint">{nextDayLabel}</span>
            )}
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
        <StripCell
          label="Streak"
          value={streak}
          suffix="d"
          icon={streak > 0 ? <Flame size={12} className="text-accent" /> : undefined}
        />
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
                    background:
                      b.volume === 0 ? '#1E232B' : b.volume === barMax ? '#CDFB45' : '#333B45',
                    boxShadow:
                      b.volume === barMax ? '0 4px 16px -4px rgba(205,251,69,0.4)' : undefined,
                  }}
                />
                <span className="tnum text-[11px] text-content-faint">{b.day}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent sessions — the one history section; everything deeper lives
          in Progress. */}
      {recentSessions.length > 0 && (
        <section>
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="label-tiny">Recent sessions</h3>
            <button
              onClick={() => navigate('/progress')}
              className="text-[13px] font-semibold text-accent"
            >
              All progress
            </button>
          </div>
          <div className="row-list">
            {recentSessions.map((s) => {
              const prCount = personalRecords.filter(
                (p) => p.sessionId === s.id && p.type === 'weight',
              ).length;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/history/${s.id}`)}
                  className="flex w-full items-center gap-3 py-3.5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14.5px] font-bold text-content">
                        {s.name}
                      </span>
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
                    <p className="mt-0.5 text-xs text-content-faint">
                      {relativeDay(s.completedAt ?? s.startedAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tnum text-sm font-semibold text-content">
                      {formatVolume(sessionTotalVolume(s), unit)}
                    </p>
                    <p className="tnum text-[11.5px] text-content-faint">
                      {sessionSetCount(s)} sets
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {completed.length === 0 && (
        <p className="pb-2 text-center text-xs text-content-faint">
          <Dumbbell size={12} className="mr-1 inline" /> Log your first session to unlock stats.
        </p>
      )}
    </div>
  );
}

function StripCell({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon?: React.ReactNode;
}) {
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
