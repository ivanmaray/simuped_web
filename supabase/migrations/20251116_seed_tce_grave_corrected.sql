-- Migration: Seed/Upsert escenario TCE grave pediátrico (presencial + online)
-- Fecha: 2025-11-16
-- Idempotente: ejecutable múltiples veces sin duplicar registros.
-- Ajusta textos clínicos antes de producción definitiva.
-- Alineado con constraints actuales:
--   status ∈ ('Disponible','En construcción: en proceso','En construcción: sin iniciar','Borrador','Archivado','Publicado')
--   level ∈ ('basico','medio','avanzado')
--   difficulty ∈ ('Básico','Intermedio','Avanzado')

DO $$
DECLARE
  v_scenario_id INT;
BEGIN
  -- Buscar escenario por título
  SELECT id INTO v_scenario_id
  FROM public.scenarios
  WHERE title = 'Traumatismo craneoencefálico grave pediátrico'
  LIMIT 1;

  IF v_scenario_id IS NULL THEN
    -- Intentar con 'Borrador'; si constraint aún no actualizado, fallback a 'En construcción: en proceso'
    BEGIN
      INSERT INTO public.scenarios (title, summary, status, mode, level, difficulty, estimated_minutes, max_attempts)
      VALUES (
        'Traumatismo craneoencefálico grave pediátrico',
        'Niño de 8 años con traumatismo craneal severo tras caída. Llegada reciente a área de reanimación. Requiere valoración ABC rápida y preparación para posibles intervenciones avanzadas.',
        'Borrador',
        ARRAY['presencial','online'],
        'avanzado',
        'Intermedio',
        25,
        3
      )
      RETURNING id INTO v_scenario_id;
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM LIKE '%scenarios_status_check%' THEN
        INSERT INTO public.scenarios (title, summary, status, mode, level, difficulty, estimated_minutes, max_attempts)
        VALUES (
          'Traumatismo craneoencefálico grave pediátrico',
          'Niño de 8 años con traumatismo craneal severo tras caída. Llegada reciente a área de reanimación. Requiere valoración ABC rápida y preparación para posibles intervenciones avanzadas.',
          'En construcción: en proceso',
          ARRAY['presencial','online'],
          'avanzado',
          'Intermedio',
          25,
          3
        )
        RETURNING id INTO v_scenario_id;
      ELSE
        RAISE;
      END IF;
    END;
  ELSE
    -- Actualizar; mismo fallback por si constraint aún no acepta 'Borrador'
    BEGIN
      UPDATE public.scenarios
      SET summary = 'Niño de 8 años con traumatismo craneal severo tras caída. Llegada reciente a área de reanimación. Requiere valoración ABC rápida y preparación para posibles intervenciones avanzadas.',
          status = 'Borrador',
          mode = ARRAY['presencial','online'],
          level = 'avanzado',
          difficulty = 'Intermedio',
          estimated_minutes = 25,
          max_attempts = 3
      WHERE id = v_scenario_id;
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM LIKE '%scenarios_status_check%' THEN
        UPDATE public.scenarios
        SET summary = 'Niño de 8 años con traumatismo craneal severo tras caída. Llegada reciente a área de reanimación. Requiere valoración ABC rápida y preparación para posibles intervenciones avanzadas.',
            status = 'En construcción: en proceso',
            mode = ARRAY['presencial','online'],
            level = 'avanzado',
            difficulty = 'Intermedio',
            estimated_minutes = 25,
            max_attempts = 3
        WHERE id = v_scenario_id;
      ELSE
        RAISE;
      END IF;
    END;
  END IF;

  -- Upsert meta presencial
  INSERT INTO public.scenario_presencial_meta (
    scenario_id,
    dual_mode,
    instructor_brief,
    student_brief,
    room_layout,
    roles_required,
    checklist_template,
    triggers
  ) VALUES (
    v_scenario_id,
    true,
    $INSTRUCTOR$Niño de 8 años con traumatismo craneoencefálico tras caída. Ingreso al área de reanimación; equipo debe priorizar ABC y preparación para intervenciones avanzadas si empeora. Objetivos instructor: supervisión de la priorización y manejo del equipo.$INSTRUCTOR$,
    $STUDENT$Breve: participante del equipo de reanimación pediátrica; estabiliza ABC y decide intervenciones prioritarias.$STUDENT$,
    '{"stations":[{"id":"A","label":"Reanimación"},{"id":"B","label":"Farmacología"},{"id":"C","label":"Monitorización"}]}'::jsonb,
    '[{"role":"medico","min":1,"max":2},{"role":"enfermeria","min":1,"max":2},{"role":"farmacia","min":1,"max":1}]'::jsonb,
    '[{"group":"Primario","items":[{"label":"Asegurar protección cervical","type":"bool"},{"label":"Evaluar Glasgow inicial","type":"bool"},{"label":"Valoración pupilas","type":"bool"},{"label":"Plan intubación si Glasgow ≤8","type":"bool"}]},{"group":"Ventilación","items":[{"label":"Preparar secuencia rápida","type":"bool"},{"label":"Capnografía post intubación","type":"bool"},{"label":"Mantener EtCO2 35-40","type":"bool"}]},{"group":"Neuroprotección","items":[{"label":"Evitar hipotensión (PA > P5)","type":"bool"},{"label":"Sat > 94%","type":"bool"},{"label":"Considerar manitol/SS hipertónica si anisocoria","type":"bool"}]}]'::jsonb,
    '[{"event":"time_elapsed","minutes":5,"action":"show_alert","message":"Revalúa Glasgow y pupilas"},{"event":"time_elapsed","minutes":10,"action":"show_alert","message":"Verifica parámetros ventilatorios"},{"event":"variable_change","variable":"sat","condition":"<92","action":"show_alert","message":"Optimiza oxigenación"},{"event":"variable_change","variable":"glasgow","condition":"<=5","action":"show_alert","message":"Prepara tratamiento osmótico"}]'::jsonb
  )
  ON CONFLICT (scenario_id) DO UPDATE SET
    dual_mode = EXCLUDED.dual_mode,
    instructor_brief = EXCLUDED.instructor_brief,
    student_brief = EXCLUDED.student_brief,
    room_layout = EXCLUDED.room_layout,
    roles_required = EXCLUDED.roles_required,
    checklist_template = EXCLUDED.checklist_template,
    triggers = EXCLUDED.triggers;

  -- Equipamiento crítico (insertar sólo si no existe para evitar duplicados)
  WITH eq AS (
    SELECT * FROM (VALUES
      ('Collar cervical',2,'A','inmovilizacion',true,NULL),
      ('Tabla rígida pediátrica',1,'A','inmovilizacion',true,NULL),
      ('Monitor multiparámetros',1,'C','monitorizacion',true,'Incluye capnografía'),
      ('Equipo intubación pediátrica completo',1,'A','via_aerea',true,'Laringoscopio, tubos 5.5 y 6.0, guía, jeringa cuff'),
      ('Oxímetro pulso',1,'C','monitorizacion',true,NULL),
      ('Capnógrafo',1,'C','monitorizacion',true,'EtCO2 objetivo 35-40'),
      ('Fluidos cristaloides isotónicos',2,'B','farmacologia',true,'Evitar sobrecarga; mantener perfusión'),
      ('Manitol 20%',2,'B','farmacologia',false,'Uso si signos de HTIC (anisocoria / caída Glasgow)'),
      ('Solución salina hipertónica 3%',2,'B','farmacologia',false,'Alternativa a manitol'),
      ('Material inmovilización adicional',1,'A','inmovilizacion',false,'Cintas, cuñas laterales'),
      ('Ventilador mecánico pediátrico',1,'A','via_aerea',true,'Preparado para modo volumen control'),
      ('Bolsas de reanimación (AMBU pediátrico)',1,'A','via_aerea',true,NULL),
      ('Jeringas y medicación sedación (midazolam, fentanilo)',1,'B','farmacologia',true,'Ajuste por peso')
    ) AS t(name,quantity,location,category,required,notes)
  )
  INSERT INTO public.scenario_equipment (scenario_id,name,quantity,location,category,required,notes)
  SELECT v_scenario_id, e.name, e.quantity, e.location, e.category, e.required, e.notes
  FROM eq e
  WHERE NOT EXISTS (
    SELECT 1 FROM public.scenario_equipment se
    WHERE se.scenario_id = v_scenario_id AND se.name = e.name
  );

  RAISE NOTICE 'Seed aplicado. scenario_id=%', v_scenario_id;
END $$;

-- NOTA: Añadir pasos clínicos y preguntas mediante editores UI (scenario_steps, questions) tras validar este seed.
