import { useEffect, useState } from 'react';
import {
  dismissConflict,
  listConflicts,
  restoreConflict,
  useSyncStore,
  type ShelvedConflict,
} from '@/store/cloudSync';
import { Button } from '@/components/ui/Button';

const ENTITY_LABEL: Record<ShelvedConflict['entity'], string> = {
  template: 'Workout template',
  session: 'Workout session',
  measurement: 'Body measurement',
  meta: 'Profile & settings',
  active: 'Active workout',
};

function describe(conflict: ShelvedConflict): string {
  const payload = conflict.payload as { name?: string } | null;
  return payload?.name
    ? `${ENTITY_LABEL[conflict.entity]} — "${payload.name}"`
    : ENTITY_LABEL[conflict.entity];
}

/**
 * Surfaces entries shelved by a rev conflict (two devices editing the same
 * entity between syncs — store/syncEngine.ts never silently discards the
 * loser). Renders nothing when signed out or when there's nothing to show,
 * matching the app's "never crowd the screen" design principle — this is
 * meant to be rare.
 */
export function ConflictShelf() {
  const status = useSyncStore((s) => s.status);
  const [conflicts, setConflicts] = useState<ShelvedConflict[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'synced' && status !== 'error') return;
    let cancelled = false;
    void listConflicts().then((list) => {
      if (!cancelled) setConflicts(list);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (conflicts.length === 0) return null;

  async function keep(id: string) {
    setBusyId(id);
    await dismissConflict(id);
    setConflicts((prev) => prev.filter((c) => c.id !== id));
    setBusyId(null);
  }

  async function restore(conflict: ShelvedConflict) {
    setBusyId(conflict.id);
    await restoreConflict(conflict);
    setConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
    setBusyId(null);
  }

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div>
        <p className="label-tiny text-content-faint">Sync conflicts</p>
        <p className="mt-1 text-sm text-content-muted">
          Two devices edited the same thing between syncs. Nothing was lost — pick which version to
          keep.
        </p>
      </div>
      <div className="row-list">
        {conflicts.map((conflict) => (
          <div key={conflict.id} className="flex flex-col gap-2 py-3">
            <p className="text-sm text-content">{describe(conflict)}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={busyId === conflict.id}
                onClick={() => void restore(conflict)}
              >
                Use this version instead
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === conflict.id}
                onClick={() => void keep(conflict.id)}
              >
                Keep current
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
