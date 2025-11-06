-- Migration: Harden micro_cases_overview access
-- Fecha: 2025-11-17

-- Ensure the view executes with the caller privileges so table RLS applies.
ALTER VIEW public.micro_cases_overview SET (security_invoker = true);

-- Tighten grants: remove broad access, allow only authenticated users and service role.
REVOKE ALL ON public.micro_cases_overview FROM PUBLIC;
REVOKE ALL ON public.micro_cases_overview FROM anon;

GRANT SELECT ON public.micro_cases_overview TO authenticated;
GRANT SELECT ON public.micro_cases_overview TO service_role;
