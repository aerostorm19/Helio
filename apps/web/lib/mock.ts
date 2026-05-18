// Mock data so dashboard renders without backend running.
// Pure functions, deterministic-ish, vary by clock minute for liveliness.

const PHRASES = [
  "Hi! Want to book a haircut tomorrow?",
  "What are your weekend hours?",
  "Need to reschedule my facial.",
  "Do you do home tutoring?",
  "Can I speak to someone?",
  "Is the salon open on Sunday?",
  "How much for a beard trim?",
  "I have a complaint about my last visit.",
];

const NAMES = ["Priya Sharma","Aarav Patel","Ananya Iyer","Rohan Kapoor","Saanvi Reddy","Ishaan Mehta","Diya Joshi","Vivaan Singh","Aanya Verma","Kabir Nair"];
const SERVICES = ["Haircut","Hair Color","Facial","Beard Trim","Consultation","Manicure","Pedicure","Massage"];
const OUTCOMES = ["booked","faq_answered","escalated","missed","dropped"] as const;

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

export function mockOverview() {
  return {
    calls_this_month: 427,
    bookings: 312,
    conversion_pct: 73.1,
    escalations: 18,
    avg_call_seconds: 94,
    revenue_recovered: 156800, // rupees
    answered_after_hours: 89,
    total_minutes: 668,
  };
}

export function mockWeek() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    const seed = hash(d.toDateString());
    const calls = 35 + (seed % 40);
    const bookings = Math.floor(calls * (0.55 + ((seed >> 4) % 30) / 100));
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      calls,
      bookings,
      missed: Math.max(0, calls - bookings - Math.floor(calls * 0.2)),
    };
  });
}

export function mockOutcomeBreakdown() {
  return [
    { name: "Booked",       value: 312, color: "#A6FF4D" },
    { name: "FAQ answered", value: 76,  color: "#7BC4FF" },
    { name: "Escalated",    value: 18,  color: "#FFB547" },
    { name: "Missed",       value: 21,  color: "#FF6B6B" },
  ];
}

// 7 days x 24 hours heatmap
export function mockHeatmap() {
  const rows: { day: string; hours: number[] }[] = [];
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  for (const day of days) {
    const hours: number[] = [];
    for (let h = 0; h < 24; h++) {
      const seed = hash(day + h);
      const base = h < 9 || h > 21 ? 0.05 : 0.7;
      hours.push(Math.round(base * (5 + (seed % 12))));
    }
    rows.push({ day, hours });
  }
  return rows;
}

export function mockRecentCalls() {
  const now = Date.now();
  return Array.from({ length: 8 }, (_, i) => {
    const seed = hash("call" + i);
    const outcome = OUTCOMES[seed % OUTCOMES.length];
    const minsAgo = i * 7 + (seed % 5);
    return {
      id: `mock-${i}`,
      business_id: "mock-biz",
      caller_number: `+91 9${(seed % 900000000 + 100000000)}`,
      caller_name: NAMES[seed % NAMES.length],
      twilio_call_sid: null,
      call_direction: "inbound",
      started_at: new Date(now - minsAgo * 60_000).toISOString(),
      answered_at: null,
      ended_at: null,
      duration_seconds: 30 + (seed % 240),
      outcome,
      outcome_detail: null,
      transcript: null,
      was_escalated: outcome === "escalated",
      had_booking: outcome === "booked",
    };
  });
}

export function mockUpcomingAppointments() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const seed = hash("appt" + i);
    const d = new Date(now);
    d.setDate(d.getDate() + (i % 7));
    d.setHours(9 + (seed % 10), (seed % 2) * 30, 0, 0);
    return {
      id: `mock-appt-${i}`,
      business_id: "mock-biz",
      call_id: null,
      customer_name: NAMES[seed % NAMES.length],
      customer_phone: `+91 9${(seed % 900000000 + 100000000)}`,
      customer_email: null,
      service: SERVICES[seed % SERVICES.length],
      scheduled_at: d.toISOString(),
      duration_minutes: [30,45,60,90][seed % 4],
      notes: null,
      status: "confirmed",
      google_calendar_event_id: null,
      confirmation_sent_at: new Date().toISOString(),
      confirmation_channel: ["whatsapp","email"][seed % 2],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

export function mockLiveFeed() {
  const events = [
    { type: "booked",   text: "Priya booked Haircut for tomorrow 3:00 PM",   color: "helio" },
    { type: "faq",      text: "Answered: weekend hours",                     color: "blue" },
    { type: "booked",   text: "Rohan booked Beard Trim for Saturday",        color: "helio" },
    { type: "missed",   text: "Caller hung up after 4s",                     color: "red" },
    { type: "escalated",text: "Forwarded to owner — complaint",              color: "amber" },
    { type: "booked",   text: "Ananya booked Facial for Friday 5:30 PM",     color: "helio" },
    { type: "wa",       text: "WhatsApp confirmation sent to Saanvi",        color: "muted" },
    { type: "booked",   text: "Vivaan rescheduled to Sunday 11:00 AM",       color: "helio" },
  ];
  return events.map((e, i) => ({ ...e, at: new Date(Date.now() - i * 3 * 60_000).toISOString() }));
}

export function mockTopFaqs() {
  return [
    { q: "What are your weekend hours?",      hits: 47 },
    { q: "Do you take walk-ins?",             hits: 32 },
    { q: "How much is a basic haircut?",      hits: 28 },
    { q: "Where exactly are you located?",    hits: 19 },
    { q: "Do you accept UPI payments?",       hits: 14 },
  ];
}

export function mockServicesBreakdown() {
  return [
    { name: "Haircut",     count: 142, fill: "#A6FF4D" },
    { name: "Hair Color",  count: 67,  fill: "#7FE336" },
    { name: "Facial",      count: 54,  fill: "#5CC228" },
    { name: "Beard Trim",  count: 31,  fill: "#3D9C18" },
    { name: "Other",       count: 18,  fill: "#22291F" },
  ];
}

export function mockSparkline(seed: string, n = 14): { x: number; y: number }[] {
  const h = hash(seed);
  return Array.from({ length: n }, (_, i) => ({
    x: i,
    y: 10 + ((h >> i) & 31) + Math.sin(i + h) * 6,
  }));
}
