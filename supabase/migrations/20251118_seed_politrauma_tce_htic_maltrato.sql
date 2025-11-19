-- Migration: Seed completo para escenario — Politrauma con TCE y HTIC (Sospecha de maltrato)
-- Fecha: 2025-11-18
-- Propósito: crear escenario, pasos, preguntas por rol y metadatos (checklist, instructor brief) de forma idempotente.
-- Nota: Ajusta nombres de columna si tu esquema difiere. Este script intenta ser tolerante pero puede requerir cambios menores.

DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  -- buscar escenario por título
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Politrauma: TCE con HTIC (sospecha de maltrato)' LIMIT 1;

  IF v_scenario_id IS NULL THEN
    -- Intentar insertar con columnas comunes; si no existen, intentar solo con title
    BEGIN
      INSERT INTO public.scenarios (title, description)
      VALUES (
        'Politrauma: TCE con HTIC (sospecha de maltrato)',
        'Caso pediátrico de politrauma con traumatismo encefalo craneano y sospecha de maltrato. Escenario orientado a manejo inicial de HTIC, protección de vía aérea, soporte hemodinámico y consideraciones forenses/protección infantil.'
      )
      RETURNING id INTO v_scenario_id;
    EXCEPTION WHEN undefined_column OR undefined_table THEN
      -- fallback: intentar insertar solo el título
      INSERT INTO public.scenarios (title)
      VALUES ('Politrauma: TCE con HTIC (sospecha de maltrato)')
      RETURNING id INTO v_scenario_id;
    END;
    RAISE NOTICE 'Escenario creado (id=%)', v_scenario_id;
  ELSE
    RAISE NOTICE 'Escenario ya existe (id=%)', v_scenario_id;
  END IF;
END $$;


-- Insertar pasos del escenario (idempotente)
DO $$
DECLARE
  v_scenario_id INT;
  v_step_count INT;
  v_step_id INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Politrauma: TCE con HTIC (sospecha de maltrato)' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario no encontrado; saliendo del bloque de pasos.';
    RETURN;
  END IF;

  IF to_regclass('public.steps') IS NOT NULL THEN
    -- Paso 1: Evaluación primaria (ABCDE) y protección de vía aérea
    SELECT COUNT(*) INTO v_step_count FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Evaluación primaria y protección de vía aérea';
    IF v_step_count = 0 THEN
      INSERT INTO public.steps (scenario_id, description, step_order)
      VALUES (
        v_scenario_id,
        'Evaluación primaria y protección de vía aérea',
        1
      ) RETURNING id INTO v_step_id;
    ELSE
      SELECT id INTO v_step_id FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Evaluación primaria y protección de vía aérea' LIMIT 1;
    END IF;

    -- Paso 2: Soporte hemodinámico y control de hemorragias
    SELECT COUNT(*) INTO v_step_count FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Soporte hemodinámico y control de hemorragias';
    IF v_step_count = 0 THEN
      INSERT INTO public.steps (scenario_id, description, step_order)
      VALUES (
        v_scenario_id,
        'Soporte hemodinámico y control de hemorragias',
        2
      );
    END IF;

    -- Paso 3: Manejo de HTIC y medidas neuroprotectoras
    SELECT COUNT(*) INTO v_step_count FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Manejo de HTIC y medidas neuroprotectoras';
    IF v_step_count = 0 THEN
      INSERT INTO public.steps (scenario_id, description, step_order)
      VALUES (
        v_scenario_id,
        'Manejo de HTIC y medidas neuroprotectoras',
        3
      );
    END IF;

    -- Paso 4: Forense / protección infantil
    SELECT COUNT(*) INTO v_step_count FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Evaluación forense y protección infantil';
    IF v_step_count = 0 THEN
      INSERT INTO public.steps (scenario_id, description, step_order)
      VALUES (
        v_scenario_id,
        'Evaluación forense y protección infantil',
        4
      );
    END IF;
  ELSE
    RAISE NOTICE 'Tabla public.steps no encontrada; omitiendo inserción de pasos.';
  END IF;
END $$;


