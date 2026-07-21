import type { Equipment } from '@/types';
import { EXERCISES, getExercise } from '@/data/exercises';

// Equipment-aware exercise resolution: a routine must never hand someone a
// barbell movement when they said they have no barbell. Pure and tested.

/** Bodyweight movements are always available; everything else needs its gear. */
export function isCompatible(exerciseId: string, equipment: Equipment[]): boolean {
  const ex = getExercise(exerciseId);
  if (!ex) return false;
  return ex.equipment === 'bodyweight' || equipment.includes(ex.equipment);
}

export interface Resolution {
  id: string;
  /** True when the original exercise was replaced for equipment reasons. */
  substituted: boolean;
  originalId: string;
}

/**
 * Resolve an exercise against the user's equipment: keep it when compatible,
 * otherwise the first compatible listed substitution, otherwise a compatible
 * same-muscle movement of the same kind (then any kind). Null = nothing fits.
 */
export function resolveForEquipment(exerciseId: string, equipment: Equipment[]): Resolution | null {
  if (isCompatible(exerciseId, equipment)) {
    return { id: exerciseId, substituted: false, originalId: exerciseId };
  }
  const ex = getExercise(exerciseId);
  if (!ex) return null;
  for (const sub of ex.substitutions) {
    if (isCompatible(sub, equipment)) return { id: sub, substituted: true, originalId: exerciseId };
  }
  const sameMuscle = EXERCISES.filter(
    (e) => e.id !== ex.id && e.primaryMuscle === ex.primaryMuscle && isCompatible(e.id, equipment),
  );
  const preferred = sameMuscle.find((e) => e.kind === ex.kind) ?? sameMuscle[0];
  return preferred ? { id: preferred.id, substituted: true, originalId: exerciseId } : null;
}

export interface AdaptedDay {
  /** Resolved, de-duplicated exercise ids in original order. */
  exercises: Resolution[];
  /** Original ids that could not be resolved with this equipment. */
  dropped: string[];
}

/** Adapt one routine day's exercise list to the available equipment. */
export function adaptDay(exerciseIds: string[], equipment: Equipment[]): AdaptedDay {
  const seen = new Set<string>();
  const exercises: Resolution[] = [];
  const dropped: string[] = [];
  for (const id of exerciseIds) {
    const r = resolveForEquipment(id, equipment);
    if (!r) {
      dropped.push(id);
      continue;
    }
    if (seen.has(r.id)) continue; // substitution collided with an existing pick
    seen.add(r.id);
    exercises.push(r);
  }
  return { exercises, dropped };
}

/** How many changes adapting a whole routine would make (for previews). */
export function countAdaptations(
  days: { exercises: string[] }[],
  equipment: Equipment[],
): { substitutions: number; dropped: number } {
  let substitutions = 0;
  let dropped = 0;
  for (const d of days) {
    const a = adaptDay(d.exercises, equipment);
    substitutions += a.exercises.filter((e) => e.substituted).length;
    dropped += a.dropped.length;
  }
  return { substitutions, dropped };
}
