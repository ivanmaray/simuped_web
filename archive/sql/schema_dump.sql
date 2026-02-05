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
-- Migration: Sesiones programadas - PARTE 3
-- Triggers y funciones adicionales (idempotentes)

-- 6) Trigger para updated_at automático
DROP TRIGGER IF EXISTS handle_scheduled_sessions_updated_at ON public.scheduled_sessions;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER handle_scheduled_sessions_updated_at
    BEFORE UPDATE ON public.scheduled_sessions
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7) Función para contar participantes inscritos (útil para queries)
DROP FUNCTION IF EXISTS public.get_session_participants_count(uuid);

CREATE OR REPLACE FUNCTION public.get_session_participants_count(session_id uuid)
RETURNS integer AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.scheduled_session_participants WHERE public.scheduled_session_participants.session_id = $1);
END;
$$ LANGUAGE 'plpgsql';
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
-- Migration: Evaluación - vista de críticas + grants e índices de soporte
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase.

-- 1) Vista v_attempt_criticals con nombres en inglés
CREATE OR REPLACE VIEW public.v_attempt_criticals AS
SELECT
  aa.attempt_id,
  COUNT(*) FILTER (WHERE q.is_critical)                AS total_criticals,
  COUNT(*) FILTER (WHERE q.is_critical AND aa.is_correct) AS criticals_ok,
  COUNT(*) FILTER (WHERE q.is_critical AND NOT aa.is_correct) AS criticals_failed
FROM public.attempt_answers aa
JOIN public.questions q ON q.id = aa.question_id
GROUP BY aa.attempt_id;

-- Asegurar SECURITY INVOKER (evalúa permisos del usuario que consulta)
ALTER VIEW public.v_attempt_criticals SET (security_invoker = on);

-- Permisos de lectura para clientes
GRANT SELECT ON public.v_attempt_criticals TO anon, authenticated;

-- 2) Índices recomendados (idempotentes)
CREATE INDEX IF NOT EXISTS attempt_answers_attempt_id_idx ON public.attempt_answers (attempt_id);
CREATE INDEX IF NOT EXISTS attempt_answers_question_id_idx ON public.attempt_answers (question_id);
CREATE INDEX IF NOT EXISTS case_resources_scenario_id_idx ON public.case_resources (scenario_id);

-- 3) (Opcional) RLS: habilitar si no estaba habilitado
-- ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 4) (Opcional) Policies mínimas necesarias para que la vista funcione
-- Nota: Ajusta nombres/condiciones según tus políticas actuales. Si ya tienes policies, no las dupliques.
--
-- DROP POLICY IF EXISTS "attempts select own" ON public.attempts;
-- CREATE POLICY "attempts select own" ON public.attempts
--   FOR SELECT USING (user_id = auth.uid());
--
-- DROP POLICY IF EXISTS "answers select via own attempts" ON public.attempt_answers;
-- CREATE POLICY "answers select via own attempts" ON public.attempt_answers
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM public.attempts a
--       WHERE a.id = attempt_id AND a.user_id = auth.uid()
--     )
--   );
--
-- DROP POLICY IF EXISTS "questions select for answered" ON public.questions;
-- CREATE POLICY "questions select for answered" ON public.questions
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1
--       FROM public.attempt_answers aa
--       JOIN public.attempts a ON a.id = aa.attempt_id
--       WHERE aa.question_id = id AND a.user_id = auth.uid()
--     )
--   );

-- 5) (Opcional) Único para evitar duplicados en participantes (si aplica)
-- CREATE UNIQUE INDEX IF NOT EXISTS presencial_participants_unique ON public.presencial_participants(user_id, session_id);

-- 6) Verificación rápida (ejecuta manualmente en el editor)
-- SELECT * FROM public.v_attempt_criticals LIMIT 10;
-- SELECT attempt_id, total_criticals, criticals_ok, criticals_failed FROM public.v_attempt_criticals LIMIT 10;

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

-- Migration: Enhanced Gamification Features
-- Adds tables and functions for badges, feedback, notifications, and analytics
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- BADGE SYSTEM TABLES
-- ============================================================================

-- Badge definitions table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  badge_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('online', 'presencial', 'achievement', 'special')),
  type TEXT NOT NULL CHECK (type IN ('milestone', 'scenario', 'role', 'expertise', 'performance', 'expertise', 'dedication', 'recognition', 'engagement')),
  medical_context TEXT,
  requirements JSONB NOT NULL DEFAULT '{}',
  color TEXT NOT NULL DEFAULT 'bg-blue-500 text-white',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User earned badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  earned_for TEXT, -- Optional: what triggered this badge
  UNIQUE(user_id, badge_id)
);

-- ============================================================================
-- FEEDBACK SYSTEM TABLES
-- ============================================================================

-- Scenario feedback table
CREATE TABLE IF NOT EXISTS public.scenario_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  aspects TEXT[] DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS AND TRENDS TABLES
-- ============================================================================

-- User performance analytics
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_attempts INTEGER DEFAULT 0,
  completed_attempts INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  total_time_spent INTERVAL DEFAULT '0 minutes',
  badges_earned_this_period INTEGER DEFAULT 0,
  feedback_submitted_this_period INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Peer comparison aggregates (updated daily via cron)
CREATE TABLE IF NOT EXISTS public.peer_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL, -- medicina, enfermeria, farmacia, etc.
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  average_score DECIMAL(5,2),
  total_users INTEGER DEFAULT 0,
  percentile_25 DECIMAL(5,2),
  percentile_75 DECIMAL(5,2),
  median_score DECIMAL(5,2),
  UNIQUE(role, date)
);

-- ============================================================================
-- NOTIFICATION SYSTEM TABLES
-- ============================================================================

