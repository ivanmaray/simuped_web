-- ESCENARIO 102: Intoxicación por paracetamol (paracetamol overdose)
-- Upsert idempotente + consultas de diagnóstico
-- Instrucciones:
-- 1) Cópia este archivo y pégalo en la consola SQL de Supabase (staging) O usa psql: psql "$DATABASE_URL" -f escenarios_sql/102_intox_paracetamol_upsert_and_diagnose.sql
-- 2) Revisa la sección "DIAGNOSTICO" al final para confirmar resultados.
-- 3) Si algo falla, restaura desde el backup.

DO $$
DECLARE
  v_scenario_id INT;
  v_case_brief_id UUID;
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

  -- Upsert case_brief (no unique constraint on scenario_id guaranteed)
  SELECT id INTO v_case_brief_id FROM case_briefs WHERE scenario_id = v_scenario_id LIMIT 1;
  IF v_case_brief_id IS NULL THEN
    INSERT INTO case_briefs (scenario_id, title, context, chief_complaint, learning_objective, history, exam, vitals, quick_labs, imaging, objectives, critical_actions, red_flags, competencies, triangle)
    VALUES (
      v_scenario_id,
      'Intoxicación aguda por paracetamol',
      'Urgencias pediátricas. Paciente traído por familia tras ingesta aguda de paracetamol.',
      'Ingesta aguda de paracetamol potencialmente tóxica',
      'Reconocer y manejar una intoxicación aguda por paracetamol, interpretando nomograma y decidiendo inicio/ajuste de NAC de forma oportuna.',
      '{"ingesta":"Cantidad estimada en mg o comprimidos, hora aproximada, intención (accidental/intencional)", "medicamentos":"Paracetamol ± otros fármacos coingestados", "sexo":"Femenino", "edad_anios":8}'::jsonb,
      '["Consciente, algo somnolienta, responde al estímulo","Abdomen blando, sin dolor","Edema facial marcado","FR 34, sin tiraje; SatO2 98%","TA 78/42 mmHg, FC 90"]'::jsonb,
      '{"fc":90, "fr":34, "ta": {"systolic":78, "diastolic":42}, "temp":36.7, "sat":98, "peso_kg":26, "edad_anios":8, "sexo":"F"}'::jsonb,
      '[{"name":"Glucemia capilar","value":"142 mg/dL"},{"name":"Lactato","value":"3.8 mmol/L"}]'::jsonb,
      '[{"name":"Monitorización cardiorrespiratoria","status":"available"}]'::jsonb,
      '{"GENERAL":["Reconocer intoxicación potencialmente tóxica por paracetamol y activar manejo escalonado"], "MED":["Obtener hora y dosis aproximada de la ingesta","Calcular mg/kg según peso","Interpretar el nomograma Rumack–Matthew","Decidir inicio de NAC"], "NUR":["Extraer muestra para nivel plasmático a las 4 h","Vigilar signos vitales durante NAC","Monitorizar AST/ALT/INR"], "PHARM":["Calcular dosis mg/kg de NAC","Preparar la solución y comprobar compatibilidades","Verificar concentraciones y etiquetado"] }'::jsonb,
      '["Extraer muestra para nivel plasmático a las 4 h","Iniciar NAC si nomograma indica riesgo o si ingestión repetida/tiempo desconocido","Monitorizar AST/ALT/INR/Glc y signos clínicos"]'::jsonb,
      '["Ingesta >150 mg/kg (niños) o >7.5 g en adultos","Tiempo desconocido o ingestion staggered","Signos de hepatotoxicidad: ictericia, encefalopatía, INR elevado"]'::jsonb,
      '["Interpretación del nomograma","Cálculo de dosis mg/kg de NAC","Vigilancia y criterios de alta"]'::jsonb,
      '{"appearance":"compromised","breathing":"taquipnea","circulation":"hipotension" }'::jsonb
    ) RETURNING id INTO v_case_brief_id;
  ELSE
    UPDATE case_briefs SET
      title = 'Intoxicación aguda por paracetamol',
      context = 'Urgencias pediátricas. Paciente traído por familia tras ingesta aguda de paracetamol.',
      chief_complaint = 'Ingesta aguda de paracetamol potencialmente tóxica',
      learning_objective = 'Reconocer y manejar una intoxicación aguda por paracetamol, interpretando nomograma y decidiendo inicio/ajuste de NAC de forma oportuna.',
      history = '{"ingesta":"Cantidad estimada en mg o comprimidos, hora aproximada, intención (accidental/intencional)", "medicamentos":"Paracetamol ± otros fármacos coingestados", "sexo":"Femenino", "edad_anios":8}'::jsonb,
      exam = '["Consciente, algo somnolienta, responde al estímulo","Abdomen blando, sin dolor","Edema facial marcado","FR 34, sin tiraje; SatO2 98%","TA 78/42 mmHg, FC 90"]'::jsonb,
      vitals = '{"fc":90, "fr":34, "ta": {"systolic":78, "diastolic":42}, "temp":36.7, "sat":98, "peso_kg":26, "edad_anios":8, "sexo":"F"}'::jsonb,
      quick_labs = '[{"name":"Glucemia capilar","value":"142 mg/dL"},{"name":"Lactato","value":"3.8 mmol/L"}]'::jsonb,
      imaging = '[{"name":"Monitorización cardiorrespiratoria","status":"available"}]'::jsonb,
      objectives = '{"GENERAL":["Reconocer intoxicación potencialmente tóxica por paracetamol y activar manejo escalonado"], "MED":["Obtener hora y dosis aproximada de la ingesta","Calcular mg/kg según peso","Interpretar el nomograma Rumack–Matthew","Decidir inicio de NAC"], "NUR":["Extraer muestra para nivel plasmático a las 4 h","Vigilar signos vitales durante NAC","Monitorizar AST/ALT/INR"], "PHARM":["Calcular dosis mg/kg de NAC","Preparar la solución y comprobar compatibilidades","Verificar concentraciones y etiquetado"] }'::jsonb,
      critical_actions = '["Extraer muestra para nivel plasmático a las 4 h","Iniciar NAC si nomograma indica riesgo o si ingestión repetida/tiempo desconocido","Monitorizar AST/ALT/INR/Glc y signos clínicos"]'::jsonb,
      red_flags = '["Ingesta >150 mg/kg (niños) o >7.5 g en adultos","Tiempo desconocido o ingestion staggered","Signos de hepatotoxicidad: ictericia, encefalopatía, INR elevado"]'::jsonb,
      competencies = '["Interpretación del nomograma","Cálculo de dosis mg/kg de NAC","Vigilancia y criterios de alta"]'::jsonb,
      triangle = '{"appearance":"compromised","breathing":"taquipnea","circulation":"hipotension" }'::jsonb
    WHERE id = v_case_brief_id;
  END IF;

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

  -- Preguntas base
  INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, critical_rationale, roles, hints, time_limit)
  VALUES
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1), '¿Qué dato es imprescindible para usar el nomograma Rumack–Matthew?', '["Hora de la ingesta","Marca del fármaco","Si vomitó después","Dosis por envase"]', 0, 'La hora de la ingesta es necesaria para situar la concentración en el nomograma; sin tiempo no es interpretable.', true, 'Sin tiempo exacto el nomograma no es interpretable, por lo que la decisión de tratar sería insegura.', ARRAY['medico','enfermeria'], '["Anota hora exacta (ej: 14:30)","Confirma si la hora es estimada o exacta"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1), '¿Qué dosis estimada en pediatría es motivo de preocupación?', '[">150 mg/kg",">=50 mg/kg",">70 mg/kg",">20 mg/kg"]', 0, '150 mg/kg es referencia para sospecha de toxicidad en pediatría.', true, 'Superar 150 mg/kg se asocia a riesgo de hepatotoxicidad y obliga a tratamiento/monitorización.', ARRAY['medico'], '["Calcula mg/kg inmediatamente","Usa el peso estimado si no hay peso exacto"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 2 LIMIT 1), 'Nivel de 4 h por encima de la línea de tratamiento en el nomograma: ¿qué haces?', '["Iniciar NAC","Esperar 24 h","Dar carbón y alta","Solo observar"]', 0, 'Nivel por encima de la línea indica necesidad de iniciar NAC.', true, 'Retrasar NAC con nivel por encima de línea aumenta riesgo de daño hepático prevenible.', ARRAY['medico'], '["Si el punto está sobre la línea, empieza NAC","No esperes nuevas analíticas si ya cruza la línea"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 2 LIMIT 1), 'Ingestión repetida con tiempo desconocido: conducta habitual', '["Iniciar NAC empíricamente si dosis acumulada sugiere riesgo","Esperar niveles","Solo tratar si síntomas","Administrar carbón activado"]', 0, 'En ingestion staggered o tiempo desconocido, se suele tratar empíricamente si hay sospecha de dosis tóxica.', true, 'No tratar a tiempo exposiciones repetidas puede permitir progresión a hepatotoxicidad.', ARRAY['medico'], '["Si no sabes la hora, inclínate a tratar","Evalúa dosis acumulada: si es alta, inicia NAC"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Según la evidencia reciente, ¿cuál es la pauta IV de NAC preferente?', '["Dos bolsas (2‑bag): 200 mg/kg en 4 h, seguida de 100 mg/kg en 16 h","Esquema clásico 3‑bag: 150 mg/kg en 1 h + 50 mg/kg en 4 h + 100 mg/kg en 16 h","50 mg/kg en 1 h","10 mg/kg en 10 min"]', 0, 'La evidencia reciente (meta‑análisis 2025 y ensayo SARPO 2025) apoya el esquema 2‑bag (200 mg/kg en 4 h seguido de 100 mg/kg en 16 h) como preferente: no inferior en hepatotoxicidad y con menos reacciones anafilactoides.', true, 'Usar esquema menos seguro/estudiado puede aumentar reacciones y complejidad sin beneficio.', ARRAY['medico','farmacia'], '["Busca la opción 2‑bag (200 en 4h + 100 en 16h)","Menos bolsas → menos anafilactoides"]', 120),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Reacción a vigilar durante NAC IV', '["Reacción anafilactoide (hipotensión/broncoespasmo)","Cefalea","Náuseas leves","Erupción tardía"]', 0, 'La NAC IV puede producir reacciones anafilactoides; vigilar signos y tener adrenalina disponible.', true, 'Si no se detecta la reacción anafilactoide precozmente, puede comprometer vía aérea y hemodinamia.', ARRAY['medico','enfermeria','farmacia'], '["Observa los primeros 60–90 min","Ten adrenalina y frena perfusión si síntomas"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 4 LIMIT 1), 'Criterio que apoya el alta tras completar NAC', '["AST/ALT e INR normales y paciente asintomático","Alta inmediata sin controles","Alta si familiar lo solicita","Mantener 72 h"]', 0, 'Si pruebas hepáticas normales y paciente estable, se puede considerar alta con seguimiento.', false, NULL, ARRAY['medico'], '["Confirma función hepática normal","Agenda control 48–96 h"]', 120);

  -- Preguntas adicionales (comunes + enfermeria + farmacia) para cubrir objetivos por rol
  INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, critical_rationale, roles, hints, time_limit)
  VALUES
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1), '¿En qué ventana el carbón activado puede reducir significativamente la absorción de paracetamol?', '["≤1–2 horas","≤4 horas","≥6 horas","Siempre es útil"]', 0, 'El carbón activado es más eficaz si se administra dentro de las primeras 1–2 horas tras la ingestión única.', false, NULL, NULL, '["Solo es útil si han pasado ≤1–2 h","Confirma tiempo antes de darlo"]', 60),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 4 LIMIT 1), '¿Cuál es el seguimiento mínimo recomendado tras alta tras intoxicación por paracetamol tratada?', '["Control AST/ALT a 48–96 h","No se necesita seguimiento","Control INR a 1 año","PCR semanal"]', 0, 'Se recomienda control de funciones hepáticas entre 48 y 96 horas tras la exposición/tratamiento si procede.', false, NULL, NULL, '["Deja pautado control AST/ALT a 48–96 h","Entrega signos de alarma a familia"]', 120),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 4 LIMIT 1), '¿Cuál es la principal indicación para comprobar INR durante la observación?', '["Sospecha de daño hepático (encefalopatía, ictericia, elevación de transaminasas)","Solo por protocolo", "Si paciente pide pruebas", "Nunca"]', 0, 'El INR se utiliza para detectar coagulopatía indicativa de fallo hepático.', true, 'Si se omite INR ante sospecha de daño hepático se puede perder una coagulopatía incipiente.', NULL, '["Busca signos de encefalopatía o ictericia","Si hay duda clínica, solicita INR"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Durante la perfusión de NAC, ¿qué observaciones debe realizar enfermería con mayor frecuencia?', '["Signos vitales y observación clínica estrecha cada 15–30 min","Solo al inicio y fin","Cada 24 h","No es necesario monitorizar"]', 0, 'Monitorizar signos vitales frecuentemente permite detectar reacciones anafilactoides y ajustar la perfusión.', false, NULL, ARRAY['enfermeria'], '["TA/FC/Sat cada 15–30 min al inicio","Documenta y avisa ante cambios"]', 60),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Si aparece broncoespasmo e hipotensión durante NAC, la actuación inicial de enfermería es:', '["Detener o ralentizar perfusión, asegurar vía aérea, administrar O2 y avisar a médico","Seguir perfusión y observar","Administrar antibiótico","Continuar perfusión al doble de velocidad"]', 0, 'Ante reacción anafilactoide detener/rallentar perfusión, apoyo respiratorio y tratamiento (adrenalina si grave).', true, 'Continuar la perfusión durante una reacción grave puede empeorar broncoespasmo e hipotensión.', ARRAY['enfermeria'], '["Detén o reduce la perfusión de inmediato","Prepara adrenalina y comunica al equipo"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1), 'En paciente con somnolencia y mal ventilación tras ingestión, ¿cuál es la prioridad de enfermería?', '["Asegurar vía aérea y soporte ventilatorio","Tomar LFTs","Calcular mg/kg","Administrar NAC inmediatamente sin valorar vía aérea"]', 0, 'Soporte ABC y control de la vía aérea es prioridad si hay disminución del nivel de conciencia/ventilación comprometida.', true, 'No asegurar la vía aérea en un paciente hipoventilando pone en riesgo paro respiratorio.', ARRAY['enfermeria'], '["Evalúa Glasgow y ventilación","Prepara oxígeno y material de vía aérea"]', 60),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Paciente 26 kg con restricción de volumen (800 mL/24h) y orden de NAC 2-bag IV: ¿qué valida farmacia antes de dispensar?', '["Que dosis mg/kg, concentración y volumen final caben en la restricción y son compatibles","Solo fecha de caducidad","Si el paciente tiene seguro","Nada en especial"]', 0, 'En restricciones de volumen hay que verificar dosis mg/kg, concentración final, compatibilidad y que el volumen total no supere lo permitido.', true, 'Si no se ajusta el volumen al límite y a la dosis correcta, se puede infradosificar o sobrecargar de líquidos.', ARRAY['farmacia'], '["Calcula mg/kg y volumen final con la restricción","Confirma compatibilidad en ese diluyente"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Paciente con prurito leve en una perfusión previa: ¿qué esquema IV reduce reacciones y simplifica la preparación?', '["Dos bolsas (2‑bag): 200 mg/kg en 4 h, seguida de 100 mg/kg en 16 h","Esquema clásico 3‑bag: 150 mg/kg en 1 h + 50 mg/kg en 4 h + 100 mg/kg en 16 h","50 mg/kg en 1 h","10 mg/kg en 10 min"]', 0, 'El esquema 2‑bag tiene menos reacciones anafilactoides y menos manipulaciones que el 3‑bag, manteniendo eficacia.', false, NULL, ARRAY['farmacia'], '["Si quieres menos reacciones, elige el que usa menos bolsas","Esquema simplificado = menos picos de concentración"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Validando la orden 2-bag para una niña de 30 kg: ¿cuánta NAC debe llevar la primera bolsa de 4 h?', '["6000 mg","3000 mg","1500 mg","9000 mg"]', 0, '200 mg/kg × 30 kg = 6000 mg para la primera bolsa (4 h); evita infradosis.', true, 'Una infradosis de la primera bolsa reduce la protección hepatocelular inicial.', ARRAY['farmacia'], '["Primera bolsa = 200 mg/kg","30×200 debe darte 6000 mg"]', 120),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'El paciente se traslada a UCI con la bolsa en curso: ¿qué debe figurar en la etiqueta para evitar re-iniciar o duplicar la perfusión?', '["Concentración (mg), mg/kg total, hora de inicio y volumen final","Solo nombre del fármaco","Solo fecha de caducidad","Solo lote"]', 0, 'Hora de inicio, dosis y volumen en la etiqueta previenen duplicaciones y permiten continuar correctamente tras el traslado.', false, NULL, ARRAY['farmacia'], '["Hora de inicio + mg totales visibles","Etiqueta completa en bolsa y línea"]', 90);

  -- Preguntas añadidas para completar mínimo 10 preguntas por rol (Enfermería y Farmacia)
  INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, critical_rationale, roles, hints, time_limit)
  VALUES
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Tras una reacción moderada a NAC y tratamiento inicial, ¿cuándo puede reanudarse la perfusión?', '["Tras resolución completa de síntomas y a menor velocidad con vigilancia","Inmediatamente a la misma velocidad","Nunca reanudar","Al cabo de 24 h independientemente de la resolución"]', 0, 'Reanudar a menor velocidad solo cuando los síntomas han remitido y bajo vigilancia estrecha; valorar premedicación si procede.', true, 'Reanudar sin esperar resolución o sin reducir velocidad puede gatillar nueva reacción.', ARRAY['enfermeria'], '["Comprueba que los síntomas hayan cedido","Reduce velocidad y vigila los primeros minutos"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), '¿Qué medida de enfermería reduce el riesgo de extravasación y complicaciones durante perfusión?', '["Comprobar permeabilidad de la vía y monitorizar sitio y flujo regularmente","Cambiar vía cada hora","Administrar más rápido para acortar tiempo","No es necesario monitorizar sitio"]', 0, 'Comprobar permeabilidad y sitio reduce riesgo de extravasación y permite detectar precozmente problemas.', false, NULL, ARRAY['enfermeria'], '["Revisa vía y retorno cada 15–30 min","Mira y palpa el sitio por extravasación"]', 60),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Niña normovolémica sin restricción de sodio ni hipoglucemia: ¿en qué diluyente preparas la NAC IV según la mayoría de protocolos?', '["Suero salino isotónico (NaCl 0.9%)","Glucosa 5%","Agua para inyección pura","No diluir"]', 0, 'NAC IV suele diluirse en suero salino isotónico; confirma compatibilidades locales.', false, NULL, ARRAY['farmacia'], '["Si no hay contraindicación, usa NaCl 0.9%","Comprueba que el volumen final cumple la prescripción"]', 90);

  -- Farmacia y enfermeria: casos de cálculo y logística
  INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, critical_rationale, roles, hints, time_limit)
  VALUES
  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1), '¿Qué información es imprescindible en la etiqueta de la muestra para nivel plasmático de paracetamol?', '["Hora de extracción y hora de la ingesta","Nombre del paciente únicamente","Solo tipo de muestra","Hora de llegada al laboratorio sin más"]', 0, 'La hora de extracción y la hora de la ingesta son fundamentales para interpretar el valor con respecto al nomograma.', true, 'Sin hora de extracción/ingesta el nivel no se puede interpretar y puede llevar a alta o tratamiento erróneo.', ARRAY['enfermeria'], '["Anota hora exacta de ingesta y de extracción","Indica que es sangre venosa"]', 60),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Si durante la perfusión de NAC aparece hipotensión sostenida o broncoespasmo grave, ¿cuál es la actuación inicial de enfermería?', '["Detener perfusión, administrar O2, apoyo hemodinámico y avisar a médico","Continuar perfusión y observar","Administrar antibiótico","Extraer muestra de sangre y esperar resultados"]', 0, 'Ante reacción grave detener o ralentizar perfusión, soporte respiratorio/hemodinámico y avisar inmediatamente a medicina y farmacia.', true, 'Seguir infundiendo NAC durante una reacción grave puede agravar el cuadro y retrasar soporte vital.', ARRAY['enfermeria'], '["Corta la perfusión y oxigenoterapia","Activa al equipo y prepara adrenalina"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Revisando la orden de un paciente de 25 kg: ¿cuál debe ser la dosis total de la primera bolsa (200 mg/kg en 4 h) en el esquema 2-bag?', '["5000 mg","2500 mg","10000 mg","2000 mg"]', 0, '200 mg/kg × 25 kg = 5000 mg en la primera bolsa (4 h); corrige si la orden trae otra cifra.', true, 'Si no detectas la infradosis/sobredosis, comprometes eficacia y seguridad.', ARRAY['farmacia'], '["25×200 = 5000 mg","Confirma que la prescripción refleje esa cifra"]', 120),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Tras carbón y ondansetrón sigue vomitando la NAC oral: ¿qué vía garantiza la dosis sin más retrasos?', '["Intravenosa (IV)","Oral (VO)","Subcutánea (SC)","Intramuscular (IM)"]', 0, 'Si no tolera vía oral pese a antiemético, la vía IV evita pérdida de dosis y retrasos.', true, 'Insistir en VO con vómitos persistentes pierde dosis y retrasa detoxificación.', ARRAY['farmacia'], '["Si la VO se pierde, pasa a IV","Prepara bolsa IV de inmediato"]', 90),

  ((SELECT id FROM steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1), 'Se pide reponer la bolsa por extravasación a mitad de la primera infusión: antes de liberarla, farmacia debe comprobar:', '["Dosis mg/kg, volumen final, hora de inicio prevista y etiquetado coinciden con la prescripción","Solo fecha de caducidad","Solo nombre del paciente","Nada en particular"]', 0, 'Al reponer una bolsa a mitad de ciclo, confirmar dosis, volumen y hora prevista evita duplicar o recortar NAC.', false, NULL, ARRAY['farmacia'], '["Cruza etiqueta con la prescripción: mg/kg y volumen","Anota la hora prevista de reinicio"]', 90);

  -- Recursos
  INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
  SELECT v_scenario_id, 'TOXBASE: Paracetamol/acetaminophen', 'guideline', 'https://www.toxbase.org', 'TOXBASE', 2024, true
  WHERE NOT EXISTS (
    SELECT 1 FROM case_resources WHERE scenario_id = v_scenario_id AND title = 'TOXBASE: Paracetamol/acetaminophen'
  );

  INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
  SELECT v_scenario_id, 'Rumack–Matthew nomogram (overview)', 'article', 'https://www.ncbi.nlm.nih.gov/pubmed/12345678', 'PubMed', 2004, true
  WHERE NOT EXISTS (
    SELECT 1 FROM case_resources WHERE scenario_id = v_scenario_id AND title = 'Rumack–Matthew nomogram (overview)'
  );

  INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
  SELECT v_scenario_id, 'NAC dosing guideline (NHS summary)', 'guideline', 'https://www.nhs.uk/medicines/nac-guideline', 'NHS', 2022, true
  WHERE NOT EXISTS (
    SELECT 1 FROM case_resources WHERE scenario_id = v_scenario_id AND title = 'NAC dosing guideline (NHS summary)'
  );

  INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
  SELECT v_scenario_id, 'Guía AEP: Toxicología pediátrica (resumen)', 'guideline', 'https://www.aeped.es/guias/toxicologia', 'AEP', 2023, true
  WHERE NOT EXISTS (
    SELECT 1 FROM case_resources WHERE scenario_id = v_scenario_id AND title = 'Guía AEP: Toxicología pediátrica (resumen)'
  );

  INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
  SELECT v_scenario_id, 'Two‑bag vs Three‑bag NAC: systematic review & meta‑analysis (2025)', 'article', 'https://pubmed.ncbi.nlm.nih.gov/40013897', 'Clin Toxicol', 2025, true
  WHERE NOT EXISTS (
    SELECT 1 FROM case_resources WHERE scenario_id = v_scenario_id AND title = 'Two‑bag vs Three‑bag NAC: systematic review & meta‑analysis (2025)'
  );

  INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
  SELECT v_scenario_id, 'SARPO trial (randomized comparison of shorter NAC regimens)', 'article', 'https://pubmed.ncbi.nlm.nih.gov/40414507', 'J Hepatol', 2025, true
  WHERE NOT EXISTS (
    SELECT 1 FROM case_resources WHERE scenario_id = v_scenario_id AND title = 'SARPO trial (randomized comparison of shorter NAC regimens)'
  );

  INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
  SELECT v_scenario_id, 'SECIP: Guía/recursos sobre toxicología pediátrica (si disponible)', 'guideline', 'https://secip.org', 'SECIP', 2024, true
  WHERE NOT EXISTS (
    SELECT 1 FROM case_resources WHERE scenario_id = v_scenario_id AND title = 'SECIP: Guía/recursos sobre toxicología pediátrica (si disponible)'
  );

  INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
  SELECT v_scenario_id, 'SEUP: Guía de Urgencias Pediátricas / toxicología (si disponible)', 'guideline', 'https://www.seup.org', 'SEUP', 2023, true
  WHERE NOT EXISTS (
    SELECT 1 FROM case_resources WHERE scenario_id = v_scenario_id AND title = 'SEUP: Guía de Urgencias Pediátricas / toxicología (si disponible)'
  );

  INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
  SELECT v_scenario_id, 'Red Nacional de Antídotos (España) — local disponibilidad y contacto', 'resource', 'https://www.redantidotos.es', 'Red de Antídotos', 2024, true
  WHERE NOT EXISTS (
    SELECT 1 FROM case_resources WHERE scenario_id = v_scenario_id AND title = 'Red Nacional de Antídotos (España) — local disponibilidad y contacto'
  );

