import { create } from 'zustand';
import type { AppData } from '@/types';
import { loadFirebase, isFirebaseConfigured } from '@/lib/firebase';

// ---------------------------------------------------------------------------
// Optional cloud sync (Firebase Auth + Firestore).
//
// localStorage stays the synchronous source of truth (the app keeps working
// fully offline). When signed in, the whole AppData blob is mirrored to a
// single per-user Firestore document (`bodyos_app_state/{uid}`) — pushed on
// local writes (debounced) and pulled/reconciled on sign-in. Conflicts are
// resolved last-write-wins at whole-blob granularity: simple and predictable
// for a single-user app; no field-level merge.
//
// Two fields are deliberately NOT synced and stay device-local:
//   • photos    — private by design ("never uploaded without explicit action")
//   • restTimer — ephemeral wall-clock state, meaningless on another device
// ---------------------------------------------------------------------------

const COLLECTION = 'bodyos_app_state';
const META_KEY = 'bodyos.sync.meta.v1';
const PUSH_DEBOUNCE_MS = 1500;

type SyncedData = Omit<AppData, 'photos' | 'restTimer'>;

export type SyncStatus =
  | 'unconfigured' // no Firebase config compiled in
  | 'signedOut'
  | 'syncing'
  | 'synced'
  | 'error';

interface SyncState {
  status: SyncStatus;
  email: string | null;
  lastSyncedAt: number | null;
  error: string | null;
}

export const useSyncStore = create<SyncState>(() => ({
  status: isFirebaseConfigured ? 'signedOut' : 'unconfigured',
  email: null,
  lastSyncedAt: null,
  error: null,
}));

function setSync(patch: Partial<SyncState>): void {
  useSyncStore.setState(patch);
}

// --- persisted sync bookkeeping --------------------------------------------

interface SyncMeta {
  userId: string | null;
  dirty: boolean;
  dirtyAt: number | null;
  /** Server `updated_at` we last observed — lets us tell "unchanged" from
   *  "another device wrote" without relying on our own clock. */
  remoteUpdatedAt: string | null;
}

function loadMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw) as SyncMeta;
  } catch {
    /* ignore */
  }
  return { userId: null, dirty: false, dirtyAt: null, remoteUpdatedAt: null };
}

let meta: SyncMeta = loadMeta();

function setMeta(patch: Partial<SyncMeta>): void {
  meta = { ...meta, ...patch };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
}

// --- wiring to the app store (registered at runtime to avoid an import cycle)

let getLocalData: (() => AppData) | null = null;
let applyRemote: ((data: AppData) => void) | null = null;
let applyingRemote = false;

export function registerSync(hooks: {
  getLocalData: () => AppData;
  applyRemote: (data: AppData) => void;
}): void {
  getLocalData = hooks.getLocalData;
  applyRemote = hooks.applyRemote;
}

// --- pure helpers (unit-tested) --------------------------------------------

export function toSynced(d: AppData): SyncedData {
  const { photos: _photos, restTimer: _restTimer, ...rest } = d;
  return rest;
}

/** Adopt every synced field from remote; keep device-local photos + timer. */
export function mergeRemote(local: AppData, remote: SyncedData): AppData {
  return { ...local, ...remote, photos: local.photos, restTimer: local.restTimer };
}

export type PullDecision = { action: 'push' | 'adopt' | 'noop' };

/** Whole-blob last-write-wins reconciliation, extracted for testability. */
export function decidePull(args: {
  remoteExists: boolean;
  remoteUpdatedAt: string | null;
  lastSyncedRemoteUpdatedAt: string | null;
  localDirty: boolean;
  localDirtyAt: number | null;
}): PullDecision {
  const {
    remoteExists,
    remoteUpdatedAt,
    lastSyncedRemoteUpdatedAt,
    localDirty,
    localDirtyAt,
  } = args;

  if (!remoteExists) return { action: 'push' }; // seed cloud from this device
  if (remoteUpdatedAt === lastSyncedRemoteUpdatedAt) {
    return { action: localDirty ? 'push' : 'noop' };
  }
  // Remote advanced since we last synced (another device wrote).
  if (!localDirty) return { action: 'adopt' };
  const remoteTime = remoteUpdatedAt ? Date.parse(remoteUpdatedAt) : 0;
  const localTime = localDirtyAt ?? 0;
  return { action: remoteTime >= localTime ? 'adopt' : 'push' };
}

// --- engine ----------------------------------------------------------------

let authUserId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function isSignedIn(): boolean {
  return authUserId !== null;
}

/** Map Firebase Auth error codes to friendly, human messages. */
function authMessage(e: unknown): string {
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/email-already-in-use':
      return 'That email already has an account — sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    default:
      return messageOf(e);
  }
}

function messageOf(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'Sync failed';
}

/** Firestore Timestamp → ISO string (the reconcile clock we compare on). */
function tsToIso(value: unknown): string | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

