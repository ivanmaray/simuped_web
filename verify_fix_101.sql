-- Verificar que el fix funcionó
SELECT 
    q.id, 
    q.step_id, 
    q.question_text, 
    q.roles, 
    CASE 
        WHEN jsonb_typeof(q.options->0) = 'string' THEN 'string'
        WHEN jsonb_typeof(q.options->0) = 'object' THEN 'object'
        ELSE 'other'
    END as option_format,
    q.options->0 as first_option,
    q.correct_option,
    CASE 
        WHEN q.correct_option ~ '^[0-9]+$' THEN 'number'
        ELSE 'letter'
    END as correct_type
FROM questions q
JOIN steps st ON st.id = q.step_id
WHERE st.scenario_id = 101
ORDER BY st.step_order, q.id
LIMIT 5;
