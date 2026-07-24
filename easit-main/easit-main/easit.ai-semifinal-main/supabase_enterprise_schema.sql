-- ============================================================
-- EASIT.AI ENTERPRISE API — SUPABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Enterprise Users Table
CREATE TABLE IF NOT EXISTS enterprise_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid TEXT UNIQUE NOT NULL,          -- e.g., 'easit_usr_a1b2c3d4'
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  company TEXT DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'free',      -- free | starter | pro | enterprise
  plan_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '100 years'),
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid TEXT NOT NULL REFERENCES enterprise_users(user_uid) ON DELETE CASCADE,
  key_value TEXT UNIQUE NOT NULL,         -- e.g., 'easit_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  key_prefix TEXT NOT NULL,               -- e.g., 'easit_sk_a1b2...' (for display)
  label TEXT DEFAULT 'Default',           -- user-defined label
  plan TEXT NOT NULL DEFAULT 'free',
  rate_limit INT NOT NULL DEFAULT 5,      -- max requests per minute
  daily_limit INT NOT NULL DEFAULT 25,    -- max requests per day
  queries_used_today INT DEFAULT 0,
  total_queries BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '100 years'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- 3. API Usage Logs Table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_uid TEXT NOT NULL,
  query_text TEXT DEFAULT '',
  model_used TEXT DEFAULT 'gemini-2.5-flash',
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  verification_status TEXT DEFAULT 'verified', -- verified | partial | skipped
  latency_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_value ON api_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_uid ON api_keys(user_uid);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_enterprise_users_email ON enterprise_users(email);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user ON api_usage_logs(user_uid);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_date ON api_usage_logs(created_at);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE enterprise_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for serverless functions)
CREATE POLICY "Service role full access on enterprise_users"
  ON enterprise_users FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on api_keys"
  ON api_keys FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on api_usage_logs"
  ON api_usage_logs FOR ALL
  USING (true) WITH CHECK (true);

-- 6. Function to reset daily counters (runs via pg_cron or Vercel cron)
CREATE OR REPLACE FUNCTION reset_daily_query_counters()
RETURNS void AS $$
BEGIN
  UPDATE api_keys SET queries_used_today = 0;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enterprise_users_updated_at
  BEFORE UPDATE ON enterprise_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
