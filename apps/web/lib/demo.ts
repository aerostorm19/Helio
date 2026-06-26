import type { Business } from "@/lib/supabase/types";

// The canned showcase business (rich mock data) vs a real onboarded user
// (starts empty). The "View live dashboard" demo uses id "demo-biz".
export function isShowcaseBusiness(business?: Business | null): boolean {
  if (!business) return true;
  return business.id === "demo-biz";
}

// A user who completed onboarding gets a fresh, empty account.
export function isNewUser(business?: Business | null): boolean {
  return !isShowcaseBusiness(business);
}

// Patch the locally-stored demo business and return the updated copy.
export function updateLocalBusiness(patch: Partial<Business>): Business | null {
  try {
    const stored = localStorage.getItem("helio.business");
    if (!stored) return null;
    const business = { ...(JSON.parse(stored) as Business), ...patch, updated_at: new Date().toISOString() };
    localStorage.setItem("helio.business", JSON.stringify(business));
    return business;
  } catch {
    return null;
  }
}

// Demo-mode "Connect Google Calendar": mark the locally-stored business as
// connected so the UI reflects it (no real OAuth/backend needed).
export function markCalendarConnected(): Business | null {
  return updateLocalBusiness({
    google_calendar_id: "primary",
    google_calendar_token_expiry: new Date(Date.now() + 3600_000).toISOString(),
  });
}
