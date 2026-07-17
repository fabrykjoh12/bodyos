// Tiny Web Audio helper for the rest-timer alert. No audio assets, and a
// no-op where Web Audio is unavailable.

type ACtor = typeof AudioContext;
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    const AC: ACtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext;
    if (!AC) return null;
    ctx = ctx ?? new AC();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Prime the audio context from a user gesture (e.g. tapping "Log Set") so the
 * later rest-end chime is allowed to play — mobile browsers block audio that
 * isn't unlocked by an interaction.
 */
export function unlockAudio(): void {
  const c = context();
  if (c && c.state === 'suspended') void c.resume();
}

/** A short two-tone rest-complete chime. */
export function playChime(): void {
  const c = context();
  if (!c) return;
  try {
    if (c.state === 'suspended') void c.resume();
    const t0 = c.currentTime;
    [880, 1320].forEach((freq, i) => {
      const start = t0 + i * 0.14;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.14);
    });
  } catch {
    /* audio is a nicety, never a failure */
  }
}
