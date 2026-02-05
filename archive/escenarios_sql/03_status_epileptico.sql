-- ==============================================================================
-- ESCENARIO: Status Epiléptico Refractario (ID 101)
-- ==============================================================================
-- Basado en: Guía SEUP Status Epiléptico 2023, SENEP, NICE Guidelines
-- Este script crea el escenario completo de status epiléptico refractario
-- Incluye: case_brief, 5 steps, 20 preguntas, 4 recursos
-- ==============================================================================

-- ==============================================================================
-- PASO 1: INSERTAR CASE BRIEF
-- ==============================================================================
INSERT INTO case_briefs (
  scenario_id,
  title,
  context,
  chief_complaint,
  history,
  exam,
  vitals,
  quick_labs,
  objectives,
  critical_actions,
  red_flags,
  competencies
) VALUES (
  101,
  'Status Epiléptico Refractario en Niño de 7 Años',
  'Urgencias Pediátricas. Niño de 7 años que acude en ambulancia tras iniciar crisis convulsiva generalizada hace 35 minutos. Los sanitarios de emergencias han administrado 2 dosis de midazolam bucal sin cese de la crisis. El niño continúa con movimientos tónico-clónicos generalizados al llegar a urgencias.',
  'Crisis convulsiva generalizada de >30 minutos de duración refractaria a tratamiento inicial',
  '{"antecedentes": "Niño de 7 años con epilepsia focal conocida (diagnóstico hace 2 años), en tratamiento con ácido valproico 20 mg/kg/día (300 mg/12h). Generalmente buen control de crisis (última hace 6 meses).", "enfermedad_actual": "Familia refiere que olvidó tomar las dosis de ácido valproico de ayer y hoy. Esta tarde, hace 35 minutos, inició crisis generalizada tónico-clónica. No traumatismo craneal. No fiebre. No infección reciente. Peso: 22 kg."}'::jsonb,
  '{"situacion_actual": "Niño en crisis tónico-clónica generalizada continua", "movimientos": "Flexo-extensión de extremidades, desviación ocular, mordedura lingual con sangrado escaso, sialorrea abundante", "cianosis": "Peribucal leve", "via_aerea": "Permeable con cánula orofaríngea", "ventilacion": "Espontánea con SatO2 90% con oxígeno a 15 L/min por mascarilla reservorio", "pulsos": "Palpables", "piel": "Caliente", "traumatismo": "No signos", "glasgow": "No valorable (en crisis)", "peso": "22 kg"}'::jsonb,
  '{"consciencia": "En crisis convulsiva generalizada", "fc": 135, "fr": 28, "tas": 105, "tad": 65, "sao2": 90, "temperatura": "37.2°C", "glasgow": "No valorable durante crisis", "peso": 22, "glucemia_capilar": 105}'::jsonb,
  '{"tratamiento_previo": "Midazolam bucal 10 mg x2 dosis (prehospitalario)", "tiempo_crisis": "35 minutos desde inicio", "acceso_vascular": "No disponible aún", "valproato_nivel": "Pendiente (sospecha niveles bajos por mala adherencia)"}'::jsonb,
  '["Reconocer status epiléptico (crisis >5 min o crisis recurrentes sin recuperación) y definir fase (precoz/establecido/refractario)", "Aplicar tratamiento escalonado: benzodiacepinas IV → fenitoína/valproato IV → fármacos anestésicos (midazolam/propofol/tiopental)", "Asegurar vía aérea, oxigenación y prevenir broncoaspiración", "Canalizar acceso vascular urgente e iniciar monitorización", "Tratar causas precipitantes: comprobar glucemia, corregir alteraciones metabólicas, investigar infección/tóxicos", "Reconocer status refractario (no cede tras 2 líneas de tratamiento) e iniciar perfusión de anestésicos", "Prevenir complicaciones: hipoxia, acidosis, hipertermia, rabdomiólisis"]',
  '["Asegurar ABC: vía aérea permeable (cánula, posición lateral), O2 alto flujo, monitorización continua", "Glucemia capilar inmediata (descartar hipoglucemia como causa tratable)", "Canalizar vía IV/IO urgente (<2-3 min)", "BENZODIACEPINA IV (1ª línea): Midazolam 0.15 mg/kg IV lento o Diazepam 0.25-0.5 mg/kg IV (máx 10 mg)", "Si no cede en 5 min → 2ª LÍNEA: Fenitoína 20 mg/kg IV en 20 min (máx 1000 mg) o Valproato 40 mg/kg IV en 5 min (en este caso preferible por tratamiento basal)", "Si no cede tras 2ª línea (STATUS REFRACTARIO) → 3ª LÍNEA: Midazolam 0.2 mg/kg bolo + perfusión 0.1-0.4 mg/kg/h o Propofol o Tiopental. Contactar UCIP", "Investigar causa: niveles fármacos antiepilépticos, iones, glucosa, tóxicos, infección (TC/PL si indicado TRAS estabilización)", "Prevenir aspiración: posición lateral, aspiración de secreciones, NO administrar nada oral"]',
  '["Crisis convulsiva >5 minutos sin cese (ya es status epiléptico)", "Crisis refractaria a benzodiacepinas y fenitoína/valproato (status refractario → necesidad de anestésicos y UCIP)", "Hipoxia/desaturación durante crisis prolongada", "Hipoglucemia no detectada/tratada", "Acidosis láctica por actividad muscular sostenida", "Hipertermia >38.5°C (riesgo de daño neuronal)", "Rabdomiólisis (CPK elevada, mioglobinuria, fallo renal)", "Administrar fenitoína con carbamazepina o valproato (interacciones/toxicidad)"]',
  '["Reconocimiento y clasificación del status epiléptico por tiempo de evolución", "Algoritmo de tratamiento escalonado del status epiléptico", "Benzodiacepinas, fenitoína, valproato: indicaciones, dosis y velocidad de administración", "Status refractario: definición, criterios de ingreso en UCIP, fármacos anestésicos", "Causas precipitantes de status: infección, mala adherencia, tóxicos, metabólicas", "Prevención de complicaciones del status prolongado"]'
);

