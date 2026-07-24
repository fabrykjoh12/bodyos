import { create } from 'zustand';
import type { AppData } from '@/types';
import { loadFirebase, isFirebaseConfigured } from '@/lib/firebase';
import { LocalStorageRepository, profileStorageKey } from './repository';
import { clearPhotoData } from './photoStore';
import { diffAppData } from '@/lib/syncDiff';
import { applyPullPatch } from '@/lib/syncPull';
import { clearQueue, listQueuedMutations } from './syncQueue';
import { catchUpNeverSynced, drainQueue, pullRemote } from './syncEngine';
import { migrateFromBlob } from './syncMigration';

// ---------------------------------------------------------------------------
// Optional cloud sync (Firebase Auth + Firestore) — NORMALIZED per-entity
// sync (audit finding #8's replacement for the old whole-blob LWW design).
//
// localStorage stays the synchronous source of truth (the app keeps working
// fully offline). When signed in, every entity (templates/sessions/
// measurements/meta/active-session) mirrors to its OWN Firestore doc under
// `users/{uid}/...`, queued durably in IndexedDB (store/syncQueue.ts) and
// drained with optimistic-concurrency conflict detection (store/syncEngine.ts)
// — a losing edit is shelved to `conflicts/`, never silently discarded, and a
// concurrent delete never forces through a concurrent edit. See
// docs/superpowers/specs/2026-07-20-normalized-sync-design.md.
//
// Existing accounts migrate once from the legacy `bodyos_app_state/{uid}` blob
// (store/syncMigration.ts) on first sign-in after this shipped; the blob is
// left in place (untouched, unread again) as a rollback window.
//
// ACCOUNT ISOLATION: every account has its own local namespace
// (`profileStorageKey(uid)`), plus one anonymous local-only profile. Auth
// changes switch the namespace BEFORE any reconciliation, so data never
// crosses accounts. Signing out flushes any pending write, then unloads the
// account and shows the anonymous profile. The only path across the boundary
// is the explicit, user-initiated `importDeviceData()`.
//
// Two fields are deliberately NOT synced and stay device-local:
//   • photos    — private by design ("never uploaded without explicit action")
//   • restTimer — ephemeral wall-clock state, meaningless on another device
// PRs and streaks are also never synced — they're derivations recomputed on
// every device from `sessions` (lib/recompute.ts).
// ---------------------------------------------------------------------------

const LEGACY_BLOB_COLLECTION = 'bodyos_app_state';
const PUSH_DEBOUNCE_MS = 1500;

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

// --- wiring to the app store (registered at runtime to avoid an import cycle)

let getLocalData: (() => AppData) | null = null;
let applyRemote: ((data: AppData) => void) | null = null;
let switchProfile: ((uid: string | null) => void) | null = null;
let applyingRemote = false;

export function registerSync(hooks: {
  getLocalData: () => AppData;
  applyRemote: (data: AppData) => void;
  /** Swap the local storage namespace to the given account (null = anonymous). */
  switchProfile: (uid: string | null) => void;
}): void {
  getLocalData = hooks.getLocalData;
  applyRemote = hooks.applyRemote;
  switchProfile = hooks.switchProfile;
}

// --- engine ------------------------------------------------------------------

let authUserId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
/** The last AppData snapshot we've already diffed+enqueued changes for —
 *  NOT "last confirmed synced with remote" (that's the per-entity baseline
 *  in syncQueue.ts). Reset to null on every profile switch so the next write
 *  re-establishes it; see bootstrapSync. */
let lastDiffedSnapshot: AppData | null = null;

/** Exponential backoff for failed pushes: 2s, 4s, 8s … capped at 5 min. */
export function backoffMs(attempt: number): number {
  return Math.min(2000 * 2 ** Math.max(0, attempt), 5 * 60 * 1000);
}

export function isSignedIn(): boolean {
  return authUserId !== null;
}

function codeOf(e: unknown): string {
  return e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
}

/** Map Firebase Auth error codes to friendly, human messages. */
function authMessage(e: unknown): string {
  const code = codeOf(e);
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

/** Re-pull whichever entities just lost a conflict, so the local store
 *  reflects the winning remote value instead of the discarded local edit. */
async function adoptRemoteWins(uid: string): Promise<void> {
  if (!getLocalData || !applyRemote) return;
  const patch = await pullRemote(uid);
  applyingRemote = true;
  try {
    const merged = applyPullPatch(getLocalData(), patch);
    applyRemote(merged);
    lastDiffedSnapshot = merged;
  } finally {
    applyingRemote = false;
  }
}

async function drainAndReport(uid: string): Promise<void> {
  setSync({ status: 'syncing', error: null });
  const summary = await drainQueue(uid);

  if (summary.failed > 0) {
    // A failed push must never strand data: the mutation stays queued (so a
    // restart re-attempts it) and we retry automatically with backoff. The
    // device copy is always safe — this only delays the cloud mirror.
    setSync({
      status: 'error',
      error: 'Sync delayed (retrying automatically) — your data is safe on this device.',
    });
    if (retryTimer) clearTimeout(retryTimer);
    const delay = backoffMs(retryAttempt);
    retryAttempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (authUserId === uid) void drainAndReport(uid);
    }, delay);
  } else {
    retryAttempt = 0;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    setSync({ status: 'synced', lastSyncedAt: Date.now(), error: null });
  }

  if (summary.remoteWon.length > 0) await adoptRemoteWins(uid);
}

