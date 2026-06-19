"use client";

import useSWR from "swr";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Business } from "@/lib/supabase/types";

const DEMO: Business = {
  id: "demo-biz",
  user_id: "demo-user",
  name: "Demo Salon",
  slug: "demo-salon",
  industry: "salon",
  phone: "+91 98210 10010",
  email: "owner@demosalon.test",
  address: "12 Demo Street, Bengaluru",
  timezone: "Asia/Kolkata",
  twilio_phone_number: "+1 415 555 0100",
  whatsapp_number: "+91 98210 10010",
  agent_name: "Maya",
  greeting_message: "Thank you for calling Demo Salon. How can I help?",
  escalation_phone: "+91 98888 88888",
  after_hours_message: null,
  agent_enabled: true,
  after_hours_mode: false,
  whatsapp_confirmations: true,
  email_confirmations: true,
  escalation_alerts: true,
  working_hours: [
    { day: "monday",    open: "10:00", close: "20:00", closed: false },
    { day: "tuesday",   open: "10:00", close: "20:00", closed: false },
    { day: "wednesday", open: "10:00", close: "20:00", closed: false },
    { day: "thursday",  open: "10:00", close: "20:00", closed: false },
    { day: "friday",    open: "10:00", close: "20:00", closed: false },
    { day: "saturday",  open: "10:00", close: "20:00", closed: false },
    { day: "sunday",    open: "00:00", close: "00:00", closed: true  },
  ],
  services: [
    { name: "Haircut",    duration_minutes: 30, price: 350 },
    { name: "Hair Color", duration_minutes: 90, price: 2500 },
    { name: "Facial",     duration_minutes: 45, price: 900 },
  ],
  google_calendar_id: null,
  google_calendar_access_token: null,
  google_calendar_refresh_token: null,
  google_calendar_token_expiry: null,
  twilio_phone_sid: null,
  meta_waba_id: null,
  meta_phone_number_id: null,
  country_code: "IN",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function useBusiness() {
  return useSWR<Business | null>("current-business", async () => {
    // Demo mode — always return DEMO business
    return DEMO;
  });
}
