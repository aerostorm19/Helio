"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardStepper from "@/components/onboard/OnboardStepper";
import { Check, Calendar, Loader2 } from "lucide-react";

export default function OnboardCalendar() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "connecting" | "connected">(
    typeof window !== "undefined" && sessionStorage.getItem("helio.onboard.calendar") === "connected"
      ? "connected"
      : "idle"
  );

  function connect() {
    setState("connecting");
    // Simulate the Google OAuth round-trip for the demo
    setTimeout(() => {
      sessionStorage.setItem("helio.onboard.calendar", "connected");
      setState("connected");
    }, 1200);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <OnboardStepper />
      <h1 className="text-3xl font-display font-medium">Connect Google Calendar</h1>
      <p className="text-helio-mute mt-1">Helio reads your availability and writes bookings here.</p>

      <div className="panel p-6 mt-6">
        {state === "connected" ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-helio/15 grid place-items-center">
              <Check className="h-5 w-5 text-helio" />
            </div>
            <div>
              <div className="text-sm font-medium">Calendar connected</div>
              <div className="text-xs text-helio-mute">Primary calendar · bookings will sync automatically.</div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm">Authorize Helio to read availability and create events. You can change calendars later in Settings → Integrations.</p>
            <button className="btn-primary mt-4 inline-flex items-center gap-2" onClick={connect} disabled={state === "connecting"}>
              {state === "connecting"
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
                : <><Calendar className="h-4 w-4" /> Connect Google Calendar</>}
            </button>
          </>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button className="btn-ghost" onClick={() => router.push("/onboard")}>← Back</button>
        <button className="btn-primary" onClick={() => router.push("/onboard/faqs")}>
          {state === "connected" ? "Continue" : "Skip for now"}
        </button>
      </div>
    </div>
  );
}
