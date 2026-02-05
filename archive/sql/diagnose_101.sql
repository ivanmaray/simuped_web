-- Diagnosticar preguntas del escenario 101
SELECT 
    q.id, 
    q.step_id, 
    q.question_text, 
    q.roles, 
    jsonb_typeof(q.options) as options_type,
    q.options->0 as first_option,
    q.correct_option,
    jsonb_typeof(q.correct_option::jsonb) as correct_type,
    q.is_critical,
    q.time_limit
FROM questions q
JOIN steps st ON st.id = q.step_id
WHERE st.scenario_id = 101
ORDER BY st.step_order, q.id
LIMIT 10;