-- User notification preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  badge_notifications BOOLEAN DEFAULT true,
  session_reminders BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT true,
  peer_updates BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('badge_earned', 'session_reminder', 'weekly_report', 'peer_update', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled sessions for notifications
CREATE TABLE IF NOT EXISTS public.scheduled_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('dual', 'classic', 'lecture')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTERVAL DEFAULT '2 hours',
  max_participants INTEGER,
  instructor_id UUID REFERENCES auth.users(id),
  scenario_id TEXT,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically award badges
CREATE OR REPLACE FUNCTION award_badge(
  p_user_id UUID,
  p_badge_id TEXT,
  p_earned_for TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  badge_exists BOOLEAN;
  already_earned BOOLEAN;
BEGIN
  -- Check if badge exists
  SELECT EXISTS(SELECT 1 FROM badges WHERE badge_id = p_badge_id) INTO badge_exists;
  IF NOT badge_exists THEN
    RAISE EXCEPTION 'Badge % does not exist', p_badge_id;
  END IF;

  -- Check if user already has this badge
  SELECT EXISTS(SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = p_badge_id) INTO already_earned;
  IF already_earned THEN
    RETURN FALSE; -- Already has badge
  END IF;

  -- Award the badge
  INSERT INTO user_badges (user_id, badge_id, earned_for) VALUES (p_user_id, p_badge_id, p_earned_for);

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    p_user_id,
    'badge_earned',
    '¡Nuevo logro conquistado!',
    'Has ganado el badge: ' || (SELECT title FROM badges WHERE badge_id = p_badge_id),
    json_build_object('badge_id', p_badge_id)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award badges after completion
CREATE OR REPLACE FUNCTION check_badge_eligibility(p_user_id UUID) RETURNS TABLE(badge_id TEXT, earned BOOLEAN) AS $$
DECLARE
  user_stats RECORD;
  badge_record RECORD;
BEGIN
  -- Get user stats
  SELECT
    COUNT(DISTINCT a.id) as total_attempts,
    COUNT(DISTINCT CASE WHEN a.finished_at IS NOT NULL THEN a.scenario_id END) as completed_scenarios,
    AVG(a.score) as avg_score,
    COUNT(ub.id) as badges_earned,
    COUNT(f.id) as feedback_count,
    COUNT(DISTINCT a.scenario_id) as unique_scenarios
  INTO user_stats
  FROM attempts a
  LEFT JOIN user_badges ub ON ub.user_id = p_user_id
  LEFT JOIN scenario_feedback f ON f.user_id = p_user_id
  WHERE a.user_id = p_user_id;

  -- Check each badge
  FOR badge_record IN SELECT * FROM badges LOOP
    CASE badge_record.badge_id
      WHEN 'online_first_simulation' THEN
        IF user_stats.total_attempts >= 1 THEN
          RETURN QUERY SELECT badge_record.badge_id, award_badge(p_user_id, badge_record.badge_id, 'First completed simulation');
        END IF;

      WHEN 'profesional_consistente' THEN
        IF user_stats.total_attempts >= 10 AND user_stats.avg_score >= 80 THEN
          RETURN QUERY SELECT badge_record.badge_id, award_badge(p_user_id, badge_record.badge_id, 'Consistent performance >=80% over 10 attempts');
        END IF;

      -- Add more badge checks here...

    END CASE;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check badges after attempt completion
CREATE OR REPLACE FUNCTION trigger_badge_check() RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_badge_eligibility(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on attempts completion
DROP TRIGGER IF EXISTS check_badges_on_attempt ON attempts;
CREATE TRIGGER check_badges_on_attempt
  AFTER INSERT OR UPDATE ON attempts
  FOR EACH ROW
  WHEN (NEW.finished_at IS NOT NULL)
  EXECUTE FUNCTION trigger_badge_check();

-- ============================================================================
-- INITIAL DATA SEEDING
-- ============================================================================

-- Insert medical badges
INSERT INTO public.badges (badge_id, title, description, icon, category, type, medical_context, requirements, color) VALUES
('online_first_simulation', 'Primer Pasos Clínicos', 'Completa tu primera simulación online', '🎯', 'online', 'milestone', 'Inicial exploration of clinical environments', '{"onlineAttempts": 1}', 'bg-green-500 text-white'),
('online_emergency_response', 'Respuesta de Emergencia', 'Maneja 3 casos de emergencia pediátrica', '🚑', 'online', 'scenario', 'Pediatric emergency management', '{"onlineAttempts": 3, "scenarioTypes": ["emergency"]}', 'bg-red-500 text-white'),
('online_critical_care', 'Maestro en Cuidados Críticos', 'Completa 5 simulaciones de cuidados intensivos', '🏥', 'online', 'scenario', 'Critical care and ICU management', '{"onlineAttempts": 5, "scenarioTypes": ["critical_care"]}', 'bg-blue-500 text-white'),
('presencial_team_leader', 'Líder del Equipo', 'Participa en 3 simulaciones presenciales como líder', '👨‍⚕️', 'presencial', 'role', 'Interprofessional leadership', '{"presencialAttempts": 3, "roles": ["instructor", "leader"]}', 'bg-purple-500 text-white'),
('presencial_med_safety', 'Seguridad en Farmacia', 'Supera 5 simulaciones con protocolos de prescripción', '💊', 'presencial', 'expertise', 'Medication safety and prescription protocols', '{"presencialAttempts": 5, "checkListAccuracy": 90}', 'bg-teal-500 text-white'),
('profesional_consistente', 'Profesional Consistente', 'Mantiene promedio >80% en 10 simulaciones', '⭐', 'achievement', 'performance', 'Clinical excellence and consistency', '{"totalAttempts": 10, "avgScore": 80}', 'bg-yellow-500 text-yellow-900'),
('maestro_interdisciplinar', 'Maestro Interdisciplinar', 'Excelencia en medicina, enfermería y farmacia', '🏆', 'achievement', 'expertise', 'Interdisciplinary clinical mastery', '{"rolesDiverse": 3, "performanceScore": 85}', 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'),
('pediatra_committed', 'Pediatra Comprometido', 'Completa 20 simulaciones con mejora continua', '🩺', 'achievement', 'dedication', 'Commitment to pediatric care excellence', '{"totalAttempts": 20, "improvementRate": 5}', 'bg-blue-600 text-white'),
('early_adopter', 'Innovador Temprano', 'Primer usuario en probar nuevas funcionalidades', '🌟', 'special', 'recognition', 'Technology adoption for medical education', '{"platformAdoption": true, "feedbackProvided": 3}', 'bg-pink-500 text-white'),
('feedback_champion', 'Campeón de Retroalimentación', 'Proporciona feedback detallado en simulaciones', '💬', 'special', 'engagement', 'Active contribution to teaching quality', '{"feedbackCount": 10, "feedbackQuality": 4.5}', 'bg-indigo-500 text-white')
ON CONFLICT (badge_id) DO NOTHING;

-- ============================================================================
-- CRON JOBS FOR ANALYTICS (requires pg_cron extension)
-- ============================================================================

-- Daily analytics refresh
SELECT cron.schedule(
  'daily_analytics_refresh',
  '0 3 * * *', -- Every day at 3 AM
  $$
  -- Update user analytics
  INSERT INTO user_analytics (user_id, date, total_attempts, completed_attempts, average_score, badges_earned_this_period, feedback_submitted_this_period)
  SELECT
    a.user_id,
    CURRENT_DATE,
    COUNT(a.id) as total_attempts,
    COUNT(CASE WHEN a.finished_at IS NOT NULL THEN 1 END) as completed_attempts,
    AVG(a.score) as average_score,
    COUNT(DISTINCT ub.id) as badges_earned,
    COUNT(DISTINCT f.id) as feedback_submitted
  FROM attempts a
  LEFT JOIN user_badges ub ON ub.user_id = a.user_id AND ub.earned_date >= CURRENT_DATE
  LEFT JOIN scenario_feedback f ON f.user_id = a.user_id AND f.submitted_at >= CURRENT_DATE
  WHERE a.started_at >= CURRENT_DATE
  GROUP BY a.user_id
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_attempts = EXCLUDED.total_attempts,
    completed_attempts = EXCLUDED.completed_attempts,
    average_score = EXCLUDED.average_score,
    badges_earned_this_period = EXCLUDED.badges_earned_this_period,
    feedback_submitted_this_period = EXCLUDED.feedback_submitted_this_period;

  -- Update peer analytics
  INSERT INTO peer_analytics (role, date, average_score, total_users, percentile_25, percentile_75, median_score)
  SELECT
    COALESCE(p.rol, 'unknown') as role,
    CURRENT_DATE,
    AVG(a.score) as average_score,
    COUNT(DISTINCT a.user_id) as total_users,
    percentile_cont(0.25) WITHIN GROUP (ORDER BY a.score) as percentile_25,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY a.score) as percentile_75,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY a.score) as median_score
  FROM attempts a
  JOIN profiles p ON p.id = a.user_id
  WHERE a.finished_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY p.rol
  ON CONFLICT (role, date) DO UPDATE SET
    average_score = EXCLUDED.average_score,
    total_users = EXCLUDED.total_users,
    percentile_25 = EXCLUDED.percentile_25,
    percentile_75 = EXCLUDED.percentile_75,
    median_score = EXCLUDED.median_score;
  $$
);

-- Weekly notification reminders (Mondays at 8 AM)
SELECT cron.schedule(
  'weekly_session_reminders',
  '0 8 * * 1',
  $$
  INSERT INTO notifications (user_id, type, title, message, metadata)
  SELECT
    up.user_id,
    'session_reminder',
    'Sesiones programadas esta semana',
    'Hay nuevas simulaciones presenciales programadas. No te pierdas la oportunidad de practicar.',
    json_build_object('session_count', 1)
  FROM user_notification_preferences up
  WHERE up.session_reminders = true
  AND EXISTS (
    SELECT 1 FROM scheduled_sessions ss
    WHERE ss.scheduled_at >= CURRENT_DATE
    AND ss.scheduled_at < CURRENT_DATE + INTERVAL '7 days'
    AND ss.status = 'scheduled'
  );
  $$
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;

-- Badges: readable by all authenticated users
CREATE POLICY "badges_select" ON public.badges FOR SELECT USING (true);

-- User badges: users can read their own
CREATE POLICY "user_badges_select" ON public.user_badges FOR SELECT USING (user_id = auth.uid());

-- Feedback: users can insert their own, read all aggregates
CREATE POLICY "scenario_feedback_insert" ON public.scenario_feedback FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "scenario_feedback_select" ON public.scenario_feedback FOR SELECT USING (true);

-- Analytics: users can read their own data
CREATE POLICY "user_analytics_select" ON public.user_analytics FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "peer_analytics_select" ON public.peer_analytics FOR SELECT USING (true);

-- Notifications: users can read and update their own
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Notification preferences: users can manage their own
CREATE POLICY "notification_preferences_all" ON public.user_notification_preferences FOR ALL USING (user_id = auth.uid());

-- Scheduled sessions: readable by all, managed by instructors/admin
CREATE POLICY "scheduled_sessions_select" ON public.scheduled_sessions FOR SELECT USING (true);
CREATE POLICY "scheduled_sessions_admin" ON public.scheduled_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS user_badges_badge_id_idx ON public.user_badges(badge_id, earned_date);
CREATE INDEX IF NOT EXISTS scenario_feedback_user_id_idx ON public.scenario_feedback(user_id, submitted_at);
CREATE INDEX IF NOT EXISTS scenario_feedback_scenario_id_idx ON public.scenario_feedback(scenario_id);
CREATE INDEX IF NOT EXISTS user_analytics_user_date_idx ON public.user_analytics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS peer_analytics_role_date_idx ON public.peer_analytics(role, date DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications(user_id, read_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS scheduled_sessions_scheduled_at_idx ON public.scheduled_sessions(scheduled_at) WHERE status = 'scheduled';

-- ============================================================================
-- VIEWS FOR EASY ACCESS
-- ============================================================================

-- User badge summary view
CREATE OR REPLACE VIEW public.v_user_badge_summary AS
SELECT
  ub.user_id,
  COUNT(*) as total_badges,
  COUNT(CASE WHEN b.category = 'online' THEN 1 END) as online_badges,
  COUNT(CASE WHEN b.category = 'presencial' THEN 1 END) as presencial_badges,
  COUNT(CASE WHEN b.category = 'achievement' THEN 1 END) as achievement_badges,
  COUNT(CASE WHEN b.category = 'special' THEN 1 END) as special_badges,
  MAX(ub.earned_date) as latest_badge_date
FROM public.user_badges ub
JOIN public.badges b ON b.badge_id = ub.badge_id
GROUP BY ub.user_id;

-- Recent notifications view
CREATE OR REPLACE VIEW public.v_recent_notifications AS
SELECT
  id,
  user_id,
  type,
  title,
  message,
  metadata,
  read_at IS NULL as is_unread,
  created_at
FROM public.notifications
ORDER BY created_at DESC;

-- Analytics summary view
CREATE OR REPLACE VIEW public.v_analytics_summary AS
SELECT
  ua.user_id,
  ua.date,
  ua.total_attempts,
  ua.completed_attempts,
  ua.average_score,
  pa.average_score as peer_average,
  pa.percentile_75,
  pa.median_score,
  CASE
    WHEN ua.average_score >= pa.percentile_75 THEN 'Top 25%'
    WHEN ua.average_score >= pa.median_score THEN 'Top 50%'
    ELSE 'Below median'
  END as peer_ranking
FROM public.user_analytics ua
LEFT JOIN public.peer_analytics pa ON pa.date = ua.date
ORDER BY ua.date DESC;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.badges IS 'Medical badge definitions with requirements';
COMMENT ON TABLE public.user_badges IS 'Badges earned by users';
COMMENT ON TABLE public.scenario_feedback IS 'User feedback on completed scenarios';
COMMENT ON TABLE public.user_analytics IS 'Daily performance analytics per user';
COMMENT ON TABLE public.peer_analytics IS 'Aggregated peer performance data';
COMMENT ON TABLE public.notifications IS 'User notifications system';
COMMENT ON TABLE public.user_notification_preferences IS 'User notification settings';
COMMENT ON TABLE public.scheduled_sessions IS 'Enhanced scheduled sessions with notification system';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- To test the migration:
-- SELECT * FROM badges;
-- SELECT * FROM v_user_badge_summary LIMIT 5;
-- SELECT COUNT(*) FROM user_badges;
-- Migration: Tabla de invitaciones a sesiones programadas
CREATE TABLE IF NOT EXISTS public.scheduled_session_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE,
  inviter_id uuid REFERENCES auth.users(id),
  invited_email text NOT NULL,
  invited_name text,
  invited_role text,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed
  error_text text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.scheduled_session_invites IS 'Invitaciones enviadas o programadas para sesiones';
COMMENT ON COLUMN public.scheduled_session_invites.invited_email IS 'Correo del invitado';

GRANT SELECT, INSERT ON public.scheduled_session_invites TO authenticated;
GRANT ALL ON public.scheduled_session_invites TO service_role;

CREATE INDEX IF NOT EXISTS scheduled_session_invites_session_id_idx ON public.scheduled_session_invites (session_id);
CREATE INDEX IF NOT EXISTS scheduled_session_invites_email_idx ON public.scheduled_session_invites (invited_email);

-- Enable RLS and a basic policy so authenticated users can insert when they are the inviter
ALTER TABLE public.scheduled_session_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_insert_by_inviter" ON public.scheduled_session_invites
  FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid());
-- Seed: Microcaso de sepsis en lactante con ramificaciones clinicas
-- Fecha: 2025-11-01

DO $$
DECLARE
  v_case_id uuid;
  v_start_node uuid;
  v_fluid_response_node uuid;
  v_delay_node uuid;
  v_antibiotics_node uuid;
  v_inotrope_node uuid;
  v_observation_node uuid;
  v_multiorgan_failure_node uuid;
  v_transfer_failure_node uuid;
  v_renal_failure_node uuid;
  v_pulmonary_edema_node uuid;
  v_hemodynamic_reassessment_node uuid;
  v_steroid_info_node uuid;
  v_source_control_node uuid;
  v_recovery_node uuid;
  v_adrenal_crisis_node uuid;
  v_uncontrolled_focus_node uuid;
BEGIN
  INSERT INTO public.micro_cases (
    slug,
    title,
    summary,
    estimated_minutes,
    difficulty,
    recommended_roles,
    recommended_units,
    is_published,
    created_by
  ) VALUES (
    'sepsis-lactante-choque-inicial',
    'Lactante con sospecha de sepsis en choque',
    'Evalua a un lactante febril con signos de choque septico. Prioriza intervenciones tempranas, interpreta la respuesta clinica y decide la escalada terapeutica.',
    8,
    'intermedio',
    ARRAY['Pediatria', 'Urgencias'],
    ARRAY['Emergencias', 'UCI Pediatrica'],
    true,
    auth.uid()
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    estimated_minutes = EXCLUDED.estimated_minutes,
    difficulty = EXCLUDED.difficulty,
    recommended_roles = EXCLUDED.recommended_roles,
    recommended_units = EXCLUDED.recommended_units,
    is_published = EXCLUDED.is_published
  RETURNING id INTO v_case_id;

  -- Nodo 1: valoracion inicial (inicio)
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'Lactante de 4 meses, 6.5 kg, fiebre de 39 C y taquicardia de 210 lpm. Extremidades frias, relleno capilar > 3 s, TA 65/35 mmHg. Venoclisis periferica recien colocada. Cual es el siguiente paso?',
    0,
    false
  ) RETURNING id INTO v_start_node;

  -- Nodo 2: reevaluacion tras el primer bolo
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'decision',
    'Tras un bolo rapido de 20 ml/kg de cristaloides, la frecuencia cardiaca desciende a 185 lpm y la TA sube a 72/40 mmHg, pero persisten taquipnea y signos de hipoperfusion. Se sospecha foco abdominal. Que haces a continuacion?',
    1,
    false,
    '{"monitoring": "Continuar monitorizacion estrecha de signos de perfusion."}'::jsonb
  ) RETURNING id INTO v_fluid_response_node;

  -- Nodo 3: deterioro por retraso terapeutico
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'Han pasado 10 minutos sin reanimacion efectiva. Lactato en ascenso, relleno capilar > 5 s y presion 60/32 mmHg. El equipo solicita direccion para revertir el choque. Cual es tu plan inmediato?',
    2,
    false
  ) RETURNING id INTO v_delay_node;

  -- Nodo 4: administracion precoz de antibioticos
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'info',
    'Se administran antibioticos de amplio espectro (ceftriaxona + vancomicina) dentro de los primeros 15 minutos. Se obtienen hemocultivos y se activa protocolo de sepsis.',
    3,
    false
  ) RETURNING id INTO v_antibiotics_node;

  -- Nodo 5: decision sobre soporte vasoactivo
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'Tras el segundo bolo (total 40 ml/kg) persiste hipotension (68/38 mmHg), acidosis metabolica y signos de hipoperfusion. El lactante esta intubado y con acceso central listo. Como escalas el manejo hemodinamico?',
    4,
    false
  ) RETURNING id INTO v_inotrope_node;

  -- Nodo 6: perfusion insuficiente pese a reanimacion limitada
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'Persisten signos de gasto cardiaco bajo, diuresis escasa y saturacion venosa central 55 por ciento. El equipo plantea mantener la estrategia conservadora o escalar. Que ordenas?',
    5,
    false
  ) RETURNING id INTO v_observation_node;

  -- Nodo 7: falla multiorganica
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'El retraso terapeutico prolongado lleva a choque refractario y falla multiorganica. El paciente requiere perfusion extracorporea emergente con pronostico reservado.',
    6,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_multiorgan_failure_node;

  -- Nodo 8: traslado sin estabilizacion
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'El traslado sin estabilizacion provoca paro cardiorespiratorio en la ambulancia. Se documenta brecha critica por no iniciar soporte en el sitio.',
    7,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_transfer_failure_node;

  -- Nodo 9: progresion a falla renal aguda
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'La persistencia de perfusion renal deficiente desencadena falla renal aguda e indica necesidad de terapia de reemplazo. Pronostico funcional comprometido.',
    8,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_renal_failure_node;

  -- Nodo 10: edema pulmonar por sobrecarga
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'La sobrecarga brusca de fluidos produce edema pulmonar severo, empeora la oxigenacion y obliga a estrategias ventilatorias agresivas.',
    9,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_pulmonary_edema_node;

  -- Nodo 11: reevaluacion hemodinamica tras vasopresor
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'Tras iniciar adrenalina a 0.08 mcg/kg/min la PAM sube a 55 mmHg y la perfusion mejora discretamente, pero el lactato sigue en 5.2 mmol/L, la piel esta marmorea y persiste diuresis escasa. Se sospecha insuficiencia suprarrenal relativa. Que conducta tomas?',
    10,
    false
  ) RETURNING id INTO v_hemodynamic_reassessment_node;

  -- Nodo 12: soporte hormonal
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'info',
    'Se administra hidrocortisona en bolo de 2 mg/kg seguido de infusion continua. Se documenta mejoria progresiva de la PAM, menor requerimiento de adrenalina y lactato en descenso.',
    11,
    false
  ) RETURNING id INTO v_steroid_info_node;

  -- Nodo 13: control del foco
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'El ultrasonido abdominal revela coleccion purulenta perihepatica con asas distendidas. La presion arterial se mantiene borderline con adrenalina y esteroides. Como avanzas con el control del foco?',
    12,
    false
  ) RETURNING id INTO v_source_control_node;

  -- Nodo 14: desenlace favorable
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'Tras drenaje quirurgico oportuno, soporte vasoactivo escalonado y esteroides de stress, el lactante estabiliza signos vitales, normaliza lactato y progresa a cuidados intensivos con buen pronostico.',
    13,
    true,
    '{"is_correct": true}'::jsonb
  ) RETURNING id INTO v_recovery_node;

  -- Nodo 15: shock refractario por adrenal crisis
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'Se omite el soporte esteroideo y el choque se vuelve catecolamina refractario, con hipoglucemia recurrente y riesgo de paro cardiaco inminente.',
    14,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_adrenal_crisis_node;

  -- Nodo 16: foco no controlado
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'Retrasar el control quirurgico permite progresion a peritonitis difusa, empeora la perfusion y obliga a soporte multiorganico prolongado.',
    15,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_uncontrolled_focus_node;

  -- Opciones del nodo inicial
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_start_node,
      'Iniciar bolo de 20 ml/kg de cristaloides e indicar reevaluacion completa a los 5 minutos.',
      v_fluid_response_node,
      'Correcto. Completar el primer bolo y reevaluar rapidamente te permite medir la respuesta y planear la siguiente intervencion.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_start_node,
      'Comenzar norepinefrina en el acceso disponible mientras organizas mas volumen.',
      v_inotrope_node,
      'La catecolamina puede ayudar, pero iniciarla antes de completar la resucitacion con volumen limita la respuesta. Prioriza los bolos y ajusta despues.',
      -1,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_start_node,
      'Solicitar panel completo de laboratorio y aguardar los resultados antes de nuevos bolos.',
      v_delay_node,
      'Retrasar la resucitacion esperando examenes pierde tiempo valioso. Toma laboratorios en paralelo y continua con el soporte inicial.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_start_node,
      'Asegurar un segundo acceso periférico, monitorizar presion y saturacion continua y sostener el bolo indicado.',
      v_fluid_response_node,
      'Excelente. Enfermeria mantiene accesos redundantes y monitoreo estrecho para detectar cambios tempranos durante la resucitacion.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_start_node,
      'Priorizar la actualizacion de registros y esperar la siguiente valoracion medica antes de intervenir en la reanimacion.',
      v_delay_node,
      'La documentacion es clave, pero en choque debes centrarte en accesos, monitorizacion y apoyo al bolo para evitar retrasos.',
      -1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_start_node,
      'Verificar peso y calcular dosis de ceftriaxona y vancomicina para mezclarlas en cuanto confirmen la via.',
      v_fluid_response_node,
      'Perfecto. Farmacia adelanta la preparacion sin interferir con los bolos y acorta el tiempo a antibiotico.',
      2,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_start_node,
      'Esperar los hemocultivos para ajustar concentraciones antes de preparar la mezcla antibiotica.',
      v_delay_node,
      'Demorar la mezcla a la espera de cultivos retrasa la primera dosis. Prepara la cobertura empirica y ajusta despues.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones tras la primera respuesta a fluidos
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_fluid_response_node,
      'Indicar antibioticos de amplio espectro dentro de los primeros 15 minutos y documentar el tiempo de administracion.',
      v_antibiotics_node,
      'Clave. Iniciar antibioticos tempranos reduce mortalidad; deja indicadas las dosis y sigue con soporte hemodinamico.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_fluid_response_node,
      'Solicitar TAC abdominal urgente y posponer la dosis empirica hasta contar con imagen.',
      v_delay_node,
      'La imagen aporta informacion, pero diferir el antibiotico prolonga la bacteriemia. Coordina la TAC una vez administrada la terapia inicial.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_fluid_response_node,
      'Reducir los bolos a mantenimiento hasta ver evolucion ulterior sin reevaluacion estructurada.',
      v_observation_node,
      'Detenerte temprano puede dejar hipoperfusion persistente. Define objetivos claros y continua la reanimacion guiada.',
      -1,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_fluid_response_node,
      'Coordinar un segundo acceso, preparar bomba de infusion y anticipar requerimientos de vasopresor segun la respuesta.',
      v_antibiotics_node,
      'Excelente coordinacion de enfermeria: aseguras vias efectivas y rapidez cuando se escale a vasopresores.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_fluid_response_node,
      'Disminuir la velocidad del bolo actual por temor a sobrecarga sin revisar signos de perfusion en equipo.',
      v_observation_node,
      'Ajustar sin evaluacion compartida puede perpetuar la hipoperfusion. Usa criterios clinicos y comunica cambios antes de reducir la reanimacion.',
      -1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_fluid_response_node,
      'Liberar la mezcla antibiotica preparada y confirmar compatibilidades con las perfusiones activas.',
      v_antibiotics_node,
      'Gran aporte de farmacia: reduces retrasos y evitas incompatibilidades con soporte vasoactivo.',
      2,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_fluid_response_node,
      'Mantener los antibioticos reservados en la central hasta tener culturas para ajustar la dilucion.',
      v_delay_node,
      'Retener la dosis empirica a la espera de resultados prolonga el choque. Dispensa la terapia base y ajusta luego con los cultivos.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_fluid_response_node,
      'Coordinar acceso permeable y preparar bomba de infusion para iniciar antibioticos ya indicados.',
      v_antibiotics_node,
      'Clave en enfermeria: aseguras vias efectivas y aceleras la administracion sin retrasos adicionales.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_fluid_response_node,
      'Liberar la mezcla antibiotica y revisar interacciones con perfusiones activas antes de administrarla.',
      v_antibiotics_node,
      'Excelente. Aseguras compatibilidad y reduces riesgo de interrupciones en soporte vasopresor.',
      2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones tras iniciar antibioticos (nodo info)
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_antibiotics_node,
      'Indicar un segundo bolo de 20 ml/kg y dejar listo el inicio de adrenalina si persiste la hipotension.',
      v_inotrope_node,
      'Adecuado: continuar con reanimacion guiada y anticipar soporte vasoactivo evita nuevas caidas hemodinamicas.',
      1,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_antibiotics_node,
      'Reducir los bolos a 10 ml/kg y observar la tendencia de TA antes de decidir una escalada.',
      v_observation_node,
      'Quedarte corto con volumen puede mantener la hipoperfusion. Usa las guias de reanimacion completa antes de observar.',
      -1,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_antibiotics_node,
      'Verificar accesos, preparar bomba de perfusion y coordinar monitorizacion continua durante la administracion del segundo bolo.',
      v_inotrope_node,
      'Excelente soporte de enfermeria: aseguras vias seguras, bombas listas y datos hemodinamicos en tiempo real.',
      1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_antibiotics_node,
      'Esperar 20 minutos para revisar si la TA permanece estable antes de solicitar nuevo bolo.',
      v_observation_node,
      'La mejoria parcial puede revertirse. Reevaluar de inmediato y solicitar bolos adicionales segun guias es preferible a esperar sin accion.',
      -1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_antibiotics_node,
      'Ajustar dosis segun funcion renal estimada y confirmar compatibilidades de las mezclas con las lineas activas.',
      v_inotrope_node,
      'Gran aporte farmaceutico: garantizas dosis seguras y evitas interacciones mientras el equipo escalara soporte.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_antibiotics_node,
      'Reservar la segunda dosis hasta tener cultivos que orienten la cobertura definitiva.',
      v_delay_node,
      'Diferir la segunda dosis favorece recurrencias hemodinamicas. Mantén la cobertura empirica completa mientras llegan los resultados.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones tras el retraso terapeutico
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_delay_node,
      'Reiniciar reanimacion agresiva: bolos secuenciales y antibioticos inmediatos.',
      v_fluid_response_node,
      'Corregir el retraso abre la posibilidad de revertir el choque, pero has perdido tiempo valioso. Sigue reanimando.',
      1,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_delay_node,
      'Mantener observacion y esperar laboratoriales completos.',
      v_multiorgan_failure_node,
      'No actuar profundiza el choque y precipita falla multiorganica. La demora es letal.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_delay_node,
      'Trasladar a otro hospital sin estabilizar previamente.',
      v_transfer_failure_node,
      'Un traslado sin soporte reproduce eventos catastroficos. Debes estabilizar antes de derivar.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_delay_node,
      'Coordinar bolos escalonados, monitor continuo y avisar a farmacia para que libere antibioticos ya preparados.',
      v_fluid_response_node,
      'Excelente reaccion del equipo: sincronizas reanimacion, monitorizacion y antimicrobianos para recuperar terreno.',
      1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_delay_node,
      'Registrar signos cada 30 minutos mientras observas si la TA se recupera sin nuevas intervenciones.',
      v_multiorgan_failure_node,
      'La observacion pasiva en choque prolonga la hipoperfusion. Comunica la urgencia y participa de la reanimacion activa.',
      -2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_delay_node,
      'Activar alerta sepsis y liberar inmediatamente los antibioticos preparados para aplicar en cuanto haya acceso seguro.',
      v_fluid_response_node,
      'Excelente practica farmaceutica: reduces el tiempo a la primera dosis y comunicas la urgencia al equipo.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_delay_node,
      'Esperar confirmacion medica antes de reconfeccionar la mezcla, aun si eso retrasa unos minutos la administracion.',
      v_transfer_failure_node,
      'En esta fase cada minuto cuenta. Ajusta la mezcla si luego cambian el plan, pero no demores la dispensa inicial.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones en el escenario de perfusion insuficiente
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_observation_node,
      'Titular adrenalina a 0.08 mcg/kg/min, solicitar acceso arterial y ajustar segun respuesta cada pocos minutos.',
      v_inotrope_node,
      'Buena decision: combinas catecolaminas con monitorizacion avanzada para guiar el soporte en tiempo real.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_observation_node,
      'Mantener solo el aporte de mantenimiento y reevaluar cuando haya cambios en la diuresis.',
      v_renal_failure_node,
      'La diuresis tardará en reponerse si no corriges la hipoperfusion. Necesitas escalar soporte antes de esperar resultados urinarios.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_observation_node,
      'Indicar otro bolo completo de 20 ml/kg pese a signos de congestión venosa y sin guia hemodinamica adicional.',
      v_pulmonary_edema_node,
      'Aumentar volumen a ciegas con signos de congestión favorece edema pulmonar. Busca datos hemodinamicos antes de repetir bolos completos.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_observation_node,
      'Preparar la bomba de adrenalina, reforzar monitoreo continuo y reportar cambios de presion y perfusion cada 3 minutos.',
      v_inotrope_node,
      'Enfermeria sostiene la titulacion de catecolaminas y aporta datos constantes para ajustar el soporte.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_observation_node,
      'Reducir la frecuencia de controles a cada 30 minutos para evitar alarmas mientras se estabiliza el paciente.',
      v_renal_failure_node,
      'Disminuir la vigilancia en choque puede pasar por alto deterioros. Mantén controles estrechos y comunica cambios de inmediato.',
      -2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_observation_node,
      'Confirmar diluciones de adrenalina y proponer uso de bomba de jeringa para ajustes finos sin interrupciones.',
      v_inotrope_node,
      'Gran aporte farmaceutico: aseguras estabilidad de concentraciones y evitas errores al titular la catecolamina.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_observation_node,
      'Sugerir cambiar a coloides para ganar volumen sostenido en lugar de revisar la estrategia vasoactiva.',
      v_pulmonary_edema_node,
      'Agregar coloides sin reevaluar la perfusion ni la sobrecarga puede empeorar el cuadro respiratorio. Prioriza la optimizacion vasoactiva.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones de escalada vasoactiva
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_inotrope_node,
      'Iniciar infusion de adrenalina en dosis de choque (0.05-0.1 mcg/kg/min) y monitorizar respuesta.',
      v_hemodynamic_reassessment_node,
      'Escalada apropiada a catecolaminas tras fluidos agresivos. Reevalua parametros cada pocos minutos y considera soporte endocrino si persiste la inestabilidad.',
      3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_inotrope_node,
      'Iniciar dopamina a dosis bajas solo para proteger la funcion renal.',
      v_renal_failure_node,
      'La dopamina a dosis bajas no corrige la hipotension y retrasa el soporte efectivo. Selecciona catecolaminas apropiadas.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_inotrope_node,
      'Realizar bolos ilimitados de cristaloides sin monitorizar presion ni balance.',
      v_pulmonary_edema_node,
      'El exceso de fluidos precipita edema pulmonar y empeora oxigenacion. Ajusta fluidos segun respuesta.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_inotrope_node,
      'Ajustar la dilucion y compatibilidad de adrenalina con las soluciones en curso y apoyar la titulacion segura.',
      v_hemodynamic_reassessment_node,
      'Gran aporte farmaceutico: minimizas riesgos de precipitacion y respaldas la titulacion fina del vasopresor.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_inotrope_node,
      'Preparar bombas dedicadas para vasopresores, comunicar signos de extravasacion y acompañar la titulacion segun objetivos.',
      v_hemodynamic_reassessment_node,
      'Enfermeria garantiza administracion segura, monitorea complicaciones y documenta ajustes oportunamente.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_inotrope_node,
      'Mantener la adrenalina en dosis bajas de mantenimiento y enfocar el esfuerzo en nuevos bolos de cristaloides.',
      v_pulmonary_edema_node,
      'Sin ajustar la catecolamina ni monitor avanzado puedes terminar con sobrecarga y persistencia de hipoperfusion.',
      -1,
      false,
      ARRAY['enfermeria']::text[]
    );

  -- Opciones tras la reevaluacion hemodinamica
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_hemodynamic_reassessment_node,
      'Administrar hidrocortisona en dosis de stress y ajustar vasopresores segun respuesta.',
      v_steroid_info_node,
      'El soporte esteroideo restaura sensibilidad a catecolaminas y corrige la insuficiencia relativa. Controla glucosa y balance hidroelectrolitico.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Esperar resultados de laboratorio endocrino antes de añadir esteroides.',
      v_adrenal_crisis_node,
      'Retrasar el soporte hormonal permite progresion a choque refractario. Los esteroides deben iniciarse de inmediato en sepsis catecolamina resistente.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Aumentar de nuevo bolos rapidos de cristaloides sin guia hemodinamica.',
      v_pulmonary_edema_node,
      'Sobrecargar al paciente en esta fase aumenta edema pulmonar y dificulta la ventilacion sin mejorar perfusion.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Monitorizar glucosa y perfusion periferica mientras se inicia el soporte esteroideo indicado.',
      v_steroid_info_node,
      'Rol clave de enfermeria: detectas hipoglucemias y evalúas respuesta cutanea para ajustar rapidamente.',
      1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Validar compatibilidad de hidrocortisona con las soluciones activas y ajustar dilucion segun protocolos.',
      v_steroid_info_node,
      'Aporte farmaceutico decisivo: evitas interacciones y aseguras administracion segura del esteroide.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Limitar el monitoreo a controles cada media hora para dar tiempo a que actuen los vasopresores adicionales.',
      v_adrenal_crisis_node,
      'Reducir la frecuencia de controles puede pasar por alto deterioros; mantén vigilancia estrecha y comunica variaciones.',
      -1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Esperar confirmacion por escrito antes de liberar hidrocortisona aunque ya este indicada verbalmente.',
      v_adrenal_crisis_node,
      'Cuando el equipo ya la indico verbalmente en un choque refractario, demorar la dispensa prolonga la inestabilidad. Documenta despues pero libera el medicamento.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones tras soporte hormonal
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_steroid_info_node,
      'Coordinar imagen urgente y drenaje quirurgico del foco abdominal con el equipo de cirugia.',
      v_source_control_node,
      'El control del foco es pilar de la sepsis. Involucra a cirugia, prepara hemoderivados y planifica soporte perioperatorio.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_steroid_info_node,
      'Postergar intervencion hasta que el lactato normalice por completo.',
      v_uncontrolled_focus_node,
      'Esperar la normalizacion del lactato sin drenar el foco permite progresion de la infeccion y empeora el pronostico.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_steroid_info_node,
      'Suspender vasopresores ahora que la PAM mejoro a 55 mmHg.',
      v_multiorgan_failure_node,
      'Retirar soporte demasiado pronto precipita nueva caida hemodinamica y riesgo de paro circulatorio.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_steroid_info_node,
      'Mantener lineas permeables, controlar presion y glucosa cada 5 minutos tras el inicio de esteroides.',
      v_source_control_node,
      'Excelente coordinacion de enfermeria: detectas descompensaciones tempranas y sostienes el soporte ordenado.',
      1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_steroid_info_node,
      'Monitorear interacciones medicamento-medicamento y ajustar plan antibiotico segun cultivos preliminares.',
      v_source_control_node,
      'Aporte farmaceutico clave: garantizas terapia adecuada antes del control del foco.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_steroid_info_node,
      'Suspender momentaneamente la bomba de adrenalina porque la PAM parece estable tras los esteroides.',
      v_multiorgan_failure_node,
      'Reducir vasopresores sin un periodo de estabilidad sostenida puede provocar recaida hemodinamica. Mantén ajustes graduales.',
      -2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_steroid_info_node,
      'Continuar con el plan antibiotico previo sin revisar sinergias o niveles ahora que se sospecha foco abdominal.',
      v_uncontrolled_focus_node,
      'Al no revisar cobertura y sinergias puedes dejar brechas contra patogenos abdominales. Revisa el esquema y ajusta con el equipo.',
      -1,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones sobre el control del foco
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_source_control_node,
      'Coordinar laparotomia exploradora urgente con drenaje y continuar antibioticos de amplio espectro.',
      v_recovery_node,
      'La combinacion de control del foco, soporte hemodinamico y antibioticos oportunos permite revertir el choque y mejora el pronostico.',
      3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_source_control_node,
      'Continuar solo con vasopresores y reevaluar en 6 horas.',
      v_uncontrolled_focus_node,
      'Sin control del foco la infeccion persiste y se generaliza, anulando el beneficio de las catecolaminas.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_source_control_node,
      'Trasladar al paciente a otro centro sin estabilizacion hemodinamica completa.',
      v_transfer_failure_node,
      'El traslado en choque sin control del foco y sin soporte completo incrementa mortalidad y complica la resucitacion.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_source_control_node,
      'Preparar el traslado a quirofano asegurando soporte, bombas y reposicion rapida durante el procedimiento.',
      v_recovery_node,
      'Coordinacion de enfermeria impecable: mantienes la perfusion durante el control del foco.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_source_control_node,
      'Garantizar disponibilidad de antibioticos intraoperatorios y ajustar dosis en la hoja perioperatoria.',
      v_recovery_node,
      'Farmacia asegura continuidad antimicrobiana y reduce fallas de cobertura durante el control quirurgico.',
      2,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_source_control_node,
      'Retrasar la coordinacion quirurgica hasta que el lactato descienda por debajo de 2 mmol/L.',
      v_uncontrolled_focus_node,
      'Esperar marcadores perfectos antes de drenar el foco permite progresion de la infeccion. Coordina el control de foco en paralelo al soporte.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_source_control_node,
      'Reducir las bombas a modo mantenimiento durante el traslado para simplificar la logistica.',
      v_transfer_failure_node,
      'Disminuir el soporte para facilitar el traslado provoca recaidas hemodinamicas. Ajusta gradualmente y mantén equipos dedicados.',
      -2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_source_control_node,
      'Aplazar la reposicion de antibioticos porque se administraron hace menos de una hora.',
      v_uncontrolled_focus_node,
      'Sin redosificar intraoperatoriamente puedes quedar sin cobertura adecuada. Prepara dosis de refuerzo acorde a la duracion del procedimiento.',
      -1,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Asegurar que el microcaso apunte al nodo inicial
  UPDATE public.micro_cases
    SET start_node_id = v_start_node
  WHERE id = v_case_id;
END;
$$;
-- Migration: Microcasos clínicos interactivos
-- Fecha: 2025-11-01

-- 1) Tabla principal de microcasos
CREATE TABLE IF NOT EXISTS public.micro_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  title text NOT NULL,
  summary text,
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 1 AND 60),
  difficulty text CHECK (difficulty IN ('facil', 'intermedio', 'avanzado')),
  recommended_roles text[] DEFAULT '{}',
  recommended_units text[] DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  start_node_id uuid
);

COMMENT ON TABLE public.micro_cases IS 'Casos clínicos cortos con decisiones ramificadas.';
COMMENT ON COLUMN public.micro_cases.slug IS 'Identificador legible para URLs.';
COMMENT ON COLUMN public.micro_cases.estimated_minutes IS 'Duración estimada del microcaso.';
COMMENT ON COLUMN public.micro_cases.difficulty IS 'Nivel de dificultad percibida.';
COMMENT ON COLUMN public.micro_cases.start_node_id IS 'Nodo inicial del microcaso.';

-- 2) Nodos del árbol de decisiones
CREATE TABLE IF NOT EXISTS public.micro_case_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.micro_cases(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'decision' CHECK (kind IN ('decision', 'info', 'outcome')),
  body_md text NOT NULL,
  media_url text,
  order_index integer DEFAULT 0,
  is_terminal boolean NOT NULL DEFAULT false,
  auto_advance_to uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.micro_case_nodes IS 'Pasos individuales dentro del microcaso.';
COMMENT ON COLUMN public.micro_case_nodes.kind IS 'Tipo de paso: decision, info o outcome.';
COMMENT ON COLUMN public.micro_case_nodes.body_md IS 'Contenido en markdown para mostrar en pantalla.';
COMMENT ON COLUMN public.micro_case_nodes.auto_advance_to IS 'Nodo al que se salta automáticamente (informativo).' ;

-- 3) Opciones por nodo
CREATE TABLE IF NOT EXISTS public.micro_case_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.micro_case_nodes(id) ON DELETE CASCADE,
  label text NOT NULL,
  next_node_id uuid,
  feedback_md text,
  score_delta integer DEFAULT 0,
  is_critical boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.micro_case_options IS 'Opciones de decisión disponibles para cada nodo.';
COMMENT ON COLUMN public.micro_case_options.score_delta IS 'Puntos ganados o perdidos al seleccionar la opción.';

-- 4) Intentos de usuarios
CREATE TABLE IF NOT EXISTS public.micro_case_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.micro_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  score_total integer DEFAULT 0,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  UNIQUE(case_id, user_id, started_at)
);

COMMENT ON TABLE public.micro_case_attempts IS 'Historial de intentos de usuarios sobre microcasos.';

-- 5) Pasos dentro de cada intento
CREATE TABLE IF NOT EXISTS public.micro_case_attempt_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.micro_case_attempts(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.micro_case_nodes(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.micro_case_options(id) ON DELETE SET NULL,
  outcome_label text,
  score_delta integer DEFAULT 0,
  elapsed_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.micro_case_attempt_steps IS 'Detalle de decisiones tomadas en cada intento.';

-- 6) Índices para acelerar consultas
CREATE INDEX IF NOT EXISTS micro_cases_published_idx ON public.micro_cases (is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS micro_case_nodes_case_idx ON public.micro_case_nodes (case_id);
CREATE INDEX IF NOT EXISTS micro_case_options_node_idx ON public.micro_case_options (node_id);
CREATE INDEX IF NOT EXISTS micro_case_attempts_user_idx ON public.micro_case_attempts (user_id, case_id);
CREATE INDEX IF NOT EXISTS micro_case_attempt_steps_attempt_idx ON public.micro_case_attempt_steps (attempt_id);

-- 7) Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_micro_case_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_micro_cases_updated_at
  BEFORE UPDATE ON public.micro_cases
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_micro_case_updated_at();

-- 8) Row Level Security
ALTER TABLE public.micro_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_case_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_case_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_case_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_case_attempt_steps ENABLE ROW LEVEL SECURITY;

