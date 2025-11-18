-- Seed: Mordedura de víbora
-- Crea/usa un microcaso llamado 'Mordedura de víbora', inserta nodos, opciones y actualiza start_node_id.
-- Instrucciones: subir los PDF de bibliografía a Supabase Storage y reemplazar `{{ANTIDOTO_PDF_URL}}` en `media_url` si quieres enlazarlos desde el caso.

BEGIN;

-- 1) Buscar caso existente por slug o título; si no existe, crear uno.
WITH case_row AS (
  SELECT id FROM public.micro_cases
  WHERE slug = 'mordedura-de-vibora'
     OR lower(title) LIKE '%mordedura%vibora%'
),
case_id AS (
  INSERT INTO public.micro_cases (slug, title, summary, estimated_minutes, difficulty, recommended_roles, is_published, created_at, updated_at)
  SELECT
    'mordedura-de-vibora',
    'Mordedura de víbora',
    'Paciente adulto con mordedura de víbora. Evaluar compromiso local y sistémico y decidir manejo (antídoto, observación, manejo de laboratorio).',
    15,
    'intermedio',
    ARRAY['medico','enfermeria'],
    true,
    now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM case_row)
  RETURNING id
),
the_case AS (
  SELECT id FROM case_row
  UNION ALL
  SELECT id FROM case_id
)

-- 2) Insertar nodos: inicio (info) -> decision inicial -> labs (info) -> decision secundaria -> outcomes
, node_start AS (
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, media_url, order_index, metadata)
  SELECT id, 'info', $$
### Caso

Paciente de 34 años acude a urgencias tras recibir una mordedura de víbora en la región distal de la pierna hace 40 minutos.

Signos: dolor intenso local, eritema y edema progresivo. Niega pérdida de conciencia. Presenta náuseas y vómitos leves.

Antecedentes: sin alergias conocidas, sin anticoagulantes.

Puntos clave: ¿hay evidencia de envenenamiento sistémico? ¿administrar suero antiofídico ahora o esperar resultados de laboratorio?

**Bibliografía y recursos:**
- Documento: Suero antiofídico (ver bibliografía adjunta).

$$, NULL, 0, '{}'::jsonb
  FROM the_case
  RETURNING id
),

node_decision_initial AS (
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index)
  SELECT id, 'decision', $$
¿Qué haces ahora?

- Observación local y alta con analgésicos.
- Analgesia, limpieza, y solicitar pruebas: hemograma, TP/INR, tiempo de coagulación, creatinina y CK.
- Administrar suero antiofídico ahora.

Indica la elección que consideres más adecuada.
$$, 1
  FROM the_case
  RETURNING id
),

node_labs_results AS (
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index)
  SELECT id, 'info', $$
Resultados de laboratorio (2 horas después):

- Hemoglobina: 13 g/dL
- Plaquetas: 80 x10^3/µL (baja)
- TP/INR: TP prolongado (INR 2.1)
- Creatinina: 1.1 mg/dL
- CK: levemente elevada

Interpretación: datos de coagulopatía inducida por veneno y trombocitopenia; riesgo de sangrado sistémico.
$$, 2
  FROM the_case
  RETURNING id
),

node_decision_after_labs AS (
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index)
  SELECT id, 'decision', $$
Con los resultados anteriores, ¿qué haces?

- Continúo observando; no administro antídoto.
- Inicio suero antiofídico según protocolo y monitorizo en UCI si necesario.
- Corregir coagulopatía con plasma/plaquetas antes de decidir antídoto.
$$, 3
  FROM the_case
  RETURNING id
),

node_outcome_good AS (
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal)
  SELECT id, 'outcome', $$
**Resultado positivo**

Se administra suero antiofídico de manera oportuna. A las 24 horas mejora el edema y los parámetros de coagulación comienzan a normalizarse. El paciente se recupera sin complicaciones mayores.

Puntos de aprendizaje:
- Identificar signos de envenenamiento sistémico.
- Indicación temprana de antídoto cuando hay coagulopatía progresiva.
$$, 4, true
  FROM the_case
  RETURNING id
),

