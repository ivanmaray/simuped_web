-- Migration: Relax legacy admin editor constraints
-- Fecha: 2025-11-20

BEGIN;

-- Loosen level constraint to accept legacy values
ALTER TABLE public.case_briefs
  DROP CONSTRAINT IF EXISTS case_briefs_level_check;

ALTER TABLE public.case_briefs
  ADD CONSTRAINT case_briefs_level_check
  CHECK (level IN ('basico', 'medio', 'intermedio', 'avanzado', 'experto', 'basic', 'advanced', 'intro'));

-- Grant RLS bypass to service role for steps management
ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS steps_admin_manage ON public.steps;

CREATE POLICY steps_admin_manage
  ON public.steps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
