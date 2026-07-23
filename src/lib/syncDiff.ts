import type { AppData } from '@/types';

// ---------------------------------------------------------------------------
// Pure diff engine for the normalized sync rewrite (replaces whole-blob LWW —
// see docs/superpowers/specs/2026-07-20-normalized-sync-design.md).
//
// Instead of instrumenting every store action to say "I changed a template",
// we diff the AppData snapshot before/after each mutation at entity
// granularity. That's enough to reconstruct exactly which templates/sessions/
// measurements/meta/active-session changed, without touching the ~20 store
// actions individually. Pure + synchronous, so it's fully unit-testable
// without IndexedDB or Firestore.
// ---------------------------------------------------------------------------

export type SyncEntityKind = 'template' | 'session' | 'measurement' | 'meta' | 'active';

export interface EntityMutation {
  entity: SyncEntityKind;
  entityId: string;
  op: 'upsert' | 'delete';
  payload?: unknown;
}

/** The small "everything else" bundle synced as a single entity. */
export interface MetaPayload {
  user: AppData['user'];
  weeklyPlan: AppData['weeklyPlan'];
  exerciseNotes: AppData['exerciseNotes'];
}

const META_ID = 'profile';
const ACTIVE_ID = 'current';

function diffById<T extends { id: string }>(
  entity: SyncEntityKind,
  prev: T[],
  next: T[],
): EntityMutation[] {
  const mutations: EntityMutation[] = [];
  const prevById = new Map(prev.map((item) => [item.id, item]));
  const nextIds = new Set<string>();

  for (const item of next) {
    nextIds.add(item.id);
    const before = prevById.get(item.id);
    if (!before || JSON.stringify(before) !== JSON.stringify(item)) {
      mutations.push({ entity, entityId: item.id, op: 'upsert', payload: item });
    }
  }
  for (const item of prev) {
    if (!nextIds.has(item.id)) {
      mutations.push({ entity, entityId: item.id, op: 'delete' });
    }
  }
  return mutations;
}

export function toMetaPayload(d: AppData): MetaPayload {
  return { user: d.user, weeklyPlan: d.weeklyPlan, exerciseNotes: d.exerciseNotes };
}

/**
 * Compare two AppData snapshots and return the entity-level mutations needed
 * to bring a remote replica from `prev` to `next`. `prev === null` means
 * "nothing synced yet" — every entity in `next` is a fresh upsert.
 */
export function diffAppData(prev: AppData | null, next: AppData): EntityMutation[] {
  const mutations: EntityMutation[] = [
    ...diffById('template', prev?.templates ?? [], next.templates),
    ...diffById('session', prev?.sessions ?? [], next.sessions),
    ...diffById('measurement', prev?.measurements ?? [], next.measurements),
  ];

  const prevMeta = prev ? toMetaPayload(prev) : null;
  const nextMeta = toMetaPayload(next);
  if (!prevMeta || JSON.stringify(prevMeta) !== JSON.stringify(nextMeta)) {
    mutations.push({ entity: 'meta', entityId: META_ID, op: 'upsert', payload: nextMeta });
  }

  const prevActive = prev?.activeSession ?? null;
  const nextActive = next.activeSession;
  if (JSON.stringify(prevActive) !== JSON.stringify(nextActive)) {
    if (nextActive === null) {
      mutations.push({ entity: 'active', entityId: ACTIVE_ID, op: 'delete' });
    } else {
      mutations.push({ entity: 'active', entityId: ACTIVE_ID, op: 'upsert', payload: nextActive });
    }
  }

  return mutations;
}
