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

export type ParseBackupResult =
  | { ok: true; data: AppData }
  | { ok: false; error: string };

/**
 * Validate + normalize a JSON string as an exported BodyOS backup. Pure — the
 * caller decides whether to apply it. Rejects anything that isn't recognisably
 * an AppData blob so an unrelated JSON file can't wipe someone's training log.
 */
export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: "That file doesn't look like a BodyOS backup." };
  }
  const d = raw as Partial<AppData>;
  const looksLikeBackup =
    typeof d.version === 'number' &&
    !!d.user &&
    typeof d.user === 'object' &&
    !!(d.user as { settings?: unknown }).settings &&
    Array.isArray(d.templates) &&
    Array.isArray(d.sessions);
  if (!looksLikeBackup) {
    return { ok: false, error: "That file doesn't look like a BodyOS backup." };
  }
  return { ok: true, data: normalizeAppData(d as AppData) };
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
