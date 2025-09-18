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

