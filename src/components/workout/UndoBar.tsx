import { RotateCcw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatWeight } from '@/lib/format';

/** Inline undo affordance shown immediately after a set is logged. */
export function UndoBar() {
  const undo = useStore((s) => s.undo);
  const undoLastSet = useStore((s) => s.undoLastSet);
  const unit = useStore((s) => s.user.settings.unit);

  if (!undo) return null;

  return (
    <button
      type="button"
      onClick={undoLastSet}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 py-2.5 text-sm font-medium text-content-muted transition-colors hover:text-content animate-fade-in"
    >
      <RotateCcw size={15} />
      Logged {formatWeight(undo.prevSet.weightKg, unit, false)} {unit} × {undo.prevSet.reps} — tap to undo
    </button>
  );
}
