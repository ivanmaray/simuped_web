-- Migration: Seed/Upsert escenario Intoxicación por Paracetamol (Online)
-- Fecha: 2025-12-15
-- Idempotente: ejecutable múltiples veces sin duplicar registros.

DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  SELECT id INTO v_scenario_id
  FROM public.scenarios
  WHERE title = 'Intoxicación por paracetamol (paracetamol overdose)'
  LIMIT 1;

  IF v_scenario_id IS NULL THEN
    BEGIN
      INSERT INTO public.scenarios (title, summary, status, mode, level, difficulty, estimated_minutes, max_attempts)
      VALUES (
        'Intoxicación por paracetamol (paracetamol overdose)',
        'Niño/ adolescente con ingesta de paracetamol. Evaluación de riesgo según tiempo desde ingesta, dosis y nomograma Rumack–Matthew. Decisión sobre N-acetilcisteína (NAC) y monitorización de función hepática.',
        'Borrador',
        ARRAY['online'],
        'medio',
        'Intermedio',
        20,
        3
      )
      RETURNING id INTO v_scenario_id;
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM LIKE '%scenarios_status_check%' THEN
        INSERT INTO public.scenarios (title, summary, status, mode, level, difficulty, estimated_minutes, max_attempts)
        VALUES (
          'Intoxicación por paracetamol (paracetamol overdose)',
          'Niño/ adolescente con ingesta de paracetamol. Evaluación de riesgo según tiempo desde ingesta, dosis y nomograma Rumack–Matthew. Decisión sobre N-acetilcisteína (NAC) y monitorización de función hepática.',
          'En construcción: en proceso',
          ARRAY['online'],
          'medio',
          'Intermedio',
          20,
          3
        )
        RETURNING id INTO v_scenario_id;
      ELSE
        RAISE;
      END IF;
    END;
  ELSE
    -- Actualizar texto si ya existe
    UPDATE public.scenarios
    SET summary = 'Niño/ adolescente con ingesta de paracetamol. Evaluación de riesgo según tiempo desde ingesta, dosis y nomograma Rumack–Matthew. Decisión sobre N-acetilcisteína (NAC) y monitorización de función hepática.',
        status = 'Borrador',
        mode = ARRAY['online'],
        level = 'medio',
        difficulty = 'Intermedio',
        estimated_minutes = 20,
        max_attempts = 3
    WHERE id = v_scenario_id;
  END IF;

  -- Insertar case_brief (upsert por scenario_id)
  INSERT INTO case_briefs (
    scenario_id, title, context, chief_complaint, history, exam, vitals, quick_labs, objectives, critical_actions, red_flags, competencies)
  VALUES (
    v_scenario_id,
    'Intoxicación aguda por paracetamol',
    'Urgencias pediátricas. Paciente trae por familia tras ingesta aguda de paracetamol hace X horas.',
    'Ingesta aguda de paracetamol (posible sobredosis).',
    '{"ingesta":"Ingesta accidental o intencional de paracetamol. Horas desde la ingesta estimadas por familiar o paciente.", "medicamentos":"Paracetamol (mg), otros fármacos coingestados"}'::jsonb,
    '{"estado_general":"Consciente/ somnoliento/ inconsciente según escala","evaluacion_inicial":"ABC, signos de irritación abdominal"}'::jsonb,
    '{"fc":80, "fc_note":"taquicardia si dolor/ansiedad", "ta": 110, "temp": 36.6, "sat": 98}'::jsonb,
    '{"paracetamol_level": null, "liver_enzyme": null, "glucose": null}'::jsonb,
    '[