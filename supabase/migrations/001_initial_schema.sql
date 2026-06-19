-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────
-- BUSINESSES
-- ─────────────────────────────────────────
CREATE TABLE businesses (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  industry             TEXT,
  phone                TEXT,
  email                TEXT,
  address              TEXT,
  timezone             TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  country_code         TEXT NOT NULL DEFAULT 'IN',
  twilio_phone_number  TEXT,
  twilio_phone_sid     TEXT,
  whatsapp_number      TEXT,
  meta_waba_id         TEXT,
  meta_phone_number_id TEXT,
  google_calendar_id            TEXT,
  google_calendar_access_token  TEXT,
  google_calendar_refresh_token TEXT,
  google_calendar_token_expiry  TIMESTAMPTZ,
  google_calendar_channel_id    TEXT,
  google_calendar_resource_id   TEXT,
  agent_name           TEXT NOT NULL DEFAULT 'Maya',
  greeting_message     TEXT,
  escalation_phone     TEXT,
  after_hours_message  TEXT,
  agent_enabled        BOOLEAN NOT NULL DEFAULT true,
  after_hours_mode     BOOLEAN NOT NULL DEFAULT false,
  whatsapp_confirmations BOOLEAN NOT NULL DEFAULT true,
  email_confirmations  BOOLEAN NOT NULL DEFAULT true,
  escalation_alerts    BOOLEAN NOT NULL DEFAULT true,
  working_hours        JSONB NOT NULL DEFAULT '[]'::jsonb,
  services             JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- FAQS
-- ─────────────────────────────────────────
CREATE TABLE faqs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL,
  embedding    vector(768),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX faqs_business_id_idx ON faqs(business_id);
CREATE INDEX faqs_embedding_idx ON faqs USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────
-- CALLS
-- ─────────────────────────────────────────
CREATE TABLE calls (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  caller_number    TEXT,
  caller_name      TEXT,
  twilio_call_sid  TEXT UNIQUE,
  call_direction   TEXT NOT NULL DEFAULT 'inbound',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at      TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  duration_seconds INT,
  outcome          TEXT,
  outcome_detail   TEXT,
  transcript       JSONB,
  was_escalated    BOOLEAN NOT NULL DEFAULT false,
  had_booking      BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX calls_business_id_idx ON calls(business_id);
CREATE INDEX calls_started_at_idx ON calls(started_at DESC);
CREATE INDEX calls_outcome_idx ON calls(outcome);

-- ─────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────
CREATE TABLE appointments (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id              UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  call_id                  UUID REFERENCES calls(id) ON DELETE SET NULL,
  customer_name            TEXT NOT NULL,
  customer_phone           TEXT,
  customer_email           TEXT,
  service                  TEXT NOT NULL,
  scheduled_at             TIMESTAMPTZ NOT NULL,
  duration_minutes         INT NOT NULL DEFAULT 30,
  notes                    TEXT,
  status                   TEXT NOT NULL DEFAULT 'confirmed',
  google_calendar_event_id TEXT,
  confirmation_sent_at     TIMESTAMPTZ,
  confirmation_channel     TEXT,
  reminder_sent_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX appointments_business_id_idx  ON appointments(business_id);
CREATE INDEX appointments_scheduled_at_idx ON appointments(scheduled_at);
CREATE INDEX appointments_status_idx       ON appointments(status);

-- ─────────────────────────────────────────
-- CALL SESSIONS
-- ─────────────────────────────────────────
CREATE TABLE call_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id          UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  business_id      UUID NOT NULL REFERENCES businesses(id),
  messages         JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_intent   TEXT,
  collected_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────
ALTER TABLE businesses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls         ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_owner_only" ON businesses
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "business_data_only" ON faqs
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "business_data_only" ON calls
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "business_data_only" ON appointments
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "business_data_only" ON call_sessions
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────
-- HELPERS
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at    BEFORE UPDATE ON businesses    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER faqs_updated_at          BEFORE UPDATE ON faqs          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER appointments_updated_at  BEFORE UPDATE ON appointments  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER call_sessions_updated_at BEFORE UPDATE ON call_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION search_faqs(
  p_business_id     UUID,
  p_query_embedding vector(768),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count     INT   DEFAULT 3
)
RETURNS TABLE (
  id UUID, question TEXT, answer TEXT, similarity FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT id, question, answer,
         1 - (embedding <=> p_query_embedding) AS similarity
  FROM faqs
  WHERE business_id = p_business_id
    AND is_active = true
    AND 1 - (embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;
