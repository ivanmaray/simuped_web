-- Seed: pasos y preguntas basicas para 'Traumatismo craneoencefálico grave pediátrico'
-- Fecha: 2025-11-15
-- Agrega pasos y preguntas mínimos; se ampliarán desde el editor.

DO $$
DECLARE
  v_scenario_id INTEGER;
  v_step1 INTEGER;
  v_step2 INTEGER;
  v_step3 INTEGER;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Traumatismo craneoencefálico grave pediátrico' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario no encontrado; saltando seed de pasos/preguntas';
    RETURN;
  END IF;

  -- Insertar pasos básicos si no existen
  INSERT INTO public.steps (scenario_id, step_order, description, role_specific, roles, narrative, created_at, updated_at)
  SELECT v_scenario_id, 1, 'Evaluación primaria: ABC y protección cervical', false, ARRAY['medico','enfermeria'], 'Control inicial de vía aérea, respiración y circulación', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM public.steps WHERE scenario_id = v_scenario_id AND step_order = 1);

  INSERT INTO public.steps (scenario_id, step_order, description, role_specific, roles, narrative, created_at, updated_at)
  SELECT v_scenario_id, 2, 'Preparación para intubación si indicado (RSI)', true, ARRAY['medico'], 'Preparar material, dosificación y rol de cada miembro', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM public.steps WHERE scenario_id = v_scenario_id AND step_order = 2);

  INSERT INTO public.steps (scenario_id, step_order, description, role_specific, roles, narrative, created_at, updated_at)
  SELECT v_scenario_id, 3, 'Soporte hemodinámico y monitorización', false, ARRAY['medico','enfermeria'], 'Control de fluidos, presión y monitorización continua', now(), now()
  WHERE NOT EXISTS (SELECT 1 FROM public.steps WHERE scenario_id = v_scenario_id AND step_order = 3);

  -- Obtener IDs insertados
  SELECT id INTO v_step1 FROM public.steps WHERE scenario_id = v_scenario_id AND step_order = 1 LIMIT 1;
  SELECT id INTO v_step2 FROM public.steps WHERE scenario_id = v_scenario_id AND step_order = 2 LIMIT 1;
  SELECT id INTO v_step3 FROM public.steps WHERE scenario_id = v_scenario_id AND step_order = 3 LIMIT 1;

  -- Preguntas basicas
  IF v_step1 IS NOT NULL THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, created_at, updated_at)
    SELECT v_step1,
      '¿Cuál es la prioridad inicial en este paciente?','["Asegurar vía aérea","Administrar manitol","Observar"]'::jsonb,0,'Priorizar la vía aérea y protección cervical',ARRAY['medico','enfermeria'],true,'Recuerda el ABC',now(),now()
    WHERE NOT EXISTS (SELECT 1 FROM public.questions q WHERE q.step_id = v_step1 AND q.question_text LIKE '¿Cuál es la prioridad inicial%');
  END IF;

  IF v_step2 IS NOT NULL THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, created_at, updated_at)
    SELECT v_step2,
      '¿Cuál es una indicación clara para intubación?','["GCS <= 8","Saturación > 94%","Presión arterial normal"]'::jsonb,0,'GCS bajo indica intubación en trauma',ARRAY['medico'],true,'Piensa en protector de vía aérea',now(),now()
    WHERE NOT EXISTS (SELECT 1 FROM public.questions q WHERE q.step_id = v_step2 AND q.question_text LIKE '¿Cuál es una indicación clara para intubación%');
  END IF;

  IF v_step3 IS NOT NULL THEN
    INSERT INTO public.questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, created_at, updated_at)
    SELECT v_step3,
      'Ante hipotensión inicial en TCE, ¿primer paso?','["Bolo cristaloide","Vasopresor inicial","Esperar y observar"]'::jsonb,0,'Bolo cristaloide según peso es la primera medida',ARRAY['medico','enfermeria'],true,'Administra acorde al peso del paciente',now(),now()
    WHERE NOT EXISTS (SELECT 1 FROM public.questions q WHERE q.step_id = v_step3 AND q.question_text LIKE 'Ante hipotensión inicial%');
  END IF;

END$$;
