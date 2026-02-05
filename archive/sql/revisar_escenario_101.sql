-- Revisar escenario 101 completo: scenario, brief, steps y questions

-- 1. Información del escenario
SELECT * FROM scenarios WHERE id = 101;

-- 2. Brief del caso (asumiendo tabla case_briefs; ajusta si es diferente)
SELECT * FROM case_briefs WHERE scenario_id = 101;

-- Si el brief está en la tabla scenarios, usa:
-- SELECT id, brief FROM scenarios WHERE id = 101;

-- 3. Steps del escenario
SELECT * FROM steps WHERE scenario_id = 101 ORDER BY step_order;

-- 4. Questions de los steps
SELECT q.*, st.step_order, st.description as step_description
FROM questions q
JOIN steps st ON st.id = q.step_id
WHERE st.scenario_id = 101
ORDER BY st.step_order, q.id;

-- 5. Recursos del caso (opcional)
SELECT * FROM case_resources WHERE scenario_id = 101 ORDER BY weight;

-- 6. Verificar si hay attempts previos (opcional)
SELECT * FROM attempts WHERE scenario_id = 101 ORDER BY id DESC LIMIT 10;
