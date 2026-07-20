import type { MuscleGroup } from '@/types';

const VOLT = '#CDFB45';

type Intensity = Partial<Record<MuscleGroup, number>>;

/**
 * A muscle region: an SVG path on the left half of a 100×220 figure.
 * `mirror` renders it twice (left + right); center regions render once.
 */
interface Plate {
  m: MuscleGroup;
  d: string;
  mirror?: boolean;
}

// ---------------------------------------------------------------------------
// The figure is modelled on a 3D graphite mannequin render (Higgsfield,
// job ff6d47e1 — see docs/muscle-figure-higgsfield.md): a continuous body
// with thin "groove" lines separating the muscle masses, lit softly from
// above. Heat fills the groove-bounded regions. 100×220 canvas; the left
// half is mirrored around x=50.

const SILHOUETTE_HALF = [
  'M46.6,20.5 L46.4,27', // neck side
  'Q44,30.5 38,33', // trapezius slope
  'Q28.5,36 25,40.5', // shoulder
  'Q22.4,44 22.2,50.5', // deltoid outer
  'Q21.4,60 20.6,70', // upper arm
  'Q19.4,80 18.2,92', // forearm outer
  'Q17.6,98 18.4,102', // wrist
  'Q17,108 19.2,112.5', // hand
  'Q21.6,115.5 23.2,111.5', // hand tip
  'Q24.4,107 24.4,102', // wrist inner
  'Q26.2,91 28.2,79', // forearm inner
  'Q29.8,70 30.6,62', // elbow inner
  'Q31.6,54 32.6,50', // upper arm inner
  'Q34,47 35.2,49.5', // armpit crease
  'Q34.6,60 35.8,72', // torso side
  'Q36.8,84 38.8,92', // waist to hip
  'Q40.4,97 39.8,103', // hip crest
  'Q37.6,115 36.8,127', // outer thigh
  'Q36.4,141 38.2,155', // toward knee
  'Q38.8,162 38.4,167', // knee outer
  'Q36.8,177 38,189', // calf outer
  'Q38.6,196 40.2,199', // ankle
  'Q38.6,204 41.6,205.5', // heel
  'L46.6,205.5', // foot
  'Q47.8,202 47,198.5', // ankle inner
  'Q45.8,191 45.7,183', // inner calf
  'Q45.6,174 45.1,165', // inner lower leg
  'Q44.7,159 45.4,151', // inner knee
  'Q46.8,137 47,123', // inner thigh
  'Q47.2,114.5 50,110', // crotch
  'L50,20.5 Z',
].join(' ');

// Heat regions tile the groove-bounded muscle masses.
const FRONT_PLATES: Plate[] = [
  // Deltoid cap
  { m: 'shoulders', mirror: true, d: 'M37.2,34.8 Q30,33.4 26.2,37 Q23.2,40.4 23.2,46.5 Q23.6,50 25.4,51.5 Q28.2,48 31.8,45.6 Q35,43.4 37,41.2 Q37.8,37.6 37.2,34.8 Z' },
  // Pec — clavicle to the pec-line groove
  { m: 'chest', mirror: true, d: 'M49.4,35.2 Q42,35.8 38,38.8 Q36,44 36.8,49 Q38.2,55.2 43.4,57 Q47,58 49.4,56.6 Z' },
  // Biceps
  { m: 'biceps', mirror: true, d: 'M24.4,51.5 Q27.8,53.6 30.4,52.4 Q31.8,58 30.6,64.8 Q29.6,70 27,71.6 Q24,70.4 22.6,64.8 Q21.8,57 24.4,51.5 Z' },
  // Forearm
  { m: 'forearms', mirror: true, d: 'M26.8,74 Q28.8,73.4 29.8,75.6 Q28.8,84 25.6,95.8 Q24.2,100.4 21.8,99.8 Q19.8,98.8 20.4,94 Q22.4,82 26.8,74 Z' },
  // Abs column (segment grooves drawn separately)
  { m: 'core', d: 'M44.4,59.5 Q50,58.6 55.6,59.5 Q56.8,74 55.2,90.5 Q52.8,95 50,95 Q47.2,95 44.8,90.5 Q43.2,74 44.4,59.5 Z' },
  // Obliques
  { m: 'core', mirror: true, d: 'M42.8,60.5 Q40.2,67 40.4,76.5 Q40.8,84.5 42.8,89.8 Q43.8,80 43.4,70 Q43.2,64.5 42.8,60.5 Z' },
  // Quad — outer sweep + rectus, bounded by the sartorius groove
  { m: 'quads', mirror: true, d: 'M39.6,106.5 Q44,104.5 47.2,108.5 Q48.4,124 46.8,143 Q45.6,154.5 42.4,157 Q39,155 37.8,142 Q36.8,122 39.6,106.5 Z' },
  // Front lower leg (tibialis + visible calf edge)
  { m: 'calves', mirror: true, d: 'M39.4,167.5 Q42.6,165 45,167.5 Q45.9,176.5 44.5,188 Q43.4,194 41.8,195.4 Q40.1,194 38.9,187.5 Q37.8,176.5 39.4,167.5 Z' },
];

