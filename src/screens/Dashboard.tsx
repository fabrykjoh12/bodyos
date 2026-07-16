import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, CalendarClock, Camera, ChevronRight, Flame, Play, Plus, Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { exerciseName } from '@/data/exercises';
import { computeStreak, relativeDay, todayWeekday, diffInDays } from '@/lib/date';
import { formatWeight } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/EmptyState';

export function Dashboard() {
  const navigate = useNavigate();
  const store = useStore();
  const { user, templates, sessions, weeklyPlan, personalRecords, activeSession } = store;
  const unit = user.settings.unit;

  const todayTemplate = useMemo(() => {
    const planned = weeklyPlan[todayWeekday()];
    const fromPlan = planned ? templates.find((t) => t.id === planned) : undefined;
    if (fromPlan) return fromPlan;
    // Fallback: the next planned template this week, else the first template.
    for (let i = 1; i <= 7; i += 1) {
      const wd = (todayWeekday() + i) % 7;
      const id = weeklyPlan[wd];
      const t = id ? templates.find((x) => x.id === id) : undefined;
      if (t) return t;
    }
    return templates[0];
  }, [weeklyPlan, templates]);

  const streak = computeStreak(store.streakDates);
  const weekCount = sessions.filter(
    (s) => s.status === 'completed' && diffInDays(new Date().toISOString(), s.startedAt) < 7,
  ).length;
  const recentPRs = personalRecords
    .filter((p) => p.type === 'weight')
    .slice(-3)
    .reverse();
  const lastSession = sessions.find((s) => s.status === 'completed');
  const nextPhotoDays = store.nextPhotoDue ? diffInDays(store.nextPhotoDue, new Date().toISOString()) : null;

  const mainObjective = todayTemplate?.exercises[0]
    ? `Progress ${exerciseName(todayTemplate.exercises[0].exerciseId)}`
    : 'Build your first session';

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-content-muted">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-content">
            Ready to train{user.name && user.name !== 'Athlete' ? `, ${user.name}` : ''}?
          </h1>
        </div>
        {user.currentPhase && (
          <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-content-muted">
            {user.currentPhase}
          </span>
        )}
      </div>

      {/* Primary card — one obvious action */}
      {todayTemplate ? (
        <section className="card-2 relative overflow-hidden p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
          <p className="label-tiny text-accent">Today’s workout</p>
          <h2 className="mt-1 text-2xl font-bold text-content">{todayTemplate.name}</h2>
          <p className="mt-0.5 text-sm text-content-muted">{todayTemplate.focus}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-content-faint">
            <span className="rounded-lg bg-surface px-2 py-1">~{todayTemplate.estimatedMinutes} min</span>
            <span className="rounded-lg bg-surface px-2 py-1">{todayTemplate.exercises.length} exercises</span>
            <span className="flex items-center gap-1 rounded-lg bg-surface px-2 py-1">
              <Zap size={12} className="text-accent" /> {mainObjective}
            </span>
          </div>
          <div className="mt-5 flex gap-2">
            {activeSession ? (
              <Button size="lg" fullWidth onClick={() => navigate(`/session/${activeSession.id}`)}>
                <Play size={18} /> Resume workout
              </Button>
            ) : (
              <Button
                size="lg"
                fullWidth
                onClick={() => {
                  store.startSession(todayTemplate.id);
                  // startSession sets activeSession synchronously; grab the id.
                  const created = useStore.getState().activeSession;
                  if (created) navigate(`/session/${created.id}`);
                }}
              >
                <Play size={18} /> Start Workout
              </Button>
            )}
            <Button size="lg" variant="secondary" onClick={() => navigate(`/workouts/${todayTemplate.id}`)}>
              View
            </Button>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<Plus size={24} />}
          title="No workout planned today"
          description="Start a saved workout or build a new session to begin."
          action={<Button onClick={() => navigate('/workouts/new')}>Create a workout</Button>}
        />
      )}

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Streak" value={`${streak}`} sub={streak === 1 ? 'day' : 'days'} icon={<Flame size={13} />} accent={streak > 0 ? 'success' : 'default'} />
        <Stat label="This week" value={`${weekCount}`} sub={`of ${user.daysPerWeek} planned`} icon={<CalendarClock size={13} />} />
      </div>

      {/* Recent PRs */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content">Recent records</h3>
          <button onClick={() => navigate('/progress/strength')} className="flex items-center text-xs font-medium text-accent">
            Strength <ChevronRight size={14} />
          </button>
        </div>
        {recentPRs.length > 0 ? (
          <div className="card divide-y divide-line">
            {recentPRs.map((pr) => (
              <div key={pr.id} className="flex items-center gap-3 px-4 py-3">
                <Award size={16} className="text-caution" />
                <span className="flex-1 text-sm text-content">{exerciseName(pr.exerciseId)}</span>
                <span className="tnum text-sm font-semibold text-content">
                  {formatWeight(pr.value, unit)} × {pr.reps}
                </span>
                <span className="text-xs text-content-faint">{relativeDay(pr.achievedAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="card px-4 py-3 text-sm text-content-faint">Log a workout to set your first record.</p>
        )}
      </section>

      {/* Photo reminder */}
      <button
        onClick={() => navigate('/progress/photos')}
        className="card flex items-center gap-3 p-4 text-left"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <Camera size={18} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-content">Progress photo</p>
          <p className="text-xs text-content-muted">
            {nextPhotoDays === null
              ? 'Set up your private photo timeline'
              : nextPhotoDays <= 0
                ? 'Due now — capture this week’s photo'
                : `Next due in ${nextPhotoDays} days`}
          </p>
        </div>
        <ChevronRight size={18} className="text-content-faint" />
      </button>

      {lastSession && (
        <p className="pb-2 text-center text-xs text-content-faint">
          Last trained {relativeDay(lastSession.completedAt ?? lastSession.startedAt)} · {lastSession.name}
        </p>
      )}
    </div>
  );
}
