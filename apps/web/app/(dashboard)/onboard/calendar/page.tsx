"use client";

import { useRouter } from "next/navigation";
import OnboardStepper from "@/components/onboard/OnboardStepper";

export default function OnboardCalendar() {
  const router = useRouter();
  return (
    <div className="max-w-2xl mx-auto">
      <OnboardStepper />
      <h1 className="text-3xl font-display font-medium">Connect Google Calendar</h1>
      <p className="text-helio-mute mt-1">Helio reads your availability and writes bookings here.</p>

      <div className="panel p-6 mt-6">
        <p className="text-sm">Click below to authorize. You can change calendars later in Settings → Integrations.</p>
        <button className="btn-primary mt-4">Connect Google Calendar</button>
      </div>

      <div className="flex justify-between mt-6">
        <button className="btn-ghost" onClick={() => router.push("/onboard")}>← Back</button>
        <button className="btn-primary" onClick={() => router.push("/onboard/faqs")}>Continue</button>
      </div>
    </div>
  );
}
