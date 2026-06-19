# Helio — Complete Agent Handover Prompt

Copy everything below this line and paste it into a new Claude conversation.

---

You are taking over a production SaaS project called **Helio** — an AI Voice Receptionist for small businesses. The scaffold is fully built and all critical architecture bugs are fixed. Your job is to complete the remaining frontend data wiring, deploy to production, and build the two remaining features (browser widget client + Google Calendar sync-back).

Read this entire document before touching a single file.

---

## 1. WHAT HELIO IS

An AI that answers phone calls for small businesses (salons, clinics, tutors, repair shops). It:
- Answers inbound calls via Twilio
- Books appointments by conversation
- Answers FAQs using pgvector semantic search
- Sends WhatsApp/email booking confirmations
- Escalates to a human when needed
- Provides a business dashboard (Next.js) to see calls, bookings, analytics

**Business model:** Charge $29–49/month. Infrastructure costs ~$32/month at 50 calls/day.

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, SWR |
| Backend | Python 3.11, FastAPI (async + WebSocket) |
| Database | Supabase (PostgreSQL + pgvector, RLS enabled) |
| LLM | Google Gemini 1.5 Flash |
| STT | Twilio built-in (phone calls) · Groq Whisper (browser widget only) |
| TTS | Google Cloud TTS Wavenet `en-IN-Wavenet-D` |
| Telephony | Twilio (pay-as-you-go) |
| Calendar | Google Calendar API v3 (OAuth2 per business) |
| WhatsApp | Meta WhatsApp Business API |
| Email | Resend |
| Vector search | pgvector (768-dim, `text-embedding-004`) |
| Session cache | Upstash Redis (1hr TTL per active call) |
| Backend hosting | Railway |
| Frontend hosting | Vercel |
| File storage | Supabase Storage (public bucket: `tts-cache`) |

---

## 3. MONOREPO STRUCTURE

```
helio/
├── apps/
│   ├── web/                          # Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx         ✅ DONE — real Supabase auth
│   │   │   │   └── register/page.tsx      ✅ DONE — real Supabase signup
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx             ✅ DONE — Sidebar + Topbar shell
│   │   │   │   ├── overview/page.tsx      ⚠️  Uses real API but FALLS BACK to mock
│   │   │   │   ├── calls/page.tsx         ⚠️  Shows mock data if no businessId
│   │   │   │   ├── calls/[id]/page.tsx    ⚠️  Partial — needs auth guard
│   │   │   │   ├── appointments/page.tsx  ⚠️  Shows mock data fallback
│   │   │   │   ├── settings/page.tsx      ⚠️  Form exists, save not wired
│   │   │   │   ├── settings/faqs/page.tsx ⚠️  Editor exists, not wired to API
│   │   │   │   └── settings/integrations/page.tsx  ✅ DONE — real OAuth + Twilio
│   │   │   │   └── onboard/
│   │   │   │       ├── page.tsx           ❌ NOT WIRED — doesn't write to DB
│   │   │   │       ├── calendar/page.tsx  ❌ NOT WIRED
│   │   │   │       ├── faqs/page.tsx      ❌ NOT WIRED
│   │   │   │       └── number/page.tsx    ❌ NOT WIRED
│   │   ├── components/dashboard/          ✅ DONE — all components built
│   │   ├── hooks/
│   │   │   ├── useBusiness.ts     ✅ DONE — real Supabase, falls back to DEMO object
│   │   │   ├── useCallLogs.ts     ✅ DONE — calls real API
│   │   │   └── useAppointments.ts ✅ DONE — calls real API
│   │   └── lib/
│   │       ├── api.ts             ✅ DONE — typed fetch client for FastAPI
│   │       ├── mock.ts            ✅ DONE — fallback mock data
│   │       └── supabase/          ✅ DONE — client + server + types
│   │
│   └── api/                              # FastAPI backend — ALL DONE
│       ├── main.py                        ✅
│       ├── config.py                      ✅
│       ├── routers/
│       │   ├── call.py                    ✅ Full Twilio call loop
│       │   ├── booking.py                 ✅ Appointment CRUD
│       │   ├── business.py                ✅ Onboard, FAQs, OAuth, Twilio buy
│       │   ├── dashboard.py               ✅ Analytics endpoints
│       │   └── widget.py                  ✅ WebSocket backend (server side done)
│       ├── services/
│       │   ├── llm.py                     ✅ Gemini 1.5 Flash, new instance per call
│       │   ├── stt.py                     ✅ Groq Whisper (widget only)
│       │   ├── tts.py                     ✅ Google Cloud TTS + Supabase cache
│       │   ├── calendar.py                ✅ Google Calendar + token refresh
│       │   ├── whatsapp.py                ✅ Meta API + E.164 normalization
│       │   ├── email.py                   ✅ Resend
│       │   ├── confirmations.py           ✅ WA → email orchestrator
│       │   ├── notifications.py           ✅ Owner escalation alerts
│       │   ├── vector_search.py           ✅ pgvector FAQ search
│       │   └── session.py                 ✅ Upstash Redis, 8-msg cap
│       ├── models/
│       │   ├── database.py                ✅ BusinessRepository + Redis cache
│       │   └── schemas.py                 ✅ All Pydantic models
│       ├── tools/
│       │   ├── definitions.py             ✅ 3 Gemini tools
│       │   └── handlers.py                ✅ check_availability, book, escalate
│       └── prompts/system.py              ✅ Dynamic per-business prompt
│
├── supabase/migrations/001_initial_schema.sql  ✅ DONE
├── .env.example                               ✅ All keys documented
└── REMAINING_TASKS.md                         ✅ Detailed task list
```

