// ---------------------------------------------------------------------------
// Photo payload storage — IndexedDB, SEPARATE from the main AppData document.
//
// Progress-photo images are far too large for localStorage: a handful of
// data-URLs can exhaust the quota and block workout saves. The main training
// database must keep saving even when photo storage is full, so payloads live
// here and AppData carries only photo *metadata* (persist strips `dataUrl`).
//
// Stores are PROFILE-SCOPED (one database per account namespace) so photos
// obey the same account-isolation rules as everything else.
// ---------------------------------------------------------------------------

const DB_PREFIX = 'bodyos.photos';
const STORE = 'photos';

function dbName(profileUid: string | null): string {
  return profileUid ? `${DB_PREFIX}.u.${profileUid}` : DB_PREFIX;
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
          req.result.createObjectStore(STORE);
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

/** Save a photo payload. Returns false when storage refused it. */
export async function putPhotoData(
  profileUid: string | null,
  id: string,
  dataUrl: string,
): Promise<boolean> {
  const db = await openDb(profileUid);
  if (!db) return false;
  const result = await tx(db, 'readwrite', (s) => s.put(dataUrl, id));
  db.close();
  return result !== null;
}

export async function getPhotoData(profileUid: string | null, id: string): Promise<string | null> {
  const db = await openDb(profileUid);
  if (!db) return null;
  const result = await tx<string | undefined>(
    db,
    'readonly',
    (s) => s.get(id) as IDBRequest<string | undefined>,
  );
  db.close();
  return typeof result === 'string' ? result : null;
}

export async function deletePhotoData(profileUid: string | null, id: string): Promise<void> {
  const db = await openDb(profileUid);
  if (!db) return;
  await tx(db, 'readwrite', (s) => s.delete(id));
  db.close();
}

/** Remove payloads whose ids are no longer referenced (orphan cleanup). */
export async function prunePhotoData(profileUid: string | null, keepIds: string[]): Promise<void> {
  const db = await openDb(profileUid);
  if (!db) return;
  const all = await tx<IDBValidKey[]>(db, 'readonly', (s) => s.getAllKeys());
  const keep = new Set(keepIds);
  for (const key of all ?? []) {
    if (typeof key === 'string' && !keep.has(key)) {
      await tx(db, 'readwrite', (s) => s.delete(key));
    }
  }
  db.close();
}

/** Wipe a profile's entire photo payload store. */
export async function clearPhotoData(profileUid: string | null): Promise<void> {
  const db = await openDb(profileUid);
  if (!db) return;
  await tx(db, 'readwrite', (s) => s.clear());
  db.close();
}
