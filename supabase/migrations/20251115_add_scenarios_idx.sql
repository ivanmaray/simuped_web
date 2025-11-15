-- Add optional ordering column to scenarios
BEGIN;

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS idx integer;

COMMENT ON COLUMN public.scenarios.idx IS 'Optional ordering index for scenarios list';

-- Helpful index for ordering/filtering
CREATE INDEX IF NOT EXISTS scenarios_idx_idx ON public.scenarios (idx);

COMMIT;
