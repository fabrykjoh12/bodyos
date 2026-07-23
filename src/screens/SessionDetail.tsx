import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import type { SetEntry } from '@/types';
import { useStore } from '@/store/useStore';
import { exerciseName } from '@/data/exercises';
import { formatMinutes, formatVolume, formatWeight, formatWeightValue } from '@/lib/format';
import { sessionSetCount, sessionTotalVolume } from '@/lib/prstats';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { NumericStepper } from '@/components/ui/NumericStepper';

/**
 * A completed session's record — reviewable and CORRECTABLE. Every edit
 * recomputes PRs and streaks from source data (store actions), so derived
 * records can never disagree with the log.
 */
export function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useStore((s) => s.sessions.find((x) => x.id === id));
  const unit = useStore((s) => s.user.settings.unit);
  const updateHistoricalSet = useStore((s) => s.updateHistoricalSet);
  const renameSession = useStore((s) => s.renameSession);
  const deleteSession = useStore((s) => s.deleteSession);

  const [editing, setEditing] = useState<SetEntry | null>(null);
  const [editWeight, setEditWeight] = useState(0);
  const [editReps, setEditReps] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stats = useMemo(() => {
    if (!session) return null;
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.completedAt ?? session.startedAt).getTime();
    return {
      minutes: Math.max(1, Math.round((end - start) / 60000)),
      volume: sessionTotalVolume(session),
      sets: sessionSetCount(session),
    };
  }, [session]);

  if (!session || !stats) {
    return (
      <div className="flex flex-col gap-4">
        <ScreenHeader title="Session" back />
        <p className="card p-4 text-sm text-content-muted">This session no longer exists.</p>
      </div>
    );
  }

  const date = new Date(session.completedAt ?? session.startedAt);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <ScreenHeader
        title={session.name}
        subtitle={date.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
        back
        right={
          <button
            aria-label="Rename session"
            onClick={() => {
              setNameDraft(session.name);
              setRenaming(true);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-content-muted hover:bg-surface-2"
          >
            <Pencil size={18} />
          </button>
        }
      />

      <div className="card flex divide-x divide-line p-0">
        <Cell label="Volume" value={formatVolume(stats.volume, unit)} />
        <Cell label="Sets" value={String(stats.sets)} />
        <Cell label="Duration" value={formatMinutes(stats.minutes)} />
      </div>

      {session.isDeload && (
        <p className="text-center text-xs text-content-muted">
          Deload session — excluded from records and progression baselines.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {session.exercises.map((ex) => {
          const done = ex.sets.filter((s) => s.completed);
          if (done.length === 0) return null;
          return (
            <section key={ex.id} className="card p-4">
              <p className="mb-2 text-[15px] font-bold text-content">
                {exerciseName(ex.exerciseId)}
              </p>
              <ol className="flex flex-col gap-1.5">
                {done.map((st) => (
                  <li key={st.id}>
                    <button
                      onClick={() => {
                        setEditing(st);
                        setEditWeight(st.weightKg);
                        setEditReps(st.reps);
                      }}
                      aria-label={`Edit set ${st.setNumber}`}
                      className="flex w-full items-center gap-3 rounded-xl border border-line/60 px-3 py-2 text-left text-sm transition-colors hover:border-line-strong"
                    >
                      <span className="tnum flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-xs font-bold text-content-muted">
                        {st.setNumber}
                      </span>
                      {st.isWarmup && (
                        <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-caution">
                          Warmup
                        </span>
                      )}
                      <span className="tnum ml-auto font-semibold text-content">
                        {formatWeight(st.weightKg, unit, false)}
                        <span className="ml-1 text-xs font-normal text-content-faint">{unit}</span>
                      </span>
                      <span className="tnum w-14 text-right font-semibold text-content">
                        {st.reps}
                        <span className="ml-1 text-xs font-normal text-content-faint">reps</span>
                      </span>
                      <Pencil size={13} className="shrink-0 text-content-faint" aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <button
        onClick={() => setConfirmDelete(true)}
        className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-danger/80 hover:text-danger"
      >
        <Trash2 size={15} /> Delete this session
      </button>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Correct this set">
        <div className="flex flex-col gap-4">
          <NumericStepper
            label="Weight"
            value={editWeight}
            unit={unit}
            step={2.5}
            onChange={setEditWeight}
            format={(v) => formatWeightValue(v, unit)}
          />
          <NumericStepper label="Reps" value={editReps} step={1} onChange={setEditReps} />
        </div>
        <p className="mt-3 text-xs text-content-faint">
          Records and streaks are recalculated from your corrected log.
        </p>
        <div className="mt-4">
          <Button
            fullWidth
            onClick={() => {
              if (editing)
                updateHistoricalSet(session.id, editing.id, {
                  weightKg: editWeight,
                  reps: editReps,
                });
              setEditing(null);
            }}
          >
            Save correction
          </Button>
        </div>
      </Sheet>

      <Sheet open={renaming} onClose={() => setRenaming(false)} title="Rename session">
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-content outline-none focus:border-accent"
        />
        <div className="mt-4">
          <Button
            fullWidth
            onClick={() => {
              renameSession(session.id, nameDraft);
              setRenaming(false);
            }}
          >
            Save name
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this session?"
      >
        <p className="text-sm text-content-muted">
          The session is removed from your log, and records and streaks are recalculated without it.
          This cannot be undone.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              deleteSession(session.id);
              navigate(-1);
            }}
          >
            Delete session
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 px-3 py-4 text-center">
      <p className="tnum text-[20px] font-semibold leading-none tracking-[-0.02em] text-content">
        {value}
      </p>
      <p className="label-tiny mt-2">{label}</p>
    </div>
  );
}
