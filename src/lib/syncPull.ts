import type { AppData, BodyMeasurement, WorkoutSession, WorkoutTemplate } from '@/types';
import type { MetaPayload } from './syncDiff';

// ---------------------------------------------------------------------------
// Pure merge logic for the pull side of normalized sync: given a local
// AppData snapshot and a "patch" of remote entity changes (fetched by
// syncEngine.pullRemote, kept separate so this part needs no Firestore/IDB to
// test), produce the next local AppData. No IO here — fully unit-testable.
// ---------------------------------------------------------------------------

export interface PullPatch {
  templates: { upsert: WorkoutTemplate[]; deleteIds: string[] };
  sessions: { upsert: WorkoutSession[]; deleteIds: string[] };
  measurements: { upsert: BodyMeasurement[]; deleteIds: string[] };
  meta: MetaPayload | null;
  /** undefined = no change; null = remote says no active session; else adopt. */
  active: WorkoutSession | null | undefined;
}

function mergeById<T extends { id: string }>(current: T[], upsert: T[], deleteIds: string[]): T[] {
  if (upsert.length === 0 && deleteIds.length === 0) return current;
  const deleteSet = new Set(deleteIds);
  const upsertById = new Map(upsert.map((item) => [item.id, item]));
  const next = current
    .filter((item) => !deleteSet.has(item.id))
    .map((item) => upsertById.get(item.id) ?? item);
  for (const item of upsert) {
    if (!next.some((existing) => existing.id === item.id)) next.push(item);
  }
  return next;
}

export function applyPullPatch(local: AppData, patch: PullPatch): AppData {
  const next: AppData = {
    ...local,
    templates: mergeById(local.templates, patch.templates.upsert, patch.templates.deleteIds),
    sessions: mergeById(local.sessions, patch.sessions.upsert, patch.sessions.deleteIds),
    measurements: mergeById(
      local.measurements,
      patch.measurements.upsert,
      patch.measurements.deleteIds,
    ),
  };
  if (patch.meta) {
    next.user = patch.meta.user;
    next.weeklyPlan = patch.meta.weeklyPlan;
    next.exerciseNotes = patch.meta.exerciseNotes;
  }
  if (patch.active !== undefined) {
    next.activeSession = patch.active;
  }
  return next;
}

export function emptyPullPatch(): PullPatch {
  return {
    templates: { upsert: [], deleteIds: [] },
    sessions: { upsert: [], deleteIds: [] },
    measurements: { upsert: [], deleteIds: [] },
    meta: null,
    active: undefined,
  };
}
