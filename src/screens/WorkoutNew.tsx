import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, Link2, Plus, Search, Trash2 } from 'lucide-react';
import type { MuscleGroup, WorkoutExercise, WorkoutTemplate } from '@/types';
import { EXERCISES, requireExercise } from '@/data/exercises';
import { useStore } from '@/store/useStore';
import { uid } from '@/lib/id';
import { now, weekdayName } from '@/lib/date';
import { formatRepRange } from '@/lib/format';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Chip } from '@/components/ui/Chip';

const MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
];

/** One-tap name presets — the names people actually use for training days. */
const NAME_PRESETS = [
  'Push',
  'Pull',
  'Legs',
  'Upper',
  'Lower',
  'Full Body',
  'Arms',
  'Chest & Back',
];

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
};

/** Derive a focus line ("Chest · Shoulders · Triceps") from the chosen movements. */
function deriveFocus(exercises: WorkoutExercise[]): string {
  const counts = new Map<string, number>();
  for (const we of exercises) {
    const m = requireExercise(we.exerciseId).primaryMuscle;
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => MUSCLE_LABELS[m] ?? m)
    .join(' · ');
}

function blankExercise(exerciseId: string, order: number): WorkoutExercise {
  const ex = requireExercise(exerciseId);
  return {
    id: uid('we'),
    exerciseId,
    order,
    repRange: ex.defaultRepRange,
    restSec: ex.kind === 'compound' ? 150 : 90,
    startWeightKg: undefined,
    sets: Array.from({ length: 3 }, () => ({
      type: 'working' as const,
      targetReps: ex.defaultRepRange[1],
    })),
  };
}

