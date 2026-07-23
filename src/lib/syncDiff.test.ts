import { describe, expect, it } from 'vitest';
import { createEmptyData } from '@/data/seed';
import { diffAppData } from './syncDiff';
import type { WorkoutTemplate } from '@/types';

function template(id: string, name: string): WorkoutTemplate {
  return {
    id,
    name,
    focus: 'Full body',
    split: 'full-body',
    exercises: [],
    estimatedMinutes: 45,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('diffAppData', () => {
  it('treats a null previous snapshot as everything-new', () => {
    const next = createEmptyData();
    next.templates = [template('t1', 'Push')];
    const mutations = diffAppData(null, next);
    expect(mutations).toContainEqual({
      entity: 'template',
      entityId: 't1',
      op: 'upsert',
      payload: next.templates[0],
    });
    // meta always diffs against null too.
    expect(mutations.some((m) => m.entity === 'meta' && m.op === 'upsert')).toBe(true);
  });

  it('produces no mutations when nothing changed', () => {
    const data = createEmptyData();
    data.templates = [template('t1', 'Push')];
    const mutations = diffAppData(data, structuredClone(data));
    expect(mutations).toEqual([]);
  });

  it('detects an added template', () => {
    const prev = createEmptyData();
    const next = structuredClone(prev);
    next.templates = [template('t1', 'Push')];
    const mutations = diffAppData(prev, next);
    expect(mutations).toEqual([
      { entity: 'template', entityId: 't1', op: 'upsert', payload: next.templates[0] },
    ]);
  });

  it('detects a changed template (by content, not just presence)', () => {
    const prev = createEmptyData();
    prev.templates = [template('t1', 'Push')];
    const next = structuredClone(prev);
    next.templates[0]!.name = 'Push Day';
    const mutations = diffAppData(prev, next);
    expect(mutations).toEqual([
      { entity: 'template', entityId: 't1', op: 'upsert', payload: next.templates[0] },
    ]);
  });

  it('detects a deleted template', () => {
    const prev = createEmptyData();
    prev.templates = [template('t1', 'Push'), template('t2', 'Pull')];
    const next = structuredClone(prev);
    next.templates = next.templates.filter((t) => t.id !== 't2');
    const mutations = diffAppData(prev, next);
    expect(mutations).toEqual([{ entity: 'template', entityId: 't2', op: 'delete' }]);
  });

  it('bundles user/settings/weeklyPlan/exerciseNotes into one meta mutation', () => {
    const prev = createEmptyData();
    const next = structuredClone(prev);
    next.user.settings.unit = 'lb';
    const mutations = diffAppData(prev, next);
    expect(mutations).toEqual([
      {
        entity: 'meta',
        entityId: 'profile',
        op: 'upsert',
        payload: {
          user: next.user,
          weeklyPlan: next.weeklyPlan,
          exerciseNotes: next.exerciseNotes,
        },
      },
    ]);
  });

  it('never syncs derived data or device-local fields', () => {
    const prev = createEmptyData();
    const next = structuredClone(prev);
    next.personalRecords = [
      {
        id: 'pr1',
        exerciseId: 'bench-press',
        type: 'weight',
        value: 100,
        achievedAt: '2026-01-01',
      },
    ];
    next.streakDates = ['2026-01-01'];
    next.photos = [
      { id: 'p1', takenAt: '2026-01-01', pose: 'front-relaxed', dataUrl: '', weekLabel: 'Week 1' },
    ];
    next.restTimer = { endsAt: 123, durationSec: 90, exerciseId: 'bench-press' };
    expect(diffAppData(prev, next)).toEqual([]);
  });

  it('upserts the active session when one starts, deletes it when it ends', () => {
    const prev = createEmptyData();
    const withActive = structuredClone(prev);
    withActive.activeSession = {
      id: 's1',
      templateId: 't1',
      name: 'Push',
      focus: 'Chest',
      status: 'active',
      startedAt: '2026-01-01T00:00:00.000Z',
      exercises: [],
      isDeload: false,
      currentExerciseIndex: 0,
    };
    const startMutations = diffAppData(prev, withActive);
    expect(startMutations).toEqual([
      { entity: 'active', entityId: 'current', op: 'upsert', payload: withActive.activeSession },
    ]);

    const ended = structuredClone(withActive);
    ended.activeSession = null;
    const endMutations = diffAppData(withActive, ended);
    expect(endMutations).toEqual([{ entity: 'active', entityId: 'current', op: 'delete' }]);
  });
});
