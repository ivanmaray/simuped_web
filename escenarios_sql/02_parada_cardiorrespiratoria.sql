-- ==============================================================================
-- ESCENARIO: Parada Cardiorrespiratoria Pediátrica (ID 100)
-- ==============================================================================
-- Basado en: European Resuscitation Council Guidelines 2021, ILCOR 2020
-- Este script crea el escenario completo de parada cardiorrespiratoria
-- Incluye: case_brief, 5 steps, 22 preguntas, 4 recursos
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
  100,
  'Parada Cardiorrespiratoria en Niño de 4 Años',
  'Centro de Salud periférico. Niño de 4 años que acude por cuadro respiratorio de 3 días de evolución. Durante la exploración en consulta, el niño presenta deterioro brusco con pérdida de consciencia, cianosis y ausencia de respiración efectiva.',
  'Niño de 4 años con deterioro respiratorio súbito y pérdida de consciencia',
  '{"antecedentes": "Niño de 4 años previamente sano, vacunación completa. No broncoespasmo ni alergias conocidas.", "enfermedad_actual": "Cuadro catarral de 3 días con tos, rinorrea y febrícula. Esta mañana empeoramiento con aumento de dificultad respiratoria, rechazo de alimentación y decaimiento. Durante exploración inicial presenta deterioro súbito: cianosis generalizada, pérdida de consciencia y ausencia de respiración efectiva. No ingesta de cuerpos extraños ni traumatismos."}'::jsonb,
  '{"situacion_inicial": "Niño inconsciente en decúbito supino, cianótico", "respuesta": "No responde a estímulos", "via_aerea": "Permeable tras extensión de cabeza", "respiracion": "No hay movimientos respiratorios visibles", "pulso": "No se palpa pulso carotídeo tras 10 segundos", "piel": "Fría y pálida", "peso": "16 kg"}'::jsonb,
  '{"consciencia": "Inconsciente, no responde a estímulos", "respiracion": "Ausente (apnea)", "pulso_carotideo": "No palpable", "fc": "0 lpm (asistolia/AESP)", "sao2": "No medible inicialmente", "temperatura": "36.8°C", "peso": 16, "glasgow": 3}'::jsonb,
  '{"ritmo_inicial": "Se desconoce hasta conexión de monitor/desfibrilador", "acceso_vascular": "No disponible inicialmente", "glucemia": "Pendiente (realizar tras obtener acceso)", "gasometria": "Pendiente"}'::jsonb,
  '["Reconocer parada cardiorrespiratoria y activar código de parada", "Iniciar RCP de alta calidad: compresiones torácicas efectivas (100-120 lpm, profundidad 1/3 del diámetro torácico)", "Mantener relación compresiones:ventilaciones 15:2 (2 reanimadores) o 30:2 (1 reanimador)", "Minimizar interrupciones de compresiones (<10 segundos)", "Analizar ritmo y aplicar desfibrilación si ritmo desfibrilable (FV/TV sin pulso)", "Administrar adrenalina IV/IO según algoritmo (cada 3-5 minutos)", "Asegurar vía aérea avanzada y ventilación efectiva", "Identificar y tratar causas reversibles (4H y 4T)"]'::jsonb,
  '["Iniciar compresiones torácicas en <10 segundos tras reconocer PCR", "RCP de ALTA CALIDAD: compresiones a 100-120 lpm, profundidad suficiente (1/3 diámetro AP o 5 cm), reexpansión torácica completa, minimizar interrupciones", "Relación compresiones:ventilaciones 15:2 con 2 reanimadores (30:2 si solo 1)", "Conectar monitor/desfibrilador lo antes posible (análisis de ritmo cada 2 minutos)", "Desfibrilación inmediata (4 J/kg) si FV/TV sin pulso, seguida de RCP inmediata 2 min", "Adrenalina 10 mcg/kg (0.1 mL/kg de 1:10.000) IV/IO: cada 3-5 min en ritmo no desfibrilable, tras 2ª descarga en ritmo desfibrilable", "Vía aérea avanzada (IOT) sin interrumpir compresiones >10 seg, ventilar 10 rpm tras IOT", "Buscar y tratar causas reversibles (4H: hipoxia, hipovolemia, hiper/hipoK, hipotermia; 4T: neumotórax a tensión, taponamiento, tóxicos, tromboembolismo)"]'::jsonb,
  '["Ritmo desfibrilable (FV/TV sin pulso) no tratado con desfibrilación inmediata", "Compresiones torácicas inadecuadas (frecuencia <100 o >120, profundidad insuficiente, interrupciones prolongadas)", "Retraso en administración de adrenalina (>5 min en AESP/asistolia)", "Hipoxia por ventilación inadecuada o desconexión del oxígeno", "Hiperventilación (frecuencia >10 rpm tras IOT)", "No identificar causas reversibles tratables (neumotórax a tensión, hipoglucemia, etc.)"]'::jsonb,
  '["Soporte vital avanzado pediátrico (SVAP)", "Algoritmo de RCP pediátrica según ERC/ILCOR", "Técnica de compresiones torácicas y ventilación con bolsa-mascarilla", "Desfibrilación y cardioversión en pediatría", "Vía intraósea y administración de fármacos en PCR", "Identificación y tratamiento de causas reversibles (4H y 4T)"]'::jsonb
);