function schedulePush(uid: string): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void drainAndReport(uid);
  }, PUSH_DEBOUNCE_MS);
}

/** Called by the store after every local mutation. */
export function notifyLocalWrite(data: AppData): void {
  if (applyingRemote) return; // don't echo a remote-applied write back up
  const uid = authUserId;
  if (!uid) return; // local-only when signed out
  const mutations = diffAppData(lastDiffedSnapshot, data);
  lastDiffedSnapshot = data;
  if (mutations.length === 0) return;
  void (async () => {
    await import('./syncQueue').then(({ enqueueMutations }) => enqueueMutations(uid, mutations));
    schedulePush(uid);
  })();
}

/** Migrate (idempotent), pull whatever's new, catch up anything this device
 *  has never synced at all, then drain the queue. Runs on every sign-in and
 *  on a manual "Sync now". */
async function bootstrapSync(uid: string): Promise<void> {
  if (!getLocalData || !applyRemote) return;
  setSync({ status: 'syncing', error: null });
  try {
    await migrateFromBlob(uid);

    const patch = await pullRemote(uid);
    applyingRemote = true;
    try {
      const merged = applyPullPatch(getLocalData(), patch);
      applyRemote(merged);
      lastDiffedSnapshot = merged;
    } finally {
      applyingRemote = false;
    }

    await catchUpNeverSynced(uid, getLocalData());
    await drainAndReport(uid);
  } catch (e) {
    setSync({ status: 'error', error: messageOf(e) });
  }
}

// --- public auth API (called from the Account UI) --------------------------

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
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

/** One-tap Google sign-in. Uses a popup, falling back to a full-page redirect
 *  where popups are blocked or unsupported (common in installed PWAs). */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const fb = await loadFirebase();
  if (!fb) return { error: 'Cloud sync is not configured.' };
  try {
    const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
      await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(fb.auth, provider);
      return { error: null };
    } catch (e) {
      const code = codeOf(e);
      // User dismissed the popup — not an error worth showing.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { error: null };
      }
      // Popup blocked/unsupported → redirect (navigates away; completes on load).
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(fb.auth, provider);
        return { error: null };
      }
      return { error: authMessage(e) };
    }
  } catch (e) {
    return { error: authMessage(e) };
  }
}

/** Send a password-reset email (Firebase delivers these reliably). */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const fb = await loadFirebase();
  if (!fb) return { error: 'Cloud sync is not configured.' };
  try {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(fb.auth, email);
    return { error: null };
  } catch (e) {
    return { error: authMessage(e) };
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
  // Flush — never drop — anything still queued before leaving the account.
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  retryAttempt = 0;
  if (authUserId) {
    const pending = await listQueuedMutations(authUserId);
    if (pending.length > 0) await drainQueue(authUserId);
  }
  const { signOut: fbSignOut } = await import('firebase/auth');
  await fbSignOut(fb.auth);
}

/** Manual "Sync now" for the UI: pull whatever's new, then drain the queue. */
export async function syncNow(): Promise<void> {
  if (!authUserId) return;
  await bootstrapSync(authUserId);
}

// --- explicit device-data import (never automatic) --------------------------

/** What the device's anonymous local profile contains — lets the UI offer an
 *  explicit import without ever reading that data into the signed-in state. */
export function anonymousDataSummary(): { sessions: number; templates: number } | null {
  const anon = new LocalStorageRepository(profileStorageKey(null)).load();
  if (!anon) return null;
  const sessions = anon.sessions.length;
  const templates = anon.templates.length;
  if (sessions === 0 && templates === 0) return null;
  return { sessions, templates };
}

/**
 * User-initiated ONLY: copy this device's anonymous local data into the
 * currently signed-in account, replacing the account's current data, then
 * push. This is the single sanctioned path across the profile boundary —
 * nothing ever crosses it automatically.
 */
export async function importDeviceData(): Promise<{ error: string | null }> {
  if (!authUserId || !applyRemote) return { error: 'Sign in first.' };
  const anon = new LocalStorageRepository(profileStorageKey(null)).load();
  if (!anon) return { error: 'No local data found on this device.' };
  // Treat everything in `anon` as new to push, regardless of what this
  // account previously had synced.
  lastDiffedSnapshot = null;
  applyRemote(anon); // triggers persist() -> notifyLocalWrite(anon), enqueuing it all
  await drainAndReport(authUserId);
  return { error: null };
}

// --- deletion ----------------------------------------------------------------

