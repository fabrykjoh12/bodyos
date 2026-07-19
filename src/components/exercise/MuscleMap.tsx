import type { MuscleGroup } from '@/types';

const VOLT = '#CDFB45';
const PLATE = '#242B34'; // untrained muscle plate
const NEUTRAL = '#202730'; // head / hands / feet / joints

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

// The figure is *built from* muscle plates — every muscle is always visible
// as a dim plate and "heats up" toward volt. Coordinates are hand-tuned on a
// 100×220 canvas; right-side copies are mirrored around x=50.

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
  // Calf (front view: outer calf visible)
  { m: 'calves', mirror: true, d: 'M39.4,166.5 Q43.4,164.5 46.4,167.5 Q47.4,178 45.6,189 Q44.4,195 42.4,196.5 Q40.4,195 39,188 Q37.8,176 39.4,166.5 Z' },
];

const BACK_PLATES: Plate[] = [
  // Traps — diamond from the neck over the shoulders into mid-back
  { m: 'back', d: 'M50,27.5 Q43,30.5 37.5,34 Q44,37.5 47.5,45 Q49.4,50.5 50,56 Q50.6,50.5 52.5,45 Q56,37.5 62.5,34 Q57,30.5 50,27.5 Z' },
  // Rear deltoid cap
  { m: 'shoulders', mirror: true, d: 'M36.5,34.5 Q29,32 24.5,36 Q21,39.5 22.2,45.5 Q27,48.5 32,47.5 Q35.6,46.5 37,42 Z' },
  // Lats — the V
  { m: 'back', mirror: true, d: 'M48.8,49.5 Q43,47 39.5,44.5 Q37.5,53 39.5,63.5 Q42,73.5 46.5,78.5 Q48.8,74 48.8,66 Z' },
  // Lower back
  { m: 'back', d: 'M45.4,80.5 Q50,78.5 54.6,80.5 Q55.4,88 54,94.5 Q52,97.5 50,97.5 Q48,97.5 46,94.5 Q44.6,88 45.4,80.5 Z' },
  // Triceps
  { m: 'triceps', mirror: true, d: 'M22.4,48.5 Q27,51.5 29.3,50.5 Q31.3,56.5 29.8,64.5 Q28.8,70 25.8,71.5 Q22.8,70 21.4,64 Q20.2,55 22.4,48.5 Z' },
  // Forearm
  { m: 'forearms', mirror: true, d: 'M25.5,73.5 Q28,73 29,75.5 Q28.5,84 25,95.5 Q23.4,100.5 21,100 Q18.8,99 19.4,94 Q20.8,82 23.5,75.5 Z' },
  // Glutes
  { m: 'glutes', mirror: true, d: 'M40,100.5 Q45.6,98.5 48.8,101.5 Q49.6,108 48.4,113.5 Q45,117.5 40.8,116 Q37.6,113 37.8,107 Q38.2,102.5 40,100.5 Z' },
  // Hamstrings
  { m: 'hamstrings', mirror: true, d: 'M38.6,120.5 Q43.6,118.5 48.2,121.5 Q49,136 47,150 Q45.6,158.5 42.4,160.5 Q39.2,158.5 37.8,148 Q36.6,132 38.6,120.5 Z' },
  // Calves — the diamond heads
  { m: 'calves', mirror: true, d: 'M39.2,166.5 Q43.2,163.5 46.6,166.5 Q47.8,177 46,188.5 Q44.6,195.5 42.4,197 Q40.2,195.5 38.8,188.5 Q37.4,177 39.2,166.5 Z' },
];

/** Neutral (non-heatable) anatomy: head, neck, hands, knees, feet. */
function NeutralParts({ back }: { back?: boolean }) {
  return (
    <g fill={NEUTRAL}>
      <circle cx="50" cy="14.5" r="9" />
      <path d="M45.8,23 h8.4 v6.5 h-8.4 Z" />
      {/* hip wedge between torso and legs */}
      {back ? null : <path d="M42.8,96.5 Q50,99.5 57.2,96.5 Q56,104 50,107.5 Q44,104 42.8,96.5 Z" />}
      {/* hands */}
      <circle cx="19.6" cy="105.5" r="3.4" />
      <circle cx="80.4" cy="105.5" r="3.4" />
      {/* knees */}
      <rect x="38.6" y="159.5" width="7.6" height="5" rx="2.5" />
      <rect x="53.8" y="159.5" width="7.6" height="5" rx="2.5" />
      {/* feet */}
      <rect x="37.8" y="198.5" width="9" height="5.5" rx="2.75" />
      <rect x="53.2" y="198.5" width="9" height="5.5" rx="2.75" />
    </g>
  );
}

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

function heatColor(v: number): { fill: string; opacity: number; glow: boolean } {
  const clamped = Math.max(0, Math.min(1, v));
  return { fill: VOLT, opacity: 0.16 + 0.84 * clamped, glow: clamped >= 0.72 };
}

function Figure({
  plates,
  label,
  intensity,
  back,
}: {
  plates: Plate[];
  label: string;
  intensity: Intensity;
  back?: boolean;
}) {
  const renderPlate = (p: Plate, key: string, transform?: string) => {
    const v = intensity[p.m] ?? 0;
    const heat = v > 0 ? heatColor(v) : null;
    return (
      <g key={key} transform={transform}>
        <path d={p.d} fill={PLATE} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        {heat && heat.glow && (
          <path d={p.d} fill={heat.fill} opacity={heat.opacity * 0.85} filter="url(#mm-glow)" />
        )}
        {heat && <path d={p.d} fill={heat.fill} opacity={heat.opacity} />}
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 100 220" width="104" height="229" aria-hidden>
        <defs>
          <filter id="mm-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
        </defs>
        <NeutralParts back={back} />
        {plates.map((p, i) => (
          <g key={i}>
            {renderPlate(p, `l${i}`)}
            {p.mirror && renderPlate(p, `r${i}`, 'translate(100,0) scale(-1,1)')}
          </g>
        ))}
        {!back && <AbLines />}
      </svg>
      <span className="label-tiny">{label}</span>
    </div>
  );
}

/**
 * Front/back body heat map, built from anatomical muscle plates. Pass a
 * per-muscle intensity (0..1); plates warm from dim graphite to full volt
 * (with a soft glow at the top of the range). `legend` renders either the
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
        <Figure plates={FRONT_PLATES} label="Front" intensity={intensity} />
        <Figure plates={BACK_PLATES} label="Back" intensity={intensity} back />
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
