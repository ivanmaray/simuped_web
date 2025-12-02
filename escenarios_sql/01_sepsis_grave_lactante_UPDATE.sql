-- ==============================================================================
-- ACTUALIZACIÓN ESCENARIO: Sepsis Grave en Lactante (ID 13)
-- ==============================================================================
-- Basado en: Surviving Sepsis Campaign 2020, AEP Guía sepsis pediátrica 2023
-- Este script ACTUALIZA el escenario existente ID=13
-- Incluye: case_brief, 4 steps, 18 preguntas, 4 recursos
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
  13,
  'Sepsis Grave en Lactante de 6 Meses',
  'Servicio de Urgencias Pediátricas. Lactante de 6 meses que acude por fiebre y decaimiento. Los padres refieren que desde hace 12 horas presenta fiebre de hasta 39.5°C, rechazo de tomas y aumento de somnolencia.',
  'Fiebre, decaimiento y rechazo de alimentación en lactante de 6 meses',
  '{"antecedentes": "Lactante de 6 meses previamente sano, correctamente vacunado. Sin antecedentes de interés.", "enfermedad_actual": "Hace 12 horas inició fiebre de hasta 39.5°C que no ha cedido con paracetamol. Progresivamente ha presentado rechazo de biberón, orina escasa (último pañal hace 6 horas) y aumento de somnolencia. No presenta vómitos ni diarrea. No exantema. No contactos enfermos conocidos."}',
  '{"aspecto_general": "Lactante decaído, hipoactivo. Palidez cutáneo-mucosa.", "perfusion": "Frialdad de extremidades con relleno capilar enlentecido (4 segundos)", "respiratorio": "Taquipnea con tiraje intercostal leve. Murmullo vesicular conservado bilateral", "cardiovascular": "Taquicardia rítmica sin soplos", "abdomen": "Blando, depresible, no se palpan masas ni visceromegalias", "neurologico": "Fontanela anterior normotensa. No rigidez de nuca", "piel": "No petequias ni púrpura", "peso": "7.8 kg"}',
  '{"temperatura": "39.2°C", "fc": 180, "fr": 45, "tas": 70, "tad": 40, "sao2": 94, "o2_suplementario": "Aire ambiente", "glasgow": 13, "relleno_capilar": "4 seg", "peso": 7.8}',
  '{"hemograma": {"hb": "10.2 g/dL", "leucocitos": "22.000/μL (80% neutrófilos, 15% cayados)", "plaquetas": "98.000/μL"}, "bioquimica": {"glucosa": "65 mg/dL", "urea": "45 mg/dL", "creatinina": "0.8 mg/dL", "na": "132 mEq/L", "k": "5.2 mEq/L", "pcr": "95 mg/L", "pct": "8.5 ng/mL", "lactato": "4.2 mmol/L"}, "gasometria": {"ph": 7.28, "pco2": 30, "hco3": 14, "eb": -9, "lactato": 4.2}, "coagulacion": {"tp": "15 seg (INR 1.4)", "ttpa": "42 seg"}}',
  '["Reconocer signos de sepsis grave/shock séptico en lactante", "Aplicar fluidoterapia precoz y agresiva (20 mL/kg en 5-10 min, hasta 60 mL/kg en primera hora)", "Iniciar antibioterapia empírica de amplio espectro en la primera hora (cefotaxima ± ampicilina según edad)", "Monitorización hemodinámica continua y reevaluación frecuente", "Considerar ingreso en UCIP si persiste inestabilidad tras expansión inicial"]'::jsonb,
  '["Expansión de volumen con bolos de 20 mL/kg de cristaloides en 5-10 minutos, reevaluando tras cada bolo", "Hemocultivos previos a antibióticos, pero NO retrasar antibioterapia", "Antibioterapia empírica en <1 hora: Cefotaxima 50 mg/kg/dosis IV (lactante <3 meses añadir Ampicilina 50 mg/kg/dosis)", "Valorar necesidad de soporte inotrópico si no responde a 40-60 mL/kg de volumen", "Contactar con UCIP si persiste inestabilidad o hipotensión refractaria", "Monitorización de diuresis, lactato, perfusión periférica"]'::jsonb,
  '["Hipotensión (TAS <70 mmHg en lactante)", "Relleno capilar >3 segundos + taquicardia + alteración del estado mental", "Lactato >2 mmol/L y pH <7.30", "Trombopenia (<100.000 plaquetas)", "Disfunción orgánica: oliguria, alteración de consciencia, coagulopatía", "Necesidad de >40-60 mL/kg de volumen o soporte vasoactivo"]'::jsonb,
  '["Reconocimiento precoz de sepsis y shock séptico", "Manejo inicial de estabilización hemodinámica", "Fluidoterapia en urgencias pediátricas", "Antibioterapia empírica según edad y factores de riesgo", "Monitorización hemodinámica y criterios de derivación a UCIP"]'::jsonb
);

