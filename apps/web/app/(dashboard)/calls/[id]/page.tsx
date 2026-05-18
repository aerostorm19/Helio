"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import StatusBadge from "@/components/dashboard/StatusBadge";
import TranscriptViewer from "@/components/dashboard/TranscriptViewer";
import { formatDuration, relativeTime } from "@/lib/utils";
import { mockRecentCalls } from "@/lib/mock";
import { ArrowLeft, Play, Download, MessageCircle } from "lucide-react";
import Link from "next/link";

const MOCK_TRANSCRIPT = [
  { role: "assistant" as const, content: "Thank you for calling Demo Salon. How can I help you today?" },
  { role: "user" as const,      content: "Hi, I'd like to book a haircut for tomorrow." },
  { role: "assistant" as const, content: "Of course! Let me check tomorrow's availability. One moment." },
  { role: "assistant" as const, content: "I have 11 AM, 2 PM, or 4:30 PM available. Which works for you?" },
  { role: "user" as const,      content: "Two PM works." },
  { role: "assistant" as const, content: "Great. Can I get your name and a number to confirm?" },
  { role: "user" as const,      content: "Priya Sharma, nine eight two one one zero zero one zero zero." },
  { role: "assistant" as const, content: "Confirmed — Priya Sharma, haircut tomorrow at 2 PM. I'll send a WhatsApp confirmation. Anything else?" },
  { role: "user" as const,      content: "No, that's it. Thanks!" },
  { role: "assistant" as const, content: "Lovely. See you tomorrow at 2 PM. Have a great day!" },
];

export default function CallDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: backendCall } = useSWR(id && !id.startsWith("mock") ? ["call", id] : null, () => api.call(id));

  const call = backendCall ?? {
    ...mockRecentCalls()[0],
    id,
    transcript: MOCK_TRANSCRIPT,
  };

  return (
    <div className="space-y-6">
      <Link href="/calls" className="text-xs text-helio-mute hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back to calls
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-helio-surface grid place-items-center text-xl font-display">
            {(call.caller_name ?? "?").slice(0, 1)}
          </div>
          <div>
            <h1 className="text-2xl font-display font-medium">{call.caller_name ?? "Unknown caller"}</h1>
            <p className="text-helio-mute text-sm">
              {call.caller_number} · {relativeTime(call.started_at)} · {formatDuration(call.duration_seconds)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge outcome={call.outcome} />
          <button className="btn-ghost"><Play className="h-4 w-4 mr-1" /> Play</button>
          <button className="btn-ghost"><Download className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Transcript</div>
            <span className="text-xs text-helio-mute">{(call.transcript?.length ?? 0)} messages</span>
          </div>
          <TranscriptViewer transcript={call.transcript} />
        </div>

        <div className="space-y-4">
          <div className="panel p-5 space-y-3">
            <div className="text-sm font-medium">Call details</div>
            <Field label="Caller">{call.caller_number || "—"}</Field>
            <Field label="Direction">{call.call_direction}</Field>
            <Field label="Outcome">{call.outcome_detail || call.outcome}</Field>
            <Field label="Twilio SID">{call.twilio_call_sid || "—"}</Field>
            <Field label="Started">{new Date(call.started_at).toLocaleString()}</Field>
          </div>

          {call.had_booking && (
            <div className="panel p-5">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="status-dot bg-helio" /> Booking captured
              </div>
              <div className="text-xs text-helio-mute">Haircut · Tomorrow 2:00 PM</div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <MessageCircle className="h-3 w-3 text-helio" />
                <span className="text-helio-mute">WhatsApp confirmation sent</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-helio-mute tracking-wide">{label}</div>
      <div className="text-sm break-words mt-0.5">{children}</div>
    </div>
  );
}
