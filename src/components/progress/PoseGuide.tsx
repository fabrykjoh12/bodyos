/**
 * A neutral silhouette overlay to standardize framing, distance, and pose
 * across progress photos. Rendered on top of the capture area.
 */
export function PoseGuide({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 280"
      className={`pointer-events-none ${className}`}
      fill="none"
      aria-hidden="true"
    >
      <g stroke="rgba(76,141,255,0.5)" strokeWidth="2" strokeDasharray="5 5">
        <circle cx="100" cy="42" r="24" />
        <path d="M76 74 L64 150 M124 74 L136 150" />
        <path d="M78 72 Q100 64 122 72 L120 168 Q100 176 80 168 Z" />
        <path d="M84 168 L80 262 M116 168 L120 262" />
      </g>
      <line
        x1="100"
        y1="8"
        x2="100"
        y2="272"
        stroke="rgba(76,141,255,0.25)"
        strokeWidth="1"
        strokeDasharray="3 6"
      />
    </svg>
  );
}
