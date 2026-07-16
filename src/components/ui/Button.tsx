import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  // Solid volt with near-black ink — the single primary action per screen.
  primary: 'bg-accent text-ink hover:bg-accent-strong active:bg-accent-strong',
  secondary: 'bg-surface-3 text-content hover:bg-line border border-line',
  ghost: 'bg-transparent text-content-muted hover:text-content hover:bg-surface-2',
  success: 'bg-success text-ink hover:brightness-110',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-4 text-sm rounded-xl gap-2',
  lg: 'h-13 px-5 text-base rounded-xl gap-2 min-h-[3.25rem]',
  xl: 'h-[3.25rem] px-6 text-base rounded-xl gap-2.5 font-bold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={[
        'inline-flex items-center justify-center font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-base',
        'disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
