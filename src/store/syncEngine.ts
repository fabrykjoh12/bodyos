import type { SyncEntityKind } from '@/lib/syncDiff';
import { emptyPullPatch, type PullPatch } from '@/lib/syncPull';
import type { BodyMeasurement, WorkoutSession, WorkoutTemplate } from '@/types';
import { loadFirebase } from '@/lib/firebase';
import {
  getEntityRev,
  listQueuedMutations,
  markAttempt,
  removeMutation,
  setEntityRev,
  type QueuedMutation,
} from './syncQueue';

// ---------------------------------------------------------------------------
// Push engine for the normalized sync rewrite: drains the offline mutation
// queue into per-entity Firestore documents, using optimistic concurrency
// (a per-entity `rev`) instead of whole-blob last-write-wins.
//
// `rev` is NOT a local edit counter — it's a baseline this device has
// confirmed matches the remote doc for that entity. Pushing runs a
// transaction: read the remote doc's rev; if it still equals our baseline,
// nobody else has written since we last synced, so the write is safe. If it
// doesn't match, another device wrote first — a genuine conflict — and the
// loser is shelved to `conflicts/` instead of being silently discarded
// (never the local delete forcing through a concurrent edit; see below).
// ---------------------------------------------------------------------------

function collectionFor(entity: SyncEntityKind): string {
  switch (entity) {
    case 'template':
      return 'templates';
    case 'session':
      return 'sessions';
    case 'measurement':
      return 'measurements';
    case 'meta':
      return 'meta';
    case 'active':
      return 'active';
  }
}

function tsToDate(value: unknown): Date {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

export type PushOutcome =
  { result: 'synced' } | { result: 'conflict'; wonByUs: boolean } | { result: 'failed' };

/** Push one queued mutation. Never throws — failures are reported, not thrown,
 *  so the caller can keep draining the rest of the queue. */
export async function pushMutation(uid: string, m: QueuedMutation): Promise<PushOutcome> {
  const fb = await loadFirebase();
  if (!fb) return { result: 'failed' };

  try {
    const { doc, collection, runTransaction, serverTimestamp } = await import('firebase/firestore');
    const ref = doc(fb.db, 'users', uid, collectionFor(m.entity), m.entityId);
    const baseline = await getEntityRev(uid, m.entity, m.entityId);

    let newBaseline = baseline;
    let outcome: PushOutcome = { result: 'synced' };

    await runTransaction(fb.db, async (trx) => {
      const snap = await trx.get(ref);
      const remoteRev = snap.exists() ? ((snap.data()?.rev as number) ?? 0) : 0;

      if (remoteRev === baseline) {
        if (m.op === 'delete') {
          trx.delete(ref);
          const tombRef = doc(fb.db, 'users', uid, 'tombstones', `${m.entity}_${m.entityId}`);
          trx.set(tombRef, {
            entity: m.entity,
            entityId: m.entityId,
            deletedAt: serverTimestamp(),
          });
        } else {
          trx.set(ref, {
            payload: m.payload ?? null,
            rev: remoteRev + 1,
            updatedAt: serverTimestamp(),
          });
        }
        newBaseline = remoteRev + 1;
        outcome = { result: 'synced' };
        return;
      }

      // Conflict: someone else wrote since we last synced this entity.
      if (m.op === 'delete') {
        // Never force a delete through a concurrent edit — the remote value
        // survives; our stale delete intent is dropped (not retried).
        newBaseline = remoteRev;
        outcome = { result: 'conflict', wonByUs: false };
        return;
      }

      const remoteUpdatedAt = tsToDate(snap.get('updatedAt'));
      const oursIsNewer = new Date(m.queuedAt) > remoteUpdatedAt;
      const shelfRef = doc(collection(fb.db, 'users', uid, 'conflicts'));

      if (oursIsNewer) {
        trx.set(ref, {
          payload: m.payload ?? null,
          rev: remoteRev + 1,
          updatedAt: serverTimestamp(),
        });
        trx.set(shelfRef, {
          entity: m.entity,
          entityId: m.entityId,
          payload: snap.data()?.payload ?? null,
          shelvedAt: serverTimestamp(),
        });
        newBaseline = remoteRev + 1;
      } else {
        trx.set(shelfRef, {
          entity: m.entity,
          entityId: m.entityId,
          payload: m.payload ?? null,
          shelvedAt: serverTimestamp(),
        });
        newBaseline = remoteRev;
      }
      outcome = { result: 'conflict', wonByUs: oursIsNewer };
    });

    await setEntityRev(uid, m.entity, m.entityId, newBaseline);
    return outcome;
  } catch {
    return { result: 'failed' };
  }
}

export interface DrainSummary {
  synced: number;
  conflicts: number;
  failed: number;
  /** Entities where the remote value won — the caller should re-pull these
   *  so the local store reflects the winning value instead of the discarded
   *  local edit. */
  remoteWon: { entity: SyncEntityKind; entityId: string }[];
}

/** Drain every queued mutation for this profile, oldest-first. Mutations that
 *  fail (network, transient error) stay queued for the next drain attempt. */
export async function drainQueue(uid: string): Promise<DrainSummary> {
  const summary: DrainSummary = { synced: 0, conflicts: 0, failed: 0, remoteWon: [] };
  const queued = await listQueuedMutations(uid);
  // Oldest-first by queuedAt.
  const ordered = [...queued].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));

  for (const m of ordered) {
    const outcome = await pushMutation(uid, m);
    if (outcome.result === 'synced') {
      summary.synced += 1;
      await removeMutation(uid, m.key);
    } else if (outcome.result === 'conflict') {
      summary.conflicts += 1;
      await removeMutation(uid, m.key);
      if (!outcome.wonByUs) summary.remoteWon.push({ entity: m.entity, entityId: m.entityId });
    } else {
      summary.failed += 1;
      await markAttempt(uid, m.key);
    }
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Pull: fetch every normalized collection, compare each doc's rev against
// this device's last-confirmed baseline, and return a patch of only what's
// NEW to this device (see lib/syncPull.ts for how the patch gets applied).
// Entities this device has never synced at all are NOT pulled here — they
// get pushed up on the next local write, since the diff engine treats a
// fresh (never-synced) local entity as "new" the first time it runs.
// ---------------------------------------------------------------------------

async function pullCollection<T>(
  uid: string,
  entity: SyncEntityKind,
): Promise<{ upsert: T[]; deleteIds: never[] }> {
  const fb = await loadFirebase();
  if (!fb) return { upsert: [], deleteIds: [] };
  const { collection, getDocs } = await import('firebase/firestore');
  const snap = await getDocs(collection(fb.db, 'users', uid, collectionFor(entity)));
  const upsert: T[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    const remoteRev = (data.rev as number) ?? 0;
    const baseline = await getEntityRev(uid, entity, d.id);
    if (remoteRev > baseline) {
      upsert.push(data.payload as T);
      await setEntityRev(uid, entity, d.id, remoteRev);
    }
  }
  return { upsert, deleteIds: [] };
}

async function pullSingleton<T>(
  uid: string,
  entity: SyncEntityKind,
  docId: string,
): Promise<T | undefined> {
  const fb = await loadFirebase();
  if (!fb) return undefined;
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(fb.db, 'users', uid, collectionFor(entity), docId));
  if (!snap.exists()) return undefined;
  const data = snap.data();
  const remoteRev = (data.rev as number) ?? 0;
  const baseline = await getEntityRev(uid, entity, docId);
  if (remoteRev <= baseline) return undefined;
  await setEntityRev(uid, entity, docId, remoteRev);
  return data.payload as T;
}