async function pushNow(): Promise<void> {
  const fb = await loadFirebase();
  if (!fb || !authUserId || !getLocalData) return;
  const local = getLocalData();
  setSync({ status: 'syncing', error: null });
  try {
    const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore');
    const ref = doc(fb.db, COLLECTION, authUserId);
    await setDoc(ref, { data: toSynced(local), appVersion: local.version, updatedAt: serverTimestamp() });
    // Read back the resolved server timestamp so both devices compare the same clock.
    const snap = await getDoc(ref);
    const remoteUpdatedAt = tsToIso(snap.get('updatedAt')) ?? new Date().toISOString();
    setMeta({ dirty: false, dirtyAt: null, remoteUpdatedAt, userId: authUserId });
    setSync({ status: 'synced', lastSyncedAt: Date.now(), error: null });
  } catch (e) {
    setSync({ status: 'error', error: messageOf(e) });
  }
}

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushNow();
  }, PUSH_DEBOUNCE_MS);
}

/** Called by the store after every local mutation. */
export function notifyLocalWrite(_data: AppData): void {
  if (applyingRemote) return; // don't echo a remote-applied write back up
  if (!isSignedIn()) return; // local-only when signed out
  setMeta({ dirty: true, dirtyAt: Date.now() });
  schedulePush();
}

function adopt(remoteData: SyncedData, remoteUpdatedAt: string): void {
  if (!getLocalData || !applyRemote) return;
  const local = getLocalData();
  applyingRemote = true;
  try {
    applyRemote(mergeRemote(local, remoteData));
  } finally {
    applyingRemote = false;
  }
  setMeta({ dirty: false, dirtyAt: null, remoteUpdatedAt, userId: authUserId });
  setSync({ status: 'synced', lastSyncedAt: Date.now(), error: null });
}

async function pullAndReconcile(): Promise<void> {
  const fb = await loadFirebase();
  if (!fb || !authUserId || !getLocalData || !applyRemote) return;
  setSync({ status: 'syncing', error: null });
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(fb.db, COLLECTION, authUserId));
    const remoteExists = snap.exists();
    const remoteUpdatedAt = remoteExists ? tsToIso(snap.get('updatedAt')) : null;

    const decision = decidePull({
      remoteExists,
      remoteUpdatedAt,
      lastSyncedRemoteUpdatedAt: meta.remoteUpdatedAt,
      localDirty: meta.dirty,
      localDirtyAt: meta.dirtyAt,
    });

    switch (decision.action) {
      case 'push':
        await pushNow();
        break;
      case 'adopt':
        adopt(snap.get('data') as SyncedData, remoteUpdatedAt ?? new Date().toISOString());
        break;
      case 'noop':
        setSync({ status: 'synced', lastSyncedAt: Date.now(), error: null });
        break;
    }
  } catch (e) {
    setSync({ status: 'error', error: messageOf(e) });
  }
}

// --- public auth API (called from the Account UI) --------------------------

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const fb = await loadFirebase();
  if (!fb) return { error: 'Cloud sync is not configured.' };
  try {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(fb.auth, email, password);
    return { error: null };
  } catch (e) {
    return { error: authMessage(e) };
  }
}

export async function signUp(
  email: string,
  password: string,
): Promise<{ error: string | null; needsConfirmation: boolean }> {
  const fb = await loadFirebase();
  if (!fb) return { error: 'Cloud sync is not configured.', needsConfirmation: false };
  try {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    // Firebase signs the user in immediately — no email-confirmation step.
    await createUserWithEmailAndPassword(fb.auth, email, password);
    return { error: null, needsConfirmation: false };
  } catch (e) {
    return { error: authMessage(e), needsConfirmation: false };
  }
}

/** Kept for API compatibility with the Account UI. Firebase needs no email
 *  confirmation to sign in, so this is effectively unused; if called it sends
 *  an optional verification email to the current user. */
export async function resendConfirmation(_email: string): Promise<{ error: string | null }> {
  const fb = await loadFirebase();
  if (!fb || !fb.auth.currentUser) return { error: null };
  try {
    const { sendEmailVerification } = await import('firebase/auth');
    await sendEmailVerification(fb.auth.currentUser);
    return { error: null };
  } catch (e) {
    return { error: authMessage(e) };
  }
}

export async function signOut(): Promise<void> {
  const fb = await loadFirebase();
  if (!fb) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  const { signOut: fbSignOut } = await import('firebase/auth');
  await fbSignOut(fb.auth);
}

/** Manual "Sync now" for the UI. */
export async function syncNow(): Promise<void> {
  await pullAndReconcile();
}

// --- startup ---------------------------------------------------------------

let initialized = false;

export function initCloudSync(): void {
  if (initialized || !isFirebaseConfigured) return;
  initialized = true;

  void (async () => {
    const fb = await loadFirebase();
    if (!fb) return;
    const { onAuthStateChanged } = await import('firebase/auth');
    onAuthStateChanged(fb.auth, (user) => {
      if (user) {
        authUserId = user.uid;
        setSync({ status: 'syncing', email: user.email ?? null, error: null });
        // A different account than we last synced on this device → reset the
        // bookkeeping so reconciliation adopts the account's remote data.
        if (meta.userId !== user.uid) {
          setMeta({ userId: user.uid, dirty: false, dirtyAt: null, remoteUpdatedAt: null });
        }
        // Firebase fires this on init and on sign-in; reconcile either way.
        void pullAndReconcile();
      } else {
        authUserId = null;
        if (pushTimer) {
          clearTimeout(pushTimer);
          pushTimer = null;
        }
        setSync({ status: 'signedOut', email: null });
      }
    });
  })();
}
