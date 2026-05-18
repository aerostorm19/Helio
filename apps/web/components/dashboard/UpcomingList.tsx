"use client";

import { format } from "date-fns";
import { CalendarDays, CheckCircle2, MessageCircle, Mail } from "lucide-react";

export default function UpcomingList({ items }: { items: any[] }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium">Upcoming appointments</div>
          <div className="text-xs text-helio-mute">{items.length} confirmed</div>
        </div>
        <a href="/appointments" className="text-xs text-helio">View calendar →</a>
      </div>
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {items.slice(0, 8).map((a) => {
          const d = new Date(a.scheduled_at);
          return (
            <div key={a.id} className="panel-soft p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-helio/15 text-helio grid place-items-center">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.customer_name}</div>
                <div className="text-xs text-helio-mute truncate">{a.service} · {a.duration_minutes}m</div>
              </div>
              <div className="text-right">
                <div className="text-sm tabular-nums">{format(d, "EEE, MMM d")}</div>
                <div className="text-xs text-helio-mute tabular-nums flex items-center justify-end gap-1">
                  {format(d, "p")}
                  {a.confirmation_channel === "whatsapp" && <MessageCircle className="h-3 w-3 text-helio" />}
                  {a.confirmation_channel === "email"    && <Mail className="h-3 w-3 text-blue-300" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
