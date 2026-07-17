// ---------------------------------------------------------------------------
// BodyOS domain model
//
// Design principle: workout *templates* (the plan) are kept strictly separate
// from workout *sessions* (what actually happened). Editing a template must
// never mutate historical session data. Sessions embed a denormalized copy of
// the exercise config they were performed with.
// ---------------------------------------------------------------------------

export type ID = string;

/** ISO-8601 timestamp string, e.g. "2026-07-16T08:30:00.000Z". */
export type ISODate = string;

export type Unit = 'kg' | 'lb';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band';

export type MovementPattern =
  | 'horizontal-push'
  | 'vertical-push'
  | 'horizontal-pull'
  | 'vertical-pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'carry'
  | 'isolation'
  | 'core';

export type ExerciseKind = 'compound' | 'isolation';

/** How a set felt. Drives progression conservatism. */
export type Difficulty = 'easy' | 'good' | 'hard' | 'failed';

export type SetType = 'working' | 'warmup';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type TrainingGoal = 'strength' | 'hypertrophy' | 'general' | 'endurance';

export type WorkoutSplit =
  | 'full-body'
  | 'upper-lower'
  | 'push-pull-legs'
  | 'custom';

export type PhotoPose =
  | 'front-relaxed'
  | 'side-relaxed'
  | 'back-relaxed'
  | 'front-flex'
  | 'back-flex'
  | 'custom';

// --- Exercise library ------------------------------------------------------

export interface Exercise {
  id: ID;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  pattern: MovementPattern;
  kind: ExerciseKind;
  /** Default double-progression rep window, e.g. [8, 12]. */
  defaultRepRange: [number, number];
  /** Smallest sensible load change for this exercise, in kg. */
  defaultIncrementKg: number;
  instructions: string[];
  /** Short coaching cues — the details that make the movement safer/stronger. */
  tips?: string[];
  /** Ids of exercises that train a similar pattern. */
  substitutions: ID[];
}

// --- Templates (the plan) --------------------------------------------------

export interface TemplateSet {
  type: SetType;
  /** Target reps for double progression are expressed as a range on the exercise. */
  targetReps: number;
}

export interface WorkoutExercise {
  id: ID;
  exerciseId: ID;
  order: number;
  sets: TemplateSet[];
  repRange: [number, number];
  /** Rest between sets, seconds. */
  restSec: number;
  /** Working weight to start from, kg. Undefined => derive from history. */
  startWeightKg?: number;
  notes?: string;
}

export interface WorkoutTemplate {
  id: ID;
  name: string;
  focus: string; // e.g. "Push · Chest, Shoulders, Triceps"
  split: WorkoutSplit;
  exercises: WorkoutExercise[];
  estimatedMinutes: number;
  createdAt: ISODate;
  updatedAt: ISODate;
  archived?: boolean;
}

// --- Sessions (what happened) ----------------------------------------------

export interface SetEntry {
  id: ID;
  exerciseId: ID;
  setNumber: number;
  type: SetType;
  weightKg: number;
  reps: number;
  completed: boolean;
  completedAt?: ISODate;
  difficulty?: Difficulty;
  /** Reps in reserve, optional advanced signal. */
  rir?: number;
  isWarmup: boolean;
  notes?: string;
}

export type ExerciseSessionStatus = 'pending' | 'active' | 'done';

export interface ExerciseSession {
  id: ID;
  exerciseId: ID;
  order: number;
  repRange: [number, number];
  restSec: number;
  incrementKg: number;
  notes?: string;
  status: ExerciseSessionStatus;
  sets: SetEntry[];
  /** Cached prior-session performance shown as "previous". */
  previous?: PreviousPerformance;
  /** Result produced by the progression engine after the exercise is finished. */
  recommendation?: ProgressionRecommendation;
  difficulty?: Difficulty;
}

export interface PreviousPerformance {
  date: ISODate;
  /** One entry per working set: weight + reps (+ reps-in-reserve if logged). */
  sets: { weightKg: number; reps: number; rir?: number }[];
  topWeightKg: number;
  estimated1RM?: number;
}

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface WorkoutSession {
  id: ID;
  templateId: ID;
  name: string;
  focus: string;
  status: SessionStatus;
  startedAt: ISODate;
  completedAt?: ISODate;
  exercises: ExerciseSession[];
  /** Index into exercises[] the user is currently on. */
  currentExerciseIndex: number;
}

// --- Progression engine ----------------------------------------------------

export type ProgressionAction =
  | 'increase-weight'
  | 'add-reps'
  | 'maintain'
  | 'reduce-load'
  | 'deload';

export interface ProgressionRecommendation {
  exerciseId: ID;
  action: ProgressionAction;
  /** Suggested working weight next session, kg. */
  nextWeightKg: number;
  nextRepRange: [number, number];
  /** One-line human explanation of the rule that fired. */
  reason: string;
  /** Short outcome tag for summaries, e.g. "Target completed". */
  headline: string;
  targetMet: boolean;
}

// --- Progress tracking -----------------------------------------------------

export interface PersonalRecord {
  id: ID;
  exerciseId: ID;
  type: 'weight' | 'reps' | 'volume' | 'e1rm';
  value: number;
  reps?: number;
  weightKg?: number;
  achievedAt: ISODate;
  sessionId?: ID;
}

export interface ProgressPhoto {
  id: ID;
  pose: PhotoPose;
  /** Local object URL or data URL. Never uploaded without explicit action. */
  dataUrl: string;
  takenAt: ISODate;
  weekLabel: string; // "Week 6"
  bodyWeightKg?: number;
  notes?: string;
}

export interface BodyMeasurement {
  id: ID;
  takenAt: ISODate;
  bodyWeightKg?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
}

// --- User ------------------------------------------------------------------

export interface UserSettings {
  unit: Unit;
  restTimerAutoStart: boolean;
  defaultRestSec: number;
  showRir: boolean;
  hapticFeedback: boolean;
  reducedMotion: boolean;
}

export interface User {
  id: ID;
  name: string;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  daysPerWeek: number;
  split: WorkoutSplit;
  equipment: Equipment[];
  bodyWeightKg?: number;
  onboarded: boolean;
  currentPhase?: string; // e.g. "Lean bulk"
  settings: UserSettings;
  createdAt: ISODate;
}

// --- Rest timer (persisted so it survives a refresh mid-workout) -----------

export interface RestTimerState {
  /** Epoch ms when the rest ends, or null when idle. */
  endsAt: number | null;
  durationSec: number;
  exerciseId: string | null;
}

// --- Persistence root ------------------------------------------------------

export interface AppData {
  version: number;
  user: User;
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[]; // completed history
  activeSession: WorkoutSession | null;
  personalRecords: PersonalRecord[];
  photos: ProgressPhoto[];
  measurements: BodyMeasurement[];
  /** Schedule: which template id is planned for a given weekday (0=Sun). */
  weeklyPlan: Record<number, ID | null>;
  /** Durable per-exercise note-to-self, keyed by exercise id. */
  exerciseNotes: Record<ID, string>;
  streakDates: ISODate[]; // dates workouts were completed
  nextPhotoDue?: ISODate;
  restTimer: RestTimerState;
}
