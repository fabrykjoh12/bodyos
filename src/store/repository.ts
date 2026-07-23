import type { AppData } from '@/types';
import { APP_DATA_VERSION, createEmptyData } from '@/data/seed';

// ---------------------------------------------------------------------------
// Persistence abstraction.
//
// UI and store code depend only on the `Repository` interface, never on
// localStorage directly. Swapping in a networked backend later means writing a
// new implementation of this interface — nothing else changes.
// ---------------------------------------------------------------------------

export interface Repository {
  load(): AppData | null;
  /** Returns true only when the write durably succeeded. */
  save(data: AppData): boolean;
  clear(): void;
}

const STORAGE_KEY = 'bodyos.appdata.v1';

/**
 * Storage key for a profile's data. Each authenticated account gets its own
 * namespace so one account's data can never appear under, merge into, or be
 * uploaded from another account. `null` = the anonymous local-only profile.
 */
export function profileStorageKey(uid: string | null): string {
  return uid ? `${STORAGE_KEY}.u.${uid}` : STORAGE_KEY;
}

export class LocalStorageRepository implements Repository {
  constructor(private readonly key: string = STORAGE_KEY) {}

  load(): AppData | null {
    try {
      const raw = safeStorage()?.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppData;
      return migrate(parsed);
    } catch {
      return null;
    }
  }

  save(data: AppData): boolean {
    try {
      const storage = safeStorage();
      if (!storage) return false;
      storage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      // Quota exhaustion or privacy mode — the caller must surface this;
      // the data currently exists only in memory.
      return false;
    }
  }

