# Helio — Build Plan

Full prompt-derived build sequence. Follow phases top-to-bottom.

## Phase 1 — Core Pipeline
1. **Supabase setup** — apply `supabase/migrations/001_initial_schema.sql`, enable `pgvector`, verify RLS.
2. **FastAPI skeleton** — `apps/api/main.py`. Deploy to Railway, verify `/health`.
3. **Twilio webhook** — `POST /call/incoming` returns greeting TwiML.
4. **LLM integration** — `services/llm.py` with Gemini 1.5 Flash.
5. **Complete call loop** — `POST /call/speech`: STT → LLM → TTS → TwiML.
6. **Tool calling** — `check_availability`, `book_appointment`, `escalate_to_human`.
7. **Google Calendar** — replace mocked availability with real Calendar queries.
8. **Call logging** — persist transcript + outcome to Supabase.

## Phase 2 — Multi-tenant + Dashboard
9. Business onboarding API.
10. Next.js frontend skeleton + auth.
11. Call history page + transcript viewer.
12. Appointments page + calendar.
13. Settings (General, FAQs, Working hours).

## Phase 3 — Confirmations + Polish
14. WhatsApp confirmations (Meta API).
15. Email fallback (Resend).
16. Escalation flow + `<Dial>` forwarding.
17. FAQ semantic search (pgvector + Google text-embedding-004).
18. Browser widget (WebRTC) — zero-cost demo mode.

## Phase 4 — Hardening
19. Error handling sweep.
20. Session management (Upstash Redis + inactivity timeout).
21. Onboarding wizard polish.
22. End-to-end pilot with real business.

## Latency budget (< 2s)
- LLM (Gemini Flash): 400-800ms
- TTS cache hit: 50ms
- TTS cache miss: 600ms + upload
- Network: 100ms
- Tactics: aggressive TTS cache, cap history at 8 messages, `max_output_tokens=200`, preload business context in Redis.

## Key invariants
- Twilio handles STT on phone — only the widget needs Whisper.
- Every booking writes Supabase first, then Calendar, then confirmation (async).
- Multi-tenancy keyed off `business_id` everywhere.
- Fail toward human escalation.
