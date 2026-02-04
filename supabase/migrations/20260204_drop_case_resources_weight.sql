-- Drop obsolete relevance column from case resources
-- Run in Supabase SQL editor or migration pipeline

BEGIN;

ALTER TABLE public.case_resources
  DROP COLUMN IF EXISTS weight;

COMMIT;
