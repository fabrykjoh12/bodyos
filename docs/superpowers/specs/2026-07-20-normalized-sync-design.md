# Normalized sync + offline mutation queue — design

_Status: approved-for-implementation design. Replaces the whole-blob LWW model
(audit finding #8). Written 2026-07-20._

## Why

One Firestore document mirrors the whole `AppData`: every edit uploads
everything; two devices editing concurrently silently lose one side; the 1 MiB
document limit is a time bomb; entity-level retry/versioning/deletion is
impossible. The program runner cannot be built on this.

## Firestore schema

```text
users/{uid}/meta/profile          user, settings, weeklyPlan, exerciseNotes (small, LWW ok)
users/{uid}/templates/{id}        one doc per template
users/{uid}/sessions/{id}         one doc per COMPLETED session (immutable-by-default)
users/{uid}/active/current        the single active session (see ownership)
users/{uid}/measurements/{id}
users/{uid}/tombstones/{id}       { entity, deletedAt } — deletions replicate explicitly
```

Every doc carries `{ schemaVersion, createdAt, updatedAt (serverTimestamp), rev }`.
`rev` is a per-entity integer bumped on every local mutation; uploads are
idempotent upserts conditional on `rev` (transaction: write wins only if
`remote.rev < local.rev`; otherwise pull + surface).

PRs and streaks are NOT synced — they are derivations (`lib/recompute.ts`)
recomputed on every device from sessions. This kills a whole class of
divergence bugs and shrinks the surface. Photos remain device-local.

## Local mutation queue (IndexedDB, per profile)

```ts
interface Mutation {
  id: string;            // uuid, idempotency key
  entity: 'template' | 'session' | 'active' | 'meta' | 'measurement';
  entityId: string;
  op: 'upsert' | 'delete';
  rev: number;
  payload?: unknown;     // full entity snapshot (upserts)
  queuedAt: string;
  attempts: number;
  state: 'pending' | 'inflight' | 'failed';
}
```

- Applied optimistically to the store, enqueued in the same tick; the UI
  reports "saved" only after the IDB enqueue succeeds (local durability),
  and shows per-queue sync status (n pending / all synced / failed+reason).
- Drain: oldest-first per entity (later mutations to the same entity collapse
  to the newest snapshot — safe because payloads are full snapshots).
  Exponential backoff (1s→2s→…→5min cap), resumes on `online`, on app start,
  and via a manual "Sync now".
- Auth guard: the queue is per-profile; sign-out flushes what it can, leaves
  the rest queued in that profile's namespace for the next sign-in.

## Conflict rules (deterministic, no silent loss)

- **Completed sessions**: immutable once uploaded. A post-completion edit bumps
  `rev`; a rev conflict (edited on two devices) keeps BOTH: the loser is stored
  as `sessions/{id}~conflict-{deviceId}` and a conflict card in Progress asks
  the user to pick — nothing is discarded silently.
- **Templates/meta/measurements**: rev-conditional upsert; on conflict, newest
  `updatedAt` wins BUT the losing payload is written to a `conflicts/` shelf
  (visible in Settings → Data) for 30 days.
- **Deletions**: tombstones win over concurrent edits, except a session edit
  beats a template deletion (sessions never dangle — they embed their data).

## Active-session ownership

`active/current` carries `{ deviceId, heartbeatAt }`. The owning device
heartbeats every 60s while Gym Mode is open. Another device sees the active
workout read-only ("In progress on your phone — take over?"); takeover writes
its own deviceId and the old owner drops to read-only on next heartbeat check.
Completing moves the doc to `sessions/{id}` and deletes `active/current`.

## Migration from the blob

1. On first sign-in after upgrade, read `bodyos_app_state/{uid}`.
2. Fan out into the new collections in a batched write (≤500 ops/batch).
3. Write `users/{uid}/meta/migration = { fromBlob: true, at }`.
4. Keep the blob read-only for two release cycles (rollback path), then delete.
5. Old clients still writing the blob are detected via `migration` doc absence
   in their reads — they keep working until upgraded; the migration re-runs
   idempotently (entity ids are stable).

## Firestore rules (delta)

Owner-only on `users/{uid}/**`; per-collection shape validation (ids, rev int,
serverTimestamp updatedAt); doc size ≤ 200 KB; tombstones write-once.

## Test plan (Firebase emulators — dev project, never prod)

- rules: unauthenticated/cross-user read+write denied; malformed shape denied.
- queue: enqueue→drain happy path; offline replay after restart; backoff on
  permission failure; idempotent double-delivery; collapse of successive edits.
- conflicts: two emulated devices editing one template/session → both payloads
  survive; tombstone vs edit matrix.
- migration: blob → normalized fan-out → verify entity-per-entity equality;
  re-run idempotency; rollback read of the retained blob.
- active session: ownership handoff, stale-heartbeat takeover.

## Implementation order (3 PRs)

1. Mutation queue (pure + IDB) with unit tests, wired to current blob push —
   no schema change (immediate durability win).
2. Normalized collections + rules + emulator suite, dual-write behind a flag.
3. Migration + read-path cutover + blob retirement + conflict UI.
