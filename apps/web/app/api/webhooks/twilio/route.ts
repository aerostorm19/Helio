// Optional proxy: forwards Twilio webhooks from Vercel → Railway FastAPI.
// In production, point Twilio directly at FastAPI to remove a network hop.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function forward(req: Request, subPath: string) {
  const body = await req.text();
  const url = `${API_BASE}/call/${subPath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": req.headers.get("content-type") || "application/x-www-form-urlencoded" },
    body,
  });
  const xml = await res.text();
  return new Response(xml, {
    status: res.status,
    headers: { "Content-Type": "application/xml" },
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const sub = url.searchParams.get("path") || "incoming";
  return forward(req, sub);
}