-- ==============================================================================
-- PASO 2: INSERTAR STEPS (5 pasos secuenciales)
-- ==============================================================================

-- STEP 1: Reconocimiento y Activación
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  100,
  1,
  'Reconocimiento y Activación de Código de Parada',
  'Estás en consulta de pediatría de un centro de salud. Un niño de 4 años que estabas valorando por cuadro respiratorio presenta súbitamente deterioro grave: pierde la consciencia, presenta cianosis generalizada y deja de respirar. El niño cae al suelo. Compruebas que no responde a estímulos verbales ni táctiles. Abres la vía aérea con maniobra frente-mentón y observas que no hay movimientos respiratorios. Compruebas el pulso carotídeo durante 10 segundos: no lo palpas. Peso estimado del niño: 16 kg.',
  false
);

-- STEP 2: RCP Básica Inicial
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  100,
  2,
  'RCP Básica: Compresiones y Ventilación',
  'Has activado el código de parada. Tu compañero enfermero acude de inmediato. Inicias compresiones torácicas en el centro del tórax del niño mientras tu compañero prepara el material de RCP. El niño permanece inconsciente, sin respiración espontánea y sin pulso. Dispones de bolsa autoinflable con reservorio, mascarilla facial pediátrica, oxígeno a alto flujo, cánulas orofaríngeas y material de aspiración. Han transcurrido 15 segundos desde el reconocimiento de la PCR.',
  false
);

-- STEP 3: Análisis de Ritmo y Desfibrilación
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  100,
  3,
  'Análisis de Ritmo y Tratamiento Eléctrico',
  'Tras 2 minutos de RCP de alta calidad (compresiones + ventilaciones 15:2), conectáis el monitor/desfibrilador con parches autoadhesivos pediátricos. El análisis de ritmo muestra: FIBRILACIÓN VENTRICULAR. El niño continúa en parada cardiorrespiratoria. No hay pulso palpable. Peso del niño: 16 kg. Disponéis de desfibrilador bifásico.',
  false
);

-- STEP 4: Soporte Vital Avanzado y Fármacos
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  100,
  4,
  'Soporte Vital Avanzado: Vía Venosa y Fármacos',
  'Tras la primera desfibrilación (64 J) y 2 minutos de RCP, se analiza nuevamente el ritmo: persiste FIBRILACIÓN VENTRICULAR. No hay pulso. Tu compañero ha conseguido canalizar una vía intraósea en tibia proximal. Habéis realizado IOT con tubo 5.0 mm sin complicaciones. Continúan las compresiones torácicas ininterrumpidas a frecuencia de 100-120 lpm. La ventilación con bolsa conectada al tubo es efectiva (expansión torácica bilateral, SatO2 92%). Han transcurrido aproximadamente 5 minutos desde el inicio de la parada. Peso: 16 kg.',
  false
);

-- STEP 5: Tratamiento de Causas Reversibles y Reevaluación
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  100,
  5,
  'Búsqueda de Causas Reversibles y Reevaluación',
  'Tras la segunda desfibrilación, administración de adrenalina IV y 2 minutos adicionales de RCP (total ~8 minutos), se analiza nuevamente el ritmo: ahora muestra RITMO SINUSAL a 110 lpm. Compruebas pulso carotídeo: es palpable, débil. El niño permanece inconsciente, conectado a ventilación mecánica. SatO2 94%, TAS palpable ~80 mmHg. La glucemia capilar es de 45 mg/dL. El niño comienza a presentar movimientos espontáneos leves. Habéis conseguido recuperación de circulación espontánea (RCE).',
  false
);

