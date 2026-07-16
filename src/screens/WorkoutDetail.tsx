import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Pencil, Play, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { requireExercise } from '@/data/exercises';
import { formatRepRange, formatWeight, formatDuration } from '@/lib/format';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Chip } from '@/components/ui/Chip';

export function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const template = useStore((s) => s.templates.find((t) => t.id === id));
  const unit = useStore((s) => s.user.settings.unit);
  const startSession = useStore((s) => s.startSession);
  const duplicateTemplate = useStore((s) => s.duplicateTemplate);
  const deleteTemplate = useStore((s) => s.deleteTemplate);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!template) {
    return (
      <div className="flex flex-col gap-4">
        <ScreenHeader title="Workout" back />
        <p className="card p-4 text-sm text-content-muted">This workout no longer exists.</p>
      </div>
    );
  }

  const start = () => {
    startSession(template.id);
    const created = useStore.getState().activeSession;
    if (created) navigate(`/session/${created.id}`);
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <ScreenHeader
        title={template.name}
        subtitle={template.focus}
        back="/workouts"
        right={
          <>
            <button
              aria-label="Duplicate"
              onClick={() => {
                const newId = duplicateTemplate(template.id);
                navigate(`/workouts/${newId}`);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-content-muted hover:bg-surface-2"
            >
              <Copy size={18} />
            </button>
            <button
              aria-label="Edit"
              onClick={() => navigate(`/workouts/new?id=${template.id}`)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-content-muted hover:bg-surface-2"
            >
              <Pencil size={18} />
            </button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Chip tone="muted">~{template.estimatedMinutes} min</Chip>
        <Chip tone="muted">{template.exercises.length} exercises</Chip>
        <Chip tone="accent">{template.split.replace(/-/g, ' ')}</Chip>
      </div>

      <div className="flex flex-col gap-2">
        {[...template.exercises]
          .sort((a, b) => a.order - b.order)
          .map((we, i) => {
            const ex = requireExercise(we.exerciseId);
            return (
              <div key={we.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-bold text-content-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-content">{ex.name}</p>
                    <p className="text-xs text-content-muted">{ex.primaryMuscle} · {ex.equipment}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      <Chip>{we.sets.length} × {formatRepRange(we.repRange)}</Chip>
                      {we.startWeightKg !== undefined && <Chip>{formatWeight(we.startWeightKg, unit)}</Chip>}
                      <Chip tone="muted">Rest {formatDuration(we.restSec)}</Chip>
                    </div>
                    {we.notes && <p className="mt-2 text-xs italic text-content-faint">{we.notes}</p>}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <button
        onClick={() => setConfirmDelete(true)}
        className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-danger/80 hover:text-danger"
      >
        <Trash2 size={15} /> Delete workout
      </button>

      {/* Sticky start */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line/60 bg-base/90 px-4 py-3 backdrop-blur-md safe-bottom">
        <Button size="xl" fullWidth onClick={start}>
          <Play size={20} /> Start Workout
        </Button>
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this workout?">
        <p className="text-sm text-content-muted">
          The template will be removed. Your completed session history stays intact.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              deleteTemplate(template.id);
              navigate('/workouts', { replace: true });
            }}
          >
            Delete
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
