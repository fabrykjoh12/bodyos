import type {
  AppData,
  ExerciseSession,
  PersonalRecord,
  ProgressPhoto,
  SetEntry,
  User,
  WorkoutExercise,
  WorkoutSession,
  WorkoutTemplate,
} from '@/types';
import { requireExercise } from './exercises';
import { uid } from '@/lib/id';
import { daysAgoISO } from '@/lib/date';
import { epley1RM, round1 } from '@/lib/volume';

const APP_DATA_VERSION = 1;

// --- Template construction helpers -----------------------------------------

interface ExSpec {
  exerciseId: string;
  sets: number;
  repRange: [number, number];
  restSec: number;
  startWeightKg: number;
  /** kg added per successful week, for seeded history. */
  weeklyGain: number;
  notes?: string;
}

function makeWorkoutExercise(spec: ExSpec, order: number): WorkoutExercise {
  return {
    id: uid('we'),
    exerciseId: spec.exerciseId,
    order,
    repRange: spec.repRange,
    restSec: spec.restSec,
    startWeightKg: spec.startWeightKg,
    notes: spec.notes,
    sets: Array.from({ length: spec.sets }, () => ({
      type: 'working' as const,
      targetReps: spec.repRange[1],
    })),
  };
}

const PUSH: ExSpec[] = [
  { exerciseId: 'bench-press', sets: 3, repRange: [6, 10], restSec: 150, startWeightKg: 60, weeklyGain: 2.5 },
  { exerciseId: 'incline-db-press', sets: 3, repRange: [8, 12], restSec: 120, startWeightKg: 24, weeklyGain: 2, notes: 'Controlled stretch at the bottom.' },
  { exerciseId: 'overhead-press', sets: 3, repRange: [5, 8], restSec: 150, startWeightKg: 40, weeklyGain: 2.5 },
  { exerciseId: 'lateral-raise', sets: 3, repRange: [12, 20], restSec: 75, startWeightKg: 9, weeklyGain: 0.5 },
  { exerciseId: 'triceps-pushdown', sets: 3, repRange: [10, 15], restSec: 75, startWeightKg: 25, weeklyGain: 2.5 },
];

const PULL: ExSpec[] = [
  { exerciseId: 'lat-pulldown', sets: 3, repRange: [8, 12], restSec: 120, startWeightKg: 55, weeklyGain: 5 },
  { exerciseId: 'barbell-row', sets: 3, repRange: [6, 10], restSec: 150, startWeightKg: 55, weeklyGain: 2.5 },
  { exerciseId: 'seated-row', sets: 3, repRange: [8, 12], restSec: 120, startWeightKg: 50, weeklyGain: 5 },
  { exerciseId: 'bicep-curl', sets: 3, repRange: [10, 15], restSec: 75, startWeightKg: 12, weeklyGain: 0.5 },
  { exerciseId: 'cable-curl', sets: 2, repRange: [10, 15], restSec: 75, startWeightKg: 20, weeklyGain: 2.5 },
];

const LEGS: ExSpec[] = [
  { exerciseId: 'squat', sets: 3, repRange: [5, 8], restSec: 180, startWeightKg: 80, weeklyGain: 5, notes: 'Brace before every rep.' },
  { exerciseId: 'romanian-deadlift', sets: 3, repRange: [8, 12], restSec: 150, startWeightKg: 70, weeklyGain: 2.5 },
  { exerciseId: 'leg-press', sets: 3, repRange: [10, 15], restSec: 120, startWeightKg: 140, weeklyGain: 10 },
  { exerciseId: 'leg-curl', sets: 3, repRange: [10, 15], restSec: 90, startWeightKg: 45, weeklyGain: 5 },
  { exerciseId: 'calf-raise', sets: 4, repRange: [10, 15], restSec: 60, startWeightKg: 60, weeklyGain: 5 },
];

function makeTemplate(name: string, focus: string, specs: ExSpec[]): WorkoutTemplate {
  return {
    id: uid('tpl'),
    name,
    focus,
    split: 'push-pull-legs',
    estimatedMinutes: 55,
    createdAt: daysAgoISO(60),
    updatedAt: daysAgoISO(60),
    exercises: specs.map((s, i) => makeWorkoutExercise(s, i)),
  };
}