-- Reglas básicas para lectura de microcasos publicados
CREATE POLICY micro_cases_select_published
  ON public.micro_cases
  FOR SELECT
  USING (is_published = true);

-- Autores e instructores pueden gestionar sus propios casos
CREATE POLICY micro_cases_manage_own
  ON public.micro_cases
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Nodos y opciones heredan permisos del caso
CREATE POLICY micro_case_nodes_select
  ON public.micro_case_nodes
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.micro_cases c
    WHERE c.id = micro_case_nodes.case_id
      AND (c.is_published = true OR c.created_by = auth.uid())
  ));

CREATE POLICY micro_case_options_select
  ON public.micro_case_options
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.micro_case_nodes n
    JOIN public.micro_cases c ON c.id = n.case_id
    WHERE n.id = micro_case_options.node_id
      AND (c.is_published = true OR c.created_by = auth.uid())
  ));

-- Los usuarios autenticados pueden crear sus intentos
CREATE POLICY micro_case_attempts_user_insert
  ON public.micro_case_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY micro_case_attempts_user_select
  ON public.micro_case_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY micro_case_attempt_steps_user_manage
  ON public.micro_case_attempt_steps
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.micro_case_attempts a
    WHERE a.id = micro_case_attempt_steps.attempt_id
      AND a.user_id = auth.uid()
  ));

-- Permisos para roles de servicio
GRANT ALL ON public.micro_cases TO service_role;
GRANT ALL ON public.micro_case_nodes TO service_role;
GRANT ALL ON public.micro_case_options TO service_role;
GRANT ALL ON public.micro_case_attempts TO service_role;
GRANT ALL ON public.micro_case_attempt_steps TO service_role;

GRANT SELECT ON public.micro_cases TO authenticated;
GRANT SELECT ON public.micro_case_nodes TO authenticated;
GRANT SELECT ON public.micro_case_options TO authenticated;
GRANT SELECT, INSERT ON public.micro_case_attempts TO authenticated;
GRANT SELECT, INSERT ON public.micro_case_attempt_steps TO authenticated;

-- 9) Vista rápida para listados (opcional)
CREATE OR REPLACE VIEW public.micro_cases_overview AS
SELECT
  c.id,
  c.slug,
  c.title,
  c.summary,
  c.estimated_minutes,
  c.difficulty,
  c.recommended_roles,
  c.recommended_units,
  c.is_published,
  c.updated_at,
  COALESCE(node_counts.total_nodes, 0) AS node_count
FROM public.micro_cases c
LEFT JOIN (
  SELECT case_id, COUNT(*) AS total_nodes
  FROM public.micro_case_nodes
  GROUP BY case_id
) AS node_counts ON node_counts.case_id = c.id;

COMMENT ON VIEW public.micro_cases_overview IS 'Resumen de microcasos con conteo de nodos.';
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
-- Migration: Fix start_node for trauma-neuro-guard
-- Fecha: 2025-11-04

DO $$
DECLARE
  v_case_id UUID;
  v_info_id UUID;
BEGIN
  SELECT id INTO v_case_id FROM public.micro_cases WHERE slug = 'trauma-neuro-guard' LIMIT 1;
  IF v_case_id IS NULL THEN
    RAISE NOTICE 'micro_case with slug trauma-neuro-guard not found; skipping';
    RETURN;
  END IF;

  SELECT id INTO v_info_id
  FROM public.micro_case_nodes
  WHERE case_id = v_case_id
    AND (metadata->>'roles_source') = 'interactiveTrainingData_v1'
  LIMIT 1;

  IF v_info_id IS NULL THEN
    RAISE NOTICE 'info node with roles_source interactiveTrainingData_v1 not found for case %; skipping', v_case_id;
    RETURN;
  END IF;

  UPDATE public.micro_cases
  SET start_node_id = v_info_id,
      updated_at = now()
  WHERE id = v_case_id;

  RAISE NOTICE 'micro_case % start_node_id set to info node %', v_case_id, v_info_id;
END $$;
-- Migration: Scenario change logs
-- Tracks scenario edits with user, timestamp, and summary

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.scenario_change_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id INTEGER NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  change_type TEXT NOT NULL CHECK (char_length(change_type) > 0),
  description TEXT,
  meta JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scenario_change_logs_scenario_id_idx ON public.scenario_change_logs (scenario_id, created_at DESC);
-- Add optional ordering column to scenarios
BEGIN;

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS idx integer;

COMMENT ON COLUMN public.scenarios.idx IS 'Optional ordering index for scenarios list';

-- Helpful index for ordering/filtering
CREATE INDEX IF NOT EXISTS scenarios_idx_idx ON public.scenarios (idx);

COMMIT;
-- Add competencies column to case_briefs
-- Stores an array of competency objects: [{ key, label, expected, notes, weight }]
-- Safe to run multiple times
ALTER TABLE public.case_briefs
ADD COLUMN IF NOT EXISTS competencies jsonb;

-- Optionally ensure it's either null or a JSON array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'case_briefs_competencies_is_array'
  ) THEN
    ALTER TABLE public.case_briefs
    ADD CONSTRAINT case_briefs_competencies_is_array
    CHECK (competencies IS NULL OR jsonb_typeof(competencies) = 'array');
  END IF;
END$$;
-- Migration: Upsert trauma-neuro-guard roles and roleScoring
-- Fecha: 2025-11-15

DO $$
DECLARE
  v_case_id UUID;
  v_info_id UUID;
  v_decision_id UUID;
  v_epidural_id UUID;
  v_subdural_id UUID;
  v_axonal_id UUID;
  v_concusion_id UUID;
BEGIN

  -- 1) Upsert the micro_case row
  INSERT INTO public.micro_cases
    (slug, title, summary, estimated_minutes, difficulty, recommended_roles, is_published, created_at, updated_at)
  VALUES
    ('trauma-neuro-guard',
     'Impacto craneal con signos neurologicos',
     'Paciente somnoliento con anisocoria progresiva. Prioriza la proteccion neurologica, el control hemodinamico y la seleccion de imagenes clave.',
     20,
     'intermedio',
     ARRAY[]::text[],
     true,
     now(), now())
  ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        estimated_minutes = EXCLUDED.estimated_minutes,
        difficulty = EXCLUDED.difficulty,
        recommended_roles = ARRAY[]::text[],
        is_published = EXCLUDED.is_published,
        updated_at = now()
  RETURNING id INTO v_case_id;

  -- 2) Remove any previous roles-info node
  DELETE FROM public.micro_case_nodes
  WHERE case_id = v_case_id
    AND (metadata->>'roles_source') = 'interactiveTrainingData_v1';

  -- 3) Insert info node
  INSERT INTO public.micro_case_nodes
    (case_id, kind, body_md, metadata, order_index, is_terminal, auto_advance_to, target_roles)
  VALUES
    (v_case_id,
     'info',
     'Roles y orientaciones para el equipo: farmacia y enfermería. Incluye responsabilidades, lista de fármacos clave, checks y criterios de scoring.',
     '{"roles_source":"interactiveTrainingData_v1", "roles": {
        "pharmacy": {
          "responsibilities": [
            "Verificar alergias y antecedentes farmacologicos antes de dispensar",
            "Calcular dosis peso-dependientes y preparar concentraciones seguras",
            "Coordinar disponibilidad de agentes osmoticos y sangre irradiada si es necesario",
            "Asesorar sobre interacciones farmacologicas y ajuste renal/hepatico"
          ],
          "medicationList": [
            {
              "id": "manitol",
              "label": "Manitol 20%",
              "concentration": "20% w/v (200 g/L)",
              "concentration_g_per_100ml": 20,
              "dosing_g_per_kg": "0.5-1 g/kg IV bolo",
              "volume_calculation_note": "1 g = 5 mL of 20% solution. Volume_ml = dose_g * 5",
              "example_20kg": "Dose 0.5-1 g/kg -> 10-20 g = 50-100 mL of 20% solution",
              "administration": "IV bolus over 10-20 minutes (use infusion pump when available)",
              "monitoring": [
                "Controlar osmolaridad serica: mantener <320 mOsm/kg (detener si >320)",
                "Control Na serico cada 2-6 horas durante tratamiento y ajustar segun cambio plasmatico",
                "Vigilar diuresis: objetivo >0.5 mL/kg/h y monitorizar creatinina",
                "Vigilar signos de sobrecarga volemica / edema pulmonar"
              ],
              "contraindications": [
                "Anuria o insuficiencia renal grave",
                "Hipovolemia grave no corregida",
                "Edema pulmonar / insuficiencia cardiaca descompensada"
              ],
              "preparation": [
                "Confirmar peso y calcular dosis en gramos y volumen en mL (usar formula)",
                "Usar jeringa o bolsa con etiquetado claro (nombre, dosis g, volumen mL, hora)",
                "Administrar por bomba si disponible; si bolo, controlar tiempo de infusión (10-20 min)"
              ],
              "notes": "Revisar indicación con neurocirugía; evitar repetidos bolos si oliguria o creatinina en ascenso"
            },
            {
              "id": "hipertonica",
              "label": "Suero hipertonico 3%",
              "concentration": "3% NaCl",
              "dosing": "2 mL/kg IV en 10-15 min (ej. 20 kg -> 40 mL)",
              "administration_note": "Administrar por jeringa/bolo controlado; usar bomba si se requiere infusion",
              "monitoring": [
                "Control Na serico cada 1-4 horas durante correccion aguda",
                "Limitar incremento de Na a <10-12 mEq/L en 24 horas para evitar desmielinizacion"
              ],
              "warnings": [
                "Monitorizar presion arterial y signos de sobrecarga volume",
                "Evitar en hiponatremia cronica sin control especializado"
              ]
            },
            {"id":"rocuronio","label":"Rocuronio","dosing":"1 mg/kg IV (RSI)","notes":"Preparar reversores y bomba infusora"},
            {"id":"fentanilo","label":"Fentanilo","dosing":"1 mcg/kg IV bolo (analgesia)","notes":"Registrar hora y vigilar depresion respiratoria"},
            {"id":"noradrenalina","label":"Noradrenalina","dosing":"0.05-0.2 mcg/kg/min","notes":"Configurar bomba con concentracion estandar y guiar titulacion"}
          ],
          "checks": [
            "Confirmar peso reciente y unidad de medida (kg)",
            "Verificar alergias documentadas en la historia y en el formulario de ingreso",
            "Revisar interacciones (ej. anticoagulantes, antihipertensivos) antes de administrar bolos/vasopresores",
            "Asegurar que el material de administración (bombas, cateteres) esté disponible y compatible"
          ],
          "preparation": [
            "Preparar bolsas y jeringas con etiquetado claro (nombre, dosis mg/ml, hora)",
            "Establecer concentraciones estandar para infusiones vasoactivas segun protocolo pediatrico",
            "Priorizar entrega de medicamentos criticos (RSI, osmoterapia) con comunicacion directa al equipo"
          ]
        },
        "nursing": {
          "responsibilities": [
            "Mantener alineacion cervical y vigilancia continua de via aerea",
            "Monitorizar signos neurologicos (pupilas, GCS) cada 5-15 minutos según estabilizacion",
            "Ejecutar protocolos de intubacion y asistente en RSI",
            "Administrar medicacion segun prescripcion y validar dosis con farmacia"
          ],
          "monitoring": [
            "Registrar PA, PAM, FC, FR y SpO2 cada 5 minutos en fase critica",
            "Registrar volumen diuresis por hora si hay sospecha de TBI y uso de osmoterapia",
            "Monitorizar osmolaridad serica si se administra manitol/hipertonico",
            "Vigilar sedacion y ajustar perfusion segun ordenes medicas y objetivo de sedacion"
          ],
          "tasks": [
            "Preparar y asistir en traslado seguro a TAC con equipo y oxigeno",
            "Colocar y asegurar acceso venoso central si es necesario para vasopresores",
            "Asegurar monitorizacion continua y documentar cambios neurologicos inmediatamente",
            "Comunicar de forma estructurada (SBAR) a neurocirugia y anestesia"
          ],
          "documentation": [
            "Registrar hora de investigacion clave (ingreso a TAC, inicio de manitol, inicio de vasopresor)",
            "Detalle de medicacion (dosis, via, lote si aplica) y respuesta clinica",
            "Nota de transferencia detallada si se traslada al quirófano o UCI"
          ]
        }
      },
      "roleScoring": {
        "pharmacy": {
          "weightCalculation": 10,
          "allergyCheck": 10,
          "dosingAccuracy": 40,
          "preparationTimeliness": 20,
          "communication": 20
        },
        "nursing": {
          "airwayManagement": 25,
          "neuroMonitoring": 25,
          "vitalsDocumentation": 15,
          "sedationTitration": 20,
          "escalation": 15
        }
      }
    }'::jsonb,
     0,
     false,
     NULL,
     ARRAY['medico', 'farmacia', 'enfermeria'])
  RETURNING id INTO v_info_id;

  -- 4) Insert decision node
  INSERT INTO public.micro_case_nodes
    (case_id, kind, body_md, metadata, order_index, is_terminal)
  VALUES
    (v_case_id,
     'decision',
     'Selecciona el diagnóstico más probable basado en los hallazgos clínicos y de imagen.',
     '{}'::jsonb,
     1,
     false)
  RETURNING id INTO v_decision_id;

  -- 5) Insert outcome nodes
  INSERT INTO public.micro_case_nodes
    (case_id, kind, body_md, metadata, order_index, is_terminal)
  VALUES
    (v_case_id,
     'outcome',
     '¡Correcto! El hematoma epidural agudo explica la anisocoria progresiva y el desplazamiento de línea media en la TAC. Se requiere evacuación neuroquirúrgica urgente.',
     '{"is_correct": true}'::jsonb,
     2,
     true)
  RETURNING id INTO v_epidural_id;

  INSERT INTO public.micro_case_nodes
    (case_id, kind, body_md, metadata, order_index, is_terminal)
  VALUES
    (v_case_id,
     'outcome',
     'Incorrecto. El hematoma subdural agudo es posible, pero la TAC muestra una colección biconvexa típica de epidural. Revisa los hallazgos de imagen.',
     '{"is_correct": false}'::jsonb,
     3,
     true)
  RETURNING id INTO v_subdural_id;

  INSERT INTO public.micro_case_nodes
    (case_id, kind, body_md, metadata, order_index, is_terminal)
  VALUES
    (v_case_id,
     'outcome',
     'Incorrecto. La lesión axonal difusa no explica la colección focal con efecto de masa. Considera lesiones extraaxiales.',
     '{"is_correct": false}'::jsonb,
     4,
     true)
  RETURNING id INTO v_axonal_id;

  INSERT INTO public.micro_case_nodes
    (case_id, kind, body_md, metadata, order_index, is_terminal)
  VALUES
    (v_case_id,
     'outcome',
     'Incorrecto. La conmoción cerebral leve no produce anisocoria ni desplazamiento de línea media. Requiere evaluación más detallada.',
     '{"is_correct": false}'::jsonb,
     5,
     true)
  RETURNING id INTO v_concusion_id;

  -- 6) Insert options for the decision node
  INSERT INTO public.micro_case_options
    (node_id, label, next_node_id, feedback_md, score_delta, is_critical)
  VALUES
    (v_decision_id, 'Hematoma epidural agudo', v_epidural_id, 'Diagnóstico correcto. Evacuación urgente requerida.', 100, true),
    (v_decision_id, 'Hematoma subdural agudo', v_subdural_id, 'Incorrecto. Revisa la morfología de la colección.', -20, false),
    (v_decision_id, 'Lesión axonal difusa', v_axonal_id, 'Incorrecto. No explica el efecto de masa focal.', -20, false),
    (v_decision_id, 'Conmoción cerebral leve', v_concusion_id, 'Incorrecto. Los signos requieren intervención.', -20, false);

  -- 7) Update info node to auto-advance to decision
  UPDATE public.micro_case_nodes
  SET auto_advance_to = v_decision_id
  WHERE id = v_info_id;

  -- 8) Set the case start_node_id to the inserted info node
  UPDATE public.micro_cases
  SET start_node_id = v_info_id
  WHERE id = v_case_id;

END $$;
-- Migration: escenario presencial - metadatos y equipamiento
-- Nota: Ajustar RLS y policies según tu modelo de seguridad antes de producción.

-- Tabla de metadatos específicos para modo presencial (1:1 con scenarios)
CREATE TABLE IF NOT EXISTS public.scenario_presencial_meta (
  scenario_id int PRIMARY KEY REFERENCES public.scenarios(id) ON DELETE CASCADE,
  dual_mode boolean DEFAULT false,              -- Vistas separadas alumno/instructor
  instructor_brief text,                       -- Brief específico para instructor
  student_brief text,                          -- Brief específico para alumnos
  room_layout jsonb,                           -- Representación de estaciones / layout
  roles_required jsonb,                        -- [{role: 'medico', min:1, max:2, notes:'...'}]
  checklist_template jsonb,                    -- [{group: 'ABC', items:[{label:'...', type:'bool'|'score'|'text', weight:1}]}]
  triggers jsonb,                              -- Reglas de eventos [{event:'variable_change', variable:'sat', condition:'<90', action:'show_alert'}]
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Tabla de equipamiento físico asociado al escenario
CREATE TABLE IF NOT EXISTS public.scenario_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id int NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  name text NOT NULL,                 -- Nombre del recurso (p.ej. "Monitor multiparámetros")
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  location text,                      -- Estación / sala / carrito
  category text,                      -- Clasificación (monitorizacion, via aérea, farmacologia, etc.)
  required boolean DEFAULT true,      -- Indica si es imprescindible
  notes text,                         -- Notas operativas
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_equipment_scenario ON public.scenario_equipment(scenario_id);

-- Trigger para updated_at (equipamiento)
CREATE OR REPLACE FUNCTION public.touch_scenario_equipment_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_scenario_equipment ON public.scenario_equipment;
CREATE TRIGGER trg_touch_scenario_equipment
BEFORE UPDATE ON public.scenario_equipment
FOR EACH ROW EXECUTE FUNCTION public.touch_scenario_equipment_updated_at();

-- Trigger para updated_at (meta presencial)
CREATE OR REPLACE FUNCTION public.touch_scenario_presencial_meta_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_scenario_presencial_meta ON public.scenario_presencial_meta;
CREATE TRIGGER trg_touch_scenario_presencial_meta
BEFORE UPDATE ON public.scenario_presencial_meta
FOR EACH ROW EXECUTE FUNCTION public.touch_scenario_presencial_meta_updated_at();

-- (Opcional) Policies RLS: habilitarlas sólo si RLS está activo
-- ALTER TABLE public.scenario_presencial_meta ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.scenario_equipment ENABLE ROW LEVEL SECURITY;
-- Añadir luego policies adaptadas a roles admin/instructor.
-- Migration: RLS policies para tablas de simulación presencial
-- Fecha: 2025-11-15
-- Objetivo: Habilitar Row Level Security y políticas básicas para acceso
-- Modelo de roles: profiles.is_admin (boolean) determina privilegios de escritura.
-- Ajusta / amplía estas políticas según la lógica de asignación de instructores.

-- Habilitar RLS
ALTER TABLE public.scenario_presencial_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_equipment ENABLE ROW LEVEL SECURITY;

-- Políticas SELECT (cualquier usuario autenticado puede leer)
DROP POLICY IF EXISTS presencial_meta_select_auth ON public.scenario_presencial_meta;
CREATE POLICY presencial_meta_select_auth ON public.scenario_presencial_meta
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS presencial_equipment_select_auth ON public.scenario_equipment;
CREATE POLICY presencial_equipment_select_auth ON public.scenario_equipment
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Políticas de modificación (solo admins)
DROP POLICY IF EXISTS presencial_meta_admin_mod ON public.scenario_presencial_meta;
CREATE POLICY presencial_meta_admin_mod ON public.scenario_presencial_meta
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin
    )
  );

DROP POLICY IF EXISTS presencial_equipment_admin_mod ON public.scenario_equipment;
CREATE POLICY presencial_equipment_admin_mod ON public.scenario_equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin
    )
  );

-- Nota: El rol 'service_role' ignora RLS, mantén llaves seguras.
-- Para ampliar a instructores específicos crea tabla de relación y ajusta USING.
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
-- Seed: Microcaso complejo de status epiléptico pediátrico refractario
-- Fecha: 2025-11-16
-- Objetivo: Entrenar manejo escalonado rápido del status epiléptico, dosificación por peso, monitoreo y prevención de complicaciones.
-- Características: múltiple toma de decisiones por rol (médico, enfermería, farmacia), incluye manejo de vía aérea, benzodiacepinas, segunda/tercera línea y estado refractario.
-- Idempotente: ON CONFLICT por slug actualiza metadatos sin duplicar nodos (se procesan nodos y opciones sólo si no existen por cuerpo y orden/label).

DO $$
DECLARE
  v_case_id uuid;
  -- Nodos principales (decision/info/outcome)
  v_inicio_node uuid;
  v_post_benzo_node uuid;
  v_segunda_linea_node uuid;
  v_revaluacion_10_node uuid;
  v_refractario_pre_intub_node uuid;
  v_intubacion_node uuid;
  v_midazolam_inf_node uuid;
  v_eeg_continuo_node uuid;
  v_hipoglucemia_node uuid;
  v_hiponatremia_node uuid;
  v_complicacion_aspiracion_node uuid;
  v_complicacion_sobredosis_node uuid;
  v_complicacion_hipotension_node uuid;
  v_control_final_node uuid;
  v_refractario_ketamina_node uuid;
  v_propofol_error_node uuid;
  v_riesgo_neuronal_node uuid;
