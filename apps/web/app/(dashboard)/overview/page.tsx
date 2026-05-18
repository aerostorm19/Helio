"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { useBusiness } from "@/hooks/useBusiness";
import KpiCard from "@/components/dashboard/KpiCard";
import CallVolumeChart from "@/components/dashboard/CallVolumeChart";
import OutcomeDonut from "@/components/dashboard/OutcomeDonut";
import CallHeatmap from "@/components/dashboard/CallHeatmap";
import LiveFeed from "@/components/dashboard/LiveFeed";
import AgentHealthCard from "@/components/dashboard/AgentHealthCard";
import TopFaqsCard from "@/components/dashboard/TopFaqsCard";
import ServicesBarCard from "@/components/dashboard/ServicesBarCard";
import UpcomingList from "@/components/dashboard/UpcomingList";
import ConversionRing from "@/components/dashboard/ConversionRing";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatDuration, relativeTime } from "@/lib/utils";
import {
  mockOverview, mockWeek, mockOutcomeBreakdown, mockHeatmap, mockLiveFeed,
  mockTopFaqs, mockServicesBreakdown, mockUpcomingAppointments, mockRecentCalls, mockSparkline,
} from "@/lib/mock";
import { Sparkles, PhoneCall, Pause, ChevronRight } from "lucide-react";

export default function OverviewPage() {
  const { data: business } = useBusiness();
  const id = business?.id;
  const { data: ov }     = useSWR(id ? ["overview", id] : null, () => api.overview(id!));
  const { data: week }   = useSWR(id ? ["week", id] : null,     () => api.weekStats(id!));
  const { data: recent } = useSWR(id ? ["recent", id] : null,   () => api.callHistory(id!, 1));
  const { data: upcoming } = useSWR(id ? ["upcoming", id] : null, () => api.upcoming(id!));

  // Fallback to mock when backend offline so UI showcases full state.
  const m   = ov     ?? mockOverview();
  const w   = (week && week.length) ? week.map((d: any) => ({ ...d, label: d.date.slice(5) })) : mockWeek();
  const recentCalls = (recent?.items?.length ? recent.items : mockRecentCalls()).slice(0, 6);
  const upcomingList = upcoming?.length ? upcoming : mockUpcomingAppointments();
  const outcomes = mockOutcomeBreakdown();
  const heatmap  = mockHeatmap();
  const liveFeed = mockLiveFeed();
  const topFaqs  = mockTopFaqs();
  const services = mockServicesBreakdown();

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 pill w-fit text-helio mb-3">
            <Sparkles className="h-3 w-3" /> Performing 23% above last month
          </div>
          <h1 className="text-3xl font-display font-medium">Overview</h1>
          <p className="text-helio-mute text-sm mt-1">{business?.name ?? "Demo Salon"} · this month</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost"><Pause className="h-4 w-4 mr-1" /> Pause agent</button>
          <button className="btn-primary"><PhoneCall className="h-4 w-4 mr-1" /> Test call</button>
        </div>
      </div>

      {/* ── Hero KPI strip ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Calls answered" value={m.calls_this_month} delta="+24% vs last month" spark={mockSparkline("calls")} accent />
        <KpiCard label="Bookings" value={m.bookings} delta={`${m.conversion_pct}% conversion`} spark={mockSparkline("book")} />
        <KpiCard label="Revenue recovered" value={`₹${(m.revenue_recovered/1000).toFixed(1)}k`} delta="+₹42k vs last month" spark={mockSparkline("rev")} />
        <KpiCard label="Avg call" value={formatDuration(m.avg_call_seconds)} delta="−12s faster" spark={mockSparkline("dur")} />
      </div>

      {/* ── Row 1: big chart + donut ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium">Call volume</div>
              <div className="text-xs text-helio-mute">Calls vs bookings · last 7 days</div>
            </div>
            <div className="flex gap-1 panel-soft p-1 text-[11px]">
              {["7d","30d","90d"].map((p) => (
                <button key={p} className={"px-2.5 py-1 rounded-full " + (p === "7d" ? "bg-helio text-helio-ink" : "text-helio-mute")}>{p}</button>
              ))}
            </div>
          </div>
          <CallVolumeChart data={w} />
        </div>
        <div className="panel p-5">
          <div className="text-sm font-medium">Outcomes</div>
          <div className="text-xs text-helio-mute mb-4">How calls ended</div>
          <OutcomeDonut data={outcomes} />
        </div>
      </div>

      {/* ── Row 2: heatmap + conversion + health ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium">When your phone rings</div>
              <div className="text-xs text-helio-mute">Hourly call density · last 7 days</div>
            </div>
            <span className="pill text-helio-mute text-[10px]">UTC+5:30</span>
          </div>
          <CallHeatmap data={heatmap} />
        </div>

        <div className="panel p-5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium">Conversion</div>
              <div className="text-xs text-helio-mute">Calls → bookings</div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <ConversionRing pct={Math.round(m.conversion_pct)} />
            <div className="flex-1 space-y-2 text-sm">
              <Stat label="After-hours saves" value={`${m.answered_after_hours}`} accent />
              <Stat label="Escalations" value={`${m.escalations}`} />
              <Stat label="Total minutes" value={`${m.total_minutes}m`} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: services + faqs + agent health ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ServicesBarCard data={services} />
        <TopFaqsCard faqs={topFaqs} />
        <AgentHealthCard />
      </div>

      {/* ── Row 4: live feed + upcoming + recent calls ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-5">
          <LiveFeed events={liveFeed} />
        </div>

        <UpcomingList items={upcomingList} />

        <div className="panel">
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="text-sm font-medium">Recent calls</div>
            <a href="/calls" className="text-xs text-helio inline-flex items-center gap-0.5">All <ChevronRight className="h-3 w-3" /></a>
          </div>
          <div>
            {recentCalls.map((c: any) => (
              <a key={c.id} href={`/calls/${c.id}`}
                className="flex items-center gap-3 px-5 py-3 border-t border-helio-edge hover:bg-helio-surface/40">
                <div className="h-9 w-9 rounded-full bg-helio-surface grid place-items-center text-xs">
                  {(c.caller_name ?? "?").slice(0,1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.caller_name ?? c.caller_number}</div>
                  <div className="text-[11px] text-helio-mute">{relativeTime(c.started_at)} · {formatDuration(c.duration_seconds)}</div>
                </div>
                <StatusBadge outcome={c.outcome} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between panel-soft px-3 py-2">
      <span className="text-helio-mute text-xs">{label}</span>
      <span className={"tabular-nums " + (accent ? "text-helio" : "")}>{value}</span>
    </div>
  );
}