-- Insertar preguntas (idempotente) — preguntas comunes y por rol
DO $$
DECLARE
  v_scenario_id INT;
  v_step_id INT;
  v_qcount INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Politrauma: TCE con HTIC (sospecha de maltrato)' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario no encontrado; saliendo del bloque de preguntas.';
    RETURN;
  END IF;

  IF to_regclass('public.questions') IS NULL THEN
    RAISE NOTICE 'Tabla public.questions no encontrada; omitiendo preguntas.';
    RETURN;
  END IF;

  -- localizar step_id para asociar preguntas (usar paso de evaluación primaria)
  SELECT id INTO v_step_id FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Evaluación primaria y protección de vía aérea' LIMIT 1;
  IF v_step_id IS NULL THEN
    RAISE NOTICE 'Paso inicial no encontrado; omitiendo inserción de preguntas.';
    RETURN;
  END IF;

  -- Preguntas comunes (4)

  -- Q1
  SELECT COUNT(*) INTO v_qcount FROM public.questions WHERE step_id = v_step_id AND question_text = '¿Cuál es el siguiente paso más apropiado si GCS = 8 y pupilas asimétricas?';
  IF v_qcount = 0 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES (
      v_step_id,
      '¿Cuál es el siguiente paso más apropiado si GCS = 8 y pupilas asimétricas?',
      '["Observación en sala general","Intubación con secuencia rápida y control de presión intracraneal","Administrar solo analgésicos","Enviar a radiografía de tórax"]'::jsonb,
      2,
      ARRAY['medico','enfermeria','anestesia']::text[],
      'GCS ≤ 8 y pupilas asimétricas indican compromiso neurológico; proteger la vía aérea y controlar PIC es prioritario.',
      true
    );
  END IF;

  -- Q2
  SELECT COUNT(*) INTO v_qcount FROM public.questions WHERE step_id = v_step_id AND question_text = '¿Cuál es la meta adecuada de PaCO2 en manejo de HTIC aguda?';
  IF v_qcount = 0 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES (
      v_step_id,
      '¿Cuál es la meta adecuada de PaCO2 en manejo de HTIC aguda?',
      '["25–30 mmHg siempre","35–40 mmHg (normocapnia)",">45 mmHg","No importa"]'::jsonb,
      2,
      ARRAY['medico','anestesia']::text[],
      'Mantener normocapnia (35–40 mmHg) para evitar aumento de PIC por hipercapnia; la hiperventilación solo como medida puente en herniación inminente.',
      true
    );
  END IF;

  -- Q3
  SELECT COUNT(*) INTO v_qcount FROM public.questions WHERE step_id = v_step_id AND question_text = 'Ante sospecha de maltrato infantil, ¿cuál es la acción prioritaria?';
  IF v_qcount = 0 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES (
      v_step_id,
      'Ante sospecha de maltrato infantil, ¿cuál es la acción prioritaria?',
      '["Interrogar a los cuidadores agresivamente","Asegurar protección del niño y notificar a servicios según protocolo","Registrar la información solo en notas personales","No hacer nada hasta confirmación por imagen"]'::jsonb,
      2,
      ARRAY['medico','enfermeria']::text[],
      'La protección del menor y la notificación son obligatorias; debe coordinarse con trabajo social y autoridades.',
      true
    );
  END IF;

  -- Q4
  SELECT COUNT(*) INTO v_qcount FROM public.questions WHERE step_id = v_step_id AND question_text = 'En un politrauma con riesgo de HTIC, ¿qué objetivo hemodinámico se persigue para perfusión cerebral?';
  IF v_qcount = 0 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES (
      v_step_id,
      'En un politrauma con riesgo de HTIC, ¿qué objetivo hemodinámico se persigue para perfusión cerebral?',
      '["PaCO2 baja y presión arterial baja","Preservar presión de perfusión cerebral manteniendo TA adecuada","Mantener TA baja para reducir sangrado","No tiene relevancia"]'::jsonb,
      2,
      ARRAY['medico']::text[],
      'Evitar hipotensión y preservar presión de perfusión cerebral es esencial; hipotensión agrava lesión secundaria.',
      true
    );
  END IF;

  -- Preguntas específicas para MEDICO (hasta 12 incluyendo comunes)
  IF (SELECT COUNT(*) FROM public.questions WHERE step_id = v_step_id AND roles @> ARRAY['medico']::text[]) < 12 THEN
    -- Insert medico-specific questions (attach to the evaluation step)
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES
      (v_step_id, '¿Cuál es la indicación neuroquirúrgica urgente en TCE pediátrico?', '["Hematoma con efecto de masa y midline shift","Cefalea leve","Náuseas aisladas","Equimosis sin déficit"]'::jsonb, 1, ARRAY['medico']::text[], 'Hematoma con efecto de masa requiere evacuación urgente.', true),
      (v_step_id, 'En un niño hipotenso con TCE, ¿qué acción priorizas?', '["Reanimación con cristaloides 20 ml/kg y valorar vasopresores","Limitar fluidos","Administrar diurético","Esperar a UCI"]'::jsonb, 1, ARRAY['medico']::text[], 'Mantener perfusión cerebral; 20 ml/kg pediátricos como bolo inicial.', true),
      (v_step_id, 'Cómo interpretarías anisocoria en este contexto?', '["Signo sugerente de lesión focal/herniación","Hallazgo benigno","Error de medición","Relacionado solo con intoxicación"]'::jsonb, 1, ARRAY['medico']::text[], 'Anisocoria sugiere lesión focal y posible herniación.', true),
      (v_step_id, 'Respecto a osmoterapia, ¿qué consideraciones son correctas?', '["Usar solución hipertónica o manitol según estado volemico y monitorizar sodio/diuresis","Administrar sin monitorización","Evitar siempre","Diluir en dextrosa"]'::jsonb, 1, ARRAY['medico']::text[], 'Osmoterapia requiere monitorización y elección según contexto.', true),
      (v_step_id, '¿Cuándo sería aceptable una hiperventilación controlada?', '["En deterioro agudo por herniación inminente como medida puente","Como medida prolongada","Nunca","Solo en sala general"]'::jsonb, 1, ARRAY['medico','anestesia']::text[], 'Hiperventilación temporalmente en herniación inminente.', true),
      (v_step_id, 'Qué factor empeora la perfusión cerebral en el TCE?', '["Hipotensión sistémica","Mantener normotermia","Corrección de hipoglucemia","Analgesia adecuada"]'::jsonb, 1, ARRAY['medico']::text[], 'Hipotensión empeora la perfusión y pronóstico.', true),
      (v_step_id, 'Qué documentación forense es esencial en sospecha de maltrato?', '["Fotografías timestamped y descripción objetiva","Solo registro verbal","No documentar","Borrar fotos"]'::jsonb, 1, ARRAY['medico','enfermeria']::text[], 'Documentación objetiva y timestamped es esencial para proceso legal.', true),
      (v_step_id, 'Prioridad si TC muestra contusión difusa con edema pero sin hematoma operable?', '["Manejo neurocrítico: osmoterapia, monitor ICP si disponible, soporte hemodinámico","Alta inmediata","Solo observación en sala general","Iniciar antibioterapia empírica"]'::jsonb, 1, ARRAY['medico']::text[], 'Contusión difusa con edema requiere manejo neurocrítico y considerar monitorización invasiva.', true);
  END IF;

  -- Preguntas para ENFERMERIA (añadir hasta 12 incluyendo comunes)
  IF (SELECT COUNT(*) FROM public.questions WHERE step_id = v_step_id AND roles @> ARRAY['enfermeria']::text[]) < 12 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES
      (v_step_id, '¿Cuál es la prioridad de enfermería en primeros minutos?', '["Asegurar IV/IO y monitorización","Lavar la herida y terminar","Administrar descongestivos","Llamar a la familia"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Acceso y monitorización son esenciales en politrauma.', true),
      (v_step_id, 'Señales tempranas de deterioro neurológico que la enfermería debe alertar', '["Disminución del GCS, cambio en respiración, nueva anisocoria","Dolor abdominal aislado","Queja subjetiva de dolor leve","Nada de lo anterior"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Vigilancia neurológica continua detecta deterioro temprano.', true),
      (v_step_id, 'Manejo de temperatura en TCE', '["Mantener normotermia y evitar fiebre","Permitir fiebre","Indiferente","Aplicar calor local"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'La fiebre empeora lesión cerebral secundaria; mantener normotermia.', true),
      (v_step_id, 'Si convulsiona, actuación inmediata', '["ABC, benzodiacepina IV/IM y protección de la vía aérea","Solo observación","Administrar diurético","Esperar al especialista"]'::jsonb, 1, ARRAY['enfermeria','medico']::text[], 'Control rápido de convulsiones es crítico para evitar hipoxia/HTIC.', true),
      (v_step_id, 'Preparación para traslado a UCI: acciones clave', '["Asegurar líneas, documentar y comunicar al receptor","Enviar sin documentación","No comunicar","Vaciar registros"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Preparación y comunicación adecuadas aseguran continuidad de cuidado.', true),
      (v_step_id, 'Monitoreo de líquidos cuando se usa manitol', '["Control de diuresis y balance hídrico","No monitorizar","Medir solo al final del turno","Administrar sin control"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Manitol requiere control de diuresis por riesgo de deshidratación/hipernatremia.', true),
      (v_step_id, 'Cómo documentar sospecha de maltrato', '["Registro objetivo de lesiones y notificación según protocolo","Registro subjetivo sin pruebas","No documentar","Ocultar información"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Documentación objetiva y notificación son obligatorias.', true),
      (v_step_id, 'Comunicación con la familia en sospecha de maltrato', '["Coordinada con trabajo social/psicología; no confrontar sin equipo","Enfrentar a los cuidadores inmediatamente","Ocultar información","Negarse a comunicar"]'::jsonb, 1, ARRAY['enfermeria']::text[], 'Una comunicación sensible y coordinada protege al niño y a la investigación.', true);
  END IF;

  -- Preguntas para ANESTESIA/NEUROANESTESIA/FARMACIA (añadir hasta 12)
  IF (SELECT COUNT(*) FROM public.questions WHERE step_id = v_step_id AND roles @> ARRAY['anestesia']::text[]) < 12 THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, roles, explanation, is_critical)
    VALUES
      (v_step_id, 'Consideraciones en RSI para TCE pediátrico', '["Elegir agentes que minimicen aumento de PIC y plan para vía difícil","Usar cualquier agente","No preoxigenar","Evitar analgesia"]'::jsonb, 1, ARRAY['anestesia']::text[], 'RSI con agentes hemodinámicamente estables y preoxigenación.', true),
      (v_step_id, 'Manejo de hipotensión durante inducción', '["Preparar vasopresores y líquidos; usar agentes estables","Ignorar hipotensión","Solo analgesia","Administrar diurético"]'::jsonb, 1, ARRAY['anestesia']::text[], 'Prevención y tratamiento de hipotensión evita isquemia cerebral secundaria.', true),
      (v_step_id, 'Uso de manitol vs solución hipertónica', '["Elegir según volemia, monitorizar Na y diuresis","Siempre manitol","Siempre hipertonica","Evitar ambos"]'::jsonb, 1, ARRAY['anestesia','medico']::text[], 'Decisión según estado volemico y protocolos locales.', true),
      (v_step_id, 'Interacciones farmacológicas críticas en TCE', '["Evitar fármacos que causen hipotensión o aumenten PIC; ajustar dosis pediátricas","No hay interacciones","Usar dosis adultas","Administrar sin control"]'::jsonb, 1, ARRAY['anestesia']::text[], 'Ajustar fármacos para mantener estabilidad hemodinámica y PIC.', true),
      (v_step_id, 'Preparación farmacéutica para convulsiones', '["Disponibilidad de benzodiacepinas y antiepilépticos de carga","No preparar nada","Solo sedación","Retirar medicamentos"]'::jsonb, 1, ARRAY['anestesia','farmacia']::text[], 'Tener medicamentos listos permite control rápido de convulsiones.', true),
      (v_step_id, 'Consideraciones para transfusión en politrauma pediátrico', '["Evaluar necesidad por pérdida y estado hemodinámico; transfundir según criterios","Transfundir siempre","Nunca transfundir","Transfundir al azar"]'::jsonb, 1, ARRAY['medico','farmacia']::text[], 'Transfusión según criterios y situación clínica.', true),
      (v_step_id, 'Documentación de medicamentos en contexto forense', '["Registrar dosis, hora, vía, respuesta y consentimiento cuando aplique","No documentar","Solo nota verbal","Borrar registros"]'::jsonb, 1, ARRAY['anestesia','medico']::text[], 'Registro claro es vital para trazabilidad y procesos legales.', true),
      (v_step_id, 'Logística para neurocirugía urgente', '["Coordinar drogas, sangre y equipo; verificar compatibilidad","No coordinar","Enviar sin equipo","No documentar"]'::jsonb, 1, ARRAY['anestesia','medico','farmacia']::text[], 'Coordinación reduce tiempo puerta-quirófano y errores.', true);
  END IF;

  RAISE NOTICE 'Preguntas insertadas/actualizadas para escenario id=%', v_scenario_id;