// --- History simulation ----------------------------------------------------

function buildHistoricalExercise(
  spec: ExSpec,
  weekIndex: number,
  dateISO: string,
): ExerciseSession {
  const ex = requireExercise(spec.exerciseId);
  const weight = Math.max(spec.startWeightKg, spec.startWeightKg + spec.weeklyGain * weekIndex);
  // Reps drift up within the range across a mesocycle, resetting after a bump.
  const cycle = weekIndex % 3;
  const baseReps = spec.repRange[0] + cycle;
  const sets: SetEntry[] = Array.from({ length: spec.sets }, (_, i) => {
    const reps = Math.min(spec.repRange[1], baseReps - (i > 0 ? 1 : 0));
    return {
      id: uid('set'),
      exerciseId: spec.exerciseId,
      setNumber: i + 1,
      type: 'working',
      weightKg: weight,
      reps,
      completed: true,
      completedAt: dateISO,
      isWarmup: false,
      difficulty: cycle === 2 ? 'hard' : 'good',
    };
  });
  return {
    id: uid('exs'),
    exerciseId: spec.exerciseId,
    order: 0,
    repRange: spec.repRange,
    restSec: spec.restSec,
    incrementKg: ex.defaultIncrementKg,
    notes: spec.notes,
    status: 'done',
    sets,
    difficulty: cycle === 2 ? 'hard' : 'good',
  };
}

function buildSession(
  template: WorkoutTemplate,
  specs: ExSpec[],
  weekIndex: number,
  daysBack: number,
): WorkoutSession {
  const dateISO = daysAgoISO(daysBack);
  const exercises = specs.map((spec, i) => ({
    ...buildHistoricalExercise(spec, weekIndex, dateISO),
    order: i,
  }));
  const startedAt = dateISO;
  const completedAt = dateISO;
  return {
    id: uid('ses'),
    templateId: template.id,
    name: template.name,
    focus: template.focus,
    status: 'completed',
    startedAt,
    completedAt,
    exercises,
    currentExerciseIndex: exercises.length - 1,
  };
}

// --- Personal records from history -----------------------------------------

function extractPRs(sessions: WorkoutSession[]): PersonalRecord[] {
  const bestWeight = new Map<string, number>();
  const bestE1RM = new Map<string, number>();
  const prs: PersonalRecord[] = [];
  // Oldest first so PR dates make sense.
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );
  for (const ses of ordered) {
    for (const ex of ses.exercises) {
      const working = ex.sets.filter((s) => !s.isWarmup && s.completed);
      if (working.length === 0) continue;
      const top = Math.max(...working.map((s) => s.weightKg));
      if (top > (bestWeight.get(ex.exerciseId) ?? 0)) {
        bestWeight.set(ex.exerciseId, top);
        const heaviest = working.find((s) => s.weightKg === top)!;
        prs.push({
          id: uid('pr'),
          exerciseId: ex.exerciseId,
          type: 'weight',
          value: top,
          reps: heaviest.reps,
          weightKg: top,
          achievedAt: ses.completedAt ?? ses.startedAt,
          sessionId: ses.id,
        });
      }
      const e1 = round1(working.reduce((b, s) => Math.max(b, epley1RM(s.weightKg, s.reps)), 0));
      if (e1 > (bestE1RM.get(ex.exerciseId) ?? 0) + 0.4) {
        bestE1RM.set(ex.exerciseId, e1);
        prs.push({
          id: uid('pr'),
          exerciseId: ex.exerciseId,
          type: 'e1rm',
          value: e1,
          achievedAt: ses.completedAt ?? ses.startedAt,
          sessionId: ses.id,
        });
      }
    }
  }
  return prs;
}

// --- Progress photos (neutral SVG silhouettes, private/local) --------------

