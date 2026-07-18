import { useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import {
  useSyncStore,
  signIn,
  signUp,
  signOut,
  syncNow,
  resendConfirmation,
  resetPassword,
  type SyncStatus,
} from '@/store/cloudSync';
import { Button } from '@/components/ui/Button';

const inputClass =
  'w-full rounded-lg border border-line bg-surface-3 px-3 py-2.5 text-sm text-content placeholder:text-content-faint focus:border-accent focus:outline-none';

/**
 * The Account & Sync panel — sign in / create account, session status, and a
 * confirmation-email recovery flow. Rendered both in Settings and on its own
 * `/account` screen. Hides itself when cloud sync isn't configured.
 */
export function CloudSync({ heading = true }: { heading?: boolean }) {
  const status = useSyncStore((s) => s.status);
  const email = useSyncStore((s) => s.email);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const syncError = useSyncStore((s) => s.error);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Set once a sign-up needs email confirmation — switches to the pending panel.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState<string | null>(null);

  if (status === 'unconfigured') return null;

  const signedIn = email !== null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setNotice(null);
    const address = emailInput.trim();
    try {
      if (mode === 'signin') {
        const { error } = await signIn(address, password);
        if (error) setMessage(error);
      } else {
        const { error, needsConfirmation } = await signUp(address, password);
        if (error) setMessage(error);
        else if (needsConfirmation) setPendingEmail(address);
        // If no confirmation is required, the auth listener signs us straight in.
      }
    } finally {
      setBusy(false);
      setPassword('');
    }
  }

  async function resend() {
    if (!pendingEmail) return;
    setBusy(true);
    setResendNote(null);
    const { error } = await resendConfirmation(pendingEmail);
    setResendNote(error ? error : 'Sent again — check your inbox and spam folder.');
    setBusy(false);
  }

  async function forgotPassword() {
    const address = emailInput.trim();
    if (!address) {
      setMessage('Enter your email above first, then tap “Forgot password?”.');
      return;
    }
    setBusy(true);
    setMessage(null);
    setNotice(null);
    const { error } = await resetPassword(address);
    if (error) setMessage(error);
    else setNotice(`Password-reset email sent to ${address}. Check your inbox.`);
    setBusy(false);
  }

  const body = signedIn ? (
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
  ) : pendingEmail ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-accent">
        <MailCheck size={18} />
        <span className="text-sm font-semibold">Confirm your email</span>
      </div>
      <p className="text-xs text-content-muted">
        We sent a confirmation link to <span className="font-semibold text-content">{pendingEmail}</span>. Open it, then
        sign in. Check your spam folder — the confirmation email can take a few minutes.
      </p>
      {resendNote && <p className="text-xs text-content-faint">{resendNote}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => void resend()} disabled={busy}>
          {busy ? 'Sending…' : 'Resend email'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setPendingEmail(null);
            setMode('signin');
            setEmailInput(pendingEmail);
            setResendNote(null);
          }}
        >
          I&rsquo;ve confirmed
        </Button>
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
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          minLength={6}
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-content-faint hover:text-content"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {message && <p className="text-xs text-danger">{message}</p>}
      {notice && <p className="text-xs text-content-faint">{notice}</p>}
      <Button type="submit" fullWidth disabled={busy}>
        {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </Button>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-xs text-content-muted hover:text-content"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setMessage(null);
            setNotice(null);
          }}
        >
          {mode === 'signin' ? 'No account? Create one' : 'Have an account? Sign in'}
        </button>
        {mode === 'signin' && (
          <button
            type="button"
            className="text-xs text-content-muted hover:text-content"
            onClick={() => void forgotPassword()}
            disabled={busy}
          >
            Forgot password?
          </button>
        )}
      </div>
    </form>
  );

  return (
    <section>
      {heading && <h3 className="label-tiny mb-2">Account &amp; Sync</h3>}
      <div className="card p-4">{body}</div>
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