-- ==============================================================================
-- PASO 2: INSERTAR STEPS (4 pasos secuenciales)
-- ==============================================================================

-- STEP 1: Valoración Inicial y Reconocimiento
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  13,
  1,
  'Valoración Inicial y Reconocimiento',
  'Acabas de recibir en el box de críticos a un lactante de 6 meses con fiebre y mal estado general. Los padres refieren fiebre de 12 horas de evolución, rechazo de alimentación y somnolencia progresiva. A la exploración observas palidez, frialdad de extremidades, taquicardia y relleno capilar de 4 segundos. La saturación de oxígeno es del 94% en aire ambiente. El lactante está decaído pero irritable al manipularlo.',
  false
);

-- STEP 2: Estabilización Hemodinámica
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  13,
  2,
  'Estabilización Hemodinámica',
  'Has iniciado monitorización continua. Constantes vitales: FC 180 lpm, FR 45 rpm, TAS 70 mmHg, TAD 40 mmHg, Sat O2 94%, Temperatura 39.2°C, Glasgow 13 (O4V4M5). Peso estimado 7.8 kg. El lactante presenta signos evidentes de mala perfusión periférica. Analítica inicial muestra leucocitosis con desviación izquierda, trombopenia leve, PCR 95 mg/L, PCT 8.5 ng/mL, lactato 4.2 mmol/L, gasometría con acidosis metabólica (pH 7.28, HCO3 14, EB -9).',
  false
);

-- STEP 3: Antibioterapia y Medidas Complementarias
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  13,
  3,
  'Antibioterapia y Medidas Complementarias',
  'Tras administrar el primer bolo de suero fisiológico (160 mL en 10 minutos), has canalizado una segunda vía periférica y extraído hemocultivos. El lactante persiste con FC 175 lpm, TAS 72 mmHg, relleno capilar 3-4 segundos. Han transcurrido 25 minutos desde la llegada a urgencias. El lactante pesa 7.8 kg.',
  false
);

-- STEP 4: Reevaluación y Decisión de Ingreso
INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  13,
  4,
  'Reevaluación y Decisión de Ingreso',
  'Han transcurrido 50 minutos desde la llegada. El lactante ha recibido un total de 400 mL de suero fisiológico (aproximadamente 50 mL/kg) en bolos sucesivos y antibioterapia con cefotaxima IV. Constantes actuales: FC 160 lpm, TAS 78 mmHg, TAD 45 mmHg, SatO2 96% (gafas nasales a 2 L/min), Temperatura 38.5°C, relleno capilar 2-3 segundos. El lactante está algo más reactivo pero persiste decaído. Lactato de control 3.1 mmol/L. Diuresis escasa (10 mL en última hora).',
  false
);

-- ==============================================================================
-- PASO 3: INSERTAR QUESTIONS (18 preguntas distribuidas en los 4 steps)
-- ==============================================================================

