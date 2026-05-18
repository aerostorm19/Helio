import { cn } from "@/lib/utils";

export default function MetricCard({
  label, value, delta, accent = false,
}: { label: string; value: string | number; delta?: string; accent?: boolean }) {
  return (
    <div className={cn("panel p-5", accent && "ring-1 ring-helio/30 bg-helio/10")}>
      <div className="text-xs uppercase tracking-wide text-helio-mute">{label}</div>
      <div className="mt-2 text-3xl font-display font-medium">{value}</div>
      {delta && <div className="mt-1 text-xs text-helio-mute">{delta}</div>}
    </div>
  );
}
