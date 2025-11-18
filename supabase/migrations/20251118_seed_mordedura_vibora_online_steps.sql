-- Migration: Seed pasos y preguntas para escenario online — Mordedura de víbora
-- Fecha: 2025-11-18
-- Inserta pasos y preguntas (comunes y por rol) de forma idempotente.

DO $$
DECLARE
  v_scenario_id INT;
  v_step_eval INT;
  v_step_wound INT;
  v_step_labs INT;
  v_step_decision INT;
  v_step_medico INT;
  v_step_enfermeria INT;
  v_step_farmacia INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Mordedura de víbora' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario "Mordedura de víbora" no encontrado; saltando inserción de pasos/preguntas.';
    RETURN;
  END IF;

  -- Insertar pasos si existe la tabla `steps`
  IF to_regclass('public.steps') IS NOT NULL THEN
    -- Evaluación inicial
    SELECT id INTO v_step_eval FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Evaluación inicial: valoración ABC, signos vitales y examen local de la mordedura' LIMIT 1;
    IF v_step_eval IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Evaluación inicial: valoración ABC, signos vitales y examen local de la mordedura', 1, false, NULL, 'Anotar tiempo desde la mordedura, características locales (eritema, edema, equimosis), signos de sangrado y signos neurológicos')
      RETURNING id INTO v_step_eval;
    END IF;

    -- Cuidados locales y manejo inicial
    SELECT id INTO v_step_wound FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Cuidados locales: limpieza, inmovilización y analgesia' LIMIT 1;
    IF v_step_wound IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Cuidados locales: limpieza, inmovilización y analgesia', 2, false, NULL, 'Medidas iniciales: lavado con suero, inmovilizar miembro, control del dolor. No realizar cortes ni succionar la herida')
      RETURNING id INTO v_step_wound;
    END IF;

    -- Solicitar pruebas
    SELECT id INTO v_step_labs FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Solicitar pruebas: hemograma, coagulación, función renal, CK' LIMIT 1;
    IF v_step_labs IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Solicitar pruebas: hemograma, coagulación, función renal, CK', 3, false, NULL, 'Solicitar y documentar resultados; valorar coagulopatía y trombocitopenia como indicación de antídoto')
      RETURNING id INTO v_step_labs;
    END IF;

    -- Decisión sobre antídoto (paso central)
    SELECT id INTO v_step_decision FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Decisión: administrar suero antiofídico' LIMIT 1;
    IF v_step_decision IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Decisión: administrar suero antiofídico', 4, false, NULL, 'Evaluar riesgos/beneficios según signos sistémicos y pruebas. Indicar dosis y observar posibles reacciones al antisuero')
      RETURNING id INTO v_step_decision;
    END IF;

    -- Paso rol: médico (decisión y dosificación)
    SELECT id INTO v_step_medico FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Médico: decisión terapéutica y dosificación del antídoto' LIMIT 1;
    IF v_step_medico IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Médico: decisión terapéutica y dosificación del antídoto', 5, true, ARRAY['medico'], 'Decidir esquema de administración, dosis inicial y criterios de repetición')
      RETURNING id INTO v_step_medico;
    END IF;

    -- Paso rol: enfermería (monitorización y acceso IV)
    SELECT id INTO v_step_enfermeria FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Enfermería: acceso IV, monitorización y preparación para reacciones' LIMIT 1;
    IF v_step_enfermeria IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Enfermería: acceso IV, monitorización y preparación para reacciones', 6, true, ARRAY['enfermeria'], 'Asegurar acceso venoso, monitorizar constantes, preparar adrenalina y equipos para manejo de anafilaxia')
      RETURNING id INTO v_step_enfermeria;
    END IF;

    -- Paso rol: farmacia (preparación del antídoto)
    SELECT id INTO v_step_farmacia FROM public.steps WHERE scenario_id = v_scenario_id AND description = 'Farmacia: preparación y verificación del antídoto' LIMIT 1;
    IF v_step_farmacia IS NULL THEN
      INSERT INTO public.steps (scenario_id, description, step_order, role_specific, roles, narrative)
      VALUES (v_scenario_id, 'Farmacia: preparación y verificación del antídoto', 7, true, ARRAY['farmacia'], 'Confirmar lote, dilución y volumen de administración; etiquetar claramente y comunicar al equipo')
      RETURNING id INTO v_step_farmacia;
    END IF;
  END IF;

  -- Insertar preguntas si existe la tabla `questions`
  IF to_regclass('public.questions') IS NOT NULL THEN
    -- Pregunta común avanzada: decisión de antídoto basada en guías
    IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_decision AND q.question_text ILIKE 'Según las guías%antiofídico%') = 0 THEN
      INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, critical_rationale)
      VALUES (
        v_step_decision,
        'Según las guías actuales (p.ej. WHO y recomendaciones nacionales), con plaquetas 80x10^3/µL, INR 2.1 y edema progresivo en la extremidad a los 40 min, ¿qué decisión es la más apropiada?',
        '["Administrar suero antiofídico de forma temprana (iniciar dosis según protocolo local) y monitorizar en entorno hospitalario","Retrasar antídoto, iniciar soporte y repetir pruebas en 2 horas; administrar antídoto solo si empeora","No administrar antídoto; manejo conservador con cuidados locales y analgesia"]'::jsonb,
        0,
        'La evidencia y guías recomiendan administrar antiveneno ante signos de envenenamiento sistémico o coagulopatía activa (plaquetas bajas, INR elevado, sangrado). Retrasar puede aumentar riesgo de complicaciones. Considerar además disponibilidad y riesgo de reacciones al antisuero.',
        NULL,
        true,
        '["Documenta signos sistémicos: sangrado, hipotensión, alteración neurológica","Valora riesgo/beneficio y disponibilidad de antisuero en tu centro"]'::jsonb,
        'Coagulopatía documentada (INR>1.5, plaquetas significativamente bajas) es considerada indicación para antiveneno en múltiples guías.'
      );
    END IF;

    -- Preguntas por rol: Médico (avanzadas y basadas en protocolos)
    IF v_step_medico IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'En presencia de coagulopatía confirmada%esquema%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, critical_rationale)
        VALUES (
          v_step_medico,
          'En presencia de coagulopatía confirmada por INR elevado y plaquetopenia progresiva, ¿qué estrategia inicial refleja mejor las recomendaciones actuales?',
          '["Iniciar antídoto según protocolo (dosis de referencia del antisuero utilizado localmente) y preparar rescates/re-dosificación según respuesta clínica y de laboratorio","Administrar factores de coagulación (plasma fresco/concentrados) antes del antídoto para corregir INR y luego decidir antídoto","Esperar resolución espontánea y no administrar antídoto salvo sangrado activo"]'::jsonb,
          0,
          'Las guías recomiendan administrar antiveneno como tratamiento etiológico frente a coagulopatía por veneno; soporte con hemoderivados puede ser necesario para manejo del sangrado, pero no sustituye la inmunoterapia específica.',
          ARRAY['medico'],
          true,
          '["Confirma protocolo local para dosis inicial y criterios de re-dosificación","Documenta indicación en historia clínica y comunica a equipo"]'::jsonb,
          'Antiveneno es el tratamiento específico; hemoderivados son medidas complementarias, no sustitutas.'
        );
      END IF;
      -- Pregunta M2: criterio de re-dosificación
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE '¿Cuál es el criterio más aceptado para re-dosificar antiveneno%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, critical_rationale)
        VALUES (
          v_step_medico,
          '¿Cuál es el criterio más aceptado para re-dosificar antiveneno en un paciente con empeoramiento clínico?',
          '["Re-dosificar si persiste o progresa la coagulopatía y/o signos clínicos de envenenamiento","Re-dosificar siempre a las 6 horas sin esperar resultados","No re-dosificar; una única dosis es suficiente en la mayoría de los casos"]'::jsonb,
          0,
          'La re-dosificación se basa en respuesta clínica y evolución de pruebas (coagulopatía persistente o empeoramiento). Protocolos locales varían, pero la práctica común es re-dosificar según respuesta.',
          ARRAY['medico'],
          true,
          '["Monitorea INR/plaquetas y signos sistémicos","Comunica al equipo y documenta" ]'::jsonb,
          'Re-dosificación orientada por respuesta clínica y de laboratorio.'
        );
      END IF;

      -- Pregunta M3: elección de antiveneno según especie/disponibilidad
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'En ausencia de identificación de la especie%antiveneno%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          'En ausencia de identificación de la especie venenosa, ¿qué principio guía la elección del antiveneno?',
          '["Usar el antiveneno con espectro más amplio y disponible localmente","Esperar identificación exacta antes de administrar antiveneno","Administrar antiveneno para la especie más común sin confirmar signos clínicos"]'::jsonb,
          0,
          'Si la especie no está identificada, se elige el antiveneno de mayor espectro y disponibilidad, priorizando la indicación por clínica y pruebas.',
          ARRAY['medico'],
          true,
          '["Consulta protocolos de país/region","Prioriza disponibilidad y espectro"]'::jsonb
        );
      END IF;

      -- Pregunta M4: manejo de reacción anafiláctica durante la perfusión
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'Si durante la perfusión aparece reaccion anafilactica%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          'Si durante la perfusión aparece reacción anafiláctica leve (urticaria y prurito) ¿qué acción inicial es la más apropiada?',
          '["Interrumpir la perfusión, administrar adrenalina intramuscular y reevaluar; reanudar solo si controlada","Continuar perfusión con antihistamínicos y esteroides profilácticos","Detener la perfusión definitivamente y no reanudar nunca"]'::jsonb,
          0,
          'La reacción anafiláctica requiere manejo agresivo inicial; adrenalina IM es prioridad. Tras control y valoración riesgo/beneficio, puede considerarse reanudar con precaución en algunos protocolos.',
          ARRAY['medico'],
          true,
          '["Asegura vía aérea/soporte ventilatorio","Administra adrenalina IM 0.3-0.5 mg y monitoriza"]'::jsonb
        );
      END IF;

      -- Pregunta M5: uso de hemoderivados
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE '¿Cuál es el papel de los hemoderivados%coagulopatía%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          '¿Cuál es el papel de los hemoderivados en la coagulopatía por envenenamiento por víbora?',
          '["Soporte para sangrado activo; no sustituyen el antiveneno","Son la primera línea y deben administrarse antes del antiveneno","No tienen indicación en este contexto"]'::jsonb,
          0,
          'Los hemoderivados (plasma, plaquetas) se usan como soporte en sangrado activo; el antiveneno trata la causa subyacente y es prioritario.',
          ARRAY['medico'],
          true,
          '["Valora necesidad según sangrado clínico","Coordina con banco de sangre"]'::jsonb
        );
      END IF;

      -- Pregunta M6: embarazo
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'En embarazo%antiveneno%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          'En una paciente embarazada con signos de envenenamiento sistémico, ¿cuál es la recomendación más apropiada?',
          '["Administrar antiveneno si hay indicación clínica; los beneficios superan el riesgo potencial fetal","Evitar antiveneno por riesgo fetal y usar solo medidas de soporte","Consultar toxicológico y esperar resultados de laboratorio antes de decidir"]'::jsonb,
          0,
          'El envenenamiento materno grave debe tratarse; el antiveneno se administra si está indicado clínicamente, considerando riesgo/beneficio.',
          ARRAY['medico'],
          true,
          '["Coordina con obstetricia","Documenta discusión de riesgo/beneficio"]'::jsonb
        );
      END IF;

      -- Pregunta M7: pediatría (ajuste dosis)
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'En pediatría%dosis%ajuste%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          'En pediatría, ¿cómo se ajusta la dosis de antiveneno en la mayoría de protocolos?',
          '["Dosis similar a adultos basada en severidad; algunos protocolos usan peso como referencia","Dosis proporcionalmente menores siempre según peso","No se administra antiveneno en menores de 5 años"]'::jsonb,
          0,
          'Muchos protocolos recomiendan la misma dosis inicial que en adultos basada en severidad clínica; el ajuste final depende del producto y guía local.',
          ARRAY['medico'],
          true,
          '["Consulta guía pediátrica local","Monitorea respuesta clínica y de laboratorio"]'::jsonb
        );
      END IF;

      -- Pregunta M8: seguimiento tardío (serum sickness)
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE '¿Qué vigilancia tardía%serum sickness%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          '¿Qué vigilancia tardía es importante después de administrar antiveneno?',
          '["Vigilar aparición de fiebre, artralgias y exantema (síndrome del suero) en semanas posteriores","No requiere seguimiento tras alta","Sólo realizar hemograma a los 2 meses"]'::jsonb,
          0,
          'El síndrome del suero puede aparecer días-semanas después; es importante informar al paciente y programar seguimiento si aparecen síntomas.',
          ARRAY['medico'],
          false,
          '["Informa al paciente sobre signos de alarma","Registra contacto para seguimiento"]'::jsonb
        );
      END IF;

      -- Pregunta M9: anticoagulantes concomitantes
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE 'Paciente en anticoagulacion%manejo%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          'Paciente en anticoagulación crónica con INR elevado tras mordedura, ¿qué consideraciones son prioritarias?',
          '["Priorizar antiveneno si hay coagulopatía por veneno; coordinar reversión de anticoagulación si sangrado activo","No administrar antiveneno hasta revertir anticoagulación","Discontinuar anticoagulante y observar sin antiveneno"]'::jsonb,
          0,
          'La presencia de anticoagulación complica la interpretación; si hay evidencia de envenenamiento, el antiveneno sigue siendo indicación principal; coordina manejo de anticoagulación.',
          ARRAY['medico'],
          true,
          '["Consulta hematología","Documenta riesgo/beneficio"]'::jsonb
        );
      END IF;

      -- Pregunta M10: criterios de alta u observación
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_medico AND q.question_text ILIKE '¿Qué criterios son aceptables para el alta hospitalaria%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_medico,
          '¿Qué criterios son aceptables para el alta hospitalaria en un paciente con mordedura tratado con antiveneno?',
          '["Estabilidad hemodinámica, normalización o tendencia clara a la mejoría en pruebas y ausencia de signos de progresión local","Alta tras 6 horas independientemente de pruebas","Mantener mínimo 72 horas siempre"]'::jsonb,
          0,
          'El alta se basa en estabilidad clínica y evolución favorable de pruebas; el tiempo mínimo depende de la respuesta y protocolo local.',
          ARRAY['medico'],
          false,
          '["Asegura plan de seguimiento","Entrega instrucciones claras al paciente"]'::jsonb
        );
      END IF;
    END IF;

    -- Preguntas por rol: Enfermería (profundo y operativo)
    IF v_step_enfermeria IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Antes de administrar antídoto%monitorización%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit)
        VALUES (
          v_step_enfermeria,
          'Antes de administrar antídoto, ¿qué monitorización y preparaciones son obligatorias y cuáles son medidas profilácticas controvertidas?',
          '["Monitorización continua (ECG, presión arterial, SpO2), accesos IV seguros y preparación de adrenalina/dobutamina; la profilaxis rutinaria con antihistamínicos/corticoides no está universalmente recomendada","Sólo tomar constantes periódicas; la profilaxis con esteroides es la práctica estándar y reduce reacciones","No es necesario preparar adrenalina; la administración de antídoto es segura sin medidas adicionales"]'::jsonb,
          0,
          'Preparar monitorización continua y acceso IV es obligatorio. La profilaxis farmacológica para prevenir reacciones al antisuero (antihistamínicos, esteroides) es controvertida y no sustituye la disponibilidad de manejo activo de anafilaxia (adrenalina).',
          ARRAY['enfermeria'],
          true,
          '["Asegura perfusión IV adecuada y material para manejo de reacciones (adrenalina 1:1000, guías de dilución)","Monitoriza signos y documenta en registro"]'::jsonb,
          300
        );
      END IF;
      -- Enfermería E2: elección de acceso IV
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE '¿Cuál es el acceso IV preferido%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          '¿Cuál es el acceso IV preferido para administración de antiveneno en extremidad afectada?',
          '["Acceso en vena periférica de extremidad contralateral o proximal al sitio de mordedura","Acceso en la misma extremidad lo más cercano posible a la mordedura","Uso de catéter intraóseo siempre"]'::jsonb,
          0,
          'Se prefiere acceso en extremidad contralateral o proximal al sitio lesionado para evitar problemas con el miembro afectado; el acceso intraóseo es una alternativa en emergencia.',
          ARRAY['enfermeria'],
          true,
          '["Valora permeabilidad y calibre de la vía","Documenta sitio de punción"]'::jsonb
        );
      END IF;

      -- Enfermería E3: velocidad de infusion
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'La velocidad recomendada%infusion%antiveneno%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit)
        VALUES (
          v_step_enfermeria,
          'La velocidad recomendada de infusión de antiveneno suele ser:',
          '["Administración lenta inicial con titulación según tolerancia y protocolo local","Bolus rápido para máxima eficacia inmediata","Velocidad fija de 60 mL/h para todos los pacientes"]'::jsonb,
          0,
          'Se suele comenzar con infusión lenta para vigilar reacciones y ajustar velocidad según tolerancia y protocolo local.',
          ARRAY['enfermeria'],
          true,
          '["Prepara bomba de infusión","Monitoriza signos y pauta de titulación"]'::jsonb,
          120
        );
      END IF;

      -- Enfermería E4: premedicación
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'La profilaxis rutinaria con antihistaminicos%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'La profilaxis rutinaria con antihistamínicos/corticoides antes del antiveneno es:',
          '["Controvertida; puede usarse según protocolo pero no sustituye disponibilidad de adrenalina","Estrictamente obligatoria para todos los pacientes","Prohibida por aumentar riesgo de complicaciones"]'::jsonb,
          0,
          'La profilaxis es controvertida y variable según protocolos; no sustituye la preparación para manejo de anafilaxia.',
          ARRAY['enfermeria'],
          false,
          '["Sigue protocolo local","Ten adrenalina lista"]'::jsonb
        );
      END IF;

      -- Enfermería E5: reconocimiento precoz de anafilaxia
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Señales tempranas de anafilaxia%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Señales tempranas de anafilaxia a vigilar durante la perfusión incluyen:',
          '["Prurito, urticaria, disnea, hipotensión y broncoespasmo","Fiebre aislada sin otros síntomas","Dolor local en el sitio de inyección exclusivamente"]'::jsonb,
          0,
          'La anafilaxia puede empezar con manifestaciones cutáneas y progresar a compromiso respiratorio y hemodinámico; vigilancia continua es clave.',
          ARRAY['enfermeria'],
          true,
          '["Monitorea SpO2 y TA","Detecta cambios en patrón respiratorio"]'::jsonb
        );
      END IF;

      -- Enfermería E6: manejo de adrenalina
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Dosis de adrenalina IM en anafilaxia%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Dosis intramuscular de adrenalina recomendada en reacción anafiláctica aguda en adultos es aproximadamente:',
          '["0.3-0.5 mg de adrenalina 1:1000 IM","0.01 mg/kg IV inmediata","5 mg IM"]'::jsonb,
          0,
          'La dosis intramuscular recomendada en adultos es 0.3–0.5 mg de adrenalina 1:1000; la administración IV requiere precaución y personal experimentado.',
          ARRAY['enfermeria'],
          true,
          '["Prepara jeringa de 1 mg/mL","Administra IM en cara externa del muslo"]'::jsonb
        );
      END IF;

      -- Enfermería E7: documentación y handover
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Qué información es crítica incluir en la entrega%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Qué información es crítica incluir en la entrega al equipo médico durante el manejo de antiveneno?',
          '["Hora de inicio de síntomas, dosis administrada, reacciones observadas y resultados de laboratorio","Solo hora de ingreso","Solo nombre del medicamento administrado"]'::jsonb,
          0,
          'La entrega debe incluir datos clave: tiempos, dosis, respuesta y hallazgos de laboratorio para continuidad segura del cuidado.',
          ARRAY['enfermeria'],
          false,
          '["Documenta en hoja de enfermería","Comunica verbalmente al equipo"]'::jsonb
        );
      END IF;

      -- Enfermería E8: manejo de muestras
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Manejo de muestras para laboratorio%tiempos%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Manejo correcto de muestras para pruebas de coagulación incluye:',
          '["Enviar muestras según protocolo, etiquetadas y con tiempos documentados","Enviar sin etiquetar para rapidez","Enviar solo si hay sangrado activo"]'::jsonb,
          0,
          'Las muestras deben tomarse y enviarse con etiqueta y tiempo, ya que la evolución de parámetros como INR y plaquetas es clave para decisiones terapéuticas.',
          ARRAY['enfermeria'],
          false,
          '["Etiqueta con hora de toma","Asegura transporte rápido"]'::jsonb
        );
      END IF;

      -- Enfermería E9: cuidados locales y analgesia
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Analgesia en paciente con mordedura%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Analgesia adecuada para paciente con mordedura incluye:',
          '["Opioides si dolor intenso y no contraindicado; evitar vasoconstrictores locales y hielo extremo","Usar únicamente AINEs por seguridad","No administrar analgesia"]'::jsonb,
          0,
          'El control del dolor es importante; la elección depende de la severidad y contraindicaciones; evitar medidas que puedan empeorar la lesión local.',
          ARRAY['enfermeria'],
          false,
          '["Evalúa dolor y alergias","Documenta respuesta a analgesia"]'::jsonb
        );
      END IF;

      -- Enfermería E10: comunicación con paciente
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_enfermeria AND q.question_text ILIKE 'Qué debe incluir la comunicación con el paciente%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_enfermeria,
          'Qué debe incluir la comunicación con el paciente antes de administrar antiveneno?',
          '["Explicación de riesgo/beneficio, signos de reacción y plan de seguimiento","No es necesario informar antes de administrar","Solo obtener firma sin explicación"]'::jsonb,
          0,
          'Informar al paciente y familia sobre riesgo/beneficio, signos de alarma y seguimiento es parte del cuidado seguro y ético.',
          ARRAY['enfermeria'],
          false,
          '["Usa lenguaje claro","Documenta consentimiento cuando sea posible"]'::jsonb
        );
      END IF;
    END IF;

    -- Preguntas por rol: Farmacia (seguridad y compatibilidad)
    IF v_step_farmacia IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE '¿Qué controles críticos%antídoto%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          '¿Qué controles críticos y comprobaciones debe realizar farmacia antes de dispensar y reconstituir el antídoto?',
          '["Verificar taquéctica: lote, fecha de caducidad, protocolo de reconstitución, compatibilidad con diluyente y estabilidad; etiquetado claro y comunicación de dosis exacta al equipo","Sólo comprobar fecha de caducidad y entregar al personal clínico para que lo prepare en hospital","Preparar antídoto mezclado con cualquier solución disponible sin comprobaciones adicionales para agilizar entrega"]'::jsonb,
          0,
          'Farmacia debe verificar lote, vencimiento, instrucciones de reconstitución y estabilidad. La comunicación clara de la dosis y posibles contraindicaciones es esencial para seguridad del paciente.',
          ARRAY['farmacia'],
          true,
          '["Sigue ficha técnica del producto y protocolos locales","Comunica al equipo médico la concentración final y el volumen de administración"]'::jsonb
        );
      END IF;
      -- Farmacia F2: compatibilidad y dilución
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE '¿Cuál es la comprobacion principal%compatibilidad%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          '¿Cuál es la comprobación principal de farmacia respecto a compatibilidad y dilución del antídoto?',
          '["Verificar diluyente recomendado y compatibilidad con soluciones IV; seguir ficha técnica","Diluir en cualquier solución cristaloide disponible","Mezclar con soluciones que aumenten estabilidad sin comprobar"]'::jsonb,
          0,
          'La compatibilidad y dilución deben seguir la ficha técnica del fabricante para garantizar estabilidad y seguridad del producto.',
          ARRAY['farmacia'],
          true,
          '["Consulta ficha técnica","Evita mezclas no recomendadas"]'::jsonb
        );
      END IF;

      -- Farmacia F3: almacen y cadena de frio
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Condiciones de almacenamiento%antídoto%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Condiciones de almacenamiento críticas para antídotos incluyen:',
          '["Temperatura indicada por fabricante y registro de cadenas de frío","Guardar a temperatura ambiente sin control","Congelar para preservar longer"]'::jsonb,
          0,
          'Los antídotos suelen requerir almacenamiento según fabricante y control de la cadena de frío; incumplimiento puede afectar eficacia.',
          ARRAY['farmacia'],
          true,
          '["Registra temperaturas","Asegura trazabilidad del lote"]'::jsonb
        );
      END IF;

      -- Farmacia F4: reconstitucion y tecnica aséptica
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'La técnica de reconstitución%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'La técnica de reconstitución y preparación del antídoto debe ser:',
          '["Aséptica, siguiendo instrucciones de fabricante y etiquetado claro","Rápida y en cualquier lugar del hospital","Realizada por personal no formado para agilizar proceso"]'::jsonb,
          0,
          'La reconstitución debe ser aséptica y seguir instrucciones para evitar contaminación y errores de concentración.',
          ARRAY['farmacia'],
          true,
          '["Usa cabina de seguridad si requiere asepsia","Etiqueta con concentración final"]'::jsonb
        );
      END IF;

      -- Farmacia F5: etiquetado y doble chequeo
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Qué comprobaciones antes de dispensar%etiquetado%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Qué comprobaciones son críticas antes de dispensar antídoto al equipo clínico?',
          '["Doble verificación de lote, dosificación y concentración; etiquetado claro","Sólo verificar caducidad","Solo entrega sin verificaciones para rapidez"]'::jsonb,
          0,
          'La seguridad exige doble verificación y etiquetado claro para evitar errores de dosificación y administración.',
          ARRAY['farmacia'],
          true,
          '["Realiza doble chequeo con otro farmacéutico","Etiqueta claramente el preparado"]'::jsonb
        );
      END IF;

      -- Farmacia F6: vida util tras reconstitucion
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Vida util tras reconstitución%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'La vida útil tras reconstitución del antídoto depende de:',
          '["Instrucciones del fabricante y condiciones de almacenamiento; algunas preparaciones tienen ventana corta de uso","Siempre 24 horas","Nunca usar tras reconstitución"]'::jsonb,
          0,
          'La vida útil varía según producto y condiciones; seguir ficha técnica y no utilizar fuera de ventana recomendada.',
          ARRAY['farmacia'],
          true,
          '["Consulta ficha técnica","Registra hora de reconstitución"]'::jsonb
        );
      END IF;

      -- Farmacia F7: alternativas cuando no hay stock
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Si no hay antiveneno disponible%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Si no hay antiveneno disponible en el centro, la acción más apropiada es:',
          '["Contactar red regional para transferencia o transporte rápido y administrar soporte mientras tanto","No hacer nada hasta que llegue antiveneno","Administrar otra medicación experimental"]'::jsonb,
          0,
          'La prioridad es buscar antiveneno de la red regional y proporcionar soporte hemodinámico y hemoderivados según necesidad.',
          ARRAY['farmacia'],
          true,
          '["Conoce vías de obtención regional","Prepara alternativa de soporte"]'::jsonb
        );
      END IF;

      -- Farmacia F8: farmacovigilancia
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Qué acciones de farmacovigilancia%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Qué acciones de farmacovigilancia son esperadas tras administración de antiveneno?',
          '["Registrar lote, reaccion adversa y reportar a sistema nacional de farmacovigilancia","No es necesario reportar","Solo reportar si hay muerte"]'::jsonb,
          0,
          'Es necesario registrar lote y reportar reacciones adversas para vigilancia y trazabilidad.',
          ARRAY['farmacia'],
          false,
          '["Documenta lote y reacciones","Informa a autoridades si corresponde"]'::jsonb
        );
      END IF;

      -- Farmacia F9: interacciones con otros medicamentos
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Interacciones con anticoagulantes%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Interacciones relevantes a considerar entre antiveneno y anticoagulantes?',
          '["Ninguna interacción farmacológica directa conocida; considerar efecto combinado sobre sangrado y coordinar manejo","Antiveneno inactiva anticoagulantes","Antiveneno potencia anticoagulantes"]'::jsonb,
          0,
          'No hay interacción farmacológica directa conocida, pero la coexistencia de anticoagulación y coagulopatía por veneno requiere coordinación con el equipo.',
          ARRAY['farmacia'],
          true,
          '["Coordina con médico sobre manejo de anticoagulación","Documenta decisiones"]'::jsonb
        );
      END IF;

      -- Farmacia F10: comunicación de instrucciones de administración
      IF (SELECT COUNT(*) FROM public.questions q WHERE q.step_id = v_step_farmacia AND q.question_text ILIKE 'Qué información debe comunicar farmacia%administracion%') = 0 THEN
        INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints)
        VALUES (
          v_step_farmacia,
          'Qué información debe comunicar farmacia al equipo que administra el antiveneno?',
          '["Concentración final, volumen a administrar, compatibilidades y tiempo de infusión recomendado","Solo entrega sin instrucciones","Sólo comunica lote y caducidad"]'::jsonb,
          0,
          'Farmacia debe comunicar claramente concentración, volumen, compatibilidades y recomendaciones de infusión para asegurar administración segura.',
          ARRAY['farmacia'],
          false,
          '["Incluye instrucciones escritas","Confirma recepción verbal si es crítico"]'::jsonb
        );
      END IF;
    END IF;
  END IF;

  RAISE NOTICE 'Pasos y preguntas (comunes y por rol) insertados/validados para scenario_id=%', v_scenario_id;
END $$;
