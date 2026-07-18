import { create } from 'zustand';
import type { AppData } from '@/types';
import { loadSupabase, isSupabaseConfigured } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Optional cloud sync.
//
// localStorage stays the synchronous source of truth (the app keeps working
// fully offline). When signed in, the whole AppData blob is mirrored to a
// single per-user row (`public.bodyos_app_state`) — pushed on local writes
// (debounced) and pulled/reconciled on sign-in. Conflicts are resolved
// last-write-wins at whole-blob granularity: simple and predictable for a
// single-user app; no field-level merge.
//
// Two fields are deliberately NOT synced and stay device-local:
//   • photos    — private by design ("never uploaded without explicit action")
//   • restTimer — ephemeral wall-clock state, meaningless on another device
// ---------------------------------------------------------------------------

const TABLE = 'bodyos_app_state';
const META_KEY = 'bodyos.sync.meta.v1';
const PUSH_DEBOUNCE_MS = 1500;

type SyncedData = Omit<AppData, 'photos' | 'restTimer'>;

export type SyncStatus =
  | 'unconfigured' // no Supabase credentials compiled in
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
  status: isSupabaseConfigured ? 'signedOut' : 'unconfigured',
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

function messageOf(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'Sync failed';
}

async function pushNow(): Promise<void> {
  const supabase = await loadSupabase();
  if (!supabase || !authUserId || !getLocalData) return;
  const local = getLocalData();
  setSync({ status: 'syncing', error: null });
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(
        { user_id: authUserId, data: toSynced(local), app_version: local.version },
        { onConflict: 'user_id' },
      )
      .select('updated_at')
      .single();
    if (error) throw error;
    setMeta({
      dirty: false,
      dirtyAt: null,
      remoteUpdatedAt: (data as { updated_at: string }).updated_at,
      userId: authUserId,
    });
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
  const supabase = await loadSupabase();
  if (!supabase || !authUserId || !getLocalData || !applyRemote) return;
  setSync({ status: 'syncing', error: null });
  try {
    const { data: row, error } = await supabase
      .from(TABLE)
      .select('data, updated_at')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (error) throw error;

    const decision = decidePull({
      remoteExists: Boolean(row),
      remoteUpdatedAt: row ? (row as { updated_at: string }).updated_at : null,
      lastSyncedRemoteUpdatedAt: meta.remoteUpdatedAt,
      localDirty: meta.dirty,
      localDirtyAt: meta.dirtyAt,
    });

    switch (decision.action) {
      case 'push':
        await pushNow();
        break;
      case 'adopt':
        adopt(
          (row as { data: SyncedData }).data,
          (row as { updated_at: string }).updated_at,
        );
        break;
      case 'noop':
        setSync({ status: 'synced', lastSyncedAt: Date.now(), error: null });
        break;
    }
  } catch (e) {
    setSync({ status: 'error', error: messageOf(e) });
  }
}

// --- public auth API (called from the Settings UI) -------------------------

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const supabase = await loadSupabase();
  if (!supabase) return { error: 'Cloud sync is not configured.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? error.message : null };
}

export async function signUp(
  email: string,
  password: string,
): Promise<{ error: string | null; needsConfirmation: boolean }> {
  const supabase = await loadSupabase();
  if (!supabase) return { error: 'Cloud sync is not configured.', needsConfirmation: false };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message, needsConfirmation: false };
  // When email confirmation is required, no session exists until confirmed.
  return { error: null, needsConfirmation: !data.session };
}

/** Re-send the sign-up confirmation email (e.g. the first one never arrived). */
export async function resendConfirmation(email: string): Promise<{ error: string | null }> {
  const supabase = await loadSupabase();
  if (!supabase) return { error: 'Cloud sync is not configured.' };
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return { error: error ? error.message : null };
}

export async function signOut(): Promise<void> {
  const supabase = await loadSupabase();
  if (!supabase) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  await supabase.auth.signOut();
}

/** Manual "Sync now" for the UI. */
export async function syncNow(): Promise<void> {
  await pullAndReconcile();
}

// --- startup ---------------------------------------------------------------

let initialized = false;

export function initCloudSync(): void {
  if (initialized || !isSupabaseConfigured) return;
  initialized = true;

  void (async () => {
    const supabase = await loadSupabase();
    if (!supabase) return;
    supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      if (user) {
        authUserId = user.id;
        setSync({ status: 'syncing', email: user.email ?? null, error: null });
        // A different account than we last synced on this device → reset the
        // bookkeeping so reconciliation adopts the account's remote data.
        if (meta.userId !== user.id) {
          setMeta({ userId: user.id, dirty: false, dirtyAt: null, remoteUpdatedAt: null });
        }
        if (
          event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION' ||
          event === 'TOKEN_REFRESHED'
        ) {
          void pullAndReconcile();
        }
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
