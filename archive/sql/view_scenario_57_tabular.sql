-- ==============================================================================
-- VISTAS TABULARES PARA ESCENARIO 57
-- ==============================================================================
-- Ejecuta estas queries para ver todos los datos en tablas estructuradas

-- 1. CASO COMPLETO: BRIEF CON TODOS LOS DETALLES
SELECT *
FROM case_briefs 
WHERE scenario_id = 57;

-- 2. STEPS CON DESCRIPCIÓN
SELECT *
FROM steps 
WHERE scenario_id = 57
ORDER BY step_order;

-- 3. PREGUNTAS POR STEP (VISTA COMPLETA)
SELECT q.*, s.step_order
FROM questions q
JOIN steps s ON s.id = q.step_id
WHERE s.scenario_id = 57
ORDER BY s.step_order, q.id;

-- 4. PREGUNTAS POR ROL (DISTRIBUCIÓN)
SELECT 
  s.step_order as paso,
  unnest(q.roles) as rol,
  COUNT(*) as cantidad,
  SUM(CASE WHEN q.is_critical THEN 1 ELSE 0 END) as críticas
FROM questions q
JOIN steps s ON s.id = q.step_id
WHERE s.scenario_id = 57
GROUP BY s.step_order, rol
ORDER BY s.step_order, rol;

-- 5. RESUMEN GENERAL ESCENARIO 57
WITH stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE q.is_critical = true) as críticas_total,
    COUNT(*) as preguntas_total,
    COUNT(DISTINCT q.step_id) as steps_total,
    SUM(CASE WHEN 'medico' = ANY(q.roles) THEN 1 ELSE 0 END) as medico_count,
    SUM(CASE WHEN 'enfermeria' = ANY(q.roles) THEN 1 ELSE 0 END) as enfermeria_count,
    SUM(CASE WHEN 'farmacia' = ANY(q.roles) THEN 1 ELSE 0 END) as farmacia_count
  FROM questions q
  JOIN steps s ON s.id = q.step_id
  WHERE s.scenario_id = 57
)
SELECT 
  (SELECT title FROM case_briefs WHERE scenario_id = 57) as escenario,
  preguntas_total,
  críticas_total,
  steps_total,
  medico_count as "Médico",
  enfermeria_count as "Enfermería",
  farmacia_count as "Farmacia"
FROM stats;

-- 6. TABLA DETALLADA: PREGUNTAS CON OPCIONES
SELECT 
  s.step_order as paso,
  s.narrative as "Narrativa del step",
  q.question_text as pregunta,
  q.options->>0 as opción_0,
  q.options->>1 as opción_1,
  q.options->>2 as opción_2,
  q.options->>3 as opción_3,
  q.correct_option as correcta_índice,
  q.explanation as explicación,
  array_to_string(q.roles, ', ') as roles,
  CASE WHEN q.is_critical THEN 'SÍ' ELSE 'NO' END as crítica,
  q.time_limit as "tiempo_seg"
FROM questions q
JOIN steps s ON s.id = q.step_id
WHERE s.scenario_id = 57
ORDER BY s.step_order, q.id;

-- 7. CRÍTICAS SOLAMENTE (1 POR STEP)
SELECT 
  s.step_order as paso,
  s.narrative as narrativa,
  q.question_text as pregunta_crítica,
  array_to_string(q.roles, ', ') as rol,
  q.time_limit as temporizador,
  q.critical_rationale as justificación_crítica
FROM questions q
JOIN steps s ON s.id = q.step_id
WHERE s.scenario_id = 57 AND q.is_critical = true
ORDER BY s.step_order;

-- 8. RESOURCES (si existen)
SELECT *
FROM case_resources
WHERE scenario_id = 57;

-- 9. MATRIZ: PREGUNTAS × ROLES
SELECT 
  s.step_order,
  array_to_string(q.roles, ',') as roles,
  COUNT(*) as cantidad,
  SUM(CASE WHEN q.is_critical THEN 1 ELSE 0 END) as críticas
FROM questions q
JOIN steps s ON s.id = q.step_id
WHERE s.scenario_id = 57
GROUP BY s.step_order, q.roles
ORDER BY s.step_order, q.roles;

-- 10. CONTENIDO COMPLETO: PREGUNTAS CON TODAS LAS OPCIONES
SELECT 
  s.step_order as paso,
  q.id as pregunta_id,
  q.question_text as pregunta,
  q.options->0 as opción_A,
  q.options->1 as opción_B,
  q.options->2 as opción_C,
  q.options->3 as opción_D,
  q.correct_option::int + 1 as respuesta_correcta,
  q.explanation as explicación,
  array_to_string(q.roles, ', ') as roles,
  CASE WHEN q.is_critical THEN 'CRÍTICA ⭐' ELSE '' END as estado,
  q.time_limit as tiempo_segundos
FROM questions q
JOIN steps s ON s.id = q.step_id
WHERE s.scenario_id = 57
ORDER BY s.step_order, q.id;
