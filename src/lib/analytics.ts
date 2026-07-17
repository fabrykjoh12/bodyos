import type { MuscleGroup, WorkoutSession } from '@/types';
import { getExercise } from '@/data/exercises';
import { bestE1RM, round1, setVolume } from './volume';
import { shortDate } from './date';

export interface SeriesPoint {
  label: string;
  value: number;
  date: string;
}

/** Estimated-1RM series over time for one exercise (oldest → newest). */
export function e1rmSeries(exerciseId: string, sessions: WorkoutSession[]): SeriesPoint[] {
  return completedOldestFirst(sessions)
    .map((s) => {
      const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex) return null;
      const working = ex.sets.filter((set) => set.completed && !set.isWarmup);
      if (working.length === 0) return null;
      const value = round1(bestE1RM(working.map((w) => ({ weightKg: w.weightKg, reps: w.reps }))));
      return { label: shortDate(s.startedAt), value, date: s.startedAt };
    })
    .filter((p): p is SeriesPoint => p !== null);
}

/** Top-set weight series over time for one exercise. */
export function topWeightSeries(exerciseId: string, sessions: WorkoutSession[]): SeriesPoint[] {
  return completedOldestFirst(sessions)
    .map((s) => {
      const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex) return null;
      const working = ex.sets.filter((set) => set.completed && !set.isWarmup);
      if (working.length === 0) return null;
      return { label: shortDate(s.startedAt), value: Math.max(...working.map((w) => w.weightKg)), date: s.startedAt };
    })
    .filter((p): p is SeriesPoint => p !== null);
}

export interface ExerciseTrend {
  exerciseId: string;
  latest: number;
  first: number;
  deltaKg: number;
  deltaPct: number;
  points: number;
}

/** Which exercises have the most e1RM history, with their gain. */
export function strengthTrends(sessions: WorkoutSession[]): ExerciseTrend[] {
  const ids = new Set<string>();
  for (const s of sessions) for (const e of s.exercises) ids.add(e.exerciseId);
  const trends: ExerciseTrend[] = [];
  for (const id of ids) {
    const series = e1rmSeries(id, sessions);
    if (series.length < 2) continue;
    const first = series[0]!.value;
    const latest = series[series.length - 1]!.value;
    trends.push({
      exerciseId: id,
      latest,
      first,
      deltaKg: round1(latest - first),
      deltaPct: first > 0 ? Math.round(((latest - first) / first) * 100) : 0,
      points: series.length,
    });
  }
  return trends.sort((a, b) => b.deltaKg - a.deltaKg);
}

export interface VolumePoint {
  label: string;
  volume: number;
}

/** Weekly training volume for the last `weeks` weeks. */
export function weeklyVolume(sessions: WorkoutSession[], weeks = 6): VolumePoint[] {
  const buckets = new Map<number, number>();
  const nowMs = Date.now();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const ageDays = (nowMs - new Date(s.startedAt).getTime()) / 86_400_000;
    const week = Math.floor(ageDays / 7);
    if (week >= weeks) continue;
    buckets.set(week, (buckets.get(week) ?? 0) + volumeOf(s));
  }
  const out: VolumePoint[] = [];
  for (let w = weeks - 1; w >= 0; w -= 1) {
    out.push({ label: w === 0 ? 'This wk' : `-${w}w`, volume: Math.round(buckets.get(w) ?? 0) });
  }
  return out;
}

export interface DayVolume {
  day: string;
  volume: number;
}

/** Volume for each of the last 7 calendar days (oldest→newest). */
export function last7DaysVolume(sessions: WorkoutSession[]): DayVolume[] {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const byDay = new Map<number, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const d = new Date(s.startedAt);
    d.setHours(0, 0, 0, 0);
    const ageDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);
    if (ageDays < 0 || ageDays > 6) continue;
    byDay.set(ageDays, (byDay.get(ageDays) ?? 0) + volumeOf(s));
  }
  const out: DayVolume[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    out.push({ day: letters[date.getDay()]!, volume: Math.round(byDay.get(i) ?? 0) });
  }
  return out;
}

export interface MuscleShare {
  muscle: MuscleGroup;
  sets: number;
  pct: number; // share of max group (0..100), for bar widths
}

/** Working-set count per primary muscle group over the last `days` days. */
function muscleSetCounts(sessions: WorkoutSession[], days: number): Map<MuscleGroup, number> {
  const counts = new Map<MuscleGroup, number>();
  const nowMs = Date.now();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const ageDays = (nowMs - new Date(s.startedAt).getTime()) / 86_400_000;
    if (ageDays > days) continue;
    for (const ex of s.exercises) {
      const muscle = getExercise(ex.exerciseId)?.primaryMuscle;
      if (!muscle) continue;
      const sets = ex.sets.filter((x) => x.completed && !x.isWarmup).length;
      if (sets > 0) counts.set(muscle, (counts.get(muscle) ?? 0) + sets);
    }
  }
  return counts;
}

export function muscleBalance(sessions: WorkoutSession[], days = 7): MuscleShare[] {
  const entries = [...muscleSetCounts(sessions, days).entries()].sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] ?? 1;
  return entries.slice(0, 6).map(([muscle, sets]) => ({
    muscle,
    sets,
    pct: Math.round((sets / max) * 100),
  }));
}

/** Per-muscle training intensity (0..1, relative to the most-trained) for a body heatmap. */
export function muscleTrainingMap(
  sessions: WorkoutSession[],
  days = 7,
): Partial<Record<MuscleGroup, number>> {
  const counts = muscleSetCounts(sessions, days);
  const max = Math.max(1, ...counts.values());
  const out: Partial<Record<MuscleGroup, number>> = {};
  counts.forEach((sets, muscle) => {
    out[muscle] = sets / max;
  });
  return out;
}

function volumeOf(s: WorkoutSession): number {
  return s.exercises.reduce(
    (t, e) => t + e.sets.filter((x) => x.completed && !x.isWarmup).reduce((v, x) => v + setVolume(x.weightKg, x.reps), 0),
    0,
  );
}

function completedOldestFirst(sessions: WorkoutSession[]): WorkoutSession[] {
  return [...sessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
}
