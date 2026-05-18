// Generated DB types — replace with output of:
//   supabase gen types typescript --linked > lib/supabase/types.ts

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Business {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  industry: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  twilio_phone_number: string | null;
  whatsapp_number: string | null;
  agent_name: string;
  greeting_message: string | null;
  escalation_phone: string | null;
  after_hours_message: string | null;
  agent_enabled: boolean;
  after_hours_mode: boolean;
  whatsapp_confirmations: boolean;
  email_confirmations: boolean;
  escalation_alerts: boolean;
  working_hours: WorkingHour[];
  services: Service[];
  created_at: string;
  updated_at: string;
}

export interface WorkingHour {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface Service {
  name: string;
  duration_minutes: number;
  price: number;
}

export interface FAQ {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  business_id: string;
  caller_number: string | null;
  caller_name: string | null;
  twilio_call_sid: string | null;
  call_direction: string;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  outcome_detail: string | null;
  transcript: TranscriptMessage[] | null;
  was_escalated: boolean;
  had_booking: boolean;
}

export interface TranscriptMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  call_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  service: string;
  scheduled_at: string;
  duration_minutes: number;
  notes: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  google_calendar_event_id: string | null;
  confirmation_sent_at: string | null;
  confirmation_channel: string | null;
  created_at: string;
  updated_at: string;
}
