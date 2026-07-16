import { Award, Clock, Dumbbell, Layers } from 'lucide-react';
import type { PersonalRecord, Unit, WorkoutSession } from '@/types';
import { exerciseName } from '@/data/exercises';
import { formatMinutes, formatVolume, formatWeight } from '@/lib/format';
import { sessionSetCount, sessionTotalVolume } from '@/lib/prstats';
import { Stat } from '@/components/ui/Stat';

interface WorkoutSummaryProps {
  session: WorkoutSession;
  prs: PersonalRecord[];
  unit: Unit;
}

export function summaryStats(session: WorkoutSession) {
  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.completedAt ?? session.startedAt).getTime();
  const minutes = Math.max(1, Math.round((end - start) / 60000));
  return {
    minutes,
    sets: sessionSetCount(session),
    volume: sessionTotalVolume(session),
    exercises: session.exercises.filter((e) => e.sets.some((s) => s.completed && !s.isWarmup)).length,
  };
}

export function WorkoutSummary({ session, prs, unit }: WorkoutSummaryProps) {
  const stats = summaryStats(session);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Duration" value={formatMinutes(stats.minutes)} icon={<Clock size={13} />} />
        <Stat label="Sets" value={stats.sets} icon={<Layers size={13} />} />
        <Stat label="Volume" value={formatVolume(stats.volume, unit)} icon={<Dumbbell size={13} />} accent="accent" />
        <Stat label="Exercises" value={stats.exercises} icon={<Dumbbell size={13} />} />
      </div>

      {prs.length > 0 && (
        <div className="card border-success/30 bg-success-soft p-4">
          <div className="flex items-center gap-2 text-success">
            <Award size={16} />
            <span className="text-sm font-semibold">
              {prs.length} personal record{prs.length > 1 ? 's' : ''}
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {prs.map((pr) => (
              <li key={pr.id} className="tnum text-sm text-content-muted">
                {exerciseName(pr.exerciseId)} —{' '}
                {pr.type === 'weight'
                  ? `${formatWeight(pr.value, unit)} × ${pr.reps}`
                  : `${formatWeight(pr.value, unit)} est. 1RM`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
