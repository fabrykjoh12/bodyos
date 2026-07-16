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

/** Forward-compatible migration hook. Currently only guards the version. */
function migrate(data: AppData): AppData {
  if (!data || typeof data !== 'object') return createSeedData();
  if (data.version !== APP_DATA_VERSION) {
    // Future migrations slot in here. For now, unknown versions fall back to
    // a fresh dataset rather than crashing.
    if (typeof data.version !== 'number') return createSeedData();
  }
  return {
    ...data,
    // Defensive defaults so older payloads don't break newer code paths.
    photos: data.photos ?? [],
    measurements: data.measurements ?? [],
    personalRecords: data.personalRecords ?? [],
    streakDates: data.streakDates ?? [],
    weeklyPlan: data.weeklyPlan ?? {},
    restTimer: data.restTimer ?? { endsAt: null, durationSec: 120, exerciseId: null },
  };
}

export const repository: Repository = new LocalStorageRepository();

export function loadOrSeed(repo: Repository = repository): AppData {
  const existing = repo.load();
  if (existing) return existing;
  const seeded = createSeedData();
  repo.save(seeded);
  return seeded;
}