-- ==============================================================================
-- PASO 2: INSERTAR STEPS (5 pasos secuenciales)
-- ==============================================================================

-- STEP 1: Valoración Inicial y Estabilización ABC
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  101,
  1,
  'Valoración Inicial y Estabilización ABC',
  'El niño de 7 años llega a tu box de urgencias en ambulancia, en plena crisis convulsiva generalizada tónico-clónica. Los sanitarios informan que lleva 35 minutos en crisis y han administrado 2 dosis de midazolam bucal (10 mg cada una) sin éxito. El niño presenta movimientos de flexo-extensión de extremidades, desviación ocular, sialorrea, cianosis peribucal leve. Vía aérea permeable con cánula orofaríngea. SatO2 90% con O2 a 15 L/min. Pulsos palpables, FC 135 lpm. Glucemia capilar 105 mg/dL. Peso: 22 kg. Antecedente de epilepsia en tratamiento con valproato, con mala adherencia reciente.',
  false
);

-- STEP 2: Primera Línea de Tratamiento
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  101,
  2,
  'Tratamiento de Primera Línea: Benzodiacepinas IV',
  'Has asegurado la vía aérea con cánula orofaríngea, oxígeno a alto flujo (SatO2 ahora 94%), posición lateral de seguridad y aspiración de secreciones. Tu compañero ha canalizado una vía intravenosa periférica calibre 22G en antebrazo derecho. Han transcurrido 38 minutos desde el inicio de la crisis (3 minutos desde la llegada). El niño continúa con actividad convulsiva generalizada. Monitorización: FC 140 lpm, TAS 110 mmHg, SatO2 94%, Temp 37.3°C. Peso: 22 kg.',
  false
);

-- STEP 3: Segunda Línea de Tratamiento
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  101,
  3,
  'Tratamiento de Segunda Línea: Fenitoína o Valproato',
  'Han transcurrido 5 minutos desde la administración de midazolam IV (3.3 mg, dosis 0.15 mg/kg). La crisis convulsiva PERSISTE sin cambios. El niño continúa con movimientos tónico-clónicos generalizados. Han pasado 43 minutos desde el inicio de la crisis. Constantes: FC 138 lpm, TAS 108 mmHg, SatO2 93%, Temp 37.6°C. Dispones de: Fenitoína IV (250 mg ampolla, máx velocidad 1 mg/kg/min) y Ácido Valproico IV (400 mg vial). Recuerdas que el niño está en tratamiento BASAL con ácido valproico oral (300 mg/12h) pero ha incumplido tomas los últimos 2 días. Peso: 22 kg.',
  false
);