---

## 4. WHAT IS FULLY WORKING (DO NOT TOUCH)

All of these have been built, reviewed, and verified correct:

### Backend (all production-ready)
- **Full Twilio call loop:** `POST /call/incoming` → session create → TwiML greeting → `POST /call/speech` → Gemini LLM (new model per call, correct `system_instruction`) → tool execution → TTS → TwiML response → loop
- **Gemini integration:** New `GenerativeModel` instance per call with dynamic system prompt. Escalation detected via tool call only (no text heuristics).
- **FAQ semantic search:** Embeddings generated on FAQ save (`text-embedding-004`, 768-dim). Injected into system prompt per turn via pgvector cosine search.
- **Google Calendar:** OAuth exchange, freebusy queries, event creation, event deletion (on cancel). Token refresh saves back to DB automatically.
- **WhatsApp confirmations:** E.164 phone normalization via `phonenumbers` lib. WA → email fallback orchestration.
- **Session management:** Upstash Redis, 1hr TTL, 8-message history cap, 5-min business config cache.
- **Twilio signature validation:** All webhooks validate `X-Twilio-Signature` (bypassed in dev mode).
- **After-hours enforcement:** Hard code check at call start, not just in prompt.
- **Escalation:** `escalate_to_human` tool call → `<Dial>` TwiML to business's escalation phone.
- **Background tasks:** `BackgroundTasks` used everywhere, no `asyncio.create_task()` for confirmations.
- **Async wrappers:** All sync Google API clients wrapped in `asyncio.to_thread()`.
- **BusinessRepository:** All DB queries scoped by `business_id` to prevent data leaks.
- **Dashboard analytics:** `/dashboard/{id}/overview` returns real calculated KPIs including revenue recovered, after-hours saves, total minutes.

### Frontend
- **Auth pages:** Login and register call real Supabase (`signInWithPassword`, `signUp`).
- **`useBusiness` hook:** Fetches real Supabase data, falls back to DEMO object if no session.
- **`useCallLogs` hook:** Calls real FastAPI `/dashboard/{id}/calls`.
- **`useAppointments` hook:** Calls real FastAPI `/booking/upcoming/{id}`.
- **`lib/api.ts`:** Complete typed fetch client for all FastAPI endpoints.
- **Integrations page:** Google Calendar OAuth redirect flow, Twilio number list + purchase, widget embed code — all wired.
- **All dashboard UI components:** Built and styled (KpiCard, CallVolumeChart, TranscriptViewer, AppointmentCalendar, etc.) — just need real data passed in.

