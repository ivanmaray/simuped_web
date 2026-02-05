-- Verificación final del escenario 101
SELECT 
    'Steps count' as check_type, COUNT(*) as count FROM steps WHERE scenario_id = 101
UNION ALL
SELECT 
    'Questions count' as check_type, COUNT(*) as count FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 101
UNION ALL
SELECT 
    'Questions with roles=null' as check_type, COUNT(*) as count FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 101 AND q.roles IS NULL
UNION ALL
SELECT 
    'Questions with string options' as check_type, COUNT(*) as count FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 101 AND jsonb_typeof(q.options->0) = 'string'
UNION ALL
SELECT 
    'Questions with numeric correct_option' as check_type, COUNT(*) as count FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 101 AND q.correct_option ~ '^[0-9]+$';
