# Helio — AI Voice Receptionist

**Tagline:** Every call answered. Every customer heard.

Helio is a production-ready AI Voice Receptionist SaaS for small businesses (salons, clinics, tutors, repair shops). Helio answers incoming phone calls, books appointments, answers FAQs, sends WhatsApp/email confirmations, and escalates to a human when needed.

## Monorepo Layout

```
helio/
├── apps/
│   ├── web/    # Next.js 14 dashboard (Vercel)
│   └── api/    # FastAPI backend (Railway)
├── packages/
│   └── shared/ # Shared TypeScript types
├── supabase/   # SQL migrations + seed
└── .env.example
```

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 14, Tailwind, shadcn/ui |
| Backend | Python 3.11, FastAPI |
| DB | Supabase (Postgres + pgvector) |
| LLM | Google Gemini 1.5 Flash |
| STT | Twilio (phone) / Groq Whisper (widget) |
| TTS | Google Cloud TTS (Wavenet) |
| Telephony | Twilio |
| Calendar | Google Calendar v3 |
| Confirmations | Meta WhatsApp Business API + Resend |
| Cache | Upstash Redis |
| Hosting | Railway (api) + Vercel (web) |

## Quick Start

1. Copy `.env.example` → `.env` and fill in keys.
2. Apply Supabase migration: `supabase/migrations/001_initial_schema.sql`.
3. Backend:
   ```bash
   cd apps/api
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
4. Frontend:
   ```bash
   cd apps/web
   pnpm install
   pnpm dev
   ```

## Deploy

- **Backend:** `railway up` from `apps/api/`
- **Frontend:** `vercel deploy --prod` from `apps/web/`

See full build prompt + implementation sequence in `docs/BUILD.md`.