---

## 5. DATABASE SCHEMA (Key tables)

```sql
businesses (
  id UUID PK, user_id UUID FK auth.users,
  name, slug UNIQUE, industry, phone, email, address,
  timezone DEFAULT 'Asia/Kolkata', country_code DEFAULT 'IN',
  twilio_phone_number, twilio_phone_sid,
  whatsapp_number, meta_waba_id, meta_phone_number_id,
  google_calendar_id, google_calendar_access_token,
  google_calendar_refresh_token, google_calendar_token_expiry,
  google_channel_id,  -- for Calendar Push Notifications
  agent_name DEFAULT 'Maya', greeting_message, escalation_phone,
  after_hours_message, agent_enabled DEFAULT true,
  after_hours_mode DEFAULT false,
  whatsapp_confirmations DEFAULT true, email_confirmations DEFAULT true,
  working_hours JSONB,  -- [{"day":"monday","open":"10:00","close":"20:00","closed":false}]
  services JSONB,       -- [{"name":"Haircut","duration_minutes":30,"price":350}]
  created_at, updated_at
)

faqs (
  id UUID PK, business_id UUID FK,
  question TEXT, answer TEXT,
  embedding vector(768),  -- pgvector, null until generated
  is_active BOOLEAN DEFAULT true, sort_order INT DEFAULT 0
)

calls (
  id UUID PK, business_id UUID FK,
  caller_number TEXT, twilio_call_sid TEXT UNIQUE,
  started_at, answered_at, ended_at, duration_seconds INT,
  outcome TEXT,  -- 'booked'|'faq_answered'|'escalated'|'missed'|'dropped'
  transcript JSONB,  -- [{"role":"user"|"assistant","content":"..."}]
  was_escalated BOOLEAN, had_booking BOOLEAN
)

appointments (
  id UUID PK, business_id UUID FK, call_id UUID FK,
  customer_name, customer_phone, customer_email,
  service TEXT, scheduled_at TIMESTAMPTZ,
  duration_minutes INT, status TEXT DEFAULT 'confirmed',
  -- 'pending'|'confirmed'|'cancelled'|'completed'|'no_show'
  google_calendar_event_id TEXT,
  confirmation_sent_at, confirmation_channel,
  UNIQUE(business_id, scheduled_at)  -- prevents double-booking
)
```

RLS is enabled on all tables. Backend uses service role key (bypasses RLS — every query manually scoped by `business_id` via `BusinessRepository`).

---

## 6. ENVIRONMENT VARIABLES

All keys are in `.env.example` at the repo root. Copy to `.env` (backend) and `apps/web/.env.local` (frontend).

```bash
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Backend only

# Google AI
GEMINI_API_KEY=AIza...

# Groq (widget STT only)
GROQ_API_KEY=gsk_...

# Google Cloud (TTS + Calendar)
GOOGLE_CLOUD_PROJECT_ID=helio-prod
GOOGLE_SERVICE_ACCOUNT_BASE64=eyJ...  # base64(service-account.json)
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/settings/integrations
# Production: https://app.tryhelio.com/settings/integrations

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WEBHOOK_BASE_URL=https://your-app.railway.app

# Meta WhatsApp
META_WHATSAPP_TOKEN=EAA...
META_WHATSAPP_VERIFY_TOKEN=helio_verify_2025

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@tryhelio.com

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Frontend public vars (apps/web/.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
# Production: https://your-app.railway.app

APP_ENV=development
```

---

## 7. HOW THE CALL FLOW WORKS

