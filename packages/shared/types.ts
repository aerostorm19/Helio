// Shared types used by both `apps/web` and `apps/api` (TS export only).

export type Industry = "salon" | "clinic" | "tutor" | "repair" | "other";

export type CallOutcome =
  | "booked"
  | "faq_answered"
  | "escalated"
  | "missed"
  | "dropped"
  | "voicemail";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export interface WorkingHour {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  open: string;   // "HH:MM"
  close: string;  // "HH:MM"
  closed: boolean;
}

export interface Service {
  name: string;
  duration_minutes: number;
  price: number;
}