export function WorkoutNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('id');
  const existing = useStore((s) => s.templates.find((t) => t.id === editId));
  const saveTemplate = useStore((s) => s.saveTemplate);
  const weeklyPlan = useStore((s) => s.weeklyPlan);
  const setPlanForDay = useStore((s) => s.setPlanForDay);

  const [name, setName] = useState(existing?.name ?? '');
  const [focus, setFocus] = useState(existing?.focus ?? '');
  // Once the user touches the focus field it's theirs; until then we derive it.
  const [focusDirty, setFocusDirty] = useState(Boolean(existing));
  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    existing ? [...existing.exercises].sort((a, b) => a.order - b.order) : [],
  );
  // Days this template occupies on the weekly plan (editable at creation).
  const [days, setDays] = useState<Set<number>>(() => {
    const assigned = new Set<number>();
    if (editId) {
      for (let d = 0; d < 7; d++) if (weeklyPlan[d] === editId) assigned.add(d);
    }
    return assigned;
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter(
      (e) =>
        (muscleFilter === 'all' || e.primaryMuscle === muscleFilter) &&
        (q === '' || e.name.toLowerCase().includes(q) || e.primaryMuscle.includes(q)),
    );
  }, [muscleFilter, query]);

  const effectiveFocus = focusDirty ? focus : deriveFocus(exercises);

  const patch = (id: string, fn: (we: WorkoutExercise) => WorkoutExercise) =>
    setExercises((list) => list.map((we) => (we.id === id ? fn(we) : we)));

  const toggleSuperset = (index: number) => {
    setExercises((list) => {
      if (index <= 0) return list;
      const next = [...list];
      const cur = next[index]!;
      const prev = next[index - 1]!;
      const linked = !!cur.supersetGroup && cur.supersetGroup === prev.supersetGroup;
      if (linked) {
        const grp = cur.supersetGroup;
        next[index] = { ...cur, supersetGroup: undefined };
        // A group of one isn't a superset — dissolve it.
        const members = next.filter((w) => w.supersetGroup === grp);
        if (members.length === 1) {
          const idx = next.findIndex((w) => w.supersetGroup === grp);
          if (idx >= 0) next[idx] = { ...next[idx]!, supersetGroup: undefined };
        }
      } else {
        const grp = prev.supersetGroup ?? uid('ss');
        next[index - 1] = { ...prev, supersetGroup: grp };
        next[index] = { ...cur, supersetGroup: grp };
      }
      return next;
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    setExercises((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next.map((we, i) => ({ ...we, order: i }));
    });
  };

  const addPicked = () => {
    setExercises((list) => [
      ...list,
      ...[...picked].map((exId, k) => blankExercise(exId, list.length + k)),
    ]);
    setPicked(new Set());
    setQuery('');
    setPickerOpen(false);
  };

  const canSave = name.trim().length > 0 && exercises.length > 0;

  const save = () => {
    if (!canSave) return;
    const template: WorkoutTemplate = {
      id: existing?.id ?? uid('tpl'),
      name: name.trim(),
      focus: effectiveFocus.trim() || 'Custom session',
      split: existing?.split ?? 'custom',
      estimatedMinutes: Math.max(20, exercises.length * 11),
      exercises: exercises.map((we, i) => ({ ...we, order: i })),
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };
    saveTemplate(template);
    // Sync the weekly plan with the day toggles (add chosen, clear unchosen).
    for (let d = 0; d < 7; d++) {
      if (days.has(d)) setPlanForDay(d, template.id);
      else if (weeklyPlan[d] === template.id) setPlanForDay(d, null);
    }
    navigate(`/workouts/${template.id}`, { replace: true });
  };

  return (
    <div className="flex flex-col gap-5 pb-28">
      <ScreenHeader title={existing ? 'Edit workout' : 'New workout'} back />

      <div className="card flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="label-tiny">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push A"
              className="h-12 rounded-xl border border-line bg-surface-2 px-3.5 text-content outline-none focus:border-accent"
            />
          </label>
          {/* One tap beats typing */}
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            {NAME_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setName(p)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  name === p
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-surface-2 text-content-muted hover:text-content'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="label-tiny">
            Focus{' '}
            {!focusDirty && exercises.length > 0 && (
              <span className="normal-case tracking-normal text-content-faint">· auto</span>
            )}
          </span>
          <input
            value={effectiveFocus}
            onChange={(e) => {
              setFocusDirty(true);
              setFocus(e.target.value);
            }}
            placeholder="Filled in from your exercises"
            className="h-12 rounded-xl border border-line bg-surface-2 px-3.5 text-content outline-none focus:border-accent"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="label-tiny">Schedule · optional</span>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, d) => {
              const on = days.has(d);
              const takenBy = !on && weeklyPlan[d] ? '·' : '';
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Train on ${FULL_DAYS[d]}`}
                  onClick={() =>
                    setDays((prev) => {
                      const next = new Set(prev);
                      if (next.has(d)) next.delete(d);
                      else next.add(d);
                      return next;
                    })
                  }
                  className={`flex h-11 flex-col items-center justify-center rounded-xl border text-xs font-bold transition-all duration-150 ease-spring active:scale-95 ${
                    on
                      ? 'border-accent bg-accent text-ink'
                      : 'border-line bg-surface-2 text-content-muted'
                  }`}
                >
                  {weekdayName(d).slice(0, 1)}
                  {takenBy && (
                    <span className="text-[9px] leading-none text-content-faint">{takenBy}</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-content-faint">
            Picked days go on your weekly plan when you save.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {exercises.map((we, i) => {
          const ex = requireExercise(we.exerciseId);
          const linkedAbove =
            i > 0 && !!we.supersetGroup && we.supersetGroup === exercises[i - 1]!.supersetGroup;
          return (
            <div key={we.id} className={`card p-4 ${linkedAbove ? 'border-accent/30' : ''}`}>
              {i > 0 && (
                <button
                  onClick={() => toggleSuperset(i)}
                  className={`mb-2 flex items-center gap-1.5 text-xs font-medium ${linkedAbove ? 'text-accent' : 'text-content-faint hover:text-content'}`}
                >
                  <Link2 size={13} />{' '}
                  {linkedAbove ? 'Supersetted with above' : 'Superset with above'}
                </button>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-content">{ex.name}</p>
                  <p className="text-xs capitalize text-content-muted">{ex.primaryMuscle}</p>
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    aria-label="Move up"
                    onClick={() => move(i, -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-content-faint hover:text-content disabled:opacity-30"
                    disabled={i === 0}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    aria-label="Move down"
                    onClick={() => move(i, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-content-faint hover:text-content disabled:opacity-30"
                    disabled={i === exercises.length - 1}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    aria-label="Remove"
                    onClick={() => setExercises((l) => l.filter((x) => x.id !== we.id))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-danger/70 hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Field label="Sets">
                  <Stepper
                    value={we.sets.length}
                    min={1}
                    max={8}
                    onChange={(n) =>
                      patch(we.id, (w) => ({
                        ...w,
                        sets: Array.from(
                          { length: n },
                          (_, k) => w.sets[k] ?? { type: 'working', targetReps: w.repRange[1] },
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Rep low">
                  <Stepper
                    value={we.repRange[0]}
                    min={1}
                    max={we.repRange[1]}
                    onChange={(n) =>
                      patch(we.id, (w) => ({ ...w, repRange: [n, Math.max(n, w.repRange[1])] }))
                    }
                  />
                </Field>
                <Field label="Rep high">
                  <Stepper
                    value={we.repRange[1]}
                    min={we.repRange[0]}
                    max={30}
                    onChange={(n) =>
                      patch(we.id, (w) => ({ ...w, repRange: [Math.min(w.repRange[0], n), n] }))
                    }
                  />
                </Field>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-content-faint">
                <span>Rest</span>
                <Stepper
                  value={we.restSec}
                  min={30}
                  max={300}
                  step={15}
                  suffix="s"
                  onChange={(n) => patch(we.id, (w) => ({ ...w, restSec: n }))}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="secondary" fullWidth onClick={() => setPickerOpen(true)}>
        <Plus size={18} /> {exercises.length === 0 ? 'Add exercises' : 'Add more exercises'}
      </Button>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line/60 bg-base/90 px-[var(--gutter)] py-3 backdrop-blur-md safe-bottom">
        <Button size="lg" fullWidth disabled={!canSave} onClick={save}>
          <Check size={18} /> {existing ? 'Save changes' : 'Create workout'}
        </Button>
      </div>

      <Sheet
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPicked(new Set());
          setQuery('');
        }}
        title="Add exercises"
      >
        <label className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
          <Search size={16} className="text-content-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            className="h-11 flex-1 bg-transparent text-content outline-none placeholder:text-content-faint"
          />
        </label>
        <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
          <FilterChip active={muscleFilter === 'all'} onClick={() => setMuscleFilter('all')}>
            All
          </FilterChip>
          {MUSCLES.map((m) => (
            <FilterChip key={m} active={muscleFilter === m} onClick={() => setMuscleFilter(m)}>
              {m}
            </FilterChip>
          ))}
        </div>
        <div className="max-h-[46vh] overflow-y-auto">
          <ul className="flex flex-col gap-1.5">
            {filtered.map((ex) => {
              const on = picked.has(ex.id);
              return (
                <li key={ex.id}>
                  <button
                    aria-pressed={on}
                    onClick={() =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(ex.id)) next.delete(ex.id);
                        else next.add(ex.id);
                        return next;
                      })
                    }
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      on
                        ? 'border-accent bg-accent-soft'
                        : 'border-line bg-surface-2 hover:border-line-strong'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                        on ? 'border-accent bg-accent text-ink' : 'border-line-strong'
                      }`}
                    >
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-content">{ex.name}</p>
                      <p className="text-xs capitalize text-content-faint">
                        {ex.primaryMuscle} · {ex.equipment}
                      </p>
                    </div>
                    <Chip tone="muted">{formatRepRange(ex.defaultRepRange)}</Chip>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-1 py-4 text-center text-sm text-content-faint">
                No exercises match.
              </p>
            )}
          </ul>
        </div>
        <div className="mt-4">
          <Button fullWidth size="lg" disabled={picked.size === 0} onClick={addPicked}>
            <Plus size={18} /> Add{' '}
            {picked.size > 0 ? `${picked.size} exercise${picked.size > 1 ? 's' : ''}` : 'exercises'}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-surface-2 py-2">
      <span className="label-tiny">{label}</span>
      {children}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="decrease"
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-content-muted hover:text-content"
      >
        −
      </button>
      <span className="tnum w-12 text-center text-sm font-semibold text-content">
        {value}
        {suffix}
      </span>
      <button
        aria-label="increase"
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-content-muted hover:text-content"
      >
        +
      </button>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-content-muted'}`}
    >
      {children}
    </button>
  );
}
