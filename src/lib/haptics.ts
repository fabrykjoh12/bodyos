/** Best-effort tactile feedback. No-ops where the Vibration API is absent. */
export function haptic(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* vibration is a nicety, never a failure */
  }
}

export const haptics = {
  tap: () => haptic(10),
  success: () => haptic([14, 40, 22]),
  warn: () => haptic([10, 30, 10]),
};
