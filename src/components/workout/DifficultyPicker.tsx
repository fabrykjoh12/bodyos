import type { Difficulty } from '@/types';

const OPTIONS: { value: Difficulty; label: string; tone: string }[] = [
  {
    value: 'easy',
    label: 'Easy',
    tone: 'data-[on=true]:border-success data-[on=true]:bg-success-soft data-[on=true]:text-success',
  },
  {
    value: 'good',
    label: 'Good',
    tone: 'data-[on=true]:border-accent data-[on=true]:bg-accent-soft data-[on=true]:text-accent',
  },
  {
    value: 'hard',
    label: 'Hard',
    tone: 'data-[on=true]:border-caution data-[on=true]:bg-caution-soft data-[on=true]:text-caution',
  },
  {
    value: 'failed',
    label: 'Failed',
    tone: 'data-[on=true]:border-danger data-[on=true]:bg-danger-soft data-[on=true]:text-danger',
  },
];

interface DifficultyPickerProps {
  value?: Difficulty;
  onChange: (d: Difficulty) => void;
}

/** One-tap, optional effort rating that feeds the progression engine. */
export function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  return (
    <div>
      <span className="label-tiny">How did that feel?</span>
      <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Set difficulty">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            data-on={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              'rounded-xl border border-line bg-surface-2 py-2 text-xs font-semibold text-content-muted transition-colors',
              'hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
              opt.tone,
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
