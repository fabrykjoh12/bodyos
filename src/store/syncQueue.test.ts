import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearQueue,
  enqueueMutations,
  listQueuedMutations,
  markAttempt,
  removeMutation,
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
});
