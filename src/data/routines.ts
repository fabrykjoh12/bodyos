import type { WorkoutSplit } from '@/types';

// Starter routines: pick one and it builds the workout templates and drops them
// onto your weekly plan. Exercise ids reference the library in ./exercises.

export interface RoutineDay {
  name: string;
  focus: string;
  exercises: string[];
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  daysPerWeek: number;
  split: WorkoutSplit;
  /** Unique training days (each becomes a template). */
  days: RoutineDay[];
  /** Which weekday (0=Sun) runs which day index. Days may repeat across a week. */
  schedule: { weekday: number; day: number }[];
}

export const ROUTINES: Routine[] = [
  {
    id: 'full-body-3',
    name: 'Full Body 3×',
    description: 'Three whole-body sessions a week — the most efficient start for building strength and muscle.',
    daysPerWeek: 3,
    split: 'full-body',
    days: [
      { name: 'Full Body A', focus: 'Squat · Press · Pull', exercises: ['squat', 'bench-press', 'barbell-row', 'overhead-press', 'bicep-curl', 'plank'] },
      { name: 'Full Body B', focus: 'Hinge · Press · Pull', exercises: ['deadlift', 'incline-db-press', 'lat-pulldown', 'leg-press', 'triceps-pushdown', 'calf-raise'] },
    ],
    schedule: [
      { weekday: 1, day: 0 },
      { weekday: 3, day: 1 },
      { weekday: 5, day: 0 },
    ],
  },
  {
    id: 'upper-lower-4',
    name: 'Upper / Lower 4×',
    description: 'Four days split into upper- and lower-body sessions — more volume per muscle as you progress.',
    daysPerWeek: 4,
    split: 'upper-lower',
    days: [
      { name: 'Upper', focus: 'Chest · Back · Shoulders · Arms', exercises: ['bench-press', 'barbell-row', 'overhead-press', 'lat-pulldown', 'bicep-curl', 'triceps-pushdown'] },
      { name: 'Lower', focus: 'Quads · Hamstrings · Calves', exercises: ['squat', 'romanian-deadlift', 'leg-press', 'leg-curl', 'calf-raise'] },
    ],
    schedule: [
      { weekday: 1, day: 0 },
      { weekday: 2, day: 1 },
      { weekday: 4, day: 0 },
      { weekday: 5, day: 1 },
    ],
  },
  {
    id: 'ppl-6',
    name: 'Push / Pull / Legs 6×',
    description: 'The classic high-volume split, run twice a week. Best when you can train six days.',
    daysPerWeek: 6,
    split: 'push-pull-legs',
    days: [
      { name: 'Push', focus: 'Chest · Shoulders · Triceps', exercises: ['bench-press', 'overhead-press', 'incline-db-press', 'lateral-raise', 'triceps-pushdown'] },
      { name: 'Pull', focus: 'Back · Biceps', exercises: ['deadlift', 'lat-pulldown', 'barbell-row', 'face-pull', 'bicep-curl'] },
      { name: 'Legs', focus: 'Quads · Hamstrings · Calves', exercises: ['squat', 'romanian-deadlift', 'leg-press', 'leg-curl', 'calf-raise'] },
    ],
    schedule: [
      { weekday: 1, day: 0 },
      { weekday: 2, day: 1 },
      { weekday: 3, day: 2 },
      { weekday: 4, day: 0 },
      { weekday: 5, day: 1 },
      { weekday: 6, day: 2 },
    ],
  },
];
