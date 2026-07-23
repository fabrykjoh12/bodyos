import type { PersonalRecord, Unit, WorkoutSession } from '@/types';
import { exerciseName } from '@/data/exercises';
import { formatMinutes, formatVolume, formatWeight } from '@/lib/format';
import { sessionSetCount, sessionTotalVolume } from '@/lib/prstats';

/** Everything the card needs, precomputed — pure and testable. */
export interface ShareModel {
  title: string;
  dateLine: string;
  isDeload: boolean;
  volumeText: string;
  sets: number;
  durationText: string;
  exercises: number;
  /** "Bench Press · 80 kg × 6" per PR set this session. */
  prLines: string[];
}

export function buildShareModel(
  session: WorkoutSession,
  prs: PersonalRecord[],
  unit: Unit,
): ShareModel {
  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.completedAt ?? session.startedAt).getTime();
  const minutes = Math.max(1, Math.round((end - start) / 60000));
  const date = new Date(session.completedAt ?? session.startedAt);
  return {
    title: session.name,
    dateLine: date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    isDeload: Boolean(session.isDeload),
    volumeText: formatVolume(sessionTotalVolume(session), unit),
    sets: sessionSetCount(session),
    durationText: formatMinutes(minutes),
    exercises: session.exercises.filter((e) => e.sets.some((s) => s.completed && !s.isWarmup))
      .length,
    prLines: prs.map((pr) =>
      pr.type === 'weight'
        ? `${exerciseName(pr.exerciseId)} · ${formatWeight(pr.value, unit)} × ${pr.reps}`
        : `${exerciseName(pr.exerciseId)} · ${formatWeight(pr.value, unit)} est. 1RM`,
    ),
  };
}

// ---------------------------------------------------------------------------
// Canvas rendering (1080×1350, 4:5) — brand-locked to the design tokens.

const W = 1080;
const H = 1350;
const VOLT = '#CDFB45';
const BASE = '#0B0D11';
const MUTED = '#9AA3AF';
const FAINT = '#5E6773';
const SANS = '"Archivo Variable", "Archivo", system-ui, sans-serif';
const MONO = '"Geist Mono Variable", "Geist Mono", ui-monospace, monospace';

export function renderShareCard(model: ShareModel): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Graphite base + faint volt aurora, same light model as the app.
  ctx.fillStyle = BASE;
  ctx.fillRect(0, 0, W, H);
  const aurora = ctx.createRadialGradient(W * 0.85, -80, 0, W * 0.85, -80, W * 0.9);
  aurora.addColorStop(0, 'rgba(205,251,69,0.14)');
  aurora.addColorStop(1, 'rgba(205,251,69,0)');
  ctx.fillStyle = aurora;
  ctx.fillRect(0, 0, W, H);

  const M = 84; // outer margin
  let y = 150;

  // Eyebrow
  ctx.fillStyle = VOLT;
  ctx.font = `600 30px ${SANS}`;
  drawTracked(ctx, model.isDeload ? 'BODYOS · DELOAD DONE' : 'BODYOS · SESSION COMPLETE', M, y, 7);

  // Title (wraps to at most two lines)
  y += 96;
  ctx.fillStyle = '#F5F7F9';
  ctx.font = `750 108px ${SANS}`;
  y = wrapText(ctx, model.title, M, y, W - 2 * M, 112, 2);

  ctx.fillStyle = MUTED;
  ctx.font = `500 40px ${SANS}`;
  y += 64;
  ctx.fillText(model.dateLine, M, y);

  // Volume — the headline number
  y += 170;
  ctx.fillStyle = FAINT;
  ctx.font = `600 28px ${SANS}`;
  drawTracked(ctx, 'TOTAL VOLUME', M, y, 6);
  y += 128;
  ctx.fillStyle = VOLT;
  ctx.font = `700 150px ${MONO}`;
  ctx.fillText(model.volumeText, M - 6, y);

  // Stat row
  y += 130;
  const stats: Array<[string, string]> = [
    [String(model.sets), 'SETS'],
    [model.durationText, 'DURATION'],
    [String(model.exercises), 'EXERCISES'],
  ];
  const colW = (W - 2 * M) / stats.length;
  stats.forEach(([value, label], i) => {
    const x = M + i * colW;
    ctx.fillStyle = '#F5F7F9';
    ctx.font = `600 72px ${MONO}`;
    ctx.fillText(value, x, y);
    ctx.fillStyle = FAINT;
    ctx.font = `600 26px ${SANS}`;
    drawTracked(ctx, label, x, y + 52, 5);
  });

  // PRs
  if (model.prLines.length > 0) {
    y += 190;
    ctx.fillStyle = VOLT;
    ctx.font = `600 28px ${SANS}`;
    drawTracked(
      ctx,
      `${model.prLines.length} PERSONAL RECORD${model.prLines.length > 1 ? 'S' : ''}`,
      M,
      y,
      6,
    );
    ctx.font = `500 40px ${SANS}`;
    for (const line of model.prLines.slice(0, 4)) {
      y += 68;
      ctx.fillStyle = VOLT;
      ctx.fillText('▲', M, y);
      ctx.fillStyle = '#F5F7F9';
      ctx.fillText(line, M + 56, y);
    }
    if (model.prLines.length > 4) {
      y += 60;
      ctx.fillStyle = MUTED;
      ctx.fillText(`+ ${model.prLines.length - 4} more`, M + 56, y);
    }
  }

  // Footer
  ctx.fillStyle = FAINT;
  ctx.font = `600 28px ${SANS}`;
  drawTracked(ctx, 'BODYOS — KNOW EXACTLY WHAT TO BEAT', M, H - 96, 6);

  return canvas;
}

/** Manual letter-spacing (canvas has no tracking control across browsers). */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

/** Word-wrap up to maxLines (ellipsis on overflow); returns the last baseline y. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/);
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const attempt = line ? `${line} ${words[i]}` : words[i]!;
    if (ctx.measureText(attempt).width > maxWidth && line) {
      if (lines === maxLines - 1) {
        ctx.fillText(line.replace(/.{2}$/, '…'), x, y);
        return y;
      }
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = words[i]!;
    } else {
      line = attempt;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y;
}

// ---------------------------------------------------------------------------

/**
 * Render + hand the card to the OS share sheet; falls back to a PNG download
 * where file-sharing isn't available. Returns how it was delivered.
 */
export async function shareSessionCard(
  session: WorkoutSession,
  prs: PersonalRecord[],
  unit: Unit,
): Promise<'shared' | 'downloaded' | 'failed'> {
  const canvas = renderShareCard(buildShareModel(session, prs, unit));
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return 'failed';

  const file = new File([blob], `bodyos-${session.name.toLowerCase().replace(/\s+/g, '-')}.png`, {
    type: 'image/png',
  });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch {
      // User cancelled the sheet — treat as done, don't force a download.
      return 'shared';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
