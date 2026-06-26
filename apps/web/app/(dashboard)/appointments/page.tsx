"use client";

import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { useBusiness } from "@/hooks/useBusiness";
import { useAppointments } from "@/hooks/useAppointments";
import AppointmentCalendar from "@/components/dashboard/AppointmentCalendar";
import { api } from "@/lib/api";
import { CalendarDays, MessageCircle, Mail, Phone } from "lucide-react";

export default function AppointmentsPage() {
  const { data: business } = useBusiness();
  const { data: backend, mutate } = useAppointments(business?.id);
  const appts = backend ?? [];
  const [selected, setSelected] = useState<Date>(new Date());

  const day = useMemo(
    () => appts.filter((a: any) => isSameDay(new Date(a.scheduled_at), selected))
      .sort((a: any, b: any) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at)),
    [appts, selected]
  );

  const total = appts.length;
  const today = appts.filter((a: any) => isSameDay(new Date(a.scheduled_at), new Date())).length;

  const channels = useMemo(() => {
    const wa = appts.filter((a: any) => a.confirmation_channel === "whatsapp").length;
    const email = appts.filter((a: any) => a.confirmation_channel === "email").length;
    const none = total - wa - email;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    return { wa: pct(wa), email: pct(email), none: pct(none) };
  }, [appts, total]);

  async function cancel(id: string) {
    if (id.startsWith("mock")) return;
    await api.cancel(id);
    mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium">Appointments</h1>
          <p className="text-helio-mute text-sm mt-1">Upcoming bookings — managed by your AI receptionist.</p>
        </div>
        <div className="flex gap-2">
          <span className="pill"><span className="status-dot bg-helio" /> {today} today</span>
          <span className="pill text-helio-mute">{total} upcoming</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <AppointmentCalendar appointments={appts} onSelectDay={setSelected} />

          <div className="panel p-5">
            <div className="text-sm font-medium mb-3">By channel</div>
            <Bar label="WhatsApp" pct={channels.wa} color="bg-helio" />
            <Bar label="Email"    pct={channels.email} color="bg-blue-400" />
            <Bar label="None"     pct={channels.none} color="bg-helio-edge" />
          </div>
        </div>

        <div className="lg:col-span-2 panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-display">{format(selected, "EEEE, MMMM d")}</div>
              <div className="text-xs text-helio-mute">{day.length} appointment{day.length === 1 ? "" : "s"}</div>
            </div>
          </div>

          {day.length === 0 && (
            <div className="text-center py-12 text-helio-mute text-sm">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
              No appointments on this day.
            </div>
          )}

          <div className="relative">
            {day.length > 0 && <div className="absolute left-[42px] top-2 bottom-2 w-px bg-helio-edge" />}
            <div className="space-y-2">
              {day.map((a: any) => {
                const d = new Date(a.scheduled_at);
                return (
                  <div key={a.id} className="relative flex items-stretch gap-3">
                    <div className="w-20 shrink-0 text-right pt-3">
                      <div className="text-sm font-medium tabular-nums">{format(d, "h:mm a")}</div>
                      <div className="text-[10px] text-helio-mute">{a.duration_minutes}m</div>
                    </div>
                    <div className="relative z-10 mt-3 h-3 w-3 shrink-0 rounded-full bg-helio ring-4 ring-helio-panel" />
                    <div className="panel-soft flex-1 p-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-helio-surface grid place-items-center text-sm">
                        {a.customer_name.slice(0,1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{a.customer_name}</div>
                        <div className="text-xs text-helio-mute truncate">{a.service}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {a.confirmation_channel === "whatsapp" && <MessageCircle className="h-3.5 w-3.5 text-helio" />}
                        {a.confirmation_channel === "email"    && <Mail className="h-3.5 w-3.5 text-blue-300" />}
                        <a href={`tel:${a.customer_phone}`} className="btn-ghost py-1 px-2 text-xs"><Phone className="h-3 w-3" /></a>
                        <button onClick={() => cancel(a.id)} className="btn-ghost py-1 px-2 text-xs">Cancel</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-helio-mute">{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-helio-edge overflow-hidden">
        <div className={"h-full rounded-full " + color} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
