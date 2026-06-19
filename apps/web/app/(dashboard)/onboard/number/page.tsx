"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardStepper from "@/components/onboard/OnboardStepper";
import { api } from "@/lib/api";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function OnboardNumber() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const step1 = JSON.parse(sessionStorage.getItem("helio.onboard.step1") || "{}");
      if (!step1.name) throw new Error("Missing business details from step 1");

      const business = await api.onboard(token, step1);
      if (!business?.id) throw new Error("Failed to create business");

      const faqs: { question: string; answer: string }[] = JSON.parse(
        sessionStorage.getItem("helio.onboard.faqs") || "[]"
      );
      const validFaqs = faqs.filter((f) => f.question.trim() && f.answer.trim());
      for (const [i, faq] of validFaqs.entries()) {
        await api.addFaq(business.id, { ...faq, sort_order: i });
      }

      sessionStorage.removeItem("helio.onboard.step1");
      sessionStorage.removeItem("helio.onboard.faqs");

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
