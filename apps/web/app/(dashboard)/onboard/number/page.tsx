"use client";

import { useRouter } from "next/navigation";
import OnboardStepper from "@/components/onboard/OnboardStepper";

export default function OnboardNumber() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto">
      <OnboardStepper />
      <h1 className="text-3xl font-display font-medium">Pick a way to receive calls</h1>
      <p className="text-helio-mute mt-1">You can change this any time.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Choice title="Twilio phone number" desc="A real phone number callers can dial. ₹100/month." cta="Choose number" />
        <Choice title="Browser widget" desc="A 'Call Now' button on your website. Free." cta="Generate widget" highlight />
      </div>

      <div className="flex justify-between mt-6">
        <button className="btn-ghost" onClick={() => router.push("/onboard/faqs")}>← Back</button>
        <button className="btn-primary" onClick={() => router.push("/overview")}>Finish</button>
      </div>
    </div>
  );
}

function Choice({ title, desc, cta, highlight }: { title: string; desc: string; cta: string; highlight?: boolean }) {
  return (
    <div className={"panel p-6 " + (highlight ? "ring-1 ring-helio/40" : "")}>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-helio-mute text-sm mt-1">{desc}</div>
      <button className="btn-primary mt-4">{cta}</button>
    </div>
  );
}
