import { useMemo, useState } from 'react';
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
  signInWithGoogle,
  anonymousDataSummary,
  importDeviceData,
  deleteAccount,
  type SyncStatus,
} from '@/store/cloudSync';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

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
  const [confirmImport, setConfirmImport] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteNote, setDeleteNote] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);

  const signedIn = email !== null;
  // What the device's anonymous profile holds — offered as an EXPLICIT import
  // only; account switches never merge data automatically.
  const anonData = useMemo(() => (signedIn ? anonymousDataSummary() : null), [signedIn]);

  if (status === 'unconfigured') return null;

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

  async function google() {
    setBusy(true);
    setMessage(null);
    setNotice(null);
    const { error } = await signInWithGoogle();
    if (error) setMessage(error);
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
      {anonData && (
        <div className="mt-1 rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-xs text-content-muted">
            This device also has local training data not linked to any account
            (<span className="tnum">{anonData.sessions}</span> sessions,{' '}
            <span className="tnum">{anonData.templates}</span> workouts).
          </p>
          {importNote && <p className="mt-1.5 text-xs text-content-faint">{importNote}</p>}
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => setConfirmImport(true)}>
            Import it into this account
          </Button>
        </div>
      )}
      <button
        onClick={() => {
          setDeleteNote(null);
          setDeletePassword('');
          setNeedsPassword(false);
          setDeleteOpen(true);
        }}
        className="self-start text-xs font-medium text-danger/70 hover:text-danger"
      >
        Delete account &amp; cloud data…
      </button>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this account?">
        <p className="text-sm text-content-muted">
          This permanently deletes the cloud copy of your training data <em>and</em> the account itself
          ({email}). This device&rsquo;s local-only data is not touched. This cannot be undone —
          export a backup first if you want to keep your log.
        </p>
        {needsPassword && (
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Confirm your password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className={`${inputClass} mt-4`}
          />
        )}
        {deleteNote && <p className="mt-3 text-xs text-danger">{deleteNote}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="danger"
            fullWidth
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setDeleteNote(null);
              const result = await deleteAccount(deletePassword || undefined);
              setBusy(false);
              if (result.ok) {
                setDeleteOpen(false);
                return; // auth listener switches to the anonymous profile
              }
              setNeedsPassword(result.requiresRecentLogin);
              setDeleteNote(
                result.cloudDeleted
                  ? `Cloud data was deleted, but the account itself remains: ${result.error}`
                  : result.error,
              );
            }}
          >
            {busy ? 'Deleting…' : 'Permanently delete account'}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setDeleteOpen(false)}>Cancel</Button>
        </div>
      </Sheet>

      <Sheet open={confirmImport} onClose={() => setConfirmImport(false)} title="Import this device's data?">
        <p className="text-sm text-content-muted">
          This copies the device&rsquo;s local training data ({anonData?.sessions ?? 0} sessions,{' '}
          {anonData?.templates ?? 0} workouts) into <span className="font-semibold text-content">{email}</span>,{' '}
          <span className="font-semibold text-content">replacing</span> what the account currently holds, and syncs it
          to the cloud. The device copy is kept.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            fullWidth
            onClick={async () => {
              setConfirmImport(false);
              const { error } = await importDeviceData();
              setImportNote(error ?? 'Imported and synced.');
            }}
          >
            Import &amp; replace
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmImport(false)}>Cancel</Button>
        </div>
      </Sheet>
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
      <button
        type="button"
        onClick={() => void google()}
        disabled={busy}
        className="flex items-center justify-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm font-semibold text-content transition-colors hover:bg-surface-3 disabled:opacity-60"
      >
        <GoogleIcon /> Continue with Google
      </button>
      <div className="flex items-center gap-3 text-[11px] font-medium text-content-faint">
        <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
      </div>
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

/** Google 'G' mark (inline so it needs no asset / network request). */
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c11 0 19.5-8 19.5-19.5 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5.5 0 10.3-1.9 13.8-5.1l-6.4-5.4C29.4 34.6 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39 16.2 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.4 5.4C39.9 42.1 43.5 34.5 43.5 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
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