-- ==============================================================================
-- PASO 3: INSERTAR QUESTIONS (22 preguntas distribuidas en los 5 steps)
-- ==============================================================================

-- ======== STEP 1: Reconocimiento y Activación (4 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 1 LIMIT 1),
  '¿Cómo confirmas que el niño está en parada cardiorrespiratoria?',
  '[
    {"text": "Ausencia de consciencia + ausencia de respiración normal + ausencia de pulso carotídeo (<10 seg)", "value": "A"},
    {"text": "Ausencia de consciencia + cianosis", "value": "B"},
    {"text": "Ausencia de respiración únicamente", "value": "C"},
    {"text": "Ausencia de pulso radial", "value": "D"}
  ]',
  'A',
  'La parada cardiorrespiratoria se confirma por: 1) No respuesta a estímulos, 2) Ausencia de respiración normal (apnea o gasping), 3) Ausencia de pulso central (carotídeo en niños, braquial en lactantes) comprobado en <10 segundos. La cianosis sola no define PCR. El pulso radial puede no palparse incluso con circulación presente.',
  true,
  ARRAY['medico', 'enfermero'],
  '["Piensa en los 3 signos clave de PCR", "No tardes >10 seg en comprobar pulso"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 1 LIMIT 1),
  '¿Cuál es tu primera acción tras confirmar la PCR?',
  '[
    {"text": "Solicitar ayuda (activar código de parada) e iniciar RCP inmediata", "value": "A"},
    {"text": "Correr a buscar el desfibrilador antes de iniciar RCP", "value": "B"},
    {"text": "Realizar 5 insuflaciones de rescate antes de compresiones", "value": "C"},
    {"text": "Canalizar vía venosa urgente", "value": "D"}
  ]',
  'A',
  'Ante PCR confirmada: 1) Pedir ayuda/activar código, 2) Iniciar RCP INMEDIATA (compresiones torácicas en <10 seg). Si estás solo, grita para pedir ayuda e inicia RCP. Si hay 2 reanimadores, uno activa código y el otro inicia RCP. Las insuflaciones de rescate solo se recomiendan si presenciaste colapso RESPIRATORIO (ahogamiento, etc.).',
  true,
  ARRAY['medico', 'enfermero'],
  '["Piensa: ¿qué salva vidas en PCR? Las compresiones", "No retrasar inicio de RCP"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 1 LIMIT 1),
  'En un niño de 4 años (16 kg), ¿qué técnica de compresiones torácicas es la adecuada?',
  '[
    {"text": "Compresiones con talón de una sola mano en centro del tórax", "value": "A"},
    {"text": "Compresiones con dos dedos en centro del tórax", "value": "B"},
    {"text": "Compresiones con dos manos (técnica adulto) en centro del tórax", "value": "C"},
    {"text": "Compresiones con técnica de abrazo torácico con dos pulgares", "value": "D"}
  ]',
  'A',
  'En niños de 1-8 años, la técnica recomendada es compresión con TALÓN DE UNA MANO en centro del tórax (o dos manos si el niño es grande o el reanimador es pequeño). La técnica de 2 dedos es para LACTANTES <1 año. La técnica de abrazo con pulgares es para lactantes con 2 reanimadores.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Piensa en la edad: 4 años es niño pequeño", "La técnica varía según edad y tamaño"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 1 LIMIT 1),
  '¿A qué profundidad deben realizarse las compresiones torácicas en este niño de 4 años?',
  '[
    {"text": "Al menos 1/3 del diámetro anteroposterior del tórax (aproximadamente 5 cm)", "value": "A"},
    {"text": "2-3 cm", "value": "C"},
    {"text": "6-7 cm como en adultos", "value": "B"},
    {"text": "Lo más superficial posible para evitar lesiones", "value": "D"}
  ]',
  'A',
  'Las compresiones deben hundir el tórax al menos 1/3 del diámetro anteroposterior (~5 cm en niños, ~4 cm en lactantes). Profundidad insuficiente es un error muy frecuente. Debe permitirse reexpansión completa entre compresiones sin despegar las manos del tórax.',
  true,
  ARRAY['medico', 'enfermero'],
  '["Piensa: \"comprimir fuerte\" es mejor que \"comprimir poco\"", "Al menos 1/3 del diámetro torácico"]'::jsonb,
  90
);