BEGIN
  INSERT INTO public.micro_cases (
    slug,
    title,
    summary,
    estimated_minutes,
    difficulty,
    recommended_roles,
    recommended_units,
    is_published,
    created_by
  ) VALUES (
    'status-epileptico-pediatrico-refractario',
    'Status epiléptico pediátrico refractario',
    'Niño de 7 años (24 kg) con convulsión tónico-clónica generalizada >5 min que no cede tras primera benzodiacepina. Requiere escalada rápida, protección neurológica y prevención de complicaciones sistémicas.',
    12,
    'avanzado',
    ARRAY['Pediatria','Urgencias','Neurologia'],
    ARRAY['Emergencias','UCI Pediatrica'],
    true,
    auth.uid()
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    estimated_minutes = EXCLUDED.estimated_minutes,
    difficulty = EXCLUDED.difficulty,
    recommended_roles = EXCLUDED.recommended_roles,
    recommended_units = EXCLUDED.recommended_units,
    is_published = EXCLUDED.is_published
  RETURNING id INTO v_case_id;

  -- Nodo inicial
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'Urgencias 21:15h. Niño de 7 años (24 kg) con antecedente de epilepsia focal ocasional controlada con levetiracetam. Los padres refieren que olvidó la dosis de la tarde. Convulsión tónico-clónica generalizada iniciada hace 5 minutos. FC 138 lpm, FR 26 irregular, SatO2 92% aire ambiente, TA 106/66, temp axilar 37.1°C, glucemia capilar 78 mg/dL. Movimientos tónico-clónicos generalizados persistentes, hipersalivación moderada, cianosis perioral leve. Pupilas medias reactivas. Acceso IV difícil (obesidad, venas poco visibles). Protocolo SECIP: primera benzodiacepina intranasal/bucal ya disponible. ¿Acción inmediata según algoritmo?',
    0,
    false
  ) RETURNING id INTO v_inicio_node;

  -- Nodo post segunda benzodiacepina (T+10 min según SECIP)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'decision',
    'T+10 min. Midazolam intranasal 0.2 mg/kg administrado a T+0. A T+5 min sin respuesta: midazolam IV 0.15 mg/kg (3.6 mg) administrado (acceso IV obtenido). Ahora T+10 min total: persiste actividad convulsiva generalizada. FC 148, TA 102/64, SatO2 94% con O2 mascarilla 10L, secreciones moderadas. Glucemia 76 mg/dL. Según protocolo SECIP: tras 2 benzodiacepinas sin respuesta en 10 min → iniciar SEGUNDA LÍNEA. Opciones: fenitoína/fosfenitoína 20 mg PE/kg, valproato 40 mg/kg, o levetiracetam 60 mg/kg. ¿Qué fármaco de segunda línea seleccionas considerando perfil del paciente (epiléptico conocido en LEV crónico, sin cardiopatía)?',
    1,
    false,
    '{"phase":"segunda_linea","benzos_completadas":2}'::jsonb
  ) RETURNING id INTO v_post_benzo_node;

  -- Nodo reevaluación post segunda línea (T+25-30 min)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+25 min. Segunda línea completada hace 10 min (infusión en 15 min según protocolo). Persiste actividad convulsiva, ahora con clonías hemicuerpo derecho intermitentes. FC 152, TA 98/60 (PAM 73), SatO2 92% con reservorio, secreciones abundantes. Gasometría: pH 7.32, pCO2 48, lactato 2.8, glucemia 82 mg/dL. Según SECIP: status refractario establecido si no responde tras segunda línea completa (>20-30 min total). Opciones: tercera línea (fenobarbital 20 mg/kg, valproato si no usado, o segundo antiepiléptico) vs preparar intubación + anestésicos. ¿Decisión considerando tiempo neuronal crítico y deterioro respiratorio?',
    2,
    false
  ) RETURNING id INTO v_segunda_linea_node;

  -- Nodo tercera línea / status refractario (T+30-40 min)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+35 min. STATUS EPILÉPTICO REFRACTARIO confirmado (>30 min, 2 benzodiacepinas + segunda línea sin respuesta). Convulsión persiste. SatO2 90% con reservorio, CO2 elevado (EtCO2 54 mmHg), secreciones abundantes, trabajo respiratorio aumentado. TA 94/56 (PAM 69). Protocolo SECIP tercera línea: FENOBARBITAL 20 mg/kg IV lento (20 min) O intubación + anestésicos (midazolam/propofol/tiopental). Riesgo fenobarbital sin vía aérea: apnea, hipotensión. Considerar: ¿fenobarbital pre-intubación con preparación para IOT inmediata vs asegurar vía aérea primero y anestésicos?',
    3,
    false
  ) RETURNING id INTO v_revaluacion_10_node;

  -- Nodo preparación intubación status refractario
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+40 min. Decisión: INTUBACIÓN para status refractario. SatO2 88%, CO2 56 mmHg, TA 92/58 (PAM 69). SECIP recomienda: inducción secuencia rápida adaptada, evitar propofol si inestabilidad hemodinámica. Opciones inductores: 1) TIOPENTAL 4-5 mg/kg (antiepiléptico potente, riesgo hipotensión moderado), 2) MIDAZOLAM 0.2-0.3 mg/kg (seguro, menos hipotensor), 3) PROPOFOL 2-3 mg/kg (evitar si PAM límite). Relajante: rocuronio 1 mg/kg + fentanilo 1 mcg/kg. ¿Qué inductor seleccionas considerando PAM 69 y objetivo antiepiléptico?',
    4,
    false
  ) RETURNING id INTO v_refractario_pre_intub_node;

  -- Nodo intubación realizada correctamente
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'info',
    'Se realiza intubación con protección cervical ligera y preoxigenación. Inducción según inductor seleccionado + FENTANILO 1 mcg/kg + ROCURONIO 1.2 mg/kg. Laringoscopia directa, tubo 6.0 mm con balón, confirmación capnografía (curva normal), auscultación bilateral simétrica. Se inicia ventilación controlada: VC 180 mL (7.5 mL/kg), FR 20, PEEP 5, FiO2 0.6. Monitoreo continuo. EEG continuo en preparación.',
    5,
    false,
    '{"airway":"secured"}'::jsonb
  ) RETURNING id INTO v_intubacion_node;

  -- Nodo infusión anestésicos status superrefractario
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+50 min. Post-intubación. Ventilación controlada estable: SatO2 98%, EtCO2 38. Infusión continua iniciada. Persiste actividad convulsiva (difícil valorar clínicamente bajo relajante). EEG continuo solicitado (llegará en 20 min). Protocolo SECIP status super-refractario: MIDAZOLAM 0.1-0.4 mg/kg/h (titular a burst-suppression en EEG) O TIOPENTAL 3-5 mg/kg/h O PROPOFOL 1-5 mg/kg/h (precaución PRIS en pediátricos). Alternativa: añadir KETAMINA 0.5-3 mg/kg/h (efecto NMDA, menos depresión hemodinámica). TA actual 88/54 (PAM 65, límite). ¿Estrategia de sedación considerando que EEG no está aún disponible?',
    6,
    false
  ) RETURNING id INTO v_midazolam_inf_node;

  -- Nodo EEG continuo y monitorización correcta (decision para estrategia destete)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'EEG continuo instalado. Se observa patrón evolutivo hacia supresión intermitente (burst-suppression) tras titulación de midazolam. Lactato 2.1 mmol/L, glucemia 86 mg/dL, Na 136 mEq/L. Paciente sedado profundamente, sin crisis clínicas aparentes. Ahora requiere estrategia de mantenimiento y destete: ¿Cómo manejas los próximos 24-48h para consolidar control sin recurrencia?',
    7,
    false
  ) RETURNING id INTO v_eeg_continuo_node;

  -- Nodo hipoglucemia detectada
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Demora en control glucémico: glucemia cae a 48 mg/dL sin corrección. Se agrava actividad epiléptica y riesgo de lesión neuronal difusa.',
    8,
    true,
    '{"is_correct":false,"complication":"hipoglucemia"}'::jsonb
  ) RETURNING id INTO v_hipoglucemia_node;

  -- Nodo hiponatremia sintomática
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Error en laboratorio: Na real 118 mEq/L no tratado. Convulsión persiste; se pierde oportunidad de corrección con SS hipertónica (3 mL/kg). Empeora edema cerebral.',
    9,
    true,
    '{"is_correct":false,"complication":"hiponatremia"}'::jsonb
  ) RETURNING id INTO v_hiponatremia_node;

  -- Nodo complicación aspiración
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'No se protegió vía aérea pese a secreciones y benzodiacepinas repetidas. Paciente aspiró contenido gástrico, desarrolla neumonía química y hipoxemia sostenida.',
    10,
    true,
    '{"is_correct":false,"complication":"aspiracion"}'::jsonb
  ) RETURNING id INTO v_complicacion_aspiracion_node;

  -- Nodo sobredosis (benzodiacepinas + fenobarbital rápido)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Administración acumulativa excesiva: múltiples benzodiacepinas seguidas de FENOBARBITAL 30 mg/kg rápido. Apnea profunda, hipotensión y necesidad de soporte vasopresor. Control de crisis tardío.',
    11,
    true,
    '{"is_correct":false,"complication":"sobredosis"}'::jsonb
  ) RETURNING id INTO v_complicacion_sobredosis_node;

  -- Nodo hipotensión por escalada sin monitorizar
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Escalada rápida a propofol y fenitoína sin monitoreo hemodinámico continuo provoca hipotensión sostenida (PAM 42 mmHg) y perfusión cerebral comprometida.',
    12,
    true,
    '{"is_correct":false,"complication":"hipotension"}'::jsonb
  ) RETURNING id INTO v_complicacion_hipotension_node;

  -- Nodo control final exitoso
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Status controlado en <45 min: benzodiacepinas adecuadas, segunda línea LEVETIRACETAM 60 mg/kg (máx 4.5 g) en infusión de 10 min, intubación oportuna, midazolam titulado a supresión eléctrica parcial, correcciones metabólicas vigiladas. Sin complicaciones mayores.',
    13,
    true,
    '{"is_correct":true}'::jsonb
  ) RETURNING id INTO v_control_final_node;

  -- Nodo ketamina añadido en refractario (info que conecta a EEG continuo)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'info',
    'Añadida KETAMINA: bolo 1.5 mg/kg seguido de 2 mg/kg/h complementando midazolam. A los 10 min: movimientos sutiles disminuyen, PAM estable 68 mmHg (mejor que con midazolam solo), FC 136. EEG continuo llega y muestra patrón evolutivo hacia supresión mayor. Estrategia combinada GABA+NMDA permite control sin colapso hemodinámico.',
    14,
    false
  ) RETURNING id INTO v_refractario_ketamina_node;

  -- Nodo error propofol en infusión prolongada
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Propofol usado >24 h a dosis altas sin vigilancia metabólica: acidosis láctica progresiva y riesgo de síndrome de infusión de propofol (PRIS).',
    15,
    true,
    '{"is_correct":false,"complication":"propofol_pris"}'::jsonb
  ) RETURNING id INTO v_propofol_error_node;

  -- Nodo riesgo neuronal por demora en segunda línea
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Demora >20 min en iniciar segunda línea tras fracasar benzodiacepinas. Mayor riesgo de lesión cortical difusa y discapacidad cognitiva futura.',
    16,
    true,
    '{"is_correct":false,"complication":"demora_segunda_linea"}'::jsonb
  ) RETURNING id INTO v_riesgo_neuronal_node;

  -----------------------------------------------------------------
  -- Opciones Nodo inicial
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_inicio_node,'Priorizar acceso IV inmediato (intraóseo si falla tras 90 seg) y benzodiacepina IV estándar',v_post_benzo_node,'Razonamiento sólido: el tiempo ya es crítico (5 min), acceso intraóseo garantiza vía en <2 min si periférica falla. Midazolam IV 0.15 mg/kg tiene mejor biodisponibilidad que repetir intranasal.',3,true,ARRAY['medico']),
    (v_inicio_node,'Repetir midazolam bucal 0.3 mg/kg mientras se intenta acceso (doble vía)',v_post_benzo_node,'Aceptable si acceso IV muy difícil: vía bucal/intranasal repetida puede sumar efecto, pero retrasa escalada a segunda línea. Considera IO precoz.',1,false,ARRAY['medico']),
    (v_inicio_node,'Solicitar glucemia urgente y corregir antes de benzodiacepina (glucosa puede ser la causa)',v_hipoglucemia_node,'Error de priorización: glucemia 68 mg/dL es baja pero raramente causa única de status >8 min en epiléptico conocido. Benzodiacepina IV no debe retrasarse; glucosa puede darse simultánea.',-2,false,ARRAY['medico']),
    (v_inicio_node,'Iniciar directamente segunda línea (levetiracetam IV) tras única dosis intranasal sin benzodiacepina IV',v_riesgo_neuronal_node,'Saltar benzodiacepina IV pierde oportunidad de cese rápido. Guías recomiendan completar protocolo benzodiacepinas antes de segunda línea.',-3,false,ARRAY['medico']),
    (v_inicio_node,'Enfermería: preparar acceso intraóseo (humeral proximal), capnografía, aspiración continua y dextrosa 10% lista',v_post_benzo_node,'Excelente anticipación: acceso IO rápido si falla venoso, monitoreo respiratorio crítico, glucosa lista para corrección simultánea.',3,false,ARRAY['enfermeria']),
    (v_inicio_node,'Enfermería: registrar tiempos y esperar órdenes antes de adelantar material adicional',v_complicacion_aspiracion_node,'Actitud pasiva retrasa soporte. En emergencia neurológica, enfermería debe anticipar necesidades (IO, aspiración, capnografía).',-2,false,ARRAY['enfermeria']),
    (v_inicio_node,'Enfermería: comunicar al equipo dificultad de acceso y solicitar ayuda para IO precoz',v_post_benzo_node,'Comunicación efectiva: alertar al equipo sobre dificultad de acceso permite actuar rápido y evitar retrasos críticos. Trabajo en equipo salva tiempo neuronal.',2,false,ARRAY['enfermeria']),
    (v_inicio_node,'Enfermería: olvida monitorizar SatO2 y TA durante la crisis',v_complicacion_aspiracion_node,'Error frecuente: no monitorizar SatO2 y TA puede retrasar la detección de hipoxemia y complicaciones. Monitorización continua es esencial en status.',-2,false,ARRAY['enfermeria']),
    (v_inicio_node,'Farmacia: calcular y preparar midazolam IV 0.15 mg/kg, levetiracetam carga 60 mg/kg y fosfenitoína 20 PE/kg como alternativas',v_segunda_linea_node,'Proactivo e inteligente: anticipa fallo de benzodiacepinas y prepara segunda línea. Considera que paciente ya toma LEV crónico (puede necesitar dosis estándar completa).',3,false,ARRAY['farmacia']),
    (v_inicio_node,'Farmacia: esperar confirmación de labs (función renal/hepática) antes de preparar cargas',v_riesgo_neuronal_node,'Retraso innecesario: función renal/hepática se asume normal en niño previamente sano. Labs pueden hacerse paralelas.',-2,false,ARRAY['farmacia']);
    (v_inicio_node,'Farmacia: prepara dosis de midazolam sin etiquetar ni doble check',v_complicacion_sobredosis_node,'Error de seguridad: no etiquetar ni verificar dosis puede causar sobredosis accidental. Farmacia debe seguir doble check y trazabilidad.',-2,false,ARRAY['farmacia']),

  -----------------------------------------------------------------
  -- Opciones post benzodiacepinas (T+10 min: elegir segunda línea)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_post_benzo_node,'LEVETIRACETAM 60 mg/kg (1440 mg, máx 4500 mg) IV en 15 min',v_segunda_linea_node,'Excelente elección: paciente ya en LEV crónico (baja adherencia), carga de 60 mg/kg es segura y rápida. Perfil seguro: sin efecto hemodinámico, sin monitoreo ECG. SECIP lo incluye como segunda línea válida.',4,true,ARRAY['medico']),
    (v_post_benzo_node,'FOSFENITOÍNA 20 mg PE/kg (480 mg PE) IV en 15 min con monitoreo ECG continuo',v_segunda_linea_node,'Opción válida según SECIP: fenitoína es segunda línea clásica, efectiva. Requiere ECG (arritmias) y TA (hipotensión si rápido). Con TA estable 102/64 es segura. Mecanismo distinto a LEV.',3,true,ARRAY['medico']),
    (v_post_benzo_node,'VALPROATO 40 mg/kg (960 mg) IV en 5 min',v_segunda_linea_node,'Opción aceptable SECIP: valproato es segunda línea efectiva, infusión rápida tolerada. Precaución: hepatotoxicidad (<2 años o politerapia), hiperamoniemia. En este caso (7 años, monoterapia) es razonablemente seguro.',2,false,ARRAY['medico']),
    (v_post_benzo_node,'FENOBARBITAL 20 mg/kg (480 mg) IV lento en 20 min como segunda línea',v_complicacion_sobredosis_node,'Error de protocolo SECIP: fenobarbital es TERCERA línea (status refractario tras fallo de 2ª). Usarlo ahora sin vía aérea tiene alto riesgo de apnea/hipotensión.',-3,false,ARRAY['medico']),
    (v_post_benzo_node,'Repetir dosis de midazolam 0.15 mg/kg IV antes de segunda línea',v_complicacion_sobredosis_node,'Error: ya se administraron 2 benzodiacepinas (intranasal + IV). SECIP establece máximo 2 dosis antes de segunda línea. Más benzos aumenta riesgo sedación/apnea sin mejorar control.',-2,false,ARRAY['medico']),
    (v_post_benzo_node,'Enfermería: monitorizar TA/FC cada 2 min durante infusión, ECG continuo si fenitoína, segundo acceso IV',v_segunda_linea_node,'Esencial: segunda línea requiere monitoreo estrecho (fenitoína: arritmias/hipotensión; valproato: tolerancia). Segundo acceso permite infusiones paralelas.',3,false,ARRAY['enfermeria']),
    (v_post_benzo_node,'Enfermería: olvida comunicar caída de SatO2 durante infusión',v_complicacion_aspiracion_node,'Error grave: no comunicar hipoxemia puede retrasar intervención y aumentar riesgo de aspiración y daño cerebral.',-3,false,ARRAY['enfermeria']),
    (v_post_benzo_node,'Enfermería: prepara material de aspiración pero no verifica funcionamiento',v_complicacion_aspiracion_node,'Error frecuente: material no verificado puede fallar en momento crítico. Verificar funcionamiento antes de crisis es esencial.',-2,false,ARRAY['enfermeria']),
    (v_post_benzo_node,'Farmacia: verificar compatibilidad fenitoína (solo SSN, no dextrosa), calcular velocidad máxima infusión',v_segunda_linea_node,'Crítico: fenitoína precipita con dextrosa, requiere SSN. Velocidad máxima: 1-3 mg PE/kg/min para evitar hipotensión/arritmia. LEV y valproato son más flexibles.',2,false,ARRAY['farmacia']);
    (v_post_benzo_node,'Farmacia: prepara fenitoína en dextrosa por error',v_complicacion_hipotension_node,'Error de compatibilidad: fenitoína en dextrosa precipita y puede obstruir vía. Farmacia debe revisar compatibilidad antes de preparar.',-2,false,ARRAY['farmacia']),

  -----------------------------------------------------------------
  -- Opciones post segunda línea (T+25-30 min: tercera línea o refractario)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_segunda_linea_node,'FENOBARBITAL 20 mg/kg (480 mg) IV lento 20 min con preparación simultánea para intubación urgente si apnea',v_revaluacion_10_node,'Opción SECIP válida: fenobarbital es tercera línea recomendada. Con SatO2 92% y secreciones, tiene riesgo de apnea pero puede evitar intubación si funciona. Clave: equipo IOT listo, infusión lenta (20 min).',3,true,ARRAY['medico']),
    (v_segunda_linea_node,'Segunda línea alternativa: valproato 40 mg/kg si no se usó, o fenitoína si se usó LEV',v_revaluacion_10_node,'Razonable: algunas guías sugieren probar segundo fármaco de 2ª línea antes de fenobarbital. Pero con deterioro respiratorio (SatO2 92%, secreciones), puede retrasar control definitivo.',1,false,ARRAY['medico']),
    (v_segunda_linea_node,'Progresión directa a intubación + anestésicos (status refractario): deterioro respiratorio es indicación',v_revaluacion_10_node,'Decisión defensiva aceptable: con SatO2 92%, pCO2 48 y secreciones abundantes, asegurar vía aérea es razonable. Permite sedación profunda sin riesgo respiratorio. Válido según criterio clínico.',3,true,ARRAY['medico']),
    (v_segunda_linea_node,'Observación 10 min más: segunda línea puede hacer efecto tardío',v_riesgo_neuronal_node,'Error: T+25 min ya es tiempo suficiente para valorar respuesta (infusión completada hace 10 min). Esperar más prolonga daño neuronal sin justificación. Protocolo SECIP: actuar ahora.',-3,false,ARRAY['medico']),
    (v_segunda_linea_node,'Carga adicional de levetiracetam (30 mg/kg más)',v_complicacion_hipotension_node,'No recomendado: dosis total >90 mg/kg no mejora eficacia y puede causar efectos adversos. SECIP: tras fallo de 2ª línea → 3ª línea o anestésicos, no recargar.',-2,false,ARRAY['medico']),
    (v_segunda_linea_node,'Enfermería: kit IOT completo, capnografía, acceso central femoral, vasopresores preparados, bomba infusión',v_revaluacion_10_node,'Anticipación excelente: alta probabilidad de necesitar intubación (fenobarbital puede causar apnea, o fallo de 3ª línea). Acceso central para vasopresores, bomba para anestésicos.',4,false,ARRAY['enfermeria']),
    (v_segunda_linea_node,'Enfermería: olvida preparar bomba de infusión para anestésicos',v_complicacion_sobredosis_node,'Error: no preparar bomba puede llevar a administración manual y sobredosis accidental. Preparar bomba y verificar funcionamiento es esencial.',-3,false,ARRAY['enfermeria']),
    (v_segunda_linea_node,'Enfermería: comunica al equipo dificultad para aspirar secreciones',v_revaluacion_10_node,'Comunicación efectiva: informar dificultad permite buscar soluciones rápidas y evitar complicaciones respiratorias.',2,false,ARRAY['enfermeria']),
    (v_segunda_linea_node,'Farmacia: preparar midazolam, tiopental y ketamina en infusión continua para status refractario',v_revaluacion_10_node,'Proactivo: anticipa posible fallo de fenobarbital y necesidad de anestésicos IV. Tener preparadas las 3 opciones SECIP permite inicio inmediato.',3,false,ARRAY['farmacia']);
    (v_segunda_linea_node,'Farmacia: prepara dosis de fenobarbital sin doble check ni trazabilidad',v_complicacion_sobredosis_node,'Error de seguridad: no verificar dosis ni trazabilidad puede causar sobredosis y complicaciones graves. Farmacia debe seguir protocolo de seguridad.',-3,false,ARRAY['farmacia']),

  -----------------------------------------------------------------
  -- Opciones tercera línea / status refractario (T+35 min)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_revaluacion_10_node,'FENOBARBITAL 20 mg/kg IV lento (20 min) con equipo IOT listo para intubar si apnea',v_refractario_pre_intub_node,'Opción válida SECIP: fenobarbital es tercera línea estándar. Con SatO2 90% ya hay riesgo, pero si equipo IOT preparado puede intentarse. Infusión lenta reduce riesgo hipotensión/apnea.',2,false,ARRAY['medico']),
    (v_revaluacion_10_node,'Intubación INMEDIATA + anestésicos: deterioro respiratorio (SatO2 90%, CO2 54) es indicación absoluta',v_refractario_pre_intub_node,'Decisión correcta: SECIP establece que deterioro respiratorio significativo es indicación de IOT independientemente del algoritmo. SatO2 90% con reservorio + CO2 54 + secreciones = vía aérea insegura.',4,true,ARRAY['medico']),
    (v_revaluacion_10_node,'Probar segunda dosis de fenitoína o valproato antes de fenobarbital',v_complicacion_hipotension_node,'No recomendado: duplicar dosis de 2ª línea no está en protocolo SECIP y puede causar toxicidad (fenitoína: arritmias; valproato: hiperamoniemia) sin beneficio demostrado.',-2,false,ARRAY['medico']),
    (v_revaluacion_10_node,'Observación otros 10 min: puede haber respuesta tardía a segunda línea',v_riesgo_neuronal_node,'Error grave: T+35 min con deterioro respiratorio progresivo. Esperar más aumenta riesgo de paro respiratorio y daño neuronal irreversible. Actuar AHORA.',-4,false,ARRAY['medico']),
    (v_revaluacion_10_node,'Enfermería: preoxigenación con bolsa-mascarilla FiO2 1.0, aspiración previa, posición olfateo',v_refractario_pre_intub_node,'Excelente: preparación correcta pre-IOT. Preoxigenación crítica (ya hipoxémico), aspiración reduce riesgo aspiración, posición optimiza laringoscopia.',4,false,ARRAY['enfermeria']),
    (v_revaluacion_10_node,'Farmacia: calcular fenobarbital 20 mg/kg (480 mg) en 100 mL SSN, velocidad 5 mL/min (20 min)',v_refractario_pre_intub_node,'Preciso: cálculo correcto de dosis y velocidad. Infusión lenta (20 min) reduce riesgo de hipotensión y apnea bruscas.',2,false,ARRAY['farmacia']);

  -----------------------------------------------------------------
  -- Opciones preparación intubación (T+40 min: elección inductor)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_refractario_pre_intub_node,'MIDAZOLAM 0.2-0.3 mg/kg (5-7 mg) + fentanilo 1 mcg/kg + rocuronio 1 mg/kg',v_intubacion_node,'Opción segura y recomendada: midazolam es menos hipotensor, antiepiléptico eficaz, permite continuar infusión post-IOT. Ideal si inestabilidad hemodinámica. PAM 69 tolera bien. Evidencia internacional y práctica española lo priorizan.',4,true,ARRAY['medico']),
    (v_refractario_pre_intub_node,'PROPOFOL 2-3 mg/kg (48-72 mg) + fentanilo 1 mcg/kg + rocuronio 1 mg/kg',v_complicacion_hipotension_node,'Propofol solo si PAM >75 mmHg y con vigilancia estricta: riesgo de hipotensión y PRIS en pediátricos. No usar si inestabilidad hemodinámica. Midazolam es más seguro.',-3,false,ARRAY['medico']),
    (v_refractario_pre_intub_node,'Enfermería: preoxigenación FiO2 1.0, aspiración, atropina 0.02 mg/kg IV lista, vasopresores conectados',v_intubacion_node,'Excelente: preoxigenación crítica (SatO2 88%), atropina previene bradicardia vagal, vasopresores listos para hipotensión post-inducción (probable con propofol).',4,false,ARRAY['enfermeria']);
    (v_refractario_pre_intub_node,'Enfermería: olvida conectar vasopresores antes de inducción',v_complicacion_hipotension_node,'Error: no conectar vasopresores puede retrasar tratamiento de hipotensión post-inducción y aumentar riesgo de daño cerebral.',-3,false,ARRAY['enfermeria']),

  -----------------------------------------------------------------
  -- Opciones Nodo intubación / inicio infusión
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_intubacion_node,'Bolo midazolam 0.2 mg/kg + iniciar 0.1 mg/kg/h y titulación EEG',v_midazolam_inf_node,'Estandar internacional: titulación por EEG reduce actividad eléctrica residual. Midazolam es primera opción en infusión continua.',3,true,ARRAY['medico']),
    (v_intubacion_node,'Añadir inmediatamente ketamina sin valorar respuesta inicial a midazolam',v_refractario_ketamina_node,'Puede ser útil pero se recomienda valorar efecto inicial del midazolam; aun así opción aceptable en refractario severo.',1,false,ARRAY['medico']),
    (v_intubacion_node,'Iniciar propofol a dosis alta >6 mg/kg/h prolongada',v_propofol_error_node,'Riesgo síndrome de infusión si dosis alta prolongada sin vigilancia.',-3,false,ARRAY['medico']);

  -----------------------------------------------------------------
  -- Opciones desde nodo ketamina (conectar a EEG continuo)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_refractario_ketamina_node,'Continuar con estrategia combinada midazolam-ketamina, monitoreo EEG continuo',v_eeg_continuo_node,'Decisión muy razonada: status >40 min, hemodinamia límite (PAM 62 post-fluidos), movimientos sutiles persistentes. Ketamina aporta: mecanismo distinto (NMDA vs GABA), neuroprotección, soporte hemodinámico, efecto rápido. Sinergia midazolam-ketamina documentada en refractarios.',4,true,ARRAY['medico']);

  -----------------------------------------------------------------
  -- Opciones infusión anestésicos (T+50 min: status superrefractario)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_midazolam_inf_node,'MIDAZOLAM iniciar 0.1 mg/kg/h, titular cada 5-10 min hasta objetivo EEG (burst-suppression) máx 0.4 mg/kg/h',v_eeg_continuo_node,'Opción estándar internacional: midazolam es primera línea en status superrefractario, titulación guiada por EEG (burst-suppression es objetivo), perfil seguro. Inicio conservador permite valorar respuesta antes de escalar.',4,true,ARRAY['medico']),
    (v_midazolam_inf_node,'TIOPENTAL 3-5 mg/kg/h infusión continua, titular a burst-suppression en EEG (última línea)',v_eeg_continuo_node,'Tiopental puede considerarse como última línea en status superrefractario si midazolam y propofol fallan o están contraindicados. Requiere monitoreo hemodinámico invasivo, riesgo alto de hipotensión y depresión miocárdica. Uso restringido y solo en UCI.',2,false,ARRAY['medico']),
    (v_midazolam_inf_node,'PROPOFOL 1-3 mg/kg/h infusión continua (evitar >4 mg/kg/h >48h por riesgo PRIS)',v_eeg_continuo_node,'Opción con precaución: propofol efectivo pero SECIP advierte riesgo PRIS en pediátricos (acidosis láctica, rabdomiólisis, fallo cardíaco) si dosis altas >48h. Limitar dosis/tiempo, monitoreo lactato estricto. PAM 65 es contraindicación relativa.',1,false,ARRAY['medico']),
    (v_midazolam_inf_node,'MIDAZOLAM 0.1 mg/kg/h + KETAMINA 1-2 mg/kg/h (terapia combinada sin esperar EEG)',v_refractario_ketamina_node,'Estrategia combinada válida: mecanismos distintos (GABA + NMDA), ketamina aporta estabilidad hemodinámica y neuroprotección. Sin EEG aún, combinación empírica razonable. SECIP menciona ketamina como adyuvante.',3,false,ARRAY['medico']),
    (v_midazolam_inf_node,'Esperar EEG (20 min) antes de iniciar cualquier infusión, solo bolos de rescate',v_riesgo_neuronal_node,'Error: T+50 min, cada minuto adicional de status aumenta daño neuronal. Iniciar infusión empírica es prioritario, EEG guiará titulación después. No esperar pasivamente.',-3,false,ARRAY['medico']),
    (v_midazolam_inf_node,'Enfermería: línea arterial, PVC, monitoreo continuo PAM/lactato/temp, EEG cada hora si continuo no disponible',v_refractario_ketamina_node,'Anticipación sobresaliente: sedación profunda requiere PAM continua (línea arterial), PVC guía fluidos/vasopresores, lactato detecta PRIS, temperatura (hipotermia con anestésicos). EEG es esencial.',4,false,ARRAY['enfermeria']);
    (v_midazolam_inf_node,'Enfermería: olvida monitorizar temperatura y lactato durante infusión',v_complicacion_hipotension_node,'Error frecuente: no monitorizar temperatura y lactato puede retrasar detección de PRIS y complicaciones metabólicas. Monitorización avanzada es clave.',-2,false,ARRAY['enfermeria']),

  -----------------------------------------------------------------
  -- Opciones EEG continuo y manejo prolongado
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_eeg_continuo_node,'Titular sedación a BURST-SUPPRESSION (no supresión total), mantener 24-48h, destete gradual guiado por EEG',v_control_final_node,'Manejo excelente según SECIP: burst-suppression es objetivo (balance control/sedación), mantener 24-48h tras última crisis eléctrica, destete gradual 10-20%/12h vigilando recurrencia. Evita sobredosis y despertar prolongado.',4,true,ARRAY['medico']),
    (v_eeg_continuo_node,'Escalar a SUPRESIÓN ELÉCTRICA TOTAL (flat EEG) para máxima neuroprotección',v_complicacion_hipotension_node,'Error de concepto: supresión total no mejora pronóstico vs burst-suppression según evidencia, requiere dosis muy altas (hipotensión severa, vasopresores altos, despertar prolongado). SECIP recomienda burst-suppression.',-3,false,ARRAY['medico']),
    (v_eeg_continuo_node,'Destete precoz a las 12h si no hay crisis clínicas visibles (EEG como guía secundaria)',v_riesgo_neuronal_node,'Error grave: crisis eléctricas pueden persistir sin manifestación clínica (relajantes, sedación). SECIP exige mantener sedación 24-48h y destetear solo si EEG sin crisis. Destete precoz = recurrencia frecuente.',-4,false,ARRAY['medico']),
    (v_eeg_continuo_node,'Mantener sedación + iniciar antiepilépticos mantenimiento (LEV + valproato o fenitoína) para prevenir recurrencia',v_control_final_node,'Estratégica razonable: iniciar/optimizar antiepilépticos de mantenimiento mientras sedado reduce riesgo recurrencia al despertar. Politerapia justificada en status refractario.',2,false,ARRAY['medico']),
    (v_eeg_continuo_node,'Enfermería: monitoreo continuo EEG, glucemia/electrolitos cada 6h, balance restricción hídrica si SIADH, prevención úlceras/TVP',v_control_final_node,'Cuidados integrales: EEG continuo detecta crisis subclínicas, SIADH frecuente en status (restricción 50-70% mantenimiento), sedación prolongada requiere profilaxis úlceras/TVP.',3,false,ARRAY['enfermeria']),
    (v_eeg_continuo_node,'Enfermería: olvida restricción hídrica en SIADH',v_hiponatremia_node,'Error: no restringir líquidos en SIADH puede agravar hiponatremia y edema cerebral. Enfermería debe vigilar balance hídrico y comunicar cambios.',-3,false,ARRAY['enfermeria']),
    (v_eeg_continuo_node,'Farmacia: protocolo destete gradual anestésicos (reducir 10-20%/12h), ajustar antiepilépticos según niveles plasmáticos',v_control_final_node,'Plan estructurado: destete muy lento previene recurrencia, niveles plasmáticos guían optimización de mantenimiento (LEV, fenitoína, valproato).',2,false,ARRAY['farmacia']);
    (v_eeg_continuo_node,'Farmacia: olvida ajustar dosis de antiepilépticos según niveles plasmáticos',v_riesgo_neuronal_node,'Error: no ajustar dosis según niveles puede llevar a infradosificación o toxicidad y aumentar riesgo de recurrencia. Farmacia debe revisar niveles y comunicar.',-2,false,ARRAY['farmacia'])

