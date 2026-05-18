"use client";

import useSWR from "swr";
import { api } from "@/lib/api";

export function useCallLogs(businessId?: string, page = 1, outcome?: string) {
  return useSWR(
    businessId ? ["calls", businessId, page, outcome] : null,
    () => api.callHistory(businessId!, page, outcome)
  );
}

export function useTodayCalls(businessId?: string) {
  return useSWR(
    businessId ? ["calls-today", businessId] : null,
    () => api.callsToday(businessId!)
  );
}
