import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface NumericStepperProps {
  label: string;
  value: number;
  unit?: string;
  step: number;
  min?: number;
  onChange: (value: number) => void;
  /** Format the big display value. */
  format?: (value: number) => string;
  size?: 'md' | 'lg';
}

/**
 * Large +/- stepper with hold-to-repeat and tap-to-edit. Designed for fast,
 * one-handed adjustments during a workout; every control is 44px+.
 */
export function NumericStepper({
  label,
  value,
  unit,
  step,
  min = 0,
  onChange,
  format,
  size = 'lg',
}: NumericStepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const holdRef = useRef<{ timeout: number; interval: number } | null>(null);

  const clamp = (v: number) => Math.max(min, Math.round(v * 100) / 100);

  const bump = (dir: 1 | -1) => {
    haptics.tap();
    onChange(clamp(value + dir * step));
  };

  const startHold = (dir: 1 | -1) => {
    bump(dir);
    const timeout = window.setTimeout(() => {
      const interval = window.setInterval(() => onChange(clamp(valueRef.current + dir * step)), 90);
      if (holdRef.current) holdRef.current.interval = interval;
    }, 380);
    holdRef.current = { timeout, interval: 0 };
  };

  const endHold = () => {
    if (holdRef.current) {
      window.clearTimeout(holdRef.current.timeout);
      window.clearInterval(holdRef.current.interval);
      holdRef.current = null;
    }
  };

  // Keep a ref of the latest value for the repeat interval closure.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => () => endHold(), []);

  const commitEdit = () => {
    const parsed = Number.parseFloat(draft.replace(',', '.'));
    if (!Number.isNaN(parsed)) onChange(clamp(parsed));
    setEditing(false);
  };

  const display = format ? format(value) : String(value);
  const bigText = size === 'lg' ? 'text-[3.4rem]' : 'text-3xl';

  const holdBtn =
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white/[0.05] text-content shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-150 ease-spring hover:bg-white/[0.09] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="label-tiny">{label}</span>
      <div className="flex w-full items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onPointerDown={() => startHold(-1)}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          className={holdBtn}
        >
          <Minus size={26} strokeWidth={2.5} />
        </button>

        {editing ? (
          <input
            autoFocus
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            aria-label={`Edit ${label}`}
            className={`${bigText} tnum min-w-0 flex-1 rounded-xl bg-surface-2 px-1 text-center font-bold text-content outline-none ring-2 ring-accent`}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(String(value));
              setEditing(true);
            }}
            aria-label={`${label} is ${display}${unit ? ' ' + unit : ''}, tap to edit`}
            className="flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 py-1 transition-colors hover:bg-surface-2"
          >
            {/* Keyed by value: each change re-pops the numeral for tactile feedback. */}
            <span key={display} className={`${bigText} tnum animate-pop-in font-bold leading-none tracking-[-0.03em] text-content`}>
              {display}
            </span>
            {unit && <span className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-content-faint">{unit}</span>}
          </button>
        )}

        <button
          type="button"
          aria-label={`Increase ${label}`}
          onPointerDown={() => startHold(1)}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          className={holdBtn}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
