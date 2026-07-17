import type { MuscleGroup } from '@/types';
import { getExercise } from '@/data/exercises';
import { ExerciseGlyph } from './ExerciseGlyph';

// Per-muscle accent so each exercise reads at a glance and tiles feel designed.
const MUSCLE_TINT: Record<MuscleGroup, string> = {
  chest: '#5FA8FF',
  back: '#7C9CFF',
  shoulders: '#F5A524',
  biceps: '#4ADE80',
  triceps: '#34D399',
  quads: '#CDFB45',
  hamstrings: '#B4E82A',
  glutes: '#F0526B',
  calves: '#22D3EE',
  core: '#A78BFA',
  forearms: '#94A3B8',
};

interface ExerciseThumbProps {
  id: string;
  muscle: MuscleGroup;
  size?: number;
  rounded?: string;
}

/**
 * Crafted, consistent exercise tile: a muscle-tinted dark gradient with an
 * equipment glyph. Uniform across the whole library — no photo dependency.
 * (When curated photos exist, prefer them here.)
 */
export function ExerciseThumb({ id, muscle, size = 44, rounded = 'rounded-xl' }: ExerciseThumbProps) {
  const tint = MUSCLE_TINT[muscle] ?? '#CDFB45';
  const equipment = getExercise(id)?.equipment ?? 'dumbbell';

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${rounded}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 22%, ${tint}26, transparent 62%), linear-gradient(160deg, #171A1F, #0E1013)`,
        boxShadow: `inset 0 0 0 1px ${tint}1f`,
      }}
      aria-hidden
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <ExerciseGlyph equipment={equipment} size={Math.round(size * 0.46)} style={{ color: tint }} />
      </div>
    </div>
  );
}