-- STEP 4: Status Refractario - Tercera Línea
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  101,
  4,
  'Status Epiléptico Refractario: Anestésicos',
  'Han transcurrido 25 minutos desde el inicio de la perfusión de valproato IV (dosis 880 mg, 40 mg/kg en 5 min, completada hace 20 minutos). La crisis NO ha cesado. El niño continúa con actividad convulsiva generalizada, aunque con menor intensidad. Han pasado 68 minutos desde el inicio de la crisis. Constantes: FC 145 lpm, TAS 100 mmHg, SatO2 91%, Temp 38.2°C (hipertermia). Estamos ante un STATUS EPILÉPTICO REFRACTARIO. Has contactado con UCIP que está preparando cama. Analítica reciente: pH 7.22, Lactato 5.1 mmol/L, CPK 890 U/L (elevada). Dispones de midazolam, propofol y tiopental. Peso: 22 kg.',
  false
);

-- STEP 5: Post-Crisis y Estabilización
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  101,
  5,
  'Cese de Crisis y Cuidados Post-Status',
  'Tras iniciar perfusión de midazolam IV (bolo 4.4 mg + perfusión 2.2 mg/h), la crisis ha CESADO. Han transcurrido 75 minutos desde el inicio. El niño está ahora sin actividad convulsiva, inconsciente (Glasgow 6: O1V1M4), conectado a ventilación con bolsa-mascarilla con buena saturación (SatO2 97%). FC 120 lpm, TAS 95 mmHg, Temp 38.5°C. Continúa perfusión de midazolam. El equipo de UCIP está en camino para traslado. Analítica: Na 138, K 3.2, Glucosa 92, Lactato 4.2, CPK 1200 U/L. Gasometría: pH 7.28, pCO2 48, HCO3 18.',
  false
);

-- ==============================================================================
-- PASO 3: INSERTAR QUESTIONS (20 preguntas distribuidas en los 5 steps)
-- ==============================================================================

-- ======== STEP 1: Valoración Inicial (4 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 1 LIMIT 1),
  '¿A partir de qué tiempo de duración de una crisis convulsiva se considera status epiléptico?',
  '[
    {"text": "Crisis convulsiva >5 minutos o crisis recurrentes sin recuperación de consciencia", "value": "A"},
    {"text": "Crisis convulsiva >30 minutos", "value": "B"},
    {"text": "Crisis convulsiva >1 minuto", "value": "C"},
    {"text": "Solo si hay >3 crisis en 24 horas", "value": "D"}
  ]',
  'A',
  'Se considera STATUS EPILÉPTICO: 1) Crisis convulsiva >5 minutos de duración, o 2) Crisis recurrentes sin recuperación de la consciencia entre ellas. El límite de 5 min se basa en que la mayoría de crisis autolimitadas cesan antes. Antiguamente se usaba 30 min, pero esto retrasaba el tratamiento.',
  true,
  ARRAY['medico'],
  '["Piensa: ¿cuándo iniciar tratamiento activo?", "El umbral de 5 min es para ACTUAR, no para diagnosticar"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 1 LIMIT 1),
  '¿Cuál es tu PRIMERA acción ante este niño en crisis convulsiva prolongada?',
  '[
    {"text": "Asegurar ABC: vía aérea permeable, O2, posición lateral, aspirar secreciones, monitorización, glucemia capilar", "value": "A"},
    {"text": "Administrar benzodiacepina IV inmediatamente", "value": "B"},
    {"text": "Realizar TC cerebral urgente para buscar causa", "value": "C"},
    {"text": "Sujetar al paciente firmemente para evitar que se lesione", "value": "D"}
  ]',
  'A',
  'La PRIORIDAD es ABC: 1) Vía aérea permeable (cánula, aspiración, posición lateral), 2) Oxígeno alto flujo, 3) Monitorización, 4) Glucemia capilar (descartar hipoglucemia). SIMULTÁNEAMENTE canalizar vía IV e iniciar tratamiento antiepiléptico. NO sujetar al paciente (aumenta riesgo de lesiones). La neuroimagen se hará TRAS estabilización.',
  true,
  ARRAY['medico', 'enfermero'],
  '["ABC primero, tratamiento después (pero casi simultáneo)", "Descartar hipoglucemia es crítico"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 1 LIMIT 1),
  '¿Por qué es importante comprobar la glucemia capilar INMEDIATAMENTE en este caso?',
  '[
    {"text": "La hipoglucemia es causa TRATABLE de crisis y debe corregirse urgentemente antes de otros tratamientos", "value": "A"},
    {"text": "Para calcular dosis de fármacos antiepilépticos según glucemia", "value": "B"},
    {"text": "La hiperglucemia empeora las crisis", "value": "C"},
    {"text": "No es prioritaria, se puede medir más tarde", "value": "D"}
  ]',
  'A',
  'La HIPOGLUCEMIA es una causa REVERSIBLE de crisis convulsivas. Debe descartarse/tratarse INMEDIATAMENTE. Si glucemia <60 mg/dL → bolo de glucosa IV urgente (0.5-1 g/kg). En este caso la glucemia es normal (105 mg/dL), por lo que se descarta esta causa y se procede con antiepilépticos.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Piensa en causas tratables (4H y 4T aplican también aquí)", "Glucemia <60 = tratar ANTES de antiepilépticos"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 1 LIMIT 1),
  '¿Qué riesgo asociado a la crisis prolongada justifica el uso de oxígeno a alto flujo?',
  '[
    {"text": "Hipoxia por hipoventilación, aumento del consumo de O2 muscular y posible broncoaspiración", "value": "A"},
    {"text": "Prevenir hipotensión arterial", "value": "B"},
    {"text": "Reducir la temperatura corporal", "value": "C"},
    {"text": "El oxígeno tiene efecto anticonvulsivante directo", "value": "D"}
  ]',
  'A',
  'Durante status epiléptico hay riesgo de HIPOXIA por: 1) Hipoventilación (depresión respiratoria), 2) Aumento consumo O2 muscular (actividad tónico-clónica), 3) Broncoaspiración (secreciones, vómito). La hipoxia empeora el daño neuronal. Por eso es crítico O2 a alto flujo y monitorizar SatO2 continuamente.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Piensa: crisis = hipermetabolismo muscular + riesgo vía aérea", "Objetivo SatO2 >94%"]'::jsonb,
  90
);

