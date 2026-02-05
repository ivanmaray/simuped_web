-- Convertir preguntas del escenario 101 que usan objetos {text,value} a opciones planas con índices numéricos

BEGIN;
WITH steps_101 AS (
  SELECT id
  FROM steps
  WHERE scenario_id = 101
),
targets AS (
  SELECT
    q.id,
    jsonb_agg((opt->> 'text') ORDER BY arr.ordinality) AS new_options,
    CASE
      WHEN q.correct_option ~ '^[A-Z]$' THEN (ascii(q.correct_option) - ascii('A'))::text
      ELSE q.correct_option
    END AS new_correct_option
  FROM questions q
  JOIN steps_101 s ON s.id = q.step_id
  CROSS JOIN LATERAL jsonb_array_elements(q.options) WITH ORDINALITY arr(opt, ordinality)
  WHERE q.options IS NOT NULL
    AND jsonb_typeof(q.options->0) = 'object'
  GROUP BY q.id, q.correct_option
)
UPDATE questions q
SET options = t.new_options,
    correct_option = t.new_correct_option
FROM targets t
WHERE q.id = t.id;
COMMIT;
