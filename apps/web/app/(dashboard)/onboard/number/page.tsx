"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import OnboardStepper from "@/components/onboard/OnboardStepper";

export default function OnboardNumber() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const step1 = JSON.parse(sessionStorage.getItem("helio.onboard.step1") || "{}");
      if (!step1.name) throw new Error("Missing business details — please go back to step 1.");

      const faqs: { question: string; answer: string }[] = JSON.parse(
        sessionStorage.getItem("helio.onboard.faqs") || "[]"
      );
      const calendarConnected = sessionStorage.getItem("helio.onboard.calendar") === "connected";

      // Persist business locally so dashboard picks it up without a backend
      const business = {
        id: `demo-${Date.now()}`,
        user_id: "demo-user",
        name: step1.name,
        slug: step1.name.toLowerCase().replace(/\s+/g, "-"),
        industry: step1.industry || "salon",
        phone: step1.phone || "",
        email: localStorage.getItem("helio.demo.email") || "",
        address: step1.address || "",
        timezone: step1.timezone || "Asia/Kolkata",
        escalation_phone: step1.escalation_phone || "",
        agent_name: "Maya",
        greeting_message: `Thank you for calling ${step1.name}. How can I help you today?`,
        after_hours_message: `Thank you for calling ${step1.name}. We are currently closed. Please call back during business hours.`,
        agent_enabled: true,
        after_hours_mode: false,
        whatsapp_confirmations: true,
        email_confirmations: true,
        escalation_alerts: true,
        working_hours: [
          { day: "monday",    open: "09:00", close: "18:00", closed: false },
          { day: "tuesday",   open: "09:00", close: "18:00", closed: false },
          { day: "wednesday", open: "09:00", close: "18:00", closed: false },
          { day: "thursday",  open: "09:00", close: "18:00", closed: false },
          { day: "friday",    open: "09:00", close: "18:00", closed: false },
          { day: "saturday",  open: "09:00", close: "14:00", closed: false },
          { day: "sunday",    open: "00:00", close: "00:00", closed: true  },
        ],
        services: [],
        faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
        twilio_phone_number: null,
        twilio_phone_sid: null,
        whatsapp_number: null,
        meta_waba_id: null,
        meta_phone_number_id: null,
        google_calendar_id: calendarConnected ? "primary" : null,
        google_calendar_access_token: null,
        google_calendar_refresh_token: null,
        google_calendar_token_expiry: calendarConnected ? new Date(Date.now() + 3600_000).toISOString() : null,
        country_code: "IN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem("helio.business", JSON.stringify(business));
      sessionStorage.removeItem("helio.onboard.step1");
      sessionStorage.removeItem("helio.onboard.faqs");
      sessionStorage.removeItem("helio.onboard.calendar");

      // Bust the SWR cache so /overview re-reads from localStorage
      await mutate("current-business", business, { revalidate: false });

      router.push("/overview");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <OnboardStepper />
      <h1 className="text-3xl font-display font-medium">Pick a way to receive calls</h1>
      <p className="text-helio-mute mt-1">You can change this any time in Settings → Integrations.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Choice title="Twilio phone number" desc="A real phone number callers can dial. ₹100/month." cta="Set up later" />
        <Choice title="Browser widget" desc="A 'Call Now' button on your website. Free." cta="Set up later" highlight />
      </div>

      <p className="text-xs text-helio-mute mt-4">
        Both options are configured in Settings → Integrations after setup.
      </p>

      {error && <div className="mt-4 text-sm text-red-400">{error}</div>}

      <div className="flex justify-between mt-6">
        <button className="btn-ghost" onClick={() => router.push("/onboard/faqs")}>← Back</button>
        <button className="btn-primary" disabled={saving} onClick={finish}>
          {saving ? "Setting up…" : "Finish setup"}
        </button>
      </div>
    </div>
  );
}

function Choice({ title, desc, cta, highlight }: { title: string; desc: string; cta: string; highlight?: boolean }) {
  return (
    <div className={"panel p-6 " + (highlight ? "ring-1 ring-helio/40" : "")}>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-helio-mute text-sm mt-1">{desc}</div>
      <button className="btn-ghost mt-4 text-sm">{cta}</button>
    </div>
  );
}
