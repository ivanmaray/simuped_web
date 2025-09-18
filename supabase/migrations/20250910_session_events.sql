-- Migration: Tabla y policies para session_events (presencial)
-- Ejecuta en el SQL Editor de Supabase.

-- 0) Extensiones (gen_random_uuid suele estar disponible; descomenta si fuera necesario)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tabla de eventos de sesión
CREATE TABLE IF NOT EXISTS public.session_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.presencial_sessions(id) ON DELETE CASCADE,
  at         timestamptz NOT NULL DEFAULT now(),
  kind       text NOT NULL,
  payload    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_events OWNER TO postgres;

-- 2) Grants básicos
GRANT SELECT ON public.session_events TO anon, authenticated;
GRANT INSERT ON public.session_events TO authenticated;

-- 3) Índices
CREATE INDEX IF NOT EXISTS session_events_session_id_idx ON public.session_events (session_id);
CREATE INDEX IF NOT EXISTS session_events_at_idx ON public.session_events (at DESC);

-- 4) RLS y policies
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

-- Limpia policies antiguas si existieran (seguro al re-ejecutar)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_events' AND policyname = 'session_events insert by owner or admin'
  ) THEN
    EXECUTE 'DROP POLICY "session_events insert by owner or admin" ON public.session_events';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_events' AND policyname = 'session_events select by owner/participants/admin'
  ) THEN
    EXECUTE 'DROP POLICY "session_events select by owner/participants/admin" ON public.session_events';
  END IF;
END$$;

-- Insert: propietario de la sesión o admin
CREATE POLICY "session_events insert by owner or admin" ON public.session_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.presencial_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Select: propietario, participantes o admin
CREATE POLICY "session_events select by owner/participants/admin" ON public.session_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.presencial_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.presencial_participants pp
      WHERE pp.session_id = session_id AND pp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- 5) Verificación manual (ejecutar aparte)
-- EXPLAIN ANALYZE SELECT * FROM public.session_events WHERE session_id = '00000000-0000-0000-0000-000000000000' ORDER BY at DESC LIMIT 1;

