"use client";

import { useBusiness } from "@/hooks/useBusiness";
import { Bell, Search } from "lucide-react";

export default function Topbar() {
  const { data: business } = useBusiness();
  const enabled = business?.agent_enabled ?? true;

  return (
    <header className="sticky top-0 z-20 border-b border-helio-edge bg-helio-ink/70 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="text-sm text-helio-mute">{business?.name ?? "Your business"}</div>
          <div className={`pill ${enabled ? "text-helio" : "text-red-300"}`}>
            <span className={`status-dot ${enabled ? "bg-helio" : "bg-red-400"}`} />
            {enabled ? "Live" : "Paused"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 panel-soft px-3 py-1.5 text-sm text-helio-mute">
            <Search className="h-4 w-4" /> Search
          </div>
          <button className="btn-ghost px-2.5 py-2"><Bell className="h-4 w-4" /></button>
        </div>
      </div>
    </header>
  );
}
