-- Migration: Add time_limit_minutes to scenarios (idempotent)
-- Date: 2025-11-19

BEGIN;

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS time_limit_minutes integer;

-- Backfill from estimated_minutes if available and if time_limit_minutes is null
UPDATE public.scenarios
SET time_limit_minutes = estimated_minutes
WHERE time_limit_minutes IS NULL AND estimated_minutes IS NOT NULL;

COMMIT;