```
Caller dials Twilio number
        ↓
POST /call/incoming  (Twilio webhook)
  → find business by Twilio number
  → create call record in Supabase
  → create Redis session with business config
  → TTS synthesize greeting → upload to Supabase Storage → get public URL
  → return TwiML: <Play>{url}</Play> <Gather input="speech" action="/call/speech">
        ↓
Caller speaks → Twilio transcribes (built-in STT, NOT Whisper)
        ↓
POST /call/speech  (Twilio webhook, SpeechResult in form body)
  → validate Twilio signature
  → load session from Redis
  → if confidence < 0.5 → ask to repeat
  → append user message to session (capped at 8 messages)
  → call Gemini (new GenerativeModel per call, system_instruction=build_system_prompt(business))
  → if tool_calls → execute (check_availability / book_appointment / escalate_to_human)
  → if escalate → return <Dial>{escalation_phone}</Dial> TwiML
  → if farewell → save transcript, delete session, return <Hangup/>
  → TTS synthesize response → Supabase Storage → URL
  → return TwiML: <Play>{url}</Play> <Gather> (loop)
        ↓
POST /call/status  (Twilio: call ended)
  → save final transcript, duration
  → delete Redis session
```

**Key facts:**
- Twilio does STT. Never use Groq Whisper for phone calls. Use it ONLY for browser widget.
- TTS audio must be hosted at a public URL. Twilio fetches by HTTP. Cannot pass raw bytes.
- One `GenerativeModel` instance per call (multi-tenant needs dynamic `system_instruction`).
- Escalation triggers ONLY from `escalate_to_human` tool call — never from text heuristics.
- Confirmations use `FastAPI BackgroundTasks` — not `asyncio.create_task()`.

---

## 8. WHAT IS REMAINING — IN PRIORITY ORDER

---

### TASK 1: Wire frontend pages to real data  
**Time estimate: 2–3 hours**

The pages exist and components are built. They already try to call real APIs and fall back to mock data when the API is unreachable. What's needed:

#### A. Dashboard layout auth guard
File: `apps/web/app/(dashboard)/layout.tsx`

Add a check: if no Supabase session, redirect to `/login`. Currently the layout renders for anyone.

```tsx
// apps/web/app/(dashboard)/layout.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

// At top of component:
const router = useRouter();
useEffect(() => {
  const supabase = createBrowserSupabase();
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) router.replace("/login");
  });
}, []);
```

#### B. Overview page — remove mock fallbacks for charts that never try real data
File: `apps/web/app/(dashboard)/overview/page.tsx`

The page already calls real API (`api.overview`, `api.weekStats`, `api.callHistory`, `api.upcoming`). The KPI cards use real data when available. However `outcomes`, `heatmap`, `liveFeed`, `topFaqs` always use mock. These are lower priority — keep mock for those for now. Focus on making KPI cards show real numbers by ensuring `businessId` comes from real auth (not DEMO object).

The `useBusiness()` hook returns a DEMO object when no auth session. So after auth guard is added to layout, this will naturally start showing real business data.

#### C. Calls page — fix businessId dependency
File: `apps/web/app/(dashboard)/calls/page.tsx`

The `useCallLogs(businessId)` hook is already implemented correctly — it only fetches when `businessId` is truthy. Ensure `businessId` comes from `useBusiness()` hook (not hardcoded). If the hook returns DEMO, calls will fetch against `demo-biz` (which returns empty from the real API). The auth guard fix in Task 1A will fix this automatically.

#### D. Settings General page — wire save button
File: `apps/web/app/(dashboard)/settings/page.tsx`

The form fields exist. Wire the submit handler to call `api.updateBusiness(id, formData)`.

```tsx
async function handleSave() {
  if (!business?.id) return;
  setSaving(true);
  await api.updateBusiness(business.id, {
    name, address, phone, timezone,
    agent_name: agentName,
    greeting_message: greeting,
    escalation_phone: escalationPhone,
    services,
    working_hours: workingHours,
  });
  mutate(); // re-fetch from Supabase
  setSaving(false);
}
```

#### E. Settings FAQs page — wire to real API
File: `apps/web/app/(dashboard)/settings/faqs/page.tsx`

