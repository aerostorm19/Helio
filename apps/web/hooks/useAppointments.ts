"use client";

import useSWR from "swr";
import { api } from "@/lib/api";

export function useAppointments(businessId?: string) {
  return useSWR(
    businessId ? ["appointments", businessId] : null,
    () => api.upcoming(businessId!)
  );
}
