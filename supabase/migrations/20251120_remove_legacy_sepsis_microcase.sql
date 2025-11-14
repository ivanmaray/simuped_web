-- Migration: Remove legacy sepsis microcase seed
-- Fecha: 2025-11-20

BEGIN;

DELETE FROM public.micro_case_attempts
WHERE case_id IN (
  SELECT id
  FROM public.micro_cases
  WHERE slug = 'sepsis-lactante-choque-inicial'
);

DELETE FROM public.micro_cases
WHERE id IN (
  SELECT id
  FROM public.micro_cases
  WHERE slug = 'sepsis-lactante-choque-inicial'
);

COMMIT;
