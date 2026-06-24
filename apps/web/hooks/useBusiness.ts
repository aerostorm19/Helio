"use client";

import useSWR from "swr";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Business } from "@/lib/supabase/types";

const DEMO: Business = {
  id: "demo-biz",
  user_id: "demo-user",
  name: "Aarogya Multispeciality Clinic",
  slug: "aarogya-clinic",
  industry: "clinic",
  phone: "+91 98220 44567",
  email: "reception@aarogyaclinic.in",
  address: "Shop 4, Sai Arcade, FC Road, Shivajinagar, Pune – 411005",
  timezone: "Asia/Kolkata",
  twilio_phone_number: "+91 20 6800 0000",
  whatsapp_number: "+91 98220 44567",
  agent_name: "Maya",
  greeting_message: "Namaskar! Thank you for calling Aarogya Multispeciality Clinic. How can I assist you today?",
  escalation_phone: "+91 98220 44567",
  after_hours_message: "Thank you for calling Aarogya Clinic. Our clinic is currently closed. Our timings are Monday to Saturday, 9 AM to 8 PM. Please call back during clinic hours or visit us at FC Road, Shivajinagar, Pune.",
  agent_enabled: true,
  after_hours_mode: false,
  whatsapp_confirmations: true,
  email_confirmations: true,
  escalation_alerts: true,
  working_hours: [
    { day: "monday",    open: "09:00", close: "20:00", closed: false },
    { day: "tuesday",   open: "09:00", close: "20:00", closed: false },
    { day: "wednesday", open: "09:00", close: "20:00", closed: false },
    { day: "thursday",  open: "09:00", close: "20:00", closed: false },
    { day: "friday",    open: "09:00", close: "20:00", closed: false },
    { day: "saturday",  open: "09:00", close: "14:00", closed: false },
    { day: "sunday",    open: "00:00", close: "00:00", closed: true  },
  ],
  services: [
    { name: "General Consultation",      duration_minutes: 20, price: 500  },
    { name: "Paediatric Consultation",   duration_minutes: 20, price: 600  },
    { name: "Gynaecology Consultation",  duration_minutes: 30, price: 700  },
    { name: "Physiotherapy Session",     duration_minutes: 45, price: 800  },
    { name: "Blood Test (Home Sample)",  duration_minutes: 15, price: 300  },
    { name: "ECG",                       duration_minutes: 20, price: 400  },
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
