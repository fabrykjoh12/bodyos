import type { AppData } from '@/types';
import { loadFirebase } from '@/lib/firebase';
import { setEntityRev } from './syncQueue';

// ---------------------------------------------------------------------------
// One-time migration from the legacy whole-blob doc (`bodyos_app_state/{uid}`)
// to the normalized per-entity collections. Idempotent — checks a migration
// marker first, so re-running (e.g. a retry after a network failure) never
// double-migrates. The blob itself is left untouched (never deleted here) —
// a rollback window per the design spec.
// ---------------------------------------------------------------------------

const BATCH_LIMIT = 400; // Firestore's hard cap is 500 writes/batch; leave headroom.

export type MigrationResult = 'migrated' | 'already-migrated' | 'no-blob' | 'failed';

type LegacyBlobData = Pick<
  AppData,
  | 'templates'
  | 'sessions'
  | 'measurements'
  | 'user'
  | 'weeklyPlan'
  | 'exerciseNotes'
  | 'activeSession'
>;

export async function migrateFromBlob(uid: string): Promise<MigrationResult> {
  const fb = await loadFirebase();
  if (!fb) return 'failed';

  try {
    const { doc, getDoc, writeBatch, serverTimestamp } = await import('firebase/firestore');
    const migrationRef = doc(fb.db, 'users', uid, 'migration', 'status');
    const migrationSnap = await getDoc(migrationRef);
    if (migrationSnap.exists()) return 'already-migrated';

    const blobSnap = await getDoc(doc(fb.db, 'bodyos_app_state', uid));
    if (!blobSnap.exists()) {
      await writeBatch(fb.db)
        .set(migrationRef, { fromBlob: false, at: serverTimestamp() })
        .commit();
      return 'no-blob';
    }

    const data = blobSnap.data().data as LegacyBlobData;
    const revSeeds: Promise<void>[] = [];

    let batch = writeBatch(fb.db);
    let opsInBatch = 0;
    const commits: Promise<void>[] = [];
    const flushIfFull = () => {
      if (opsInBatch >= BATCH_LIMIT) {
        commits.push(batch.commit());
        batch = writeBatch(fb.db);
        opsInBatch = 0;
      }
    };

    for (const t of data.templates ?? []) {
      batch.set(doc(fb.db, 'users', uid, 'templates', t.id), {
        payload: t,
        rev: 1,
        updatedAt: serverTimestamp(),
      });
      opsInBatch += 1;
      revSeeds.push(setEntityRev(uid, 'template', t.id, 1));
      flushIfFull();
    }
    for (const s of data.sessions ?? []) {
      batch.set(doc(fb.db, 'users', uid, 'sessions', s.id), {
        payload: s,
        rev: 1,
        updatedAt: serverTimestamp(),
      });
      opsInBatch += 1;
      revSeeds.push(setEntityRev(uid, 'session', s.id, 1));
      flushIfFull();
    }
    for (const m of data.measurements ?? []) {
      batch.set(doc(fb.db, 'users', uid, 'measurements', m.id), {
        payload: m,
        rev: 1,
        updatedAt: serverTimestamp(),
      });
      opsInBatch += 1;
      revSeeds.push(setEntityRev(uid, 'measurement', m.id, 1));
      flushIfFull();
    }

    batch.set(doc(fb.db, 'users', uid, 'meta', 'profile'), {
      payload: { user: data.user, weeklyPlan: data.weeklyPlan, exerciseNotes: data.exerciseNotes },
      rev: 1,
      updatedAt: serverTimestamp(),
    });
    opsInBatch += 1;
    revSeeds.push(setEntityRev(uid, 'meta', 'profile', 1));
    flushIfFull();

    if (data.activeSession) {
      batch.set(doc(fb.db, 'users', uid, 'active', 'current'), {
        payload: data.activeSession,
        rev: 1,
        updatedAt: serverTimestamp(),
      });
      opsInBatch += 1;
      revSeeds.push(setEntityRev(uid, 'active', 'current', 1));
      flushIfFull();
    }

    batch.set(migrationRef, { fromBlob: true, at: serverTimestamp() });
    commits.push(batch.commit());

    await Promise.all(commits);
    await Promise.all(revSeeds);
    return 'migrated';
  } catch {
    return 'failed';
  }
}
