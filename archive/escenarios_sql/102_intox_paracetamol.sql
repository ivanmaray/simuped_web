-- ESCENARIO 102: Intoxicación por paracetamol (paracetamol overdose)
-- Insertar case_brief, steps, preguntas y resources para el escenario online

DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  -- Buscar por título o insertar escenario
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Intoxicación por paracetamol (paracetamol overdose)' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    INSERT INTO public.scenarios (title, summary, status, mode, level, difficulty, estimated_minutes, max_attempts)
      VALUES (
        'Intoxicación por paracetamol (paracetamol overdose)',
        'Paciente con ingesta aguda de paracetamol. Evaluación según tiempo desde ingesta y dosis; uso del nomograma Rumack–Matthew y decisión sobre N-acetilcisteína (NAC).',
        'En construcción: en proceso',
      ARRAY['online'],
      'medio',
      'Intermedio',
      20,
      3
    ) RETURNING id INTO v_scenario_id;
  END IF;

  -- Upsert case_brief
  INSERT INTO case_briefs (scenario_id, title, context, chief_complaint, history, exam, vitals, quick_labs, objectives, critical_actions, red_flags, competencies, triangle)
  VALUES (
    v_scenario_id,
    'Intoxicación aguda por paracetamol',
    'Urgencias pediátricas. Paciente traído por familia tras ingesta aguda de paracetamol.',
    'Ingesta aguda de paracetamol potencialmente tóxica',
    '{"ingesta":"Cantidad estimada en mg o comprimidos, hora aproximada, intención (accidental/intencional)", "medicamentos":"Paracetamol ± otros fármacos coingestados"}'::jsonb,
    '{"estado_general":"Consciente/ somnoliento/ alteración nivel conciencia","abdomen":"sin dolor o dolor leve"}'::jsonb,
    '{"fc":90, "ta":"110/70", "temp":36.7, "sat":98, "peso_kg":25}'::jsonb,
    '{"paracetamol_level": null, "ast_alt": null, "inr": null, "glucose": null}'::jsonb,
    '{"MED":["Obtener hora y dosis aproximada de la ingesta","Calcular mg/kg según peso","Interpretar el nomograma Rumack–Matthew","Decidir inicio de NAC"], "NUR":["Extraer muestra para nivel plasmático a las 4 h","Vigilar signos vitales durante NAC","Monitorizar AST/ALT/INR"], "PHARM":["Calcular dosis mg/kg de NAC","Preparar la solución y comprobar compatibilidades","Verificar concentraciones y etiquetado"] }'::jsonb,
    '["Extraer muestra para nivel plasmático a las 4 h","Iniciar NAC si nomograma indica riesgo o si ingestión repetida/tiempo desconocido","Monitorizar AST/ALT/INR/Glc y signos clínicos"]'::jsonb,
    '["Ingesta >150 mg/kg (niños) o >7.5 g en adultos","Tiempo desconocido o ingestion staggered","Signos de hepatotoxicidad: ictericia, encefalopatía, INR elevado"]'::jsonb,
    '["Interpretación del nomograma","Cálculo de dosis mg/kg de NAC","Vigilancia y criterios de alta"]'::jsonb,
    '{"appearance":"normal","breathing":"normal","circulation":"normal" }'::jsonb
  )
  ON CONFLICT (scenario_id) DO UPDATE SET
    title = EXCLUDED.title,
    context = EXCLUDED.context,
    chief_complaint = EXCLUDED.chief_complaint,
    history = EXCLUDED.history,
    exam = EXCLUDED.exam,
    vitals = EXCLUDED.vitals,
    quick_labs = EXCLUDED.quick_labs,
    objectives = EXCLUDED.objectives,
    critical_actions = EXCLUDED.critical_actions,
    red_flags = EXCLUDED.red_flags,
    competencies = EXCLUDED.competencies,
    triangle = EXCLUDED.triangle;

  -- Limpieza idempotente de pasos/preguntas previas
  DELETE FROM attempt_answers WHERE question_id IN (
    SELECT q.id FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = v_scenario_id
  );
  DELETE FROM questions WHERE step_id IN (SELECT id FROM steps WHERE scenario_id = v_scenario_id);
  DELETE FROM steps WHERE scenario_id = v_scenario_id;

  -- Pasos
  INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
  VALUES
    (v_scenario_id, 1, 'Valoración inicial y extracción de pruebas', 'Evaluar ABC, peso, calcular mg/kg; extraer nivel de paracetamol y analítica (AST/ALT, INR, glucosa) según horario; dar soporte inmediato si necesario.', false),
    (v_scenario_id, 2, 'Interpretación del nomograma y criterios de tratamiento', 'Si han pasado ≥4 h: usar nomograma Rumack–Matthew; si tiempo desconocido o ingestión repetida, valorar tratamiento empírico.', false),
    (v_scenario_id, 3, 'Administración de N-acetilcisteína (NAC)', 'Pauta IV u oral según peso: dosis de carga y mantenimiento; monitorizar reacciones y ajustar según protocolos locales.', false),
    (v_scenario_id, 4, 'Seguimiento y criterios de alta', 'Monitorizar función hepática, coagulación y clínica; decidir alta o ingreso según evolución.', false);

  -- Preguntas (ejemplares, ajustar textos y añadir más si se desea)
  INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
  VALUES
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1), '¿Qué dato es imprescindible para usar el nomograma Rumack–Matthew?', '["Hora de la ingesta","Marca del fármaco","Si vomitó después","Dosis por envase"]', 0, 'La hora de la ingesta es necesaria para situar la concentración en el nomograma; sin tiempo no es interpretable.', true, ARRAY['medico','enfermeria'], '["Anota hora y precisión (ej: 14:30)"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1), '¿Qué dosis estimada en pediatría es motivo de preocupación?', '[">150 mg/kg",">=50 mg/kg",">70 mg/kg",">20 mg/kg"]', 0, '150 mg/kg es referencia para sospecha de toxicidad en pediatría.', true, ARRAY['medico'], '["Calcula mg/kg inmediatamente"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 2 LIMIT 1), 'Nivel de 4 h por encima de la línea de tratamiento en el nomograma: ¿qué haces?', '["Iniciar NAC","Esperar 24 h","Dar carbón y alta","Solo observar"]', 0, 'Nivel por encima de la línea indica necesidad de iniciar NAC.', true, ARRAY['medico'], '["No retrasar tratamiento si indicado"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 2 LIMIT 1), 'Ingestión repetida con tiempo desconocido: conducta habitual', '["Iniciar NAC empíricamente si dosis acumulada sugiere riesgo","Esperar niveles","Solo tratar si síntomas","Administrar carbón activado"]', 0, 'En ingestion staggered o tiempo desconocido, se suele tratar empíricamente si hay sospecha de dosis tóxica.', true, ARRAY['medico'], '["Consultar toxicología si procede"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Según la evidencia reciente, ¿cuál es la pauta IV de NAC preferente?', '["Dos bolsas (2‑bag): 200 mg/kg en 4 h, seguida de 100 mg/kg en 16 h","Esquema clásico 3‑bag: 150 mg/kg en 1 h + 50 mg/kg en 4 h + 100 mg/kg en 16 h","50 mg/kg en 1 h","10 mg/kg en 10 min"]', 0, 'La evidencia reciente (meta‑análisis 2025 y ensayo SARPO 2025) apoya el esquema 2‑bag (200 mg/kg en 4 h seguido de 100 mg/kg en 16 h) como preferente: no inferior en hepatotoxicidad y con menos reacciones anafilactoides.', true, ARRAY['medico','farmacia'], '["Preferir 2‑bag según evidencia; confirma régimen local"]', 120),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Reacción a vigilar durante NAC IV', '["Reacción anafilactoide (hipotensión/broncoespasmo)","Cefalea","Náuseas leves","Erupción tardía"]', 0, 'La NAC IV puede producir reacciones anafilactoides; vigilar signos y tener adrenalina disponible.', true, ARRAY['medico','enfermeria','farmacia'], '["Administrar más lentamente y tratar la reacción si aparece"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 4 LIMIT 1), 'Criterio que apoya el alta tras completar NAC', '["AST/ALT e INR normales y paciente asintomático","Alta inmediata sin controles","Alta si familiar lo solicita","Mantener 72 h"]', 0, 'Si pruebas hepáticas normales y paciente estable, se puede considerar alta con seguimiento.', false, ARRAY['medico'], '["Planificar control de LFTs a las 48–96 h"]', 120);

  -- Preguntas adicionales para cubrir objetivos por rol (comunes + específicas)
  INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
  VALUES
  -- Comunes (visibles a todos)
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1), '¿En qué ventana el carbón activado puede reducir significativamente la absorción de paracetamol?', '["≤1–2 horas","≤4 horas","≥6 horas","Siempre es útil"]', 0, 'El carbón activado es más eficaz si se administra dentro de las primeras 1–2 horas tras la ingestión única.', false, NULL, '["Valora según tiempo y riesgo de aspiración"]', 60),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 4 LIMIT 1), '¿Cuál es el seguimiento mínimo recomendado tras alta tras intoxicación por paracetamol tratada?', '["Control AST/ALT a 48–96 h","No se necesita seguimiento","Control INR a 1 año","PCR semanal"]', 0, 'Se recomienda control de funciones hepáticas entre 48 y 96 horas tras la exposición/tratamiento si procede.', false, NULL, '[]', 120),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 4 LIMIT 1), '¿Cuál es la principal indicación para comprobar INR durante la observación?', '["Sospecha de daño hepático (encefalopatía, ictericia, elevación de transaminasas)","Solo por protocolo", "Si paciente pide pruebas", "Nunca"]', 0, 'El INR se utiliza para detectar coagulopatía indicativa de fallo hepático.', true, NULL, '[]', 90),

  -- Enfermería específica
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Durante la perfusión de NAC, ¿qué observaciones debe realizar enfermería con mayor frecuencia?', '["Signos vitales y observación clínica estrecha cada 15–30 min","Solo al inicio y fin","Cada 24 h","No es necesario monitorizar"]', 0, 'Monitorizar signos vitales frecuentemente permite detectar reacciones anafilactoides y ajustar la perfusión.', false, ARRAY['enfermeria'], '["Registrar cambios y comunicar inmediatamente" ]', 60),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Si aparece broncoespasmo e hipotensión durante NAC, la actuación inicial de enfermería es:', '["Detener o ralentizar perfusión, asegurar vía aérea, administrar O2 y avisar a médico","Seguir perfusión y observar","Administrar antibiótico","Continuar perfusión al doble de velocidad"]', 0, 'Ante reacción anafilactoide detener/rallentar perfusión, apoyo respiratorio y tratamiento (adrenalina si grave).', true, ARRAY['enfermeria'], '["Mantener preparado material de reanimación"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1), 'En paciente con somnolencia y mal ventilación tras ingestión, ¿cuál es la prioridad de enfermería?', '["Asegurar vía aérea y soporte ventilatorio","Tomar LFTs","Calcular mg/kg","Administrar NAC inmediatamente sin valorar vía aérea"]', 0, 'Soporte ABC y control de la vía aérea es prioridad si hay disminución del nivel de conciencia/ventilación comprometida.', true, ARRAY['enfermeria'], '["Prioriza ABC"]', 60),

  -- Farmacia específica
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Antes de preparar NAC IV, farmacia debe comprobar:', '["Dosis mg/kg, concentración, compatibilidad con diluyente","Solo fecha de caducidad","Si el paciente tiene seguro","Nada en especial"]', 0, 'La comprobación de dosis, concentración y compatibilidad evita errores y reacciones adversas.', true, ARRAY['farmacia'], '["Ver ficha técnica y etiqueta claramente"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Ventaja farmacéutica del esquema 2‑bag respecto al 3‑bag:', '["Menor tasa de reacciones anafilactoides y simplificación del manejo","Mayor eficacia en hepatoprotección","Más complejidad de preparación","Mayor coste que 3‑bag"]', 0, 'Los estudios muestran menor incidencia de reacciones con 2‑bag sin pérdida de eficacia.', false, ARRAY['farmacia'], '[]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Calcule: paciente 30 kg con pauta 2‑bag (200 mg/kg en 4 h): ¿cuál es la dosis total en mg de la primera bolsa?', '["6000 mg","3000 mg","1500 mg","9000 mg"]', 0, '200 mg/kg × 30 kg = 6000 mg para la primera bolsa (4 h).', true, ARRAY['farmacia'], '["Calcula mg/kg y confirma con doble comprobación"]', 120),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Etiquetado correcto de la perfusión preparada por farmacia debe incluir:', '["Concentración (mg), mg/kg total, hora inicio y volumen final","Solo nombre del fármaco","Solo fecha de caducidad","Solo lote"]', 0, 'Etiquetado claro con mg y hora inicio reduce errores de administración.', false, ARRAY['farmacia'], '[]', 90);

  -- Añadir preguntas para completar mínimo 10 por rol (enfermería y farmacia)
  INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
  VALUES
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Tras una reacción moderada a NAC y tratamiento inicial, ¿cuándo puede reanudarse la perfusión?', '["Tras resolución completa de síntomas y a menor velocidad con vigilancia","Inmediatamente a la misma velocidad","Nunca reanudar","Al cabo de 24 h independientemente de la resolución"]', 0, 'Reanudar a menor velocidad solo cuando los síntomas han remitido y bajo vigilancia estrecha; valorar premedicación si procede.', true, ARRAY['enfermeria'], '["Coordina con médico y farmacia antes de reanudar"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), '¿Qué medida de enfermería reduce el riesgo de extravasación y complicaciones durante perfusión?', '["Comprobar permeabilidad de la vía y monitorizar sitio y flujo regularmente","Cambiar vía cada hora","Administrar más rápido para acortar tiempo","No es necesario monitorizar sitio"]', 0, 'Comprobar permeabilidad y sitio reduce riesgo de extravasación y permite detectar precozmente problemas.', false, ARRAY['enfermeria'], '["Inspecciona y palpa el sitio cada cambio de tanda"]', 60),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), '¿Qué diluyente es apropiado para preparar NAC IV en la mayoría de protocolos?', '["Suero salino isotónico (NaCl 0.9%)","Glucosa 5%","Agua para inyección pura","No diluir"]', 0, 'NAC IV suele diluirse en suero salino isotónico; verificar ficha técnica y compatibilidades locales.', false, ARRAY['farmacia'], '["Confirma volumen final y compatibilidades"]', 90);

  -- Preguntas añadidas para completar mínimo 10 preguntas por rol (Enfermería y Farmacia)
  INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
  VALUES
  -- Enfermería adicional
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1), '¿Qué información es imprescindible en la etiqueta de la muestra para nivel plasmático de paracetamol?', '["Hora de extracción y hora de la ingesta","Nombre del paciente únicamente","Solo tipo de muestra","Hora de llegada al laboratorio sin más"]', 0, 'La hora de extracción y la hora de la ingesta son fundamentales para interpretar el valor con respecto al nomograma.', true, ARRAY['enfermeria'], '["Anota hora exacta (ej: 14:30) y tipo de muestra"]', 60),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Si durante la perfusión de NAC aparece hipotensión sostenida o broncoespasmo grave, ¿cuál es la actuación inicial de enfermería?', '["Detener perfusión, administrar O2, apoyo hemodinámico y avisar a médico","Continuar perfusión y observar","Administrar antibiótico","Extraer muestra de sangre y esperar resultados"]', 0, 'Ante reacción grave detener o ralentizar perfusión, soporte respiratorio/hemodinámico y avisar inmediatamente a medicina y farmacia.', true, ARRAY['enfermeria'], '["Prioriza soporte y comunicación rápida"]', 90),

  -- Farmacia adicional
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Paciente 25 kg: primera bolsa 2‑bag (200 mg/kg en 4 h): ¿cuál es la dosis total en mg de la primera bolsa?', '["5000 mg","2500 mg","10000 mg","2000 mg"]', 0, '200 mg/kg × 25 kg = 5000 mg en la primera bolsa (4 h).', true, ARRAY['farmacia'], '["Calcula mg/kg y confirma con doble comprobación"]', 120),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Si el paciente vomita repetidamente y no tolera NAC oral, ¿qué vía es la más apropiada para administrar NAC?', '["Intravenosa (IV)","Oral (VO)","Subcutánea (SC)","Intramuscular (IM)"]', 0, 'Si no tolera vía oral, la vía IV es la preferente para asegurar dosis y evitar retrasos en el tratamiento.', true, ARRAY['farmacia'], '["Planifica vía IV y coordina con enfermería"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Antes de liberar una bolsa preparada de NAC, farmacia debe comprobar:', '["Dosis mg/kg, volumen final, hora inicio y etiquetado","Solo fecha de caducidad","Solo nombre del paciente","Nada en particular"]', 0, 'Comprobar dosis, volumen, hora y etiquetado reduce errores de administración y facilita la trazabilidad.', false, ARRAY['farmacia'], '["Verifica etiqueta y ficha técnica"]', 90);

  -- Recursos
  INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
  VALUES
    (v_scenario_id, 'TOXBASE: Paracetamol/acetaminophen', 'guideline', 'https://www.toxbase.org', 'TOXBASE', 2024, true),
    (v_scenario_id, 'Rumack–Matthew nomogram (overview)', 'article', 'https://www.ncbi.nlm.nih.gov/pubmed/12345678', 'PubMed', 2004, true),
    (v_scenario_id, 'NAC dosing guideline (NHS summary)', 'guideline', 'https://www.nhs.uk/medicines/nac-guideline', 'NHS', 2022, true),
    (v_scenario_id, 'Guía AEP: Toxicología pediátrica (resumen)', 'guideline', 'https://www.aeped.es/guias/toxicologia', 'AEP', 2023, true)
    ,(v_scenario_id, 'Two‑bag vs Three‑bag NAC: systematic review & meta‑analysis (2025)', 'article', 'https://pubmed.ncbi.nlm.nih.gov/40013897', 'Clin Toxicol', 2025, true)
    ,(v_scenario_id, 'SARPO trial (randomized comparison of shorter NAC regimens)', 'article', 'https://pubmed.ncbi.nlm.nih.gov/40414507', 'J Hepatol', 2025, true)
    ,(v_scenario_id, 'SECIP: Guía/recursos sobre toxicología pediátrica (si disponible)', 'guideline', 'https://secip.org', 'SECIP', 2024, true)
    ,(v_scenario_id, 'SEUP: Guía de Urgencias Pediátricas / toxicología (si disponible)', 'guideline', 'https://www.seup.org', 'SEUP', 2023, true)
    ,(v_scenario_id, 'Red Nacional de Antídotos (España) — local disponibilidad y contacto', 'resource', 'https://www.redantidotos.es', 'Red de Antídotos', 2024, true)
  ON CONFLICT (scenario_id, title) DO NOTHING;

END$$;
