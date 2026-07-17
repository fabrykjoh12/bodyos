import type { CSSProperties } from 'react';
import type { Equipment } from '@/types';

interface ExerciseGlyphProps {
  equipment: Equipment;
  size?: number;
  style?: CSSProperties;
  className?: string;
}

// Minimal line glyphs per equipment type, drawn in the Lucide style
// (24×24, no fill, currentColor stroke) so they inherit the muscle tint.
const PATHS: Record<Equipment, JSX.Element> = {
  barbell: (
    <>
      <line x1="1.5" y1="12" x2="22.5" y2="12" />
      <line x1="5" y1="7.5" x2="5" y2="16.5" />
      <line x1="8" y1="9" x2="8" y2="15" />
      <line x1="16" y1="9" x2="16" y2="15" />
      <line x1="19" y1="7.5" x2="19" y2="16.5" />
    </>
  ),
  dumbbell: (
    <>
      <rect x="3" y="8" width="4" height="8" rx="1.5" />
      <rect x="17" y="8" width="4" height="8" rx="1.5" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </>
  ),
  machine: (
    <>
      <rect x="6.5" y="5" width="7" height="14" rx="1" />
      <line x1="6.5" y1="9" x2="13.5" y2="9" />
      <line x1="6.5" y1="12.5" x2="13.5" y2="12.5" />
      <path d="M13.5 5h4v13" />
    </>
  ),
  cable: (
    <>
      <circle cx="12" cy="6" r="3" />
      <path d="M12 9v6" />
      <path d="M9 18h6" />
      <path d="M12 15v3" />
    </>
  ),
  bodyweight: (
    <>
      <circle cx="12" cy="5" r="2.4" />
      <path d="M12 7.4v6.6" />
      <path d="M12 14l-3 5" />
      <path d="M12 14l3 5" />
      <path d="M7.5 10.5l4.5 1.8 4.5-1.8" />
    </>
  ),
  kettlebell: (
    <>
      <path d="M9 8a3 3 0 0 1 6 0" />
      <path d="M8.2 8C5.8 11 6.6 20 12 20s6.2-9 3.8-12Z" />
    </>
  ),
  band: (
    <>
      <path d="M3 10c3-3 6 3 9 0s6-3 9 0" />
      <path d="M3 14c3-3 6 3 9 0s6-3 9 0" />
    </>
  ),
};

export function ExerciseGlyph({ equipment, size = 24, style, className }: ExerciseGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden
    >
      {PATHS[equipment] ?? PATHS.dumbbell}
    </svg>
  );
}
