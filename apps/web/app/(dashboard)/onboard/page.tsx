"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardStepper from "@/components/onboard/OnboardStepper";

const INDUSTRIES = ["salon", "clinic", "tutor", "repair", "other"];

export default function OnboardStep1() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", industry: "salon", address: "", phone: "", timezone: "Asia/Kolkata", escalation_phone: "",
  });

  function next() {
    sessionStorage.setItem("helio.onboard.step1", JSON.stringify(form));
    router.push("/onboard/calendar");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <OnboardStepper />
      <h1 className="text-3xl font-display font-medium">Tell us about your business</h1>
      <p className="text-helio-mute mt-1">We use this to brief your AI receptionist.</p>

      <div className="panel p-6 mt-6 space-y-4">
        <Field label="Business name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </Field>
        <Field label="Industry">
          <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="input">
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>
        <Field label="Address">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        </Field>
        <Field label="Your phone (for escalation)">
          <input value={form.escalation_phone} onChange={(e) => setForm({ ...form, escalation_phone: e.target.value })} className="input" />
        </Field>
        <Field label="Timezone">
          <input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="input" />
        </Field>
      </div>

      <div className="flex justify-end mt-6">
        <button onClick={next} className="btn-primary">Continue</button>
      </div>

      <style jsx>{`.input { background:#1A211A; border:1px solid #22291F; border-radius:8px; padding:8px 12px; font-size:14px; width:100%; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase text-helio-mute mb-1">{label}</div>
      {children}
    </div>
  );
}