-- ======== STEP 1: Valoración Inicial (5 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 1 LIMIT 1),
  '¿Cuál es tu primera acción ante este lactante con fiebre y signos de mala perfusión?',
  '[
    {"text": "Solicitar radiografía de tórax y analítica completa antes de iniciar tratamiento", "value": "A"},
    {"text": "Iniciar monitorización continua, canalizar vía periférica y administrar oxígeno", "value": "B"},
    {"text": "Administrar paracetamol IV para bajar la fiebre y esperar evolución", "value": "C"},
    {"text": "Realizar punción lumbar inmediata ante sospecha de meningitis", "value": "D"}
  ]',
  'B',
  'La prioridad en un lactante con signos de shock séptico es la estabilización hemodinámica inmediata: monitorización, acceso vascular, oxígeno. Las exploraciones complementarias NO deben retrasar la fluidoterapia ni la antibioterapia.',
  true,
  ARRAY['medico', 'enfermero'],
  '["Piensa en el ABC (Airway, Breathing, Circulation)", "La estabilización hemodinámica es prioritaria"]'::jsonb,
  120
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 1 LIMIT 1),
  'Según los signos clínicos presentados (relleno capilar 4 seg, taquicardia, palidez, frialdad), ¿cuál es el diagnóstico sindrómico más probable?',
  '[
    {"text": "Shock séptico (distributivo)", "value": "A"},
    {"text": "Shock cardiogénico", "value": "B"},
    {"text": "Deshidratación leve-moderada", "value": "C"},
    {"text": "Bronquiolitis con trabajo respiratorio", "value": "D"}
  ]',
  'A',
  'Los signos de mala perfusión periférica (relleno capilar >3 seg, frialdad, palidez) junto con taquicardia e hipotensión en contexto febril orientan a shock séptico. La deshidratación aislada no explicaría la gravedad del cuadro.',
  true,
  ARRAY['medico'],
  '["Valora la triada: fiebre + mala perfusión + taquicardia", "El contexto febril es clave"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 1 LIMIT 1),
  '¿Qué parámetro hemodinámico es el MÁS sensible para detectar shock séptico precoz en pediatría?',
  '[
    {"text": "Hipotensión arterial (TAS <p5)", "value": "A"},
    {"text": "Alteración de la perfusión periférica (relleno capilar >3 seg)", "value": "B"},
    {"text": "Taquicardia aislada", "value": "C"},
    {"text": "Saturación de oxígeno <95%", "value": "D"}
  ]',
  'B',
  'En pediatría, la alteración de la perfusión periférica (relleno capilar prolongado, frialdad, palidez) aparece ANTES que la hipotensión. La hipotensión es un signo TARDÍO y define shock descompensado. El shock compensado se diagnostica por mala perfusión sin hipotensión.',
  false,
  ARRAY['medico'],
  '["Piensa en shock compensado vs descompensado", "La hipotensión es un signo tardío en niños"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 1 LIMIT 1),
  '¿Qué tipo de shock séptico es más frecuente en lactantes pequeños?',
  '[
    {"text": "Shock frío (vasoconstricción periférica, resistencias vasculares altas)", "value": "A"},
    {"text": "Shock caliente (vasodilatación, resistencias vasculares bajas)", "value": "B"},
    {"text": "Shock cardiogénico", "value": "C"},
    {"text": "Shock obstructivo", "value": "D"}
  ]',
  'A',
  'Los lactantes y niños pequeños suelen presentar shock séptico de tipo FRÍO (vasoconstricción periférica, extremidades frías, pulsos débiles, resistencias vasculares altas). El shock caliente es más frecuente en adolescentes y adultos.',
  false,
  ARRAY['medico'],
  '["Valora las extremidades: ¿frías o calientes?", "Piensa en la edad del paciente"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 1 LIMIT 1),
  '¿Cuál es la saturación objetivo inicial de oxígeno en este lactante con sepsis?',
  '[
    {"text": "≥94-95%", "value": "A"},
    {"text": "≥88-92%", "value": "B"},
    {"text": "100%", "value": "C"},
    {"text": "≥85%", "value": "D"}
  ]',
  'A',
  'En sepsis pediátrica sin patología respiratoria previa, el objetivo es mantener saturación ≥94-95%. En prematuros o displasia broncopulmonar se aceptan objetivos algo menores (88-92%). La hiperoxia no aporta beneficio adicional.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Piensa en objetivos estándar de saturación", "No hay patología respiratoria crónica conocida"]'::jsonb,
  60
);

