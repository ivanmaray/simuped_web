-- Migration: Extend scenarios status constraint to include additional workflow states
-- Date: 2025-11-16
-- Adds: Borrador, Archivado, Publicado to existing allowed statuses
-- Existing allowed: 'Disponible', 'En construcción: en proceso', 'En construcción: sin iniciar'
-- After this migration, UI statuses will be consistent with DB constraint.

ALTER TABLE public.scenarios
  DROP CONSTRAINT IF EXISTS scenarios_status_check;

ALTER TABLE public.scenarios
  ADD CONSTRAINT scenarios_status_check
  CHECK (status = ANY (ARRAY[
    'Disponible',
    'En construcción: en proceso',
    'En construcción: sin iniciar',
    'Borrador',
    'Archivado',
    'Publicado'
  ]));