/** Fetch the whole remote state and return only what's new to this device. */
export async function pullRemote(uid: string): Promise<PullPatch> {
  const fb = await loadFirebase();
  if (!fb) return emptyPullPatch();

  const patch = emptyPullPatch();
  patch.templates = await pullCollection<WorkoutTemplate>(uid, 'template');
  patch.sessions = await pullCollection<WorkoutSession>(uid, 'session');
  patch.measurements = await pullCollection<BodyMeasurement>(uid, 'measurement');

  const meta = await pullSingleton<PullPatch['meta']>(uid, 'meta', 'profile');
  if (meta) patch.meta = meta;

  const active = await pullSingleton<WorkoutSession>(uid, 'active', 'current');
  if (active !== undefined) patch.active = active;

  // Tombstones: adopt every deletion this device hasn't already applied.
  // Doesn't carry a rev — a tombstone can only ever supersede a lower
  // baseline (the entity was synced, then deleted), so any tombstone this
  // device hasn't yet acted on is safe to apply.
  const { collection, getDocs } = await import('firebase/firestore');
  const tombSnap = await getDocs(collection(fb.db, 'users', uid, 'tombstones'));
  for (const d of tombSnap.docs) {
    const data = d.data() as { entity: SyncEntityKind; entityId: string };
    if (data.entity === 'template') patch.templates.deleteIds.push(data.entityId);
    else if (data.entity === 'session') patch.sessions.deleteIds.push(data.entityId);
    else if (data.entity === 'measurement') patch.measurements.deleteIds.push(data.entityId);
  }

  return patch;
}
