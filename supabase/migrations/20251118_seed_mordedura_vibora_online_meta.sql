-- Migration: Seed meta presencial para escenario — Mordedura de víbora
-- Fecha: 2025-11-18
-- Inserta metadatos (constantes, observaciones, signos de alarma, lecturas) de forma idempotente.

DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  SELECT id INTO v_scenario_id FROM public.scenarios WHERE title = 'Mordedura de víbora' LIMIT 1;
  IF v_scenario_id IS NULL THEN
    RAISE NOTICE 'Escenario "Mordedura de víbora" no encontrado; saltando inserción de metadatos.';
    RETURN;
  END IF;

  IF to_regclass('public.scenario_presencial_meta') IS NOT NULL THEN
    INSERT INTO public.scenario_presencial_meta (scenario_id, student_brief, instructor_brief, checklist_template, roles_required, triggers)
    VALUES (
      v_scenario_id,
      -- student_brief: lo que ven los alumnos
      $$Constantes y observaciones
      FC: 156
      FR: 34
      SatO2 (%): 86
      Temperatura (ºC): 36.2
      TA sistólica/diastólica (mmHg): 78/42
      Notas: TA 78/42 mmHg

      Exploración física (una línea por hallazgo):
      Edema facial marcado

      Analítica rápida (nombre | valor):
      Glucemia capilar | 142 mg/dL
      Lactato | 3.8 mmol/L

      Pruebas de imagen / monitorización (nombre | estado):
      Radiografía de tórax | No indicada inmediata
      ECG continuo | Monitorizado

      Triángulo de evaluación pediátrica:
      Apariencia: Sin definir
      Respiración: Sin definir
      Circulación cutánea: Sin definir

      Signos de alarma: selecciona los que procedan (algunos son distractores)
      $$,

      -- instructor_brief: claves y respuestas (qué indica gravedad)
      $$Claves instructores:
      - Hipotensión (TA 78/42) => Signo grave (indica shock mixto/hipo-perfusión)
      - Taquicardia 156 => Contribuye a inestabilidad hemodinámica
      - FR 34 y SatO2 86% => Insuficiencia respiratoria parcial/hipoxemia
      - Edema facial marcado => posible edema progresivo/síntoma preocupante si compromete vía aérea
      - Lactato 3.8 mmol/L => hipoperfusión/estrés metabólico
      - Glucemia capilar 142 mg/dL => no es signo de gravedad por sí mismo (distractor)
      - Temperatura 36.2 ºC => normal (distractor)

      Signos que deben marcarse como CORRECTOS en la actividad: Hipotensión, Taquicardia marcada, SatO2 baja, FR elevada, Edema facial marcado, Lactato elevado, Alteración del estado mental (si aparece)
      $$,

      -- checklist_template: estructura con signos de alarma (correctos y distractores)
      '[{"group":"Signos de alarma","items":[
          {"label":"TA sistólica <90 mmHg (ej. 78/42)", "correct": true},
          {"label":"SatO2 <90% (ej. 86%)", "correct": true},
          {"label":"FC > 140 lpm (ej. 156)", "correct": true},
          {"label":"FR > 30 rpm (ej. 34)", "correct": true},
          {"label":"Edema facial marcado", "correct": true},
          {"label":"Glucemia capilar 142 mg/dL", "correct": false},
          {"label":"Temperatura 36.2 ºC", "correct": false},
          {"label":"Eritema local leve alrededor de la mordedura", "correct": false},
          {"label":"Sangrado activo de la herida", "correct": true},
          {"label":"Disminución del nivel de conciencia (confusión, somnolencia)", "correct": true}
      ]}]'::jsonb,

      -- roles_required: equipo mínimo sugerido
      '[{"role":"medico","min":1,"max":2,"notes":"Responsable de decisión sobre antiveneno"},{"role":"enfermeria","min":1,"max":2,"notes":"Monitorización y administración"},{"role":"farmacia","min":0,"max":1,"notes":"Preparación del antídoto"}]'::jsonb,

      -- triggers: reglas simples (solo informativas; la UI puede mapearlas)
      '[{"event":"vital_threshold","variable":"systolic_bp","condition":"<90","action":"flag_hemodynamic_instability"},{"event":"vital_threshold","variable":"sat_o2","condition":"<90","action":"flag_respiratory_compromise"}]'::jsonb
    )
    ON CONFLICT (scenario_id) DO UPDATE
    SET
      student_brief = EXCLUDED.student_brief,
      instructor_brief = EXCLUDED.instructor_brief,
      checklist_template = EXCLUDED.checklist_template,
      roles_required = EXCLUDED.roles_required,
      triggers = EXCLUDED.triggers,
      updated_at = now();
  END IF;

  RAISE NOTICE 'Meta presencial aplicada para escenario "Mordedura de víbora" (scenario_id=%)', v_scenario_id;
END $$;
