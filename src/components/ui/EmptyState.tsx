import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex animate-fade-in flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-content">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-content-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
