import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import {
  useSyncStore,
  signIn,
  signUp,
  signOut,
  syncNow,
  type SyncStatus,
} from '@/store/cloudSync';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

export function Settings() {
  const navigate = useNavigate();
  const settings = useStore((s) => s.user.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const exportData = useStore((s) => s.exportData);
  const [confirmReset, setConfirmReset] = useState(false);

  function exportBackup() {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bodyos-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Settings" back="/profile" />

      <CloudSync />

      <Group title="Units">
        <SegmentedControl
          ariaLabel="Weight unit"
          value={settings.unit}
          onChange={(unit) => updateSettings({ unit })}
          options={[
            { value: 'kg', label: 'Kilograms' },
            { value: 'lb', label: 'Pounds' },
          ]}
        />
      </Group>

      <Group title="Workout">
        <Toggle
          label="Auto-start rest timer"
          hint="Start the timer automatically after each logged set"
          checked={settings.restTimerAutoStart}
          onChange={(v) => updateSettings({ restTimerAutoStart: v })}
        />
        <Row label="Default rest">
          <NumberStep value={settings.defaultRestSec} step={15} min={30} max={300} suffix="s" onChange={(v) => updateSettings({ defaultRestSec: v })} />
        </Row>
        <Toggle
          label="Show RIR / RPE"
          hint="Advanced: log reps-in-reserve for finer progression"
          checked={settings.showRir}
          onChange={(v) => updateSettings({ showRir: v })}
        />
      </Group>

      <Group title="Feedback">
        <Toggle label="Haptic feedback" checked={settings.hapticFeedback} onChange={(v) => updateSettings({ hapticFeedback: v })} />
        <Toggle
          label="Rest timer sound"
          hint="Play a chime when the rest timer finishes"
          checked={settings.restAlertSound !== false}
          onChange={(v) => updateSettings({ restAlertSound: v })}
        />
        <Toggle label="Reduce motion" hint="Minimize animations" checked={settings.reducedMotion} onChange={(v) => updateSettings({ reducedMotion: v })} />
      </Group>

      <Group title="Data">
        <button onClick={exportBackup} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
          <div className="min-w-0">
            <p className="text-sm text-content">Export data</p>
            <p className="text-xs text-content-faint">Download a JSON backup of your workouts, history &amp; settings</p>
          </div>
          <Download size={18} className="shrink-0 text-content-faint" />
        </button>
      </Group>

      <button onClick={() => setConfirmReset(true)} className="mt-2 text-sm font-medium text-danger/80 hover:text-danger">
        Reset all data
      </button>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?">
        <p className="text-sm text-content-muted">
          This erases your workouts, history, records, and photos, and restores the demo data. This cannot be undone.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="danger" fullWidth onClick={() => { resetAll(); navigate('/', { replace: true }); }}>
            Reset everything
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmReset(false)}>Cancel</Button>
        </div>
      </Sheet>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-line bg-surface-3 px-3 py-2.5 text-sm text-content placeholder:text-content-faint focus:border-accent focus:outline-none';

function CloudSync() {
  const status = useSyncStore((s) => s.status);
  const email = useSyncStore((s) => s.email);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const syncError = useSyncStore((s) => s.error);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Cloud sync isn't compiled in — hide the section entirely.
  if (status === 'unconfigured') return null;

  const signedIn = email !== null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(emailInput.trim(), password);
        if (error) setMessage(error);
      } else {
        const { error, needsConfirmation } = await signUp(emailInput.trim(), password);
        if (error) setMessage(error);
        else if (needsConfirmation) {
          setMessage('Account created — check your email to confirm, then sign in.');
          setMode('signin');
        }
      }
    } finally {
      setBusy(false);
      setPassword('');
    }
  }

  return (
    <section>
      <h3 className="label-tiny mb-2">Account &amp; Sync</h3>
      <div className="card p-4">
        {signedIn ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-content">{email}</p>
                <p className="text-xs text-content-faint">{syncLabel(status, lastSyncedAt, syncError)}</p>
              </div>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor(status)}`} aria-hidden />
            </div>
            <p className="text-xs text-content-faint">
              Workouts, templates, records, and settings sync across your devices. Progress photos stay on this device.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => void syncNow()} disabled={status === 'syncing'}>
                {status === 'syncing' ? 'Syncing…' : 'Sync now'}
              </Button>
              <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <p className="text-xs text-content-faint">
              Sign in to back up your training and sync it across devices. The app works fully offline without an account.
            </p>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            {message && <p className="text-xs text-danger">{message}</p>}
            <Button type="submit" fullWidth disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
            <button
              type="button"
              className="text-xs text-content-muted hover:text-content"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setMessage(null);
              }}
            >
              {mode === 'signin' ? 'No account? Create one' : 'Have an account? Sign in'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function dotColor(status: SyncStatus): string {
  switch (status) {
    case 'synced':
      return 'bg-accent';
    case 'syncing':
      return 'bg-ice animate-pulse';
    case 'error':
      return 'bg-danger';
    default:
      return 'bg-surface-3';
  }
}

function syncLabel(status: SyncStatus, lastSyncedAt: number | null, error: string | null): string {
  switch (status) {
    case 'syncing':
      return 'Syncing…';
    case 'error':
      return error ? `Sync error: ${error}` : 'Sync error';
    case 'synced':
      return lastSyncedAt
        ? `Synced at ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Synced';
    default:
      return 'Signed in';
  }
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="label-tiny mb-2">{title}</h3>
      <div className="card divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-content">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm text-content">{label}</p>
        {hint && <p className="text-xs text-content-faint">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface-3'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

function NumberStep({ value, onChange, min, max, step, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <button aria-label="decrease" onClick={() => onChange(Math.max(min, value - step))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-content-muted">−</button>
      <span className="tnum w-12 text-center text-sm font-semibold text-content">{value}{suffix}</span>
      <button aria-label="increase" onClick={() => onChange(Math.min(max, value + step))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-content-muted">+</button>
    </div>
  );
}
