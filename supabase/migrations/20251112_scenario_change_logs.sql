-- Migration: Scenario change logs
-- Tracks scenario edits with user, timestamp, and summary

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.scenario_change_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id INTEGER NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  change_type TEXT NOT NULL CHECK (char_length(change_type) > 0),
  description TEXT,
  meta JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scenario_change_logs_scenario_id_idx ON public.scenario_change_logs (scenario_id, created_at DESC);