The FAQ editor UI is built. Wire it:
- On mount: fetch `GET /business/{id}/faqs`
- Add FAQ button: `POST /business/{id}/faqs`
- Edit FAQ: `PUT /business/{id}/faqs/{faq_id}`  
- Delete: `DELETE /business/{id}/faqs/{faq_id}`
- Reorder: `POST /business/{id}/faqs/reorder` with `[id1, id2, ...]`
- Show "Embeddings active ✓" badge if any FAQ has `embedding !== null`

#### F. Appointments page — remove hardcoded mock
File: `apps/web/app/(dashboard)/appointments/page.tsx`

The page already calls `api.upcoming(id)`. Ensure it shows the real list. Actions (confirm/cancel) should call `api.confirm(apptId)` and `api.cancel(apptId)`.

---

### TASK 2: Complete onboarding wizard
**Time estimate: 1.5 hours**

Files: `apps/web/app/(dashboard)/onboard/page.tsx` and sub-pages.

The 4-step wizard UI exists but doesn't write to the database. Wire it:

**Step 1** (`onboard/page.tsx`) — Business details form:
```tsx
// On submit:
const res = await fetch(`${API_BASE}/business/onboard`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
  body: JSON.stringify({ name, industry, address, timezone, escalation_phone, services, working_hours, slug: slugify(name) }),
});
const business = await res.json();
// Store business.id in localStorage or context
router.push("/onboard/faqs");
```

**Step 2** (`onboard/faqs/page.tsx`) — Add 3–10 FAQs:
```tsx
// For each FAQ:
await fetch(`${API_BASE}/business/${businessId}/faqs`, {
  method: "POST", body: JSON.stringify({ question, answer })
});
router.push("/onboard/number");
```

**Step 3** (`onboard/number/page.tsx`) — Choose phone or widget:
- If Twilio: show `loadAvailableNumbers()` → pick → `buyNumber()` (same logic as integrations page)
- If widget: show embed code and "I'll do this later" button
- On complete: `router.push("/overview")`

**Step 4** (`onboard/calendar/page.tsx`) — Google Calendar (optional):
- Same OAuth button as integrations page
- Can be skipped

---

### TASK 3: Deploy backend to Railway
**Time estimate: 20 minutes**

```bash
cd apps/api
railway login
railway init    # or railway link if project already exists
railway up
```

Then in Railway dashboard → Variables, set ALL env vars from `.env`.

Critical vars:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`, `GROQ_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_BASE64`
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI=https://app.tryhelio.com/settings/integrations`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `TWILIO_WEBHOOK_BASE_URL=https://your-app.railway.app`
- `META_WHATSAPP_TOKEN`, `RESEND_API_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `APP_ENV=production`

After deploy:
1. Verify: `GET https://your-app.railway.app/health` returns `{"status":"ok"}`
2. Go to Twilio Console → Phone Numbers → your number → Voice webhook = `https://your-app.railway.app/call/incoming` (POST)
3. Status callback = `https://your-app.railway.app/call/status` (POST)
4. **Upgrade Railway to Hobby plan ($5/mo)** — free tier sleeps after inactivity, cold starts kill Twilio webhooks (Twilio times out in 15s, cold start takes 20–30s)

---

### TASK 4: Deploy frontend to Vercel
**Time estimate: 15 minutes**

```bash
cd apps/web
vercel deploy --prod
```

In Vercel dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_BASE_URL=https://your-app.railway.app
```

After deploy, update `GOOGLE_OAUTH_REDIRECT_URI` in Railway to `https://your-vercel-app.vercel.app/settings/integrations` and add this URI to Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs.

---

### TASK 5: Gemini 429 Rate Limit Handling
**Time estimate: 20 minutes**

File: `apps/api/services/llm.py`

Free tier = 15 RPM. A busy business can hit this on a Monday morning.

Replace the bare `chat.send_message()` call with a retry wrapper:

