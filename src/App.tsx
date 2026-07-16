import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useStore } from '@/store/useStore';
import { Dashboard } from '@/screens/Dashboard';
import { Workouts } from '@/screens/Workouts';
import { WorkoutDetail } from '@/screens/WorkoutDetail';
import { WorkoutNew } from '@/screens/WorkoutNew';
import { GymMode } from '@/screens/GymMode';
import { WorkoutComplete } from '@/screens/WorkoutComplete';
import { Progress } from '@/screens/Progress';
import { ProgressPhotos } from '@/screens/ProgressPhotos';
import { ProgressStrength } from '@/screens/ProgressStrength';
import { ExerciseLibrary } from '@/screens/ExerciseLibrary';
import { ExerciseDetail } from '@/screens/ExerciseDetail';
import { Profile } from '@/screens/Profile';
import { Settings } from '@/screens/Settings';
import { Onboarding } from '@/screens/Onboarding';
import { NotFound } from '@/screens/NotFound';

export default function App() {
  const onboarded = useStore((s) => s.user.onboarded);
  const location = useLocation();

  if (!onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
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
        <Route path="/progress" element={<Progress />} />
        <Route path="/progress/photos" element={<ProgressPhotos />} />
        <Route path="/progress/strength" element={<ProgressStrength />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
