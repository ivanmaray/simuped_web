-- Seed: Escenario TCE grave pediátrico (modo presencial + online)
-- Fecha: 2025-11-15
-- Ajusta textos clínicos antes de publicar en producción.

WITH inserted AS (
  INSERT INTO public.scenarios (title, summary, status, mode, level, difficulty, estimated_minutes, max_attempts)
  VALUES (
    'Traumatismo craneoencefálico grave pediátrico',
    'Niño de 8 años con traumatismo craneal severo tras caída. Llegada reciente a área de reanimación. Requiere valoración ABC rápida y preparación para posibles intervenciones avanzadas.',
    'Borrador',
    ARRAY['presencial','online'],
    'avanzado',
    'intermedio',
    25,
    3
  )
  RETURNING id
)
INSERT INTO public.scenario_presencial_meta (
  scenario_id,
  dual_mode,
  instructor_brief,
  student_brief,
  room_layout,
  roles_required,
  checklist_template,
  triggers
)
SELECT
  id,
  true,
  $$Niño de 8 años con traumatismo craneoencefálico tras caída. Ingreso al área de reanimación; equipo debe priorizar ABC y preparación para intervenciones avanzadas si empeora. Objetivos instructor: supervisión de la priorización y manejo del equipo.$$,
  $$Breve: participante del equipo de reanimación pediátrica; estabiliza ABC y decide intervenciones prioritarias.$$,
  '{"stations":[{"id":"A","label":"Reanimación"},{"id":"B","label":"Farmacología"},{"id":"C","label":"Monitorización"}]}'::jsonb,
  '[{"role":"medico","min":1,"max":2},{"role":"enfermeria","min":1,"max":2},{"role":"farmacia","min":1,"max":1}]'::jsonb,
  '[{"group":"Primario","items":[{"label":"Asegurar protección cervical","type":"bool"},{"label":"Evaluar Glasgow inicial","type":"bool"},{"label":"Valoración pupilas","type":"bool"},{"label":"Plan intubación si Glasgow ≤8","type":"bool"}]},{"group":"Ventilación","items":[{"label":"Preparar secuencia rápida","type":"bool"},{"label":"Capnografía post intubación","type":"bool"},{"label":"Mantener EtCO2 35-40","type":"bool"}]},{"group":"Neuroprotección","items":[{"label":"Evitar hipotensión (PA > P5)","type":"bool"},{"label":"Sat > 94%","type":"bool"},{"label":"Considerar manitol/SS hipertónica si anisocoria","type":"bool"}]}]'::jsonb,
  '[{"event":"time_elapsed","minutes":5,"action":"show_alert","message":"Revalúa Glasgow y pupilas"},{"event":"time_elapsed","minutes":10,"action":"show_alert","message":"Verifica parámetros ventilatorios"},{"event":"variable_change","variable":"sat","condition":"<92","action":"show_alert","message":"Optimiza oxigenación"},{"event":"variable_change","variable":"glasgow","condition":"<=5","action":"show_alert","message":"Prepara tratamiento osmótico"}]'::jsonb
FROM inserted;

-- Equipamiento crítico asociado
WITH base AS (SELECT id AS scenario_id FROM inserted)
INSERT INTO public.scenario_equipment (scenario_id,name,quantity,location,category,required,notes)
SELECT scenario_id,'Collar cervical',2,'A','inmovilizacion',true,NULL FROM base UNION ALL
SELECT scenario_id,'Tabla rígida pediátrica',1,'A','inmovilizacion',true,NULL FROM base UNION ALL
SELECT scenario_id,'Monitor multiparámetros',1,'C','monitorizacion',true,'Incluye capnografía' FROM base UNION ALL
SELECT scenario_id,'Equipo intubación pediátrica completo',1,'A','via_aerea',true,'Laringoscopio, tubos 5.5 y 6.0, guía, jeringa cuff' FROM base UNION ALL
SELECT scenario_id,'Oxímetro pulso',1,'C','monitorizacion',true,NULL FROM base UNION ALL
SELECT scenario_id,'Capnógrafo',1,'C','monitorizacion',true,'EtCO2 objetivo 35-40' FROM base UNION ALL
SELECT scenario_id,'Fluidos cristaloides isotónicos',2,'B','farmacologia',true,'Evitar sobrecarga; mantener perfusión' FROM base UNION ALL
SELECT scenario_id,'Manitol 20%',2,'B','farmacologia',false,'Uso si signos de HTIC (anisocoria / caída Glasgow)' FROM base UNION ALL
SELECT scenario_id,'Solución salina hipertónica 3%',2,'B','farmacologia',false,'Alternativa a manitol' FROM base UNION ALL
SELECT scenario_id,'Material inmovilización adicional',1,'A','inmovilizacion',false,'Cintas, cuñas laterales' FROM base UNION ALL
SELECT scenario_id,'Ventilador mecánico pediátrico',1,'A','via_aerea',true,'Preparado para modo volumen control' FROM base UNION ALL
SELECT scenario_id,'Bolsas de reanimación (AMBU pediátrico)',1,'A','via_aerea',true,NULL FROM base UNION ALL
SELECT scenario_id,'Jeringas y medicación sedación (midazolam, fentanilo)',1,'B','farmacologia',true,'Ajuste por peso' FROM base;

-- NOTA: Añadir pasos clínicos y preguntas mediante editor existente (scenario_steps, questions) tras validar este seed.