-- ======== STEP 2: Estabilización Hemodinámica (4 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 2 LIMIT 1),
  '¿Qué volumen de expansión inicial debes administrar como primer bolo?',
  '[
    {"text": "10 mL/kg de suero fisiológico en 30 minutos", "value": "A"},
    {"text": "20 mL/kg de suero fisiológico en 5-10 minutos", "value": "B"},
    {"text": "10 mL/kg de coloide (albúmina) en 10 minutos", "value": "C"},
    {"text": "5 mL/kg de suero salino hipertónico al 3%", "value": "D"}
  ]',
  'B',
  'El bolo inicial de expansión en shock séptico pediátrico es de 20 mL/kg de cristaloides (suero fisiológico o Ringer lactato) administrado en 5-10 minutos. Se pueden repetir bolos de 20 mL/kg hasta 60 mL/kg en la primera hora si persiste shock.',
  true,
  ARRAY['medico', 'enfermero'],
  '["Piensa en bolos rápidos de cristaloides", "El peso es 7.8 kg"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 2 LIMIT 1),
  '¿Qué tipo de fluido es de elección para la expansión en shock séptico pediátrico?',
  '[
    {"text": "Cristaloides (suero fisiológico 0.9% o Ringer lactato)", "value": "A"},
    {"text": "Coloides (albúmina al 5%)", "value": "B"},
    {"text": "Suero glucosado al 5%", "value": "C"},
    {"text": "Hemoderivados (concentrados de hematíes)", "value": "D"}
  ]',
  'A',
  'Los cristaloides (suero fisiológico o Ringer lactato) son los fluidos de elección para la expansión inicial en shock séptico pediátrico. Los coloides no han demostrado superioridad y el suero glucosado no es adecuado para expansión. Los hemoderivados se usan según indicación específica.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Piensa en las guías de sepsis pediátrica", "Los cristaloides son seguros y eficaces"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 2 LIMIT 1),
  'Tras el primer bolo, el lactante persiste con signos de shock. ¿Cuál es tu siguiente acción?',
  '[
    {"text": "Esperar 30 minutos a ver evolución clínica", "value": "A"},
    {"text": "Administrar segundo bolo de 20 mL/kg en 5-10 minutos y reevaluar", "value": "B"},
    {"text": "Iniciar perfusión de noradrenalina inmediatamente", "value": "C"},
    {"text": "Solicitar ecocardiografía para valorar función cardíaca", "value": "D"}
  ]',
  'B',
  'Si tras el primer bolo persisten signos de shock, se debe administrar un segundo bolo de 20 mL/kg (reevaluando tras cada bolo). Se pueden administrar hasta 60 mL/kg en la primera hora. El soporte inotrópico se considera si no hay respuesta tras 40-60 mL/kg.',
  true,
  ARRAY['medico'],
  '["Reevalúa tras cada bolo", "Se pueden dar hasta 60 mL/kg en primera hora"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 2 LIMIT 1),
  '¿Cuál de estos parámetros analíticos sugiere mayor gravedad y disfunción orgánica en sepsis?',
  '[
    {"text": "PCR 95 mg/L", "value": "A"},
    {"text": "Lactato 4.2 mmol/L con acidosis metabólica (pH 7.28, HCO3 14)", "value": "B"},
    {"text": "Leucocitosis de 22.000/μL", "value": "C"},
    {"text": "Procalcitonina 8.5 ng/mL", "value": "D"}
  ]',
  'B',
  'La elevación del lactato (>2 mmol/L) junto con acidosis metabólica indica hipoperfusión tisular y disfunción orgánica, lo que define sepsis grave/shock séptico. La PCR, leucocitosis y PCT son marcadores de inflamación/infección pero no de disfunción orgánica.',
  false,
  ARRAY['medico'],
  '["Piensa en marcadores de perfusión tisular", "El lactato refleja metabolismo anaerobio"]'::jsonb,
  90
);

