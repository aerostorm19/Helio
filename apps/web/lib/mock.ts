// Mock data so dashboard renders without backend running.
// Pure functions, deterministic-ish, vary by clock minute for liveliness.

const PHRASES = [
  "I need to book a general consultation for tomorrow.",
  "What are your Saturday timings?",
  "Can I get a home blood sample collection?",
  "Is Dr. Sharma available on Friday?",
  "I want to reschedule my physiotherapy session.",
  "Do you accept Mediclaim insurance?",
  "How much is the gynaecology consultation?",
  "My mother needs a paediatric appointment urgently.",
];

const NAMES = [
  "Priya Sharma", "Aarav Patel", "Sunita Iyer", "Rohan Deshmukh",
  "Saanvi Reddy", "Rahul Mehta", "Deepa Joshi", "Vivaan Singh",
  "Kavita Verma", "Suresh Nair",
];

const SERVICES = [
  "General Consultation",
  "Paediatric Consultation",
  "Gynaecology Consultation",
  "Physiotherapy Session",
  "Blood Test (Home Sample)",
  "ECG",
];

const OUTCOMES = ["booked", "faq_answered", "escalated", "missed", "dropped"] as const;

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

export function mockOverview() {
  return {
    calls_this_month: 384,
    bookings: 271,
    conversion_pct: 70.6,
    escalations: 14,
    avg_call_seconds: 88,
    revenue_recovered: 135500, // rupees
    answered_after_hours: 63,
    total_minutes: 563,
  };
}

export function mockWeek() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    const seed = hash(d.toDateString());
    const calls = 30 + (seed % 35);
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
    { name: "Booked",       value: 271, color: "#A6FF4D" },
    { name: "FAQ answered", value: 68,  color: "#7BC4FF" },
    { name: "Escalated",    value: 14,  color: "#FFB547" },
    { name: "Missed",       value: 31,  color: "#FF6B6B" },
  ];
}

export function mockHeatmap() {
  const rows: { day: string; hours: number[] }[] = [];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (const day of days) {
    const hours: number[] = [];
    for (let h = 0; h < 24; h++) {
      const seed = hash(day + h);
      const base = h < 9 || h > 20 ? 0.02 : 0.65;
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
      business_id: "demo-biz",
      caller_number: `+91 9${(seed % 900000000 + 100000000)}`,
      caller_name: NAMES[seed % NAMES.length],
      twilio_call_sid: null,
      call_direction: "inbound",
      started_at: new Date(now - minsAgo * 60_000).toISOString(),
      answered_at: null,
      ended_at: null,
      duration_seconds: 30 + (seed % 180),
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
    d.setDate(d.getDate() + (i % 6));
    d.setHours(9 + (seed % 9), (seed % 2) * 30, 0, 0);
    return {
      id: `mock-appt-${i}`,
      business_id: "demo-biz",
      call_id: null,
      customer_name: NAMES[seed % NAMES.length],
      customer_phone: `+91 9${(seed % 900000000 + 100000000)}`,
      customer_email: null,
      service: SERVICES[seed % SERVICES.length],
      scheduled_at: d.toISOString(),
      duration_minutes: [20, 30, 45, 60][seed % 4],
      notes: null,
      status: "confirmed",
      google_calendar_event_id: null,
      confirmation_sent_at: new Date().toISOString(),
      confirmation_channel: ["whatsapp", "email"][seed % 2],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

export function mockLiveFeed() {
  const events = [
    { type: "booked",    text: "Priya booked General Consultation for tomorrow 11:00 AM",  color: "helio"  },
    { type: "faq",       text: "Answered: Do you accept Mediclaim insurance?",              color: "blue"   },
    { type: "booked",    text: "Rohan booked Physiotherapy Session for Saturday 10:30 AM", color: "helio"  },
    { type: "missed",    text: "Caller hung up after 6s",                                  color: "red"    },
    { type: "escalated", text: "Forwarded to doctor — urgent query",                       color: "amber"  },
    { type: "booked",    text: "Sunita booked Blood Test (Home Sample) for Friday 8:00 AM",color: "helio"  },
    { type: "wa",        text: "WhatsApp confirmation sent to Rahul Mehta",                color: "muted"  },
    { type: "booked",    text: "Kavita booked Gynaecology Consultation for Thursday",      color: "helio"  },
  ];
  return events.map((e, i) => ({ ...e, at: new Date(Date.now() - i * 3 * 60_000).toISOString() }));
}

export function mockTopFaqs() {
  return [
    { q: "Do you accept Mediclaim / health insurance?", hits: 54 },
    { q: "What are your Saturday clinic hours?",        hits: 41 },
    { q: "Is home blood sample collection available?",  hits: 33 },
    { q: "How do I reach the FC Road clinic?",          hits: 22 },
    { q: "Do you accept UPI or card payments?",         hits: 17 },
  ];
}

export function mockServicesBreakdown() {
  return [
    { name: "General Consultation",    count: 124, fill: "#A6FF4D" },
    { name: "Physiotherapy",           count: 58,  fill: "#7FE336" },
    { name: "Gynaecology",             count: 44,  fill: "#5CC228" },
    { name: "Paediatric",              count: 29,  fill: "#3D9C18" },
    { name: "Other",                   count: 16,  fill: "#22291F" },
  ];
}

export function mockSparkline(seed: string, n = 14): { x: number; y: number }[] {
  const h = hash(seed);
  return Array.from({ length: n }, (_, i) => ({
    x: i,
    y: 10 + ((h >> i) & 31) + Math.sin(i + h) * 6,
  }));
}
