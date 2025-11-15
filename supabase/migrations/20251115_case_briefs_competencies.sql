-- Add competencies column to case_briefs
-- Stores an array of competency objects: [{ key, label, expected, notes, weight }]
-- Safe to run multiple times
ALTER TABLE public.case_briefs
ADD COLUMN IF NOT EXISTS competencies jsonb;

-- Optionally ensure it's either null or a JSON array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_briefs_competencies_is_array'
  ) THEN
    ALTER TABLE public.case_briefs
    ADD CONSTRAINT case_briefs_competencies_is_array
    CHECK (competencies IS NULL OR jsonb_typeof(competencies) = 'array');
  END IF;
END$$;
