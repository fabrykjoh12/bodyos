import type { ISODate, PersonalRecord, WorkoutSession } from '@/types';
import { detectPersonalRecords } from './prstats';

// ---------------------------------------------------------------------------
// Derived-data recomputation. Sessions are the source of truth; PRs and
// streaks are derivations. After any historical edit or deletion the ledgers
// are rebuilt from scratch so derived records can never disagree with the
// sessions they came from.
// ---------------------------------------------------------------------------

/** Rebuild the entire PR ledger by replaying completed sessions in order. */
export function recomputePersonalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const ordered = [...sessions]
    .filter((s) => s.status === 'completed' && !s.isDeload)
    .sort(
      (a, b) =>
        new Date(a.completedAt ?? a.startedAt).getTime() -
        new Date(b.completedAt ?? b.startedAt).getTime(),
    );
  const records: PersonalRecord[] = [];
  for (const session of ordered) {
    records.push(...detectPersonalRecords(session, records));
  }
  return records;
}

/** Rebuild streak dates (completed-session timestamps, newest first). */
export function recomputeStreakDates(sessions: WorkoutSession[]): ISODate[] {
  return sessions
    .filter((s) => s.status === 'completed')
    .map((s) => s.completedAt ?? s.startedAt)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
}
