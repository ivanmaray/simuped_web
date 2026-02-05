-- ======================================================================
-- SCRIPT PARA EXTRAER TODO EL SQL DE UN ESCENARIO
-- ======================================================================
-- Uso: Reemplaza {{SCENARIO_ID}} con el ID del escenario
-- Copiar toda la salida y guardar en .sql
-- ======================================================================

-- ======================================================================
-- 1. CASE BRIEF
-- ======================================================================
SELECT '-- PASO 1: CASE BRIEF' AS section;
SELECT 
  'DELETE FROM case_briefs WHERE scenario_id = ' || scenario_id || ';' ||
  E'\n\nINSERT INTO case_briefs (' ||
  E'\n  scenario_id,' ||
  E'\n  title,' ||
  E'\n  context,' ||
  E'\n  chief_complaint,' ||
  E'\n  history,' ||
  E'\n  exam,' ||
  E'\n  vitals,' ||
  E'\n  quick_labs,' ||
  E'\n  objectives,' ||
  E'\n  critical_actions,' ||
  E'\n  red_flags,' ||
  E'\n  competencies,' ||
  E'\n  triangle' ||
  E'\n) VALUES (' ||
  scenario_id || E',\n  ' ||
  quote_literal(title) || E',\n  ' ||
  quote_literal(context) || E',\n  ' ||
  quote_literal(chief_complaint) || E',\n  ' ||
  quote_literal(history) || E',\n  ' ||
  quote_literal(exam) || E',\n  ' ||
  quote_literal(vitals) || E',\n  ' ||
  quote_literal(quick_labs) || E',\n  ' ||
  quote_literal(objectives) || E'::jsonb,\n  ' ||
  quote_literal(critical_actions) || E'::jsonb,\n  ' ||
  quote_literal(red_flags) || E'::jsonb,\n  ' ||
  quote_literal(competencies) || E'::jsonb,\n  ' ||
  quote_literal(triangle) || E'::jsonb\n);'
FROM case_briefs
WHERE scenario_id = {{SCENARIO_ID}};

-- ======================================================================
-- 2. STEPS
-- ======================================================================
SELECT E'\n\n-- PASO 2: STEPS\n' AS section;
SELECT 
  'INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)' ||
  E'\nVALUES (' ||
  scenario_id || E',\n  ' ||
  step_order || E',\n  ' ||
  quote_literal(narrative) || E',\n  ' ||
  quote_literal(description) || E',\n  ' ||
  (CASE WHEN role_specific THEN 'true' ELSE 'false' END) ||
  E'\n);'
FROM steps
WHERE scenario_id = {{SCENARIO_ID}}
ORDER BY step_order;

-- ======================================================================
-- 3. QUESTIONS
-- ======================================================================
SELECT E'\n\n-- PASO 3: QUESTIONS\n' AS section;

-- Primero los DELETEs
SELECT 
  'DELETE FROM attempt_answers WHERE question_id IN (SELECT q.id FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = {{SCENARIO_ID}});' ||
  E'\nDELETE FROM questions WHERE step_id IN (SELECT id FROM steps WHERE scenario_id = {{SCENARIO_ID}});' ||
  E'\n\nINSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES'
LIMIT 1;

-- Luego las preguntas
SELECT 
  '(' ||
  step_id || E',\n' ||
  quote_literal(question_text) || E',\n' ||
  quote_literal(options) || E',\n' ||
  correct_option || E',\n' ||
  quote_literal(explanation) || E',\n' ||
  'ARRAY[' || array_to_string(roles, ', ') || ']' || E',\n' ||
  (CASE WHEN is_critical THEN 'true' ELSE 'false' END) || E',\n' ||
  quote_literal(hints) || E',\n' ||
  COALESCE(time_limit::text, '90') || E',\n' ||
  COALESCE(quote_literal(critical_rationale), 'null') || '),'
FROM questions
WHERE step_id IN (SELECT id FROM steps WHERE scenario_id = {{SCENARIO_ID}})
ORDER BY step_id
LIMIT -1 OFFSET 0;

-- Fix: agregar punto y coma al final (eliminar última coma)
SELECT E';\n' AS final_semicolon LIMIT 1;

-- ======================================================================
-- 4. CASE RESOURCES
-- ======================================================================
SELECT E'\n\n-- PASO 4: CASE RESOURCES\n' AS section;
SELECT 
  'DELETE FROM case_resources WHERE scenario_id = ' || scenario_id || E';\n\n' ||
  'INSERT INTO case_resources (scenario_id, resource_order, resource_type, title, url, description) VALUES' ||
  E'\n'
FROM case_resources
WHERE scenario_id = {{SCENARIO_ID}}
LIMIT 1;

SELECT 
  '(' ||
  scenario_id || E',\n' ||
  resource_order || E',\n' ||
  quote_literal(resource_type) || E',\n' ||
  quote_literal(title) || E',\n' ||
  quote_literal(url) || E',\n' ||
  quote_literal(description) || '),'
FROM case_resources
WHERE scenario_id = {{SCENARIO_ID}}
ORDER BY resource_order
LIMIT -1 OFFSET 0;

SELECT E';\n' AS final LIMIT 1;
