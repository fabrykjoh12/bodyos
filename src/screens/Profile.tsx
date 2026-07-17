import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Cloud, Dumbbell, Flame, RefreshCw, Settings as SettingsIcon, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useSyncStore, type SyncStatus } from '@/store/cloudSync';
import { computeStreak } from '@/lib/date';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Stat } from '@/components/ui/Stat';

export function Profile() {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const sessions = useStore((s) => s.sessions);
  const prs = useStore((s) => s.personalRecords);
  const streakDates = useStore((s) => s.streakDates);

  const completed = sessions.filter((s) => s.status === 'completed').length;
  const streak = computeStreak(streakDates);
  const syncStatus = useSyncStore((s) => s.status);
  const syncEmail = useSyncStore((s) => s.email);

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        title="Profile"
        right={
          <button aria-label="Settings" onClick={() => navigate('/settings')} className="flex h-11 w-11 items-center justify-center rounded-xl text-content-muted hover:bg-surface-2">
            <SettingsIcon size={20} />
          </button>
        }
      />

      <div className="card-2 flex items-center gap-4 p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-2xl font-bold text-accent">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-bold text-content">{user.name}</p>
          <p className="text-sm capitalize text-content-muted">
            {user.experience} · {user.goal} · {user.daysPerWeek}×/week
          </p>
          {user.currentPhase && <p className="mt-1 text-xs text-accent">{user.currentPhase}</p>}
        </div>
      </div>

      {syncStatus !== 'unconfigured' && (
        <AccountCard email={syncEmail} status={syncStatus} onOpen={() => navigate('/settings')} />
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Workouts" value={completed} icon={<Dumbbell size={13} />} />
        <Stat label="Records" value={prs.filter((p) => p.type === 'weight').length} icon={<Trophy size={13} />} accent="caution" />
        <Stat label="Streak" value={streak} icon={<Flame size={13} />} accent={streak > 0 ? 'success' : 'default'} />
      </div>

      <div className="card divide-y divide-line">
        <Row icon={<BookOpen size={18} />} label="Exercise library" onClick={() => navigate('/exercises')} />
        <Row icon={<SettingsIcon size={18} />} label="Settings" onClick={() => navigate('/settings')} />
        <Row icon={<RefreshCw size={18} />} label="Redo onboarding" onClick={() => navigate('/onboarding')} />
      </div>

      <p className="px-1 text-xs text-content-faint">
        {syncEmail
          ? 'BodyOS · synced to your account. Progress photos stay on this device.'
          : 'BodyOS · your data lives privately on this device.'}
      </p>
    </div>
  );
}

/** Sign-in prompt when signed out; account + sync status when signed in.
 *  Both open Settings, where the full Account & Sync controls live. */
function AccountCard({ email, status, onOpen }: { email: string | null; status: SyncStatus; onOpen: () => void }) {
  if (email) {
    return (
      <button onClick={onOpen} className="card flex items-center gap-3 p-4 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <Cloud size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-content">{email}</p>
          <p className="text-xs text-content-muted">{syncLabel(status)}</p>
        </div>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor(status)}`} aria-hidden />
        <ChevronRight size={18} className="shrink-0 text-content-faint" />
      </button>
    );
  }
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 text-left"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-ink">
        <Cloud size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-content">Back up &amp; sync your training</p>
        <p className="text-xs text-content-muted">Create a free account to sync across devices</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-content-faint" />
    </button>
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

function syncLabel(status: SyncStatus): string {
  switch (status) {
    case 'syncing':
      return 'Syncing…';
    case 'error':
      return 'Sync error — tap to review';
    case 'synced':
      return 'Synced across your devices';
    default:
      return 'Signed in';
  }
}

function Row({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <span className="text-content-muted">{icon}</span>
      <span className="flex-1 text-sm text-content">{label}</span>
      <ChevronRight size={18} className="text-content-faint" />
    </button>
  );
}