-- ======== STEP 2: RCP Básica (5 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 2 LIMIT 1),
  'Sois 2 reanimadores (tú y enfermero). ¿Qué relación compresiones:ventilaciones debéis mantener?',
  '[
    {"text": "15 compresiones : 2 ventilaciones", "value": "A"},
    {"text": "30 compresiones : 2 ventilaciones", "value": "B"},
    {"text": "Compresiones continuas sin pausas para ventilar", "value": "C"},
    {"text": "5 compresiones : 1 ventilación", "value": "D"}
  ]',
  'A',
  'Con DOS reanimadores en RCP pediátrica, la relación es 15:2. Con UN SOLO reanimador, se usa 30:2 (como adultos). La relación 15:2 prioriza la ventilación en niños (PCR generalmente de origen respiratorio). Tras IOT se realizan compresiones continuas a 100-120 lpm + ventilaciones a 10 rpm asíncronas.',
  true,
  ARRAY['medico', 'enfermero'],
  '["Sois 2 reanimadores", "En pediatría 15:2 con 2 personas"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 2 LIMIT 1),
  '¿A qué frecuencia deben realizarse las compresiones torácicas?',
  '[
    {"text": "100-120 compresiones por minuto", "value": "A"},
    {"text": "80-100 compresiones por minuto", "value": "B"},
    {"text": "120-140 compresiones por minuto", "value": "C"},
    {"text": "60-80 compresiones por minuto", "value": "D"}
  ]',
  'A',
  'La frecuencia óptima de compresiones es 100-120 por minuto (tanto en adultos como en pediatría). Frecuencias <100 o >120 lpm se asocian con peor pronóstico. Es útil usar metrónomo o seguir ritmo de canciones conocidas (ej: "La Macarena", "Stayin Alive").',
  false,
  ARRAY['medico', 'enfermero'],
  '["Piensa: \"100-120 lpm\" es el estándar internacional", "Aprox. 2 compresiones por segundo"]'::jsonb,
  60
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 2 LIMIT 1),
  '¿Cómo deben administrarse las 2 ventilaciones con bolsa-mascarilla en cada ciclo?',
  '[
    {"text": "1 segundo cada insuflación, volumen suficiente para ver elevación torácica visible", "value": "A"},
    {"text": "Insuflaciones rápidas y enérgicas de 2-3 segundos", "value": "B"},
    {"text": "Ventilaciones suaves de <0.5 segundos para evitar distensión gástrica", "value": "C"},
    {"text": "No ventilar, solo compresiones continuas", "value": "D"}
  ]',
  'A',
  'Cada ventilación debe durar ~1 segundo, con volumen SUFICIENTE para producir elevación torácica VISIBLE (no excesiva). Evitar ventilaciones demasiado rápidas o con excesivo volumen (riesgo de distensión gástrica, regurgitación, barotrauma). FiO2 100% con bolsa + reservorio.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Objetivo: elevación torácica visible", "Evitar hiperventilación"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 2 LIMIT 1),
  '¿Cuál es el tiempo MÁXIMO aceptable de interrupción de las compresiones torácicas?',
  '[
    {"text": "<10 segundos", "value": "A"},
    {"text": "<20 segundos", "value": "B"},
    {"text": "<30 segundos", "value": "C"},
    {"text": "No importa, se pueden interrumpir lo necesario para ventilar", "value": "D"}
  ]',
  'A',
  'Las interrupciones de compresiones deben ser MÍNIMAS (<10 segundos). Solo se interrumpen para: ventilaciones (si no hay vía aérea avanzada), análisis de ritmo, desfibrilación. Minimizar interrupciones mejora la perfusión coronaria y cerebral, aumentando la supervivencia.',
  true,
  ARRAY['medico', 'enfermero'],
  '["Las compresiones son clave: minimizar pausas", "Objetivo: fracción de compresión >80%"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 2 LIMIT 1),
  '¿Cada cuánto tiempo se debe rotar el reanimador que realiza las compresiones torácicas?',
  '[
    {"text": "Cada 2 minutos (cada ciclo de RCP)", "value": "A"},
    {"text": "Cada 5 minutos", "value": "B"},
    {"text": "Cada 10 minutos", "value": "C"},
    {"text": "No es necesario rotar si no hay fatiga aparente", "value": "D"}
  ]',
  'A',
  'El reanimador que hace compresiones debe ROTAR cada 2 minutos (aprovechando el análisis de ritmo) para evitar fatiga y deterioro de la calidad de RCP. La fatiga reduce profundidad y frecuencia de compresiones, empeorando la efectividad.',
  false,
  ARRAY['medico', 'enfermero'],
  '["La fatiga aparece antes de que el reanimador lo perciba", "Cambio cada 2 min mejora calidad"]'::jsonb,
  90
);

