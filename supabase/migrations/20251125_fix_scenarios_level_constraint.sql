-- Migration: Fix scenarios level constraint to allow only 3 levels: basico, medio, avanzado
-- Fecha: 2025-11-25

BEGIN;

-- Drop existing level constraint if it exists
ALTER TABLE public.scenarios
  DROP CONSTRAINT IF EXISTS scenarios_level_check;

-- Add updated level constraint with only 3 levels
ALTER TABLE public.scenarios
  ADD CONSTRAINT scenarios_level_check
  CHECK (level IN ('basico', 'medio', 'avanzado'));

COMMIT;