```python
import asyncio, random

async def _send_with_backoff(chat, message, generation_config, max_retries=3):
    for attempt in range(max_retries):
        try:
            return chat.send_message(message, generation_config=generation_config)
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower():
                if attempt == max_retries - 1:
                    raise
                wait = (2 ** attempt) + random.uniform(0, 1)  # 1s, 2s, 4s with jitter
                await asyncio.sleep(wait)
            else:
                raise
```

In `process_turn()`, replace:
```python
response = chat.send_message(last_user_msg, generation_config=...)
```
with:
```python
response = await _send_with_backoff(chat, last_user_msg, generation_config)
```

If it still fails after 3 retries, the existing `except Exception` block returns `should_escalate=True` — which is the correct fallback (escalate to human).

---

### TASK 6: Browser Widget Client (`widget.js`)
**Time estimate: 1.5 hours**

File to create: `apps/web/public/widget.js`

The backend WebSocket server is complete at `ws://{API_BASE}/widget/stream/{businessId}`. This is the client-side script that businesses embed on their website.

**What it must do:**
1. Inject a floating "Call Now" button in the bottom-right corner
2. On click: request microphone permission
3. Open WebSocket to `ws(s)://{API_BASE}/widget/stream/{businessId}`
4. Receive first bytes = greeting audio → play immediately
5. Use `MediaRecorder` to capture mic audio in chunks
6. Use Web Audio API silence detection to know when user stops speaking
7. On silence detected: stop recording, send WAV bytes over WebSocket
8. Receive response bytes (MP3) → decode → play
9. Loop back to step 6 for next utterance
10. On farewell/disconnect: close mic, remove button state

```javascript
(function() {
  const cfg = window.HelioConfig || {};
  const BIZ_ID = cfg.businessId;
  const ACCENT = cfg.accentColor || "#A6FF4D";
  const WS_BASE = cfg.wsUrl || "wss://api.tryhelio.com";

  if (!BIZ_ID) { console.warn("[Helio] businessId not set"); return; }

  // Inject floating button
  const btn = document.createElement("button");
  btn.id = "helio-widget-btn";
  btn.innerHTML = "📞 Call Now";
  btn.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${ACCENT};color:#111;border:none;border-radius:9999px;
    padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;
    box-shadow:0 4px 20px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(btn);

  let ws, stream, audioCtx, mediaRecorder, isRecording = false;

  btn.addEventListener("click", async () => {
    if (isRecording) return;

    // Request mic
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new AudioContext();
    btn.innerHTML = "🔴 Listening…";
    isRecording = true;

    // Open WebSocket
    ws = new WebSocket(`${WS_BASE}/widget/stream/${BIZ_ID}`);
    ws.binaryType = "arraybuffer";

    ws.onmessage = async (event) => {
      // Play received audio (MP3 bytes from TTS)
      const audioBuffer = await audioCtx.decodeAudioData(event.data.slice(0));
      const src = audioCtx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(audioCtx.destination);
      src.start();
      src.onended = () => startCapture();  // Start listening after AI finishes speaking
    };

    ws.onclose = () => {
      btn.innerHTML = "📞 Call Now";
      isRecording = false;
      stream.getTracks().forEach(t => t.stop());
    };

    ws.onopen = () => {
      // Wait for greeting (handled by ws.onmessage)
    };
  });

  function startCapture() {
    // Use silence detection via AudioWorklet (or simpler: 2s chunks)
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    const chunks = [];

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const arrayBuffer = await blob.arrayBuffer();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(arrayBuffer);
      }
    };

    // Record for 3 seconds then send (simple VAD alternative)
    mediaRecorder.start();
    setTimeout(() => {
      if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    }, 3000);
  }
})();
```

**Note on VAD:** The simple 3-second timeout works for demos. For production, use proper Voice Activity Detection. A good approach: use the Web Audio API `AnalyserNode` to detect when audio energy drops below a threshold for 800ms, then stop recording. This creates natural conversation pauses.