-- ======== STEP 3: Desfibrilación (5 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 3 LIMIT 1),
  'Has identificado FIBRILACIÓN VENTRICULAR. ¿Cuál es la acción PRIORITARIA?',
  '[
    {"text": "Desfibrilación inmediata con 4 J/kg (64 J), seguida de RCP inmediata", "value": "A"},
    {"text": "Administrar adrenalina IV antes de desfibrilar", "value": "B"},
    {"text": "Continuar RCP 2 minutos más antes de desfibrilar", "value": "C"},
    {"text": "Intubar al niño antes de aplicar descarga", "value": "D"}
  ]',
  'A',
  'En FV/TV sin pulso, la desfibrilación INMEDIATA es prioritaria (4 J/kg, si bifásico). Tras descarga, reanudar RCP INMEDIATAMENTE durante 2 minutos sin comprobar ritmo ni pulso. La adrenalina se administra DESPUÉS de la segunda descarga fallida. No retrasar desfibrilación.',
  true,
  ARRAY['medico'],
  '["FV/TV = ritmo desfibrilable = choque YA", "Peso 16 kg → 4 J/kg = 64 J"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 3 LIMIT 1),
  '¿Qué energía de desfibrilación debes seleccionar para la primera descarga en este niño de 16 kg?',
  '[
    {"text": "64 Julios (4 J/kg)", "value": "A"},
    {"text": "32 Julios (2 J/kg)", "value": "B"},
    {"text": "100 Julios (dosis fija pediátrica)", "value": "C"},
    {"text": "200 Julios (dosis adulto)", "value": "D"}
  ]',
  'A',
  'La dosis de desfibrilación inicial es 4 J/kg (bifásico o monofásico). Peso 16 kg → 4 × 16 = 64 J. Las dosis subsiguientes pueden aumentarse a 4 J/kg o considerar hasta 8-10 J/kg (máximo 200 J adultos). No usar dosis fijas en pediatría sin calcular según peso.',
  true,
  ARRAY['medico'],
  '["Primera descarga: 4 J/kg", "Calcular: 4 × 16 kg = 64 J"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 3 LIMIT 1),
  'Tras aplicar la descarga de 64 J, ¿qué debes hacer INMEDIATAMENTE?',
  '[
    {"text": "Reanudar RCP (compresiones + ventilaciones) durante 2 minutos SIN comprobar ritmo ni pulso", "value": "A"},
    {"text": "Comprobar pulso y ritmo en el monitor", "value": "B"},
    {"text": "Aplicar segunda descarga inmediata si persiste FV", "value": "C"},
    {"text": "Administrar adrenalina IV y comprobar glucemia", "value": "D"}
  ]',
  'A',
  'Tras desfibrilación, reanudar RCP INMEDIATAMENTE sin comprobar ritmo ni pulso (para minimizar interrupción de compresiones). Continuar 2 minutos completos. Después se reevalúa ritmo. Incluso si la descarga fue exitosa, el miocardio necesita perfusión (compresiones) para recuperarse.',
  true,
  ARRAY['medico', 'enfermero'],
  '["No perder tiempo comprobando ritmo/pulso tras descarga", "RCP inmediata 2 minutos"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 3 LIMIT 1),
  '¿Cuáles son los ritmos DESFIBRILABLES en parada cardiorrespiratoria?',
  '[
    {"text": "Fibrilación ventricular (FV) y taquicardia ventricular sin pulso (TV sin pulso)", "value": "A"},
    {"text": "Asistolia y actividad eléctrica sin pulso (AESP)", "value": "B"},
    {"text": "Bradicardia extrema <40 lpm", "value": "C"},
    {"text": "Todos los ritmos en PCR requieren desfibrilación", "value": "D"}
  ]',
  'A',
  'Los ritmos DESFIBRILABLES son: Fibrilación Ventricular (FV) y Taquicardia Ventricular sin pulso (TV sin pulso). Los ritmos NO desfibrilables son: Asistolia y Actividad Eléctrica Sin Pulso (AESP). En ritmos no desfibrilables NO se aplica descarga, solo RCP + adrenalina.',
  false,
  ARRAY['medico'],
  '["Solo FV y TV sin pulso se desfibr plan", "Asistolia/AESP NO se desfibr plan"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 3 LIMIT 1),
  '¿Cada cuánto tiempo debe analizarse el ritmo cardíaco durante la RCP?',
  '[
    {"text": "Cada 2 minutos (cada ciclo de RCP)", "value": "A"},
    {"text": "Cada minuto", "value": "B"},
    {"text": "Cada 5 minutos", "value": "C"},
    {"text": "Solo al inicio y tras cada desfibrilación", "value": "D"}
  ]',
  'A',
  'El ritmo se analiza cada 2 minutos (cada ciclo de RCP). Si ritmo desfibrilable → descarga + RCP 2 min. Si ritmo no desfibrilable → RCP 2 min + fármacos. Minimizar interrupciones para análisis (<5 seg). El análisis continuo interrumpe las compresiones innecesariamente.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Ciclos de 2 minutos de RCP", "Reevaluar ritmo cada 2 min"]'::jsonb,
  90
);

