import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface StrengthPoint {
  label: string;
  value: number;
}

export function StrengthChart({ data, unit }: { data: StrengthPoint[]; unit: string }) {
  if (data.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-line bg-surface text-sm text-content-faint">
        Not enough data yet
      </div>
    );
  }
  const values = data.map((d) => d.value);
  const min = Math.floor(Math.min(...values) * 0.95);
  const max = Math.ceil(Math.max(...values) * 1.05);

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="strengthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4C8DFF" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#4C8DFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fill: '#666C77', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
          <YAxis domain={[min, max]} tick={{ fill: '#666C77', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: '#1B1E24',
              border: '1px solid #262B33',
              borderRadius: 12,
              color: '#F3F5F7',
              fontSize: 12,
            }}
            labelStyle={{ color: '#9BA1AC' }}
            formatter={(v: number) => [`${v} ${unit}`, 'Est. 1RM']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#4C8DFF"
            strokeWidth={2.5}
            fill="url(#strengthFill)"
            dot={{ r: 2.5, fill: '#4C8DFF' }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