The backend expects raw audio bytes — it runs Groq Whisper on them. Any audio format that Whisper supports (webm, wav, mp3) works.

---

### TASK 7: Google Calendar Sync-back
**Time estimate: 1 hour**

When a business owner manually edits or deletes an appointment in Google Calendar, Helio's database doesn't know. This task adds a push notification webhook.

**Step 1: Register push notification per business (call after calendar connect)**

File: `apps/api/routers/business.py` — add to `calendar_connect()` after saving tokens:

```python
# After saving tokens to DB, register push notifications
async def _register_calendar_watch(business_id: str, business: dict, service):
    """Register Google Calendar push notifications. TTL is max 7 days — must renew."""
    webhook_url = f"{settings.twilio_webhook_base_url}/calendar/sync"
    channel_id = str(uuid4())
    try:
        result = await asyncio.to_thread(
            service.events().watch(
                calendarId=business.get("google_calendar_id", "primary"),
                body={
                    "id": channel_id,
                    "type": "web_hook",
                    "address": webhook_url,
                    "expiration": str(int((datetime.utcnow().timestamp() + 604800) * 1000)),  # 7 days in ms
                }
            ).execute
        )
        # Save channel_id to businesses table for later renewal/stop
        sb = get_supabase()
        sb.table("businesses").update({
            "google_channel_id": channel_id
        }).eq("id", business_id).execute()
    except Exception:
        logger.exception("Calendar watch registration failed")
```

**Step 2: Create sync endpoint**

File: `apps/api/routers/business.py` — add new route:

```python
@router.post("/calendar/sync")
async def calendar_sync(request: Request):
    """Google Calendar push notification webhook. Called when any calendar event changes."""
    # Google sends X-Goog-Channel-ID and X-Goog-Resource-State headers
    channel_id = request.headers.get("X-Goog-Channel-ID")
    resource_state = request.headers.get("X-Goog-Resource-State")  # 'sync' | 'exists' | 'not_exists'

    if resource_state == "sync":
        # Initial handshake — just acknowledge
        return {"ok": True}

    if resource_state in ("exists", "not_exists"):
        # Find business by channel_id
        sb = get_supabase()
        res = sb.table("businesses").select("*").eq("google_channel_id", channel_id).limit(1).execute()
        if not res.data:
            return {"ok": True}
        business = res.data[0]

        # Re-sync appointments: fetch all future Google Calendar events for this business
        # and reconcile with Supabase appointments table
        try:
            from services.calendar import calendar_service
            svc = calendar_service._service(business)
            now = datetime.utcnow().isoformat() + "Z"
            events_result = await asyncio.to_thread(
                svc.events().list(
                    calendarId=business["google_calendar_id"],
                    timeMin=now,
                    singleEvents=True,
                    orderBy="startTime",
                ).execute
            )
            google_event_ids = {e["id"] for e in events_result.get("items", [])}

            # Find Helio appointments whose GCal event no longer exists → mark cancelled
            appts = sb.table("appointments").select("id, google_calendar_event_id").eq(
                "business_id", business["id"]
            ).neq("status", "cancelled").execute()

            for appt in (appts.data or []):
                if appt.get("google_calendar_event_id") and appt["google_calendar_event_id"] not in google_event_ids:
                    sb.table("appointments").update({"status": "cancelled"}).eq("id", appt["id"]).execute()
                    logger.info(f"Appointment {appt['id']} cancelled via Calendar sync")
        except Exception:
            logger.exception("Calendar sync reconciliation failed")

    return {"ok": True}
```

**Step 3: Add to `main.py` router**

The `/calendar/sync` endpoint is in the business router, so it will be available at `POST /business/calendar/sync`. Make sure Twilio webhook base URL is the Railway URL.

**Note:** Google push notification subscriptions expire after 7 days maximum. For production, add a cron job (Railway cron or Upstash QStash) to call a `/business/{id}/calendar/renew-watch` endpoint every 6 days per business.

---

### TASK 8: Push to GitHub
**Time estimate: 5 minutes**