-- ======== STEP 4: Fármacos y Vía Avanzada (4 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 4 LIMIT 1),
  'Persiste FV tras segunda descarga. ¿Cuándo y qué dosis de adrenalina debes administrar?',
  '[
    {"text": "AHORA (tras 2ª descarga fallida): Adrenalina 10 mcg/kg IV/IO (0.1 mL/kg de 1:10.000)", "value": "A"},
    {"text": "Esperar a 3ª descarga fallida: Adrenalina 0.01 mg/kg IV", "value": "B"},
    {"text": "Administrar inmediatamente: Adrenalina 0.1 mg/kg IV (1:1.000)", "value": "C"},
    {"text": "No administrar adrenalina en ritmos desfibrilables", "value": "D"}
  ]',
  'A',
  'En ritmo DESFIBRILABLE (FV/TV), la adrenalina se administra tras la SEGUNDA descarga fallida (después de 2 ciclos de RCP + 2 descargas). Dosis: 10 mcg/kg = 0.1 mL/kg de adrenalina 1:10.000 IV/IO (en este niño: 1.6 mL). Repetir cada 3-5 min. En ritmo NO desfibrilable se da ANTES (inmediatamente tras obtener acceso).',
  true,
  ARRAY['medico'],
  '["Ritmo desfibrilable: adrenalina tras 2ª descarga", "Dosis: 10 mcg/kg = 0.1 mL/kg de 1:10.000"]'::jsonb,
  120
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 4 LIMIT 1),
  '¿Cada cuánto tiempo se repite la dosis de adrenalina durante la RCP?',
  '[
    {"text": "Cada 3-5 minutos (cada 2 ciclos de RCP aproximadamente)", "value": "A"},
    {"text": "Cada 10 minutos", "value": "B"},
    {"text": "Solo una dosis única", "value": "C"},
    {"text": "Cada minuto si persiste PCR", "value": "D"}
  ]',
  'A',
  'La adrenalina se repite cada 3-5 minutos durante toda la RCP (aproximadamente cada 2 ciclos de RCP de 2 minutos). Mantener administración hasta recuperación de circulación espontánea o decisión de suspender RCP.',
  false,
  ARRAY['medico'],
  '["Repetir adrenalina regularmente", "Aprox. cada 2 ciclos = 3-5 min"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 4 LIMIT 1),
  'Habéis realizado IOT. ¿Cómo cambia la técnica de RCP tras asegurar vía aérea avanzada?',
  '[
    {"text": "Compresiones CONTINUAS a 100-120 lpm + ventilaciones a 10 rpm (asíncronas, sin pausas)", "value": "A"},
    {"text": "Mantener ciclos 15:2 como antes de IOT", "value": "B"},
    {"text": "Aumentar ventilaciones a 20-30 rpm para mejorar oxigenación", "value": "C"},
    {"text": "Pausar compresiones cada minuto para ventilar 5 veces", "value": "D"}
  ]',
  'A',
  'Tras IOT (vía aérea avanzada), las compresiones son CONTINUAS a 100-120 lpm SIN pausas para ventilar. Las ventilaciones se dan de forma ASÍNCRONA a 10 respiraciones/minuto (1 cada 6 seg). Evitar hiperventilación (aumenta presión intratorácica, reduce retorno venoso y gasto cardíaco).',
  true,
  ARRAY['medico', 'enfermero'],
  '["Con IOT: compresiones continuas + 10 rpm", "No pausar compresiones para ventilar"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 4 LIMIT 1),
  '¿Qué vía de acceso vascular es aceptable si no se consigue vía intravenosa rápidamente en PCR pediátrica?',
  '[
    {"text": "Vía intraósea (tibia proximal, fémur distal o húmero proximal)", "value": "A"},
    {"text": "Vía intramuscular en deltoides", "value": "B"},
    {"text": "Vía subcutánea en abdomen", "value": "C"},
    {"text": "Vía sublingual", "value": "D"}
  ]',
  'A',
  'Si no se consigue vía IV en 60-90 segundos en PCR, la vía intraósea (IO) es de elección. Todos los fármacos y fluidos de RCP pueden administrarse IO con absorción similar a IV. Sitios: tibia proximal (más frecuente), fémur distal, húmero proximal. Vía endotraqueal solo para adrenalina/atropina en ausencia de IV/IO (dosis 10× mayor, absorción errática).',
  false,
  ARRAY['medico', 'enfermero'],
  '["Vía IO = alternativa segura y rápida a IV en PCR", "Todas las dosis son iguales por IO que por IV"]'::jsonb,
  90
);

