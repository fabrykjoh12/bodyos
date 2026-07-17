import type { MuscleGroup } from '@/types';

interface Blob {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

// Approximate muscle positions on a stylized 100×220 body silhouette.
const FRONT: Partial<Record<MuscleGroup, Blob[]>> = {
  shoulders: [{ cx: 31, cy: 44, rx: 7.5, ry: 6.5 }, { cx: 69, cy: 44, rx: 7.5, ry: 6.5 }],
  chest: [{ cx: 43, cy: 55, rx: 8, ry: 6.5 }, { cx: 57, cy: 55, rx: 8, ry: 6.5 }],
  biceps: [{ cx: 24, cy: 66, rx: 4.5, ry: 10 }, { cx: 76, cy: 66, rx: 4.5, ry: 10 }],
  forearms: [{ cx: 20, cy: 90, rx: 4, ry: 11 }, { cx: 80, cy: 90, rx: 4, ry: 11 }],
  core: [{ cx: 50, cy: 82, rx: 8.5, ry: 19 }],
  quads: [{ cx: 43, cy: 138, rx: 7.5, ry: 21 }, { cx: 57, cy: 138, rx: 7.5, ry: 21 }],
  calves: [{ cx: 43, cy: 186, rx: 5.5, ry: 15 }, { cx: 57, cy: 186, rx: 5.5, ry: 15 }],
};

const BACK: Partial<Record<MuscleGroup, Blob[]>> = {
  shoulders: [{ cx: 31, cy: 44, rx: 7.5, ry: 6.5 }, { cx: 69, cy: 44, rx: 7.5, ry: 6.5 }],
  back: [{ cx: 50, cy: 62, rx: 15, ry: 17 }],
  triceps: [{ cx: 24, cy: 66, rx: 4.5, ry: 10 }, { cx: 76, cy: 66, rx: 4.5, ry: 10 }],
  forearms: [{ cx: 20, cy: 90, rx: 4, ry: 11 }, { cx: 80, cy: 90, rx: 4, ry: 11 }],
  glutes: [{ cx: 43, cy: 116, rx: 8, ry: 8 }, { cx: 57, cy: 116, rx: 8, ry: 8 }],
  hamstrings: [{ cx: 43, cy: 145, rx: 7, ry: 19 }, { cx: 57, cy: 145, rx: 7, ry: 19 }],
  calves: [{ cx: 43, cy: 186, rx: 5.5, ry: 15 }, { cx: 57, cy: 186, rx: 5.5, ry: 15 }],
};

const VOLT = '#CDFB45';

function Figure({
  regions,
  label,
  primary,
  secondary,
}: {
  regions: Partial<Record<MuscleGroup, Blob[]>>;
  label: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 100 220" width="82" height="180" aria-hidden>
        {/* silhouette */}
        <g fill="#20262d">
          <circle cx="50" cy="18" r="10.5" />
          <rect x="35" y="30" width="30" height="80" rx="13" />
          <rect x="15.5" y="40" width="9" height="58" rx="4.5" />
          <rect x="75.5" y="40" width="9" height="58" rx="4.5" />
          <rect x="36.5" y="104" width="12" height="104" rx="6" />
          <rect x="51.5" y="104" width="12" height="104" rx="6" />
        </g>
        {/* highlighted muscles */}
        {(Object.entries(regions) as [MuscleGroup, Blob[]][]).map(([m, blobs]) => {
          const isPrimary = m === primary;
          const isSecondary = secondary.includes(m);
          if (!isPrimary && !isSecondary) return null;
          return blobs.map((b, i) => (
            <ellipse
              key={`${m}-${i}`}
              cx={b.cx}
              cy={b.cy}
              rx={b.rx}
              ry={b.ry}
              fill={VOLT}
              opacity={isPrimary ? 0.95 : 0.32}
            />
          ));
        })}
      </svg>
      <span className="label-tiny">{label}</span>
    </div>
  );
}

/** Front/back body map with the exercise's worked muscles highlighted. */
export function MuscleMap({
  primary,
  secondary,
}: {
  primary: MuscleGroup;
  secondary: MuscleGroup[];
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-6">
        <Figure regions={FRONT} label="Front" primary={primary} secondary={secondary} />
        <Figure regions={BACK} label="Back" primary={primary} secondary={secondary} />
      </div>
      <div className="flex items-center gap-4 text-[11px] text-content-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: VOLT }} /> Primary
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: VOLT, opacity: 0.32 }} /> Secondary
        </span>
      </div>
    </div>
  );
}