node_outcome_bad AS (
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal)
  SELECT id, 'outcome', $$
**Resultado adverso**

Se decidió observar sin administrar antídoto. Evolución: hemorragia digestiva y empeoramiento de la coagulopatía; traslado a UCI tardío y complicaciones que prolongan la hospitalización.

Puntos de aprendizaje:
- Riesgos de retrasar antídoto frente a signos sistémicos.
$$, 5, true
  FROM the_case
  RETURNING id
)

-- 3) Opciones para decision inicial: enlazan a labs o outcomes
, opt_decision_initial_obs AS (
  INSERT INTO public.micro_case_options (node_id, label, next_node_id, feedback_md, score_delta, is_critical, created_at)
  SELECT nd.id, 'Observar y alta con analgésicos', (SELECT id FROM node_outcome_bad), 'Riesgo de infraestimar el envenenamiento. Si aparecen signos sistémicos, reconsiderar antídoto.', -10, false, now()
  FROM node_decision_initial nd
  RETURNING id
),

opt_decision_initial_labs AS (
  INSERT INTO public.micro_case_options (node_id, label, next_node_id, feedback_md, score_delta, is_critical, created_at)
  SELECT nd.id, 'Solicitar pruebas y observar', (SELECT id FROM node_labs_results), 'Buena práctica: confirmar coagulopatía antes de administrar antídoto si el cuadro es incierto.', 5, false, now()
  FROM node_decision_initial nd
  RETURNING id
),

opt_decision_initial_antidoto AS (
  INSERT INTO public.micro_case_options (node_id, label, next_node_id, feedback_md, score_delta, is_critical, created_at)
  SELECT nd.id, 'Administrar suero antiofídico ahora', (SELECT id FROM node_outcome_good), 'Si hay sospecha razonable de envenenamiento sistémico, administrar antídoto reduce morbilidad.', 10, true, now()
  FROM node_decision_initial nd
  RETURNING id
),

-- 4) Opciones posterior a labs: enlazan a outcomes o manejo adicional
opt_after_labs_observe AS (
  INSERT INTO public.micro_case_options (node_id, label, next_node_id, feedback_md, score_delta, is_critical, created_at)
  SELECT nd.id, 'Continuar observación sin antídoto', (SELECT id FROM node_outcome_bad), 'Con coagulopatía clara, la observación sola conlleva riesgo elevado.', -10, false, now()
  FROM node_decision_after_labs nd
  RETURNING id
),

opt_after_labs_antidoto AS (
  INSERT INTO public.micro_case_options (node_id, label, next_node_id, feedback_md, score_delta, is_critical, created_at)
  SELECT nd.id, 'Iniciar suero antiofídico según protocolo', (SELECT id FROM node_outcome_good), 'Correcta indicación: antídoto ante coagulopatía y signos sistémicos.', 10, true, now()
  FROM node_decision_after_labs nd
  RETURNING id
),

opt_after_labs_supportive AS (
  INSERT INTO public.micro_case_options (node_id, label, next_node_id, feedback_md, score_delta, is_critical, created_at)
  SELECT nd.id, 'Corregir con plasma/plaquetas y reevaluar', (SELECT id FROM node_outcome_good), 'Medidas de soporte pueden ser necesarias, pero el antídoto sigue siendo la terapia específica.', 2, false, now()
  FROM node_decision_after_labs nd
  RETURNING id
)

-- 5) Actualizar el start_node_id del caso
UPDATE public.micro_cases
SET start_node_id = (SELECT id FROM node_start), updated_at = now()
WHERE id IN (SELECT id FROM the_case);

COMMIT;

-- Notas:
-- 1) Reemplaza `{{ANTIDOTO_PDF_URL}}` por la URL pública del PDF si subes la bibliografía a Supabase Storage (p. ej. bucket `public`).
-- 2) Si prefieres que los nodos tengan imágenes o enlaces a recursos, actualiza la columna `media_url` en `public.micro_case_nodes` con la URL correspondiente.
-- 3) Si tu microcaso ya existe pero tiene otro `slug`, ajusta la condición de búsqueda en la CTE `case_row`.
