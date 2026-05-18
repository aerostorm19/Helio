import type { TranscriptMessage } from "@/lib/supabase/types";

export default function TranscriptViewer({ transcript }: { transcript: TranscriptMessage[] | null }) {
  if (!transcript || transcript.length === 0) {
    return <div className="text-sm text-helio-mute">No transcript captured.</div>;
  }
  return (
    <div className="space-y-3">
      {transcript.map((m, i) => (
        <div key={i} className={m.role === "assistant" ? "flex justify-start" : "flex justify-end"}>
          <div className={
            "max-w-[80%] rounded-2xl px-4 py-2 text-sm " +
            (m.role === "assistant" ? "bg-helio-surface text-foreground" : "bg-helio text-helio-ink")
          }>
            <div className="text-[10px] uppercase opacity-70 mb-1">
              {m.role === "assistant" ? "Helio" : "Caller"}
            </div>
            {m.content}
          </div>
        </div>
      ))}
    </div>
  );
}
