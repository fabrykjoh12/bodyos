import { describe, expect, it } from 'vitest';
import { localAccountCleanup } from './cloudSync';
import { LocalStorageRepository, profileStorageKey } from './repository';
import { getPhotoData, putPhotoData } from './photoStore';
import { enqueueMutations, getEntityRev, listQueuedMutations, setEntityRev } from './syncQueue';
import { createSeedData } from '@/data/seed';

describe('localAccountCleanup', () => {
  it('removes the account namespace, the sync queue/revs, and photo payloads', async () => {
    const uid = 'del-uid';
    new LocalStorageRepository(profileStorageKey(uid)).save(createSeedData());
    await enqueueMutations(uid, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: {} },
    ]);
    await setEntityRev(uid, 'template', 't1', 3);
    await putPhotoData(uid, 'p1', 'data:image/webp;base64,XX');

    await localAccountCleanup(uid);

    expect(localStorage.getItem(profileStorageKey(uid))).toBeNull();
    expect(await listQueuedMutations(uid)).toHaveLength(0);
    expect(await getEntityRev(uid, 'template', 't1')).toBe(0);
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
