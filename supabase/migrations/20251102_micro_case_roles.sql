-- Migration: Rol especifico para microcasos
-- Fecha: 2025-11-02

BEGIN;

ALTER TABLE public.micro_case_nodes
  ADD COLUMN IF NOT EXISTS target_roles text[] DEFAULT '{}'::text[];

ALTER TABLE public.micro_case_options
  ADD COLUMN IF NOT EXISTS target_roles text[] DEFAULT '{}'::text[];

ALTER TABLE public.micro_case_attempts
  ADD COLUMN IF NOT EXISTS attempt_role text;

COMMENT ON COLUMN public.micro_case_nodes.target_roles IS 'Roles objetivo para este nodo (por ejemplo medico, enfermeria, farmacia). Vacío aplica a todos.';
COMMENT ON COLUMN public.micro_case_options.target_roles IS 'Roles objetivo para esta opcion de decision.';
COMMENT ON COLUMN public.micro_case_attempts.attempt_role IS 'Rol declarado por la persona que realizo el microcaso.';

COMMIT;
