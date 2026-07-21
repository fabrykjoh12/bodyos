import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageRepository, profileStorageKey } from './repository';
import { useStore, switchActiveProfile } from './useStore';

/**
 * Account isolation: each profile (anonymous, uidA, uidB, …) owns a separate
 * localStorage namespace, and switching profiles must never leak, merge, or
 * carry data across the boundary.
 */

function wipeAllProfiles() {
  // Reset to the anonymous profile, then clear every namespace we may touch.
  switchActiveProfile(null);
  for (const uid of [null, 'uidA', 'uidB']) {
    new LocalStorageRepository(profileStorageKey(uid)).clear();
  }
  useStore.getState().resetAll();
}

describe('profileStorageKey', () => {
  it('gives every account its own namespace and keeps anonymous stable', () => {
    expect(profileStorageKey(null)).toBe('bodyos.appdata.v1');
    expect(profileStorageKey('abc')).toBe('bodyos.appdata.v1.u.abc');
    expect(profileStorageKey('abc')).not.toBe(profileStorageKey('xyz'));
  });
});

describe('switchActiveProfile — account isolation', () => {
  beforeEach(wipeAllProfiles);

  it('a new account starts empty even when the device has anonymous data', () => {
    useStore.getState().loadDemo(); // anonymous profile now has rich data
    expect(useStore.getState().sessions.length).toBeGreaterThan(0);

    switchActiveProfile('uidA');
    const s = useStore.getState();
    expect(s.sessions).toHaveLength(0);
    expect(s.templates).toHaveLength(0);
    expect(s.personalRecords).toHaveLength(0);
    expect(s.photos).toHaveLength(0);
    expect(s.user.onboarded).toBe(false);
  });

  it('anonymous data survives an account round-trip untouched', () => {
    useStore.getState().loadDemo();
    const anonSessions = useStore.getState().sessions.length;
    const anonUserId = useStore.getState().user.id;

    switchActiveProfile('uidA');
    useStore.getState().completeOnboarding({ name: 'Account A' });
    switchActiveProfile(null);

    const s = useStore.getState();
    expect(s.sessions.length).toBe(anonSessions);
    expect(s.user.id).toBe(anonUserId);
    expect(s.user.name).not.toBe('Account A');
  });

  it('account A and account B never see each other’s data', () => {
    switchActiveProfile('uidA');
    useStore.getState().completeOnboarding({ name: 'Alice' });
    useStore.getState().loadDemo(); // A's account now has data

    switchActiveProfile('uidB');
    expect(useStore.getState().sessions).toHaveLength(0);
    expect(useStore.getState().templates).toHaveLength(0);
    useStore.getState().completeOnboarding({ name: 'Bob' });

    switchActiveProfile('uidA');
    expect(useStore.getState().sessions.length).toBeGreaterThan(0);
    expect(useStore.getState().user.name).not.toBe('Bob');

    switchActiveProfile('uidB');
    expect(useStore.getState().user.name).toBe('Bob');
    expect(useStore.getState().sessions).toHaveLength(0);
  });

  it('photos never cross the account boundary', () => {
    useStore.getState().addPhoto({
      id: 'p1',
      takenAt: new Date().toISOString(),
      pose: 'front-relaxed',
      dataUrl: 'data:image/webp;base64,xxxx',
      weekLabel: 'Week 1',
    });
    expect(useStore.getState().photos).toHaveLength(1);

    switchActiveProfile('uidA');
    expect(useStore.getState().photos).toHaveLength(0);

    switchActiveProfile(null);
    expect(useStore.getState().photos).toHaveLength(1);
  });

  it('an active anonymous workout stays with the anonymous profile', () => {
    useStore.getState().loadDemo();
    const tpl = useStore.getState().templates[0]!;
    useStore.getState().startSession(tpl.id);
    expect(useStore.getState().activeSession).not.toBeNull();

    switchActiveProfile('uidA');
    expect(useStore.getState().activeSession).toBeNull();

    switchActiveProfile(null);
    expect(useStore.getState().activeSession).not.toBeNull();
    expect(useStore.getState().activeSession!.templateId).toBe(tpl.id);
  });

  it('writes while signed in land in the account namespace, not the anonymous one', () => {
    useStore.getState().loadDemo();
    const anonRaw = localStorage.getItem(profileStorageKey(null));

    switchActiveProfile('uidA');
    useStore.getState().completeOnboarding({ name: 'Alice' });

    // Anonymous namespace byte-identical; account namespace has Alice.
    expect(localStorage.getItem(profileStorageKey(null))).toBe(anonRaw);
    const aRaw = localStorage.getItem(profileStorageKey('uidA'));
    expect(aRaw).toContain('Alice');
    expect(anonRaw).not.toContain('Alice');
  });

  it('switching to the already-active profile is a no-op', () => {
    useStore.getState().loadDemo();
    const before = useStore.getState().sessions.length;
    switchActiveProfile(null);
    expect(useStore.getState().sessions.length).toBe(before);
  });
});
