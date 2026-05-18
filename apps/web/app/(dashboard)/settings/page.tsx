"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/hooks/useBusiness";
import { api } from "@/lib/api";
import type { Business, Service, WorkingHour } from "@/lib/supabase/types";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

export default function SettingsPage() {
  const { data: business, mutate } = useBusiness();
  const [form, setForm] = useState<Partial<Business> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (business) setForm(business);
  }, [business]);

  if (!form) return <div className="text-sm text-helio-mute">Loading…</div>;

  function patch<K extends keyof Business>(k: K, v: Business[K]) {
    setForm((f) => ({ ...(f as any), [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      await api.updateBusiness(business!.id, form);
      mutate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-medium">Settings</h1>
        <p className="text-helio-mute text-sm">Update your business profile and agent behavior.</p>
      </div>

      <Section title="Business">
        <Row label="Name">
          <input value={form.name ?? ""} onChange={(e) => patch("name", e.target.value)} className="input" />
        </Row>
        <Row label="Address">
          <input value={form.address ?? ""} onChange={(e) => patch("address", e.target.value)} className="input" />
        </Row>
        <Row label="Phone">
          <input value={form.phone ?? ""} onChange={(e) => patch("phone", e.target.value)} className="input" />
        </Row>
        <Row label="Timezone">
          <input value={form.timezone ?? ""} onChange={(e) => patch("timezone", e.target.value)} className="input" />
        </Row>
      </Section>

      <Section title="AI agent">
        <Row label="Agent name">
          <input value={form.agent_name ?? ""} onChange={(e) => patch("agent_name", e.target.value)} className="input" />
        </Row>
        <Row label="Greeting">
          <textarea value={form.greeting_message ?? ""} onChange={(e) => patch("greeting_message", e.target.value)} className="input min-h-[88px]" />
        </Row>
        <Row label="Escalation phone">
          <input value={form.escalation_phone ?? ""} onChange={(e) => patch("escalation_phone", e.target.value)} className="input" />
        </Row>
        <Row label="Agent enabled">
          <Switch on={!!form.agent_enabled} onChange={(v) => patch("agent_enabled", v)} />
        </Row>
      </Section>

      <Section title="Working hours">
        <div className="space-y-2">
          {DAYS.map((d) => {
            const wh = (form.working_hours ?? []).find((w: WorkingHour) => w.day === d)
              || { day: d, open: "10:00", close: "20:00", closed: false };
            const idx = (form.working_hours ?? []).findIndex((w: WorkingHour) => w.day === d);
            const updateDay = (next: WorkingHour) => {
              const list = [...(form.working_hours ?? [])];
              if (idx >= 0) list[idx] = next; else list.push(next);
              patch("working_hours", list);
            };
            return (
              <div key={d} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-3 capitalize text-sm">{d}</div>
                <input type="time" value={wh.open} onChange={(e) => updateDay({ ...wh, open: e.target.value })} className="input col-span-3" disabled={wh.closed} />
                <input type="time" value={wh.close} onChange={(e) => updateDay({ ...wh, close: e.target.value })} className="input col-span-3" disabled={wh.closed} />
                <label className="col-span-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={wh.closed} onChange={(e) => updateDay({ ...wh, closed: e.target.checked })} />
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Services">
        <ServiceList services={form.services ?? []} onChange={(s) => patch("services", s)} />
      </Section>

      <div>
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <style jsx>{`
        .input { background: #1A211A; border: 1px solid #22291F; border-radius: 8px; padding: 8px 12px; font-size: 14px; width: 100%; }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="text-sm font-medium mb-4">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 items-center gap-3">
      <div className="col-span-4 text-sm text-helio-mute">{label}</div>
      <div className="col-span-8">{children}</div>
    </div>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={"h-6 w-11 rounded-full transition " + (on ? "bg-helio" : "bg-helio-edge")}>
      <span className={"block h-5 w-5 rounded-full bg-white transition " + (on ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

function ServiceList({ services, onChange }: { services: Service[]; onChange: (s: Service[]) => void }) {
  return (
    <div className="space-y-2">
      {services.map((s, i) => (
        <div key={i} className="grid grid-cols-12 items-center gap-2">
          <input value={s.name} onChange={(e) => onChange(services.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
            placeholder="Service name" className="col-span-5 bg-helio-surface border border-helio-edge rounded-lg px-3 py-2 text-sm" />
          <input type="number" value={s.duration_minutes} onChange={(e) => onChange(services.map((x, j) => j === i ? { ...x, duration_minutes: parseInt(e.target.value) || 0 } : x))}
            placeholder="Duration" className="col-span-3 bg-helio-surface border border-helio-edge rounded-lg px-3 py-2 text-sm" />
          <input type="number" value={s.price} onChange={(e) => onChange(services.map((x, j) => j === i ? { ...x, price: parseFloat(e.target.value) || 0 } : x))}
            placeholder="Price" className="col-span-3 bg-helio-surface border border-helio-edge rounded-lg px-3 py-2 text-sm" />
          <button className="btn-ghost col-span-1 py-2" onClick={() => onChange(services.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button className="btn-ghost" onClick={() => onChange([...services, { name: "", duration_minutes: 30, price: 0 }])}>+ Add service</button>
    </div>
  );
}
