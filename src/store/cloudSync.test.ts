import { describe, expect, it } from 'vitest';
import { decidePull, mergeRemote, toSynced } from './cloudSync';
import { createSeedData } from '@/data/seed';
import type { AppData } from '@/types';

describe('cloudSync reconciliation', () => {
  describe('toSynced', () => {
    it('strips device-local photos and restTimer from the synced payload', () => {
      const data = createSeedData();
      const synced = toSynced(data) as Partial<AppData>;
      expect('photos' in synced).toBe(false);
      expect('restTimer' in synced).toBe(false);
      // Everything else is carried.
      expect(synced.templates).toBe(data.templates);
      expect(synced.sessions).toBe(data.sessions);
      expect(synced.user).toBe(data.user);
    });
  });

  describe('mergeRemote', () => {
    it('adopts synced fields from remote but keeps local photos and restTimer', () => {
      const local = createSeedData();
      local.photos = [
        { id: 'p1', pose: 'front-relaxed', dataUrl: 'x', takenAt: 'now', weekLabel: 'Week 1' },
      ];
      local.restTimer = { endsAt: 12345, durationSec: 90, exerciseId: 'squat' };

      const remote = toSynced({ ...createSeedData(), streakDates: ['2026-01-01'] });
      const merged = mergeRemote(local, remote);

      // synced field taken from remote
      expect(merged.streakDates).toEqual(['2026-01-01']);
      // device-local fields preserved from local
      expect(merged.photos).toBe(local.photos);
      expect(merged.restTimer).toBe(local.restTimer);
    });
  });

  describe('decidePull', () => {
    const base = {
      remoteExists: true,
      remoteUpdatedAt: '2026-07-16T10:00:00.000Z',
      lastSyncedRemoteUpdatedAt: '2026-07-16T10:00:00.000Z',
      localDirty: false,
      localDirtyAt: null as number | null,
    };

    it('pushes to seed the cloud when no remote row exists', () => {
      expect(decidePull({ ...base, remoteExists: false }).action).toBe('push');
    });

    it('is a no-op when remote is unchanged and there are no local edits', () => {
      expect(decidePull(base).action).toBe('noop');
    });

    it('pushes local edits when remote is unchanged since last sync', () => {
      expect(decidePull({ ...base, localDirty: true, localDirtyAt: Date.now() }).action).toBe(
        'push',
      );
    });

    it('adopts remote when another device wrote and we have no local edits', () => {
      expect(decidePull({ ...base, remoteUpdatedAt: '2026-07-16T11:00:00.000Z' }).action).toBe(
        'adopt',
      );
    });

    it('adopts remote on a true conflict when the remote write is newer', () => {
      const localDirtyAt = Date.parse('2026-07-16T10:30:00.000Z');
      expect(
        decidePull({
          ...base,
          remoteUpdatedAt: '2026-07-16T11:00:00.000Z',
          localDirty: true,
          localDirtyAt,
        }).action,
      ).toBe('adopt');
    });

    it('pushes local on a true conflict when the local edit is newer', () => {
      const localDirtyAt = Date.parse('2026-07-16T12:00:00.000Z');
      expect(
        decidePull({
          ...base,
          remoteUpdatedAt: '2026-07-16T11:00:00.000Z',
          localDirty: true,
          localDirtyAt,
        }).action,
      ).toBe('push');
    });
  });
});

describe('backoffMs', () => {
  it('doubles from 2s and caps at 5 minutes', async () => {
    const { backoffMs } = await import('./cloudSync');
    expect(backoffMs(0)).toBe(2000);
    expect(backoffMs(1)).toBe(4000);
    expect(backoffMs(3)).toBe(16000);
    expect(backoffMs(20)).toBe(5 * 60 * 1000);
  });
});
