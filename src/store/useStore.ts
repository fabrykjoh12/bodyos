import { create } from 'zustand';
import type {
  AppData,
  BodyMeasurement,
  Difficulty,
  ExerciseSession,
  PersonalRecord,
  ProgressPhoto,
  SetEntry,
  User,
  UserSettings,
  WorkoutSession,
  WorkoutTemplate,
} from '@/types';
import { requireExercise } from '@/data/exercises';
import { uid } from '@/lib/id';
import { now } from '@/lib/date';
import { round1 } from '@/lib/volume';
import { lbToKg } from '@/lib/format';
import { generateWarmups, BAR_KG, BAR_LB } from '@/lib/plates';
import { recommendFromExerciseSession, rirToDifficulty } from '@/lib/progression';
import { buildActiveSession, countPriorStalls } from '@/lib/history';
import { detectPersonalRecords } from '@/lib/prstats';
import { loadOrSeed, repository } from './repository';
import {
  initCloudSync,
  notifyLocalWrite,
  registerSync,
} from './cloudSync';

interface UndoState {
  exerciseIndex: number;
  setId: string;
  prevSet: SetEntry;
}

interface StoreState extends AppData {
  // ephemeral
  undo: UndoState | null;
  lastCompletedSessionId: string | null;

  // --- session lifecycle
  startSession: (templateId: string) => void;
  abandonSession: () => void;
  completeSession: () => string | null;

  // --- active-set editing
  adjustWeight: (delta: number) => void;
  adjustReps: (delta: number) => void;
  setWeight: (weightKg: number) => void;
  setReps: (reps: number) => void;
  /** Set the active set's reps-in-reserve (undefined clears it). */
  setRir: (rir: number | undefined) => void;
  logActiveSet: () => void;
  undoLastSet: () => void;
  editSet: (exerciseIndex: number, setId: string, patch: Partial<Pick<SetEntry, 'weightKg' | 'reps'>>) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setId: string) => void;
  /** Prepend generated ramping warm-up sets before the working sets. */
  addWarmupSets: (exerciseIndex: number) => void;
  setExerciseDifficulty: (exerciseIndex: number, difficulty: Difficulty) => void;
  goToExercise: (index: number) => void;
  nextExercise: () => void;

  // --- rest timer
  startRest: (durationSec: number, exerciseId: string) => void;
  addRestTime: (deltaSec: number) => void;
  skipRest: () => void;

  // --- templates
  saveTemplate: (template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => string;
  setPlanForDay: (weekday: number, templateId: string | null) => void;

  // --- user & settings
  completeOnboarding: (partial: Partial<User>) => void;
  updateUser: (patch: Partial<User>) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  resetAll: () => void;

  // --- sync
  /** Replace the whole AppData slice (used when cloud sync pulls remote). */
  replaceAll: (data: AppData) => void;

  // --- progress
  addPhoto: (photo: ProgressPhoto) => void;
  deletePhoto: (id: string) => void;
  addMeasurement: (m: BodyMeasurement) => void;
  deleteMeasurement: (id: string) => void;
}

const initial = loadOrSeed();

/** Snapshot the persisted AppData slice out of the (larger) store state. */
function extractAppData(state: StoreState): AppData {
  return {
    version: state.version,
    user: state.user,
    templates: state.templates,
    sessions: state.sessions,
    activeSession: state.activeSession,
    personalRecords: state.personalRecords,
    photos: state.photos,
    measurements: state.measurements,
    weeklyPlan: state.weeklyPlan,
    streakDates: state.streakDates,
    nextPhotoDue: state.nextPhotoDue,
    restTimer: state.restTimer,
  };
}

/** Persist the AppData slice after every mutation (local + optional cloud). */
function persist(state: StoreState): void {
  const data: AppData = extractAppData(state);
  repository.save(data);
  // Fire-and-forget cloud sync; a no-op unless the user is signed in.
  notifyLocalWrite(data);
}