END $$;

-- Migration: Reset trauma-neuro-guard microcase with full scenario flow
-- Fecha: 2025-11-16

DO $$
DECLARE
  v_case_id UUID;
  v_intro_node UUID;
  v_airway_decision UUID;
  v_airway_info UUID;
  v_airway_failure_outcome UUID;
  v_sedation_only_outcome UUID;
  v_hemo_decision UUID;
  v_hemo_info UUID;
  v_vaso_fail_outcome UUID;
  v_osmo_fail_outcome UUID;
  v_imaging_decision UUID;
  v_success_outcome UUID;
  v_delay_outcome UUID;
  v_wrong_diagnosis_outcome UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.micro_cases WHERE slug = 'trauma-neuro-guard') THEN
    DELETE FROM public.micro_cases WHERE slug = 'trauma-neuro-guard';
  END IF;

  INSERT INTO public.micro_cases (
    slug,
    title,
    summary,
    estimated_minutes,
    difficulty,
    recommended_roles,
    recommended_units,
    is_published,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    'trauma-neuro-guard',
    'Trauma craneal con signos neurológicos',
    'Paciente pediátrico con TCE grave, anisocoria súbita y riesgo de herniación. Coordina manejo de vía aérea, hemodinamia y derivación neuroquirúrgica.',
    15,
    'intermedio',
    ARRAY['Medicina', 'Enfermería', 'Farmacia'],
    ARRAY['Urgencias', 'UCI Pediátrica'],
    true,
    NULL,
    now(),
    now()
  )
  RETURNING id INTO v_case_id;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata,
    auto_advance_to
  ) VALUES (
    v_case_id,
    'info',
    $_INTRO$
### Ingreso a urgencias
Paciente masculino de 9 años que cae desde 3 metros. Llega con collar cervical, ventilación con bolsa-válvula-mascarilla y Glasgow 9. Se evidencia anisocoria izquierda en aumento, TA 90/55 mmHg, FC 136 lpm y SatO2 92 % con FiO2 0.6.

Se activa equipo de trauma: medicina coordina decisiones, enfermería prepara línea arterial y accesos, farmacia dispone osmoterapia y sedación RSI.
$_INTRO$,
    0,
    false,
    '{"roles_source": "reset_v2"}'::jsonb,
    NULL
  )
  RETURNING id INTO v_intro_node;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    $_AIRWAY_DECISION$
La saturación cae a 88 % pese a bolsa asistida. Pupila izquierda fija 6 mm. No hay ventilación controlada ni vía aérea definitiva.

¿Cuál es tu prioridad inmediata antes de trasladar a TAC?
$_AIRWAY_DECISION$,
    1,
    false
  )
  RETURNING id INTO v_airway_decision;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata,
    auto_advance_to
  ) VALUES (
    v_case_id,
    'info',
    $_AIRWAY_INFO$
Se coordina intubación en secuencia rápida con neuroprotección: preoxigenación, fentanilo + ketamina, rocuronio y control hemodinámico. Enfermería instala línea arterial radial y mantiene alineación cervical.

Farmacia etiqueta perfusiones de noradrenalina y prepara manitol 20 % y NaCl 3 % según peso (28 kg).
$_AIRWAY_INFO$,
    2,
    false,
    '{"roles_source": "reset_v2", "focus": "airway"}'::jsonb,
    NULL
  )
  RETURNING id INTO v_airway_info;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    $_AIRWAY_FAIL$
### Deterioro: traslado sin vía aérea definitiva
Durante el traslado a TAC el paciente presenta broncoaspiración y paro hipoxémico. La herniación se acelera por hipoxia.
$_AIRWAY_FAIL$,
    99,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_airway_failure_outcome;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    $_SEDATION_FAIL$
### Deterioro: sedación sin intubación
La sedación parcial provoca pérdida de reflejo protector sin control de vía aérea. Se agrava la hipoxia y aumenta la presión intracraneal.
$_SEDATION_FAIL$,
    100,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_sedation_only_outcome;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    $_HEMO_DECISION$
Tras intubación, PAM 55 mmHg pese a bolo de 20 mL/kg, hay tendencia a bradicardia. Pupila izquierda sin cambios.

    - Enfermería prepara bolsa presurizada, bomba de infusión y set para monitorización invasiva continua.

Define tu intervención hemodinámica y de control de presión intracraneal.
$_HEMO_DECISION$,
    3,
    false
  )
  RETURNING id INTO v_hemo_decision;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata,
    auto_advance_to
  ) VALUES (
    v_case_id,
    'info',
    $_HEMO_INFO$
Se inicia perfusión de noradrenalina titulada a PAM ≥ 65 mmHg, se administra manitol 1 g/kg en 15 minutos y se monitoriza osmolaridad. Enfermería vigila diuresis y presión arterial invasiva.

    Farmacia verifica interacciones entre sedación, vasopresores y osmoterapia antes de liberar las mezclas.

Pupilas isocóricas 4 mm, TA 110/65 mmHg. Equipo listo para TAC craneal con neurocirugía en línea.
$_HEMO_INFO$,
    4,
    false,
    '{"roles_source": "reset_v2", "focus": "hemodynamics"}'::jsonb,
    NULL
  )
  RETURNING id INTO v_hemo_info;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    $_VASO_FAIL$
### Deterioro: retraso vasopresor
La PAM se mantiene < 55 mmHg y reaparece anisocoria. La perfusión cerebral cae, aumentando el riesgo de herniación irreversible.
$_VASO_FAIL$,
    101,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_vaso_fail_outcome;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    $_OSMO_FAIL$
### Deterioro: sin osmoterapia
Se omite manitol/hipertónica esperando neurocirugía. La PIC se eleva, aparece bradicardia y el TAC muestra herniación incipiente.
$_OSMO_FAIL$,
    102,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_osmo_fail_outcome;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    $_IMAGING_DECISION$
Con el paciente estabilizado, TAC disponible en 10 minutos y neurocirugía esperando decisión.

¿Qué plan defines mientras trasladas a imagen?
$_IMAGING_DECISION$,
    5,
    false
  )
  RETURNING id INTO v_imaging_decision;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    $_SUCCESS$
### Caso resuelto: hematoma epidural evacuado
TAC confirma hematoma epidural temporal con desplazamiento de línea media. Se realiza evacuación urgente con preparación anestésica completa. Paciente ingresa a UCI con pupilas reactivas y soporte vasopresor mínimo.

Excelente coordinación interdisciplinaria: vía aérea segura, perfusión adecuada y control intracraneal oportuno.
$_SUCCESS$,
    6,
    true,
    '{"is_correct": true}'::jsonb
  )
  RETURNING id INTO v_success_outcome;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    $_DELAY$
### Retraso crítico
Se pospone la intervención neuroquirúrgica esperando TAC sin coordinar quirófano ni perfusión estable. El paciente se descompensa durante el traslado y requiere reanimación prolongada.
$_DELAY$,
    103,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_delay_outcome;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    $_WRONG_DX$
### Diagnóstico incorrecto
Se interpreta la imagen como lesión axonal difusa y se descarta intervención quirúrgica inmediata. La TAC seriada muestra aumento de la colección epidural y colapso neurológico.
$_WRONG_DX$,
    104,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_wrong_diagnosis_outcome;

  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_airway_decision,
      'Preparar intubación controlada con estrategia neuroprotectora y asegurar línea arterial antes de TAC',
      v_airway_info,
      'Correcto. Asegura vía aérea, ventilación y monitoreo antes del traslado.',
      3,
      true,
      ARRAY['medico', 'enfermeria']::text[]
    ),
    (
      v_airway_decision,
      'Trasladar de inmediato a TAC para ganar tiempo y ventilar dentro del scanner',
      v_airway_failure_outcome,
      'Riesgoso: sin vía aérea definitiva aumentas hipoxia y empeoras la herniación.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_airway_decision,
      'Administrar sedación ligera y continuar con bolsa sin intubar para evaluar respuesta pupilar',
      v_sedation_only_outcome,
      'Sedación parcial sin protección provoca pérdida de reflejos y broncoaspiración.',
      -2,
      false,
      ARRAY['medico', 'enfermeria']::text[]
    );

  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_hemo_decision,
      'Iniciar noradrenalina titulada a PAM ≥ 65 mmHg y administrar manitol 1 g/kg con monitoreo de osmolaridad',
      v_hemo_info,
      'Excelente. Perfusión adecuada y osmoterapia temprana disminuyen el riesgo de herniación.',
      3,
      true,
      ARRAY['medico', 'farmacia', 'enfermeria']::text[]
    ),
    (
      v_hemo_decision,
      'Esperar respuesta al volumen inicial antes de iniciar vasopresores para evitar hipertensión',
      v_vaso_fail_outcome,
      'La espera prolongada perpetúa PAM baja y reduce el flujo cerebral.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_hemo_decision,
      'Postergar manitol porque neurocirugía decidirá en quirófano la osmoterapia',
      v_osmo_fail_outcome,
      'Omitir osmoterapia agrava la PIC y precipita herniación.',
      -2,
      false,
      ARRAY['medico', 'farmacia']::text[]
    );

  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_imaging_decision,
      'Coordinar TAC inmediata con neurocirugía y quirófano listos para evacuación tras imagen',
      v_success_outcome,
      'Correcto. Aceleras diagnóstico y tienes equipo listo para evacuar el hematoma.',
      4,
      true,
      ARRAY['medico', 'enfermeria']::text[]
    ),
    (
      v_imaging_decision,
      'Esperar TAC para decidir si requiere cirugía, sin avisar a quirófano hasta tener informe',
      v_delay_outcome,
      'El retraso en coordinar cirugía expone al paciente a nueva descompensación.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_imaging_decision,
      'Interpretar la lesión como axonal difusa y enfocar tratamiento conservador en UCI',
      v_wrong_diagnosis_outcome,
      'La morfología biconvexa corresponde a hematoma epidural: requiere evacuación urgente.',
      -3,
      false,
      ARRAY['medico']::text[]
    );

  UPDATE public.micro_case_nodes SET auto_advance_to = v_airway_decision WHERE id = v_intro_node;
  UPDATE public.micro_case_nodes SET auto_advance_to = v_hemo_decision WHERE id = v_airway_info;
  UPDATE public.micro_case_nodes SET auto_advance_to = v_imaging_decision WHERE id = v_hemo_info;
  UPDATE public.micro_cases SET start_node_id = v_intro_node, updated_at = now() WHERE id = v_case_id;
END $$;
-- Migration: Seed/Upsert escenario TCE grave pediátrico (presencial + online)
-- Fecha: 2025-11-16
-- Idempotente: ejecutable múltiples veces sin duplicar registros.
-- Ajusta textos clínicos antes de producción definitiva.
-- Alineado con constraints actuales:
--   status ∈ ('Disponible','En construcción: en proceso','En construcción: sin iniciar','Borrador','Archivado','Publicado')
--   level ∈ ('basico','medio','avanzado')
--   difficulty ∈ ('Básico','Intermedio','Avanzado')

DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  -- Buscar escenario por título
  SELECT id INTO v_scenario_id
  FROM public.scenarios
  WHERE title = 'Traumatismo craneoencefálico grave pediátrico'
  LIMIT 1;

  IF v_scenario_id IS NULL THEN
    -- Intentar con 'Borrador'; si constraint aún no actualizado, fallback a 'En construcción: en proceso'
    BEGIN
      INSERT INTO public.scenarios (title, summary, status, mode, level, difficulty, estimated_minutes, max_attempts)
      VALUES (
        'Traumatismo craneoencefálico grave pediátrico',
        'Niño de 8 años con traumatismo craneal severo tras caída. Llegada reciente a área de reanimación. Requiere valoración ABC rápida y preparación para posibles intervenciones avanzadas.',
        'Borrador',
        ARRAY['presencial','online'],
        'avanzado',
        'Intermedio',
        25,
        3
      )
      RETURNING id INTO v_scenario_id;
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM LIKE '%scenarios_status_check%' THEN
        INSERT INTO public.scenarios (title, summary, status, mode, level, difficulty, estimated_minutes, max_attempts)
        VALUES (
          'Traumatismo craneoencefálico grave pediátrico',
          'Niño de 8 años con traumatismo craneal severo tras caída. Llegada reciente a área de reanimación. Requiere valoración ABC rápida y preparación para posibles intervenciones avanzadas.',
          'En construcción: en proceso',
          ARRAY['presencial','online'],
          'avanzado',
          'Intermedio',
          25,
          3
        )
        RETURNING id INTO v_scenario_id;
      ELSE
        RAISE;
      END IF;
    END;
  ELSE
    -- Actualizar; mismo fallback por si constraint aún no acepta 'Borrador'
    BEGIN
      UPDATE public.scenarios
      SET summary = 'Niño de 8 años con traumatismo craneal severo tras caída. Llegada reciente a área de reanimación. Requiere valoración ABC rápida y preparación para posibles intervenciones avanzadas.',
          status = 'Borrador',
          mode = ARRAY['presencial','online'],
          level = 'avanzado',
          difficulty = 'Intermedio',
          estimated_minutes = 25,
          max_attempts = 3
      WHERE id = v_scenario_id;
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM LIKE '%scenarios_status_check%' THEN
        UPDATE public.scenarios
        SET summary = 'Niño de 8 años con traumatismo craneal severo tras caída. Llegada reciente a área de reanimación. Requiere valoración ABC rápida y preparación para posibles intervenciones avanzadas.',
            status = 'En construcción: en proceso',
            mode = ARRAY['presencial','online'],
            level = 'avanzado',
            difficulty = 'Intermedio',
            estimated_minutes = 25,
            max_attempts = 3
        WHERE id = v_scenario_id;
      ELSE
        RAISE;
      END IF;
    END;
  END IF;

  -- Upsert meta presencial
  INSERT INTO public.scenario_presencial_meta (
    scenario_id,
    dual_mode,
    instructor_brief,
    student_brief,
    room_layout,
    roles_required,
    checklist_template,
    triggers
  ) VALUES (
    v_scenario_id,
    true,
    $INSTRUCTOR$Niño de 8 años con traumatismo craneoencefálico tras caída. Ingreso al área de reanimación; equipo debe priorizar ABC y preparación para intervenciones avanzadas si empeora. Objetivos instructor: supervisión de la priorización y manejo del equipo.$INSTRUCTOR$,
    $STUDENT$Breve: participante del equipo de reanimación pediátrica; estabiliza ABC y decide intervenciones prioritarias.$STUDENT$,
    '{"stations":[{"id":"A","label":"Reanimación"},{"id":"B","label":"Farmacología"},{"id":"C","label":"Monitorización"}]}'::jsonb,
    '[{"role":"medico","min":1,"max":2},{"role":"enfermeria","min":1,"max":2},{"role":"farmacia","min":1,"max":1}]'::jsonb,
    '[{"group":"Primario","items":[{"label":"Asegurar protección cervical","type":"bool"},{"label":"Evaluar Glasgow inicial","type":"bool"},{"label":"Valoración pupilas","type":"bool"},{"label":"Plan intubación si Glasgow ≤8","type":"bool"}]},{"group":"Ventilación","items":[{"label":"Preparar secuencia rápida","type":"bool"},{"label":"Capnografía post intubación","type":"bool"},{"label":"Mantener EtCO2 35-40","type":"bool"}]},{"group":"Neuroprotección","items":[{"label":"Evitar hipotensión (PA > P5)","type":"bool"},{"label":"Sat > 94%","type":"bool"},{"label":"Considerar manitol/SS hipertónica si anisocoria","type":"bool"}]}]'::jsonb,
    '[{"event":"time_elapsed","minutes":5,"action":"show_alert","message":"Revalúa Glasgow y pupilas"},{"event":"time_elapsed","minutes":10,"action":"show_alert","message":"Verifica parámetros ventilatorios"},{"event":"variable_change","variable":"sat","condition":"<92","action":"show_alert","message":"Optimiza oxigenación"},{"event":"variable_change","variable":"glasgow","condition":"<=5","action":"show_alert","message":"Prepara tratamiento osmótico"}]'::jsonb
  )
  ON CONFLICT (scenario_id) DO UPDATE SET
    dual_mode = EXCLUDED.dual_mode,
    instructor_brief = EXCLUDED.instructor_brief,
    student_brief = EXCLUDED.student_brief,
    room_layout = EXCLUDED.room_layout,
    roles_required = EXCLUDED.roles_required,
    checklist_template = EXCLUDED.checklist_template,
    triggers = EXCLUDED.triggers;

  -- Equipamiento crítico (insertar sólo si no existe para evitar duplicados)
  WITH eq AS (
    SELECT * FROM (VALUES
      ('Collar cervical',2,'A','inmovilizacion',true,NULL),
      ('Tabla rígida pediátrica',1,'A','inmovilizacion',true,NULL),
      ('Monitor multiparámetros',1,'C','monitorizacion',true,'Incluye capnografía'),
      ('Equipo intubación pediátrica completo',1,'A','via_aerea',true,'Laringoscopio, tubos 5.5 y 6.0, guía, jeringa cuff'),
      ('Oxímetro pulso',1,'C','monitorizacion',true,NULL),
      ('Capnógrafo',1,'C','monitorizacion',true,'EtCO2 objetivo 35-40'),
      ('Fluidos cristaloides isotónicos',2,'B','farmacologia',true,'Evitar sobrecarga; mantener perfusión'),
      ('Manitol 20%',2,'B','farmacologia',false,'Uso si signos de HTIC (anisocoria / caída Glasgow)'),
      ('Solución salina hipertónica 3%',2,'B','farmacologia',false,'Alternativa a manitol'),
      ('Material inmovilización adicional',1,'A','inmovilizacion',false,'Cintas, cuñas laterales'),
      ('Ventilador mecánico pediátrico',1,'A','via_aerea',true,'Preparado para modo volumen control'),
      ('Bolsas de reanimación (AMBU pediátrico)',1,'A','via_aerea',true,NULL),
      ('Jeringas y medicación sedación (midazolam, fentanilo)',1,'B','farmacologia',true,'Ajuste por peso')
    ) AS t(name,quantity,location,category,required,notes)
  )
  INSERT INTO public.scenario_equipment (scenario_id,name,quantity,location,category,required,notes)
  SELECT v_scenario_id, e.name, e.quantity, e.location, e.category, e.required, e.notes
  FROM eq e
  WHERE NOT EXISTS (
    SELECT 1 FROM public.scenario_equipment se
    WHERE se.scenario_id = v_scenario_id AND se.name = e.name
  );

  RAISE NOTICE 'Seed aplicado. scenario_id=%', v_scenario_id;