-- ======== STEP 5: Causas Reversibles y Post-RCE (4 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 5 LIMIT 1),
  'Has conseguido recuperación de circulación espontánea (RCE). La glucemia es de 45 mg/dL. ¿Qué debes hacer?',
  '[
    {"text": "Administrar bolo de glucosa IV (0.5-1 g/kg = 5-10 mL/kg de glucosa 10% o 2-4 mL/kg de glucosa 25%)", "value": "A"},
    {"text": "Esperar a ver evolución, la hipoglucemia se corregirá sola", "value": "C"},
    {"text": "Administrar glucagón intramuscular", "value": "B"},
    {"text": "Aumentar ritmo de perfusión de sueros con glucosa", "value": "D"}
  ]',
  'A',
  'La hipoglucemia (<60 mg/dL) debe corregirse INMEDIATAMENTE con bolo IV de glucosa: 0.5-1 g/kg (equivalente a 5-10 mL/kg de glucosa 10% o 2-4 mL/kg de glucosa 25%). Peso 16 kg → 80-160 mL de glucosa 10%. Tras bolo, mantener perfusión con glucosa. La hipoglucemia empeora el daño neurológico post-PCR.',
  true,
  ARRAY['medico'],
  '["Hipoglucemia <60 = tratamiento inmediato", "Dosis: 0.5-1 g/kg IV"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 5 LIMIT 1),
  '¿Cuáles son las "4H y 4T" (causas reversibles de PCR) que debes buscar y tratar?',
  '[
    {"text": "4H: Hipoxia, Hipovolemia, Hiper/hipoK+, Hipotermia | 4T: Neumotórax Tensión, Taponamiento, Tóxicos, Tromboembolismo", "value": "A"},
    {"text": "4H: Hipoxia, Hipertensión, Hiperglucemia, Hipotermia | 4T: Taquicardia, Taponamiento, Trauma, Trombosis", "value": "B"},
    {"text": "4H: Hipoxia, Hipoglucemia, Hemorragia, Hipotensión | 4T: Neumotórax, Trauma, Toxinas, Trombosis", "value": "C"},
    {"text": "No es necesario buscar causas durante la RCP, solo aplicar algoritmo", "value": "D"}
  ]',
  'A',
  'Las causas reversibles de PCR son: 4H: Hipoxia, Hipovolemia, Hiper/hipopotasemia (alteraciones iónicas), Hipotermia. 4T: Neumotórax a Tensión, Taponamiento cardíaco, Tóxicos, Tromboembolismo (TEP/coronario). Identificar y tratar estas causas es fundamental para éxito de RCP.',
  false,
  ARRAY['medico'],
  '["Memoriza: 4H y 4T son causas TRATABLES", "Piensa en cada una durante la RCP"]'::jsonb,
  120
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 5 LIMIT 1),
  'En este caso, ¿cuál es la causa más probable de la PCR en un niño con cuadro respiratorio?',
  '[
    {"text": "Hipoxia progresiva por insuficiencia respiratoria (causa respiratoria → PCR)", "value": "A"},
    {"text": "Infarto agudo de miocardio", "value": "B"},
    {"text": "Neumotórax a tensión espontáneo", "value": "C"},
    {"text": "Intoxicación medicamentosa", "value": "D"}
  ]',
  'A',
  'La causa más probable en un niño previamente sano con cuadro respiratorio de 3 días es HIPOXIA por insuficiencia respiratoria progresiva (posible neumonía, bronquiolitis grave, etc.). La mayoría de PCR pediátricas son de origen RESPIRATORIO (hipoxia) o circulatorio (shock). Las causas cardíacas primarias son raras en niños sin cardiopatía.',
  false,
  ARRAY['medico'],
  '["Piensa en el contexto: cuadro respiratorio previo", "La mayoría de PCR pediátricas son respiratorias"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 100 AND step_order = 5 LIMIT 1),
  'Tras RCE, ¿cuál es el objetivo de saturación de oxígeno en este niño?',
  '[
    {"text": "94-98% (normoxemia, evitando hiper e hipoxia)", "value": "A"},
    {"text": "100% (máxima oxigenación posible)", "value": "B"},
    {"text": "88-92% (evitar hiperoxia)", "value": "C"},
    {"text": ">85% es suficiente", "value": "D"}
  ]',
  'A',
  'Tras RCE, el objetivo es NORMOXEMIA: SatO2 94-98% (PaO2 60-100 mmHg en gasometría). Evitar HIPEROXIA (SatO2 100%, PaO2 >100 mmHg) porque aumenta daño neurológico por radicales libres. También evitar hipoxia (SatO2 <94%). Ajustar FiO2 titulando según pulsioximetría/gasometría.',
  false,
  ARRAY['medico'],
  '["Objetivo: normoxemia 94-98%", "Evitar hiperoxia (daño neurológico)"]'::jsonb,
  90
);

