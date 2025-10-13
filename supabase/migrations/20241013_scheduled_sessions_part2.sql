-- Migration: Sesiones programadas - PARTE 2
-- Configuraciones avanzadas para las tablas

-- 3) Grants para acceso público autenticado
GRANT SELECT ON public.scheduled_sessions TO authenticated;
GRANT SELECT, INSERT ON public.scheduled_session_participants TO authenticated;

-- Para posibles admins
GRANT ALL ON public.scheduled_sessions TO service_role;
GRANT ALL ON public.scheduled_session_participants TO service_role;

-- 4) Índices para performance (idempotentes)
DROP INDEX IF EXISTS scheduled_sessions_scheduled_at_idx;
DROP INDEX IF EXISTS scheduled_sessions_active_idx;
DROP INDEX IF EXISTS scheduled_sessions_participants_session_id_idx;
DROP INDEX IF EXISTS scheduled_sessions_participants_user_id_idx;

CREATE INDEX IF NOT EXISTS scheduled_sessions_scheduled_at_idx ON public.scheduled_sessions (scheduled_at);
CREATE INDEX IF NOT EXISTS scheduled_sessions_active_idx ON public.scheduled_sessions (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS scheduled_sessions_participants_session_id_idx ON public.scheduled_session_participants (session_id);
CREATE INDEX IF NOT EXISTS scheduled_sessions_participants_user_id_idx ON public.scheduled_session_participants (user_id);

-- 5) RLS (Row Level Security)
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_session_participants ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (con DROP IF EXISTS para evitar errores en re-ejecución)
DROP POLICY IF EXISTS "scheduled_sessions_select" ON public.scheduled_sessions;
DROP POLICY IF EXISTS "scheduled_sessions_admin" ON public.scheduled_sessions;
DROP POLICY IF EXISTS "scheduled_session_participants_manage_own" ON public.scheduled_session_participants;

CREATE POLICY "scheduled_sessions_select" ON public.scheduled_sessions
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "scheduled_sessions_admin" ON public.scheduled_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

CREATE POLICY "scheduled_session_participants_manage_own" ON public.scheduled_session_participants
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
