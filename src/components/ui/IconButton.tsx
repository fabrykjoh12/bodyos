import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

/** Square, accessible icon button with a guaranteed 44px+ touch target. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-11 w-11 items-center justify-center rounded-xl text-content-muted',
        'transition-colors hover:bg-surface-2 hover:text-content active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
        'disabled:opacity-40',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = 'IconButton';
