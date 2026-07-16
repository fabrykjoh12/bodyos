import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useStore } from '@/store/useStore';
import { Dashboard } from '@/screens/Dashboard';
import { GymMode } from '@/screens/GymMode';

// Heavier / less-frequent screens are code-split so the initial bundle stays
// small (Recharts only loads when Stats or an exercise chart is opened).
const Workouts = lazy(() => import('@/screens/Workouts').then((m) => ({ default: m.Workouts })));
const WorkoutDetail = lazy(() => import('@/screens/WorkoutDetail').then((m) => ({ default: m.WorkoutDetail })));
const WorkoutNew = lazy(() => import('@/screens/WorkoutNew').then((m) => ({ default: m.WorkoutNew })));
const WorkoutComplete = lazy(() => import('@/screens/WorkoutComplete').then((m) => ({ default: m.WorkoutComplete })));
const Progress = lazy(() => import('@/screens/Progress').then((m) => ({ default: m.Progress })));
const ProgressPhotos = lazy(() => import('@/screens/ProgressPhotos').then((m) => ({ default: m.ProgressPhotos })));
const Stats = lazy(() => import('@/screens/Stats').then((m) => ({ default: m.Stats })));
const ExerciseLibrary = lazy(() => import('@/screens/ExerciseLibrary').then((m) => ({ default: m.ExerciseLibrary })));
const ExerciseDetail = lazy(() => import('@/screens/ExerciseDetail').then((m) => ({ default: m.ExerciseDetail })));
const Profile = lazy(() => import('@/screens/Profile').then((m) => ({ default: m.Profile })));
const Settings = lazy(() => import('@/screens/Settings').then((m) => ({ default: m.Settings })));
const Onboarding = lazy(() => import('@/screens/Onboarding').then((m) => ({ default: m.Onboarding })));
const NotFound = lazy(() => import('@/screens/NotFound').then((m) => ({ default: m.NotFound })));

function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  );
}

export default function App() {
  const onboarded = useStore((s) => s.user.onboarded);
  const location = useLocation();

  if (!onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/session/:id" element={<GymMode />} />
        <Route path="/session/:id/complete" element={<WorkoutComplete />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/workouts/new" element={<WorkoutNew />} />
          <Route path="/workouts/:id" element={<WorkoutDetail />} />
          <Route path="/exercises" element={<ExerciseLibrary />} />
          <Route path="/exercises/:id" element={<ExerciseDetail />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/progress/photos" element={<ProgressPhotos />} />
          <Route path="/progress/strength" element={<Navigate to="/stats" replace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
