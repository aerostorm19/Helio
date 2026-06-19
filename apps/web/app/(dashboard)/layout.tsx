"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { useBusiness } from "@/hooks/useBusiness";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: business, isLoading } = useBusiness();
  const router = useRouter();

  const isOnboard = typeof window !== "undefined" && window.location.pathname.startsWith("/onboard");

  useEffect(() => {
    // Auth disabled in demo mode
  }, [business, isLoading, router, isOnboard]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-helio-mute">Loading…</div>
      </div>
    );
  }

  // On onboarding pages, business is null by design — render children without sidebar
  if (!business && isOnboard) {
    return <main className="min-h-screen p-6 lg:p-12">{children}</main>;
  }

  if (!business) return null;

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
