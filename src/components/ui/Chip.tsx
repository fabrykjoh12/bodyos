import type { ReactNode } from 'react';

type Tone = 'default' | 'accent' | 'success' | 'caution' | 'danger' | 'muted';

const tones: Record<Tone, string> = {
  default: 'bg-surface-2 text-content-muted border-line',
  accent: 'bg-accent-soft text-accent border-accent/25',
  success: 'bg-success-soft text-success border-success/25',
  caution: 'bg-caution-soft text-caution border-caution/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  muted: 'bg-transparent text-content-faint border-line',
};

export function Chip({
  children,
  tone = 'default',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