END $$;

-- NOTA: Añadir pasos clínicos y preguntas mediante editores UI (scenario_steps, questions) tras validar este seed.
-- Migration: Harden micro_cases_overview access
-- Fecha: 2025-11-17

-- Ensure the view executes with the caller privileges so table RLS applies.
ALTER VIEW public.micro_cases_overview SET (security_invoker = true);

-- Tighten grants: remove broad access, allow only authenticated users and service role.
REVOKE ALL ON public.micro_cases_overview FROM PUBLIC;
REVOKE ALL ON public.micro_cases_overview FROM anon;

GRANT SELECT ON public.micro_cases_overview TO authenticated;
GRANT SELECT ON public.micro_cases_overview TO service_role;
-- Migration: Seed meta presencial para escenario — Mordedura de víbora
-- Fecha: 2025-11-18
-- Inserta metadatos (constantes, observaciones, signos de alarma, lecturas) de forma idempotente.

DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Mordedura de víbora' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario "Mordedura de víbora" no encontrado; saltando inserción de metadatos.';
    RETURN;
  END IF;

  IF to_regclass('public.scenario_presencial_meta') IS NOT NULL THEN
    INSERT INTO public.scenario_presencial_meta (scenario_id, student_brief, instructor_brief, checklist_template, roles_required, triggers)
    VALUES (
      v_scenario_id,
      -- student_brief: lo que ven los alumnos
      $student$Constantes y observaciones
      FC: 156
      FR: 34
      SatO2 (%): 86
      Temperatura (ºC): 36.2
      TA sistólica/diastólica (mmHg): 78/42
      Notas: TA 78/42 mmHg

      Exploración física (una línea por hallazgo):
      Edema facial marcado

      Analítica rápida (nombre | valor):
      Glucemia capilar | 142 mg/dL
      Lactato | 3.8 mmol/L

      Pruebas de imagen / monitorización (nombre | estado):
      Radiografía de tórax | No indicada inmediata
      ECG continuo | Monitorizado

      Triángulo de evaluación pediátrica:
      Apariencia: Sin definir
      Respiración: Sin definir
      Circulación cutánea: Sin definir

      Signos de alarma: selecciona los que procedan (algunos son distractores)
      $student$,

      -- instructor_brief: claves y respuestas (qué indica gravedad)
      $instructor$Claves instructores:
      - Hipotensión (TA 78/42) => Signo grave (indica shock mixto/hipo-perfusión)
      - Taquicardia 156 => Contribuye a inestabilidad hemodinámica
      - FR 34 y SatO2 86% => Insuficiencia respiratoria parcial/hipoxemia
      - Edema facial marcado => posible edema progresivo/síntoma preocupante si compromete vía aérea
      - Lactato 3.8 mmol/L => hipoperfusión/estrés metabólico
      - Glucemia capilar 142 mg/dL => no es signo de gravedad por sí mismo (distractor)
      - Temperatura 36.2 ºC => normal (distractor)

      Signos que deben marcarse como CORRECTOS en la actividad: Hipotensión, Taquicardia marcada, SatO2 baja, FR elevada, Edema facial marcado, Lactato elevado, Alteración del estado mental (si aparece)
      $instructor$,

      -- checklist_template: estructura con signos de alarma (correctos y distractores)
      '[{"group":"Signos de alarma","items":[
          {"label":"TA sistólica <90 mmHg (ej. 78/42)", "correct": true},
          {"label":"SatO2 <90% (ej. 86%)", "correct": true},
          {"label":"FC > 140 lpm (ej. 156)", "correct": true},
          {"label":"FR > 30 rpm (ej. 34)", "correct": true},
          {"label":"Edema facial marcado", "correct": true},
          {"label":"Glucemia capilar 142 mg/dL", "correct": false},
          {"label":"Temperatura 36.2 ºC", "correct": false},
          {"label":"Eritema local leve alrededor de la mordedura", "correct": false},
          {"label":"Sangrado activo de la herida", "correct": true},
          {"label":"Disminución del nivel de conciencia (confusión, somnolencia)", "correct": true}
      ]}]'::jsonb,

      -- roles_required: equipo mínimo sugerido
      '[{"role":"medico","min":1,"max":2,"notes":"Responsable de decisión sobre antiveneno"},{"role":"enfermeria","min":1,"max":2,"notes":"Monitorización y administración"},{"role":"farmacia","min":0,"max":1,"notes":"Preparación del antídoto"}]'::jsonb,

      -- triggers: reglas simples (solo informativas; la UI puede mapearlas)
      '[{"event":"vital_threshold","variable":"systolic_bp","condition":"<90","action":"flag_hemodynamic_instability"},{"event":"vital_threshold","variable":"sat_o2","condition":"<90","action":"flag_respiratory_compromise"}]'::jsonb
    )
    ON CONFLICT (scenario_id) DO UPDATE
    SET
      student_brief = EXCLUDED.student_brief,
      instructor_brief = EXCLUDED.instructor_brief,
      checklist_template = EXCLUDED.checklist_template,
      roles_required = EXCLUDED.roles_required,
      triggers = EXCLUDED.triggers,
      updated_at = now();
  END IF;

  RAISE NOTICE 'Meta presencial aplicada para escenario "Mordedura de víbora" (scenario_id=%)', v_scenario_id;
END $$;
-- Migration: Seed pasos y preguntas para escenario online — Mordedura de víbora
-- Fecha: 2025-11-18
-- Inserta pasos y preguntas (comunes y por rol) de forma idempotente.

DO $$
DECLARE
  v_scenario_id INT;
  v_step_eval INT;
  v_step_wound INT;
  v_step_labs INT;
  v_step_decision INT;
  v_step_medico INT;
  v_step_enfermeria INT;
  v_step_farmacia INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Mordedura de víbora' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario "Mordedura de víbora" no encontrado; saltando inserción de pasos/preguntas.';
    RETURN;
  END IF;

  -- Insertar pasos si existe la tabla `steps`
  IF to_regclass('public.steps') IS NOT NULL THEN
    -- Evaluación inicial
    SELECT id INTO v_step_eval FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Evaluación inicial: valoración ABC, signos vitales y examen local de la mordedura' LIMIT 1;
    IF v_step_eval IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Evaluación inicial: valoración ABC, signos vitales y examen local de la mordedura', 1, false, NULL, 'Anotar tiempo desde la mordedura, características locales (eritema, edema, equimosis), signos de sangrado y signos neurológicos')
      RETURNING id INTO v_step_eval;
    END IF;

    -- Cuidados locales y manejo inicial
    SELECT id INTO v_step_wound FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Cuidados locales: limpieza, inmovilización y analgesia' LIMIT 1;
    IF v_step_wound IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Cuidados locales: limpieza, inmovilización y analgesia', 2, false, NULL, 'Medidas iniciales: lavado con suero, inmovilizar miembro, control del dolor. No realizar cortes ni succionar la herida')
      RETURNING id INTO v_step_wound;
    END IF;

    -- Solicitar pruebas
    SELECT id INTO v_step_labs FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Solicitar pruebas: hemograma, coagulación, función renal, CK' LIMIT 1;
    IF v_step_labs IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Solicitar pruebas: hemograma, coagulación, función renal, CK', 3, false, NULL, 'Solicitar y documentar resultados; valorar coagulopatía y trombocitopenia como indicación de antídoto')
      RETURNING id INTO v_step_labs;
    END IF;

    -- Decisión sobre antídoto (paso central)
    SELECT id INTO v_step_decision FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Decisión: administrar suero antiofídico' LIMIT 1;
    IF v_step_decision IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Decisión: administrar suero antiofídico', 4, false, NULL, 'Evaluar riesgos/beneficios según signos sistémicos y pruebas. Indicar dosis y observar posibles reacciones al antisuero')
      RETURNING id INTO v_step_decision;
    END IF;

    -- Paso rol: médico (decisión y dosificación)
    SELECT id INTO v_step_medico FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Médico: decisión terapéutica y dosificación del antídoto' LIMIT 1;
    IF v_step_medico IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Médico: decisión terapéutica y dosificación del antídoto', 5, true, ARRAY['medico'], 'Decidir esquema de administración, dosis inicial y criterios de repetición')
      RETURNING id INTO v_step_medico;
    END IF;

    -- Paso rol: enfermería (monitorización y acceso IV)
    SELECT id INTO v_step_enfermeria FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Enfermería: acceso IV, monitorización y preparación para reacciones' LIMIT 1;
    IF v_step_enfermeria IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Enfermería: acceso IV, monitorización y preparación para reacciones', 6, true, ARRAY['enfermeria'], 'Asegurar acceso venoso, monitorizar constantes, preparar adrenalina y equipos para manejo de anafilaxia')
      RETURNING id INTO v_step_enfermeria;
    END IF;

    -- Paso rol: farmacia (preparación del antídoto)
    SELECT id INTO v_step_farmacia FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Farmacia: preparación y verificación del antídoto' LIMIT 1;
    IF v_step_farmacia IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Farmacia: preparación y verificación del antídoto', 7, true, ARRAY['farmacia'], 'Confirmar lote, dilución y volumen de administración; etiquetar claramente y comunicar al equipo')
      RETURNING id INTO v_step_farmacia;
    END IF;
  END IF;

  -- Insertar preguntas si existe la tabla `questions`
  IF to_regclass('public.questions') IS NOT NULL THEN
    -- Pregunta común avanzada: decisión de antídoto basada en guías
    IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_decision AND q.question_text ILIKE 'Según las guías%antiofídico%') = 0 THEN
      INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, critical_rationale)
      VALUES (
        v_step_decision,
        'Según las guías actuales (p.ej. WHO y recomendaciones nacionales), con plaquetas 80x10^3/µL, INR 2.1 y edema progresivo en la extremidad a los 40 min, ¿qué decisión es la más apropiada?',
        '["Administrar suero antiofídico de forma temprana (iniciar dosis según protocolo local) y monitorizar en entorno hospitalario","Retrasar antídoto, iniciar soporte y repetir pruebas en 2 horas; administrar antídoto solo si empeora","No administrar antídoto; manejo conservador con cuidados locales y analgesia"]'::jsonb,
        0,
        'La evidencia y guías recomiendan administrar antiveneno ante signos de envenenamiento sistémico o coagulopatía activa (plaquetas bajas, INR elevado, sangrado). Retrasar puede aumentar riesgo de complicaciones. Considerar además disponibilidad y riesgo de reacciones al antisuero.',
        NULL,
        true,
        '["Documenta signos sistémicos: sangrado, hipotensión, alteración neurológica","Valora riesgo/beneficio y disponibilidad de antisuero en tu centro"]'::jsonb,
        'Coagulopatía documentada (INR>1.5, plaquetas significativamente bajas) es considerada indicación para antiveneno en múltiples guías.'
      );
    END IF;

    -- Preguntas por rol: Médico (avanzadas y basadas en protocolos)
    IF v_step_medico IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'En presencia de coagulopatía confirmada%esquema%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, critical_rationale)
        VALUES (
          v_step_medico,
          'En presencia de coagulopatía confirmada por INR elevado y plaquetopenia progresiva, ¿qué estrategia inicial refleja mejor las recomendaciones actuales?',
          '["Iniciar antídoto según protocolo (dosis de referencia del antisuero utilizado localmente) y preparar rescates/re-dosificación según respuesta clínica y de laboratorio","Administrar factores de coagulación (plasma fresco/concentrados) antes del antídoto para corregir INR y luego decidir antídoto","Esperar resolución espontánea y no administrar antídoto salvo sangrado activo"]'::jsonb,
          0,
          'Las guías recomiendan administrar antiveneno como tratamiento etiológico frente a coagulopatía por veneno; soporte con hemoderivados puede ser necesario para manejo del sangrado, pero no sustituye la inmunoterapia específica.',
          ARRAY['medico'],
          true,
          '["Confirma protocolo local para dosis inicial y criterios de re-dosificación","Documenta indicación en historia clínica y comunica a equipo"]'::jsonb,
          'Antiveneno es el tratamiento específico; hemoderivados son medidas complementarias, no sustitutas.'
        );
      END IF;
      -- Pregunta M2: criterio de re-dosificación
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE '¿Cuál es el criterio más aceptado para re-dosificar antiveneno%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, critical_rationale)
        VALUES (
          v_step_medico,
          '¿Cuál es el criterio más aceptado para re-dosificar antiveneno en un paciente con empeoramiento clínico?',
          '["Re-dosificar si persiste o progresa la coagulopatía y/o signos clínicos de envenenamiento","Re-dosificar siempre a las 6 horas sin esperar resultados","No re-dosificar; una única dosis es suficiente en la mayoría de los casos"]'::jsonb,
          0,
          'La re-dosificación se basa en respuesta clínica y evolución de pruebas (coagulopatía persistente o empeoramiento). Protocolos locales varían, pero la práctica común es re-dosificar según respuesta.',
          ARRAY['medico'],
          true,
          '["Monitorea INR/plaquetas y signos sistémicos","Comunica al equipo y documenta" ]'::jsonb,
          'Re-dosificación orientada por respuesta clínica y de laboratorio.'
        );
      END IF;

      -- Pregunta M3: elección de antiveneno según especie/disponibilidad
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'En ausencia de identificación de la especie%antiveneno%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          'En ausencia de identificación de la especie venenosa, ¿qué principio guía la elección del antiveneno?',
          '["Usar el antiveneno con espectro más amplio y disponible localmente","Esperar identificación exacta antes de administrar antiveneno","Administrar antiveneno para la especie más común sin confirmar signos clínicos"]'::jsonb,
          0,
          'Si la especie no está identificada, se elige el antiveneno de mayor espectro y disponibilidad, priorizando la indicación por clínica y pruebas.',
          ARRAY['medico'],
          true,
          '["Consulta protocolos de país/region","Prioriza disponibilidad y espectro"]'::jsonb
        );
      END IF;

      -- Pregunta M4: manejo de reacción anafiláctica durante la perfusión
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'Si durante la perfusión aparece reaccion anafilactica%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          'Si durante la perfusión aparece reacción anafiláctica leve (urticaria y prurito) ¿qué acción inicial es la más apropiada?',
          '["Interrumpir la perfusión, administrar adrenalina intramuscular y reevaluar; reanudar solo si controlada","Continuar perfusión con antihistamínicos y esteroides profilácticos","Detener la perfusión definitivamente y no reanudar nunca"]'::jsonb,
          0,
          'La reacción anafiláctica requiere manejo agresivo inicial; adrenalina IM es prioridad. Tras control y valoración riesgo/beneficio, puede considerarse reanudar con precaución en algunos protocolos.',
          ARRAY['medico'],
          true,
          '["Asegura vía aérea/soporte ventilatorio","Administra adrenalina IM 0.3-0.5 mg y monitoriza"]'::jsonb
        );
      END IF;

      -- Pregunta M5: uso de hemoderivados
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE '¿Cuál es el papel de los hemoderivados%coagulopatía%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          '¿Cuál es el papel de los hemoderivados en la coagulopatía por envenenamiento por víbora?',
          '["Soporte para sangrado activo; no sustituyen el antiveneno","Son la primera línea y deben administrarse antes del antiveneno","No tienen indicación en este contexto"]'::jsonb,
          0,
          'Los hemoderivados (plasma, plaquetas) se usan como soporte en sangrado activo; el antiveneno trata la causa subyacente y es prioritario.',
          ARRAY['medico'],
          true,
          '["Valora necesidad según sangrado clínico","Coordina con banco de sangre"]'::jsonb
        );
      END IF;

      -- Pregunta M6: embarazo
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'En embarazo%antiveneno%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          'En una paciente embarazada con signos de envenenamiento sistémico, ¿cuál es la recomendación más apropiada?',
          '["Administrar antiveneno si hay indicación clínica; los beneficios superan el riesgo potencial fetal","Evitar antiveneno por riesgo fetal y usar solo medidas de soporte","Consultar toxicológico y esperar resultados de laboratorio antes de decidir"]'::jsonb,
          0,
          'El envenenamiento materno grave debe tratarse; el antiveneno se administra si está indicado clínicamente, considerando riesgo/beneficio.',
          ARRAY['medico'],
          true,
          '["Coordina con obstetricia","Documenta discusión de riesgo/beneficio"]'::jsonb
        );
      END IF;

      -- Pregunta M7: pediatría (ajuste dosis)
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'En pediatría%dosis%ajuste%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          'En pediatría, ¿cómo se ajusta la dosis de antiveneno en la mayoría de protocolos?',
          '["Dosis similar a adultos basada en severidad; algunos protocolos usan peso como referencia","Dosis proporcionalmente menores siempre según peso","No se administra antiveneno en menores de 5 años"]'::jsonb,
          0,
          'Muchos protocolos recomiendan la misma dosis inicial que en adultos basada en severidad clínica; el ajuste final depende del producto y guía local.',
          ARRAY['medico'],
          true,
          '["Consulta guía pediátrica local","Monitorea respuesta clínica y de laboratorio"]'::jsonb
        );
      END IF;

      -- Pregunta M8: seguimiento tardío (serum sickness)
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE '¿Qué vigilancia tardía%serum sickness%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          '¿Qué vigilancia tardía es importante después de administrar antiveneno?',
          '["Vigilar aparición de fiebre, artralgias y exantema (síndrome del suero) en semanas posteriores","No requiere seguimiento tras alta","Sólo realizar hemograma a los 2 meses"]'::jsonb,
          0,
          'El síndrome del suero puede aparecer días-semanas después; es importante informar al paciente y programar seguimiento si aparecen síntomas.',
          ARRAY['medico'],
          false,
          '["Informa al paciente sobre signos de alarma","Registra contacto para seguimiento"]'::jsonb
        );
      END IF;

      -- Pregunta M9: anticoagulantes concomitantes
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'Paciente en anticoagulacion%manejo%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          'Paciente en anticoagulación crónica con INR elevado tras mordedura, ¿qué consideraciones son prioritarias?',
          '["Priorizar antiveneno si hay coagulopatía por veneno; coordinar reversión de anticoagulación si sangrado activo","No administrar antiveneno hasta revertir anticoagulación","Discontinuar anticoagulante y observar sin antiveneno"]'::jsonb,
          0,
          'La presencia de anticoagulación complica la interpretación; si hay evidencia de envenenamiento, el antiveneno sigue siendo indicación principal; coordina manejo de anticoagulación.',
          ARRAY['medico'],
          true,
          '["Consulta hematología","Documenta riesgo/beneficio"]'::jsonb
        );
      END IF;

      -- Pregunta M10: criterios de alta u observación
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE '¿Qué criterios son aceptables para el alta hospitalaria%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          '¿Qué criterios son aceptables para el alta hospitalaria en un paciente con mordedura tratado con antiveneno?',
          '["Estabilidad hemodinámica, normalización o tendencia clara a la mejoría en pruebas y ausencia de signos de progresión local","Alta tras 6 horas independientemente de pruebas","Mantener mínimo 72 horas siempre"]'::jsonb,
          0,
          'El alta se basa en estabilidad clínica y evolución favorable de pruebas; el tiempo mínimo depende de la respuesta y protocolo local.',
          ARRAY['medico'],
          false,
          '["Asegura plan de seguimiento","Entrega instrucciones claras al paciente"]'::jsonb
        );
      END IF;
    END IF;

    -- Preguntas por rol: Enfermería (profundo y operativo)
    IF v_step_enfermeria IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Antes de administrar antídoto%monitorización%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit)
        VALUES (
          v_step_enfermeria,
          'Antes de administrar antídoto, ¿qué monitorización y preparaciones son obligatorias y cuáles son medidas profilácticas controvertidas?',
          '["Monitorización continua (ECG, presión arterial, SpO2), accesos IV seguros y preparación de adrenalina/dobutamina; la profilaxis rutinaria con antihistamínicos/corticoides no está universalmente recomendada","Sólo tomar constantes periódicas; la profilaxis con esteroides es la práctica estándar y reduce reacciones","No es necesario preparar adrenalina; la administración de antídoto es segura sin medidas adicionales"]'::jsonb,
          0,
          'Preparar monitorización continua y acceso IV es obligatorio. La profilaxis farmacológica para prevenir reacciones al antisuero (antihistamínicos, esteroides) es controvertida y no sustituye la disponibilidad de manejo activo de anafilaxia (adrenalina).',
          ARRAY['enfermeria'],
          true,
          '["Asegura perfusión IV adecuada y material para manejo de reacciones (adrenalina 1:1000, guías de dilución)","Monitoriza signos y documenta en registro"]'::jsonb,
          300
        );
      END IF;
      -- Enfermería E2: elección de acceso IV
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE '¿Cuál es el acceso IV preferido%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          '¿Cuál es el acceso IV preferido para administración de antiveneno en extremidad afectada?',
          '["Acceso en vena periférica de extremidad contralateral o proximal al sitio de mordedura","Acceso en la misma extremidad lo más cercano posible a la mordedura","Uso de catéter intraóseo siempre"]'::jsonb,
          0,
          'Se prefiere acceso en extremidad contralateral o proximal al sitio lesionado para evitar problemas con el miembro afectado; el acceso intraóseo es una alternativa en emergencia.',
          ARRAY['enfermeria'],
          true,
          '["Valora permeabilidad y calibre de la vía","Documenta sitio de punción"]'::jsonb
        );
      END IF;

      -- Enfermería E3: velocidad de infusion
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'La velocidad recomendada%infusion%antiveneno%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit)
        VALUES (
          v_step_enfermeria,
          'La velocidad recomendada de infusión de antiveneno suele ser:',
          '["Administración lenta inicial con titulación según tolerancia y protocolo local","Bolus rápido para máxima eficacia inmediata","Velocidad fija de 60 mL/h para todos los pacientes"]'::jsonb,
          0,
          'Se suele comenzar con infusión lenta para vigilar reacciones y ajustar velocidad según tolerancia y protocolo local.',
          ARRAY['enfermeria'],
          true,
          '["Prepara bomba de infusión","Monitoriza signos y pauta de titulación"]'::jsonb,
          120
        );
      END IF;

      -- Enfermería E4: premedicación
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'La profilaxis rutinaria con antihistaminicos%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'La profilaxis rutinaria con antihistamínicos/corticoides antes del antiveneno es:',
          '["Controvertida; puede usarse según protocolo pero no sustituye disponibilidad de adrenalina","Estrictamente obligatoria para todos los pacientes","Prohibida por aumentar riesgo de complicaciones"]'::jsonb,
          0,
          'La profilaxis es controvertida y variable según protocolos; no sustituye la preparación para manejo de anafilaxia.',
          ARRAY['enfermeria'],
          false,
          '["Sigue protocolo local","Ten adrenalina lista"]'::jsonb
        );
      END IF;

      -- Enfermería E5: reconocimiento precoz de anafilaxia
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Señales tempranas de anafilaxia%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Señales tempranas de anafilaxia a vigilar durante la perfusión incluyen:',
          '["Prurito, urticaria, disnea, hipotensión y broncoespasmo","Fiebre aislada sin otros síntomas","Dolor local en el sitio de inyección exclusivamente"]'::jsonb,
          0,
          'La anafilaxia puede empezar con manifestaciones cutáneas y progresar a compromiso respiratorio y hemodinámico; vigilancia continua es clave.',
          ARRAY['enfermeria'],
          true,
          '["Monitorea SpO2 y TA","Detecta cambios en patrón respiratorio"]'::jsonb
        );
      END IF;

      -- Enfermería E6: manejo de adrenalina
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Dosis de adrenalina IM en anafilaxia%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Dosis intramuscular de adrenalina recomendada en reacción anafiláctica aguda en adultos es aproximadamente:',
          '["0.3-0.5 mg de adrenalina 1:1000 IM","0.01 mg/kg IV inmediata","5 mg IM"]'::jsonb,
          0,
          'La dosis intramuscular recomendada en adultos es 0.3–0.5 mg de adrenalina 1:1000; la administración IV requiere precaución y personal experimentado.',
          ARRAY['enfermeria'],
          true,
          '["Prepara jeringa de 1 mg/mL","Administra IM en cara externa del muslo"]'::jsonb
        );
      END IF;

      -- Enfermería E7: documentación y handover
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Qué información es crítica incluir en la entrega%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Qué información es crítica incluir en la entrega al equipo médico durante el manejo de antiveneno?',
          '["Hora de inicio de síntomas, dosis administrada, reacciones observadas y resultados de laboratorio","Solo hora de ingreso","Solo nombre del medicamento administrado"]'::jsonb,
          0,
          'La entrega debe incluir datos clave: tiempos, dosis, respuesta y hallazgos de laboratorio para continuidad segura del cuidado.',
          ARRAY['enfermeria'],
          false,
          '["Documenta en hoja de enfermería","Comunica verbalmente al equipo"]'::jsonb
        );
      END IF;

      -- Enfermería E8: manejo de muestras
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Manejo de muestras para laboratorio%tiempos%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Manejo correcto de muestras para pruebas de coagulación incluye:',
          '["Enviar muestras según protocolo, etiquetadas y con tiempos documentados","Enviar sin etiquetar para rapidez","Enviar solo si hay sangrado activo"]'::jsonb,
          0,
          'Las muestras deben tomarse y enviarse con etiqueta y tiempo, ya que la evolución de parámetros como INR y plaquetas es clave para decisiones terapéuticas.',
          ARRAY['enfermeria'],
          false,
          '["Etiqueta con hora de toma","Asegura transporte rápido"]'::jsonb
        );
      END IF;

      -- Enfermería E9: cuidados locales y analgesia
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Analgesia en paciente con mordedura%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Analgesia adecuada para paciente con mordedura incluye:',
          '["Opioides si dolor intenso y no contraindicado; evitar vasoconstrictores locales y hielo extremo","Usar únicamente AINEs por seguridad","No administrar analgesia"]'::jsonb,
          0,
          'El control del dolor es importante; la elección depende de la severidad y contraindicaciones; evitar medidas que puedan empeorar la lesión local.',
          ARRAY['enfermeria'],
          false,
          '["Evalúa dolor y alergias","Documenta respuesta a analgesia"]'::jsonb
        );
      END IF;

      -- Enfermería E10: comunicación con paciente
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Qué debe incluir la comunicación con el paciente%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Qué debe incluir la comunicación con el paciente antes de administrar antiveneno?',
          '["Explicación de riesgo/beneficio, signos de reacción y plan de seguimiento","No es necesario informar antes de administrar","Solo obtener firma sin explicación"]'::jsonb,
          0,
          'Informar al paciente y familia sobre riesgo/beneficio, signos de alarma y seguimiento es parte del cuidado seguro y ético.',
          ARRAY['enfermeria'],
          false,
          '["Usa lenguaje claro","Documenta consentimiento cuando sea posible"]'::jsonb
        );
      END IF;
    END IF;

    -- Preguntas por rol: Farmacia (seguridad y compatibilidad)
    IF v_step_farmacia IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE '¿Qué controles críticos%antídoto%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          '¿Qué controles críticos y comprobaciones debe realizar farmacia antes de dispensar y reconstituir el antídoto?',
          '["Verificar taquéctica: lote, fecha de caducidad, protocolo de reconstitución, compatibilidad con diluyente y estabilidad; etiquetado claro y comunicación de dosis exacta al equipo","Sólo comprobar fecha de caducidad y entregar al personal clínico para que lo prepare en hospital","Preparar antídoto mezclado con cualquier solución disponible sin comprobaciones adicionales para agilizar entrega"]'::jsonb,
          0,
          'Farmacia debe verificar lote, vencimiento, instrucciones de reconstitución y estabilidad. La comunicación clara de la dosis y posibles contraindicaciones es esencial para seguridad del paciente.',
          ARRAY['farmacia'],
          true,
          '["Sigue ficha técnica del producto y protocolos locales","Comunica al equipo médico la concentración final y el volumen de administración"]'::jsonb
        );
      END IF;
      -- Farmacia F2: compatibilidad y dilución
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE '¿Cuál es la comprobacion principal%compatibilidad%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          '¿Cuál es la comprobación principal de farmacia respecto a compatibilidad y dilución del antídoto?',
          '["Verificar diluyente recomendado y compatibilidad con soluciones IV; seguir ficha técnica","Diluir en cualquier solución cristaloide disponible","Mezclar con soluciones que aumenten estabilidad sin comprobar"]'::jsonb,
          0,
          'La compatibilidad y dilución deben seguir la ficha técnica del fabricante para garantizar estabilidad y seguridad del producto.',
          ARRAY['farmacia'],
          true,
          '["Consulta ficha técnica","Evita mezclas no recomendadas"]'::jsonb
        );
      END IF;

      -- Farmacia F3: almacen y cadena de frio
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Condiciones de almacenamiento%antídoto%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Condiciones de almacenamiento críticas para antídotos incluyen:',
          '["Temperatura indicada por fabricante y registro de cadenas de frío","Guardar a temperatura ambiente sin control","Congelar para preservar longer"]'::jsonb,
          0,
          'Los antídotos suelen requerir almacenamiento según fabricante y control de la cadena de frío; incumplimiento puede afectar eficacia.',
          ARRAY['farmacia'],
          true,
          '["Registra temperaturas","Asegura trazabilidad del lote"]'::jsonb
        );
      END IF;

      -- Farmacia F4: reconstitucion y tecnica aséptica
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'La técnica de reconstitución%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'La técnica de reconstitución y preparación del antídoto debe ser:',
          '["Aséptica, siguiendo instrucciones de fabricante y etiquetado claro","Rápida y en cualquier lugar del hospital","Realizada por personal no formado para agilizar proceso"]'::jsonb,
          0,
          'La reconstitución debe ser aséptica y seguir instrucciones para evitar contaminación y errores de concentración.',
          ARRAY['farmacia'],
          true,
          '["Usa cabina de seguridad si requiere asepsia","Etiqueta con concentración final"]'::jsonb
        );
      END IF;

      -- Farmacia F5: etiquetado y doble chequeo
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Qué comprobaciones antes de dispensar%etiquetado%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Qué comprobaciones son críticas antes de dispensar antídoto al equipo clínico?',
          '["Doble verificación de lote, dosificación y concentración; etiquetado claro","Sólo verificar caducidad","Solo entrega sin verificaciones para rapidez"]'::jsonb,
          0,
          'La seguridad exige doble verificación y etiquetado claro para evitar errores de dosificación y administración.',
          ARRAY['farmacia'],
          true,
          '["Realiza doble chequeo con otro farmacéutico","Etiqueta claramente el preparado"]'::jsonb
        );
      END IF;

      -- Farmacia F6: vida util tras reconstitucion
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Vida util tras reconstitución%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'La vida útil tras reconstitución del antídoto depende de:',
          '["Instrucciones del fabricante y condiciones de almacenamiento; algunas preparaciones tienen ventana corta de uso","Siempre 24 horas","Nunca usar tras reconstitución"]'::jsonb,
          0,
          'La vida útil varía según producto y condiciones; seguir ficha técnica y no utilizar fuera de ventana recomendada.',
          ARRAY['farmacia'],
          true,
          '["Consulta ficha técnica","Registra hora de reconstitución"]'::jsonb
        );
      END IF;

      -- Farmacia F7: alternativas cuando no hay stock
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Si no hay antiveneno disponible%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Si no hay antiveneno disponible en el centro, la acción más apropiada es:',
          '["Contactar red regional para transferencia o transporte rápido y administrar soporte mientras tanto","No hacer nada hasta que llegue antiveneno","Administrar otra medicación experimental"]'::jsonb,
          0,
          'La prioridad es buscar antiveneno de la red regional y proporcionar soporte hemodinámico y hemoderivados según necesidad.',
          ARRAY['farmacia'],
          true,
          '["Conoce vías de obtención regional","Prepara alternativa de soporte"]'::jsonb
        );
      END IF;

      -- Farmacia F8: farmacovigilancia
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Qué acciones de farmacovigilancia%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Qué acciones de farmacovigilancia son esperadas tras administración de antiveneno?',
          '["Registrar lote, reaccion adversa y reportar a sistema nacional de farmacovigilancia","No es necesario reportar","Solo reportar si hay muerte"]'::jsonb,
          0,
          'Es necesario registrar lote y reportar reacciones adversas para vigilancia y trazabilidad.',
          ARRAY['farmacia'],
          false,
          '["Documenta lote y reacciones","Informa a autoridades si corresponde"]'::jsonb
        );
      END IF;

      -- Farmacia F9: interacciones con otros medicamentos
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Interacciones con anticoagulantes%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Interacciones relevantes a considerar entre antiveneno y anticoagulantes?',
          '["Ninguna interacción farmacológica directa conocida; considerar efecto combinado sobre sangrado y coordinar manejo","Antiveneno inactiva anticoagulantes","Antiveneno potencia anticoagulantes"]'::jsonb,
          0,
          'No hay interacción farmacológica directa conocida, pero la coexistencia de anticoagulación y coagulopatía por veneno requiere coordinación con el equipo.',
          ARRAY['farmacia'],
          true,
          '["Coordina con médico sobre manejo de anticoagulación","Documenta decisiones"]'::jsonb
        );
      END IF;

      -- Farmacia F10: comunicación de instrucciones de administración
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Qué información debe comunicar farmacia%administracion%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Qué información debe comunicar farmacia al equipo que administra el antiveneno?',
          '["Concentración final, volumen a administrar, compatibilidades y tiempo de infusión recomendado","Solo entrega sin instrucciones","Sólo comunica lote y caducidad"]'::jsonb,
          0,
          'Farmacia debe comunicar claramente concentración, volumen, compatibilidades y recomendaciones de infusión para asegurar administración segura.',
          ARRAY['farmacia'],
          false,
          '["Incluye instrucciones escritas","Confirma recepción verbal si es crítico"]'::jsonb
        );
      END IF;
    END IF;
  END IF;

  RAISE NOTICE 'Pasos y preguntas (comunes y por rol) insertados/validados para scenario_id=%', v_scenario_id;
