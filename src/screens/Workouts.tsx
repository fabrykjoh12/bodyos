import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Dumbbell, Moon, Plus, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { weekdayName, todayWeekday } from '@/lib/date';
import { resolveTodayPlan, weekdayLabel } from '@/lib/plan';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sheet } from '@/components/ui/Sheet';

export function Workouts() {
  const navigate = useNavigate();
  const allTemplates = useStore((s) => s.templates);
  const templates = useMemo(() => allTemplates.filter((t) => !t.archived), [allTemplates]);
  const weeklyPlan = useStore((s) => s.weeklyPlan);
  const setPlanForDay = useStore((s) => s.setPlanForDay);
  const today = todayWeekday();

  // Which weekday the schedule picker is open for (null = closed).
  const [editDay, setEditDay] = useState<number | null>(null);
  const editPlanId = editDay !== null ? (weeklyPlan[editDay] ?? null) : null;

  // Honest "today" line, sharing the home hero's plan resolver.
  const plan = useMemo(
    () => resolveTodayPlan(weeklyPlan, templates, today),
    [weeklyPlan, templates, today],
  );
  const todayLine =
    plan.kind === 'today' ? (
      <>
        Today · <span className="font-semibold text-accent">{plan.template.name}</span>
      </>
    ) : plan.kind === 'rest' ? (
      <>
        Today · <span className="font-semibold text-content">Rest day</span>
        {plan.next && <> · next {plan.next.template.name}</>}
      </>
    ) : plan.kind === 'next' ? (
      <>
        Nothing today · Next up {weekdayLabel(plan.weekday, today)} ·{' '}
        <span className="font-semibold text-accent">{plan.template.name}</span>
      </>
    ) : null;

  function assign(templateId: string | null) {
    if (editDay !== null) setPlanForDay(editDay, templateId);
    setEditDay(null);
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <ScreenHeader
        title="Workouts"
        subtitle="Your templates & weekly plan"
        right={
          <IconButton label="New workout" onClick={() => navigate('/workouts/new')}>
            <Plus size={22} />
          </IconButton>
        }
      />

      {/* Weekly plan strip — tap a day to schedule */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="label-tiny">This week</h3>
          <span className="text-[0.65rem] text-content-faint">Tap a day to plan</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, day) => {
            const tplId = weeklyPlan[day];
            const tpl = tplId ? templates.find((t) => t.id === tplId) : null;
            const isToday = day === today;
            return (
              <button
                key={day}
                onClick={() => setEditDay(day)}
                className="flex flex-col items-center gap-1"
                aria-label={`Plan ${weekdayName(day)} — ${tpl?.name ?? 'Rest'}`}
              >
                <span
                  className={`text-[0.6rem] font-medium ${isToday ? 'text-accent' : 'text-content-faint'}`}
                >
                  {weekdayName(day).slice(0, 1)}
                </span>
                <div
                  className={[
                    'flex h-10 w-full items-center justify-center rounded-lg px-0.5 text-center text-[0.6rem] font-bold transition-colors',
                    tpl
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface-2 text-content-faint hover:bg-surface-3',
                    isToday ? 'ring-1 ring-accent' : '',
                  ].join(' ')}
                  title={tpl?.name ?? 'Rest'}
                >
                  {tpl ? tpl.name.slice(0, 4) : '·'}
                </div>
              </button>
            );
          })}
        </div>
        {todayLine && (
          <p className="mt-3 border-t border-line/60 pt-3 text-xs text-content-muted">
            {todayLine}
          </p>
        )}
      </section>

      {/* Create — the two ways in, side by side */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => navigate('/workouts/routines')}
          className="card flex flex-col gap-2.5 p-4 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Sparkles size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-content">Proven split</p>
            <p className="mt-0.5 text-xs leading-snug text-content-muted">
              Built &amp; scheduled in one tap
            </p>
          </div>
        </button>
        <button
          onClick={() => navigate('/workouts/new')}
          className="card flex flex-col gap-2.5 p-4 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-content">
            <Plus size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-content">Build your own</p>
            <p className="mt-0.5 text-xs leading-snug text-content-muted">Custom day in a minute</p>
          </div>
        </button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={24} />}
          title="No workouts yet"
          description="Pick a starter routine above, or build your own from scratch."
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
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-content-muted">
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

      <Sheet
        open={editDay !== null}
        onClose={() => setEditDay(null)}
        title={editDay !== null ? `Plan ${weekdayName(editDay)}` : ''}
      >
        <div className="flex flex-col gap-1.5">
          {templates.map((tpl) => {
            const selected = tpl.id === editPlanId;
            return (
              <button
                key={tpl.id}
                onClick={() => assign(tpl.id)}
                className={[
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                  selected ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2',
                ].join(' ')}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-accent">
                  <Dumbbell size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-content">{tpl.name}</p>
                  <p className="truncate text-xs text-content-muted">{tpl.focus}</p>
                </div>
                {selected && <Check size={18} className="text-accent" />}
              </button>
            );
          })}
          <button
            onClick={() => assign(null)}
            className={[
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
              editPlanId === null
                ? 'border-accent bg-accent-soft'
                : 'border-line hover:bg-surface-2',
            ].join(' ')}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-content-muted">
              <Moon size={16} />
            </span>
            <span className="flex-1 text-sm font-semibold text-content">Rest day</span>
            {editPlanId === null && <Check size={18} className="text-accent" />}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
