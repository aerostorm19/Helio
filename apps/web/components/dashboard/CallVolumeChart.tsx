"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function CallVolumeChart({ data }: { data: any[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="g-calls" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#A6FF4D" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#A6FF4D" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-book" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#7BC4FF" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7BC4FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#22291F" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#7E8A75", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#7E8A75", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            cursor={{ stroke: "#A6FF4D", strokeOpacity: 0.2, strokeWidth: 1 }}
            contentStyle={{ background: "#121712", border: "1px solid #22291F", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#7E8A75" }}
          />
          <Area type="monotone" dataKey="calls"    stroke="#A6FF4D" strokeWidth={2}   fill="url(#g-calls)" />
          <Area type="monotone" dataKey="bookings" stroke="#7BC4FF" strokeWidth={1.5} fill="url(#g-book)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
