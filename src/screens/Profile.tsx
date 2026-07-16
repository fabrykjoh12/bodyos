import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Dumbbell, Flame, RefreshCw, Settings as SettingsIcon, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
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
        BodyOS · your data lives privately on this device.
      </p>
    </div>
  );
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