END $$;


-- Insertar metadatos (checklist, briefs, triggers) idempotente en scenario_presencial_meta si existe
DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Politrauma: TCE con HTIC (sospecha de maltrato)' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario no encontrado; omitiendo metadatos.';
    RETURN;
  END IF;

  IF to_regclass('public.scenario_presencial_meta') IS NOT NULL THEN
    INSERT INTO public.scenario_presencial_meta (scenario_id, student_brief, instructor_brief, room_layout, checklist_template, roles_required, triggers)
    VALUES (
      v_scenario_id,
      $student$Paciente pediátrico con politrauma y sospecha de maltrato. Presenta alteración del nivel de conciencia (GCS 8), anisocoria derecha, patrón respiratorio irregular y signos externos de lesiones en distintas etapas. Mantener ABCDE, preparar intubación, solicitar TC craneal urgente y activar protección infantil.$student$,
      $instructor$Claves para instructores:
- GCS ≤ 8 y anisocoria → considerar lesión focal/hernia y priorizar intubación/protección de vía aérea.
- Hipotensión en pediatría empeora pronóstico neurológico; administrar bolos de cristaloides (20 ml/kg) y vasopresores si preciso.
- Evitar hipercapnia; mantener PaCO2 35–40 mmHg.
- Osmoterapia (manitol o suero hipertónico) según protocolo; monitorizar natremia y diuresis.
- Documentación forense (fotos timestamped, registro objetivo) y notificación a protección infantil es obligatoria.$instructor$,
      -- Añadimos `room_layout` con objeto `patient` que incluye demographics, vitals y objetivos pedagógicos
      '{"patient": {"age_years": 2, "age_months": 24, "sex": "M", "weight_kg": 12}, "vitals": {"gcs": 8, "fc": 156, "fr": 30, "sat": 94, "temp": 35, "ta": {"systolic": 78, "diastolic": 42}}, "objectives": {"general": "Reconocer y manejar de forma inicial HTIC en politrauma pediátrico: protección de vía aérea, mantenimiento de perfusión cerebral, medidas neuroprotectoras y activación de protección infantil.", "roles": {"medico": ["Priorizar protección de vía aérea y decidir indicación quirúrgica","Mantener presión de perfusión cerebral y tratar hipotensión","Seleccionar y monitorizar osmoterapia"], "enfermeria": ["Realizar monitorización neurológica continua y alertar cambios","Asegurar accesos y soporte para reanimación","Documentar lesiones y colaborar con notificación forense"], "anestesia": ["Planificar RSI minimizando impacto en PIC y en hemodinamia","Mantener objetivos ventilatorios adecuados (PaCO2 35–40 mmHg)","Manejo de hipotensión durante inducción"] , "farmacia": ["Preparar y validar dosis pediátricas de emergencia","Asegurar disponibilidad de anticonvulsivantes y vasopresores","Coordinar entrega rápida de sangre/derivados si procede"]}}}'::jsonb,
      '[{"group":"Acciones críticas","items":[
        {"label":"GCS ≤ 8","correct":true},
        {"label":"Anisocoria o pupilas asimétricas","correct":true},
        {"label":"Hipotensión (edad-específica)","correct":true},
        {"label":"Patrón respiratorio alterado/hipoventilación","correct":true},
        {"label":"Lesiones en distintas etapas (sospecha maltrato)","correct":true},
        {"label":"Glucemia levemente alterada aislada","correct":false},
        {"label":"Fiebre aislada 37.8 ºC","correct":false}
      ]}]'::jsonb,
      '[{"role":"medico","min":1,"max":2},{"role":"enfermeria","min":1,"max":2},{"role":"anestesia","min":1,"max":1},{"role":"farmacia","min":0,"max":1}]'::jsonb,
      '[{"event":"vital_threshold","variable":"systolic_bp","condition":"<age_adjusted_hypotension","action":"flag_hemodynamic_instability"},{"event":"neurologic_deterioration","variable":"gcs","condition":"<=8","action":"flag_airway_and_neurosurgery"}]'::jsonb
    ) ON CONFLICT (scenario_id) DO UPDATE
    SET student_brief = EXCLUDED.student_brief,
        instructor_brief = EXCLUDED.instructor_brief,
        room_layout = EXCLUDED.room_layout,
        checklist_template = EXCLUDED.checklist_template,
        roles_required = EXCLUDED.roles_required,
        triggers = EXCLUDED.triggers;
  ELSE
    RAISE NOTICE 'Tabla public.scenario_presencial_meta no encontrada; omitiendo metadatos.';
  END IF;
END $$;

-- FIN del migration