/** Locate the active exercise and its active (first incomplete) set. */
function locateActive(session: WorkoutSession): {
  exIndex: number;
  exercise: ExerciseSession;
  setIndex: number;
  set: SetEntry;
} | null {
  const exIndex = session.currentExerciseIndex;
  const exercise = session.exercises[exIndex];
  if (!exercise) return null;
  const setIndex = exercise.sets.findIndex((s) => !s.completed);
  if (setIndex < 0) return null;
  return { exIndex, exercise, setIndex, set: exercise.sets[setIndex]! };
}

function mutateActiveSet(
  session: WorkoutSession,
  fn: (set: SetEntry) => SetEntry,
): WorkoutSession {
  const loc = locateActive(session);
  if (!loc) return session;
  const exercises = session.exercises.map((ex, i) => {
    if (i !== loc.exIndex) return ex;
    return {
      ...ex,
      sets: ex.sets.map((s, j) => (j === loc.setIndex ? fn(s) : s)),
    };
  });
  return { ...session, exercises };
}

export const useStore = create<StoreState>((set, get) => ({
  ...initial,
  undo: null,
  lastCompletedSessionId: null,

  startSession: (templateId) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return;
    const session = buildActiveSession(template, { sessions: get().sessions });
    set((s) => {
      const next = { ...s, activeSession: session, undo: null };
      persist(next);
      return next;
    });
  },

  abandonSession: () => {
    set((s) => {
      const next = {
        ...s,
        activeSession: null,
        undo: null,
        restTimer: { endsAt: null, durationSec: s.restTimer.durationSec, exerciseId: null },
      };
      persist(next);
      return next;
    });
  },

  completeSession: () => {
    const state = get();
    const active = state.activeSession;
    if (!active) return null;

    // Attach a progression recommendation to every exercise that has work.
    const exercises = active.exercises.map((ex) => {
      const hasWork = ex.sets.some((s) => s.completed && !s.isWarmup);
      if (!hasWork) return ex;
      const topWeight = Math.max(
        0,
        ...ex.sets.filter((s) => s.completed && !s.isWarmup).map((s) => s.weightKg),
      );
      const priorStalls = countPriorStalls(ex.exerciseId, topWeight, ex.repRange[1], state.sessions);
      const kind = requireExercise(ex.exerciseId).kind;
      return {
        ...ex,
        status: 'done' as const,
        recommendation: recommendFromExerciseSession({ ...ex, status: 'done' }, kind, priorStalls),
      };
    });

    const completed: WorkoutSession = {
      ...active,
      exercises,
      status: 'completed',
      completedAt: now(),
    };

    const newPRs: PersonalRecord[] = detectPersonalRecords(completed, state.personalRecords);

    set((s) => {
      const next: StoreState = {
        ...s,
        activeSession: null,
        undo: null,
        sessions: [completed, ...s.sessions],
        personalRecords: [...s.personalRecords, ...newPRs],
        streakDates: [completed.completedAt ?? now(), ...s.streakDates],
        restTimer: { endsAt: null, durationSec: s.restTimer.durationSec, exerciseId: null },
        lastCompletedSessionId: completed.id,
      };
      persist(next);
      return next;
    });
    return completed.id;
  },

  adjustWeight: (delta) =>
    set((s) => applyActive(s, (set2) => ({ ...set2, weightKg: Math.max(0, round1(set2.weightKg + delta)) }))),

  adjustReps: (delta) =>
    set((s) => applyActive(s, (set2) => ({ ...set2, reps: Math.max(0, set2.reps + delta) }))),

  setWeight: (weightKg) =>
    set((s) => applyActive(s, (set2) => ({ ...set2, weightKg: Math.max(0, round1(weightKg)) }))),

  setReps: (reps) =>
    set((s) => applyActive(s, (set2) => ({ ...set2, reps: Math.max(0, Math.round(reps)) }))),

  setRir: (rir) =>
    set((s) =>
      applyActive(s, (set2) => ({
        ...set2,
        rir,
        // Derive the per-set difficulty so RIR feeds the progression engine.
        difficulty: rir === undefined ? undefined : rirToDifficulty(rir),
      })),
    ),

  logActiveSet: () => {
    const state = get();
    const active = state.activeSession;
    if (!active) return;
    const loc = locateActive(active);
    if (!loc) return;

    const prevSet = loc.set;
    const completedAt = now();
    const nextSetIndex = loc.setIndex + 1;

    const exercises = active.exercises.map((ex, i) => {
      if (i !== loc.exIndex) return ex;
      const sets = ex.sets.map((sset, j) => {
        if (j === loc.setIndex) {
          return { ...sset, completed: true, completedAt };
        }
        // Copy the just-logged weight forward and suggest the same reps.
        if (j === nextSetIndex && !sset.completed) {
          return { ...sset, weightKg: prevSet.weightKg, reps: prevSet.reps };
        }
        return sset;
      });
      const allDone = sets.every((s) => s.completed);
      return { ...ex, sets, status: allDone ? ('done' as const) : ex.status };
    });

    const exercise = exercises[loc.exIndex]!;
    const shouldRest =
      state.user.settings.restTimerAutoStart && exercise.sets.some((s) => !s.completed);

    set((s) => {
      const next: StoreState = {
        ...s,
        activeSession: { ...active, exercises },
        undo: { exerciseIndex: loc.exIndex, setId: prevSet.id, prevSet },
        restTimer: shouldRest
          ? {
              endsAt: Date.now() + exercise.restSec * 1000,
              durationSec: exercise.restSec,
              exerciseId: exercise.exerciseId,
            }
          : s.restTimer,
      };
      persist(next);
      return next;
    });
  },

  undoLastSet: () => {
    const state = get();
    const active = state.activeSession;
    const undo = state.undo;
    if (!active || !undo) return;
    const exercises = active.exercises.map((ex, i) => {
      if (i !== undo.exerciseIndex) return ex;
      return {
        ...ex,
        status: 'active' as const,
        sets: ex.sets.map((s) => (s.id === undo.setId ? { ...undo.prevSet, completed: false, completedAt: undefined } : s)),
      };
    });
    set((s) => {
      const next: StoreState = {
        ...s,
        activeSession: { ...active, exercises },
        undo: null,
        restTimer: { endsAt: null, durationSec: s.restTimer.durationSec, exerciseId: null },
      };
      persist(next);
      return next;
    });
  },

  editSet: (exerciseIndex, setId, patch) =>
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        return {
          ...ex,
          sets: ex.sets.map((set2) =>
            set2.id === setId
              ? {
                  ...set2,
                  ...(patch.weightKg !== undefined ? { weightKg: Math.max(0, round1(patch.weightKg)) } : {}),
                  ...(patch.reps !== undefined ? { reps: Math.max(0, Math.round(patch.reps)) } : {}),
                }
              : set2,
          ),
        };
      });
      const next = { ...s, activeSession: { ...s.activeSession, exercises } };
      persist(next);
      return next;
    }),

  addSet: (exerciseIndex) =>
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        const last = ex.sets[ex.sets.length - 1];
        const newSet: SetEntry = {
          id: uid('set'),
          exerciseId: ex.exerciseId,
          setNumber: ex.sets.length + 1,
          type: 'working',
          weightKg: last?.weightKg ?? 20,
          reps: last?.reps ?? ex.repRange[1],
          completed: false,
          isWarmup: false,
        };
        return { ...ex, status: 'active' as const, sets: [...ex.sets, newSet] };
      });
      const next = { ...s, activeSession: { ...s.activeSession, exercises } };
      persist(next);
      return next;
    }),

  removeSet: (exerciseIndex, setId) =>
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        const sets = ex.sets
          .filter((set2) => set2.id !== setId)
          .map((set2, idx) => ({ ...set2, setNumber: idx + 1 }));
        return { ...ex, sets };
      });
      const next = { ...s, activeSession: { ...s.activeSession, exercises } };
      persist(next);
      return next;
    }),

  addWarmupSets: (exerciseIndex) =>
    set((s) => {
      if (!s.activeSession) return s;
      const barKg = s.user.settings.unit === 'kg' ? BAR_KG : lbToKg(BAR_LB);
      const exercises = s.activeSession.exercises.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        // Don't add warm-ups twice, and derive them from the first working set.
        if (ex.sets.some((st) => st.isWarmup)) return ex;
        const firstWorking = ex.sets.find((st) => !st.isWarmup);
        if (!firstWorking) return ex;
        const warmups = generateWarmups(firstWorking.weightKg, { barKg }).map(
          (w): SetEntry => ({
            id: uid('set'),
            exerciseId: ex.exerciseId,
            setNumber: 0, // renumbered below
            type: 'warmup',
            weightKg: w.weightKg,
            reps: w.reps,
            completed: false,
            isWarmup: true,
          }),
        );
        if (warmups.length === 0) return ex;
        const sets = [...warmups, ...ex.sets].map((st, idx) => ({ ...st, setNumber: idx + 1 }));
        return { ...ex, status: 'active' as const, sets };
      });
      const next = { ...s, activeSession: { ...s.activeSession, exercises } };
      persist(next);
      return next;
    }),

  setExerciseDifficulty: (exerciseIndex, difficulty) =>
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, i) =>
        i === exerciseIndex ? { ...ex, difficulty } : ex,
      );
      const next = { ...s, activeSession: { ...s.activeSession, exercises } };
      persist(next);
      return next;
    }),

  goToExercise: (index) =>
    set((s) => {
      if (!s.activeSession) return s;
      const exercises = s.activeSession.exercises.map((ex, i) =>
        i === index && ex.status === 'pending' ? { ...ex, status: 'active' as const } : ex,
      );
      const next = {
        ...s,
        activeSession: { ...s.activeSession, exercises, currentExerciseIndex: index },
      };
      persist(next);
      return next;
    }),

  nextExercise: () =>
    set((s) => {
      if (!s.activeSession) return s;
      const cur = s.activeSession.currentExerciseIndex;
      const nextIdx = Math.min(cur + 1, s.activeSession.exercises.length - 1);
      const exercises = s.activeSession.exercises.map((ex, i) => {
        if (i === cur && ex.sets.every((set2) => set2.completed)) return { ...ex, status: 'done' as const };
        if (i === nextIdx && ex.status === 'pending') return { ...ex, status: 'active' as const };
        return ex;
      });
      const next = {
        ...s,
        activeSession: { ...s.activeSession, exercises, currentExerciseIndex: nextIdx },
        restTimer: { endsAt: null, durationSec: s.restTimer.durationSec, exerciseId: null },
      };
      persist(next);
      return next;
    }),

  startRest: (durationSec, exerciseId) =>
    set((s) => {
      const next = {
        ...s,
        restTimer: { endsAt: Date.now() + durationSec * 1000, durationSec, exerciseId },
      };
      persist(next);
      return next;
    }),

  addRestTime: (deltaSec) =>
    set((s) => {
      if (s.restTimer.endsAt === null) return s;
      const endsAt = Math.max(Date.now(), s.restTimer.endsAt + deltaSec * 1000);
      const next = { ...s, restTimer: { ...s.restTimer, endsAt } };
      persist(next);
      return next;
    }),

  skipRest: () =>
    set((s) => {
      const next = {
        ...s,
        restTimer: { endsAt: null, durationSec: s.restTimer.durationSec, exerciseId: null },
      };
      persist(next);
      return next;
    }),

  saveTemplate: (template) =>
    set((s) => {
      const exists = s.templates.some((t) => t.id === template.id);
      const stamped = { ...template, updatedAt: now() };
      const templates = exists
        ? s.templates.map((t) => (t.id === template.id ? stamped : t))
        : [...s.templates, { ...stamped, createdAt: now() }];
      const next = { ...s, templates };
      persist(next);
      return next;
    }),

  deleteTemplate: (id) =>
    set((s) => {
      const templates = s.templates.filter((t) => t.id !== id);
      const weeklyPlan = Object.fromEntries(
        Object.entries(s.weeklyPlan).map(([k, v]) => [k, v === id ? null : v]),
      ) as AppData['weeklyPlan'];
      const next = { ...s, templates, weeklyPlan };
      persist(next);
      return next;
    }),

  duplicateTemplate: (id) => {
    const src = get().templates.find((t) => t.id === id);
    const newId = uid('tpl');
    if (!src) return newId;
    const copy: WorkoutTemplate = {
      ...src,
      id: newId,
      name: `${src.name} copy`,
      createdAt: now(),
      updatedAt: now(),
      exercises: src.exercises.map((e) => ({ ...e, id: uid('we') })),
    };
    set((s) => {
      const next = { ...s, templates: [...s.templates, copy] };
      persist(next);
      return next;
    });
    return newId;
  },

  setPlanForDay: (weekday, templateId) =>
    set((s) => {
      const next = { ...s, weeklyPlan: { ...s.weeklyPlan, [weekday]: templateId } };
      persist(next);
      return next;
    }),

  completeOnboarding: (partial) =>
    set((s) => {
      const user: User = { ...s.user, ...partial, onboarded: true };
      const next = { ...s, user };
      persist(next);
      return next;
    }),

  updateUser: (patch) =>
    set((s) => {
      const next = { ...s, user: { ...s.user, ...patch } };
      persist(next);
      return next;
    }),

  updateSettings: (patch) =>
    set((s) => {
      const next = { ...s, user: { ...s.user, settings: { ...s.user.settings, ...patch } } };
      persist(next);
      return next;
    }),

  resetAll: () => {
    repository.clear();
    const seeded = loadOrSeed();
    set((s) => ({ ...s, ...seeded, activeSession: null, undo: null, lastCompletedSessionId: null }));
    // A reset is intentional and should propagate to the cloud when signed in.
    notifyLocalWrite(seeded);
  },

  replaceAll: (data) =>
    set((s) => {
      const next: StoreState = { ...s, ...data, undo: null };
      // Cache the pulled remote locally; notifyLocalWrite is suppressed while
      // cloud sync is applying remote, so this won't echo back to the server.
      persist(next);
      return next;
    }),

  addPhoto: (photo) =>
    set((s) => {
      const next = { ...s, photos: [photo, ...s.photos] };
      persist(next);
      return next;
    }),

  deletePhoto: (id) =>
    set((s) => {
      const next = { ...s, photos: s.photos.filter((p) => p.id !== id) };
      persist(next);
      return next;
    }),

  addMeasurement: (m) =>
    set((s) => {
      const next = { ...s, measurements: [m, ...s.measurements] };
      persist(next);
      return next;
    }),

  deleteMeasurement: (id) =>
    set((s) => {
      const next = { ...s, measurements: s.measurements.filter((m) => m.id !== id) };
      persist(next);
      return next;
    }),
}));

// Wire cloud sync to the store: it reads the current AppData and applies pulled
// remote state, without either module importing the other's internals.
registerSync({
  getLocalData: () => extractAppData(useStore.getState()),
  applyRemote: (data) => useStore.getState().replaceAll(data),
});
initCloudSync();

/** Shared helper for the active-set adjust actions. */
function applyActive(
  s: StoreState,
  fn: (set: SetEntry) => SetEntry,
): StoreState {
  if (!s.activeSession) return s;
  const nextSession = mutateActiveSet(s.activeSession, fn);
  const next = { ...s, activeSession: nextSession };
  persist(next);
  return next;
}
