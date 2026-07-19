import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  /** Final value to land on. */
  value: number;
  /** Milliseconds for the full count. */
  duration?: number;
  /** Delay before the count starts (lets staggered layouts settle). */
  delay?: number;
  /** Format the in-flight value for display. Defaults to rounding. */
  format?: (value: number) => string;
  className?: string;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Animated numeral that counts up to its value on mount — the "reward" beat
 * for stats. Respects prefers-reduced-motion by jumping straight to the end.
 */
export function CountUp({ value, duration = 900, delay = 0, format, className }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      setDisplay(value * easeOut(t));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf.current);
    };
  }, [value, duration, delay]);

  return <span className={`tnum ${className ?? ''}`}>{format ? format(display) : String(Math.round(display))}</span>;
}
