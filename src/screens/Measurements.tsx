import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Ruler, Trash2 } from 'lucide-react';
import type { BodyMeasurement, Unit } from '@/types';
import { useStore } from '@/store/useStore';
import { uid } from '@/lib/id';
import { now, shortDate } from '@/lib/date';
import {
  formatWeight,
  toDisplayWeight,
  fromDisplayLength,
  toDisplayLength,
  lengthUnit,
  lbToKg,
} from '@/lib/format';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Stat } from '@/components/ui/Stat';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/ui/EmptyState';

type MetricKey = 'bodyWeightKg' | 'waistCm' | 'chestCm' | 'armCm';
const METRICS: { key: MetricKey; label: string; kind: 'weight' | 'length' }[] = [
  { key: 'bodyWeightKg', label: 'Body weight', kind: 'weight' },
  { key: 'waistCm', label: 'Waist', kind: 'length' },
  { key: 'chestCm', label: 'Chest', kind: 'length' },
  { key: 'armCm', label: 'Arm', kind: 'length' },
];

const inputClass =
  'w-full rounded-lg border border-line bg-surface-3 px-3 py-2.5 text-sm text-content placeholder:text-content-faint focus:border-accent focus:outline-none';

function stored(value: string, unit: Unit, kind: 'weight' | 'length'): number | undefined {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return kind === 'weight'
    ? unit === 'kg'
      ? n
      : lbToKg(n)
    : fromDisplayLength(n, unit);
}

function formatMetric(value: number, key: MetricKey, unit: Unit): string {
  if (key === 'bodyWeightKg') return formatWeight(value, unit);
  const len = Math.round(toDisplayLength(value, unit) * 10) / 10;
  return `${len} ${lengthUnit(unit)}`;
}

function displayValue(m: BodyMeasurement, key: MetricKey, unit: Unit): string {
  const v = m[key];
  return v == null ? '—' : formatMetric(v, key, unit);
}

export function Measurements() {
  const unit = useStore((s) => s.user.settings.unit);
  const measurements = useStore((s) => s.measurements);
  const addMeasurement = useStore((s) => s.addMeasurement);
  const deleteMeasurement = useStore((s) => s.deleteMeasurement);
  const updateUser = useStore((s) => s.updateUser);

  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<Record<MetricKey, string>>({
    bodyWeightKg: '',
    waistCm: '',
    chestCm: '',
    armCm: '',
  });

  const sorted = useMemo(
    () => [...measurements].sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()),
    [measurements],
  );

  // Latest + previous value per metric, for the snapshot deltas.
  const snapshot = useMemo(() => {
    return METRICS.map((metric) => {
      const withVal = sorted.filter((m) => m[metric.key] != null);
      const latest = withVal[0]?.[metric.key];
      const prev = withVal[1]?.[metric.key];
      const delta = latest != null && prev != null ? latest - prev : undefined;
      return { ...metric, latest, delta };
    });
  }, [sorted]);

  function reset() {
    setFields({ bodyWeightKg: '', waistCm: '', chestCm: '', armCm: '' });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const entry: BodyMeasurement = { id: uid('meas'), takenAt: now() };
    for (const metric of METRICS) {
      const v = stored(fields[metric.key], unit, metric.kind);
      if (v != null) entry[metric.key] = v;
    }
    // Nothing entered — do nothing.
    if (METRICS.every((m) => entry[m.key] == null)) return;
    addMeasurement(entry);
    // Keep the profile's current body weight in step with the latest log.
    if (entry.bodyWeightKg != null) updateUser({ bodyWeightKg: entry.bodyWeightKg });
    reset();
    setOpen(false);
  }

  const deltaUnit = (kind: 'weight' | 'length') => (kind === 'weight' ? unit : lengthUnit(unit));
  const fmtDelta = (delta: number, kind: 'weight' | 'length') => {
    const shown =
      kind === 'weight'
        ? Math.round((toDisplayWeight(Math.abs(delta), unit)) * 10) / 10
        : Math.round(toDisplayLength(Math.abs(delta), unit) * 10) / 10;
    return `${delta >= 0 ? '↑' : '↓'} ${shown} ${deltaUnit(kind)}`;
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      <ScreenHeader title="Body measurements" back="/progress" />

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Ruler size={24} />}
          title="No measurements yet"
          description="Log your body weight and key sizes to track how your body changes over time."
          action={<Button onClick={() => setOpen(true)}>Log a measurement</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {snapshot.map((m) => (
              <Stat
                key={m.key}
                label={m.label}
                value={m.latest != null ? formatMetric(m.latest, m.key, unit) : '—'}
                sub={m.delta != null && m.delta !== 0 ? fmtDelta(m.delta, m.kind) : 'no change'}
                accent={m.key === 'bodyWeightKg' ? 'accent' : 'default'}
              />
            ))}
          </div>

          <Button fullWidth onClick={() => setOpen(true)}>
            <Plus size={18} /> Log measurement
          </Button>

          <section>
            <h3 className="label-tiny mb-2">History</h3>
            <div className="card divide-y divide-line">
              {sorted.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-content">{shortDate(m.takenAt)}</p>
                    <p className="tnum truncate text-xs text-content-muted">
                      {METRICS.filter((metric) => m[metric.key] != null)
                        .map((metric) => `${metric.label} ${displayValue(m, metric.key, unit)}`)
                        .join('  ·  ')}
                    </p>
                  </div>
                  <button
                    aria-label={`Delete measurement from ${shortDate(m.takenAt)}`}
                    onClick={() => deleteMeasurement(m.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-faint hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Log measurement">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <p className="text-xs text-content-faint">
            Fill in what you measured today — leave the rest blank.
          </p>
          {METRICS.map((metric) => (
            <label key={metric.key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-content">
                {metric.label}
                <span className="ml-1 text-xs text-content-faint">
                  ({metric.kind === 'weight' ? unit : lengthUnit(unit)})
                </span>
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="—"
                value={fields[metric.key]}
                onChange={(e) => setFields((f) => ({ ...f, [metric.key]: e.target.value }))}
                className={`${inputClass} max-w-[8rem] text-right`}
              />
            </label>
          ))}
          <Button type="submit" fullWidth>
            Save measurement
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
