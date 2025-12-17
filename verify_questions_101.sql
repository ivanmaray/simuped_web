-- Verificar si las preguntas están insertadas para los step_ids 108-112
SELECT step_id, COUNT(*) as num_questions FROM questions WHERE step_id IN (108,109,110,111,112) GROUP BY step_id ORDER BY step_id;

-- Ver todas las preguntas para esos steps
SELECT id, step_id, question_text FROM questions WHERE step_id IN (108,109,110,111,112) ORDER BY step_id, id;
