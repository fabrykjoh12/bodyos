import type { ISODate } from '@/types';

export function now(): ISODate {
  return new Date().toISOString();
}

export function daysAgoISO(days: number): ISODate {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function diffInDays(a: ISODate, b: ISODate): number {
  const ms = startOfDay(new Date(a)).getTime() - startOfDay(new Date(b)).getTime();
  return Math.round(ms / 86_400_000);
}

/** "Today", "Yesterday", "3 days ago", or a short date. */
export function relativeDay(iso: ISODate): string {
  const d = diffInDays(now(), iso);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 14) return 'Last week';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function shortDate(iso: ISODate): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function weekdayName(index: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index] ?? '';
}

export function todayWeekday(): number {
  return new Date().getDay();
}

/** Compute a training streak (consecutive days, counting back from today) from completion dates. */
export function computeStreak(dates: ISODate[]): number {
  if (dates.length === 0) return 0;
  const dayKeys = new Set(dates.map((d) => startOfDay(new Date(d)).getTime()));
  let streak = 0;
  const cursor = startOfDay(new Date());
  // Allow the streak to hold if the user hasn't trained *today* yet but did yesterday.
  if (!dayKeys.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dayKeys.has(cursor.getTime())) return 0;
  }
  while (dayKeys.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
