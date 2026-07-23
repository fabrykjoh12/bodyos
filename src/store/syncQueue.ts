import type { EntityMutation, SyncEntityKind } from '@/lib/syncDiff';

// ---------------------------------------------------------------------------
// Offline mutation queue for the normalized sync engine (IndexedDB, per
// profile — same pattern as photoStore.ts). Enqueued mutations survive a
// refresh/restart; the caller (syncEngine) drains them against Firestore with
// backoff. Later mutations to the same entity COLLAPSE to the newest
// snapshot — safe because payloads are always full entity snapshots, never
// deltas, so replaying only the latest one loses nothing.
//
// A second store tracks, per entity, the LAST REMOTE REVISION this device has
// confirmed (via a successful push or pull) — the optimistic-concurrency
// baseline the sync engine (syncEngine.ts) compares against Firestore's
// current `rev` to detect a concurrent edit from another device (audit
// finding #8 — this is what whole-blob LWW couldn't do). Crucially, this
// baseline is touched ONLY by a confirmed round-trip with Firestore, never by
// enqueueing a local edit — bumping it at enqueue time would make every
// entity's very first push look like a conflict (nothing to compare against
// yet is exactly rev 0, not "whatever we've locally edited since").
// ---------------------------------------------------------------------------

export interface QueuedMutation extends EntityMutation {
  /** Local monotonic id — also the collapse key alongside entity+entityId. */
  key: string;
  queuedAt: string;
  attempts: number;
}

const DB_PREFIX = 'bodyos.syncqueue';
const DB_VERSION = 1;
const MUTATIONS_STORE = 'mutations';
const REVS_STORE = 'revs';

function dbName(profileUid: string | null): string {
  return profileUid ? `${DB_PREFIX}.u.${profileUid}` : DB_PREFIX;
}

function collapseKey(entity: SyncEntityKind, entityId: string): string {
  return `${entity}:${entityId}`;
}

function openDb(profileUid: string | null): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(dbName(profileUid), DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(MUTATIONS_STORE)) {
          req.result.createObjectStore(MUTATIONS_STORE, { keyPath: 'key' });
        }
        if (!req.result.objectStoreNames.contains(REVS_STORE)) {
          req.result.createObjectStore(REVS_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function tx<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const t = db.transaction(store, mode);
      const req = run(t.objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

interface RevRecord {
  key: string;
  rev: number;
}

/** Current local revision for an entity (0 if it's never changed on this device). */
export async function getEntityRev(
  profileUid: string | null,
  entity: SyncEntityKind,
  entityId: string,
): Promise<number> {
  const db = await openDb(profileUid);
  if (!db) return 0;
  const rec = await tx<RevRecord | undefined>(
    db,
    REVS_STORE,
    'readonly',
    (s) => s.get(collapseKey(entity, entityId)) as IDBRequest<RevRecord | undefined>,
  );
  db.close();
  return rec?.rev ?? 0;
}

/** Force-set a local revision counter (used by migration seeding). */
export async function setEntityRev(
  profileUid: string | null,
  entity: SyncEntityKind,
  entityId: string,
  rev: number,
): Promise<void> {
  const db = await openDb(profileUid);
  if (!db) return;
  await tx(db, REVS_STORE, 'readwrite', (s) => s.put({ key: collapseKey(entity, entityId), rev }));
  db.close();
}

/** Enqueue mutations, collapsing any existing pending entry for the same
 *  entity+entityId to this newest snapshot. Returns false if IDB is
 *  unavailable (caller falls back to same-session-only durability). */
export async function enqueueMutations(
  profileUid: string | null,
  mutations: EntityMutation[],
): Promise<boolean> {
  if (mutations.length === 0) return true;
  const db = await openDb(profileUid);
  if (!db) return false;
  const now = new Date().toISOString();
  for (const m of mutations) {
    const key = collapseKey(m.entity, m.entityId);
    const record: QueuedMutation = { ...m, key, queuedAt: now, attempts: 0 };
    await tx(db, MUTATIONS_STORE, 'readwrite', (s) => s.put(record));
  }
  db.close();
  return true;
}

export async function listQueuedMutations(profileUid: string | null): Promise<QueuedMutation[]> {
  const db = await openDb(profileUid);
  if (!db) return [];
  const all = await tx<QueuedMutation[]>(db, MUTATIONS_STORE, 'readonly', (s) => s.getAll());
  db.close();
  return all ?? [];
}

export async function removeMutation(profileUid: string | null, key: string): Promise<void> {
  const db = await openDb(profileUid);
  if (!db) return;
  await tx(db, MUTATIONS_STORE, 'readwrite', (s) => s.delete(key));
  db.close();
}

/** Bump the attempt counter after a failed drain (for backoff/telemetry). */
export async function markAttempt(profileUid: string | null, key: string): Promise<void> {
  const db = await openDb(profileUid);
  if (!db) return;
  const existing = await tx<QueuedMutation | undefined>(
    db,
    MUTATIONS_STORE,
    'readonly',
    (s) => s.get(key) as IDBRequest<QueuedMutation | undefined>,
  );
  if (existing) {
    await tx(db, MUTATIONS_STORE, 'readwrite', (s) =>
      s.put({ ...existing, attempts: existing.attempts + 1 }),
    );
  }
  db.close();
}

/** Wipe both the pending-mutation queue and the local revision counters. */
export async function clearQueue(profileUid: string | null): Promise<void> {
  const db = await openDb(profileUid);
  if (!db) return;
  await tx(db, MUTATIONS_STORE, 'readwrite', (s) => s.clear());
  await tx(db, REVS_STORE, 'readwrite', (s) => s.clear());
  db.close();
}
