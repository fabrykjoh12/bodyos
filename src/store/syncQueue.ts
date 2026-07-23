import type { EntityMutation, SyncEntityKind } from '@/lib/syncDiff';

// ---------------------------------------------------------------------------
// Offline mutation queue for the normalized sync engine (IndexedDB, per
// profile — same pattern as photoStore.ts). Enqueued mutations survive a
// refresh/restart; the caller (syncEngine) drains them against Firestore with
// backoff. Later mutations to the same entity COLLAPSE to the newest
// snapshot — safe because payloads are always full entity snapshots, never
// deltas, so replaying only the latest one loses nothing.
// ---------------------------------------------------------------------------

export interface QueuedMutation extends EntityMutation {
  /** Local monotonic id — also the collapse key alongside entity+entityId. */
  key: string;
  queuedAt: string;
  attempts: number;
}

const DB_PREFIX = 'bodyos.syncqueue';
const STORE = 'mutations';

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
      const req = indexedDB.open(dbName(profileUid), 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: 'key' });
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
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
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
    await tx(db, 'readwrite', (s) => s.put(record));
  }
  db.close();
  return true;
}

export async function listQueuedMutations(profileUid: string | null): Promise<QueuedMutation[]> {
  const db = await openDb(profileUid);
  if (!db) return [];
  const all = await tx<QueuedMutation[]>(db, 'readonly', (s) => s.getAll());
  db.close();
  return all ?? [];
}

export async function removeMutation(profileUid: string | null, key: string): Promise<void> {
  const db = await openDb(profileUid);
  if (!db) return;
  await tx(db, 'readwrite', (s) => s.delete(key));
  db.close();
}

/** Bump the attempt counter after a failed drain (for backoff/telemetry). */
export async function markAttempt(profileUid: string | null, key: string): Promise<void> {
  const db = await openDb(profileUid);
  if (!db) return;
  const existing = await tx<QueuedMutation | undefined>(
    db,
    'readonly',
    (s) => s.get(key) as IDBRequest<QueuedMutation | undefined>,
  );
  if (existing) {
    await tx(db, 'readwrite', (s) => s.put({ ...existing, attempts: existing.attempts + 1 }));
  }
  db.close();
}

export async function clearQueue(profileUid: string | null): Promise<void> {
  const db = await openDb(profileUid);
  if (!db) return;
  await tx(db, 'readwrite', (s) => s.clear());
  db.close();
}
