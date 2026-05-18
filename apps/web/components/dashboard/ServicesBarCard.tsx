"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ServicesBarCard({ data }: { data: { name: string; count: number; fill: string }[] }) {
  return (
    <div className="panel p-5">
      <div className="text-sm font-medium mb-1">Top services</div>
      <div className="text-xs text-helio-mute mb-4">Bookings by service · this month</div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fill: "#7E8A75", fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
            <Tooltip
              cursor={{ fill: "rgba(166,255,77,.05)" }}
              contentStyle={{ background: "#121712", border: "1px solid #22291F", borderRadius: 12, fontSize: 12 }}
            />
            <Bar dataKey="count" radius={[6, 6, 6, 6]}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
