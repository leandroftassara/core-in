-- core·in schema
-- Run this in the Supabase SQL editor (or via supabase CLI)

-- ─── Tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  date             DATE        NOT NULL,
  start_time       TEXT        NOT NULL,   -- "HH:MM"
  end_time         TEXT,                   -- "HH:MM", nullable
  completed        BOOLEAN     NOT NULL DEFAULT FALSE,
  completion_reason TEXT,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks (date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks (completed);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Completion reasons ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS completion_reasons (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reason       TEXT        NOT NULL UNIQUE,
  usage_count  INTEGER     NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RPC: upsert a completion reason (called from Fastify on task complete)
CREATE OR REPLACE FUNCTION upsert_completion_reason(p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO completion_reasons (reason, usage_count, last_used_at)
  VALUES (p_reason, 1, NOW())
  ON CONFLICT (reason)
  DO UPDATE SET
    usage_count  = completion_reasons.usage_count + 1,
    last_used_at = NOW();
END;
$$;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- We use the SERVICE ROLE key from Fastify, so RLS is bypassed.
-- Disable RLS on both tables (or leave off — service role ignores it anyway).
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE completion_reasons DISABLE ROW LEVEL SECURITY;
