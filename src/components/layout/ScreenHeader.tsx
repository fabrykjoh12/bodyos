import type { ReactNode } from 'react';
import { BackButton } from '@/components/ui/BackButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  right?: ReactNode;
  large?: boolean;
}

/**
 * Screen masthead. Top-level tabs get a big typographic title (the design's
 * voice); sub-screens with a back button stay compact and sticky.
 */
export function ScreenHeader({ title, subtitle, back, right, large = true }: ScreenHeaderProps) {
  if (back || !large) {
    return (
      <header className="bleed sticky top-0 z-20 mb-3 border-b border-line/60 bg-base/80 pb-3 pt-3 backdrop-blur-md safe-top">
        <div className="flex items-center gap-2">
          {back && <BackButton to={typeof back === 'string' ? back : undefined} />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-[-0.01em] text-content">{title}</h1>
            {subtitle && <p className="truncate text-sm text-content-muted">{subtitle}</p>}
          </div>
          {right && <div className="flex items-center gap-1">{right}</div>}
        </div>
      </header>
    );
  }

  return (
    <header className="mb-3 pt-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {subtitle && <p className="label-tiny mb-2">{subtitle}</p>}
          <h1 className="text-title text-content">{title}</h1>
        </div>
        {right && <div className="flex shrink-0 items-center gap-1 pb-1">{right}</div>}
      </div>
    </header>
  );
}
