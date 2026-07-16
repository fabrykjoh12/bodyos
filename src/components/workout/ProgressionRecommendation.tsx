import { ArrowUp, CheckCircle2, Minus, RotateCcw, TrendingDown } from 'lucide-react';
import type { ProgressionAction, ProgressionRecommendation as Rec } from '@/types';

const CONFIG: Record<
  ProgressionAction,
  { icon: typeof ArrowUp; tone: string; ring: string }
> = {
  'increase-weight': { icon: ArrowUp, tone: 'text-success', ring: 'border-success/30 bg-success-soft' },
  'add-reps': { icon: CheckCircle2, tone: 'text-accent', ring: 'border-accent/30 bg-accent-soft' },
  maintain: { icon: Minus, tone: 'text-caution', ring: 'border-caution/30 bg-caution-soft' },
  'reduce-load': { icon: TrendingDown, tone: 'text-caution', ring: 'border-caution/30 bg-caution-soft' },
  deload: { icon: RotateCcw, tone: 'text-danger', ring: 'border-danger/30 bg-danger-soft' },
};

export function ProgressionRecommendation({ rec, compact }: { rec: Rec; compact?: boolean }) {
  const cfg = CONFIG[rec.action];
  const Icon = cfg.icon;
  return (
    <div className={`flex gap-3 rounded-2xl border p-3.5 ${cfg.ring}`}>
      <span className={`mt-0.5 shrink-0 ${cfg.tone}`}>
        <Icon size={compact ? 18 : 20} strokeWidth={2.4} />
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${cfg.tone}`}>{rec.headline}</p>
        {!compact && <p className="mt-0.5 text-sm leading-snug text-content-muted">{rec.reason}</p>}
      </div>
    </div>
  );
}
