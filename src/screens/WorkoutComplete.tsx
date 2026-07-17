import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { exerciseName } from '@/data/exercises';
import { Button } from '@/components/ui/Button';
import { WorkoutSummary } from '@/components/workout/WorkoutSummary';
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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-base px-4 pb-8 safe-top">
      <div className="flex flex-col items-center py-8 text-center animate-pop-in">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-ink shadow-accent-glow">
          <Sparkles size={30} />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-content">Workout complete</h1>
        <p className="mt-1 text-sm text-content-muted">{session.name} · nicely done</p>
      </div>

      <WorkoutSummary session={session} prs={prs} unit={unit} />

      <SessionRecap session={session} unit={unit} />

      <div className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-content">Next session plan</h2>
        <div className="flex flex-col gap-2">
          {recommendations.map((rec) => (
            <div key={rec.exerciseId}>
              <p className="mb-1 text-xs font-medium text-content-faint">{exerciseName(rec.exerciseId)}</p>
              <ProgressionRecommendation rec={rec} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Button size="xl" fullWidth onClick={() => navigate('/', { replace: true })}>
          Done
        </Button>
      </div>
    </div>
  );
}