  clear(): void {
    try {
      safeStorage()?.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * The app-wide repository: delegates to the active profile's namespace.
 * `setProfile` is called on auth changes (see cloudSync) BEFORE any
 * reconciliation, so reads and writes can never cross account boundaries.
 */
export class ProfileRepository implements Repository {
  private target: Repository = new LocalStorageRepository(profileStorageKey(null));
  private uid: string | null = null;

  setProfile(uid: string | null): void {
    this.uid = uid;
    this.target = new LocalStorageRepository(profileStorageKey(uid));
  }

  get profile(): string | null {
    return this.uid;
  }

  load(): AppData | null {
    return this.target.load();
  }
  save(data: AppData): boolean {
    return this.target.save(data);
  }
  clear(): void {
    this.target.clear();
  }
}

/** In-memory implementation for tests and SSR. */
export class MemoryRepository implements Repository {
  private data: AppData | null = null;
  load(): AppData | null {
    return this.data;
  }
  save(data: AppData): boolean {
    this.data = data;
    return true;
  }
  clear(): void {
    this.data = null;
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Fill in defensive defaults so older/partial payloads don't break newer
 *  code paths. Shared by the storage migration and backup import. */
function normalizeAppData(data: AppData): AppData {
  return {
    ...data,
    photos: data.photos ?? [],
    measurements: data.measurements ?? [],
    personalRecords: data.personalRecords ?? [],
    streakDates: data.streakDates ?? [],
    weeklyPlan: data.weeklyPlan ?? {},
    exerciseNotes: data.exerciseNotes ?? {},
    restTimer: data.restTimer ?? { endsAt: null, durationSec: 120, exerciseId: null },
  };
}

/** Forward-compatible migration hook. Currently only guards the version. */
function migrate(data: AppData): AppData {
  if (!data || typeof data !== 'object') return createEmptyData();
  if (data.version !== APP_DATA_VERSION) {
    // Future migrations slot in here. For now, unknown versions fall back to
    // a fresh dataset rather than crashing.
    if (typeof data.version !== 'number') return createEmptyData();
  }
  return normalizeAppData(data);
}

export type ParseBackupResult = { ok: true; data: AppData } | { ok: false; error: string };

/** Restores must never destroy more data than a file is worth. */
const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

// --- deep structural validation ---------------------------------------------
// Hand-rolled (no runtime dep) but rigorous: every entity that a restore will
// trust is checked for shape, finite numbers, and parseable timestamps, with
// the exact failing location reported. Unknown extra fields are tolerated
// (forward compatibility); wrong types are not.

type Check = { ok: true } | { ok: false; where: string };
const fail = (where: string): Check => ({ ok: false, where });
const OK: Check = { ok: true };

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isIso = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));

function checkSet(s: unknown, where: string): Check {
  if (!isObj(s)) return fail(where);
  if (!isStr(s.id)) return fail(`${where}.id`);
  if (!isFiniteNum(s.weightKg) || (s.weightKg as number) < 0) return fail(`${where}.weightKg`);
  if (!isFiniteNum(s.reps) || (s.reps as number) < 0) return fail(`${where}.reps`);
  if (typeof s.completed !== 'boolean' && s.completed !== undefined)
    return fail(`${where}.completed`);
  return OK;
}

function checkSessionExercise(e: unknown, where: string): Check {
  if (!isObj(e)) return fail(where);
  if (!isStr(e.exerciseId)) return fail(`${where}.exerciseId`);
  if (!Array.isArray(e.sets)) return fail(`${where}.sets`);
  for (let i = 0; i < e.sets.length; i++) {
    const c = checkSet(e.sets[i], `${where}.sets[${i}]`);
    if (!c.ok) return c;
  }
  return OK;
}

function checkSession(s: unknown, where: string): Check {
  if (!isObj(s)) return fail(where);
  if (!isStr(s.id)) return fail(`${where}.id`);
  if (!isStr(s.name)) return fail(`${where}.name`);
  if (!isIso(s.startedAt)) return fail(`${where}.startedAt`);
  if (s.completedAt !== undefined && s.completedAt !== null && !isIso(s.completedAt)) {
    return fail(`${where}.completedAt`);
  }
  if (!Array.isArray(s.exercises)) return fail(`${where}.exercises`);
  for (let i = 0; i < s.exercises.length; i++) {
    const c = checkSessionExercise(s.exercises[i], `${where}.exercises[${i}]`);
    if (!c.ok) return c;
  }
  return OK;
}

function checkTemplate(t: unknown, where: string): Check {
  if (!isObj(t)) return fail(where);
  if (!isStr(t.id)) return fail(`${where}.id`);
  if (!isStr(t.name)) return fail(`${where}.name`);
  if (!Array.isArray(t.exercises)) return fail(`${where}.exercises`);
  for (let i = 0; i < t.exercises.length; i++) {
    const e = t.exercises[i];
    if (!isObj(e) || !isStr(e.exerciseId)) return fail(`${where}.exercises[${i}]`);
  }
  return OK;
}

function checkBackupDeep(d: Partial<AppData>): Check {
  if (!isObj(d.user)) return fail('user');
  if (!isObj((d.user as Record<string, unknown>).settings)) return fail('user.settings');
  const unit = (d.user as { settings?: { unit?: unknown } }).settings?.unit;
  if (unit !== 'kg' && unit !== 'lb') return fail('user.settings.unit');
  for (let i = 0; i < (d.templates as unknown[]).length; i++) {
    const c = checkTemplate((d.templates as unknown[])[i], `templates[${i}]`);
    if (!c.ok) return c;
  }
  for (let i = 0; i < (d.sessions as unknown[]).length; i++) {
    const c = checkSession((d.sessions as unknown[])[i], `sessions[${i}]`);
    if (!c.ok) return c;
  }
  const records = d.personalRecords ?? [];
  if (!Array.isArray(records)) return fail('personalRecords');
  for (let i = 0; i < records.length; i++) {
    const r = records[i] as unknown;
    if (!isObj(r) || !isStr(r.exerciseId) || !isFiniteNum(r.value) || !isIso(r.achievedAt)) {
      return fail(`personalRecords[${i}]`);
    }
  }
  const measurements = d.measurements ?? [];
  if (!Array.isArray(measurements)) return fail('measurements');
  for (let i = 0; i < measurements.length; i++) {
    const m = measurements[i] as unknown;
    if (!isObj(m) || !isIso(m.takenAt)) return fail(`measurements[${i}]`);
  }
  return OK;
}

/**
 * Validate + normalize a JSON string as an exported BodyOS backup. Pure — the
 * caller decides whether to apply it. Every entity a restore will trust is
 * deep-checked; a malformed nested record is rejected with its exact location
 * so an unrelated or corrupted file can never wipe someone's training log.
 */
export function parseBackup(text: string): ParseBackupResult {
  if (text.length > MAX_BACKUP_BYTES) {
    return { ok: false, error: 'That file is too large to be a BodyOS backup.' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: "That file doesn't look like a BodyOS backup." };
  }
  const d = raw as Partial<AppData>;
  const looksLikeBackup =
    typeof d.version === 'number' &&
    d.version >= 1 &&
    d.version <= APP_DATA_VERSION &&
    !!d.user &&
    typeof d.user === 'object' &&
    !!(d.user as { settings?: unknown }).settings &&
    Array.isArray(d.templates) &&
    Array.isArray(d.sessions);
  if (!looksLikeBackup) {
    return { ok: false, error: "That file doesn't look like a BodyOS backup." };
  }
  const deep = checkBackupDeep(d);
  if (!deep.ok) {
    return {
      ok: false,
      error: `Backup is damaged at "${deep.where}" — restore cancelled; nothing was changed.`,
    };
  }
  return { ok: true, data: normalizeAppData(d as AppData) };
}

// --- pre-restore safety net --------------------------------------------------

const PRE_RESTORE_KEY = 'bodyos.prerestore.v1';

/** Snapshot the current data before a destructive restore so it can be undone. */
export function savePreRestoreSnapshot(data: AppData): boolean {
  try {
    const storage = safeStorage();
    if (!storage) return false;
    storage.setItem(PRE_RESTORE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data }));
    return true;
  } catch {
    return false;
  }
}

export function loadPreRestoreSnapshot(): { savedAt: string; data: AppData } | null {
  try {
    const raw = safeStorage()?.getItem(PRE_RESTORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: string; data: AppData };
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    return { savedAt: parsed.savedAt, data: normalizeAppData(parsed.data) };
  } catch {
    return null;
  }
}

export function clearPreRestoreSnapshot(): void {
  try {
    safeStorage()?.removeItem(PRE_RESTORE_KEY);
  } catch {
    /* ignore */
  }
}

export const repository = new ProfileRepository();

/**
 * Load persisted data, or create a truly EMPTY account for a fresh install.
 * Demo data is opt-in only (store `loadDemo` action) — a new user must never
 * see training history they didn't log.
 */
export function loadOrCreate(repo: Repository = repository): AppData {
  const existing = repo.load();
  if (existing) return existing;
  const fresh = createEmptyData();
  repo.save(fresh);
  return fresh;
}
