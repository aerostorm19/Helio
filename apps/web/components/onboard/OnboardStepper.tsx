"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const STEPS = [
  { path: "/onboard",          label: "Business" },
  { path: "/onboard/calendar", label: "Calendar" },
  { path: "/onboard/faqs",     label: "FAQs" },
  { path: "/onboard/number",   label: "Phone" },
];

export default function OnboardStepper() {
  const path = usePathname();
  const idx = STEPS.findIndex((s) => s.path === path);
  return (
    <div className="flex items-center gap-3 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.path} className="flex items-center gap-3">
          <div className={cn(
            "h-7 w-7 rounded-full grid place-items-center text-xs font-medium",
            i <= idx ? "bg-helio text-helio-ink" : "bg-helio-surface text-helio-mute"
          )}>{i + 1}</div>
          <div className={cn("text-sm", i <= idx ? "text-foreground" : "text-helio-mute")}>{s.label}</div>
          {i < STEPS.length - 1 && <div className="h-px w-8 bg-helio-edge" />}
        </div>
      ))}
    </div>
  );
}
