import { NavLink } from 'react-router-dom';
import { BarChart3, Camera, Dumbbell, Home, LibraryBig } from 'lucide-react';

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/workouts', label: 'Workouts', icon: Dumbbell, end: false },
  { to: '/exercises', label: 'Exercises', icon: LibraryBig, end: false },
  { to: '/stats', label: 'Stats', icon: BarChart3, end: false },
  { to: '/progress', label: 'Progress', icon: Camera, end: false },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 -mx-4 mt-auto border-t border-line bg-base/85 px-1 pt-1.5 backdrop-blur-lg safe-bottom"
    >
      <ul className="flex items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 rounded-xl py-1.5 text-[0.62rem] font-semibold tracking-wide transition-colors',
                  isActive ? 'text-accent' : 'text-content-faint hover:text-content-muted',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={21} strokeWidth={isActive ? 2.6 : 2} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