function silhouetteDataUrl(pose: string, weekLabel: string, tone: number): string {
  const bg = `#${(0x14 + tone).toString(16).padStart(2, '0')}1a20`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='420' viewBox='0 0 300 420'>
    <rect width='300' height='420' fill='${bg}'/>
    <g fill='#2b3440' opacity='0.9'>
      <circle cx='150' cy='70' r='34'/>
      <rect x='108' y='108' width='84' height='150' rx='30'/>
      <rect x='92' y='118' width='24' height='120' rx='12'/>
      <rect x='184' y='118' width='24' height='120' rx='12'/>
      <rect x='116' y='250' width='30' height='140' rx='14'/>
      <rect x='154' y='250' width='30' height='140' rx='14'/>
    </g>
    <text x='16' y='402' fill='#4c8dff' font-family='monospace' font-size='16'>${weekLabel} · ${pose}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function seedPhotos(): ProgressPhoto[] {
  const specs: { pose: ProgressPhoto['pose']; label: string; days: number; bw: number; tone: number }[] = [
    { pose: 'front-relaxed', label: 'Week 1', days: 42, bw: 78.4, tone: 0 },
    { pose: 'side-relaxed', label: 'Week 1', days: 42, bw: 78.4, tone: 2 },
    { pose: 'back-relaxed', label: 'Week 1', days: 42, bw: 78.4, tone: 4 },
    { pose: 'front-relaxed', label: 'Week 6', days: 7, bw: 80.1, tone: 6 },
    { pose: 'side-relaxed', label: 'Week 6', days: 7, bw: 80.1, tone: 8 },
    { pose: 'back-relaxed', label: 'Week 6', days: 7, bw: 80.1, tone: 10 },
  ];
  return specs.map((s) => ({
    id: uid('photo'),
    pose: s.pose,
    dataUrl: silhouetteDataUrl(s.pose, s.label, s.tone),
    takenAt: daysAgoISO(s.days),
    weekLabel: s.label,
    bodyWeightKg: s.bw,
  }));
}

// --- Assemble the full initial dataset -------------------------------------

export function createSeedData(): AppData {
  const push = makeTemplate('Push', 'Chest · Shoulders · Triceps', PUSH);
  const pull = makeTemplate('Pull', 'Back · Biceps', PULL);
  const legs = makeTemplate('Legs', 'Quads · Hamstrings · Calves', LEGS);
  const templates = [push, pull, legs];

  // 6 weeks of history, PPL each week on Mon/Wed/Fri-style spacing.
  const totalWeeks = 6;
  const rotation: [WorkoutTemplate, ExSpec[]][] = [
    [push, PUSH],
    [pull, PULL],
    [legs, LEGS],
  ];
  const sessions: WorkoutSession[] = [];
  let daysBack = 3; // most recent completed session was 3 days ago
  for (let week = totalWeeks - 1; week >= 0; week -= 1) {
    for (let d = rotation.length - 1; d >= 0; d -= 1) {
      const [tpl, specs] = rotation[d]!;
      sessions.push(buildSession(tpl, specs, week, daysBack));
      daysBack += 2;
    }
  }

  const personalRecords = extractPRs(sessions);
  const photos = seedPhotos();

  const user: User = {
    id: uid('user'),
    name: 'Athlete',
    goal: 'hypertrophy',
    experience: 'intermediate',
    daysPerWeek: 3,
    split: 'push-pull-legs',
    equipment: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
    bodyWeightKg: 80.1,
    onboarded: true,
    currentPhase: 'Lean bulk',
    createdAt: daysAgoISO(60),
    settings: {
      unit: 'kg',
      restTimerAutoStart: true,
      defaultRestSec: 120,
      showRir: false,
      hapticFeedback: true,
      reducedMotion: false,
    },
  };

  // Weekly plan: PPL on Mon/Wed/Fri. today's weekday resolves in the store.
  const weeklyPlan: Record<number, string | null> = {
    0: null,
    1: push.id,
    2: null,
    3: pull.id,
    4: null,
    5: legs.id,
    6: null,
  };

  const streakDates = sessions
    .map((s) => s.completedAt ?? s.startedAt)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return {
    version: APP_DATA_VERSION,
    user,
    templates,
    sessions,
    activeSession: null,
    personalRecords,
    photos,
    measurements: [],
    weeklyPlan,
    streakDates,
    nextPhotoDue: daysAgoISO(-7), // due in a week
    restTimer: { endsAt: null, durationSec: 120, exerciseId: null },
  };
}

export { APP_DATA_VERSION };
