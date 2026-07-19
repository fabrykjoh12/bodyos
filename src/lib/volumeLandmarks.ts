import type { MuscleGroup } from '@/types';

// ---------------------------------------------------------------------------
// Weekly volume landmarks (working sets per muscle per week), approximated from
// the widely-cited Renaissance Periodization ranges:
//   • MEV — Minimum Effective Volume (below this, little growth stimulus)
//   • MAV — top of the Maximum Adaptive Volume band (the productive ceiling)
//   • MRV — Maximum Recoverable Volume (beyond this, you dig a fatigue hole)
// These are starting-point heuristics, not medical advice — individuals vary.
// ---------------------------------------------------------------------------

export interface Landmark {
  mev: number;
  mav: number;
  mrv: number;
}

export const MUSCLE_LANDMARKS: Record<MuscleGroup, Landmark> = {
  chest: { mev: 10, mav: 20, mrv: 22 },
  back: { mev: 10, mav: 22, mrv: 25 },
  shoulders: { mev: 8, mav: 20, mrv: 26 },
  biceps: { mev: 8, mav: 20, mrv: 26 },
  triceps: { mev: 6, mav: 14, mrv: 18 },
  quads: { mev: 8, mav: 18, mrv: 20 },
  hamstrings: { mev: 6, mav: 16, mrv: 20 },
  glutes: { mev: 4, mav: 12, mrv: 16 },
  calves: { mev: 8, mav: 16, mrv: 20 },
  core: { mev: 6, mav: 16, mrv: 25 },
  forearms: { mev: 2, mav: 12, mrv: 16 },
};

export type VolumeStatus = 'low' | 'optimal' | 'high' | 'over';

export interface VolumeAssessment {
  status: VolumeStatus;
  /** Short human label, e.g. "In the growth range". */
  label: string;
  landmark: Landmark;
}

/** Classify a week's working-set count for a muscle against its landmarks. */
export function classifyWeeklyVolume(sets: number, muscle: MuscleGroup): VolumeAssessment {
  const landmark = MUSCLE_LANDMARKS[muscle];
  const { mev, mav, mrv } = landmark;
  let status: VolumeStatus;
  let label: string;
  if (sets < mev) {
    status = 'low';
    label = 'Below the growth range';
  } else if (sets <= mav) {
    status = 'optimal';
    label = 'In the growth range';
  } else if (sets <= mrv) {
    status = 'high';
    label = 'Near your recoverable max';
  } else {
    status = 'over';
    label = 'Over recoverable volume';
  }
  return { status, label, landmark };
}