const BACK_PLATES: Plate[] = [
  // Traps — the reference's long diamond from neck to mid-back
  { m: 'back', d: 'M50,27.5 Q43.5,30.5 38,33.6 Q44,38 47.2,46 Q49.2,52 50,60 Q50.8,52 52.8,46 Q56,38 62,33.6 Q56.5,30.5 50,27.5 Z' },
  // Rear deltoid
  { m: 'shoulders', mirror: true, d: 'M36.6,34.8 Q29.6,33.4 26,37 Q23,40.4 23.2,46.5 Q23.6,50 25.4,51.5 Q28.4,48 32,45.6 Q34.8,43.6 36.4,41.4 Q37.2,37.6 36.6,34.8 Z' },
  // Lats — wide V from armpit to the waist
  { m: 'back', mirror: true, d: 'M48.6,50.5 Q42,48.5 38.2,45.5 Q36.4,54 38.6,64 Q41.2,73.5 46,78.5 Q48.6,74 48.6,66 Z' },
  // Erector column
  { m: 'back', d: 'M45.6,80.5 Q50,79 54.4,80.5 Q55.2,88 53.8,94.5 Q52,97.5 50,97.5 Q48,97.5 46.2,94.5 Q44.8,88 45.6,80.5 Z' },
  // Triceps
  { m: 'triceps', mirror: true, d: 'M24.2,51.5 Q27.6,53.6 30.2,52.4 Q31.6,58 30.4,64.8 Q29.4,70 26.8,71.6 Q23.8,70.4 22.4,64.8 Q21.6,57 24.2,51.5 Z' },
  // Forearm
  { m: 'forearms', mirror: true, d: 'M26.8,74 Q28.8,73.4 29.8,75.6 Q28.8,84 25.6,95.8 Q24.2,100.4 21.8,99.8 Q19.8,98.8 20.4,94 Q22.4,82 26.8,74 Z' },
  // Glute — round mass
  { m: 'glutes', mirror: true, d: 'M40.4,99.5 Q46,97.5 49.2,101 Q50,108 48.6,113.5 Q45,117.8 40.8,116 Q37.8,112.5 38.2,106 Q38.8,101.5 40.4,99.5 Z' },
  // Hamstrings
  { m: 'hamstrings', mirror: true, d: 'M39.2,119.5 Q44,117.5 47.8,120.5 Q48.6,135 46.6,149 Q45.2,157.5 42.2,159.5 Q39.2,157.5 38,147 Q37,131 39.2,119.5 Z' },
  // Gastrocnemius diamond
  { m: 'calves', mirror: true, d: 'M39.2,166 Q42.4,163.2 45.2,166 Q46.2,175 44.7,186.5 Q43.5,193.5 41.9,195 Q40.2,193.5 38.9,186.5 Q37.6,175 39.2,166 Z' },
];

/** Groove lines — the thin dark separations that make the body read as 3D. */
function FrontGrooves() {
  const s = { stroke: '#0A0D12', strokeOpacity: 0.3, strokeWidth: 0.7, fill: 'none', strokeLinecap: 'round' as const };
  return (
    <g {...s}>
      {/* clavicles + sternum */}
      <path d="M50,33.5 Q42,34.5 37.5,38.5" />
      <path d="M50,33.5 Q58,34.5 62.5,38.5" />
      <path d="M50,35 L50,57.5" />
      {/* pec underline */}
      <path d="M37,49.5 Q42,57.5 49.5,57" />
      <path d="M63,49.5 Q58,57.5 50.5,57" />
      {/* delt/pec split */}
      <path d="M37.4,38 Q35,44 35.2,49.5" />
      <path d="M62.6,38 Q65,44 64.8,49.5" />
      {/* ab rows + linea alba */}
      <path d="M44.6,67 Q50,68.4 55.4,67" />
      <path d="M44.6,75 Q50,76.4 55.4,75" />
      <path d="M44.9,83 Q50,84.4 55.1,83" />
      <path d="M50,59 L50,94.5" strokeOpacity="0.2" />
      {/* oblique cut */}
      <path d="M43.6,61 Q42.6,75 43.6,89" strokeOpacity="0.2" />
      <path d="M56.4,61 Q57.4,75 56.4,89" strokeOpacity="0.2" />
      {/* adonis V */}
      <path d="M40.4,95 Q46,104 49.6,109" />
      <path d="M59.6,95 Q54,104 50.4,109" />
      {/* sartorius / inner-thigh sweep */}
      <path d="M41.4,99 Q45.4,124 45.2,149" strokeOpacity="0.24" />
      <path d="M58.6,99 Q54.6,124 54.8,149" strokeOpacity="0.24" />
      {/* knees */}
      <path d="M40.4,159.5 Q42.4,162 44.4,159.5" strokeOpacity="0.26" />
      <path d="M55.6,159.5 Q57.6,162 59.6,159.5" strokeOpacity="0.26" />
      {/* tibialis line */}
      <path d="M41.6,168 Q42.4,180 41.9,192" strokeOpacity="0.2" />
      <path d="M58.4,168 Q57.6,180 58.1,192" strokeOpacity="0.2" />
    </g>
  );
}

