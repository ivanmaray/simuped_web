-- ==============================================================================
-- QUERIES PARA EXTRAER ESCENARIO 57 DE SUPABASE
-- ==============================================================================
-- Ejecuta estas queries en Supabase SQL Editor para obtener todos los datos

-- 1. CASE BRIEF
SELECT * FROM case_briefs WHERE scenario_id = 57;

-- 2. STEPS
SELECT * FROM steps WHERE scenario_id = 57 ORDER BY step_order;

-- 3. QUESTIONS (con step names)
SELECT 
  q.*,
  s.step_order
FROM questions q
JOIN steps s ON s.id = q.step_id
WHERE s.scenario_id = 57
ORDER BY s.step_order, q.id;

-- 4. CASE RESOURCES
SELECT * FROM case_resources WHERE scenario_id = 57 ORDER BY resource_order;

-- ==============================================================================
-- QUERIES COMBINADAS PARA EXPORTAR TODO
-- ==============================================================================

-- EXPORT CASE BRIEF (JSON format)
SELECT json_build_object(
  'case_brief', (SELECT row_to_json(row) FROM (SELECT * FROM case_briefs WHERE scenario_id = 57) row),
  'steps', (SELECT json_agg(row_to_json(row)) FROM (SELECT * FROM steps WHERE scenario_id = 57 ORDER BY step_order) row),
  'questions', (SELECT json_agg(row_to_json(row)) FROM (SELECT q.* FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 57 ORDER BY s.step_order, q.id) row),
  'resources', (SELECT json_agg(row_to_json(row)) FROM (SELECT * FROM case_resources WHERE scenario_id = 57 ORDER BY resource_order) row)
) AS scenario_57_complete;

-- ==============================================================================
-- QUERY PARA VERIFICAR INTEGRIDAD
-- ==============================================================================

-- Resumen del escenario 57
SELECT 
  'scenario_57' as escenario,
  (SELECT COUNT(*) FROM case_briefs WHERE scenario_id = 57) as case_briefs_count,
  (SELECT COUNT(*) FROM steps WHERE scenario_id = 57) as steps_count,
  (SELECT COUNT(*) FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 57) as questions_count,
  (SELECT COUNT(*) FROM case_resources WHERE scenario_id = 57) as resources_count,
  (SELECT COUNT(*) FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 57 AND q.is_critical = true) as critical_count,
  (SELECT COUNT(*) FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 57 AND 'medico' = ANY(q.roles)) as medico_count,
  (SELECT COUNT(*) FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 57 AND 'enfermeria' = ANY(q.roles)) as enfermeria_count,
  (SELECT COUNT(*) FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 57 AND 'farmacia' = ANY(q.roles)) as farmacia_count;