END $$;
-- Migration: Seed escenario online — Mordedura de víbora
-- Fecha: 2025-11-18
-- Idempotente: puede ejecutarse repetidamente sin duplicar registros.
-- Instrucciones: Antes de ejecutar, sube los PDFs a Supabase Storage (bucket público) y reemplaza las URLs de ejemplo en la sección "resources".

DO $$
DECLARE
  v_scenario_id INT;
  v_status TEXT := 'Publicado'; -- Cambia a 'Borrador' o 'En construcción: en proceso' si lo prefieres
BEGIN
  -- Buscar escenario por título
  SELECT id INTO v_scenario_id
  FROM public.scenarios
  WHERE title = 'Mordedura de víbora'
  LIMIT 1;

  IF v_scenario_id IS NULL THEN
    -- Intentar insertar (manejo de constraint de status por compatibilidad con migraciones previas)
    BEGIN
      INSERT INTO public.scenarios (
        title,
        summary,
        status,
        mode,
        level,
        difficulty,
        estimated_minutes,
        max_attempts
      ) VALUES (
        'Mordedura de víbora',
        'Escenario online: adulto con mordedura de víbora en miembro inferior. Objetivos: reconocer signos de envenenamiento sistémico, ordenar pruebas y decidir indicación de suero antiofídico.',
        v_status,
        ARRAY['online'],
        'medio',
        'Intermedio',
        20,
        3
      ) RETURNING id INTO v_scenario_id;
    EXCEPTION WHEN check_violation THEN
      -- Fallback si la constraint de status no acepta el valor elegido
      IF SQLERRM LIKE '%scenarios_status_check%' THEN
        INSERT INTO public.scenarios (
          title,
          summary,
          status,
          mode,
          level,
          difficulty,
          estimated_minutes,
          max_attempts
        ) VALUES (
          'Mordedura de víbora',
          'Escenario online: adulto con mordedura de víbora en miembro inferior. Objetivos: reconocer signos de envenenamiento sistémico, ordenar pruebas y decidir indicación de suero antiofídico.',
          'En construcción: en proceso',
          ARRAY['online'],
          'medio',
          'Intermedio',
           20,
           3
        ) RETURNING id INTO v_scenario_id;
      ELSE
        RAISE;
      END IF;
    END;
  ELSE
    -- Actualizar campos relevantes
    BEGIN
      UPDATE public.scenarios
      SET
        summary = 'Escenario online: adulto con mordedura de víbora en miembro inferior. Objetivos: reconocer signos de envenenamiento sistémico, ordenar pruebas y decidir indicación de suero antiofídico.',
        status = v_status,
        mode = ARRAY['online'],
        level = 'medio',
        difficulty = 'Intermedio',
        estimated_minutes = 20,
        max_attempts = 3
      WHERE id = v_scenario_id;
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM LIKE '%scenarios_status_check%' THEN
        UPDATE public.scenarios
        SET
          summary = 'Escenario online: adulto con mordedura de víbora en miembro inferior. Objetivos: reconocer signos de envenenamiento sistémico, ordenar pruebas y decidir indicación de suero antiofídico.',
          status = 'En construcción: en proceso',
          mode = ARRAY['online'],
          level = 'medio',
          difficulty = 'Intermedio',
          estimated_minutes = 20,
          max_attempts = 3
        WHERE id = v_scenario_id;
      ELSE
        RAISE;
      END IF;
    END;
  END IF;

  -- Si existe la tabla public.scenario_resources, insertar bibliografía (solo si no existe ya)
  IF to_regclass('public.scenario_resources') IS NOT NULL THEN
    -- Reemplaza las URLs con las de tu bucket público en Supabase Storage antes de correr la migración
    INSERT INTO public.scenario_resources (scenario_id, label, url, kind, created_at)
    SELECT v_scenario_id, 'Suero antiofídico — Red Antídotos (ViperaTAb)', 'https://<your-project>.supabase.co/storage/v1/object/public/public/Suero-antiofidico-ViperaTAb_Red-Antidotos_2025-1.pdf', 'pdf', now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.scenario_resources sr WHERE sr.scenario_id = v_scenario_id AND sr.url = 'https://<your-project>.supabase.co/storage/v1/object/public/public/Suero-antiofidico-ViperaTAb_Red-Antidotos_2025-1.pdf'
    );

    INSERT INTO public.scenario_resources (scenario_id, label, url, kind, created_at)
    SELECT v_scenario_id, 'Suero antiofídico — Viperfav (Red Antídotos)', 'https://<your-project>.supabase.co/storage/v1/object/public/public/Suero-antiofidico-Viperfav_Red-Antidotos_2025-1.pdf', 'pdf', now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.scenario_resources sr WHERE sr.scenario_id = v_scenario_id AND sr.url = 'https://<your-project>.supabase.co/storage/v1/object/public/public/Suero-antiofidico-Viperfav_Red-Antidotos_2025-1.pdf'
    );
  END IF;

  RAISE NOTICE 'Seed aplicado para escenario "Mordedura de víbora" (scenario_id=%). Reemplaza las URLs de resources si es necesario.', v_scenario_id;
END $$;

-- NOTAS:
-- 1) Si tu proyecto no tiene la tabla `public.scenario_resources`, puedes crearla manualmente con un esquema simple:
--
-- CREATE TABLE public.scenario_resources (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   scenario_id int NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
--   label text NOT NULL,
--   url text NOT NULL,
--   kind text,
--   created_at timestamptz DEFAULT now()
-- );
--
-- 2) Sube los PDFs a Supabase Storage (bucket público) y reemplaza las URLs en este archivo antes de ejecutar la migración.
-- 3) Si prefieres que deje el escenario en estado 'Borrador' o con otro `mode` (p.ej. dual), cambia la variable `v_status` y `mode` arriba.
-- Migration: Seed completo para escenario — Politrauma con TCE y HTIC (Sospecha de maltrato)
-- Fecha: 2025-11-18
-- Propósito: crear escenario, pasos, preguntas por rol y metadatos (checklist, instructor brief) de forma idempotente.
-- Nota: Ajusta nombres de columna si tu esquema difiere. Este script intenta ser tolerante pero puede requerir cambios menores.

DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  -- buscar escenario por título
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Politrauma: TCE con HTIC (sospecha de maltrato)' LIMIT 1;

  IF v_scenario_id IS NULL THEN
    -- Intentar insertar con columnas comunes; si no existen, intentar solo con title
    BEGIN
      INSERT INTO public.scenarios (title, description)
      VALUES (
        'Politrauma: TCE con HTIC (sospecha de maltrato)',
        'Caso pediátrico de politrauma con traumatismo encefalo craneano y sospecha de maltrato. Escenario orientado a manejo inicial de HTIC, protección de vía aérea, soporte hemodinámico y consideraciones forenses/protección infantil.'
      )
      RETURNING id INTO v_scenario_id;
    EXCEPTION WHEN undefined_column OR undefined_table THEN
      -- fallback: intentar insertar solo el título
      INSERT INTO public.scenarios (title)
      VALUES ('Politrauma: TCE con HTIC (sospecha de maltrato)')
      RETURNING id INTO v_scenario_id;
    END;
    RAISE NOTICE 'Escenario creado (id=%)', v_scenario_id;
  ELSE
    RAISE NOTICE 'Escenario ya existe (id=%)', v_scenario_id;
  END IF;
END $$;


-- Insertar pasos del escenario (idempotente)
DO $$
DECLARE
  v_scenario_id INT;
  v_step_count INT;
  v_step_id INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Politrauma: TCE con HTIC (sospecha de maltrato)' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario no encontrado; saliendo del bloque de pasos.';
    RETURN;
  END IF;

  IF to_regclass('public.steps') IS NOT NULL THEN
    -- Paso 1: Evaluación primaria (ABCDE) y protección de vía aérea
    SELECT COUNT(*) INTO v_step_count FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Evaluación primaria y protección de vía aérea';
    IF v_step_count = 0 THEN
      INSERT INTO public.steps (scenario_id, description, step_order)
      VALUES (
        v_scenario_id,
        'Evaluación primaria y protección de vía aérea',
        1
      ) RETURNING id INTO v_step_id;
    ELSE
      SELECT id INTO v_step_id FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Evaluación primaria y protección de vía aérea' LIMIT 1;
    END IF;

    -- Paso 2: Soporte hemodinámico y control de hemorragias
    SELECT COUNT(*) INTO v_step_count FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Soporte hemodinámico y control de hemorragias';
    IF v_step_count = 0 THEN
      INSERT INTO public.steps (scenario_id, description, step_order)
      VALUES (
        v_scenario_id,
        'Soporte hemodinámico y control de hemorragias',
        2
      );
    END IF;

    -- Paso 3: Manejo de HTIC y medidas neuroprotectoras
    SELECT COUNT(*) INTO v_step_count FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Manejo de HTIC y medidas neuroprotectoras';
    IF v_step_count = 0 THEN
      INSERT INTO public.steps (scenario_id, description, step_order)
      VALUES (
        v_scenario_id,
        'Manejo de HTIC y medidas neuroprotectoras',
        3
      );
    END IF;

    -- Paso 4: Forense / protección infantil
    SELECT COUNT(*) INTO v_step_count FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Evaluación forense y protección infantil';
    IF v_step_count = 0 THEN
      INSERT INTO public.steps (scenario_id, description, step_order)
      VALUES (
        v_scenario_id,
        'Evaluación forense y protección infantil',
        4
      );
    END IF;
  ELSE
    RAISE NOTICE 'Tabla public.steps no encontrada; omitiendo inserción de pasos.';
  END IF;
END $$;


