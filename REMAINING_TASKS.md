# Helio — Complete Remaining Tasks

**Status:** Scaffold complete (73 files). Critical architecture fixes + full implementation pipeline.  
**Timeline Target:** 8-12 hours for core loop + dashboard. 16-20 hours for production-ready.

---

## 🔴 CRITICAL FIXES (Must do first — these are silent failures)

### LLM Architecture
- [ ] **Fix Gemini `system_instruction` placement**
  - Move from `send_message()` parameter (doesn't exist) to `GenerativeModel()` constructor
  - Create new model instance per call (multi-tenant requires dynamic prompt per business)
  - File: `apps/api/services/llm.py` — rewrite `LLMService` class
  - Impact: Without this, AI has zero business context; will fail silently

### Google Calendar OAuth
- [ ] **Add token refresh callback to save new tokens to DB**
  - Access tokens expire in 3,600 seconds; currently only in memory
  - After 1 hour, every calendar check fails silently
  - File: `apps/api/services/calendar.py` — add refresh callback + `_save_refreshed_token()` method
  - Must run in background so it doesn't block call path

### Phone Number Parsing
- [ ] **Implement `normalize_phone()` function**
  - Add `country_code` field to `businesses` table (schema migration)
  - Use `phonenumbers` library to parse + format to E.164 (e.g., `+919876543210`)
  - File: `apps/api/services/whatsapp.py` + schema migration
  - Impact: All WhatsApp confirmations fail with 400 error without this

### Twilio Webhook Security
- [ ] **Add Twilio signature validation to all webhooks**
  - File: `apps/api/routers/call.py`
  - Validate `X-Twilio-Signature` header on every POST
  - Reject requests with invalid signatures (status 403)
  - Prevents fake call injection + quota drain

### Background Task Safety
- [ ] **Replace `asyncio.create_task()` with FastAPI's `BackgroundTasks`**
  - File: `apps/api/routers/call.py` — update booking confirmation call
  - Background tasks created with `create_task()` can be GC'd before completion
  - Tasks must be registered with the request context to survive handler exit

### Undefined Functions — Will Crash
- [ ] **Implement missing helper functions**
  - `format_working_hours()` in `apps/api/prompts/system.py` — converts JSON to human-readable text
  - `is_overlapping()` in `apps/api/services/calendar.py` — checks time slot conflicts
  - `parse_date()` in `apps/api/tools/handlers.py` — uses `dateparser` library with timezone
  - Missing `normalize_phone()` (see above)
  - Missing `ConfirmationService` orchestrator (see below)

### Escalation Detection False Positives
- [ ] **Remove text heuristic-based escalation, trust tool calls only**
  - File: `apps/api/services/llm.py`
  - Delete `_detect_escalation()` method
  - Escalation should only trigger when LLM explicitly calls `escalate_to_human` tool
  - Current implementation fires on normal AI speech ("connect you", "team member", etc.)

### Data Isolation Risk
- [ ] **Add repository pattern to enforce business_id filtering**
  - File: `apps/api/models/database.py`
  - Create `CallRepository(business_id)`, `AppointmentRepository(business_id)`, etc.
  - Every query automatically includes `.eq("business_id", self.business_id)`
  - Prevents one missed WHERE clause from leaking data between tenants

---

## 🟠 EXTERNAL SERVICES SETUP (Phase 1 — Required before any testing)

### Supabase Project
- [ ] **Create Supabase project**
  - Go to supabase.com → create new project
  - Save project URL and keys (anon key, service role key)
  - Add to `.env` file

- [ ] **Enable pgvector extension**
  - In Supabase dashboard → SQL Editor
  - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

- [ ] **Run database migration**
  - File: `supabase/migrations/001_initial_schema.sql`
  - Copy SQL and run in Supabase SQL Editor
  - Verify all tables created + RLS policies active
  - Run seed data: `supabase/seed.sql`

- [ ] **Create public storage bucket for TTS cache**
  - Dashboard → Storage → Create bucket named `tts-cache`
  - Set to **public** (anyone can read via URL)
  - This is where Google Cloud TTS MP3s are uploaded

### Google Services
- [ ] **Google Cloud Project**
  - Create GCP project
  - Enable: Text-to-Speech API, Google Calendar API, Google Drive API
  - Create service account with TTS + Calendar access
  - Download service account JSON
  - Base64 encode JSON: `cat service-account.json | base64 -w 0`
  - Add to `.env` as `GOOGLE_SERVICE_ACCOUNT_BASE64=...`

- [ ] **Google OAuth for Calendar** (frontend integration)
  - GCP → OAuth 2.0 Client ID (Web application)
  - Redirect URIs: `http://localhost:3000/dashboard/onboard/calendar` (dev), `https://app.tryhelio.com/dashboard/onboard/calendar` (prod)
  - Save Client ID + Client Secret
  - Add to `.env` as `GOOGLE_OAUTH_CLIENT_ID=...`, `GOOGLE_OAUTH_CLIENT_SECRET=...`

### Twilio
- [ ] **Create/buy Twilio phone number**
  - Twilio Console → Phone Numbers → Buy a number
  - Choose region (India for `en-IN` STT)
  - Configuration: Incoming calls webhook = `https://your-railway-url/call/incoming`
  - Method: POST
  - Save account SID, auth token, phone number SID
  - Add to `.env`

### Third-party APIs
- [ ] **Gemini API key** — get from Google AI Studio (ai.google.com)
- [ ] **Groq API key** — get from console.groq.com
- [ ] **Meta WhatsApp Business API** — Meta for Developers → create Business Account
  - Get phone number ID, WABA ID, access token
- [ ] **Resend API key** — get from resend.com
- [ ] **Upstash Redis** — create Redis database at upstash.com, get REST URL + token

### Fill `.env` File
- [ ] **Root `.env` with all keys** (from above)
  - File: `/home/aerostorm19/Downloads/Helio/.env`
  - Reference: `.env.example`
  - Do NOT commit this file

---

## 💜 BACKEND ARCHITECTURE FIXES (Phase 2A — Fix before testing call loop)

### Core Services Rewrite
- [ ] **`apps/api/services/llm.py`** — Gemini integration
  - Fix `system_instruction` placement (constructor, not send_message)
  - Create new model instance per call
  - Remove `_detect_escalation()` and `_detect_farewell()` text heuristics
  - Add proper tool call parsing from Gemini response
  - Add timeout handling (return escalation on LLM timeout > 8s)

- [ ] **`apps/api/services/calendar.py`** — Google Calendar with token refresh
  - Implement token refresh callback to save new tokens to DB
  - Implement `_save_refreshed_token(business_id, creds)` async method
  - Implement `is_overlapping(slot_start, slot_end, busy_periods)` helper
  - Implement `format_working_hours(working_hours_json)` → human-readable text
  - Use `asyncio.to_thread()` to wrap sync Google API client

- [ ] **`apps/api/services/tts.py`** — Google Cloud TTS with caching
  - Keep existing structure (hash-based cache is good)
  - Fix Supabase storage upload (use async client)
  - Pre-warm cache for common phrases (greeting, "didn't catch that", farewells)

- [ ] **`apps/api/services/session.py`** — Upstash Redis with 1-hour TTL
  - Cap message history to last 8 messages on every save
  - Add `_trim_messages(messages)` helper
  - Add business config caching (5-minute TTL) to avoid DB hit per turn

- [ ] **`apps/api/services/whatsapp.py`** — Meta WhatsApp
  - Implement `normalize_phone(phone_str, country_code)` using `phonenumbers` library
  - Format to E.164 before calling Meta API
  - Add error handling + silent fallback to email

- [ ] **Create `apps/api/services/confirmations.py`** — Confirmation orchestrator
  - Routes based on business settings: prefer WhatsApp, fallback to email
  - Logs which channel succeeded
  - Async, non-blocking (use BackgroundTasks)

### Tool Handlers Rewrite
- [ ] **`apps/api/tools/handlers.py`** — Full implementation
  - `_check_availability()` — parse date with timezone, query real Google Calendar, return slots
  - `_book_appointment()` — write to DB, create Google Calendar event, send confirmation (async)
  - `_escalate()` — mark call as escalated, send owner alert, return forwarding number
  - Add retry logic for slot conflicts (unique constraint)
  - All tool calls must handle exceptions gracefully

### Routers Rewrite
- [ ] **`apps/api/routers/call.py`** — Twilio webhook handler
  - Add Twilio signature validation on all POST endpoints
  - `POST /call/incoming` — return TwiML with greeting audio (cached TTS)
  - `POST /call/speech` — full call loop (STT already done by Twilio)
    - Get session from Redis
    - Handle low confidence (<0.5) → ask to repeat
    - Send to LLM with business context
    - Execute tool calls
    - Synthesize response (cached TTS where possible)
    - Check if escalation needed → return `<Dial>` TwiML
    - Check if farewell → return `<Hangup/>` TwiML
    - Otherwise loop back to `<Gather>`
  - `POST /call/status` — log call completion, save transcript, update status
  - Add hard after-hours check at call start (not just in prompt)

- [ ] **`apps/api/routers/business.py`** — Multi-tenant business API
  - `POST /business/onboard` — create business, init system prompt template
  - `GET /business/{id}` — return business config (check auth)
  - `PUT /business/{id}` — update settings (services, working hours, agent name, etc.)
  - `POST /business/{id}/faqs` — create FAQ + generate embedding via Google API
  - `PUT /business/{id}/faqs/{faq_id}` — update FAQ + regenerate embedding
  - `DELETE /business/{id}/faqs/{faq_id}` — soft delete (set is_active=false)
  - `POST /business/{id}/calendar/connect` — OAuth code exchange → save tokens
  - `GET /business/{id}/phone-numbers` — list available Twilio numbers
  - `POST /business/{id}/phone-numbers/buy` — purchase Twilio number

- [ ] **`apps/api/routers/dashboard.py`** — Analytics endpoints
  - `GET /dashboard/{id}/overview` — calls today, conversion %, escalations, avg duration
  - `GET /dashboard/{id}/calls` — paginated call history with transcript
  - `GET /dashboard/{id}/stats/week` — daily call counts for chart

- [ ] **`apps/api/routers/booking.py`** — Appointment CRUD
  - `GET /booking/availability` — check slots for date/service
  - `POST /booking/create` — create appointment (duplicate check via constraint)
  - `PUT /booking/{id}/confirm` — mark confirmed, send confirmation
  - `PUT /booking/{id}/cancel` — cancel, remove from Google Calendar
  - `GET /booking/upcoming/{business_id}` — for dashboard agenda view

### Models & Schemas
- [ ] **`apps/api/models/database.py`** — Repository pattern
  - `BusinessRepository(business_id)` — CRUD with auto-scoped queries
  - `CallRepository(business_id)` — queries filtered by business
  - `AppointmentRepository(business_id)` — queries filtered by business
  - Each repository ensures business_id is never missing from WHERE clause

- [ ] **Schema migration addition**
  - Add `country_code` to `businesses` table
  - Add `google_channel_id` to `businesses` (for Calendar Push Notifications, Phase 2)
  - Add unique constraint on `(business_id, scheduled_at)` for appointments

- [ ] **`apps/api/models/schemas.py`** — Pydantic schemas
  - Ensure all request/response models defined
  - Add validation for phone numbers (country_code required)

### System Prompt Builder
- [ ] **`apps/api/prompts/system.py`** — Dynamic per-business prompt
  - Implement `format_working_hours()` — convert JSON to readable format
  - Implement `get_current_datetime()` — localize to business timezone
  - Add explicit instruction: "Read back phone numbers digit by digit for confirmation"
  - Add date disambiguation instruction: "Always confirm the resolved date before booking"
  - Add after-hours instruction (even though code enforces it)

---

## 🟡 BACKEND DEPLOYMENT (Phase 2B — Test against real services)

### Deploy FastAPI to Railway
- [ ] **Create Railway account + link repo**
  ```bash
  cd apps/api
  railway login
  railway init
  railway link
  ```

- [ ] **Set environment variables in Railway**
  - Copy all from `.env` into Railway dashboard Variables
  - Critical: `SUPABASE_SERVICE_ROLE_KEY` (never expose to frontend)

- [ ] **Verify deployment**
  - `GET /health` returns 200 ✓
  - Twilio webhook URL: `https://your-railway-url/call/incoming`
  - Update Twilio console with new webhook URL

- [ ] **Test health + single endpoint**
  - Call Twilio number → hear greeting ✓
  - Check Railway logs for no errors ✓

### Test Each Service in Isolation
- [ ] **TTS + Storage** — synthesize greeting, upload to Supabase, verify public URL works
- [ ] **Calendar API** — connect business's Google Calendar, query freebusy, create event
- [ ] **Gemini** — send test message, verify context (business name in response)
- [ ] **Twilio STT** — actual phone call, transcribed correctly
- [ ] **Session Redis** — call flow, session persists across multiple speech turns

### Test Full Call Loop
- [ ] **Complete booking call**
  - Call number → hear greeting
  - Ask for appointment → AI asks what service
  - Pick service → AI checks availability
  - Pick time slot → AI confirms details (name, phone, date)
  - Confirm → AI books, sends WhatsApp confirmation
  - Verify appointment in Supabase + Google Calendar ✓

---

## 💚 FRONTEND INTEGRATION (Phase 3 — Wire to real backend)

### Auth Setup
- [ ] **`apps/web/app/(auth)/login/page.tsx`** — Real Supabase Auth
  - Replace mock login with `supabase.auth.signInWithPassword()`
  - Redirect to `/overview` on success

- [ ] **`apps/web/app/(auth)/register/page.tsx`** — Real signup
  - `supabase.auth.signUp()` + email verification
  - Auto-create empty business record for new user

- [ ] **`apps/web/app/(dashboard)/layout.tsx`** — Auth guard
  - Redirect to `/login` if not authenticated
  - Fetch current user business on mount

### Custom Hooks — Replace Mock Data
- [ ] **`apps/web/hooks/useBusiness.ts`** — Fetch real business config
  - Query Supabase `businesses` table by user ID
  - Add mutation to update settings

- [ ] **`apps/web/hooks/useCallLogs.ts`** — Fetch real call history
  - Query Supabase `calls` table with pagination
  - Add filtering by outcome, date range
  - Include transcript JSON

- [ ] **`apps/web/hooks/useAppointments.ts`** — Fetch real appointments
  - Query Supabase `appointments` table
  - Sort by `scheduled_at`
  - Add status filtering

### Dashboard Pages — Wire Real Data
- [ ] **`apps/web/app/(dashboard)/overview/page.tsx`**
  - Fetch `/dashboard/{id}/overview` endpoint
  - Show real metrics: calls/month, conversion %, escalations
  - Swap mock `CallVolumeChart` data with real 7-day stats

- [ ] **`apps/web/app/(dashboard)/calls/page.tsx`**
  - Fetch real call log from `useCallLogs()`
  - Add filter UI (outcome, date range)
  - Pagination: 20 calls per page

- [ ] **`apps/web/app/(dashboard)/calls/[id]/page.tsx`**
  - Fetch single call + transcript
  - Render `TranscriptViewer` with real data

- [ ] **`apps/web/app/(dashboard)/appointments/page.tsx`**
  - Fetch real appointments from `useAppointments()`
  - Calendar: highlight days with appointments
  - Day agenda: show appointments for selected day
  - Actions: confirm/cancel/reschedule (POST to backend)

### Settings Pages — Real Data + Mutations
- [ ] **`apps/web/app/(dashboard)/settings/page.tsx`** — General settings
  - Form inputs: name, address, phone, timezone, agent name, greeting, escalation number
  - Save button → `PUT /business/{id}`
  - Show success/error toast

- [ ] **`apps/web/app/(dashboard)/settings/faqs/page.tsx`** — FAQ editor
  - Fetch FAQs from `GET /business/{id}/faqs`
  - Drag-to-reorder UI (use `react-beautiful-dnd`)
  - Each FAQ: question input, answer textarea, delete button
  - Add FAQ button → add new row (max 10)
  - Save button → `PUT /business/{id}/faqs` with reorder
  - Show "Embeddings generated ✓" badge after save

- [ ] **`apps/web/app/(dashboard)/settings/integrations/page.tsx`**
  - **Google Calendar:**
    - Fetch connection status from `useBusiness()`
    - Connect button → OAuth popup → code exchange → success message
  - **WhatsApp:**
    - Fetch `whatsapp_number` from business config
    - Setup guide if not connected
    - Test send button (send test message to owner)
  - **Twilio:**
    - Fetch `twilio_phone_number` from config
    - Buy number flow (list available → select → purchase)
  - **Widget:**
    - Copy embed code button (JavaScript snippet)

### Onboarding Wizard — Complete 4-step flow
- [ ] **Step 1: Business Details** (`onboard/page.tsx`)
  - Form: name, industry, address, timezone, escalation phone
  - Validation
  - Save to DB, move to step 2

- [ ] **Step 2: Services** (`onboard/page.tsx` → router/state)
  - Add at least 1 service (name, duration in minutes, price)
  - Can add multiple
  - Save to `businesses.services` JSONB
  - Move to step 3

- [ ] **Step 3: FAQs** (`onboard/faqs/page.tsx`)
  - Add 3-10 FAQs (question + answer)
  - Save to DB, trigger embedding generation
  - Move to step 4

- [ ] **Step 4: Phone & Widget** (`onboard/number/page.tsx`)
  - Option A: Buy Twilio number (list → select → purchase)
  - Option B: Use browser widget (copy embed code)
  - Save choice to DB
  - Completion → redirect to overview

### API Client
- [ ] **`apps/web/lib/api.ts`** — Typed API client
  - Update to use real `NEXT_PUBLIC_API_BASE_URL` from `.env.local`
  - Add auth token (JWT from Supabase) to all requests
  - Handle 401 → redirect to login
  - Add retry + backoff for 5xx errors

---

## 🎯 FEATURES — Fill In Gaps (Phase 4)

### FAQ Semantic Search
- [ ] **Generate embeddings on FAQ save**
  - File: `apps/api/routers/business.py` — `POST /business/{id}/faqs`
  - Call Google `text-embedding-004` API on question + answer
  - Store 768-dim vector in `faqs.embedding` column

- [ ] **Inject relevant FAQs into system prompt dynamically**
  - File: `apps/api/services/llm.py`
  - On every call, search FAQs with caller's intent (or first user message)
  - If match > 0.7 similarity, include top 3 FAQs in system prompt
  - Use pgvector `search_faqs()` SQL function

### Escalation Call Forwarding
- [ ] **`_escalate()` tool handler** — Full implementation
  - Mark call as escalated in DB
  - Generate TwiML with `<Dial>` to `escalation_phone` (30s timeout)
  - Send owner alert (WhatsApp/email)
  - If dial fails → `<Say>` "Sorry, no one available, please call back"

- [ ] **`POST /call/escalation-status`** — Handle dial outcome
  - Log success/failure
  - Update call record with escalation result

### Confirmation Service
- [ ] **Create `apps/api/services/confirmations.py`**
  - Route by preference: WhatsApp preferred, fallback to email
  - Log which channel sent
  - Catch exceptions, never fail the call
  - Async, non-blocking (BackgroundTasks)

### Inactivity Timeout
- [ ] **`apps/api/routers/call.py`** — After-hours + no-speech timeout
  - Hard check at call start: if outside working hours → after-hours message → hangup
  - In `<Gather>`: if no speech for 30 seconds total → auto-hangup + log as "dropped"

### Rate Limit Handling
- [ ] **Add exponential backoff to all Gemini calls**
  - Catch `429 Too Many Requests`
  - Retry up to 3x with jitter
  - If still failing → escalate to human (fallback mode)

### Browser Widget VAD
- [ ] **`apps/api/routers/widget.py`** — WebSocket audio streaming
  - Accumulate audio bytes until VAD detects silence (use `webrtcvad` library)
  - Send complete utterance to Whisper, get transcription
  - Process through LLM pipeline (same as Twilio)
  - Stream response audio back to browser
  - Handle WebSocket disconnect gracefully

- [ ] **`apps/web/` — `widget.js` embed script**
  - Load on business website (single script tag)
  - "Call Now" button → request mic permission → WebRTC stream
  - Send audio chunks to `/widget/stream/{business_id}` WebSocket
  - Receive + play audio response
  - Close connection on farewell

---

## 🔒 HARDENING (Phase 5)

### Error Handling Sweep
- [ ] **All external service calls have timeout + fallback**
  - Gemini → 8s timeout, escalate on failure
  - Google Calendar → return "Call to confirm availability"
  - TTS → fallback to Twilio `<Say>` (lower quality, zero latency)
  - WhatsApp/Email → silent fallback (don't fail the call)
  - Supabase → return 500 only if critical, otherwise escalate

- [ ] **Logging + observability**
  - All errors logged to Railway (visible in dashboard)
  - Include context: business_id, call_sid, service that failed
  - Add structured logging (timestamp, level, message, context)

### Message History Cap
- [ ] **Enforce 8-message limit in session save**
  - File: `apps/api/services/session.py`
  - On `update_session()`, trim to last 8 messages before saving
  - Prevents context bloat → latency creep

### TTS Pre-warming
- [ ] **Cache common phrases at startup**
  - Greeting: "Thank you for calling [business name]"
  - Clarification: "Sorry, I didn't catch that. Could you repeat?"
  - Farewell: "Thank you for calling. Have a lovely day!"
  - Standard responses pre-synthesized, uploaded to storage
  - Retrieved by hash from cache on first call

---

## 🚀 DEPLOYMENT (Phase 6)

### Backend (Railway)
- [ ] **Verify cold start is disabled**
  - Railway dashboard → set to "Hobby" plan ($5/month) for guaranteed uptime
  - Free tier has aggressive cold starts that kill Twilio webhooks

- [ ] **Set all environment variables**
  - Copy `.env` to Railway dashboard
  - Verify no missing keys (test with `/health` endpoint)

- [ ] **Update Twilio webhook URL**
  - Twilio Console → Phone Numbers → [your number]
  - Incoming calls webhook: `https://your-railway-url.railway.app/call/incoming`
  - Test with call → should hear greeting

### Frontend (Vercel)
- [ ] **Deploy Next.js**
  ```bash
  cd apps/web
  vercel deploy --prod
  ```

- [ ] **Set environment variables in Vercel dashboard**
  - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = public anon key
  - `NEXT_PUBLIC_API_BASE_URL` = Railway API URL
  - Do NOT include service role key (it's for backend only)

- [ ] **Verify login works in prod**
  - Try signing up → check email verification
  - Try logging in → should see dashboard

### Supabase
- [ ] **Verify RLS policies active**
  - Go to each table → Row Level Security toggle ON
  - Test: as business owner, can only see own data

- [ ] **Verify tts-cache bucket is public**
  - Storage → tts-cache → Policies
  - Anyone can read (`SELECT`)
  - Only backend can write (`INSERT`, `UPDATE`)

- [ ] **Backup + monitoring**
  - Enable daily backups
  - Set up alerts for rate limits

---

## ✅ FINAL CHECKLIST

### Before First Real Call
- [ ] All `.env` variables filled
- [ ] Supabase migration + pgvector ✓
- [ ] Railway deployment ✓
- [ ] Twilio webhook configured ✓
- [ ] Google Cloud TTS + Calendar APIs enabled ✓
- [ ] Gemini `system_instruction` fixed ✓
- [ ] OAuth token refresh callback implemented ✓
- [ ] Twilio signature validation added ✓
- [ ] All undefined functions implemented ✓

### Before Dashboard Launch
- [ ] Frontend auth working ✓
- [ ] All hooks connected to real API ✓
- [ ] Settings save to backend ✓
- [ ] Call history renders real data ✓
- [ ] Onboard wizard completes flow ✓

### Before Production
- [ ] Full call loop tested (call → book → confirm) ✓
- [ ] Error handling tested (break each service, verify fallback) ✓
- [ ] 48-hour pilot with real business ✓
- [ ] GitHub pushed to `aerostorm19/helio` ✓
- [ ] Monitoring set up (Railway + Supabase alerts) ✓

---

## Time Estimate

| Phase | Task | Time |
|-------|------|------|
| 1 | Services setup (Supabase, GCP, Twilio, etc.) | 30 min |
| 2A | Critical architecture fixes | 2 hours |
| 2B | Backend testing (TTS, Calendar, Gemini, full loop) | 1.5 hours |
| 3 | Frontend auth + data hooks | 1.5 hours |
| 4 | Settings + onboard wizard | 1.5 hours |
| 5 | Confirmations, escalation, widget (optional) | 2 hours |
| 6 | Hardening + error handling | 1 hour |
| 7 | Deployment + final testing | 1 hour |
| **Total** | | **12-14 hours** |

**If you skip Phase 5 (widget) and optional features, you can ship the core product in 8-10 hours.**

---

## What to Build First (Next 2 Hours)

1. **Complete service setup** (30 min)
   - Supabase project + migration
   - Google Cloud TTS + Calendar
   - Twilio number
   - Fill `.env`

2. **Fix critical LLM + OAuth issues** (1 hour)
   - Move `system_instruction` to model constructor
   - Add token refresh callback
   - Implement missing functions

3. **Test full call loop** (30 min)
   - Deploy to Railway
   - Call the Twilio number
   - Verify greeting, booking, confirmation

Once those work, everything else is incremental.

