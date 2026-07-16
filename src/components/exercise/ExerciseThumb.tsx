import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import type { MuscleGroup } from '@/types';

// Muted per-muscle accent so fallbacks look intentional, not broken.
const MUSCLE_TINT: Record<MuscleGroup, string> = {
  chest: '#5FA8FF',
  back: '#7C9CFF',
  shoulders: '#F5A524',
  biceps: '#4ADE80',
  triceps: '#4ADE80',
  quads: '#CDFB45',
  hamstrings: '#B4E82A',
  glutes: '#F0526B',
  calves: '#8AD',
  core: '#A78BFA',
  forearms: '#94A3B8',
};

interface ExerciseThumbProps {
  id: string;
  muscle: MuscleGroup;
  size?: number;
  rounded?: string;
}

/** Exercise image with a graceful muscle-tinted fallback tile. */
export function ExerciseThumb({ id, muscle, size = 44, rounded = 'rounded-xl' }: ExerciseThumbProps) {
  const [failed, setFailed] = useState(false);
  const tint = MUSCLE_TINT[muscle] ?? '#CDFB45';
  const src = `${import.meta.env.BASE_URL}exercises/${id}.webp`;

  if (failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center ${rounded}`}
        style={{ width: size, height: size, background: `${tint}22` }}
        aria-hidden
      >
        <Dumbbell size={size * 0.42} style={{ color: tint }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 object-cover ${rounded}`}
      style={{ width: size, height: size, background: `${tint}18` }}
    />
  );
}