-- ==============================================================================
-- PASO 4: INSERTAR CASE RESOURCES (4 recursos bibliográficos)
-- ==============================================================================

INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
VALUES
  (
    100,
    'European Resuscitation Council Guidelines 2021: Paediatric Life Support',
    'Guía clínica',
    'https://cprguidelines.eu/',
    'ERC - European Resuscitation Council',
    2021,
    true
  ),
  (
    100,
    'ILCOR 2020 Consensus on Cardiopulmonary Resuscitation Science with Treatment Recommendations',
    'Consenso científico',
    'https://www.ilcor.org/consensus-2020',
    'ILCOR - International Liaison Committee on Resuscitation',
    2020,
    true
  ),
  (
    100,
    'Recomendaciones de Reanimación Cardiopulmonar Pediátrica - Grupo Español de RCP Pediátrica y Neonatal',
    'Guía clínica',
    'https://www.aeped.es/comite-medicamentos/documentos/recomendaciones-reanimacion-cardiopulmonar-pediatrica',
    'AEP - Asociación Española de Pediatría',
    2022,
    true
  ),
  (
    100,
    'Protocolo de Parada Cardiorrespiratoria Pediátrica SEUP',
    'Protocolo',
    'https://seup.org/pdf_public/pub/protocolos/pcr_pediatrica.pdf',
    'SEUP - Sociedad Española de Urgencias Pediátricas',
    2023,
    true
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
WHERE s.id = 100;

-- Resultado esperado: briefing_count=1, steps_count=5, questions_count=22, resources_count=4
