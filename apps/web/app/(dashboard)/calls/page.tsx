"use client";

import { useMemo, useState } from "react";
import { useBusiness } from "@/hooks/useBusiness";
import { useCallLogs } from "@/hooks/useCallLogs";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { mockRecentCalls } from "@/lib/mock";
import { isShowcaseBusiness } from "@/lib/demo";
import { formatDuration, relativeTime } from "@/lib/utils";
import { Search, Download, Phone, PhoneIncoming } from "lucide-react";

const SHOWCASE_COUNTS: Record<string, number> = {
  all: 427, booked: 312, faq_answered: 76, escalated: 18, missed: 21,
};

export default function CallsPage() {
  const { data: business } = useBusiness();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const { data } = useCallLogs(business?.id, page, filter);

  const showcase = isShowcaseBusiness(business);

  const FILTERS = [
    { value: "all",          label: "All" },
    { value: "booked",       label: "Booked" },
    { value: "faq_answered", label: "FAQ" },
    { value: "escalated",    label: "Escalated" },
    { value: "missed",       label: "Missed" },
  ].map((f) => ({ ...f, count: showcase ? SHOWCASE_COUNTS[f.value] : 0 }));

  const calls = useMemo(() => {
    // Real users start with no calls; the canned demo shows mock history.
    const base = data?.items?.length
      ? data.items
      : showcase
        ? [...mockRecentCalls(), ...mockRecentCalls().map((c, i) => ({ ...c, id: c.id + "-b" + i }))]
        : [];
    const filtered = filter === "all" ? base : base.filter((c: any) => c.outcome === filter);
    if (!q) return filtered;
    return filtered.filter((c: any) => (c.caller_name + " " + c.caller_number).toLowerCase().includes(q.toLowerCase()));
  }, [data, filter, q, showcase]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium">Call history</h1>
          <p className="text-helio-mute text-sm mt-1">Every call your AI receptionist has handled.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost"><Download className="h-4 w-4 mr-1" /> Export</button>
          <button className="btn-primary"><Phone className="h-4 w-4 mr-1" /> Place test call</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="panel-soft flex items-center gap-2 px-3 py-2 flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-helio-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search caller or number"
            className="bg-transparent text-sm w-full focus:outline-none" />
        </div>
        <div className="flex gap-1 panel-soft p-1">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
              className={"px-3 py-1.5 text-xs rounded-full flex items-center gap-1.5 " +
                (filter === f.value ? "bg-helio text-helio-ink" : "text-helio-mute hover:text-foreground")}>
              {f.label}
              <span className={"text-[10px] tabular-nums rounded-full px-1.5 " +
                (filter === f.value ? "bg-helio-ink/20" : "bg-helio-edge")}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wide text-helio-mute border-b border-helio-edge">
          <div className="col-span-4">Caller</div>
          <div className="col-span-2">Outcome</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-2">When</div>
          <div className="col-span-2 text-right">Tags</div>
        </div>
        {calls.map((c: any) => (
          <a key={c.id} href={`/calls/${c.id}`}
            className="grid grid-cols-12 px-5 py-3 items-center hover:bg-helio-surface/50 border-b border-helio-edge last:border-b-0">
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-helio-surface grid place-items-center text-sm">
                {(c.caller_name ?? "?").slice(0,1)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{c.caller_name ?? "Unknown"}</div>
                <div className="text-xs text-helio-mute truncate">{c.caller_number}</div>
              </div>
            </div>
            <div className="col-span-2"><StatusBadge outcome={c.outcome} /></div>
            <div className="col-span-2 text-sm tabular-nums">{formatDuration(c.duration_seconds)}</div>
            <div className="col-span-2 text-sm text-helio-mute">{relativeTime(c.started_at)}</div>
            <div className="col-span-2 flex justify-end gap-1">
              {c.had_booking    && <span className="pill text-[10px] text-helio">Booked</span>}
              {c.was_escalated  && <span className="pill text-[10px] text-amber-300">Escalated</span>}
            </div>
          </a>
        ))}
        {calls.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="h-12 w-12 rounded-xl bg-helio-surface grid place-items-center mb-3">
              <PhoneIncoming className="h-6 w-6 text-helio-mute" />
            </div>
            <div className="text-sm font-medium">
              {q || filter !== "all" ? "No matching calls" : "No calls yet"}
            </div>
            <p className="text-xs text-helio-mute mt-1 max-w-xs">
              {q || filter !== "all"
                ? "Try a different search or filter."
                : `When ${business?.agent_name || "Maya"} answers a call, it’ll appear here with a full transcript.`}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-helio-mute">
        <div>{calls.length} shown</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} className="btn-ghost py-1.5 px-3 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <button className="btn-ghost py-1.5 px-3" onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
