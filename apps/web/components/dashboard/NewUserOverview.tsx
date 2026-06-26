"use client";

import { useState } from "react";
import Link from "next/link";
import type { Business } from "@/lib/supabase/types";
import DemoCallModal from "@/components/dashboard/DemoCallModal";
import {
  PhoneCall, Check, Calendar, Phone, MessageCircle, Sparkles,
  PhoneIncoming, CalendarClock, TrendingUp, ArrowRight, Bot,
} from "lucide-react";

export default function NewUserOverview({ business }: { business: Business }) {
  const [showDemo, setShowDemo] = useState(false);
  const agent = business.agent_name || "Maya";
  const faqs = (business as any).faqs as { question: string; answer: string }[] | undefined;

  const steps = [
    {
      done: true,
      title: "Business profile created",
      desc: `${business.name} · ${business.industry ?? "business"}`,
      href: "/settings",
      cta: "Edit",
    },
    {
      done: !!(faqs && faqs.length > 0),
      title: "FAQs added",
      desc: faqs && faqs.length > 0 ? `${faqs.length} question${faqs.length === 1 ? "" : "s"} ${agent} can answer` : `Teach ${agent} your common questions`,
      href: "/settings/faqs",
      cta: faqs && faqs.length > 0 ? "Manage" : "Add FAQs",
    },
    {
      done: !!business.google_calendar_id,
      title: "Google Calendar connected",
      desc: business.google_calendar_id ? "Bookings sync automatically" : "So bookings land on your calendar",
      href: "/settings/integrations",
      cta: business.google_calendar_id ? "Connected" : "Connect",
    },
    {
      done: !!business.twilio_phone_number,
      title: "Phone number or website widget",
      desc: business.twilio_phone_number ? business.twilio_phone_number : "A way for customers to reach you",
      href: "/settings/integrations",
      cta: business.twilio_phone_number ? "Manage" : "Set up",
    },
    {
      done: false,
      title: "Receive your first call",
      desc: "Place a test call to see the dashboard come alive",
      href: "#",
      cta: "Test call",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <>
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────── */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 pill w-fit text-helio mb-3">
              <span className="status-dot bg-helio animate-pulse" /> {agent} is live · waiting for your first call
            </div>
            <h1 className="text-3xl font-display font-medium">Welcome to Helio</h1>
            <p className="text-helio-mute text-sm mt-1">{business.name}</p>
          </div>
          <button className="btn-primary" onClick={() => setShowDemo(true)}>
            <PhoneCall className="h-4 w-4 mr-1" /> Test call
          </button>
        </div>

        {/* ── Getting started checklist ──────────── */}
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-helio" />
              <div className="text-sm font-medium">Get your first call</div>
            </div>
            <div className="text-xs text-helio-mute tabular-nums">{completed} of {steps.length} done</div>
          </div>
          <div className="h-1.5 rounded-full bg-helio-edge overflow-hidden mt-3 mb-5">
            <div className="h-full rounded-full bg-helio transition-all" style={{ width: `${pct}%` }} />
          </div>

          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.title} className="flex items-center gap-3 panel-soft p-3">
                <div className={
                  "h-6 w-6 shrink-0 rounded-full grid place-items-center " +
                  (s.done ? "bg-helio text-helio-ink" : "border border-helio-edge text-helio-mute")
                }>
                  {s.done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-helio-mute" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={"text-sm " + (s.done ? "text-helio-mute line-through" : "font-medium")}>{s.title}</div>
                  <div className="text-xs text-helio-mute truncate">{s.desc}</div>
                </div>
                {s.cta === "Test call" ? (
                  <button onClick={() => setShowDemo(true)} className="btn-ghost text-xs py-1.5 px-3 shrink-0">{s.cta}</button>
                ) : s.done && s.cta === "Connected" ? (
                  <span className="pill text-[10px] text-helio shrink-0">Connected</span>
                ) : (
                  <Link href={s.href} className="btn-ghost text-xs py-1.5 px-3 shrink-0">{s.cta}</Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Zero KPI strip ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ZeroKpi label="Calls answered" value="0" hint="No calls yet" />
          <ZeroKpi label="Bookings" value="0" hint="0% conversion" />
          <ZeroKpi label="Revenue recovered" value="₹0" hint="Starts after your first booking" />
          <ZeroKpi label="Avg call" value="—" hint="No data yet" />
        </div>

        {/* ── Empty activity panels ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="panel p-8 lg:col-span-2 flex flex-col items-center justify-center text-center min-h-[260px]">
            <div className="h-14 w-14 rounded-2xl bg-helio/10 grid place-items-center mb-4">
              <TrendingUp className="h-7 w-7 text-helio" />
            </div>
            <div className="text-base font-medium">Your dashboard comes alive after the first call</div>
            <p className="text-sm text-helio-mute mt-1 max-w-md">
              Once {agent} starts answering, you’ll see call volume, conversion, busy hours,
              and revenue recovered — all updating in real time.
            </p>
            <button className="btn-primary mt-5" onClick={() => setShowDemo(true)}>
              <PhoneCall className="h-4 w-4 mr-1" /> Place a test call
            </button>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="h-4 w-4 text-helio" />
              <div className="text-sm font-medium">{agent}’s setup</div>
            </div>
            <ConfigRow icon={MessageCircle} label="Greeting" value={business.greeting_message ? "Ready" : "Default"} ok={!!business.greeting_message} />
            <ConfigRow icon={CalendarClock} label="Working hours" value={`${(business.working_hours ?? []).filter((h) => !h.closed).length} days/week`} ok />
            <ConfigRow icon={Calendar} label="Calendar" value={business.google_calendar_id ? "Connected" : "Not connected"} ok={!!business.google_calendar_id} />
            <ConfigRow icon={Phone} label="Phone" value={business.twilio_phone_number ?? "Widget only"} ok={!!business.twilio_phone_number} />
            <ConfigRow icon={Sparkles} label="FAQs" value={`${faqs?.length ?? 0} added`} ok={!!(faqs && faqs.length)} />
          </div>
        </div>

        {/* ── Empty lists ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EmptyList
            icon={PhoneIncoming}
            title="Recent calls"
            line="No calls yet"
            sub={`When ${agent} answers a call, it’ll show up here with a full transcript.`}
          />
          <EmptyList
            icon={CalendarClock}
            title="Upcoming appointments"
            line="No bookings yet"
            sub="Appointments booked by your receptionist appear here automatically."
            action={{ label: "View appointments", href: "/appointments" }}
          />
        </div>
      </div>

      {showDemo && (
        <DemoCallModal
          businessId={business.id}
          agentName={agent}
          onClose={() => setShowDemo(false)}
        />
      )}
    </>
  );
}

function ZeroKpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-wide text-helio-mute">{label}</div>
      <div className="mt-2 text-3xl font-display font-medium tabular-nums text-helio-mute">{value}</div>
      <div className="mt-1 text-xs text-helio-mute">{hint}</div>
    </div>
  );
}

function ConfigRow({ icon: Icon, label, value, ok }: { icon: any; label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 border-t border-helio-edge first:border-t-0">
      <Icon className="h-4 w-4 text-helio-mute shrink-0" />
      <span className="text-xs text-helio-mute flex-1">{label}</span>
      <span className={"text-xs truncate max-w-[55%] text-right " + (ok ? "text-helio" : "text-helio-mute")}>{value}</span>
    </div>
  );
}

function EmptyList({
  icon: Icon, title, line, sub, action,
}: {
  icon: any; title: string; line: string; sub: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="panel p-5">
      <div className="text-sm font-medium mb-4">{title}</div>
      <div className="flex flex-col items-center justify-center text-center py-8">
        <div className="h-12 w-12 rounded-xl bg-helio-surface grid place-items-center mb-3">
          <Icon className="h-6 w-6 text-helio-mute" />
        </div>
        <div className="text-sm font-medium">{line}</div>
        <p className="text-xs text-helio-mute mt-1 max-w-xs">{sub}</p>
        {action && (
          <Link href={action.href} className="text-xs text-helio inline-flex items-center gap-1 mt-3">
            {action.label} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
