"use client";

import { useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import type { Appointment } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export default function AppointmentCalendar({
  appointments, onSelectDay,
}: { appointments: Appointment[]; onSelectDay: (d: Date) => void }) {
  const [cursor, setCursor] = useState(new Date());
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const dotMap = useMemo(() => {
    const m = new Map<string, number>();
    appointments.forEach((a) => {
      const k = format(new Date(a.scheduled_at), "yyyy-MM-dd");
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [appointments]);

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <button className="btn-ghost px-2 py-1" onClick={() => setCursor(addDays(cursor, -28))}>‹</button>
        <div className="text-sm font-medium">{format(cursor, "MMMM yyyy")}</div>
        <button className="btn-ghost px-2 py-1" onClick={() => setCursor(addDays(cursor, 28))}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-helio-mute mb-1">
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const has = dotMap.has(key);
          const today = isSameDay(d, new Date());
          return (
            <button key={key} onClick={() => onSelectDay(d)}
              className={cn(
                "aspect-square text-xs rounded-lg flex flex-col items-center justify-center",
                today ? "bg-helio text-helio-ink" : "hover:bg-helio-surface",
                d.getMonth() !== cursor.getMonth() && "text-helio-mute/50"
              )}>
              {format(d, "d")}
              {has && <span className="mt-0.5 h-1 w-1 rounded-full bg-helio" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
