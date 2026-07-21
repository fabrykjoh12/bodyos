import { useEffect, useState } from 'react';
import type { ProgressPhoto } from '@/types';
import { getPhotoData } from '@/store/photoStore';
import { repository } from '@/store/repository';

/**
 * Resolve a photo's displayable URL. Fresh captures still carry `dataUrl` in
 * memory; persisted photos store payloads in the profile's IndexedDB store
 * (see photoStore) and load asynchronously here.
 */
export function usePhotoUrl(photo: ProgressPhoto | undefined): string | null {
  const inMemory = photo?.dataUrl || null;
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(null);
    if (!photo || inMemory) return;
    let cancelled = false;
    void getPhotoData(repository.profile, photo.id).then((url) => {
      if (!cancelled) setLoaded(url);
    });
    return () => {
      cancelled = true;
    };
  }, [photo?.id, inMemory, photo]);

  return inMemory ?? loaded;
}