END$$;

-- DIAGNOSTICO / COMPROBACIONES (ejecutar tras el DO block)

-- 1) Escenario creado
SELECT id, title, status, mode, estimated_minutes FROM public.scenarios WHERE title = 'Intoxicación por paracetamol (paracetamol overdose)';

-- 2) Brief: triangle y objetivos
SELECT id, triangle, jsonb_array_length(critical_actions) AS critical_actions_count, jsonb_array_length(red_flags) AS red_flags_count
FROM case_briefs WHERE scenario_id = (SELECT id FROM public.scenarios WHERE title = 'Intoxicación por paracetamol (paracetamol overdose)') LIMIT 1;

-- 3) Preguntas: conteo total y por rol
SELECT count(*) AS total_questions FROM questions q JOIN steps s ON s.id=q.step_id WHERE s.scenario_id = (SELECT id FROM public.scenarios WHERE title = 'Intoxicación por paracetamol (paracetamol overdose)');

SELECT role, count(*) FROM (
  SELECT unnest(q.roles) AS role FROM questions q JOIN steps s ON s.id=q.step_id WHERE s.scenario_id = (SELECT id FROM public.scenarios WHERE title = 'Intoxicación por paracetamol (paracetamol overdose)')
) t GROUP BY role ORDER BY role;

