"use client";

import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { useBusiness } from "@/hooks/useBusiness";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: business, isLoading } = useBusiness();
  const pathname = usePathname();

  const isOnboard = pathname?.startsWith("/onboard") ?? false;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-helio-mute">Loading…</div>
      </div>
    );
  }

  // Onboard pages don't need the sidebar
  if (isOnboard) {
    return <main className="min-h-screen p-6 lg:p-12">{children}</main>;
  }

  // Show full dashboard (business falls back to DEMO if not set)
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