-- ======== STEP 2: Primera Línea (4 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 2 LIMIT 1),
  '¿Cuál es el fármaco de PRIMERA LÍNEA en status epiléptico con acceso IV disponible?',
  '[
    {"text": "Benzodiacepina IV: Midazolam 0.15 mg/kg IV o Diazepam 0.25-0.5 mg/kg IV", "value": "A"},
    {"text": "Fenitoína 20 mg/kg IV", "value": "B"},
    {"text": "Ácido valproico 40 mg/kg IV", "value": "C"},
    {"text": "Levetiracetam 60 mg/kg IV", "value": "D"}
  ]',
  'A',
  'Las BENZODIACEPINAS IV son primera línea en status: Midazolam 0.15 mg/kg IV (o 0.2 mg/kg IM si no IV) o Diazepam 0.25-0.5 mg/kg IV (máx 10 mg). Actúan rápidamente (1-3 min) potenciando receptor GABA. Si no hay IV disponible: midazolam bucal/intranasal 0.3-0.5 mg/kg. Fenitoína/Valproato son SEGUNDA línea.',
  true,
  ARRAY['medico'],
  '["Piensa: benzodiacepinas = tratamiento más rápido", "Dosis midazolam IV: 0.15 mg/kg"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 2 LIMIT 1),
  'Este niño pesa 22 kg. ¿Qué dosis de midazolam IV debes administrar?',
  '[
    {"text": "3.3 mg IV (0.15 mg/kg x 22 kg)", "value": "A"},
    {"text": "10 mg IV (dosis fija pediátrica)", "value": "B"},
    {"text": "1 mg IV (dosis mínima)", "value": "C"},
    {"text": "22 mg IV (1 mg/kg)", "value": "D"}
  ]',
  'A',
  'Dosis de midazolam IV en status epiléptico: 0.15 mg/kg. En este niño de 22 kg: 0.15 × 22 = 3.3 mg IV lento (en 1-2 min). Máximo 10 mg. Si no cede en 5 min, se puede repetir una segunda dosis igual. No usar dosis fijas sin calcular según peso en pediatría.',
  true,
  ARRAY['medico'],
  '["Cálculo: 0.15 mg/kg × 22 kg", "Administrar lentamente en 1-2 min"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 2 LIMIT 1),
  '¿Qué efecto adverso de las benzodiacepinas IV debes vigilar especialmente?',
  '[
    {"text": "Depresión respiratoria e hipotensión (especialmente si dosis altas o repetidas)", "value": "A"},
    {"text": "Hipertensión arterial", "value": "B"},
    {"text": "Hiperglucemia", "value": "C"},
    {"text": "Hiperpotasemia", "value": "D"}
  ]',
  'A',
  'Las benzodiacepinas IV pueden causar DEPRESIÓN RESPIRATORIA (especialmente con dosis repetidas o en combinación con otros depresores SNC) e HIPOTENSIÓN. Por eso es crítico: 1) Monitorización continua SatO2, FC, TA, 2) Tener disponible material de ventilación (bolsa-mascarilla, IOT), 3) No superar dosis máximas.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Benzodiacepinas = depresión SNC y respiratoria", "Monitorizar SatO2 y TA continuamente"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 2 LIMIT 1),
  'Si NO tuvieras acceso IV disponible, ¿qué alternativa es aceptable en este niño?',
  '[
    {"text": "Midazolam bucal/intranasal 0.3-0.5 mg/kg (IM 0.2 mg/kg) o Diazepam rectal 0.5 mg/kg", "value": "A"},
    {"text": "Fenitoína intramuscular", "value": "B"},
    {"text": "Esperar a conseguir vía IV antes de tratar", "value": "C"},
    {"text": "Valproato oral triturado por sonda nasogástrica", "value": "D"}
  ]',
  'A',
  'Si NO hay acceso IV: 1) Midazolam BUCAL 0.3-0.5 mg/kg (entre encía y mejilla) o INTRANASAL (mismo rango dosis), 2) Midazolam IM 0.2 mg/kg, 3) Diazepam RECTAL 0.5 mg/kg. NO esperar para tratar. La fenitoína NO se administra IM (cristaliza, necrosis). NO usar vía oral durante crisis (riesgo broncoaspiración).',
  false,
  ARRAY['medico', 'enfermero'],
  '["Midazolam bucal/IM es alternativa segura si no IV", "NUNCA esperar para tratar una crisis >5 min"]'::jsonb,
  120
);

