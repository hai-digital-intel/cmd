"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

export interface CategoryReadinessDatum {
  name: string;
  readiness: number;
}

function colorFor(value: number): string {
  if (value >= 90) return "var(--color-success)";
  if (value >= 50) return "var(--color-progress)";
  if (value > 0) return "var(--color-waiting)";
  return "var(--color-na)";
}

export function CategoryChart({ data }: { data: CategoryReadinessDatum[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--color-border)" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickFormatter={(v) => `${v}%`} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-muted)" }}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${Math.round(Number(value))}%`, "Readiness"]}
          />
          <Bar dataKey="readiness" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((d, i) => (
              <Cell key={i} fill={colorFor(d.readiness)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
