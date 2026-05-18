"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export default function ConversionRing({ pct }: { pct: number }) {
  const data = [
    { name: "converted", value: pct },
    { name: "rest",      value: Math.max(0, 100 - pct) },
  ];
  return (
    <div className="relative h-32 w-32">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data} dataKey="value" innerRadius={44} outerRadius={60}
            startAngle={90} endAngle={-270}
            stroke="none"
          >
            <Cell fill="#A6FF4D" />
            <Cell fill="#22291F" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-display font-medium tabular-nums">{pct}%</div>
        <div className="text-[10px] uppercase text-helio-mute">conversion</div>
      </div>
    </div>
  );
}
