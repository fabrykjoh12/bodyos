import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Award, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { exerciseName } from '@/data/exercises';
import { formatVolume, formatWeight } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
import { summaryStats } from '@/components/workout/WorkoutSummary';
import { SessionRecap } from '@/components/workout/SessionRecap';
import { ProgressionRecommendation } from '@/components/workout/ProgressionRecommendation';

export function WorkoutComplete() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useStore((s) => s.sessions.find((x) => x.id === id));
  const unit = useStore((s) => s.user.settings.unit);
  const personalRecords = useStore((s) => s.personalRecords);
  const prs = useMemo(() => personalRecords.filter((p) => p.sessionId === id), [personalRecords, id]);

  const recommendations = useMemo(
    () =>
      session?.exercises
        .map((e) => e.recommendation)
        .filter((r): r is NonNullable<typeof r> => Boolean(r)) ?? [],
    [session],
  );

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-content-muted">Workout not found.</p>
        <Button onClick={() => navigate('/')}>Home</Button>
      </div>
    );
  }

  const stats = summaryStats(session);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-base px-[var(--gutter)] pb-8 safe-top">
      <div className="stagger flex flex-col gap-7">
        {/* The cinematic beat: mark → verdict → the work, counted up */}
        <div className="flex flex-col items-center pt-14 text-center">
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent text-ink shadow-accent-glow">
            <Check size={38} strokeWidth={3} />
            <span className="absolute inset-0 rounded-full bg-accent animate-ping-once" aria-hidden />
          </span>
          <p className="label-tiny mt-8">{session.name}</p>
          <h1 className="mt-2 text-display text-content">
            {session.isDeload ? 'Deload done' : 'Session complete'}
          </h1>
          <p className="mt-2 text-sm text-content-muted">
            {session.isDeload ? 'Lighter on purpose — recover well.' : 'Every set is in the book.'}
          </p>
        </div>

        {/* The work, in numbers — volume is the headline */}
        <section className="card-hero p-6 text-center">
          <p className="label-tiny">Total volume</p>
          <p className="mt-2 text-[3rem] font-bold leading-none tracking-[-0.03em] text-content">
            <CountUp value={stats.volume} duration={1300} delay={250} format={(v) => formatVolume(v, unit)} />
          </p>
          <div className="mt-6 flex divide-x divide-line border-t border-line pt-5">
            <CompleteCell label="Minutes" value={stats.minutes} delay={400} />
            <CompleteCell label="Sets" value={stats.sets} delay={500} />
            <CompleteCell label="Exercises" value={stats.exercises} delay={600} />
          </div>
        </section>

        {/* PRs get their own glowing moment */}
        {prs.length > 0 && (
          <section className="shimmer-once card rounded-3xl border-accent/40 bg-accent-soft p-5 shadow-accent-glow">
            <div className="flex items-center gap-2 text-accent">
              <Award size={17} />
              <span className="label-tiny text-accent">
                {prs.length} personal record{prs.length > 1 ? 's' : ''}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {prs.map((pr) => (
                <li key={pr.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-bold text-content">{exerciseName(pr.exerciseId)}</span>
                  <span className="tnum shrink-0 text-sm text-content-muted">
                    {pr.type === 'weight'
                      ? `${formatWeight(pr.value, unit)} × ${pr.reps}`
                      : `${formatWeight(pr.value, unit)} est. 1RM`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <SessionRecap session={session} unit={unit} />

        {recommendations.length > 0 && (
          <div>
            <h2 className="label-tiny mb-3">Next session plan</h2>
            <div className="flex flex-col gap-2">
              {recommendations.map((rec) => (
                <div key={rec.exerciseId}>
                  <p className="mb-1 text-xs font-medium text-content-faint">{exerciseName(rec.exerciseId)}</p>
                  <ProgressionRecommendation rec={rec} />
                </div>
              ))}
            </div>
          </div>
        )}

        <Button size="xl" fullWidth onClick={() => navigate('/', { replace: true })}>
          Done
        </Button>
      </div>
    </div>
  );
}

function CompleteCell({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div className="flex-1">
      <p className="tnum text-[1.6rem] font-semibold leading-none tracking-[-0.02em] text-content">
        <CountUp value={value} duration={900} delay={delay} />
      </p>
      <p className="label-tiny mt-2">{label}</p>
    </div>
  );
}
