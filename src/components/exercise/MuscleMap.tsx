import type { MuscleGroup } from '@/types';

const VOLT = '#CDFB45';
const BODY = '#1A2028'; // continuous body silhouette
const PLATE = '#28303A'; // untrained muscle plate on top of the body

type Intensity = Partial<Record<MuscleGroup, number>>;

/**
 * A muscle plate: an SVG path on the left half of a 100×220 figure.
 * `mirror` renders it twice (left + right); center plates render once.
 */
interface Plate {
  m: MuscleGroup;
  d: string;
  mirror?: boolean;
}

// ---------------------------------------------------------------------------
// The figure: a continuous anatomical silhouette (left half, mirrored around
// x=50) with hand-tuned muscle plates layered on top. 100×220 canvas.

// Outer boundary: neck → trap slope → deltoid → arm → hand → inner arm →
// armpit → torso side → hip → outer leg → foot → inner leg → crotch → center.
const SILHOUETTE_HALF = [
  'M45.8,21.5 L45.8,26.5',
  'Q43.5,29.5 37.5,31.5', // trapezius slope
  'Q26.5,34 22.8,39', // shoulder cap
  'Q20,43 19.6,50', // deltoid outer edge
  'Q18.4,60 17.6,70', // upper arm to elbow
  'Q16.6,80 15.4,92', // forearm outer
  'Q14.8,98 15.6,102', // wrist
  'Q14.2,107 16.4,110', // hand outer
  'Q19.4,113 21.4,109.5', // hand
  'Q22.6,106 22.4,101', // wrist inner
  'Q24.4,90 26.6,78', // forearm inner
  'Q28.2,70 29.4,62', // elbow inner
  'Q30.4,54 31.6,50', // upper arm inner
  'Q33.4,46.5 35,49', // armpit crease
  'Q34.2,60 35.4,72', // torso side
  'Q36.4,84 38.6,92', // waist
  'Q40.2,98 39.4,104', // hip
  'Q37.4,116 36.6,128', // outer thigh
  'Q36.2,142 38,156', // toward knee
  'Q38.6,163 38.2,168', // knee
  'Q36.6,178 37.8,190', // calf outer
  'Q38.4,197 40,200', // ankle
  'Q39,205 41.5,206.5', // heel
  'L47,206.5', // foot
  'Q48.4,203 47.4,199.5', // ankle inner
  'Q46.2,192 46,184', // inner calf
  'Q45.8,175 45.2,166', // inner lower leg
  'Q44.8,160 45.6,152', // inner knee
  'Q47,138 47.2,124', // inner thigh
  'Q47.4,115 50,110.5', // crotch
  'L50,21.5 Z',
].join(' ');

const FRONT_PLATES: Plate[] = [
  // Deltoid cap
  { m: 'shoulders', mirror: true, d: 'M38.5,34.5 Q30.5,31.5 25.5,35.5 Q21.5,39 22.5,45.5 Q27,48.5 32,47.5 Q36,46.5 37.5,42 Z' },
  // Pec plate
  { m: 'chest', mirror: true, d: 'M48.8,38.5 Q41,37.5 38.6,41.5 Q36.5,45.5 38.5,50.5 Q41,55.5 46,56 Q48.8,56 48.8,52.5 Z' },
  // Biceps
  { m: 'biceps', mirror: true, d: 'M22.6,48.5 Q27.5,51.5 29.5,50.5 Q31.5,56.5 30,64.5 Q29,70 26,71.5 Q23,70 21.6,64 Q20.4,55 22.6,48.5 Z' },
  // Forearm
  { m: 'forearms', mirror: true, d: 'M25.5,73.5 Q28,73 29,75.5 Q28.5,84 25,95.5 Q23.4,100.5 21,100 Q18.8,99 19.4,94 Q20.8,82 23.5,75.5 Z' },
  // Abs (segment lines drawn separately)
  { m: 'core', d: 'M44.2,58.5 Q50,57.5 55.8,58.5 Q57.2,74 55.4,91 Q52.8,95.5 50,95.5 Q47.2,95.5 44.6,91 Q42.8,74 44.2,58.5 Z' },
  // Obliques
  { m: 'core', mirror: true, d: 'M42.6,59.5 Q40,66 40.2,76 Q40.6,84 42.8,89.5 Q43.6,80 43.2,70 Q43,64 42.6,59.5 Z' },
  // Quads
  { m: 'quads', mirror: true, d: 'M38.4,110.5 Q43.6,108.5 48.4,111.5 Q49.4,128 47.4,146 Q46,156.5 42.6,158.5 Q39,156.5 37.6,144 Q36.4,124 38.4,110.5 Z' },
  // Calf (front view)
  { m: 'calves', mirror: true, d: 'M39.2,166.5 Q42.8,164 45.4,166.5 Q46.4,176 44.8,187.5 Q43.6,194 41.9,195.5 Q40,194 38.6,187 Q37.4,176 39.2,166.5 Z' },
];

