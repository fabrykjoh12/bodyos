import { useMemo } from 'react';
import type { WorkoutSession } from '@/types';
import { sessionSetCount } from '@/lib/prstats';

const VOLT = '#CDFB45';

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Contribution-style calendar of training days — columns are weeks (Mon–Sun),
 * cells shaded by that day's working-set count. Shows consistency at a glance.
 */
export function ConsistencyGrid({ sessions, weeks = 16 }: { sessions: WorkoutSession[]; weeks?: number }) {
  const { columns, maxSets, trainedDays } = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of sessions) {
      if (s.status !== 'completed') continue;
      const key = toKey(new Date(s.completedAt ?? s.startedAt));
      byDay.set(key, (byDay.get(key) ?? 0) + sessionSetCount(s));
    }
    const max = Math.max(1, ...byDay.values());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dow = (today.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - dow);
    const start = new Date(monday);
    start.setDate(monday.getDate() - (weeks - 1) * 7);

    const cols: { key: string; sets: number; future: boolean }[][] = [];
    for (let w = 0; w < weeks; w += 1) {
      const col: { key: string; sets: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d += 1) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        const key = toKey(day);
        col.push({ key, sets: byDay.get(key) ?? 0, future: day > today });
      }
      cols.push(col);
    }
    return { columns: cols, maxSets: max, trainedDays: byDay.size };
  }, [sessions, weeks]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="no-scrollbar overflow-x-auto">
        <div className="flex gap-[3px]">
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((cell) => (
                <span
                  key={cell.key}
                  title={cell.sets > 0 ? `${cell.key}: ${cell.sets} sets` : cell.key}
                  className="h-3 w-3 rounded-[3px]"
                  style={{
                    background: cell.future
                      ? 'transparent'
                      : cell.sets > 0
                        ? `rgba(205,251,69,${(0.3 + 0.7 * (cell.sets / maxSets)).toFixed(3)})`
                        : '#20262d',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-content-faint">
        <span className="tnum">
          <span className="font-semibold text-content-muted">{trainedDays}</span> training days · last {weeks} weeks
        </span>
        <span className="flex items-center gap-1.5">
          Less
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: '#20262d' }} />
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: `${VOLT}66` }} />
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: VOLT }} />
          More
        </span>
      </div>
    </div>
  );
}