-- ======== STEP 3: Segunda Línea (4 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 3 LIMIT 1),
  'La crisis NO ha cedido tras midazolam IV. ¿Cuál es el siguiente paso (segunda línea)?',
  '[
    {"text": "Fenitoína 20 mg/kg IV o Valproato 40 mg/kg IV o Levetiracetam 60 mg/kg IV", "value": "A"},
    {"text": "Repetir midazolam IV (segunda dosis)", "value": "B"},
    {"text": "Iniciar perfusión de midazolam inmediatamente", "value": "C"},
    {"text": "Esperar 15 minutos más antes de escalar tratamiento", "value": "D"}
  ]',
  'A',
  'Si la crisis NO cede en 5 min tras benzodiacepina → SEGUNDA LÍNEA (fármacos antiepilépticos IV): 1) FENITOÍNA 20 mg/kg IV en 20 min (máx 1 mg/kg/min, máx 1000 mg), 2) VALPROATO 40 mg/kg IV en 5 min, 3) LEVETIRACETAM 60 mg/kg IV en 5-10 min. Elección según FAE basal del paciente y comorbilidades.',
  true,
  ARRAY['medico'],
  '["Segunda línea = antiepilépticos IV de acción prolongada", "Si no cede en 5 min, NO esperar más"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 3 LIMIT 1),
  'Este niño está en tratamiento basal con VALPROATO oral (con mala adherencia). ¿Qué fármaco de 2ª línea es preferible?',
  '[
    {"text": "Ácido Valproico IV 40 mg/kg (880 mg) en 5 minutos", "value": "A"},
    {"text": "Fenitoína 20 mg/kg IV", "value": "B"},
    {"text": "Levetiracetam 60 mg/kg IV", "value": "C"},
    {"text": "Carbamazepina IV", "value": "D"}
  ]',
  'A',
  'En pacientes con tratamiento BASAL con valproato (con mala adherencia/niveles bajos), es preferible administrar VALPROATO IV (dosis carga 40 mg/kg en 5 min) para alcanzar niveles terapéuticos rápidamente. Fenitoína también es válida. Levetiracetam es alternativa si contraindicación a fenitoína/valproato. Carbamazepina NO está disponible IV en España.',
  true,
  ARRAY['medico'],
  '["Paciente ya toma valproato oral → valproato IV lógico", "Dosis: 40 mg/kg = 880 mg en este niño"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 3 LIMIT 1),
  '¿A qué velocidad MÁXIMA puede administrarse la fenitoína IV para evitar efectos adversos?',
  '[
    {"text": "Máximo 1 mg/kg/min (en este niño 22 mg/min, total 20 minutos para dosis completa)", "value": "A"},
    {"text": "Bolo rápido en <2 minutos", "value": "B"},
    {"text": "Máximo 50 mg/min independientemente del peso", "value": "C"},
    {"text": "Perfusión lenta durante 2 horas", "value": "D"}
  ]',
  'A',
  'La fenitoína IV debe administrarse a velocidad MÁXIMA de 1 mg/kg/min (en adultos máx 50 mg/min). Velocidades mayores aumentan riesgo de: 1) Hipotensión, 2) Arritmias cardíacas, 3) Síndrome del guante púrpura (extravasación). Dosis 20 mg/kg → en este niño 440 mg en 20 min. Monitorizar ECG y TA durante infusión.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Fenitoína = LENTA (1 mg/kg/min máx)", "Monitorizar ECG y TA"]'::jsonb,
  120
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 3 LIMIT 1),
  '¿Qué precaución es importante al administrar fenitoína IV?',
  '[
    {"text": "Usar vía venosa exclusiva con suero salino (precipita con glucosa), monitorizar ECG/TA, evitar extravasación", "value": "A"},
    {"text": "Diluir en suero glucosado al 5%", "value": "B"},
    {"text": "Administrar junto con bicarbonato para mejorar absorción", "value": "C"},
    {"text": "No requiere precauciones especiales", "value": "D"}
  ]',
  'A',
  'Precauciones con fenitoína IV: 1) Usar vía IV EXCLUSIVA con SUERO SALINO (precipita con glucosa), 2) Monitorizar ECG y TA continuamente, 3) Evitar extravasación (necrosis tisular), 4) Velocidad ≤1 mg/kg/min. Efectos adversos: hipotensión, arritmias, síndrome del guante púrpura (dolor, edema, coloración violácea si extravasación).',
  false,
  ARRAY['medico', 'enfermero'],
  '["Fenitoína + glucosa = precipitación", "Usar suero salino exclusivamente"]'::jsonb,
  120
);

