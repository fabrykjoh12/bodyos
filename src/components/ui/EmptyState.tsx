import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex animate-rise flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center">
      <div className="mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl bg-accent-soft text-accent">
        {icon}
      </div>
      <h3 className="text-heading text-content">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-content-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
