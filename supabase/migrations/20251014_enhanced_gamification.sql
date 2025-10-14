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