/** Remove every local trace of an account's namespace on this device. */
export async function localAccountCleanup(uid: string): Promise<void> {
  new LocalStorageRepository(profileStorageKey(uid)).clear();
  await clearQueue(uid);
  await clearPhotoData(uid);
}

async function deleteNormalizedCollection(uid: string, collectionName: string): Promise<void> {
  const fb = await loadFirebase();
  if (!fb) return;
  const { collection, getDocs, writeBatch } = await import('firebase/firestore');
  const snap = await getDocs(collection(fb.db, 'users', uid, collectionName));
  if (snap.empty) return;
  const batch = writeBatch(fb.db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/** Delete the account's cloud training data: the legacy blob (if it still
 *  exists) AND every normalized collection. Local + auth stay. */
export async function deleteCloudData(): Promise<{ error: string | null }> {
  const fb = await loadFirebase();
  if (!fb || !authUserId) return { error: 'Sign in first.' };
  const uid = authUserId;
  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(fb.db, LEGACY_BLOB_COLLECTION, uid));
    for (const c of [
      'templates',
      'sessions',
      'measurements',
      'meta',
      'active',
      'tombstones',
      'conflicts',
      'migration',
    ]) {
      await deleteNormalizedCollection(uid, c);
    }
    await clearQueue(uid);
    lastDiffedSnapshot = null;
    return { error: null };
  } catch (e) {
    return { error: messageOf(e) };
  }
}

export type DeleteAccountResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      /** Firebase demands a fresh sign-in for destructive auth operations. */
      requiresRecentLogin: boolean;
      /** True when cloud data was already removed before the failure —
       *  reported honestly so the UI never claims full deletion. */
      cloudDeleted: boolean;
    };

/**
 * Delete the ENTIRE account: cloud training data, the Firebase identity, and
 * this device's local namespace for that account. Retryable and idempotent —
 * a partial failure reports exactly what was and wasn't removed.
 */
export async function deleteAccount(password?: string): Promise<DeleteAccountResult> {
  const fb = await loadFirebase();
  if (!fb || !authUserId || !fb.auth.currentUser) {
    return { ok: false, error: 'Sign in first.', requiresRecentLogin: false, cloudDeleted: false };
  }
  const uid = authUserId;

  // 1. Cloud data first, while auth is definitely valid.
  const cloud = await deleteCloudData();
  if (cloud.error) {
    return { ok: false, error: cloud.error, requiresRecentLogin: false, cloudDeleted: false };
  }

  // 2. The auth identity — may demand recent login; reauthenticate and retry.
  try {
    const { deleteUser } = await import('firebase/auth');
    try {
      await deleteUser(fb.auth.currentUser);
    } catch (e) {
      if (codeOf(e) !== 'auth/requires-recent-login') throw e;
      const user = fb.auth.currentUser;
      const email = user.email;
      const usesPassword = user.providerData.some((p) => p.providerId === 'password');
      if (usesPassword && email && password) {
        const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password));
      } else if (!usesPassword) {
        const { GoogleAuthProvider, reauthenticateWithPopup } = await import('firebase/auth');
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        return {
          ok: false,
          error: 'Confirm your password to finish deleting the account.',
          requiresRecentLogin: true,
          cloudDeleted: true,
        };
      }
      await deleteUser(user);
    }
  } catch (e) {
    return { ok: false, error: authMessage(e), requiresRecentLogin: false, cloudDeleted: true };
  }

  // 3. Local traces. The auth listener then switches to the anonymous profile.
  await localAccountCleanup(uid);
  return { ok: true };
}

// --- startup ---------------------------------------------------------------

let initialized = false;

export function initCloudSync(): void {
  if (initialized || !isFirebaseConfigured) return;
  initialized = true;

  void (async () => {
    const fb = await loadFirebase();
    if (!fb) return;
    const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth');
    // Finish a redirect-based Google sign-in if one is pending; onAuthStateChanged
    // then fires with the user. Errors here are non-fatal.
    void getRedirectResult(fb.auth).catch(() => {});
    onAuthStateChanged(fb.auth, (user) => {
      if (user) {
        authUserId = user.uid;
        // ORDER MATTERS: switch the local namespace to this account BEFORE
        // any sync so the previous profile's data (anonymous or another
        // account) can never be read, displayed, merged, or uploaded here.
        switchProfile?.(user.uid);
        lastDiffedSnapshot = null;
        setSync({ status: 'syncing', email: user.email ?? null, error: null });
        // Firebase fires this on init and on sign-in; bootstrap either way.
        void bootstrapSync(user.uid);
      } else {
        authUserId = null;
        if (pushTimer) {
          clearTimeout(pushTimer);
          pushTimer = null;
        }
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        retryAttempt = 0;
        lastDiffedSnapshot = null;
        // Unload the account's data immediately; show the device's own
        // anonymous profile instead.
        switchProfile?.(null);
        setSync({ status: 'signedOut', email: null });
      }
    });
  })();
}
