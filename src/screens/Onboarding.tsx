import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Dumbbell } from 'lucide-react';
import type { Equipment, ExperienceLevel, TrainingGoal, Unit } from '@/types';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';

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
  const [step, setStep] = useState(0);

  const [goal, setGoal] = useState<TrainingGoal>('hypertrophy');
  const [experience, setExperience] = useState<ExperienceLevel>('intermediate');
  const [days, setDays] = useState(3);
  const [equipment, setEquipment] = useState<Equipment[]>(['barbell', 'dumbbell', 'machine', 'cable']);
  const [unit, setUnit] = useState<Unit>('kg');

  const steps = ['Goal', 'Experience', 'Schedule', 'Setup'];

  const finish = () => {
    completeOnboarding({
      goal,
      experience,
      daysPerWeek: days,
      equipment,
      settings: { ...useStore.getState().user.settings, unit },
    });
    navigate('/', { replace: true });
  };

  const toggleEquip = (e: Equipment) =>
    setEquipment((list) => (list.includes(e) ? list.filter((x) => x !== e) : [...list, e]));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-base px-5 pb-8 safe-top">
      <div className="flex items-center gap-2 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
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

      <div className="flex-1">
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
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-2xl border py-4 text-lg font-bold ${days === d ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-content-muted'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Section>
        )}
        {step === 3 && (
          <Section title="Final setup" subtitle="Equipment and units. You can change these later.">
            <div>
              <span className="label-tiny">Available equipment</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {EQUIPMENT.map((e) => (
                  <button
                    key={e}
                    onClick={() => toggleEquip(e)}
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
          <Button size="lg" fullWidth onClick={() => setStep((s) => s + 1)}>
            Continue <ArrowRight size={18} />
          </Button>
        ) : (
          <Button size="lg" fullWidth onClick={finish}>
            Start training <ArrowRight size={18} />
          </Button>
        )}
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="mt-3 w-full text-center text-sm text-content-faint">
            Back
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-bold text-content">{title}</h1>
      <p className="mt-1 text-sm text-content-muted">{subtitle}</p>
      <div className="mt-6 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Option({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${active ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}
    >
      <div className="flex-1">
        <p className={`font-semibold ${active ? 'text-accent' : 'text-content'}`}>{title}</p>
        {desc && <p className="text-xs text-content-muted">{desc}</p>}
      </div>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${active ? 'border-accent bg-accent text-white' : 'border-line'}`}>
        {active && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}
