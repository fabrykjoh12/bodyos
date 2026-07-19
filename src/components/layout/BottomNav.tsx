import { NavLink } from 'react-router-dom';
import { BarChart3, Camera, Dumbbell, Home, LibraryBig } from 'lucide-react';

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/workouts', label: 'Workouts', icon: Dumbbell, end: false },
  { to: '/exercises', label: 'Exercises', icon: LibraryBig, end: false },
  { to: '/stats', label: 'Stats', icon: BarChart3, end: false },
  { to: '/progress', label: 'Progress', icon: Camera, end: false },
];

/**
 * Floating pill navigation — detached from the screen edge, frosted glass.
 * The active tab expands into a volt capsule with its label; inactive tabs
 * collapse to icons. One glance tells you where you are.
 */
export function BottomNav() {
  return (
    <nav aria-label="Primary" className="pointer-events-none sticky bottom-0 z-30 mt-auto pb-3 safe-bottom">
      <ul className="glass pointer-events-auto mx-auto flex w-fit items-center gap-1 rounded-full p-1.5 shadow-float">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-[0.78rem] font-bold transition-all duration-300 ease-spring',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
                  isActive
                    ? 'bg-accent px-4 text-ink shadow-[0_4px_16px_-4px_rgba(205,251,69,0.5)]'
                    : 'text-content-faint hover:text-content-muted active:scale-95',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.6 : 2} />
                  {isActive && <span className="animate-fade-in whitespace-nowrap">{label}</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
