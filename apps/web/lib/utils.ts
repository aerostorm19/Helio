import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export function outcomeColor(outcome?: string | null) {
  switch (outcome) {
    case "booked":       return "bg-helio/20 text-helio";
    case "faq_answered": return "bg-blue-500/20 text-blue-300";
    case "escalated":    return "bg-amber-500/20 text-amber-300";
    case "missed":       return "bg-red-500/20 text-red-300";
    case "dropped":      return "bg-helio-edge text-helio-mute";
    default:             return "bg-helio-edge text-helio-mute";
  }
}
