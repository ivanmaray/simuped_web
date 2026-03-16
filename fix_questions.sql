-- ══════════════════════════════════════════════════════
-- FIX 1: Normalizar roles text[] ["MED"] → ["medico"], etc.
-- ══════════════════════════════════════════════════════

UPDATE questions
SET roles = (
  SELECT array_agg(
    CASE lower(r)
      WHEN 'med'   THEN 'medico'
      WHEN 'nur'   THEN 'enfermeria'
      WHEN 'pharm' THEN 'farmacia'
      ELSE lower(r)
    END
  )
  FROM unnest(roles) AS r
)
WHERE roles IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(roles) AS v
    WHERE lower(v) IN ('med', 'nur', 'pharm')
  );


-- ══════════════════════════════════════════════════════
-- FIX 2: Convertir options [{text,value}] → ["texto"]
-- Solo afecta preguntas donde options tiene objetos {text}
-- ══════════════════════════════════════════════════════

UPDATE questions
SET options = (
  SELECT jsonb_agg(elem -> 'text')
  FROM jsonb_array_elements(options) AS elem
  WHERE elem ? 'text'
)
WHERE options IS NOT NULL
  AND jsonb_typeof(options) = 'array'
  AND (options -> 0) ? 'text';


-- ══════════════════════════════════════════════════════
-- VERIFICACIÓN: debe devolver 0 filas en ambas
-- ══════════════════════════════════════════════════════

-- Roles inválidos restantes
SELECT id, question_text, roles
FROM questions
WHERE roles IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(roles) AS v
    WHERE lower(v) IN ('med', 'nur', 'pharm')
  );

-- Options con objetos {text} restantes
SELECT id, question_text
FROM questions
WHERE options IS NOT NULL
  AND jsonb_typeof(options) = 'array'
  AND (options -> 0) ? 'text';
