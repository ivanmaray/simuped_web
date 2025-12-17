-- Revisar preguntas del escenario 101 con opciones y correcta marcada

SELECT 
  q.id,
  q.step_id,
  q.question_text,
  q.options,
  q.correct_option,
  json_array_length(q.options) as num_options,
  CASE 
    WHEN q.correct_option >= 0 AND q.correct_option < json_array_length(q.options) 
    THEN json_extract(q.options, CONCAT('$[', q.correct_option, ']'))
    ELSE 'ERROR: índice fuera de rango'
  END as correct_answer,
  q.explanation,
  q.roles,
  q.is_critical,
  q.hints,
  q.time_limit
FROM questions q
WHERE q.step_id IN (108, 109, 110, 111, 112)
ORDER BY q.step_id, q.id;
