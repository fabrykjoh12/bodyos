import { useRef, useState } from 'react';

interface BeforeAfterSliderProps {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}

/** Draggable before/after comparison slider. */
export function BeforeAfterSlider({ before, after, beforeLabel, afterLabel }: BeforeAfterSliderProps) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  const updateFromClientX = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  };

  return (
    <div
      ref={ref}
      className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-2xl border border-line bg-surface-2"
      onPointerMove={(e) => e.buttons === 1 && updateFromClientX(e.clientX)}
      onPointerDown={(e) => updateFromClientX(e.clientX)}
    >
      <img src={after} alt="After" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={before} alt="Before" className="absolute inset-0 h-full w-full max-w-none object-cover" style={{ width: ref.current?.clientWidth }} draggable={false} />
      </div>

      {beforeLabel && (
        <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
          {beforeLabel}
        </span>
      )}
      {afterLabel && (
        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
          {afterLabel}
        </span>
      )}

      <div className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: `${pos}%` }} aria-hidden />
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Comparison position"
        className="absolute inset-x-0 bottom-3 mx-auto w-[85%] accent-accent"
      />
    </div>
  );
}