-- ======== STEP 4: Tercera Línea - Status Refractario (4 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 4 LIMIT 1),
  '¿Cómo se define STATUS EPILÉPTICO REFRACTARIO?',
  '[
    {"text": "Crisis que no cede tras benzodiacepinas + fármaco antiepiléptico de 2ª línea (fenitoína/valproato)", "value": "A"},
    {"text": "Cualquier crisis que dura >30 minutos", "value": "B"},
    {"text": "Crisis que no responde a la primera dosis de benzodiacepina", "value": "C"},
    {"text": "Crisis que requiere ingreso hospitalario", "value": "D"}
  ]',
  'A',
  'STATUS EPILÉPTICO REFRACTARIO: Crisis que NO cede tras tratamiento con: 1) Benzodiacepina adecuada, Y 2) Fármaco antiepiléptico de segunda línea (fenitoína, valproato o levetiracetam). En este punto se requiere TERCERA LÍNEA (anestésicos: midazolam, propofol, tiopental) e ingreso en UCIP con monitorización EEG.',
  true,
  ARRAY['medico'],
  '["Refractario = falla 1ª línea (BZD) + 2ª línea (FAE)", "Requiere anestésicos y UCIP"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 4 LIMIT 1),
  '¿Cuál es el tratamiento de TERCERA LÍNEA en status refractario?',
  '[
    {"text": "Fármacos anestésicos en perfusión continua: Midazolam, Propofol o Tiopental + ingreso UCIP", "value": "A"},
    {"text": "Repetir fenitoína a dosis dobles", "value": "B"},
    {"text": "Administrar corticoides IV", "value": "C"},
    {"text": "Terapia electroconvulsiva", "value": "D"}
  ]',
  'A',
  'Tercera línea en status refractario: ANESTÉSICOS en perfusión continua: 1) MIDAZOLAM: bolo 0.2 mg/kg + perfusión 0.1-0.4 mg/kg/h, 2) PROPOFOL: bolo 2 mg/kg + perfusión 2-10 mg/kg/h, 3) TIOPENTAL: bolo 3-5 mg/kg + perfusión 3-5 mg/kg/h. Requiere: intubación, ventilación mecánica, monitorización EEG continua, ingreso UCIP.',
  true,
  ARRAY['medico'],
  '["Tercera línea = anestésicos (midazolam/propofol/tiopental)", "Requiere UCIP, IOT, EEG continuo"]'::jsonb,
  120
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 4 LIMIT 1),
  'Este niño de 22 kg necesita midazolam en perfusión. ¿Qué dosis inicial de bolo y perfusión debes usar?',
  '[
    {"text": "Bolo: 4.4 mg IV (0.2 mg/kg) + Perfusión: 2.2-8.8 mg/h (0.1-0.4 mg/kg/h)", "value": "A"},
    {"text": "Bolo: 10 mg + Perfusión: 5 mg/h (dosis fija)", "value": "B"},
    {"text": "Solo perfusión sin bolo: 1 mg/h", "value": "C"},
    {"text": "Bolo: 22 mg + Perfusión: 22 mg/h", "value": "D"}
  ]',
  'A',
  'Midazolam en perfusión para status refractario: BOLO 0.2 mg/kg IV (en este niño 0.2 × 22 = 4.4 mg) + PERFUSIÓN 0.1-0.4 mg/kg/h (2.2-8.8 mg/h). Iniciar con dosis bajas (0.1 mg/kg/h) y titular según respuesta clínica/EEG. Objetivo: supresión de actividad convulsiva (clínica y eléctrica en EEG).',
  true,
  ARRAY['medico'],
  '["Bolo: 0.2 mg/kg, Perfusión: 0.1-0.4 mg/kg/h", "Calcular según peso 22 kg"]'::jsonb,
  120
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 4 LIMIT 1),
  '¿Por qué es importante tratar la hipertermia (Tª 38.2°C) en este contexto de status prolongado?',
  '[
    {"text": "La hipertermia aumenta el metabolismo cerebral, consumo de O2 y daño neuronal durante status epiléptico", "value": "A"},
    {"text": "La fiebre es siempre signo de meningitis que requiere antibióticos urgentes", "value": "B"},
    {"text": "La hipertermia empeora la acidosis respiratoria", "value": "C"},
    {"text": "No es relevante, la fiebre es protectora en status", "value": "D"}
  ]',
  'A',
  'La HIPERTERMIA (>38°C) en status epiléptico: 1) Aumenta metabolismo cerebral y consumo de O2 (empeora daño neuronal), 2) Puede ser secundaria a actividad muscular sostenida (no siempre es infección). TRATAMIENTO: 1) Antitérmicos (paracetamol IV/rectal), 2) Medidas físicas (paños tibios, ventilador), 3) Evitar tiamazolam/shivering si se usan anestésicos. Investigar infección si persiste fiebre tras cese de crisis.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Hipertermia = más daño cerebral en status", "Tratar con antitérmicos y medidas físicas"]'::jsonb,
  90
);

