import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearQueue,
  enqueueMutations,
  getEntityRev,
  listQueuedMutations,
  markAttempt,
  removeMutation,
  setEntityRev,
} from './syncQueue';

describe('syncQueue (offline mutation queue)', () => {
  beforeEach(async () => {
    await clearQueue(null);
    await clearQueue('uidA');
  });

  it('enqueues and lists mutations', async () => {
    await enqueueMutations(null, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1' } },
    ]);
    const queued = await listQueuedMutations(null);
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ entity: 'template', entityId: 't1', op: 'upsert' });
  });

  it('collapses successive mutations to the same entity to the newest snapshot', async () => {
    await enqueueMutations(null, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1', name: 'v1' } },
    ]);
    await enqueueMutations(null, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: { id: 't1', name: 'v2' } },
    ]);
    const queued = await listQueuedMutations(null);
    expect(queued).toHaveLength(1);
    expect(queued[0]!.payload).toEqual({ id: 't1', name: 'v2' });
  });

  it('keeps distinct entities as separate queue entries', async () => {
    await enqueueMutations(null, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: {} },
      { entity: 'session', entityId: 's1', op: 'upsert', payload: {} },
    ]);
    expect(await listQueuedMutations(null)).toHaveLength(2);
  });

  it('removes a mutation once drained', async () => {
    await enqueueMutations(null, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: {} },
    ]);
    const [queued] = await listQueuedMutations(null);
    await removeMutation(null, queued!.key);
    expect(await listQueuedMutations(null)).toHaveLength(0);
  });

  it('tracks attempt counts for backoff/telemetry', async () => {
    await enqueueMutations(null, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: {} },
    ]);
    const [queued] = await listQueuedMutations(null);
    await markAttempt(null, queued!.key);
    await markAttempt(null, queued!.key);
    const [after] = await listQueuedMutations(null);
    expect(after!.attempts).toBe(2);
  });

  it('scopes queues per profile — accounts never see each other’s pending writes', async () => {
    await enqueueMutations(null, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: {} },
    ]);
    await enqueueMutations('uidA', [
      { entity: 'template', entityId: 't2', op: 'upsert', payload: {} },
    ]);
    expect(await listQueuedMutations(null)).toHaveLength(1);
    expect(await listQueuedMutations('uidA')).toHaveLength(1);
    expect((await listQueuedMutations(null))[0]!.entityId).toBe('t1');
  });

  it('a delete mutation collapses over a prior queued upsert for the same entity', async () => {
    await enqueueMutations(null, [
      { entity: 'session', entityId: 's1', op: 'upsert', payload: { id: 's1' } },
    ]);
    await enqueueMutations(null, [{ entity: 'session', entityId: 's1', op: 'delete' }]);
    const queued = await listQueuedMutations(null);
    expect(queued).toHaveLength(1);
    expect(queued[0]!.op).toBe('delete');
  });

  it('starts a fresh entity at revision 0 — enqueueing a local edit never touches it', async () => {
    expect(await getEntityRev(null, 'template', 't1')).toBe(0);
    await enqueueMutations(null, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: {} },
    ]);
    // Only a confirmed round-trip with Firestore (syncEngine) advances this —
    // NOT the act of queueing a local change. Otherwise every entity's very
    // first push would look like a conflict (remote 0 vs. an already-bumped
    // local baseline of 1) instead of the fresh write it actually is.
    expect(await getEntityRev(null, 'template', 't1')).toBe(0);
  });

  it('tracks revisions independently per entity', async () => {
    await setEntityRev(null, 'template', 't1', 3);
    await setEntityRev(null, 'template', 't2', 7);
    expect(await getEntityRev(null, 'template', 't1')).toBe(3);
    expect(await getEntityRev(null, 'template', 't2')).toBe(7);
  });

  it('lets the sync engine (or migration) seed/advance a revision baseline', async () => {
    await setEntityRev(null, 'session', 's1', 5);
    expect(await getEntityRev(null, 'session', 's1')).toBe(5);
    await setEntityRev(null, 'session', 's1', 6);
    expect(await getEntityRev(null, 'session', 's1')).toBe(6);
  });

  it('clearQueue also resets revision counters', async () => {
    await enqueueMutations(null, [
      { entity: 'template', entityId: 't1', op: 'upsert', payload: {} },
    ]);
    await setEntityRev(null, 'template', 't1', 4);
    await clearQueue(null);
    expect(await getEntityRev(null, 'template', 't1')).toBe(0);
    expect(await listQueuedMutations(null)).toHaveLength(0);
  });
});
