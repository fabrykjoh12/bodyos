import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { weekdayName, todayWeekday } from '@/lib/date';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { EmptyState } from '@/components/ui/EmptyState';

export function Workouts() {
  const navigate = useNavigate();
  const allTemplates = useStore((s) => s.templates);
  const templates = useMemo(() => allTemplates.filter((t) => !t.archived), [allTemplates]);
  const weeklyPlan = useStore((s) => s.weeklyPlan);
  const today = todayWeekday();

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        title="Workouts"
        subtitle="Your templates & weekly plan"
        right={
          <IconButton label="New workout" onClick={() => navigate('/workouts/new')}>
            <Plus size={22} />
          </IconButton>
        }
      />

      {/* Weekly plan strip */}
      <section className="card p-4">
        <h3 className="label-tiny mb-3">This week</h3>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, day) => {
            const tplId = weeklyPlan[day];
            const tpl = tplId ? templates.find((t) => t.id === tplId) : null;
            const isToday = day === today;
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <span className={`text-[0.6rem] font-medium ${isToday ? 'text-accent' : 'text-content-faint'}`}>
                  {weekdayName(day).slice(0, 1)}
                </span>
                <div
                  className={[
                    'flex h-10 w-full items-center justify-center rounded-lg text-[0.6rem] font-bold',
                    tpl ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-content-faint',
                    isToday ? 'ring-1 ring-accent' : '',
                  ].join(' ')}
                  title={tpl?.name ?? 'Rest'}
                >
                  {tpl ? tpl.name.slice(0, 4) : '·'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {templates.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={24} />}
          title="No workouts yet"
          description="Create your first workout template to start training with progression."
          action={<Button onClick={() => navigate('/workouts/new')}>Create a workout</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => navigate(`/workouts/${tpl.id}`)}
              className="card flex items-center gap-3 p-4 text-left transition-colors hover:border-line-strong"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-accent">
                <Dumbbell size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-content">{tpl.name}</p>
                <p className="truncate text-xs text-content-muted">{tpl.focus}</p>
              </div>
              <span className="text-xs text-content-faint">{tpl.exercises.length} ex</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
