-- ============================================================================
-- QUERY: Ver escenarios online existentes y contar sus componentes
-- Ejecuta esto en SQL Editor de Supabase para ver qué escenarios actualizar
-- ============================================================================

-- 1. ESCENARIOS ONLINE EXISTENTES (tabla principal)
SELECT 
  s.id,
  s.title,
  s.summary,
  s.difficulty,
  s.level,
  s.status,
  s.mode,
  s.estimated_minutes,
  s.max_attempts,
  s.created_at,
  -- Contar componentes relacionados
  (SELECT COUNT(*) FROM case_briefs cb WHERE cb.scenario_id = s.id) as briefing_count,
  (SELECT COUNT(*) FROM steps st WHERE st.scenario_id = s.id) as steps_count,
  (SELECT COUNT(*) FROM questions q 
   JOIN steps st ON q.step_id = st.id 
   WHERE st.scenario_id = s.id) as questions_count,
  (SELECT COUNT(*) FROM case_resources cr WHERE cr.scenario_id = s.id) as resources_count
FROM scenarios s
WHERE 'online' = ANY(s.mode)
ORDER BY s.id;

-- 2. DETALLE DE STEPS Y QUESTIONS POR ESCENARIO
SELECT 
  s.id as scenario_id,
  s.title as scenario_title,
  st.id as step_id,
  st.step_order,
  st.description as step_description,
  COUNT(q.id) as questions_in_step
FROM scenarios s
LEFT JOIN steps st ON st.scenario_id = s.id
LEFT JOIN questions q ON q.step_id = st.id
WHERE 'online' = ANY(s.mode)
GROUP BY s.id, s.title, st.id, st.step_order, st.description
ORDER BY s.id, st.step_order;

-- 3. ESCENARIOS SIN BRIEFING (necesitan completarse)
SELECT 
  s.id,
  s.title,
  s.status
FROM scenarios s
WHERE 'online' = ANY(s.mode)
  AND NOT EXISTS (SELECT 1 FROM case_briefs cb WHERE cb.scenario_id = s.id)
ORDER BY s.id;

-- 4. ESCENARIOS SIN STEPS (necesitan completarse)
SELECT 
  s.id,
  s.title,
  s.status
FROM scenarios s
WHERE 'online' = ANY(s.mode)
  AND NOT EXISTS (SELECT 1 FROM steps st WHERE st.scenario_id = s.id)
ORDER BY s.id;

-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ejecuta estas queries en SQL Editor
-- 2. Copia los resultados (IDs y títulos de escenarios existentes)
-- 3. Indica cuáles de los 10 escenarios mencionados ya existen
-- 4. Actualizaré los scripts para completar/actualizar en lugar de crear
-- ============================================================================
