BEGIN;
WITH targets AS (
  SELECT
    q.id,
    jsonb_agg(jsonb_build_object('text', arr.value, 'value', chr(65 + arr.ordinality - 1))) AS new_options,
    CASE
      WHEN q.correct_option ~ '^[0-9]+$' THEN chr(65 + q.correct_option::int)
      ELSE q.correct_option
    END AS new_correct_option
  FROM questions q
  CROSS JOIN LATERAL jsonb_array_elements_text(q.options) WITH ORDINALITY arr(value, ordinality)
  WHERE q.step_id IN (108, 109, 110, 111, 112)
    AND q.options IS NOT NULL
    AND jsonb_typeof(q.options->0) = 'string'
  GROUP BY q.id, q.correct_option
)
UPDATE questions q
SET options = t.new_options,
    correct_option = t.new_correct_option
FROM targets t
WHERE q.id = t.id;
COMMIT;