function BackGrooves() {
  const s = { stroke: '#0A0D12', strokeOpacity: 0.3, strokeWidth: 0.7, fill: 'none', strokeLinecap: 'round' as const };
  return (
    <g {...s}>
      {/* spine */}
      <path d="M50,28 L50,97" strokeOpacity="0.24" />
      {/* trap diamond edges */}
      <path d="M38.5,34 Q45,38.5 48,47 Q49.6,53 50,60" />
      <path d="M61.5,34 Q55,38.5 52,47 Q50.4,53 50,60" />
      {/* scapula hints */}
      <path d="M38,45 Q41.5,52 46.5,55" strokeOpacity="0.2" />
      <path d="M62,45 Q58.5,52 53.5,55" strokeOpacity="0.2" />
      {/* lat sweep to waist */}
      <path d="M37.5,46 Q39.5,64 46.5,79" />
      <path d="M62.5,46 Q60.5,64 53.5,79" />
      {/* glute split + underline */}
      <path d="M50,98.5 L50,117" />
      <path d="M38.8,115.5 Q44,119.5 49.4,116.5" strokeOpacity="0.26" />
      <path d="M61.2,115.5 Q56,119.5 50.6,116.5" strokeOpacity="0.26" />
      {/* hamstring split */}
      <path d="M43,122 Q42.8,140 42.6,157" strokeOpacity="0.2" />
      <path d="M57,122 Q57.2,140 57.4,157" strokeOpacity="0.2" />
      {/* calf split */}
      <path d="M42.1,166 Q42.3,176 42,186" strokeOpacity="0.2" />
      <path d="M57.9,166 Q57.7,176 58,186" strokeOpacity="0.2" />
    </g>
  );
}

function heatColor(v: number): { opacity: number; glow: boolean } {
  const clamped = Math.max(0, Math.min(1, v));
  return { opacity: 0.18 + 0.82 * clamped, glow: clamped >= 0.72 };
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
    if (v <= 0) return null;
    const heat = heatColor(v);
    return (
      <g key={key} transform={transform}>
        {heat.glow && <path d={p.d} fill={VOLT} opacity={heat.opacity * 0.85} filter="url(#mm-glow)" />}
        <path d={p.d} fill={VOLT} opacity={heat.opacity} style={{ transition: 'opacity 400ms ease' }} />
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
          {/* Soft light from above, like the render */}
          <linearGradient id="mm-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A313B" />
            <stop offset="18%" stopColor="#242B34" />
            <stop offset="100%" stopColor="#1B2129" />
          </linearGradient>
        </defs>
        {/* Continuous body: head + mirrored half-silhouette */}
        <g fill="url(#mm-body)">
          <ellipse cx="50" cy="13" rx="7.4" ry="8.6" />
          <path d={SILHOUETTE_HALF} />
          <path d={SILHOUETTE_HALF} transform="translate(100,0) scale(-1,1)" />
        </g>
        {/* Heat under the grooves so the anatomy lines stay crisp */}
        {plates.map((p, i) => (
          <g key={i}>
            {renderPlate(p, `l${i}`)}
            {p.mirror && renderPlate(p, `r${i}`, 'translate(100,0) scale(-1,1)')}
          </g>
        ))}
        {front ? <FrontGrooves /> : <BackGrooves />}
      </svg>
      <span className="label-tiny">{label}</span>
    </div>
  );
}

/**
 * Front/back body heat map: a continuous mannequin figure with groove-line
 * anatomy; groove-bounded muscle regions warm from graphite to glowing volt.
 * Pass a per-muscle intensity (0..1). `legend` renders either the
 * primary/secondary key or a low→high volume key.
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