-- ======== STEP 3: Antibioterapia (5 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 3 LIMIT 1),
  '¿En qué margen de tiempo debe administrarse la primera dosis de antibiótico en sepsis grave?',
  '[
    {"text": "En las primeras 3 horas desde el reconocimiento", "value": "A"},
    {"text": "En la primera hora desde el reconocimiento", "value": "B"},
    {"text": "Tras obtener resultado de hemocultivos", "value": "C"},
    {"text": "En las primeras 6 horas", "value": "D"}
  ]',
  'B',
  'La antibioterapia empírica debe iniciarse en la PRIMERA HORA desde el reconocimiento de sepsis grave/shock séptico. Cada hora de retraso aumenta la mortalidad. Los hemocultivos se extraen ANTES de antibióticos, pero NO se esperan resultados para iniciar tratamiento.',
  true,
  ARRAY['medico'],
  '["Piensa en \"hora de oro\" (golden hour)", "No esperar cultivos para iniciar antibióticos"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 3 LIMIT 1),
  '¿Cuál es la antibioterapia empírica de elección en este lactante de 6 meses con sepsis grave?',
  '[
    {"text": "Cefotaxima 50 mg/kg/dosis IV", "value": "A"},
    {"text": "Ampicilina + Gentamicina IV", "value": "B"},
    {"text": "Ceftriaxona 50 mg/kg/dosis IV", "value": "C"},
    {"text": "Meropenem 20 mg/kg/dosis IV", "value": "D"}
  ]',
  'A',
  'En lactantes de 1-3 meses con sepsis grave, la antibioterapia empírica recomendada es Cefotaxima 50 mg/kg/dosis (cada 6-8h) ± Ampicilina (si <1 mes por Listeria). En >3 meses: Cefotaxima o Ceftriaxona. El meropenem se reserva para casos graves o resistencias conocidas.',
  true,
  ARRAY['medico'],
  '["Piensa en cefalosporina de 3ª generación", "El lactante tiene 6 meses"]'::jsonb,
  120
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 3 LIMIT 1),
  '¿Cuándo debe extraerse hemocultivo en este caso?',
  '[
    {"text": "Tras iniciar antibioterapia para no retrasar el tratamiento", "value": "A"},
    {"text": "Antes de iniciar antibioterapia, pero sin retrasar antibióticos más allá de la primera hora", "value": "B"},
    {"text": "No es necesario en urgencias, se hará en planta al ingreso", "value": "C"},
    {"text": "Solo si el lactante presenta hipotensión franca", "value": "D"}
  ]',
  'B',
  'Los hemocultivos deben extraerse ANTES de iniciar antibioterapia (mejora rendimiento diagnóstico), pero su extracción NO debe retrasar la antibioterapia más allá de la primera hora. Si no es posible acceso vascular rápido, se prioriza antibióticos sobre hemocultivos.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Hemocultivos antes de antibióticos, pero sin retrasar tratamiento", "Piensa en \"door-to-antibiotic time\""]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 3 LIMIT 1),
  'En un lactante de 6 meses con sepsis grave, ¿es necesario añadir Ampicilina a la Cefotaxima?',
  '[
    {"text": "Sí, siempre en menores de 1 año", "value": "A"},
    {"text": "No, la Cefotaxima cubre el espectro necesario en lactantes de 1-12 meses", "value": "B"},
    {"text": "Solo si presenta meningitis documentada", "value": "C"},
    {"text": "Solo si presenta shock refractario", "value": "D"}
  ]',
  'B',
  'La Ampicilina se añade a la Cefotaxima en NEONATOS y lactantes <1-3 meses para cubrir Listeria monocytogenes. En lactantes de 3-12 meses, la Cefotaxima/Ceftriaxona sola es suficiente como terapia empírica inicial (cubre S. pneumoniae, H. influenzae, meningococo, bacilos gram-negativos).',
  false,
  ARRAY['medico'],
  '["Piensa en el riesgo de Listeria según edad", "El lactante tiene 6 meses"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 3 LIMIT 1),
  '¿Debe realizarse punción lumbar en este lactante con sepsis grave antes de iniciar antibióticos?',
  '[
    {"text": "Sí, siempre es obligatoria antes de antibióticos en sepsis", "value": "A"},
    {"text": "No, está contraindicada por inestabilidad hemodinámica (shock). Se hará tras estabilización si persiste indicación", "value": "B"},
    {"text": "Sí, pero solo si el hemocultivo es positivo", "value": "C"},
    {"text": "No es necesaria en urgencias, se hará en UCIP si ingresa", "value": "D"}
  ]',
  'B',
  'La punción lumbar está CONTRAINDICADA en shock o inestabilidad hemodinámica. Se debe estabilizar primero (fluidoterapia, antibióticos) y realizar PL DESPUÉS si persiste indicación y el paciente está estable. Las contraindicaciones de PL incluyen: shock, diátesis hemorrágica, signos de hipertensión intracraneal.',
  false,
  ARRAY['medico'],
  '["La estabilización hemodinámica es prioritaria", "Piensa en contraindicaciones de PL"]'::jsonb,
  120
);

