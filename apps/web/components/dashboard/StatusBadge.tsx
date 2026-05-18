import { cn, outcomeColor } from "@/lib/utils";

export default function StatusBadge({ outcome }: { outcome?: string | null }) {
  const label =
    outcome === "booked"       ? "Booked"
    : outcome === "faq_answered" ? "FAQ"
    : outcome === "escalated"  ? "Escalated"
    : outcome === "missed"     ? "Missed"
    : outcome === "dropped"    ? "Dropped"
    : "Unknown";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", outcomeColor(outcome))}>
      {label}
    </span>
  );
}