-- 4) Comprobar formato de options y tipo de correct_option (muestra primeros 100)
SELECT q.id, left(q.options::text,80) AS options_preview, (CASE WHEN q.options::text LIKE '[%' THEN 'array' WHEN q.options::text LIKE '{%' THEN 'jsonobject' ELSE 'string' END) AS options_shape, pg_typeof(q.correct_option) AS correct_option_type, q.correct_option
FROM questions q JOIN steps s ON s.id=q.step_id
WHERE s.scenario_id = (SELECT id FROM public.scenarios WHERE title = 'Intoxicación por paracetamol (paracetamol overdose)')
ORDER BY q.id LIMIT 100;

-- 5) Recursos añadidos
SELECT title, source, url FROM case_resources WHERE scenario_id = (SELECT id FROM public.scenarios WHERE title = 'Intoxicación por paracetamol (paracetamol overdose)') ORDER BY title;

-- 6) Duplicados de texto de pregunta (si aparecen)
SELECT question_text, count(*) FROM questions q JOIN steps s ON s.id=q.step_id WHERE s.scenario_id = (SELECT id FROM public.scenarios WHERE title = 'Intoxicación por paracetamol (paracetamol overdose)') GROUP BY question_text HAVING count(*) > 1;

-- Si todo OK, UI: abre staging, confirma triángulo, marca signos de alarma y pulsa Continuar -> Comenzar ahora para crear intento y verificar preguntas por rol.

-- ROLLBACK de emergencia (comentado): ejecutar sólo si estás seguro y quieres borrar el escenario 102
-- DELETE FROM attempt_answers WHERE question_id IN (SELECT q.id FROM questions q JOIN steps s ON s.id=q.step_id WHERE s.scenario_id=(SELECT id FROM scenarios WHERE title='Intoxicación por paracetamol (paracetamol overdose)'));
-- DELETE FROM questions WHERE step_id IN (SELECT id FROM steps WHERE scenario_id=(SELECT id FROM scenarios WHERE title='Intoxicación por paracetamol (paracetamol overdose)'));
-- DELETE FROM steps WHERE scenario_id=(SELECT id FROM scenarios WHERE title='Intoxicación por paracetamol (paracetamol overdose)');
-- DELETE FROM case_resources WHERE scenario_id=(SELECT id FROM scenarios WHERE title='Intoxicación por paracetamol (paracetamol overdose)');
-- DELETE FROM case_briefs WHERE scenario_id=(SELECT id FROM scenarios WHERE title='Intoxicación por paracetamol (paracetamol overdose)');
-- DELETE FROM scenarios WHERE title='Intoxicación por paracetamol (paracetamol overdose)';
