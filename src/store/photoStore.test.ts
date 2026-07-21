import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPhotoData,
  deletePhotoData,
  getPhotoData,
  prunePhotoData,
  putPhotoData,
} from './photoStore';
import { LocalStorageRepository, profileStorageKey } from './repository';
import { useStore, switchActiveProfile } from './useStore';

const URL_A = 'data:image/webp;base64,AAAA';
const URL_B = 'data:image/webp;base64,BBBB';

describe('photoStore (IndexedDB payloads)', () => {
  beforeEach(async () => {
    await clearPhotoData(null);
    await clearPhotoData('uidA');
  });

  it('round-trips a payload', async () => {
    expect(await putPhotoData(null, 'p1', URL_A)).toBe(true);
    expect(await getPhotoData(null, 'p1')).toBe(URL_A);
    await deletePhotoData(null, 'p1');
    expect(await getPhotoData(null, 'p1')).toBeNull();
  });

  it('scopes payloads per profile — accounts never see each other’s photos', async () => {
    await putPhotoData(null, 'p1', URL_A);
    await putPhotoData('uidA', 'p1', URL_B);
    expect(await getPhotoData(null, 'p1')).toBe(URL_A);
    expect(await getPhotoData('uidA', 'p1')).toBe(URL_B);
  });

  it('prunes orphaned payloads', async () => {
    await putPhotoData(null, 'keep', URL_A);
    await putPhotoData(null, 'orphan', URL_B);
    await prunePhotoData(null, ['keep']);
    expect(await getPhotoData(null, 'keep')).toBe(URL_A);
    expect(await getPhotoData(null, 'orphan')).toBeNull();
  });
});

describe('photo payloads never bloat the persisted document', () => {
  beforeEach(() => {
    switchActiveProfile(null);
    for (const uid of [null, 'uidA']) new LocalStorageRepository(profileStorageKey(uid)).clear();
    useStore.getState().resetAll();
  });

  it('persists metadata only — the payload goes to IndexedDB', async () => {
    useStore.getState().addPhoto({
      id: 'photo-big',
      pose: 'front-relaxed',
      dataUrl: URL_A,
      takenAt: new Date().toISOString(),
      weekLabel: 'Week 1',
    });
    // In-memory keeps the payload for instant display…
    expect(useStore.getState().photos[0]!.dataUrl).toBe(URL_A);
    // …but the persisted document must not contain it.
    const raw = localStorage.getItem(profileStorageKey(null))!;
    expect(raw).toContain('photo-big');
    expect(raw).not.toContain('AAAA');
    // …and the payload is durably in the blob store.
    expect(await getPhotoData(null, 'photo-big')).toBe(URL_A);
  });

  it('deletePhoto removes both metadata and payload', async () => {
    useStore.getState().addPhoto({
      id: 'photo-del',
      pose: 'front-relaxed',
      dataUrl: URL_A,
      takenAt: new Date().toISOString(),
      weekLabel: 'Week 1',
    });
    useStore.getState().deletePhoto('photo-del');
    expect(useStore.getState().photos).toHaveLength(0);
    expect(await getPhotoData(null, 'photo-del')).toBeNull();
  });
});
