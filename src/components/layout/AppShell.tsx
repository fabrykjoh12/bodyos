import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useStore } from '@/store/useStore';

// Routes that show the bottom tab bar.
const NAV_ROUTES = ['/', '/workouts', '/exercises', '/stats', '/progress', '/profile', '/settings'];

// Focused sub-screens with their own fixed bottom action bar — the tab bar is
// hidden so it doesn't overlap the primary CTA (Start Workout / Save).
const HIDE_NAV_PREFIXES = ['/workouts/'];

/** Mobile-first frame: a centered column with a bottom tab bar on main tabs. */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSession = useStore((s) => s.activeSession);

  const showNav =
    NAV_ROUTES.some((t) =>
      t === '/' ? location.pathname === '/' : location.pathname.startsWith(t),
    ) && !HIDE_NAV_PREFIXES.some((p) => location.pathname.startsWith(p));
  const showResume = activeSession && !location.pathname.startsWith('/session');

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-base px-4">
      <main className="flex flex-1 flex-col pb-4">
        {/* Keyed by route so each screen gets a subtle enter transition. */}
        <div key={location.pathname} className="flex flex-1 flex-col animate-page-in">
          <Outlet />
        </div>
      </main>

      {showResume && (
        <button
          onClick={() => navigate(`/session/${activeSession.id}`)}
          className="sticky bottom-20 z-30 mb-2 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3 text-left animate-slide-up"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-ink">
            <Dumbbell size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-content">Workout in progress</span>
            <span className="block text-xs text-content-muted">{activeSession.name} · tap to resume</span>
          </span>
          <span className="text-sm font-bold text-accent">Resume</span>
        </button>
      )}

      {showNav && <BottomNav />}
    </div>
  );
}
