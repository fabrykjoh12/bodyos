import { describe, expect, it } from 'vitest';
import { describeSet, metricOf, repsLabel, repsStep, repsUnit, weightLabel } from './metrics';
import { recommendProgression } from './progression';
import { EXERCISES } from '@/data/exercises';

describe('exercise metrics', () => {
  it('classifies the library correctly', () => {
    expect(metricOf('plank')).toBe('duration');
    expect(metricOf('pull-up')).toBe('bodyweight-reps');
    expect(metricOf('bench-press')).toBe('load-reps');
    // Every declared metric is a valid value.
    for (const ex of EXERCISES) {
      expect(['load-reps', 'bodyweight-reps', 'duration', undefined]).toContain(ex.metric);
    }
  });

  it('describes sets honestly per metric', () => {
    expect(describeSet('load-reps', 60, 8, 'kg')).toBe('60 kg × 8');
    expect(describeSet('bodyweight-reps', 0, 12, 'kg')).toBe('BW × 12');
    expect(describeSet('bodyweight-reps', 10, 8, 'kg')).toBe('BW +10 kg × 8');
    expect(describeSet('duration', 0, 45, 'kg')).toBe('45 s');
  });

  it('labels and steps adapt to the metric', () => {
    expect(weightLabel('duration')).toBeNull();
    expect(weightLabel('bodyweight-reps')).toBe('Added weight');
    expect(repsLabel('duration')).toBe('Seconds');
    expect(repsUnit('duration')).toBe('s');
    expect(repsStep('duration')).toBe(5);
    expect(repsStep('load-reps')).toBe(1);
  });
});

describe('duration progression never mentions load', () => {
  const base = {
    exerciseId: 'plank',
    repRange: [30, 60] as [number, number],
    incrementKg: 0,
    kind: 'isolation' as const,
    metric: 'duration' as const,
  };

  it('extends the hold when every set reaches the top', () => {
    const rec = recommendProgression({
      ...base,
      workingSets: [
        { weightKg: 0, reps: 60 },
        { weightKg: 0, reps: 65 },
      ],
    });
    expect(rec.targetMet).toBe(true);
    expect(rec.reason).toContain('s');
    expect(rec.reason).not.toMatch(/kg/);
  });

  it('keeps building when inside the window', () => {
    const rec = recommendProgression({ ...base, workingSets: [{ weightKg: 0, reps: 40 }] });
    expect(rec.action).toBe('add-reps');
    expect(rec.reason).not.toMatch(/kg/);
  });

  it('says rebuild when below the bottom', () => {
    const rec = recommendProgression({ ...base, workingSets: [{ weightKg: 0, reps: 20 }] });
    expect(rec.action).toBe('maintain');
    expect(rec.reason).toContain('30 s');
    expect(rec.reason).not.toMatch(/kg/);
  });
});
