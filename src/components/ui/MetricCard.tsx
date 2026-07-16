import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive: boolean } | null;
  hint?: ReactNode;
  icon?: ReactNode;
}

export function MetricCard({ label, value, delta, hint, icon }: MetricCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="label-tiny">{label}</span>
        {icon && <span className="text-content-faint">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-stat tnum text-content">{value}</span>
        {delta && (
          <span
            className={`text-sm font-semibold tnum ${delta.positive ? 'text-success' : 'text-danger'}`}
          >
            {delta.positive ? '↑' : '↓'} {delta.value}
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-content-muted">{hint}</div>}
    </div>
  );
}
