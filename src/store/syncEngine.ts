import type { SyncEntityKind } from '@/lib/syncDiff';
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
