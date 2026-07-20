import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Dumbbell } from 'lucide-react';
import type { Equipment, ExperienceLevel, TrainingGoal, Unit } from '@/types';
import { useStore } from '@/store/useStore';
import { ROUTINES } from '@/data/routines';
import { Button } from '@/components/ui/Button';

/** Suggest a starter split from how many days a week they can train. */
function suggestedRoutine(days: number): string {
  if (days <= 3) return 'full-body-3';
  if (days <= 5) return 'upper-lower-4';
  return 'ppl-6';
}

const GOALS: { value: TrainingGoal; label: string; desc: string }[] = [
  { value: 'hypertrophy', label: 'Build muscle', desc: 'Grow size with progressive overload' },
  { value: 'strength', label: 'Get stronger', desc: 'Prioritize heavier loads over time' },
  { value: 'general', label: 'Stay fit', desc: 'Consistent, balanced training' },
];
const LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

export function Onboarding() {
  const navigate = useNavigate();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const applyRoutine = useStore((s) => s.applyRoutine);
  const loadDemo = useStore((s) => s.loadDemo);
  const [step, setStep] = useState(0);

  const [name, setName] = useState(() => useStore.getState().user.name);
  const [goal, setGoal] = useState<TrainingGoal>('hypertrophy');
  const [experience, setExperience] = useState<ExperienceLevel>('intermediate');
  const [days, setDays] = useState(3);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>(['barbell', 'dumbbell', 'machine', 'cable']);
  const [unit, setUnit] = useState<Unit>('kg');

  const steps = ['Goal', 'Experience', 'Schedule', 'Routine', 'Setup'];

  // Pre-select the days-matched routine when arriving at the routine step.
  const next = () => {
    setStep((s) => {
      const to = s + 1;
      if (to === 3 && routineId === null) setRoutineId(suggestedRoutine(days));
      return to;
    });
  };

  const finish = () => {
    const trimmed = name.trim();
    completeOnboarding({
      ...(trimmed ? { name: trimmed } : {}),
      goal,
      experience,
      daysPerWeek: days,
      equipment,
      settings: { ...useStore.getState().user.settings, unit },
    });
    const chosen = routineId ? ROUTINES.find((r) => r.id === routineId) : null;
    if (chosen) applyRoutine(chosen);
    navigate('/', { replace: true });
  };

  const toggleEquip = (e: Equipment) =>
    setEquipment((list) => (list.includes(e) ? list.filter((x) => x !== e) : [...list, e]));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-base px-[var(--gutter)] pb-8 safe-top">
      <div className="flex items-center gap-2 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-ink">
          <Dumbbell size={18} />
        </span>
        <span className="text-lg font-bold text-content">BodyOS</span>
        <button onClick={finish} className="ml-auto text-sm text-content-faint">Skip</button>
      </div>

      {/* progress */}
      <div className="mb-6 flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface-3'}`} />
        ))}
      </div>

      <div key={step} className="flex-1">
        {step === 0 && (
          <Section title="What's your main goal?" subtitle="We tune progression and defaults around it.">
            {GOALS.map((g) => (
              <Option key={g.value} active={goal === g.value} onClick={() => setGoal(g.value)} title={g.label} desc={g.desc} />
            ))}
          </Section>
        )}
        {step === 1 && (
          <Section title="How experienced are you?" subtitle="This sets sensible starting loads and increments.">
            {LEVELS.map((l) => (
              <Option key={l.value} active={experience === l.value} onClick={() => setExperience(l.value)} title={l.label} />
            ))}
          </Section>
        )}
        {step === 2 && (
          <Section title="How many days per week?" subtitle="Pick a realistic number you can keep.">
            <div className="grid grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={`rounded-2xl border py-4 text-lg font-bold ${days === d ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-content-muted'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Section>
        )}
        {step === 3 && (
          <Section title="Pick a starter split" subtitle="We'll build the workouts and schedule your week. You can change everything later.">
            {ROUTINES.map((r) => {
              const active = routineId === r.id;
              const recommended = r.id === suggestedRoutine(days);
              return (
                <button
                  key={r.id}
                  onClick={() => setRoutineId(r.id)}
                  aria-pressed={active}
                  className={`flex flex-col rounded-2xl border p-4 text-left transition-colors ${active ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold ${active ? 'text-accent' : 'text-content'}`}>{r.name}</span>
                    {recommended && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                        Recommended
                      </span>
                    )}
                  </div>
                  <span className="mt-1 text-xs text-content-muted">{r.days.map((d) => d.name).join(' · ')}</span>
                </button>
              );
            })}
            <button
              onClick={() => setRoutineId(null)}
              aria-pressed={routineId === null}
              className={`rounded-2xl border p-4 text-left text-sm font-medium transition-colors ${routineId === null ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-content-muted'}`}
            >
              I&rsquo;ll build my own
            </button>
          </Section>
        )}
        {step === 4 && (
          <Section title="Final setup" subtitle="Your name, equipment and units. You can change these later.">
            <div>
              <label htmlFor="ob-name" className="label-tiny">Your name</label>
              <input
                id="ob-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
                maxLength={40}
                placeholder="What should we call you?"
                className="mt-2 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content placeholder:text-content-faint focus:border-accent focus:outline-none"
              />
            </div>
            <div className="mt-5">
              <span className="label-tiny">Available equipment</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {EQUIPMENT.map((e) => (
                  <button
                    key={e}
                    onClick={() => toggleEquip(e)}
                    aria-pressed={equipment.includes(e)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium capitalize ${equipment.includes(e) ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-content-muted'}`}
                  >
                    {equipment.includes(e) && <Check size={14} />} {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <span className="label-tiny">Units</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(['kg', 'lb'] as Unit[]).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    aria-pressed={unit === u}
                    className={`rounded-xl border py-3 font-semibold ${unit === u ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-content-muted'}`}
                  >
                    {u === 'kg' ? 'Kilograms' : 'Pounds'}
                  </button>
                ))}
              </div>
            </div>
          </Section>
        )}
      </div>

      <div className="mt-6">
        {step < steps.length - 1 ? (
          <Button size="lg" fullWidth onClick={next}>
            Continue <ArrowRight size={18} />
          </Button>
        ) : (
          <Button size="lg" fullWidth onClick={finish}>
            Start training <ArrowRight size={18} />
          </Button>
        )}
        {step > 0 ? (
          <button onClick={() => setStep((s) => s - 1)} className="mt-3 w-full text-center text-sm text-content-faint">
            Back
          </button>
        ) : (
          <button
            onClick={() => {
              loadDemo();
              navigate('/', { replace: true });
            }}
            className="mt-3 w-full text-center text-sm text-content-faint underline-offset-2 hover:text-content-muted hover:underline"
          >
            Just looking? Explore with demo data
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="animate-slide-up">
      <h1 className="text-title text-content">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-content-muted">{subtitle}</p>
      <div className="stagger mt-7 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Option({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${active ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}
    >
      <div className="flex-1">
        <p className={`font-semibold ${active ? 'text-accent' : 'text-content'}`}>{title}</p>
        {desc && <p className="text-xs text-content-muted">{desc}</p>}
      </div>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${active ? 'border-accent bg-accent text-ink' : 'border-line'}`}>
        {active && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}
