"use client";

import { relativeTime } from "@/lib/utils";
import { CalendarCheck, MessageSquare, PhoneOff, PhoneForwarded, MessageCircle, Sparkles } from "lucide-react";

const ICONS: Record<string, any> = {
  booked: CalendarCheck,
  faq: MessageSquare,
  missed: PhoneOff,
  escalated: PhoneForwarded,
  wa: MessageCircle,
};

const COLORS: Record<string, string> = {
  helio: "text-helio bg-helio/10",
  blue:  "text-blue-300 bg-blue-500/10",
  red:   "text-red-300 bg-red-500/10",
  amber: "text-amber-300 bg-amber-500/10",
  muted: "text-helio-mute bg-helio-edge",
};

export default function LiveFeed({ events }: { events: { type: string; text: string; color: string; at: string }[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-helio animate-ping opacity-60" />
          <span className="relative h-2 w-2 rounded-full bg-helio" />
        </span>
        Live activity
        <Sparkles className="h-3.5 w-3.5 text-helio-mute ml-auto" />
      </div>
      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-helio/40 via-helio-edge to-transparent" />
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
          {events.map((e, i) => {
            const Icon = ICONS[e.type] || Sparkles;
            return (
              <div key={i} className="relative flex gap-3 items-start">
                <div className={`relative z-10 h-8 w-8 rounded-full grid place-items-center ${COLORS[e.color]} ring-4 ring-helio-panel`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight">{e.text}</div>
                  <div className="text-[11px] text-helio-mute mt-0.5">{relativeTime(e.at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
