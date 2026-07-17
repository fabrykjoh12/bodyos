import { describe, expect, it } from 'vitest';
import { resolveTodayPlan, weekdayLabel } from './plan';
import type { WorkoutTemplate } from '@/types';

function tpl(id: string): WorkoutTemplate {
  return {
    id,
    name: id,
    focus: 'Focus',
    split: 'custom',
    exercises: [],
    estimatedMinutes: 45,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const push = tpl('push');
const pull = tpl('pull');
const templates = [push, pull];

describe('resolveTodayPlan', () => {
  it('returns none when there are no templates', () => {
    expect(resolveTodayPlan({}, [], 3)).toEqual({ kind: 'none' });
  });

  it("returns today's planned template", () => {
    const plan = resolveTodayPlan({ 3: 'push' }, templates, 3);
    expect(plan).toEqual({ kind: 'today', template: push });
  });

  it('returns a rest day when the weekday is explicitly null', () => {
    // Wed rest, Thu = pull.
    const plan = resolveTodayPlan({ 3: null, 4: 'pull' }, templates, 3);
    expect(plan.kind).toBe('rest');
    if (plan.kind === 'rest') expect(plan.next).toEqual({ template: pull, weekday: 4 });
  });

  it('returns rest with no next when nothing else is planned', () => {
    expect(resolveTodayPlan({ 3: null }, templates, 3)).toEqual({ kind: 'rest', next: undefined });
  });

  it('returns the next upcoming session when today is unplanned', () => {
    // Today (Mon=1) unplanned, next planned is Fri=5.
    const plan = resolveTodayPlan({ 5: 'push' }, templates, 1);
    expect(plan).toEqual({ kind: 'next', template: push, weekday: 5 });
  });

  it('wraps around the week to find the next session', () => {
    // Today Sat=6 unplanned; only Mon=1 is planned → wraps.
    const plan = resolveTodayPlan({ 1: 'pull' }, templates, 6);
    expect(plan).toEqual({ kind: 'next', template: pull, weekday: 1 });
  });

  it('suggests the first template when no plan exists at all', () => {
    expect(resolveTodayPlan({}, templates, 2)).toEqual({ kind: 'suggested', template: push });
  });
});

describe('weekdayLabel', () => {
  it('says Tomorrow for the adjacent day', () => {
    expect(weekdayLabel(4, 3)).toBe('Tomorrow');
    expect(weekdayLabel(0, 6)).toBe('Tomorrow'); // Sun after Sat
  });
  it('names non-adjacent days', () => {
    expect(weekdayLabel(5, 1)).toBe('Friday');
  });
});
