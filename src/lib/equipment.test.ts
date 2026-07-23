import { describe, expect, it } from 'vitest';
import type { Equipment } from '@/types';
import { adaptDay, isCompatible, resolveForEquipment } from './equipment';
import { ROUTINES } from '@/data/routines';
import { requireExercise } from '@/data/exercises';

const FULL: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
];
const NO_BARBELL: Equipment[] = ['dumbbell', 'machine', 'cable', 'bodyweight'];
const HOME_DUMBBELL: Equipment[] = ['dumbbell', 'bodyweight'];
const BODYWEIGHT_ONLY: Equipment[] = ['bodyweight'];

describe('isCompatible', () => {
  it('bodyweight movements are always available', () => {
    expect(isCompatible('plank', [])).toBe(true);
  });
  it('gear-bound movements need their gear', () => {
    expect(isCompatible('bench-press', NO_BARBELL)).toBe(false);
    expect(isCompatible('bench-press', FULL)).toBe(true);
  });
});

describe('resolveForEquipment', () => {
  it('keeps compatible exercises unchanged', () => {
    const r = resolveForEquipment('squat', FULL);
    expect(r).toEqual({ id: 'squat', substituted: false, originalId: 'squat' });
  });

  it('substitutes an equipment-compatible alternative for the same muscle', () => {
    const r = resolveForEquipment('bench-press', NO_BARBELL);
    expect(r).not.toBeNull();
    expect(r!.substituted).toBe(true);
    const sub = requireExercise(r!.id);
    expect(sub.primaryMuscle).toBe('chest');
    expect(NO_BARBELL.includes(sub.equipment) || sub.equipment === 'bodyweight').toBe(true);
  });
});

describe('adaptDay', () => {
  it('never emits an exercise the user cannot perform', () => {
    for (const routine of ROUTINES) {
      for (const day of routine.days) {
        for (const equipment of [FULL, NO_BARBELL, HOME_DUMBBELL, BODYWEIGHT_ONLY]) {
          const adapted = adaptDay(day.exercises, equipment);
          for (const res of adapted.exercises) {
            expect(isCompatible(res.id, equipment)).toBe(true);
          }
        }
      }
    }
  });

  it('leaves fully-equipped users untouched', () => {
    for (const routine of ROUTINES) {
      for (const day of routine.days) {
        const adapted = adaptDay(day.exercises, FULL);
        expect(adapted.dropped).toHaveLength(0);
        expect(adapted.exercises.map((e) => e.id)).toEqual(day.exercises);
      }
    }
  });

  it('de-duplicates when substitutions collide', () => {
    const adapted = adaptDay(['bench-press', 'db-bench-press'], HOME_DUMBBELL);
    const ids = adapted.exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every day trainable (never empties a day) for practical equipment sets', () => {
    for (const routine of ROUTINES) {
      for (const day of routine.days) {
        for (const equipment of [NO_BARBELL, HOME_DUMBBELL, BODYWEIGHT_ONLY]) {
          const adapted = adaptDay(day.exercises, equipment);
          expect(adapted.exercises.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
