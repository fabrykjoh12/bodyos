import type { ID, WorkoutTemplate } from '@/types';

/**
 * What the home hero should say about *today*, honestly:
 * - `today`     — a template is planned for this weekday
 * - `rest`      — this weekday is an explicit rest day (with the next session, if any)
 * - `next`      — nothing planned today, but a later day has a session
 * - `suggested` — no weekly plan at all; fall back to the first template
 * - `none`      — no templates exist yet
 */
export type TodayPlan =
  | { kind: 'none' }
  | { kind: 'today'; template: WorkoutTemplate }
  | { kind: 'rest'; next?: { template: WorkoutTemplate; weekday: number } }
  | { kind: 'next'; template: WorkoutTemplate; weekday: number }
  | { kind: 'suggested'; template: WorkoutTemplate };

/** Resolve the honest "today" state from the weekly plan. `weekday`: 0=Sun..6=Sat. */
export function resolveTodayPlan(
  weeklyPlan: Record<number, ID | null>,
  templates: WorkoutTemplate[],
  weekday: number,
): TodayPlan {
  if (templates.length === 0) return { kind: 'none' };
  const byId = (id: ID | null | undefined) => (id ? templates.find((t) => t.id === id) : undefined);

  const todays = byId(weeklyPlan[weekday]);
  if (todays) return { kind: 'today', template: todays };

  let next: { template: WorkoutTemplate; weekday: number } | undefined;
  for (let i = 1; i <= 7; i += 1) {
    const d = (weekday + i) % 7;
    const t = byId(weeklyPlan[d]);
    if (t) {
      next = { template: t, weekday: d };
      break;
    }
  }

  const isRestToday =
    Object.prototype.hasOwnProperty.call(weeklyPlan, weekday) && weeklyPlan[weekday] === null;
  if (isRestToday) return { kind: 'rest', next };
  if (next) return { kind: 'next', template: next.template, weekday: next.weekday };
  return { kind: 'suggested', template: templates[0]! };
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Tomorrow" when adjacent, otherwise the weekday name. */
export function weekdayLabel(target: number, today: number): string {
  if (target === (today + 1) % 7) return 'Tomorrow';
  return WEEKDAY_NAMES[target] ?? '';
}
