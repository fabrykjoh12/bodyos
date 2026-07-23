import { describe, expect, it } from 'vitest';
import { createEmptyData } from '@/data/seed';
import { applyPullPatch, emptyPullPatch } from './syncPull';
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

describe('applyPullPatch', () => {
  it('is a no-op with an empty patch', () => {
    const local = createEmptyData();
    local.templates = [template('t1', 'Push')];
    expect(applyPullPatch(local, emptyPullPatch())).toEqual(local);
  });

  it('adds a remote template the local device never had', () => {
    const local = createEmptyData();
    const patch = emptyPullPatch();
    patch.templates.upsert = [template('t1', 'Push')];
    const next = applyPullPatch(local, patch);
    expect(next.templates).toEqual([template('t1', 'Push')]);
  });

  it('overwrites an existing template by id (remote wins for this patch)', () => {
    const local = createEmptyData();
    local.templates = [template('t1', 'Push')];
    const patch = emptyPullPatch();
    patch.templates.upsert = [template('t1', 'Push Day')];
    const next = applyPullPatch(local, patch);
    expect(next.templates).toEqual([template('t1', 'Push Day')]);
  });

  it('removes a locally-held entity when the patch tombstones it', () => {
    const local = createEmptyData();
    local.templates = [template('t1', 'Push'), template('t2', 'Pull')];
    const patch = emptyPullPatch();
    patch.templates.deleteIds = ['t2'];
    const next = applyPullPatch(local, patch);
    expect(next.templates.map((t) => t.id)).toEqual(['t1']);
  });

  it('leaves entities untouched when the patch says nothing about them', () => {
    const local = createEmptyData();
    local.sessions = [
      {
        id: 's1',
        templateId: 't1',
        name: 'Push',
        focus: 'Chest',
        status: 'completed',
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T01:00:00.000Z',
        exercises: [],
        currentExerciseIndex: 0,
      },
    ];
    const patch = emptyPullPatch();
    patch.templates.upsert = [template('t1', 'Push')];
    const next = applyPullPatch(local, patch);
    expect(next.sessions).toEqual(local.sessions);
  });

  it('replaces meta (user/settings/weeklyPlan/exerciseNotes) as one unit', () => {
    const local = createEmptyData();
    const patch = emptyPullPatch();
    patch.meta = {
      user: { ...local.user, name: 'Remote Name' },
      weeklyPlan: { 1: 't1' },
      exerciseNotes: { 'bench-press': 'go heavy' },
    };
    const next = applyPullPatch(local, patch);
    expect(next.user.name).toBe('Remote Name');
    expect(next.weeklyPlan).toEqual({ 1: 't1' });
    expect(next.exerciseNotes).toEqual({ 'bench-press': 'go heavy' });
  });

  it('leaves activeSession untouched when the patch says undefined, adopts null or a session otherwise', () => {
    const local = createEmptyData();
    local.activeSession = {
      id: 's1',
      templateId: 't1',
      name: 'Push',
      focus: 'Chest',
      status: 'active',
      startedAt: '2026-01-01T00:00:00.000Z',
      exercises: [],
      currentExerciseIndex: 0,
    };

    const untouched = applyPullPatch(local, emptyPullPatch());
    expect(untouched.activeSession).toBe(local.activeSession);

    const patchEnd = emptyPullPatch();
    patchEnd.active = null;
    expect(applyPullPatch(local, patchEnd).activeSession).toBeNull();
  });
});