-- ======== STEP 4: Reevaluación y Decisión (4 preguntas) ========

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 4 LIMIT 1),
  'El lactante ha recibido 50 mL/kg de volumen pero persiste con signos de hipoperfusión. ¿Cuál es la siguiente acción?',
  '[
    {"text": "Continuar con bolos adicionales de cristaloides hasta 60-80 mL/kg", "value": "A"},
    {"text": "Contactar con UCIP e iniciar perfusión de inotrópicos (noradrenalina o dopamina)", "value": "B"},
    {"text": "Esperar a ver evolución en las próximas 2 horas", "value": "C"},
    {"text": "Administrar furosemida para evitar sobrecarga de volumen", "value": "D"}
  ]',
  'B',
  'Si tras 40-60 mL/kg de volumen persisten signos de shock, se debe considerar inicio de soporte inotrópico/vasopresor (noradrenalina, dopamina, adrenalina) y contactar con UCIP. El shock refractario a fluidos define la necesidad de soporte vasoactivo. NO administrar diuréticos en shock.',
  true,
  ARRAY['medico'],
  '["Piensa en shock refractario a fluidos", "El paciente necesita escalar tratamiento"]'::jsonb,
  120
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 4 LIMIT 1),
  '¿Qué parámetro clínico es el MÁS útil para valorar la respuesta a la fluidoterapia?',
  '[
    {"text": "Disminución de la frecuencia cardíaca", "value": "A"},
    {"text": "Mejoría del relleno capilar y de la perfusión periférica", "value": "B"},
    {"text": "Aumento de la tensión arterial sistólica", "value": "C"},
    {"text": "Disminución del lactato arterial", "value": "D"}
  ]',
  'B',
  'La mejoría de la perfusión periférica (relleno capilar, temperatura de extremidades, pulsos) es el parámetro clínico más útil y precoz para valorar respuesta a fluidoterapia. La normalización del lactato es más lenta. La TA puede seguir baja incluso con mejor perfusión (shock compensado).',
  false,
  ARRAY['medico', 'enfermero'],
  '["Piensa en signos de perfusión clínica", "El relleno capilar es un marcador muy sensible"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 4 LIMIT 1),
  '¿Cuál es el destino más adecuado para este lactante?',
  '[
    {"text": "Alta a domicilio con antibióticos orales y revisión en 24 horas", "value": "A"},
    {"text": "Ingreso en planta de hospitalización pediátrica", "value": "B"},
    {"text": "Ingreso en Unidad de Cuidados Intensivos Pediátricos (UCIP)", "value": "C"},
    {"text": "Observación en urgencias durante 6-8 horas y decidir después", "value": "D"}
  ]',
  'C',
  'Un lactante con sepsis grave/shock séptico que ha requerido >40-60 mL/kg de volumen y presenta lactato elevado persistente, oliguria y/o necesidad de inotrópicos debe ingresar en UCIP para monitorización intensiva y soporte avanzado. No es candidato a planta ni a alta.',
  true,
  ARRAY['medico'],
  '["Valora gravedad: shock séptico, alto requerimiento de volumen", "Piensa en criterios de ingreso en UCIP"]'::jsonb,
  90
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, is_critical, roles, hints, time_limit)
VALUES (
  (SELECT id FROM steps WHERE scenario_id = 13 AND step_order = 4 LIMIT 1),
  '¿Qué objetivo de diuresis es adecuado en este lactante durante la estabilización?',
  '[
    {"text": "≥0.5 mL/kg/hora", "value": "A"},
    {"text": "≥1 mL/kg/hora", "value": "B"},
    {"text": "≥2 mL/kg/hora", "value": "C"},
    {"text": "No es necesario monitorizar diuresis en urgencias", "value": "D"}
  ]',
  'B',
  'El objetivo de diuresis en pediatría durante la estabilización de shock séptico es ≥1 mL/kg/hora (lactantes/niños pequeños) o ≥0.5 mL/kg/hora (adolescentes/adultos). La oliguria (<1 mL/kg/h en lactantes) es un signo de disfunción orgánica y mala perfusión renal.',
  false,
  ARRAY['medico', 'enfermero'],
  '["Piensa en marcadores de perfusión renal", "En lactantes el objetivo es mayor que en adultos"]'::jsonb,
  90
);