const BACK_PLATES: Plate[] = [
  // Traps — diamond from the neck over the shoulders into mid-back
  { m: 'back', d: 'M50,27.5 Q43,30.5 37.5,34 Q44,37.5 47.5,45 Q49.4,50.5 50,56 Q50.6,50.5 52.5,45 Q56,37.5 62.5,34 Q57,30.5 50,27.5 Z' },
  // Rear deltoid cap
  { m: 'shoulders', mirror: true, d: 'M36.5,34.5 Q29,32 24.5,36 Q21,39.5 22.2,45.5 Q27,48.5 32,47.5 Q35.6,46.5 37,42 Z' },
  // Lats — the V
  { m: 'back', mirror: true, d: 'M48.8,49.5 Q43,47 39.5,44.5 Q37.5,53 39.5,63.5 Q42,73.5 46.5,78.5 Q48.8,74 48.8,66 Z' },
  // Lower back / erectors
  { m: 'back', d: 'M45.4,80.5 Q50,78.5 54.6,80.5 Q55.4,88 54,94.5 Q52,97.5 50,97.5 Q48,97.5 46,94.5 Q44.6,88 45.4,80.5 Z' },
  // Triceps
  { m: 'triceps', mirror: true, d: 'M22.4,48.5 Q27,51.5 29.3,50.5 Q31.3,56.5 29.8,64.5 Q28.8,70 25.8,71.5 Q22.8,70 21.4,64 Q20.2,55 22.4,48.5 Z' },
  // Forearm
  { m: 'forearms', mirror: true, d: 'M25.5,73.5 Q28,73 29,75.5 Q28.5,84 25,95.5 Q23.4,100.5 21,100 Q18.8,99 19.4,94 Q20.8,82 23.5,75.5 Z' },
  // Glutes
  { m: 'glutes', mirror: true, d: 'M40,100.5 Q45.6,98.5 48.8,101.5 Q49.6,108 48.4,113.5 Q45,117.5 40.8,116 Q37.6,113 37.8,107 Q38.2,102.5 40,100.5 Z' },
  // Hamstrings
  { m: 'hamstrings', mirror: true, d: 'M38.6,120.5 Q43.6,118.5 48.2,121.5 Q49,136 47,150 Q45.6,158.5 42.4,160.5 Q39.2,158.5 37.8,148 Q36.6,132 38.6,120.5 Z' },
  // Calves
  { m: 'calves', mirror: true, d: 'M39.2,166.5 Q42.8,164 45.4,166.5 Q46.4,176 44.8,187.5 Q43.6,194 41.9,195.5 Q40,194 38.6,187 Q37.4,176 39.2,166.5 Z' },
];

/** Ab segment lines so the core plate reads as a six-pack, not a slab. */
function AbLines() {
  return (
    <g stroke="#0B0D11" strokeOpacity="0.55" strokeWidth="1" fill="none">
      <path d="M44.5,67 Q50,68.5 55.5,67" />
      <path d="M44.5,75.5 Q50,77 55.5,75.5" />
      <path d="M44.7,84 Q50,85.5 55.3,84" />
      <path d="M50,58.5 L50,94.5" strokeOpacity="0.4" />
    </g>
  );
}

function heatColor(v: number): { opacity: number; glow: boolean } {
  const clamped = Math.max(0, Math.min(1, v));
  return { opacity: 0.16 + 0.84 * clamped, glow: clamped >= 0.72 };
}

function Figure({
  plates,
  label,
  intensity,
  front,
}: {
  plates: Plate[];
  label: string;
  intensity: Intensity;
  front?: boolean;
}) {
  const renderPlate = (p: Plate, key: string, transform?: string) => {
    const v = intensity[p.m] ?? 0;
    const heat = v > 0 ? heatColor(v) : null;
    return (
      <g key={key} transform={transform}>
        <path d={p.d} fill={PLATE} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
        {heat && heat.glow && (
          <path d={p.d} fill={VOLT} opacity={heat.opacity * 0.85} filter="url(#mm-glow)" />
        )}
        {heat && (
          <path d={p.d} fill={VOLT} opacity={heat.opacity} style={{ transition: 'opacity 400ms ease' }} />
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 100 220" width="118" height="260" aria-hidden>
        <defs>
          <filter id="mm-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
          <linearGradient id="mm-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20262F" />
            <stop offset="100%" stopColor={BODY} />
          </linearGradient>
        </defs>
        {/* Continuous body: head + mirrored half-silhouette */}
        <g fill="url(#mm-body)">
          <circle cx="50" cy="13.5" r="8.8" />
          <path d={SILHOUETTE_HALF} />
          <path d={SILHOUETTE_HALF} transform="translate(100,0) scale(-1,1)" />
        </g>
        {plates.map((p, i) => (
          <g key={i}>
            {renderPlate(p, `l${i}`)}
            {p.mirror && renderPlate(p, `r${i}`, 'translate(100,0) scale(-1,1)')}
          </g>
        ))}
        {front && <AbLines />}
      </svg>
      <span className="label-tiny">{label}</span>
    </div>
  );
}

/**
 * Front/back body heat map: a full anatomical silhouette with muscle plates
 * that warm from graphite to glowing volt. Pass a per-muscle intensity
 * (0..1). `legend` renders either the primary/secondary key or a low→high
 * volume key.
 */
export function MuscleMap({
  intensity,
  legend,
}: {
  intensity: Intensity;
  legend?: 'exercise' | 'volume';
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-8">
        <Figure plates={FRONT_PLATES} label="Front" intensity={intensity} front />
        <Figure plates={BACK_PLATES} label="Back" intensity={intensity} />
      </div>
      {legend === 'exercise' && (
        <div className="flex items-center gap-4 text-[11px] text-content-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: VOLT }} /> Primary
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: VOLT, opacity: 0.32 }} /> Secondary
          </span>
        </div>
      )}
      {legend === 'volume' && (
        <div className="flex items-center gap-2 text-[11px] text-content-muted">
          <span>Less</span>
          <span className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${VOLT}29, ${VOLT})` }} />
          <span>More</span>
        </div>
      )}
    </div>
  );
}
