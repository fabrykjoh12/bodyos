import type { ReactNode } from 'react';
import { BackButton } from '@/components/ui/BackButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  right?: ReactNode;
  large?: boolean;
}

export function ScreenHeader({ title, subtitle, back, right, large }: ScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-2 border-b border-line/60 bg-base/80 px-4 pb-3 pt-3 backdrop-blur-md safe-top">
      <div className="flex items-center gap-2">
        {back && <BackButton to={typeof back === 'string' ? back : undefined} />}
        <div className="min-w-0 flex-1">
          <h1 className={`truncate font-bold text-content ${large ? 'text-2xl' : 'text-lg'}`}>{title}</h1>
          {subtitle && <p className="truncate text-sm text-content-muted">{subtitle}</p>}
        </div>
        {right && <div className="flex items-center gap-1">{right}</div>}
      </div>
    </header>
  );
}