-- ======== STEP 5: Post-Crisis (4 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 5 LIMIT 1),
  'Tras cesar la crisis, el niño está inconsciente (Glasgow 6). ¿Qué nivel de consciencia post-ictal es esperable?',
  '[
    {"text": "Es normal un período post-ictal con disminución del nivel de consciencia (somnolencia, confusión) que mejora gradualmente", "value": "A"},
    {"text": "El niño debe despertar inmediatamente al cesar la crisis", "value": "B"},
    {"text": "La inconsciencia persistente indica fracaso del tratamiento", "value": "C"},
    {"text": "La inconsciencia solo ocurre si hay daño cerebral permanente", "value": "D"}
  ]',
  'A',
  'El período POST-ICTAL (tras crisis) se caracteriza por disminución del nivel de consciencia (somnolencia, confusión, desorientación) que mejora GRADUALMENTE en minutos-horas. Es NORMAL y esperado. Factores que prolongan estado post-ictal: 1) Duración de crisis, 2) Fármacos sedantes (benzodiacepinas, anestésicos), 3) Acidosis/hipoxia durante crisis. Vigilar: si NO mejora en horas → TC cerebral, PL si sospecha infección.',
  false,
  ARRAY['medico'],
  '["Post-ictal = somnolencia/confusión normal", "Mejora gradual en horas"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 5 LIMIT 1),
  'La CPK está elevada (1200 U/L). ¿Qué complicación indica y cómo debe tratarse?',
  '[
    {"text": "Rabdomiólisis por actividad muscular sostenida. Tratar con: hidratación IV generosa, alcalinización orina, monitorizar función renal y K+", "value": "A"},
    {"text": "Infarto de miocardio, requiere troponinas y ECG urgente", "value": "B"},
    {"text": "Hepatotoxicidad por fármacos", "value": "C"},
    {"text": "No tiene significado clínico, es normal tras crisis", "value": "D"}
  ]',
  'A',
  'CPK elevada post-status indica RABDOMIÓLISIS (destrucción muscular por actividad tónico-clónica prolongada). Riesgos: 1) Fallo renal agudo (mioglobinuria), 2) Hiperpotasemia. TRATAMIENTO: 1) Fluidoterapia IV GENEROSA (1.5-2× mantenimiento), 2) Alcalinización orina (bicarbonato si pH <7.5, para prevenir precipitación mioglobina), 3) Monitorizar: función renal, iones (K+), CPK, orina (mioglobinuria = orina "coca-cola").',
  false,
  ARRAY['medico'],
  '["CPK alta = rabdomiólisis = riesgo renal", "Hidratar generosamente + alcalinizar orina"]'::jsonb,
  120
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 5 LIMIT 1),
  'La gasometría muestra acidosis metabólica (pH 7.28, HCO3 18, Lactato 4.2). ¿Cuál es la causa y el tratamiento?',
  '[
    {"text": "Acidosis láctica por metabolismo anaerobio muscular durante crisis. Tratamiento: HIDRATACIÓN, cese de crisis, O2. NO bicarbonato salvo pH <7.1", "value": "A"},
    {"text": "Cetoacidosis diabética, requiere insulina IV", "value": "B"},
    {"text": "Requiere bicarbonato IV inmediato independientemente del pH", "value": "C"},
    {"text": "Acidosis respiratoria, requiere ventilación mecánica urgente", "value": "D"}
  ]',
  'A',
  'La acidosis metabólica con LACTATO ELEVADO post-status epiléptico es por: 1) Metabolismo anaerobio muscular (actividad tónico-clónica sostenida), 2) Hipoperfusión tisular. TRATAMIENTO: 1) HIDRATACIÓN IV, 2) Oxigenación, 3) Cese de crisis (ya logrado). La acidosis se AUTOCORRIGE en horas. NO usar bicarbonato salvo acidosis severa (pH <7.1) porque empeora acidosis intracelular.',
  false,
  ARRAY['medico'],
  '["Lactato alto = metabolismo anaerobio muscular", "Se autocorrige con hidratación, NO bicarbonato (salvo pH <7.1)"]'::jsonb,
  120
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 101 AND step_order = 5 LIMIT 1),
  '¿Cuál es la causa MÁS probable del status epiléptico en este niño con epilepsia conocida?',
  '[
    {"text": "MALA ADHERENCIA al tratamiento antiepiléptico (olvidó tomas de valproato 2 días)", "value": "A"},
    {"text": "Meningitis bacteriana aguda", "value": "B"},
    {"text": "Tumor cerebral de nuevo diagnóstico", "value": "C"},
    {"text": "Intoxicación por fármacos", "value": "D"}
  ]',
  'A',
  'La causa MÁS probable en este caso es MALA ADHERENCIA terapéutica (abandonó valproato × 2 días → niveles subterapéuticos → crisis). Es la causa MÁS FRECUENTE de status en pacientes epilépticos conocidos. Otras causas: infección (fiebre), privación de sueño, tóxicos, cambios medicación. Tras estabilización: determinar niveles de FAE, investigar factores precipitantes, reforzar adherencia.',
  false,
  ARRAY['medico'],
  '["Paciente epiléptico + abandono tratamiento = causa clásica", "Determinar niveles valproato tras estabilización"]'::jsonb,
  90
);

