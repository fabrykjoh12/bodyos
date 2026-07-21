import { describe, expect, it } from 'vitest';
import { localAccountCleanup } from './cloudSync';
import { LocalStorageRepository, profileStorageKey } from './repository';
import { getPhotoData, putPhotoData } from './photoStore';
import { createSeedData } from '@/data/seed';

describe('localAccountCleanup', () => {
  it('removes the account namespace, sync meta, and photo payloads', async () => {
    const uid = 'del-uid';
    new LocalStorageRepository(profileStorageKey(uid)).save(createSeedData());
    localStorage.setItem(`bodyos.sync.meta.v1.${uid}`, '{"dirty":false}');
    await putPhotoData(uid, 'p1', 'data:image/webp;base64,XX');

    await localAccountCleanup(uid);

    expect(localStorage.getItem(profileStorageKey(uid))).toBeNull();
    expect(localStorage.getItem(`bodyos.sync.meta.v1.${uid}`)).toBeNull();
    expect(await getPhotoData(uid, 'p1')).toBeNull();
  });

  it('leaves the anonymous profile untouched', async () => {
    const anon = new LocalStorageRepository(profileStorageKey(null));
    anon.save(createSeedData());
    await localAccountCleanup('some-other-uid');
    expect(anon.load()).not.toBeNull();
    anon.clear();
  });
});
