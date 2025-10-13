-- Migration: Tabla de sesiones programadas
-- Crea la infraestructura para programar sesiones futuras

-- 1) Tabla principal de sesiones programadas
CREATE TABLE IF NOT EXISTS public.scheduled_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  location text DEFAULT 'Sala de Simulación HUCA',
  max_participants integer DEFAULT 8,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL DEFAULT 'clásico' CHECK (mode IN ('dual', 'clásico')),
  scenario_id bigint REFERENCES public.scenarios(id),
  is_active boolean NOT NULL DEFAULT true,
  enrollment_deadline timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comentarios para documentación
COMMENT ON TABLE public.scheduled_sessions IS 'Sesiones programadas para simulación presencial futura';
COMMENT ON COLUMN public.scheduled_sessions.title IS 'Título descriptivo de la sesión';
COMMENT ON COLUMN public.scheduled_sessions.scheduled_at IS 'Fecha y hora programada';
COMMENT ON COLUMN public.scheduled_sessions.location IS 'Ubicación física de la sesión';
COMMENT ON COLUMN public.scheduled_sessions.mode IS 'Modo: dual (2 pantallas) o clásico (1 pantalla)';
COMMENT ON COLUMN public.scheduled_sessions.scenario_id IS 'Escenario base de referencia';
COMMENT ON COLUMN public.scheduled_sessions.enrollment_deadline IS 'Fecha límite para apuntarse';
COMMENT ON COLUMN public.scheduled_sessions.max_participants IS 'Capacidad máxima de la sesión';
COMMENT ON COLUMN public.scheduled_sessions.mode IS 'Tipo de sesión: dual o clásico';

-- 2) Tabla puente para participantes registrados
CREATE TABLE IF NOT EXISTS public.scheduled_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text,
  user_email text,
  user_role text DEFAULT 'pendiente', -- 'confirmado', 'pendiente', 'cancelado'
  registered_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE(session_id, user_id)
);

COMMENT ON TABLE public.scheduled_session_participants IS 'Registro de usuarios apuntados a sesiones programadas';

-- 3) Grants para acceso público autenticado
GRANT SELECT ON public.scheduled_sessions TO authenticated;
GRANT SELECT, INSERT ON public.scheduled_session_participants TO authenticated;

-- Para posibles admins
GRANT ALL ON public.scheduled_sessions TO service_role;
GRANT ALL ON public.scheduled_session_participants TO service_role;

-- 4) Índices para performance
CREATE INDEX IF NOT EXISTS scheduled_sessions_scheduled_at_idx ON public.scheduled_sessions (scheduled_at);
CREATE INDEX IF NOT EXISTS scheduled_sessions_active_idx ON public.scheduled_sessions (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS scheduled_sessions_participants_session_id_idx ON public.scheduled_session_participants (session_id);
CREATE INDEX IF NOT EXISTS scheduled_sessions_participants_user_id_idx ON public.scheduled_session_participants (user_id);

-- 5) RLS (Row Level Security)
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_session_participants ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
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

-- 6) Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_scheduled_sessions_updated_at
    BEFORE UPDATE ON public.scheduled_sessions
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7) Función para contar participantes inscritos (útil para queries)
CREATE OR REPLACE FUNCTION public.get_session_participants_count(session_id uuid)
RETURNS integer AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.scheduled_session_participants WHERE public.scheduled_session_participants.session_id = $1);
END;
$$ language 'plpgsql';

-- 8) Verificación: consultas de ejemplo
/*
-- Ver sesiones futuras activas
SELECT id, title, scheduled_at, location, max_participants,
       get_session_participants_count(id) as current_participants
FROM public.scheduled_sessions
WHERE is_active = true AND scheduled_at > now()
ORDER BY scheduled_at;

-- Ver participantes de una sesión específica
SELECT sp.registered_at, u.user_metadata->>'nombre' as nombre,
       u.user_metadata->>'apellidos' as apellidos, p.rol
FROM public.scheduled_session_participants sp
JOIN auth.users u ON sp.user_id = u.id
LEFT JOIN public.profiles p ON p.id = sp.user_id
WHERE sp.session_id = '00000000-0000-0000-0000-000000000000';
*/
