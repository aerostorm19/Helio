"use client";

import Sparkline from "./Sparkline";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function KpiCard({
  label, value, delta, deltaPositive = true, spark, accent = false, suffix,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  spark?: { x: number; y: number }[];
  accent?: boolean;
  suffix?: string;
}) {
  return (
    <div className={cn(
      "panel relative p-5 overflow-hidden group transition",
      accent && "ring-1 ring-helio/30 bg-gradient-to-br from-helio/15 via-helio/5 to-transparent"
    )}>
      <div className="text-xs uppercase tracking-wide text-helio-mute">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className={cn("text-3xl font-display font-medium tabular-nums", accent && "text-helio")}>
          {value}
        </div>
        {suffix && <div className="text-sm text-helio-mute">{suffix}</div>}
      </div>
      {delta && (
        <div className={cn(
          "mt-1 inline-flex items-center gap-1 text-xs",
          deltaPositive ? "text-helio" : "text-red-400"
        )}>
          {deltaPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </div>
      )}
      {spark && (
        <div className="mt-3 -mb-2 -mx-2 opacity-90 group-hover:opacity-100">
          <Sparkline data={spark} color={accent ? "#A6FF4D" : "#7E8A75"} height={44} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-helio/30 to-transparent opacity-50" />
    </div>
  );
}
