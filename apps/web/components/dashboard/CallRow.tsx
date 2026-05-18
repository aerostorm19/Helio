import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { formatDuration, relativeTime } from "@/lib/utils";
import type { Call } from "@/lib/supabase/types";

export default function CallRow({ call }: { call: Call }) {
  return (
    <Link href={`/calls/${call.id}`} className="grid grid-cols-12 items-center gap-2 px-4 py-3 hover:bg-helio-surface/50 border-b border-helio-edge last:border-b-0">
      <div className="col-span-4 truncate">
        <div className="text-sm font-medium">{call.caller_number || "Unknown"}</div>
        <div className="text-xs text-helio-mute">{relativeTime(call.started_at)}</div>
      </div>
      <div className="col-span-3"><StatusBadge outcome={call.outcome} /></div>
      <div className="col-span-2 text-sm text-helio-mute">{formatDuration(call.duration_seconds)}</div>
      <div className="col-span-3 text-right text-xs text-helio-mute">
        {call.was_escalated && "Escalated · "}{call.had_booking && "Booked"}
      </div>
    </Link>
  );
}
