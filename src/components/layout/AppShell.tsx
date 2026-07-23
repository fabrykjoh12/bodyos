import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Dumbbell, RefreshCw } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useStore } from '@/store/useStore';
import { useSwUpdate } from '@/lib/swUpdate';

/** Non-blocking "update ready" notice — applying is always user-initiated. */
function UpdateToast() {
  const needRefresh = useSwUpdate((s) => s.needRefresh);
  const apply = useSwUpdate((s) => s.apply);
  if (!needRefresh) return null;
  return (
    <div className="glass pointer-events-auto sticky bottom-[4.75rem] z-30 mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-float animate-slide-up">
      <RefreshCw size={16} className="shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-xs text-content">A new version of BodyOS is ready.</p>
      <button
        onClick={apply}
        className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-ink"
      >
        Restart
      </button>
    </div>
  );
}

/** Urgent, persistent warning while training data exists only in memory. */
export function StorageFailureBanner() {
  const failing = useStore((s) => s.storageFailing);
  if (!failing) return null;
  return (
    <div
      role="alert"
      className="sticky top-0 z-40 -mx-[var(--gutter)] flex items-start gap-2.5 border-b border-danger/40 bg-danger/15 px-[var(--gutter)] py-2.5 backdrop-blur-md"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" />
      <p className="text-xs leading-snug text-content">
        <span className="font-bold text-danger">Storage is failing.</span> Your training is
        currently only in memory and will be lost if you close the app. Free up space or export a
        backup from Settings now.
      </p>
    </div>
  );
}

// Routes that show the bottom tab bar.
const NAV_ROUTES = ['/', '/workouts', '/exercises', '/progress', '/profile', '/settings'];

// Focused sub-screens with their own fixed bottom action bar — the tab bar is
// hidden so it doesn't overlap the primary CTA (Start Workout / Save).
const HIDE_NAV_PREFIXES = ['/workouts/'];

/** Mobile-first frame: a centered column with a floating nav on main tabs. */
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
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-base px-[var(--gutter)] safe-top">
      <StorageFailureBanner />
      <main className="flex flex-1 flex-col pb-4">
        {/* Keyed by route so each screen gets a subtle enter transition. */}
        <div key={location.pathname} className="flex flex-1 flex-col animate-page-in">
          <Outlet />
        </div>
      </main>

      {showResume && (
        <button
          onClick={() => navigate(`/session/${activeSession.id}`)}
          className="glass pressable sticky bottom-[4.75rem] z-30 mb-3 flex items-center gap-3 rounded-2xl border-accent/35 px-4 py-3 text-left shadow-float animate-slide-up"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-ink">
            <Dumbbell size={18} />
            <span className="absolute inset-0 rounded-xl bg-accent animate-ping-once" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-content">Workout in progress</span>
            <span className="block truncate text-xs text-content-muted">
              {activeSession.name} · tap to resume
            </span>
          </span>
          <span className="text-sm font-bold text-accent">Resume</span>
        </button>
      )}

      <UpdateToast />
      {showNav && <BottomNav />}
    </div>
  );
}
