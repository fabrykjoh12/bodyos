import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Equipment, MuscleGroup } from '@/types';
import { EXERCISES } from '@/data/exercises';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Chip } from '@/components/ui/Chip';
import { ExerciseThumb } from '@/components/exercise/ExerciseThumb';

const MUSCLES: (MuscleGroup | 'all')[] = [
  'all',
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
  'forearms',
];
const EQUIPMENT: (Equipment | 'all')[] = [
  'all',
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
];

export function ExerciseLibrary() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [equipment, setEquipment] = useState<Equipment | 'all'>('all');

  const results = useMemo(
    () =>
      EXERCISES.filter(
        (e) =>
          (muscle === 'all' || e.primaryMuscle === muscle) &&
          (equipment === 'all' || e.equipment === equipment) &&
          (query.trim() === '' || e.name.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [query, muscle, equipment],
  );

  return (
    <div className="flex flex-col gap-6 pb-4">
      <ScreenHeader title="Exercises" subtitle={`${EXERCISES.length} in your library`} back />

      <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
        <Search size={16} className="text-content-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          className="h-11 flex-1 bg-transparent text-content outline-none placeholder:text-content-faint"
        />
      </label>

      <div className="no-scrollbar bleed flex gap-1.5 overflow-x-auto">
        {MUSCLES.map((m) => (
          <FilterChip key={m} active={muscle === m} onClick={() => setMuscle(m)}>
            {m}
          </FilterChip>
        ))}
      </div>
      <div className="no-scrollbar bleed -mt-2 flex gap-1.5 overflow-x-auto">
        {EQUIPMENT.map((eq) => (
          <FilterChip key={eq} active={equipment === eq} onClick={() => setEquipment(eq)}>
            {eq}
          </FilterChip>
        ))}
      </div>

      <p className="-mb-1 text-xs text-content-faint">
        {results.length} {results.length === 1 ? 'exercise' : 'exercises'}
        {(muscle !== 'all' || equipment !== 'all' || query.trim() !== '') && ' match'}
      </p>

      <div className="flex flex-col gap-2">
        {results.map((ex) => (
          <button
            key={ex.id}
            onClick={() => navigate(`/exercises/${ex.id}`)}
            className="card flex items-center gap-3 p-4 text-left hover:border-line-strong"
          >
            <ExerciseThumb id={ex.id} muscle={ex.primaryMuscle} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-content">{ex.name}</p>
              <p className="text-xs capitalize text-content-muted">
                {ex.primaryMuscle} · {ex.equipment} · {ex.kind}
              </p>
            </div>
            <Chip tone="muted">
              {ex.defaultRepRange[0]}–{ex.defaultRepRange[1]}
            </Chip>
          </button>
        ))}
        {results.length === 0 && (
          <p className="card p-4 text-sm text-content-faint">No exercises match.</p>
        )}
      </div>
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