```bash
cd /home/aerostorm19/Downloads/Helio
git add -A
git commit -m "Initial production build — Helio AI Receptionist"
git remote add origin git@github.com:aerostorm19/helio.git
git push -u origin main
```

Make sure `.gitignore` excludes `.env`, `*.json` credentials, `node_modules`, `.next`, `__pycache__`.

---

## 9. KEY ARCHITECTURAL RULES (Do not violate these)

1. **Never block the call path.** Confirmations, alerts, logging = `BackgroundTasks`. Never `await` them in the Twilio handler.

2. **One `GenerativeModel` per call.** Multi-tenant — each business has different `system_instruction`. Cannot share one model instance across calls.

3. **Twilio does STT on phone calls.** `SpeechResult` arrives pre-transcribed in the webhook form body. Never run Groq Whisper on Twilio calls (adds 800ms latency for zero benefit). Groq Whisper = browser widget only.

4. **TTS audio must be a public URL.** Twilio fetches audio over HTTP. Upload to Supabase Storage (`tts-cache` public bucket), return the URL.

5. **Escalation = tool call only.** When Gemini calls `escalate_to_human` tool → `<Dial>` TwiML. Never detect escalation from AI response text.

6. **Service role key bypasses RLS.** Every Supabase query in the backend MUST manually include `.eq("business_id", ...)`. Use `BusinessRepository` class for all data access.

7. **Google OAuth tokens expire hourly.** The `_credentials()` method in `calendar.py` has a refresh callback that auto-saves new tokens to DB. Do not remove this.

8. **Phone number normalization.** LLM receives phone numbers as spoken text ("nine eight seven..."). Always normalize to E.164 via `normalize_phone(phone_str, business["country_code"])` in `whatsapp.py` before sending to Meta API.

9. **FAQ embeddings are async.** `upsert_faq_embedding()` in `vector_search.py` is triggered via `asyncio.create_task()` after FAQ save. This is acceptable here (non-critical, no call path). The FAQ becomes searchable after the task completes (~1 second).

10. **Session message cap is 8.** Enforced in `session_service.update_session()`. Do not increase this — longer history increases Gemini latency and cost.

---

## 10. REMAINING TASKS SUMMARY

| # | Task | File(s) | Time |
|---|------|---------|------|
| 1A | Auth guard on dashboard layout | `app/(dashboard)/layout.tsx` | 15 min |
| 1B | Settings general page — wire save | `settings/page.tsx` | 30 min |
| 1C | Settings FAQs page — wire CRUD | `settings/faqs/page.tsx` | 45 min |
| 1D | Appointments page — wire actions | `appointments/page.tsx` | 20 min |
| 2 | Onboard wizard — write to DB | `onboard/*/page.tsx` | 1.5 hr |
| 3 | Deploy backend to Railway | Railway CLI | 20 min |
| 4 | Deploy frontend to Vercel | Vercel CLI | 15 min |
| 5 | Gemini 429 backoff | `services/llm.py` | 20 min |
| 6 | Browser widget client | `public/widget.js` | 1.5 hr |
| 7 | Google Calendar sync-back | `routers/business.py` | 1 hr |
| 8 | Push to GitHub | git | 5 min |

**Total: ~7 hours for everything. Core product (Tasks 1–5) ships in ~3 hours.**

---

## 11. HOW TO RUN LOCALLY

**Backend:**
```bash
cd apps/api
pip install -r requirements.txt
cp ../../.env .env   # copy root .env here
uvicorn main:app --reload --port 8000
# Verify: GET http://localhost:8000/health
```

**Frontend:**
```bash
cd apps/web
npm install
# .env.local already exists with placeholder keys
npm run dev
# Visit: http://localhost:3000
```

The frontend falls back to mock data when the backend is unreachable, so it renders a full UI even without the backend running.

---

Start with Task 1A (auth guard) then Task 3 (Railway deploy) — once the backend is live and auth works, everything else naturally falls into place because the hooks already try to fetch real data.
