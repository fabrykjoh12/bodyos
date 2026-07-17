import type { AppData } from '@/types';
import { APP_DATA_VERSION, createSeedData } from '@/data/seed';

// ---------------------------------------------------------------------------
// Persistence abstraction.
//
// UI and store code depend only on the `Repository` interface, never on
// localStorage directly. Swapping in a networked backend later means writing a
// new implementation of this interface — nothing else changes.
// ---------------------------------------------------------------------------

export interface Repository {
  load(): AppData | null;
  save(data: AppData): void;
  clear(): void;
}

const STORAGE_KEY = 'bodyos.appdata.v1';

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

  save(data: AppData): void {
    try {
      safeStorage()?.setItem(this.key, JSON.stringify(data));
    } catch {
      /* quota or privacy mode — data stays in memory for this session */
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

/** In-memory implementation for tests and SSR. */
export class MemoryRepository implements Repository {
  private data: AppData | null = null;
  load(): AppData | null {
    return this.data;
  }
  save(data: AppData): void {
    this.data = data;
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
  if (!data || typeof data !== 'object') return createSeedData();
  if (data.version !== APP_DATA_VERSION) {
    // Future migrations slot in here. For now, unknown versions fall back to
    // a fresh dataset rather than crashing.
    if (typeof data.version !== 'number') return createSeedData();
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

export const repository: Repository = new LocalStorageRepository();

export function loadOrSeed(repo: Repository = repository): AppData {
  const existing = repo.load();
  if (existing) return existing;
  const seeded = createSeedData();
  repo.save(seeded);
  return seeded;
}
