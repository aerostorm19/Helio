"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Phone, Calendar, Settings, MessageSquare, PlugZap, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/overview",          label: "Overview",       icon: LayoutDashboard },
  { href: "/calls",             label: "Call history",   icon: Phone },
  { href: "/appointments",      label: "Appointments",   icon: Calendar },
];

const settings = [
  { href: "/settings",              label: "General",       icon: Settings },
  { href: "/settings/faqs",         label: "FAQs",          icon: MessageSquare },
  { href: "/settings/integrations", label: "Integrations",  icon: PlugZap },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-64 shrink-0 border-r border-helio-edge bg-helio-panel/60 p-5 hidden md:flex md:flex-col gap-6">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-helio grid place-items-center text-helio-ink font-bold">H</div>
        <div>
          <div className="font-semibold leading-none">Helio</div>
          <div className="text-xs text-helio-mute">AI Receptionist</div>
        </div>
      </div>

      <nav className="space-y-1">
        {nav.map((item) => (
          <Link key={item.href} href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              path?.startsWith(item.href)
                ? "bg-helio-surface text-foreground"
                : "text-helio-mute hover:bg-helio-surface/60 hover:text-foreground"
            )}>
            <item.icon className="h-4 w-4" />{item.label}
          </Link>
        ))}
      </nav>

      <div>
        <div className="px-3 text-xs uppercase tracking-wide text-helio-mute mb-2">Settings</div>
        <nav className="space-y-1">
          {settings.map((item) => (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                path === item.href
                  ? "bg-helio-surface text-foreground"
                  : "text-helio-mute hover:bg-helio-surface/60 hover:text-foreground"
              )}>
              <item.icon className="h-4 w-4" />{item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto">
        <Link href="/login" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-helio-mute hover:bg-helio-surface/60">
          <LogOut className="h-4 w-4" /> Sign out
        </Link>
      </div>
    </aside>
  );
}
