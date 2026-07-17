import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: 'default' | 'success' | 'accent' | 'caution';
  className?: string;
}

const accentText: Record<NonNullable<StatProps['accent']>, string> = {
  default: 'text-content',
  success: 'text-success',
  accent: 'text-accent',
  caution: 'text-caution',
};

/** Compact metric tile used across dashboard and analytics. */
export function Stat({ label, value, sub, icon, accent = 'default', className = '' }: StatProps) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center gap-1.5 text-content-faint">
        {icon}
        <span className="label-tiny">{label}</span>
      </div>
      <div className={`mt-2 whitespace-nowrap text-stat tnum ${accentText[accent]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-content-muted">{sub}</div>}
    </div>
  );
}