-- Insertar preguntas (idempotente) — preguntas comunes y por rol
DO $$
DECLARE
  v_scenario_id INT;
  v_step_id INT;
  v_qcount INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Politrauma: TCE con HTIC (sospecha de maltrato)' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario no encontrado; saliendo del bloque de preguntas.';
    RETURN;
  END IF;

  IF to_regclass('public.questions') IS NULL THEN
    RAISE NOTICE 'Tabla public.questions no encontrada; omitiendo preguntas.';
    RETURN;
  END IF;

  -- localizar step_id para asociar preguntas (usar paso de evaluación primaria)
  SELECT id INTO v_step_id FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Evaluación primaria y protección de vía aérea' LIMIT 1;
  IF v_step_id IS NULL THEN
    RAISE NOTICE 'Paso inicial no encontrado; omitiendo inserción de preguntas.';
    RETURN;
  END IF;

  -- Preguntas comunes (4)

  -- Q1
  SELECT COUNT(*) INTO v_qcount FROM public.questions WHERE step_id = v_step_id AND question_text = '¿Cuál es el siguiente paso más apropiado si GCS = 8 y pupilas asimétricas?';
  IF v_qcount = 0 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES (
      v_step_id,
      '¿Cuál es el siguiente paso más apropiado si GCS = 8 y pupilas asimétricas?',
      '["Observación en sala general","Intubación con secuencia rápida y control de presión intracraneal","Administrar solo analgésicos","Enviar a radiografía de tórax"]'::jsonb,
      2,
      ARRAY['medico','enfermeria','anestesia']::text[],
      'GCS ≤ 8 y pupilas asimétricas indican compromiso neurológico; proteger la vía aérea y controlar PIC es prioritario.',
      true
    );
  END IF;

  -- Q2
  SELECT COUNT(*) INTO v_qcount FROM public.questions WHERE step_id = v_step_id AND question_text = '¿Cuál es la meta adecuada de PaCO2 en manejo de HTIC aguda?';
  IF v_qcount = 0 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES (
      v_step_id,
      '¿Cuál es la meta adecuada de PaCO2 en manejo de HTIC aguda?',
      '["25–30 mmHg siempre","35–40 mmHg (normocapnia)",">45 mmHg","No importa"]'::jsonb,
      2,
      ARRAY['medico','anestesia']::text[],
      'Mantener normocapnia (35–40 mmHg) para evitar aumento de PIC por hipercapnia; la hiperventilación solo como medida puente en herniación inminente.',
      true
    );
  END IF;

  -- Q3
  SELECT COUNT(*) INTO v_qcount FROM public.questions WHERE step_id = v_step_id AND question_text = 'Ante sospecha de maltrato infantil, ¿cuál es la acción prioritaria?';
  IF v_qcount = 0 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES (
      v_step_id,
      'Ante sospecha de maltrato infantil, ¿cuál es la acción prioritaria?',
      '["Interrogar a los cuidadores agresivamente","Asegurar protección del niño y notificar a servicios según protocolo","Registrar la información solo en notas personales","No hacer nada hasta confirmación por imagen"]'::jsonb,
      2,
      ARRAY['medico','enfermeria']::text[],
      'La protección del menor y la notificación son obligatorias; debe coordinarse con trabajo social y autoridades.',
      true
    );
  END IF;

  -- Q4
  SELECT COUNT(*) INTO v_qcount FROM public.questions WHERE step_id = v_step_id AND question_text = 'En un politrauma con riesgo de HTIC, ¿qué objetivo hemodinámico se persigue para perfusión cerebral?';
  IF v_qcount = 0 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES (
      v_step_id,
      'En un politrauma con riesgo de HTIC, ¿qué objetivo hemodinámico se persigue para perfusión cerebral?',
      '["PaCO2 baja y presión arterial baja","Preservar presión de perfusión cerebral manteniendo TA adecuada","Mantener TA baja para reducir sangrado","No tiene relevancia"]'::jsonb,
      2,
      ARRAY['medico']::text[],
      'Evitar hipotensión y preservar presión de perfusión cerebral es esencial; hipotensión agrava lesión secundaria.',
      true
    );
  END IF;

  -- Preguntas específicas para MEDICO (hasta 12 incluyendo comunes)
  IF (SELECT COUNT(*) FROM public.questions WHERE step_id = v_step_id AND roles @> ARRAY['medico']::text[]) < 12 THEN
    -- Insert medico-specific questions (attach to the evaluation step)
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES
      (v_step_id, '¿Cuál es la indicación neuroquirúrgica urgente en TCE pediátrico?', '["Hematoma con efecto de masa y midline shift","Cefalea leve","Náuseas aisladas","Equimosis sin déficit"]'::jsonb, 1, ARRAY['medico']::text[], 'Hematoma con efecto de masa requiere evacuación urgente.', true),
      (v_step_id, 'En un niño hipotenso con TCE, ¿qué acción priorizas?', '["Reanimación con cristaloides 20 ml/kg y valorar vasopresores","Limitar fluidos","Administrar diurético","Esperar a UCI"]'::jsonb, 1, ARRAY['medico']::text[], 'Mantener perfusión cerebral; 20 ml/kg pediátricos como bolo inicial.', true),
      (v_step_id, 'Cómo interpretarías anisocoria en este contexto?', '["Signo sugerente de lesión focal/herniación","Hallazgo benigno","Error de medición","Relacionado solo con intoxicación"]'::jsonb, 1, ARRAY['medico']::text[], 'Anisocoria sugiere lesión focal y posible herniación.', true),
      (v_step_id, 'Respecto a osmoterapia, ¿qué consideraciones son correctas?', '["Usar solución hipertónica o manitol según estado volemico y monitorizar sodio/diuresis","Administrar sin monitorización","Evitar siempre","Diluir en dextrosa"]'::jsonb, 1, ARRAY['medico']::text[], 'Osmoterapia requiere monitorización y elección según contexto.', true),
      (v_step_id, '¿Cuándo sería aceptable una hiperventilación controlada?', '["En deterioro agudo por herniación inminente como medida puente","Como medida prolongada","Nunca","Solo en sala general"]'::jsonb, 1, ARRAY['medico','anestesia']::text[], 'Hiperventilación temporalmente en herniación inminente.', true),
      (v_step_id, 'Qué factor empeora la perfusión cerebral en el TCE?', '["Hipotensión sistémica","Mantener normotermia","Corrección de hipoglucemia","Analgesia adecuada"]'::jsonb, 1, ARRAY['medico']::text[], 'Hipotensión empeora la perfusión y pronóstico.', true),
      (v_step_id, 'Qué documentación forense es esencial en sospecha de maltrato?', '["Fotografías timestamped y descripción objetiva","Solo registro verbal","No documentar","Borrar fotos"]'::jsonb, 1, ARRAY['medico','enfermeria']::text[], 'Documentación objetiva y timestamped es esencial para proceso legal.', true),
      (v_step_id, 'Prioridad si TC muestra contusión difusa con edema pero sin hematoma operable?', '["Manejo neurocrítico: osmoterapia, monitor ICP si disponible, soporte hemodinámico","Alta inmediata","Solo observación en sala general","Iniciar antibioterapia empírica"]'::jsonb, 1, ARRAY['medico']::text[], 'Contusión difusa con edema requiere manejo neurocrítico y considerar monitorización invasiva.', true);
  END IF;

  -- Preguntas para ENFERMERIA (añadir hasta 12 incluyendo comunes)
  IF (SELECT COUNT(*) FROM public.questions WHERE step_id = v_step_id AND roles @> ARRAY['enfermeria']::text[]) < 12 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES
      (v_step_id, '¿Cuál es la prioridad de enfermería en primeros minutos?', '["Asegurar IV/IO y monitorización","Lavar la herida y terminar","Administrar descongestivos","Llamar a la familia"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Acceso y monitorización son esenciales en politrauma.', true),
      (v_step_id, 'Señales tempranas de deterioro neurológico que la enfermería debe alertar', '["Disminución del GCS, cambio en respiración, nueva anisocoria","Dolor abdominal aislado","Queja subjetiva de dolor leve","Nada de lo anterior"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Vigilancia neurológica continua detecta deterioro temprano.', true),
      (v_step_id, 'Manejo de temperatura en TCE', '["Mantener normotermia y evitar fiebre","Permitir fiebre","Indiferente","Aplicar calor local"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'La fiebre empeora lesión cerebral secundaria; mantener normotermia.', true),
      (v_step_id, 'Si convulsiona, actuación inmediata', '["ABC, benzodiacepina IV/IM y protección de la vía aérea","Solo observación","Administrar diurético","Esperar al especialista"]'::jsonb, 1, ARRAY['enfermeria','medico']::text[], 'Control rápido de convulsiones es crítico para evitar hipoxia/HTIC.', true),
      (v_step_id, 'Preparación para traslado a UCI: acciones clave', '["Asegurar líneas, documentar y comunicar al receptor","Enviar sin documentación","No comunicar","Vaciar registros"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Preparación y comunicación adecuadas aseguran continuidad de cuidado.', true),
      (v_step_id, 'Monitoreo de líquidos cuando se usa manitol', '["Control de diuresis y balance hídrico","No monitorizar","Medir solo al final del turno","Administrar sin control"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Manitol requiere control de diuresis por riesgo de deshidratación/hipernatremia.', true),
      (v_step_id, 'Cómo documentar sospecha de maltrato', '["Registro objetivo de lesiones y notificación según protocolo","Registro subjetivo sin pruebas","No documentar","Ocultar información"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Documentación objetiva y notificación son obligatorias.', true),
      (v_step_id, 'Comunicación con la familia en sospecha de maltrato', '["Coordinada con trabajo social/psicología; no confrontar sin equipo","Enfrentar a los cuidadores inmediatamente","Ocultar información","Negarse a comunicar"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Una comunicación sensible y coordinada protege al niño y a la investigación.', true);
  END IF;

  -- Preguntas para ANESTESIA/NEUROANESTESIA/FARMACIA (añadir hasta 12)
  IF (SELECT COUNT(*) FROM public.questions WHERE step_id = v_step_id AND roles @> ARRAY['anestesia']::text[]) < 12 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES
      (v_step_id, 'Consideraciones en RSI para TCE pediátrico', '["Elegir agentes que minimicen aumento de PIC y plan para vía difícil","Usar cualquier agente","No preoxigenar","Evitar analgesia"]'::jsonb, 1, ARRAY['anestesia']::text[], 'RSI con agentes hemodinámicamente estables y preoxigenación.', true),
      (v_step_id, 'Manejo de hipotensión durante inducción', '["Preparar vasopresores y líquidos; usar agentes estables","Ignorar hipotensión","Solo analgesia","Administrar diurético"]'::jsonb, 1, ARRAY['anestesia']::text[], 'Prevención y tratamiento de hipotensión evita isquemia cerebral secundaria.', true),
      (v_step_id, 'Uso de manitol vs solución hipertónica', '["Elegir según volemia, monitorizar Na y diuresis","Siempre manitol","Siempre hipertonica","Evitar ambos"]'::jsonb, 1, ARRAY['anestesia','medico']::text[], 'Decisión según estado volemico y protocolos locales.', true),
      (v_step_id, 'Interacciones farmacológicas críticas en TCE', '["Evitar fármacos que causen hipotensión o aumenten PIC; ajustar dosis pediátricas","No hay interacciones","Usar dosis adultas","Administrar sin control"]'::jsonb, 1, ARRAY['anestesia']::text[], 'Ajustar fármacos para mantener estabilidad hemodinámica y PIC.', true),
      (v_step_id, 'Preparación farmacéutica para convulsiones', '["Disponibilidad de benzodiacepinas y antiepilépticos de carga","No preparar nada","Solo sedación","Retirar medicamentos"]'::jsonb, 1, ARRAY['anestesia','farmacia']::text[], 'Tener medicamentos listos permite control rápido de convulsiones.', true),
      (v_step_id, 'Consideraciones para transfusión en politrauma pediátrico', '["Evaluar necesidad por pérdida y estado hemodinámico; transfundir según criterios","Transfundir siempre","Nunca transfundir","Transfundir al azar"]'::jsonb, 1, ARRAY['medico','farmacia']::text[], 'Transfusión según criterios y situación clínica.', true),
      (v_step_id, 'Documentación de medicamentos en contexto forense', '["Registrar dosis, hora, vía, respuesta y consentimiento cuando aplique","No documentar","Solo nota verbal","Borrar registros"]'::jsonb, 1, ARRAY['anestesia','medico']::text[], 'Registro claro es vital para trazabilidad y procesos legales.', true),
      (v_step_id, 'Logística para neurocirugía urgente', '["Coordinar drogas, sangre y equipo; verificar compatibilidad","No coordinar","Enviar sin equipo","No documentar"]'::jsonb, 1, ARRAY['anestesia','medico','farmacia']::text[], 'Coordinación reduce tiempo puerta-quirófano y errores.', true);
  END IF;

  RAISE NOTICE 'Preguntas insertadas/actualizadas para escenario id=%', v_scenario_id;
END $$;


-- Insertar metadatos (checklist, briefs, triggers) idempotente en scenario_presencial_meta si existe
DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Politrauma: TCE con HTIC (sospecha de maltrato)' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario no encontrado; omitiendo metadatos.';
    RETURN;
  END IF;

  IF to_regclass('public.scenario_presencial_meta') IS NOT NULL THEN
    INSERT INTO public.scenario_presencial_meta (scenario_id, student_brief, instructor_brief, room_layout, checklist_template, roles_required, triggers)
    VALUES (
      v_scenario_id,
      $student$Paciente pediátrico con politrauma y sospecha de maltrato. Presenta alteración del nivel de conciencia (GCS 8), anisocoria derecha, patrón respiratorio irregular y signos externos de lesiones en distintas etapas. Mantener ABCDE, preparar intubación, solicitar TC craneal urgente y activar protección infantil.$student$,
      $instructor$Claves para instructores:
- GCS ≤ 8 y anisocoria → considerar lesión focal/hernia y priorizar intubación/protección de vía aérea.
- Hipotensión en pediatría empeora pronóstico neurológico; administrar bolos de cristaloides (20 ml/kg) y vasopresores si preciso.
- Evitar hipercapnia; mantener PaCO2 35–40 mmHg.
- Osmoterapia (manitol o suero hipertónico) según protocolo; monitorizar natremia y diuresis.
- Documentación forense (fotos timestamped, registro objetivo) y notificación a protección infantil es obligatoria.$instructor$,
      -- Añadimos `room_layout` con objeto `patient` que incluye demographics, vitals y objetivos pedagógicos
      '{"patient": {"age_years": 2, "age_months": 24, "sex": "M", "weight_kg": 12}, "vitals": {"gcs": 8, "fc": 156, "fr": 30, "sat": 94, "temp": 35, "ta": {"systolic": 78, "diastolic": 42}}, "objectives": {"general": "Reconocer y manejar de forma inicial HTIC en politrauma pediátrico: protección de vía aérea, mantenimiento de perfusión cerebral, medidas neuroprotectoras y activación de protección infantil.", "roles": {"medico": ["Priorizar protección de vía aérea y decidir indicación quirúrgica","Mantener presión de perfusión cerebral y tratar hipotensión","Seleccionar y monitorizar osmoterapia"], "enfermeria": ["Realizar monitorización neurológica continua y alertar cambios","Asegurar accesos y soporte para reanimación","Documentar lesiones y colaborar con notificación forense"], "anestesia": ["Planificar RSI minimizando impacto en PIC y en hemodinamia","Mantener objetivos ventilatorios adecuados (PaCO2 35–40 mmHg)","Manejo de hipotensión durante inducción"] , "farmacia": ["Preparar y validar dosis pediátricas de emergencia","Asegurar disponibilidad de anticonvulsivantes y vasopresores","Coordinar entrega rápida de sangre/derivados si procede"]}}}'::jsonb,
      '[{"group":"Acciones críticas","items":[
        {"label":"GCS ≤ 8","correct":true},
        {"label":"Anisocoria o pupilas asimétricas","correct":true},
        {"label":"Hipotensión (edad-específica)","correct":true},
        {"label":"Patrón respiratorio alterado/hipoventilación","correct":true},
        {"label":"Lesiones en distintas etapas (sospecha maltrato)","correct":true},
        {"label":"Glucemia levemente alterada aislada","correct":false},
        {"label":"Fiebre aislada 37.8 ºC","correct":false}
      ]}]'::jsonb,
      '[{"role":"medico","min":1,"max":2},{"role":"enfermeria","min":1,"max":2},{"role":"anestesia","min":1,"max":1},{"role":"farmacia","min":0,"max":1}]'::jsonb,
      '[{"event":"vital_threshold","variable":"systolic_bp","condition":"<age_adjusted_hypotension","action":"flag_hemodynamic_instability"},{"event":"neurologic_deterioration","variable":"gcs","condition":"<=8","action":"flag_airway_and_neurosurgery"}]'::jsonb
    ) ON CONFLICT (scenario_id) DO UPDATE
    SET student_brief = EXCLUDED.student_brief,
        instructor_brief = EXCLUDED.instructor_brief,
        room_layout = EXCLUDED.room_layout,
        checklist_template = EXCLUDED.checklist_template,
        roles_required = EXCLUDED.roles_required,
        triggers = EXCLUDED.triggers;
  ELSE
    RAISE NOTICE 'Tabla public.scenario_presencial_meta no encontrada; omitiendo metadatos.';
  END IF;
END $$;

-- FIN del migration
-- Migration: Add time_limit_minutes to scenarios (idempotent)
-- Date: 2025-11-19

BEGIN;

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS time_limit_minutes integer;

-- Backfill from estimated_minutes if available and if time_limit_minutes is null
UPDATE public.scenarios
SET time_limit_minutes = estimated_minutes
WHERE time_limit_minutes IS NULL AND estimated_minutes IS NOT NULL;

COMMIT;
-- Migration: Poblar campos administrativos para escenario id=48 (Politrauma)
-- Fecha: 2025-11-19
-- Idempotente: usa el id explícito 48 para entornos donde el título difiera

DO $$
DECLARE
  v_scenario_id INT := 48; -- id explícito proporcionado por el usuario
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.scenarios WHERE id = v_scenario_id) THEN
    RAISE NOTICE 'Escenario id=% no existe; saliendo.', v_scenario_id;
    RETURN;
  END IF;

  IF to_regclass('public.scenario_presencial_meta') IS NOT NULL THEN
    INSERT INTO public.scenario_presencial_meta (
      scenario_id,
      student_brief,
      instructor_brief,
      room_layout,
      checklist_template,
      roles_required,
      triggers
    )
    VALUES (
      v_scenario_id,
      $student$Paciente pediátrico de 8 años con politrauma tras mecanismo de alta energía. Presenta contusión craneal, hematoma subcostal izquierdo, disminución del nivel de conciencia (GCS 11), posible anisocoria, taquipnea y taquicardia. Priorizar ABCDE: proteger vía aérea si empeora el nivel de conciencia, asegurar acceso vascular y estabilizar hemodinámica; activar protocolo de protección infantil ante lesiones en distintas etapas y documentar de forma objetiva.$student$,
      $instructor$Puntos clave para instructores:
- Evaluación primaria enfocada en protección de vía aérea y soporte ventilatorio: valorar intubación si GCS ≤ 8 o compromiso ventilatorio progresivo.
- Mantener presión de perfusión cerebral: evitar hipotensión (bolo de cristaloides 20 ml/kg en pediatría) y preparar vasopresores si no responde.
- Manejo de HTIC: elevar cabecera, mantener normotermia, considerar osmoterapia (suero hipertónico o manitol) según protocolo y monitorizar sodio y diuresis.
- Documentación forense y protección infantil: fotografiar lesiones con timestamp, registrar hallazgos objetivos y notificar a trabajo social/protección infantil.
- Comunicación y coordinación: preparar traslado a UCI/neurocirugía si indica, coordinar sangre y equipo quirúrgico cuando exista lesión operable.$instructor$,
      $room$
      {
        "patient": { "age_years": 8, "age_months": 96, "sex": "M", "weight_kg": 26, "presenting_complaint": "Politrauma tras mecanismo contuso; sospecha de maltrato" },
        "vitals": { "gcs": 11, "fc": 160, "fr": 30, "sat": 94, "temp": 36.2, "ta": { "systolic": 95, "diastolic": 50 } },
        "physical_exam": ["Contusión craneal","Hematoma subcostal izquierdo","Taquipnea ligera: FR 30 rpm","Pálido, relleno capilar 2s","Obnubilado; Glasgow 11","Dudosa anisocoria; pupilas reactivas"],
        "quick_labs": [{"name":"Glucemia capilar","value":"142 mg/dL"},{"name":"Lactato","value":"3.8 mmol/L"}],
        "imaging_monitoring": [{"name":"Radiografía de tórax","note":"No indicada de urgencia"},{"name":"ECG continuo","note":"Monitorizado"}],
        "tags": ["politrauma","pediatria","TCE","maltrato"],
        "competencies": [{"name":"Manejo inicial del politrauma pediátrico","level":"avanzado"},{"name":"Protección infantil y documentación forense","level":"intermedio"},{"name":"Soporte hemodinámico en shock pediátrico","level":"avanzado"}],
        "objectives": { "general": "Reconocer y manejar de forma inicial HTIC en politrauma pediátrico: protección de vía aérea, mantenimiento de perfusión cerebral, medidas neuroprotectoras y activación de protección infantil.", "roles": { "medico": ["Priorizar protección de vía aérea y valorar indicación de intubación/RSI","Mantener presión de perfusión cerebral y tratar la hipotensión","Decidir uso de osmoterapia y coordinar neurocirugía si procede"], "enfermeria": ["Realizar monitorización neurológica y signos vitales continuos","Asegurar accesos IV/IO y preparar material para reanimación","Documentar lesiones objetivamente y colaborar con notificación forense"], "farmacia": ["Preparar dosis pediátricas de emergencia (vasopresores, benzodiacepinas, anticonvulsivantes)","Validar y asegurar disponibilidad de soluciones hipertónicas y sangre","Garantizar trazabilidad en la entrega de medicamentos en contexto forense"] } }
      }
      $room$::jsonb,
      $checklist$
      [ { "group": "Acciones críticas", "items": [ { "label": "Proteger vía aérea si GCS ≤ 8 o signos de compromiso ventilatorio", "correct": true }, { "label": "Administrar bolo cristaloides 20 ml/kg ante hipotensión pediátrica", "correct": true }, { "label": "Activar protección infantil y documentar lesiones (fotografías timestamped)", "correct": true }, { "label": "Solicitar TC craneal urgente si hay sospecha de lesión intracraneal", "correct": true }, { "label": "Iniciar osmoterapia según protocolo si hay HTIC evidente", "correct": true } ] } ]
      $checklist$::jsonb,
      $roles_json$
      [ { "role": "medico", "min": 1, "max": 2 }, { "role": "enfermeria", "min": 1, "max": 2 }, { "role": "farmacia", "min": 0, "max": 1 }, { "role": "anestesia", "min": 0, "max": 1 } ]
      $roles_json$::jsonb,
      $triggers_json$
      [ { "event": "vital_threshold", "variable": "ta_systolic", "condition": "<age_adjusted_hypotension", "action": "flag_hemodynamic_instability" }, { "event": "neurologic_deterioration", "variable": "gcs", "condition": "<=8", "action": "flag_airway_and_neurosurgery" } ]
      $triggers_json$::jsonb
    )
    ON CONFLICT (scenario_id) DO UPDATE
    SET
      student_brief = EXCLUDED.student_brief,
      instructor_brief = EXCLUDED.instructor_brief,
      room_layout = EXCLUDED.room_layout,
      checklist_template = EXCLUDED.checklist_template,
      roles_required = EXCLUDED.roles_required,
      triggers = EXCLUDED.triggers;
  ELSE
    RAISE NOTICE 'Tabla public.scenario_presencial_meta no encontrada; omitiendo poblado.';
  END IF;
END $$;

-- FIN (idempotente para scenario id=48)
-- Migration: Poblar campos administrativos completos para escenario Politrauma (student/instructor brief, objetivos, vitals, checklist)
-- Fecha: 2025-11-19
-- Idempotente: busca escenario por título e inserta/actualiza en scenario_presencial_meta

DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Politrauma: TCE con HTIC (sospecha de maltrato)' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario no encontrado: %', 'Politrauma: TCE con HTIC (sospecha de maltrato)';
    RETURN;
  END IF;

  IF to_regclass('public.scenario_presencial_meta') IS NOT NULL THEN
    INSERT INTO public.scenario_presencial_meta (
      scenario_id,
      student_brief,
      instructor_brief,
      room_layout,
      checklist_template,
      roles_required,
      triggers
    )
    VALUES (
      v_scenario_id,
      $student$Paciente pediátrico de 8 años con politrauma tras mecanismo de alta energía. Presenta contusión craneal, hematoma subcostal izquierdo, disminución del nivel de conciencia (GCS 11), posible anisocoria, taquipnea y taquicardia. Priorizar ABCDE: proteger vía aérea si empeora el nivel de conciencia, asegurar acceso vascular y estabilizar hemodinámica; activar protocolo de protección infantil ante lesiones en distintas etapas y documentar de forma objetiva.$student$,
      $instructor$Puntos clave para instructores:
- Evaluación primaria enfocada en protección de vía aérea y soporte ventilatorio: valorar intubación si GCS ≤ 8 o compromiso ventilatorio progresivo.
- Mantener presión de perfusión cerebral: evitar hipotensión (bolo de cristaloides 20 ml/kg en pediatría) y preparar vasopresores si no responde.
- Manejo de HTIC: elevar cabecera, mantener normotermia, considerar osmoterapia (suero hipertónico o manitol) según protocolo y monitorizar sodio y diuresis.
- Documentación forense y protección infantil: fotografiar lesiones con timestamp, registrar hallazgos objetivos y notificar a trabajo social/protección infantil.
- Comunicación y coordinación: preparar traslado a UCI/neurocirugía si indica, coordinar sangre y equipo quirúrgico cuando exista lesión operable.$instructor$,
      $room$
      {
        "patient": {
          "age_years": 8,
          "age_months": 96,
          "sex": "M",
          "weight_kg": 26,
          "presenting_complaint": "Politrauma tras mecanismo contuso; sospecha de maltrato",
          "history": [
            "Antecedentes: Asma leve",
            "Evento actual: caída con impacto en cabeza/torax; signos en distintas etapas"
          ]
        },
        "vitals": {
          "gcs": 11,
          "fc": 160,
          "fr": 30,
          "sat": 94,
          "temp": 36.2,
          "ta": { "systolic": 95, "diastolic": 50 }
        },
        "physical_exam": [
          "Contusión craneal",
          "Hematoma subcostal izquierdo",
          "Taquipnea ligera: FR 30 rpm, superficial",
          "Pálido, relleno capilar 2s",
          "Obnubilado; Glasgow modificado 11 (O3, V3, M5)",
          "Dudosa anisocoria; pupilas reactivas"
        ],
        "quick_labs": [
          { "name": "Glucemia capilar", "value": "142 mg/dL" },
          { "name": "Lactato", "value": "3.8 mmol/L" }
        ],
        "imaging_monitoring": [
          { "name": "Radiografía de tórax", "note": "No indicada de urgencia" },
          { "name": "ECG continuo", "note": "Monitorizado" }
        ],
        "triage": {
          "appearance": "altered",
          "respiration": "tachypneic",
          "circulation": "compromised"
        },
        "tags": ["politrauma","pediatria","TCE","maltrato"],
        "competencies": [
          { "name": "Manejo inicial del politrauma pediátrico", "level": "avanzado" },
          { "name": "Protección infantil y documentación forense", "level": "intermedio" },
          { "name": "Soporte hemodinámico en shock pediátrico", "level": "avanzado" }
        ],
        "objectives": {
          "general": "Reconocer y manejar de forma inicial HTIC en politrauma pediátrico: protección de vía aérea, mantenimiento de perfusión cerebral, medidas neuroprotectoras y activación de protección infantil.",
          "roles": {
            "medico": [
              "Priorizar protección de vía aérea y valorar indicación de intubación/RSI",
              "Mantener presión de perfusión cerebral y tratar la hipotensión",
              "Decidir uso de osmoterapia y coordinar neurocirugía si procede"
            ],
            "enfermeria": [
              "Realizar monitorización neurológica y signos vitales continuos",
              "Asegurar accesos IV/IO y preparar material para reanimación",
              "Documentar lesiones objetivamente y colaborar con notificación forense"
            ],
            "farmacia": [
              "Preparar dosis pediátricas de emergencia (vasopresores, benzodiacepinas, anticonvulsivantes)",
              "Validar y asegurar disponibilidad de soluciones hipertónicas y sangre",
              "Garantizar trazabilidad en la entrega de medicamentos en contexto forense"
            ]
          }
        }
      }
      $room$::jsonb,
      $checklist$
      [
        {
          "group": "Acciones críticas",
          "items": [
            { "label": "Proteger vía aérea si GCS ≤ 8 o signos de compromiso ventilatorio", "correct": true },
            { "label": "Administrar bolo cristaloides 20 ml/kg ante hipotensión pediátrica", "correct": true },
            { "label": "Activar protección infantil y documentar lesiones (fotografías timestamped)", "correct": true },
            { "label": "Solicitar TC craneal urgente si hay sospecha de lesión intracraneal", "correct": true },
            { "label": "Iniciar osmoterapia según protocolo si hay HTIC evidente", "correct": true }
          ]
        }
      ]
      $checklist$::jsonb,
      $roles_json$
      [
        { "role": "medico", "min": 1, "max": 2 },
        { "role": "enfermeria", "min": 1, "max": 2 },
        { "role": "farmacia", "min": 0, "max": 1 },
        { "role": "anestesia", "min": 0, "max": 1 }
      ]
      $roles_json$::jsonb,
      $triggers_json$
      [
        { "event": "vital_threshold", "variable": "ta_systolic", "condition": "<age_adjusted_hypotension", "action": "flag_hemodynamic_instability" },
        { "event": "neurologic_deterioration", "variable": "gcs", "condition": "<=8", "action": "flag_airway_and_neurosurgery" }
      ]
      $triggers_json$::jsonb
    )
    ON CONFLICT (scenario_id) DO UPDATE
    SET
      student_brief = EXCLUDED.student_brief,
      instructor_brief = EXCLUDED.instructor_brief,
      room_layout = EXCLUDED.room_layout,
      checklist_template = EXCLUDED.checklist_template,
      roles_required = EXCLUDED.roles_required,
      triggers = EXCLUDED.triggers;
  ELSE
    RAISE NOTICE 'Tabla public.scenario_presencial_meta no encontrada; omitiendo poblado.';
  END IF;
END $$;

-- FIN
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