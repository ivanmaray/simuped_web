-- ==============================================================================
-- LIMPIEZA DE DUPLICADOS: Escenario 101 (Status Epiléptico Refractario)
-- ==============================================================================
-- Este script elimina todos los duplicados del escenario 101 antes de re-ejecutar
-- el script principal 03_status_epileptico.sql
-- Ejecutar en Supabase SQL Editor
-- ==============================================================================

-- ==============================================================================
-- PASO 1: ELIMINAR QUESTIONS (dependen de steps)
-- ==============================================================================
DELETE FROM questions
WHERE step_id IN (
  SELECT id FROM steps WHERE scenario_id = 101
);

-- ==============================================================================
-- PASO 2: ELIMINAR STEPS
-- ==============================================================================
DELETE FROM steps WHERE scenario_id = 101;

-- ==============================================================================
-- PASO 3: ELIMINAR CASE_BRIEFS
-- ==============================================================================
DELETE FROM case_briefs WHERE scenario_id = 101;

-- ==============================================================================
-- PASO 4: ELIMINAR CASE_RESOURCES
-- ==============================================================================
DELETE FROM case_resources WHERE scenario_id = 101;

-- ==============================================================================
-- VERIFICACIÓN POST-LIMPIEZA
-- ==============================================================================
SELECT
  (SELECT COUNT(*) FROM case_briefs WHERE scenario_id = 101) as briefing_count,
  (SELECT COUNT(*) FROM steps WHERE scenario_id = 101) as steps_count,
  (SELECT COUNT(*) FROM questions WHERE step_id IN (SELECT id FROM steps WHERE scenario_id = 101)) as questions_count,
  (SELECT COUNT(*) FROM case_resources WHERE scenario_id = 101) as resources_count;

-- Resultado esperado: 0, 0, 0, 0

-- ==============================================================================
-- INSTRUCCIONES:
-- 1. Ejecutar este script completo en Supabase
-- 2. Verificar que los conteos sean 0
-- 3. Ejecutar el script 03_status_epileptico.sql completo
-- 4. Verificar la inserción correcta con la consulta al final del script principal
-- ==============================================================================