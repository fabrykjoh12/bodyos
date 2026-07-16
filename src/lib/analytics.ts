import type { WorkoutSession } from '@/types';
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
    trends.push({ exerciseId: id, latest, first, deltaKg: round1(latest - first), points: series.length });
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
    const vol = s.exercises.reduce(
      (t, e) => t + e.sets.filter((x) => x.completed && !x.isWarmup).reduce((v, x) => v + setVolume(x.weightKg, x.reps), 0),
      0,
    );
    buckets.set(week, (buckets.get(week) ?? 0) + vol);
  }
  const out: VolumePoint[] = [];
  for (let w = weeks - 1; w >= 0; w -= 1) {
    out.push({ label: w === 0 ? 'This wk' : `-${w}w`, volume: Math.round(buckets.get(w) ?? 0) });
  }
  return out;
}

function completedOldestFirst(sessions: WorkoutSession[]): WorkoutSession[] {
  return [...sessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
}