-- ==============================================================================
-- PASO 4: INSERTAR CASE RESOURCES (4 recursos bibliográficos)
-- ==============================================================================

INSERT INTO case_resources (scenario_id, title, type, url, source, year, free_access)
VALUES
  (
    13,
    'Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021',
    'Guía clínica',
    'https://www.sccm.org/SurvivingSepsisCampaign/Guidelines',
    'Society of Critical Care Medicine',
    2021,
    true
  ),
  (
    13,
    'Guía de Práctica Clínica sobre el Manejo de la Sepsis Grave en Pediatría - SEIP/AEP',
    'Guía clínica',
    'https://www.aeped.es/sites/default/files/documentos/sepsis.pdf',
    'AEP - Asociación Española de Pediatría',
    2023,
    true
  ),
  (
    13,
    'Davis AL et al. American College of Critical Care Medicine Clinical Practice Parameters for Hemodynamic Support of Pediatric and Neonatal Septic Shock',
    'Artículo científico',
    'https://pubmed.ncbi.nlm.nih.gov/28509730/',
    'Critical Care Medicine, 2017;45(6):1061-1093',
    2017,
    false
  ),
  (
    13,
    'Protocolos de Urgencias Pediátricas SEUP - Capítulo Sepsis y Shock Séptico',
    'Protocolo',
    'https://seup.org/pdf_public/pub/protocolos/sepsis_shock_septico.pdf',
    'SEUP - Sociedad Española de Urgencias Pediátricas',
    2023,
    true
  );

-- ==============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- ==============================================================================
-- Ejecutar esta query para verificar que se han insertado todos los componentes:

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
WHERE s.id = 13;

-- Resultado esperado: briefing_count=1, steps_count=4, questions_count=18, resources_count=4