-- ==============================================================================
-- PASO 4: INSERTAR CASE RESOURCES (4 recursos bibliográficos)
-- ==============================================================================

INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
VALUES
  (
    101,
    'Protocolo de Status Epiléptico - Sociedad Española de Urgencias Pediátricas (SEUP)',
    'Protocolo',
    'https://seup.org/pdf_public/pub/protocolos/status_epileptico.pdf',
    'SEUP - Sociedad Española de Urgencias Pediátricas',
    2023,
    true
  ),
  (
    101,
    'Guía Clínica de Status Epiléptico en Pediatría - Sociedad Española de Neurología Pediátrica (SENEP)',
    'Guía clínica',
    'https://www.senep.es/guias-clinicas/status-epileptico/',
    'SENEP - Sociedad Española de Neurología Pediátrica',
    2022,
    true
  ),
  (
    101,
    'NICE Guidelines: Epilepsies in children, young people and adults (NG217)',
    'Guía clínica',
    'https://www.nice.org.uk/guidance/ng217',
    'NICE - National Institute for Health and Care Excellence',
    2022,
    true
  ),
  (
    101,
    'Brophy GM et al. Guidelines for the Evaluation and Management of Status Epilepticus',
    'Artículo científico',
    'https://pubmed.ncbi.nlm.nih.gov/22528274/',
    'Neurocritical Care, 2012;17(1):3-23',
    2012,
    false
  );

-- ==============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- ==============================================================================

SELECT 
  s.id,
  s.title,
  (SELECT COUNT(*) FROM case_briefs cb WHERE cb.scenario_id = s.id) as briefing_count,
  (SELECT COUNT(*) FROM steps st WHERE st.scenario_id = s.id) as steps_count,
  (SELECT COUNT(*) FROM questions q 
   JOIN steps st ON q.step_id = st.id 
   WHERE st.scenario_id = s.id) as questions_count,
  (SELECT COUNT(*) FROM case_resources cr WHERE cr.scenario_id = s.id) as resources_count
FROM scenarios s
WHERE s.id = 101;

-- Resultado esperado: briefing_count=1, steps_count=5, questions_count=20, resources_count=4
