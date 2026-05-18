const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[api] ${path} ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[api] ${path} unreachable`, e);
    return null;
  }
}

export const api = {
  // Dashboard
  overview:    (id: string) => request<any>(`/dashboard/${id}/overview`),
  weekStats:   (id: string) => request<any[]>(`/dashboard/${id}/stats/week`),
  callHistory: (id: string, page = 1, outcome?: string) =>
    request<any>(`/dashboard/${id}/calls?page=${page}${outcome && outcome !== "all" ? `&outcome=${outcome}` : ""}`),
  callsToday:  (id: string) => request<any[]>(`/dashboard/${id}/calls/today`),

  // Calls
  call:        (callId: string) => request<any>(`/call/${callId}`),

  // Booking
  upcoming:    (id: string)  => request<any[]>(`/booking/upcoming/${id}`),
  availability:(body: any)   => request<any>(`/booking/availability`, { method: "POST", body: JSON.stringify(body) }),
  cancel:      (apptId: string) => request<any>(`/booking/${apptId}/cancel`, { method: "PUT" }),
  confirm:     (apptId: string) => request<any>(`/booking/${apptId}/confirm`, { method: "PUT" }),

  // Business
  business:    (id: string) => request<any>(`/business/${id}`),
  updateBusiness: (id: string, body: any) =>
    request<any>(`/business/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  listFaqs:    (id: string) => request<any[]>(`/business/${id}/faqs`),
  addFaq:      (id: string, body: any) =>
    request<any>(`/business/${id}/faqs`, { method: "POST", body: JSON.stringify(body) }),
  updateFaq:   (bizId: string, faqId: string, body: any) =>
    request<any>(`/business/${bizId}/faqs/${faqId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteFaq:   (bizId: string, faqId: string) =>
    request<any>(`/business/${bizId}/faqs/${faqId}`, { method: "DELETE" }),
};
