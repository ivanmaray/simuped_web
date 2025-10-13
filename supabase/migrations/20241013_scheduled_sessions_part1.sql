-- Migration: Tablas de sesiones programadas - PARTE 1
-- Crea la infraestructura básica para programar sesiones futuras

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

-- 2) Tabla puente para participantes registrados
CREATE TABLE IF NOT EXISTS public.scheduled_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE(session_id, user_id)
);

COMMENT ON TABLE public.scheduled_session_participants IS 'Registro de usuarios apuntados a sesiones programadas';
