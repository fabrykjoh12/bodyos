import { beforeEach, describe, expect, it } from 'vitest';
import {
  parseBackup,
  savePreRestoreSnapshot,
  loadPreRestoreSnapshot,
  clearPreRestoreSnapshot,
} from './repository';
import { createSeedData } from '@/data/seed';

describe('parseBackup — deep validation', () => {
  it('round-trips a real export', () => {
    const data = createSeedData();
    const result = parseBackup(JSON.stringify(data));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.sessions.length).toBe(data.sessions.length);
      expect(result.data.templates.length).toBe(data.templates.length);
    }
  });

  it('rejects a session with a corrupted nested set and names the location', () => {
    const data = createSeedData();
    (data.sessions[0]!.exercises[0]!.sets[1] as unknown as { weightKg: unknown }).weightKg =
      'heavy';
    const result = parseBackup(JSON.stringify(data));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sessions[0].exercises[0].sets[1].weightKg');
  });

  it('rejects NaN and negative loads smuggled into sets', () => {
    const data = createSeedData();
    (data.sessions[2]!.exercises[1]!.sets[0] as unknown as { weightKg: unknown }).weightKg = -5;
    expect(parseBackup(JSON.stringify(data)).ok).toBe(false);
  });

  it('rejects unparseable timestamps', () => {
    const data = createSeedData();
    (data.sessions[0] as unknown as { startedAt: unknown }).startedAt = 'not-a-date';
    const result = parseBackup(JSON.stringify(data));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sessions[0].startedAt');
  });

  it('rejects an invalid unit', () => {
    const data = createSeedData();
    (data.user.settings as unknown as { unit: unknown }).unit = 'stone';
    expect(parseBackup(JSON.stringify(data)).ok).toBe(false);
  });

  it('rejects a template whose exercise entries are malformed', () => {
    const data = createSeedData();
    (data.templates[0]!.exercises[0] as unknown as { exerciseId: unknown }).exerciseId = 42;
    const result = parseBackup(JSON.stringify(data));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('templates[0].exercises[0]');
  });

  it('rejects a schema version from the future', () => {
    const data = { ...createSeedData(), version: 99 };
    expect(parseBackup(JSON.stringify(data)).ok).toBe(false);
  });

  it('rejects top-level arrays and hostile primitives', () => {
    expect(parseBackup('[]').ok).toBe(false);
    expect(parseBackup('"hi"').ok).toBe(false);
    expect(parseBackup('42').ok).toBe(false);
    expect(
      parseBackup(JSON.stringify({ version: 1, user: 'nope', templates: [], sessions: [] })).ok,
    ).toBe(false);
  });

  it('rejects absurdly large payloads without parsing them', () => {
    const huge = '{"version":1,"pad":"' + 'x'.repeat(26 * 1024 * 1024) + '"}';
    expect(parseBackup(huge).ok).toBe(false);
  });

  it('tolerates unknown extra fields (forward compatibility)', () => {
    const data = { ...createSeedData(), futureFeature: { enabled: true } };
    expect(parseBackup(JSON.stringify(data)).ok).toBe(true);
  });
});

describe('pre-restore snapshot', () => {
  beforeEach(() => clearPreRestoreSnapshot());

  it('round-trips the snapshot with its timestamp', () => {
    const data = createSeedData();
    expect(savePreRestoreSnapshot(data)).toBe(true);
    const snap = loadPreRestoreSnapshot();
    expect(snap).not.toBeNull();
    expect(snap!.data.sessions.length).toBe(data.sessions.length);
    expect(Number.isNaN(Date.parse(snap!.savedAt))).toBe(false);
    clearPreRestoreSnapshot();
    expect(loadPreRestoreSnapshot()).toBeNull();
  });
});
