-- ================================================================
--  IACCLM AI Lab — Database Schema
--  Platform: InsForge (PostgreSQL with PostgREST)
--  Run this via: InsForge MCP → run-raw-sql
-- ================================================================

-- ── Enable required extensions ─────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
--  Table: conversations
--  Stores AI chat session containers
-- ================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'Percakapan Baru',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id);

-- ── Index ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- ================================================================
--  Table: messages
--  Stores individual chat messages within a conversation
-- ================================================================
CREATE TABLE IF NOT EXISTS messages (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id   UUID        REFERENCES conversations(id) ON DELETE CASCADE,
  role              TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content           TEXT        NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access messages in their conversations"
  ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created      ON messages(created_at ASC);

-- ================================================================
--  Table: lab_sessions
--  Stores patient lab interpretation sessions
-- ================================================================
CREATE TABLE IF NOT EXISTS lab_sessions (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_ihs_number    TEXT        NOT NULL,
  patient_name          TEXT,
  patient_gender        TEXT        CHECK (patient_gender IN ('male', 'female', 'unknown')),
  patient_data          JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lab_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own lab sessions"
  ON lab_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_lab_sessions_user     ON lab_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_patient  ON lab_sessions(patient_ihs_number);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_created  ON lab_sessions(created_at DESC);

-- ================================================================
--  Table: lab_results
--  Stores individual lab parameters for each session
-- ================================================================
CREATE TABLE IF NOT EXISTS lab_results (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id              UUID        REFERENCES lab_sessions(id) ON DELETE CASCADE,
  loinc_code              TEXT        NOT NULL,
  parameter_name          TEXT        NOT NULL,
  value                   NUMERIC     NOT NULL,
  unit                    TEXT        NOT NULL,
  reference_range_low     NUMERIC,
  reference_range_high    NUMERIC,
  reference_range_note    TEXT,
  status                  TEXT        CHECK (status IN ('normal','high','low','critical','unknown')),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access lab results in their sessions"
  ON lab_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lab_sessions s
      WHERE s.id = lab_results.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_lab_results_session   ON lab_results(session_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_loinc     ON lab_results(loinc_code);

-- ================================================================
--  Table: diagnostic_reports
--  Stores AI-generated DiagnosticReport references
-- ================================================================
CREATE TABLE IF NOT EXISTS diagnostic_reports (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id              UUID        REFERENCES lab_sessions(id) ON DELETE CASCADE,
  interpretation_text     TEXT,
  conclusion              TEXT,
  satusehat_report_id     TEXT,   -- FHIR DiagnosticReport.id from SATUSEHAT
  status                  TEXT        DEFAULT 'draft' CHECK (status IN ('draft','submitted','final')),
  submitted_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diagnostic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access diagnostic reports in their sessions"
  ON diagnostic_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lab_sessions s
      WHERE s.id = diagnostic_reports.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_diag_reports_session  ON diagnostic_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_diag_reports_status   ON diagnostic_reports(status);

-- ================================================================
--  Table: user_profiles
--  Extended user metadata (joined with auth.users)
-- ================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name       TEXT,
  role            TEXT        DEFAULT 'dokter' CHECK (role IN ('dokter','analis','admin')),
  organization_id TEXT,
  str_number      TEXT,   -- Nomor STR dokter/analis
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and update their own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = id);

-- ================================================================
--  Trigger: auto-create user_profiles on sign-up
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_json JSONB;
  name_val TEXT;
BEGIN
  new_json := to_jsonb(NEW);
  IF new_json ? 'raw_user_meta_data' AND new_json->'raw_user_meta_data' IS NOT NULL THEN
    name_val := new_json->'raw_user_meta_data'->>'full_name';
  END IF;

  INSERT INTO public.user_profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(name_val, NEW.email, 'Pengguna Baru')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
--  Trigger: auto-update updated_at timestamps
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
