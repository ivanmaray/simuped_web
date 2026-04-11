-- ══════════════════════════════════════════════════════════════════════════
-- ESCENARIO: Deshidratación por gastroenteritis aguda
-- scenario_id = 119 (placeholder ya existente)
-- Nivel: básico | Público: médico, enfermería, farmacia
-- Paciente: lactante 18 meses, 11 kg (habitual 11,8 kg), GEA 48h, DH moderada ~7%
-- Preguntas: MED=16, NUR=14, PHARM=12 | Críticas=7 | Pasos=5
-- ══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. ACTUALIZAR SCENARIO (ya existe id=119)
-- ─────────────────────────────────────────────
UPDATE scenarios
SET
  title             = 'Deshidratación por gastroenteritis aguda',
  summary           = 'Lactante de 18 meses con vómitos y diarrea de 48 horas que presenta deshidratación moderada isonatrémica. El caso trabaja el reconocimiento clínico precoz, la decisión entre RHO e hidratación IV y la educación familiar al alta.',
  level             = 'basico',
  difficulty        = 'Básico',
  mode              = ARRAY['online'],
  status            = 'En construcción: en proceso',
  estimated_minutes = 20,
  max_attempts      = 3
WHERE id = 119;

-- ─────────────────────────────────────────────
-- 2. STEPS (scenario_id = 119)
-- ─────────────────────────────────────────────
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  (119, 1,
   'Triaje y valoración inicial',
   'Recibid en triaje a un lactante de 18 meses (11 kg, peso habitual 11,8 kg) traído por sus padres por vómitos de 48 horas y diarrea acuosa de 36 horas. Aplicad el Triángulo de Evaluación Pediátrica (TEP) y estimad el grado de deshidratación.',
   false, null),

  (119, 2,
   'Clasificación y decisión diagnóstica',
   'Con los datos clínicos obtenidos y la escala de Gorelick, clasificad el tipo y grado de deshidratación. Decidid si está indicada la analítica de sangre en este momento.',
   false, null),

  (119, 3,
   'Rehidratación oral: primera línea',
   'Iniciad la rehidratación oral (RHO) con solución de rehidratación oral (SRO) de baja osmolaridad. Manejad los vómitos con la pauta correcta y valorad el uso de ondansetrón si el cuadro lo requiere.',
   false, null),

  (119, 4,
   'Fracaso RHO o indicación de hidratación IV',
   'El lactante presenta vómitos persistentes que impiden completar la RHO. Decidid la indicación de hidratación IV y seleccionad la pauta adecuada para su situación clínica y hemodinámica.',
   false, null),

  (119, 5,
   'Alta y educación familiar',
   'Tras la rehidratación, el lactante tolera líquidos y ha mejorado clínicamente. Verificad los criterios de alta y proporcionad educación a la familia sobre realimentación precoz, signos de alarma y seguimiento.',
   false, null)
RETURNING id;
-- ⚠️ Guarda los IDs como:
--   $STEP_ID_1 → paso 1 (Triaje)
--   $STEP_ID_2 → paso 2 (Clasificación)
--   $STEP_ID_3 → paso 3 (RHO)
--   $STEP_ID_4 → paso 4 (IV)
--   $STEP_ID_5 → paso 5 (Alta)


-- ─────────────────────────────────────────────
-- 3. QUESTIONS
-- ─────────────────────────────────────────────

-- ══════════════════════════════
-- PASO 1 — Triaje y valoración inicial
-- ══════════════════════════════

-- Q1 | MED+NUR | CRÍTICA
-- TEP: componente más precozmente afectado en deshidratación moderada
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'El lactante está alerta y lloroso, sin trabajo respiratorio. El relleno capilar es de 3 segundos y las mucosas están secas. ¿Cuál es el componente del TEP que está alterado?',
  '["Apariencia (tono, interactividad, llanto)","Circulación (piel y mucosas)","Respiración (esfuerzo y ruidos)","Apariencia y circulación simultáneamente"]',
  '1',
  'En la deshidratación moderada, el primer componente del TEP que se altera es la Circulación: relleno capilar enlentecido (>2 s), mucosas secas y piel moteada o fría indican shock compensado. La Apariencia se altera más tardíamente, cuando el déficit afecta la perfusión cerebral. Reconocer la C alterada permite clasificar el TEP como alteración de la circulación y actuar con urgencia.',
  ARRAY['medico','enfermeria'],
  true,
  '["El TEP evalúa tres componentes: A (apariencia), B (breathing/respiración), C (circulación)","El relleno capilar y el estado de las mucosas forman parte de uno de estos componentes"]',
  60,
  'No reconocer la alteración circulatoria en el TEP lleva a subestimar la gravedad y retrasar la rehidratación, con riesgo de progresión a shock descompensado.'
);

-- Q2 | MED+NUR
-- Gorelick: predictores más útiles de deshidratación moderada-grave
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  '¿Cuáles son los tres signos clínicos con mayor valor predictivo para identificar deshidratación moderada-grave según la escala de Gorelick?',
  '["Fontanela hundida, ojos hundidos y llanto sin lágrimas","Relleno capilar >2 s, pérdida de turgencia cutánea y frecuencia respiratoria anormal","Mucosas secas, taquicardia y tensión arterial baja","Pérdida de peso >5%, oliguria y letargia"]',
  '1',
  'Los tres signos con mayor valor predictivo en la escala de Gorelick son: relleno capilar >2 segundos, pérdida de turgencia cutánea y frecuencia respiratoria anormal. La escala puntúa de 0 a 10; <3 puntos corresponde a deshidratación leve, 3-5 a moderada y ≥6 a grave. Es la herramienta de valoración clínica más validada en pediatría para estimar el grado de deshidratación.',
  ARRAY['medico','enfermeria'],
  false,
  '["La escala de Gorelick incluye 10 ítems clínicos valorados de forma objetiva","Algunos signos tienen mayor especificidad que otros para predecir el porcentaje real de deshidratación"]',
  null,
  null
);

-- Q3 | MED
-- Clasificación por porcentaje: moderada 5-9% / déficit 50-90 mL/kg
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'El lactante pesa habitualmente 11,8 kg y hoy pesa 11 kg. ¿Cómo se clasifica su deshidratación y cuál es el déficit estimado en mL/kg?',
  '["Leve (3-5%), déficit 30-50 mL/kg","Moderada (5-9%), déficit 50-90 mL/kg","Grave (>9%), déficit >90 mL/kg","Moderada-grave (7-10%), déficit 70-100 mL/kg"]',
  '1',
  'La pérdida de 0,8 kg sobre 11,8 kg representa un 6,8% del peso corporal, que corresponde a deshidratación moderada (5-9%), con un déficit estimado de 50-90 mL/kg. La clasificación orienta el volumen de rehidratación necesario y la vía elegida. La fórmula es: % deshidratación = (peso habitual − peso actual) / peso habitual × 100.',
  ARRAY['medico'],
  false,
  '["El porcentaje se calcula sobre el peso habitual previo al proceso agudo","La clasificación SEUP agrupa: leve 3-5%, moderada 5-9%, grave >9%"]',
  null,
  null
);

-- Q4 | NUR
-- Parámetros prioritarios de monitorización en triaje
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  '¿Qué parámetros son prioritarios en la primera valoración de enfermería de este lactante con sospecha de deshidratación moderada?',
  '["FC, FR, SpO2, temperatura, peso actual y peso habitual","FC, FR, SpO2 y temperatura únicamente","Peso, glucemia capilar y relleno capilar","Tensión arterial, ECG y glucemia capilar"]',
  '0',
  'La valoración de enfermería debe incluir FC, FR, SpO2 y temperatura como constantes vitales, más el peso actual para calcular el porcentaje de deshidratación si se conoce el peso habitual. La glucemia capilar se recomienda además en menores de 3 años, dado el riesgo de hipoglucemia por el ayuno relativo durante la GEA. La TA aporta información pero no es el primer parámetro en un lactante estable.',
  ARRAY['enfermeria'],
  false,
  '["El porcentaje de deshidratación requiere comparar el peso actual con el peso previo al proceso agudo","La monitorización hemodinámica básica orienta sobre la gravedad del shock compensado"]',
  null,
  null
);


-- ══════════════════════════════
-- PASO 2 — Clasificación y decisión diagnóstica
-- ══════════════════════════════

-- Q5 | MED+NUR+PHARM | CRÍTICA
-- Analítica NO rutinaria en deshidratación leve-moderada sin factores de riesgo
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'Lactante de 18 meses con deshidratación moderada, bien orientado y sin factores de riesgo adicionales. ¿Está indicada la analítica de sangre de forma rutinaria?',
  '["Sí, siempre en deshidratación moderada para descartar alteraciones iónicas","No, la analítica no está indicada de rutina en deshidratación leve-moderada sin factores de riesgo","Sí, es necesaria para calcular el déficit exacto de líquidos","Solo si los padres lo solicitan expresamente"]',
  '1',
  'Las guías SEUP 2024 recomiendan no realizar analítica de forma sistemática en la deshidratación leve-moderada en niños previamente sanos sin factores de riesgo. El diagnóstico es clínico. La analítica solo añade valor en deshidratación grave (>9%), alteración del nivel de conciencia, sospecha de trastorno iónico (hipernatremia, hiponatremia) o necesidad de hidratación IV.',
  ARRAY['medico','enfermeria','farmacia'],
  true,
  '["Las guías basan el manejo de la deshidratación leve-moderada en criterios clínicos, no analíticos","Piensa en qué situaciones cambiaría realmente el manejo clínico conocer la natremia o el pH"]',
  60,
  'Solicitar analítica innecesaria expone al lactante a procedimientos dolorosos, retrasa el inicio de la rehidratación y puede generar hallazgos incidentales que conduzcan a intervenciones no justificadas.'
);

-- Q6 | MED+PHARM
-- Clasificación por natremia: isonatrémica 130-145 mEq/L
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'En los casos en que se decide realizar analítica, ¿cuál es el rango de natremia que define la deshidratación isonatrémica, la más frecuente en GEA?',
  '["Na+ < 130 mEq/L","Na+ 130-145 mEq/L","Na+ 145-150 mEq/L","Na+ > 150 mEq/L"]',
  '1',
  'La deshidratación isonatrémica se define por una natremia entre 130 y 145 mEq/L y representa la gran mayoría de los casos de GEA. La hiponatrémica (Na+ <130 mEq/L) y la hipernatrémica (Na+ >150 mEq/L) requieren pautas de corrección específicas y son contraindicaciones para la rehidratación IV rápida (RIR). La clasificación por natremia orienta la velocidad y el tipo de solución para la corrección.',
  ARRAY['medico','farmacia'],
  false,
  '["La clasificación por natremia orienta el tipo de solución y el ritmo de corrección","La deshidratación hipernatrémica exige corrección lenta (48-72 horas) para evitar edema cerebral"]',
  null,
  null
);

-- Q7 | NUR
-- Cuándo SÍ está indicada la analítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  '¿En qué situaciones clínicas estaría justificado solicitar analítica de sangre en un niño con GEA y deshidratación?',
  '["Fiebre >38,5 °C o vómitos de más de 24 horas de duración","Deshidratación grave, alteración del nivel de conciencia, necesidad de hidratación IV o sospecha de alteraciones iónicas","Cuando los padres refieren deposiciones muy líquidas o explosivas","En lactantes menores de 2 años por protocolo de servicio"]',
  '1',
  'La analítica está indicada en: deshidratación grave (>9%), alteración del nivel de conciencia, necesidad de hidratación IV, sospecha de trastorno electrolítico (hipo o hipernatremia) o enfermedad de base que condicione el manejo. La fiebre aislada o la edad no son indicaciones por sí solas. La solicitud debe estar justificada en si cambiará el manejo clínico.',
  ARRAY['enfermeria'],
  false,
  '["La decisión de extraer analítica debe basarse en si el resultado cambiará el tratamiento","Una deshidratación leve-moderada en un niño sano no suele requerir confirmación analítica para iniciar RHO"]',
  null,
  null
);

-- Q8 | PHARM
-- Composición SRO ESPGHAN: baja osmolaridad
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  '¿Cuáles son las características de composición que debe tener una SRO recomendada por la ESPGHAN para la deshidratación por GEA en pediatría?',
  '["Na+ 90 mEq/L, glucosa 200 mmol/L, osmolaridad 311 mOsm/L (OMS clásica)","Na+ 60 mEq/L, glucosa 74-111 mmol/L, osmolaridad 225-260 mOsm/L (baja osmolaridad)","Na+ 45 mEq/L, glucosa 55 mmol/L, osmolaridad 180 mOsm/L (hipoosmolar)","Na+ 75 mEq/L, glucosa 140 mmol/L, osmolaridad 245 mOsm/L"]',
  '1',
  'La ESPGHAN recomienda SRO de baja osmolaridad: Na+ 60 mEq/L, K+ 20 mEq/L, Cl- 60 mEq/L, citrato 10 mEq/L, glucosa 74-111 mmol/L, osmolaridad 225-260 mOsm/L. Esta composición reduce la duración de la diarrea y el riesgo de hipernatremia frente a la solución OMS clásica (311 mOsm/L). En España, el Sueroral Hiposódico® cumple estos criterios. Las bebidas deportivas y los zumos no son equivalentes y están contraindicados.',
  ARRAY['farmacia'],
  false,
  '["Las bebidas deportivas o zumos NO son equivalentes a una SRO: exceso de glucosa y escasez de electrolitos","La osmolaridad reducida mejora la absorción intestinal por cotransporte Na+/glucosa y reduce el gasto fecal"]',
  null,
  null
);


-- ══════════════════════════════
-- PASO 3 — Rehidratación oral (RHO)
-- ══════════════════════════════

-- Q9 | MED+NUR+PHARM | CRÍTICA
-- RHO primera línea en moderada sin contraindicaciones
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'El lactante tiene 18 meses, deshidratación moderada (~7%), está alerta, tolera pequeños sorbos y no tiene contraindicaciones. ¿Cuál es el tratamiento de primera línea?',
  '["Hidratación IV con suero salino 0,9% a 20 mL/kg/h durante 1-4 horas","Rehidratación oral (RHO) con SRO de baja osmolaridad","Hidratación IV lenta con SS 0,9% + glucosa 5% + K+ 20 mEq/L en 24 horas","Observación domiciliaria con SRO sin tratamiento en urgencias si tolera pequeños sorbos"]',
  '1',
  'La RHO es la primera línea para la deshidratación leve-moderada en ausencia de contraindicaciones. Es tan efectiva como la hidratación IV, se asocia a menos complicaciones (infección, extravasación, alteraciones iónicas iatrogénicas) y permite el alta más precoz. Las contraindicaciones para RHO son: deshidratación grave (>9%), shock, íleo paralítico, riesgo de aspiración o pérdidas >10 mL/kg/h.',
  ARRAY['medico','enfermeria','farmacia'],
  true,
  '["La vía IV no tiene ventajas clínicas sobre la oral en deshidratación moderada sin shock","La tolerancia oral, aunque sea con pequeños sorbos, es criterio suficiente para intentar RHO"]',
  60,
  'Indicar hidratación IV sin intentar previamente la RHO expone al niño a procedimientos invasivos innecesarios y prolonga la estancia en urgencias sin beneficio clínico demostrado en ausencia de contraindicaciones.'
);

-- Q10 | NUR | CRÍTICA
-- Cómo iniciar RHO en presencia de vómitos
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'El lactante tiene vómitos frecuentes pero está alerta y tolera pequeñas cantidades. ¿Cómo debe administrarse la SRO para minimizar el riesgo de vómito y fracaso de la RHO?',
  '["Ofrecer 100-150 mL de SRO de una vez para alcanzar rápido el volumen pautado","Iniciar con 5 mL de SRO cada 2-5 minutos, aumentando progresivamente según tolerancia","Esperar al menos 2 horas desde el último vómito antes de iniciar la SRO","Administrar SRO solo si el niño la acepta voluntariamente, sin insistir"]',
  '1',
  'Cuando hay vómitos activos, la SRO debe iniciarse en volúmenes pequeños (5 mL) cada 2-5 minutos, aumentando de forma gradual según tolerancia. Esta pauta minimiza el estímulo del reflejo emético al evitar la distensión gástrica brusca, y permite que el intestino absorba el líquido antes de que se produzca la regurgitación. Administrar grandes volúmenes de inicio provoca distensión y refuerza el vómito.',
  ARRAY['enfermeria'],
  true,
  '["Los volúmenes pequeños y frecuentes se toleran mejor que los grandes en el contexto de vómitos activos","El reflejo emético se desencadena más fácilmente con distensión gástrica brusca"]',
  60,
  'Administrar volúmenes grandes de SRO en presencia de vómitos provoca regurgitación inmediata, refuerza la percepción de fracaso de la RHO y lleva a la indicación innecesaria de hidratación IV.'
);

-- Q11 | MED+PHARM
-- Volumen y tiempo de la fase de rehidratación para deshidratación moderada
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿Cuál es el volumen y el tiempo de administración recomendados para la fase de rehidratación con SRO en una deshidratación moderada?',
  '["30-50 mL/kg en 1-2 horas","50-90 mL/kg en 2-4 horas","100-120 mL/kg en 4-6 horas","20-30 mL/kg en menos de 1 hora"]',
  '1',
  'En la deshidratación moderada (5-9%), la fase de rehidratación con SRO se realiza con 50-90 mL/kg en 2-4 horas. Para deshidratación leve (3-5%) el volumen es 30-50 mL/kg. Tras la fase de rehidratación se deben reponer las pérdidas continuadas (2-5 mL/kg por vómito, 5-10 mL/kg por deposición diarreica) y reiniciar la alimentación habitual lo antes posible.',
  ARRAY['medico','farmacia'],
  false,
  '["El volumen de rehidratación se adapta al grado de deshidratación estimado","La fase de rehidratación es diferente a la fase de mantenimiento posterior"]',
  null,
  null
);

-- Q12 | PHARM | CRÍTICA
-- Ondansetrón: dosis y vía correctas
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'El lactante de 11 kg presenta vómitos persistentes que dificultan la RHO. Se decide administrar ondansetrón. ¿Cuál es la dosis correcta y la vía de elección?',
  '["0,1 mg/kg IV, dosis máxima 4 mg","0,15 mg/kg VO/sublingual, dosis máxima 8 mg","0,3 mg/kg IM, dosis máxima 10 mg","0,2 mg/kg IV, dosis máxima 4 mg, repetible cada 4 horas"]',
  '1',
  'La dosis recomendada de ondansetrón es 0,15 mg/kg (máximo 8 mg) por vía oral o sublingual. Para este lactante de 11 kg: 1,65 mg (redondeando a 1,6-2 mg, según presentación comercial disponible). La vía oral/sublingual es equivalente en eficacia a la IV y evita la venopunción. En urgencias se administra una sola dosis. No está indicado el uso repetido sin reevaluación.',
  ARRAY['farmacia'],
  true,
  '["La dosis se calcula en mg/kg con un máximo absoluto independiente del peso","La vía oral tiene eficacia demostrada y evita la canalización IV innecesaria"]',
  90,
  'Una dosis incorrecta por exceso aumenta el riesgo de prolongación del intervalo QT y arritmias. La administración repetida sin indicación añade riesgo sin beneficio adicional demostrado.'
);

-- Q13 | PHARM+MED
-- Ondansetrón: precaución QT y contraindicaciones
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿Cuál es la principal precaución que debe considerarse antes de administrar ondansetrón en urgencias pediátricas?',
  '["Riesgo de hipertensión arterial paradójica si se combina con SRO de alta osmolaridad","Riesgo de prolongación del intervalo QT; valorar ECG previo si hay factores de riesgo cardíaco","Contraindicado en menores de 2 años por riesgo de depresión respiratoria","Interacción significativa con ibuprofeno que requiere separar la administración"]',
  '1',
  'El ondansetrón prolonga el intervalo QT de forma dosis-dependiente. Aunque el riesgo es bajo en niños sanos a dosis habituales, debe valorarse realizar ECG previo si hay antecedentes de cardiopatía, síndrome de QT largo congénito, uso concomitante de otros fármacos que prolonguen el QT o alteraciones electrolíticas (hipokaliemia, hipomagnesemia). No está contraindicado por edad en menores de 2 años a dosis correctas.',
  ARRAY['farmacia','medico'],
  false,
  '["Este antiemético actúa sobre receptores 5-HT3 del nervio vago y del SNC","Su principal efecto adverso relevante en urgencias pediátricas está relacionado con la función cardíaca eléctrica"]',
  null,
  null
);

-- Q14 | NUR
-- Reposición de pérdidas continuadas
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'Tras la fase de rehidratación, ¿cómo deben reponerse las pérdidas continuadas por vómitos y diarrea?',
  '["100 mL de SRO fijos tras cada episodio de vómito o diarrea, independientemente del peso","2-5 mL/kg por cada vómito y 5-10 mL/kg por cada deposición diarreica","Doblar el ritmo de SRO programado cada vez que el niño vomita","No es necesario reponer pérdidas una vez completada la fase de rehidratación"]',
  '1',
  'Las pérdidas continuadas deben reponerse con SRO: 2-5 mL/kg por episodio de vómito y 5-10 mL/kg por deposición diarreica. Estas cantidades se suman al volumen de mantenimiento basal. No reponer adecuadamente las pérdidas activas conduce a re-deshidratación y fracaso del tratamiento ambulatorio.',
  ARRAY['enfermeria'],
  false,
  '["Las pérdidas por vómito y diarrea son variables y deben individualizarse por peso","La fase de mantenimiento incluye las necesidades basales más la reposición de pérdidas activas"]',
  null,
  null
);

-- Q15 | MED
-- Contraindicaciones reales de la RHO
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿Cuáles son las contraindicaciones reales para iniciar RHO en urgencias pediátricas?',
  '["Vómitos frecuentes (>3 episodios/hora) o rechazo inicial del niño a beber","Deshidratación grave (>9%), shock hemodinámico, íleo paralítico, riesgo de aspiración o pérdidas >10 mL/kg/h","Diarrea con sangre o más de 8 deposiciones al día","Lactantes menores de 6 meses o peso inferior a 5 kg"]',
  '1',
  'Las contraindicaciones para RHO son: deshidratación grave (>9%) con inestabilidad hemodinámica, shock compensado o descompensado, íleo paralítico o distensión abdominal, alteración del nivel de conciencia con riesgo de aspiración, y pérdidas superiores a 10 mL/kg/h que superen la capacidad de absorción intestinal. Los vómitos frecuentes y la resistencia inicial no son contraindicaciones absolutas: se manejan con la pauta de pequeños volúmenes y ondansetrón.',
  ARRAY['medico'],
  false,
  '["Los vómitos solos no contraindican la RHO si se usa la pauta de administración correcta","La inestabilidad hemodinámica (shock) sí es una contraindicación real e inmediata"]',
  null,
  null
);


-- ══════════════════════════════
-- PASO 4 — Fracaso RHO / Hidratación IV
-- ══════════════════════════════

-- Q16 | MED+NUR
-- Criterios de fracaso RHO / indicación de RIV
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿Cuándo se considera fracaso de la RHO y está indicado pasar a hidratación intravenosa?',
  '["Cuando el niño llora durante la administración o rechaza la SRO en los primeros 15 minutos","Cuando no se consigue completar el volumen pautado por vómitos incoercibles, el niño empeora clínicamente o las pérdidas superan la capacidad de absorción oral","Cuando los padres prefieren el suero intravenoso por comodidad","Cuando la glucemia capilar es inferior a 80 mg/dL"]',
  '1',
  'El fracaso de la RHO se define como la incapacidad de completar el volumen necesario por vómitos incoercibles, el empeoramiento clínico durante la RHO o el aumento de pérdidas que superen la capacidad de absorción intestinal. El rechazo inicial o el llanto no son criterios de fracaso: se debe insistir con la pauta de volúmenes pequeños y valorar ondansetrón antes de concluir que hay fracaso real.',
  ARRAY['medico','enfermeria'],
  false,
  '["El fracaso de la RHO es una indicación clínica objetiva, no de preferencia familiar","Los criterios se basan en la respuesta clínica real, no en el comportamiento del niño durante la administración"]',
  null,
  null
);

-- Q17 | MED+PHARM | CRÍTICA
-- RIR: composición y ritmo correctos
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'Se decide hidratación IV rápida (RIR). ¿Cuál es la solución y el ritmo correctos para un lactante de 18 meses con deshidratación moderada isonatrémica?',
  '["SS 0,9% + glucosa 5% + K+ 20 mEq/L a ritmo de mantenimiento en 24 horas","Suero salino 0,9% ± glucosa 2,5% a 20 mL/kg/h (máximo 700 mL/h) durante 1-4 horas con reevaluación horaria","Ringer lactato a 10 mL/kg/h durante 6 horas","Glucosa 5% a 20 mL/kg/h durante 2 horas seguida de SS 0,9% en mantenimiento"]',
  '1',
  'La rehidratación IV rápida (RIR) estándar es SS 0,9% (o Ringer Lactato/Plasma-Lyte) ± glucosa 2,5% a 20 mL/kg/h con un máximo de 700 mL/h, durante 1-4 horas con reevaluación clínica horaria. Se añade glucosa 2,5% cuando la glucemia está en rango normal pero hay cetonemia. La RIR está contraindicada en: <3 meses, inestabilidad hemodinámica, natremia <130 o >150 mEq/L, o enfermedad de base que comprometa el manejo hidroelectrolítico.',
  ARRAY['medico','farmacia'],
  true,
  '["El ritmo de RIR (20 mL/kg/h) es muy superior al de mantenimiento habitual","La solución isotónica es la elección para la isonatrémica; las hipotónicas (glucosa 5%) están contraindicadas en pediatría por riesgo de hiponatremia iatrogénica"]',
  90,
  'Usar una solución hipotónica (glucosa 5% o salino hipotónico) en la RIR puede provocar hiponatremia grave y edema cerebral. Un ritmo incorrecto o demasiado lento retrasa la corrección hemodinámica.'
);

-- Q18 | PHARM+MED
-- Contraindicaciones de la RIR
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿En cuál de las siguientes situaciones estaría CONTRAINDICADA la RIR (rehidratación IV rápida a 20 mL/kg/h)?',
  '["Deshidratación moderada con Gorelick 4 y natremia 138 mEq/L","Lactante de 2 meses con Na+ 128 mEq/L e inestabilidad hemodinámica","Deshidratación moderada sin analítica disponible en un lactante sano de 14 meses","Fracaso de RHO tras 2 horas con natremia 140 mEq/L"]',
  '1',
  'La RIR está contraindicada en: lactantes menores de 3 meses, natremia <130 o >150 mEq/L, inestabilidad hemodinámica (shock), y enfermedades de base que afecten el manejo hidroelectrolítico. En el lactante de 2 meses con hiponatremia e inestabilidad, la corrección debe ser más lenta y controlada con protocolo específico. Las opciones A, C y D son situaciones en que la RIR sería la elección correcta.',
  ARRAY['farmacia','medico'],
  false,
  '["La edad (<3 meses) y la natremia son dos de los criterios clave de contraindicación de la RIR","La hiponatremia e hipernatremia requieren protocolos de corrección específicos y más lentos"]',
  null,
  null
);

-- Q19 | MED+NUR | CRÍTICA
-- Shock / deshidratación grave ≥10%: bolo inicial
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'El lactante presenta signos de deshidratación grave (>10%): letargia, relleno capilar >3 s, taquicardia marcada y mucosas muy secas. ¿Cuál es el tratamiento inicial inmediato?',
  '["Iniciar RHO urgente con SRO en jeringa cada 2 minutos","Bolo de SSF 0,9% a 10-20 mL/kg IV en 15-30 minutos, reevaluando tras cada bolo","RIR estándar: SS 0,9% a 20 mL/kg/h durante 2 horas","Glucosa 10% a 5 mL/kg IV para corregir posible hipoglucemia asociada"]',
  '1',
  'En la deshidratación grave con compromiso circulatorio, el tratamiento inmediato es la expansión de volumen con SSF 0,9% en bolo de 10-20 mL/kg IV en 15-30 minutos, reevaluando la respuesta hemodinámica tras cada bolo. Se pueden repetir bolos hasta la estabilización. La RHO y la RIR estándar no están indicadas en shock. La glucosa IV solo se administra si hay hipoglucemia documentada.',
  ARRAY['medico','enfermeria'],
  true,
  '["En el shock, el objetivo inicial es restaurar la perfusión tisular, no corregir el déficit total de líquidos","El bolo se administra rápido (15-30 min), muy diferente al ritmo de RIR o mantenimiento"]',
  60,
  'No reconocer el shock y retrasar el bolo de expansión de volumen puede provocar hipoperfusión prolongada, acidosis metabólica grave e insuficiencia orgánica.'
);

-- Q20 | NUR
-- Monitorización durante la RIR
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿Con qué frecuencia y qué parámetros deben monitorizarse durante la rehidratación IV rápida (RIR)?',
  '["Solo al inicio y al finalizar la RIR, valorando tolerancia general","FC, FR, SpO2, relleno capilar y estado de hidratación cada 1 hora durante toda la RIR","Glucemia capilar cada 30 minutos y ECG continuo","TA cada 15 minutos y diuresis horaria únicamente"]',
  '1',
  'Durante la RIR deben monitorizarse FC, FR, SpO2, relleno capilar y estado general cada hora. La reevaluación horaria permite detectar la respuesta al tratamiento o el empeoramiento que requiera ajuste de pauta. La diuresis es un indicador indirecto útil de la eficacia. No se requiere ECG continuo ni glucemia muy frecuente en un niño sin factores de riesgo.',
  ARRAY['enfermeria'],
  false,
  '["La frecuencia de monitorización durante la RIR es mayor que en una hidratación de mantenimiento convencional","La reevaluación horaria es la recomendación estándar para detectar respuesta o fracaso"]',
  null,
  null
);

-- Q21 | PHARM
-- Cuándo añadir glucosa 2,5% al suero IV
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿En qué situación clínica está indicado añadir glucosa 2,5% al suero salino 0,9% durante la RIR?',
  '["Siempre que el niño lleve más de 6 horas sin ingerir alimentos sólidos","Cuando la glucemia está en rango normal pero hay cetonemia presente","Cuando la glucemia es inferior a 50 mg/dL (hipoglucemia franca)","Solo en lactantes menores de 3 meses por riesgo de hipoglucemia neonatal"]',
  '1',
  'La adición de glucosa 2,5% al SS 0,9% está indicada cuando la glucemia está en rango normal pero hay cetonemia (cuerpos cetónicos elevados), lo que indica catabolismo por déficit calórico. Si hay hipoglucemia franca (<50-60 mg/dL), se corrige primero con bolo de glucosa al 10% (2 mL/kg). La indicación es la situación metabólica, no la edad por sí sola.',
  ARRAY['farmacia'],
  false,
  '["La cetonemia indica que el organismo ha agotado las reservas de glucógeno y está en catabolismo activo","Añadir glucosa al suero evita la hipoglucemia sin aumentar el aporte hídrico total"]',
  null,
  null
);

-- Q22 | MED+PHARM
-- Bicarbonato: indicación muy restrictiva
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿Cuándo está indicada la administración de bicarbonato IV en la deshidratación por GEA?',
  '["Siempre que el pH sea inferior a 7,35 en la gasometría","Solo si pH <7,15 Y exceso de bases ≤ -12 Y ausencia de respuesta a la expansión de volumen","Cuando el bicarbonato sérico es inferior a 18 mEq/L","En cualquier deshidratación moderada-grave como profilaxis de acidosis"]',
  '1',
  'El bicarbonato IV tiene indicación muy restrictiva: pH <7,15 Y EB ≤ -12 Y ausencia de respuesta a la expansión de volumen. La acidosis metabólica leve-moderada de la GEA se resuelve con una rehidratación adecuada sin necesidad de alcalinización. El uso indiscriminado de bicarbonato puede provocar alcalosis metabólica de rebote, hipokaliemia y paradoja del LCR (acidosis paradójica del SNC).',
  ARRAY['medico','farmacia'],
  false,
  '["La acidosis de la GEA es habitualmente leve y se corrige con la rehidratación","El bicarbonato tiene efectos secundarios relevantes que lo hacen inadecuado como tratamiento estándar"]',
  null,
  null
);


-- ══════════════════════════════
-- PASO 5 — Alta y educación familiar
-- ══════════════════════════════

-- Q23 | MED+NUR
-- Realimentación precoz: no restringir dieta
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  'Tras completar la fase de rehidratación, ¿cuándo y cómo debe reiniciarse la alimentación?',
  '["Dieta astringente (arroz, manzana, zanahoria, plátano) durante 48-72 horas","Realimentación precoz con la alimentación habitual adecuada a la edad, sin restricción dietética","Ayuno de 6-8 horas tras la rehidratación para consolidar la tolerancia oral","SRO exclusiva las primeras 24 horas y luego introducción progresiva de sólidos"]',
  '1',
  'Las guías ESPGHAN y SEUP recomiendan la realimentación precoz con la dieta habitual adecuada a la edad tan pronto como se complete la fase de rehidratación. No hay evidencia de que la dieta astringente acelere la recuperación; por el contrario, puede empeorar el estado nutricional. La lactancia materna no debe interrumpirse en ningún momento. La alimentación habitual aporta los nutrientes necesarios para la regeneración del enterocito.',
  ARRAY['medico','enfermeria'],
  false,
  '["La restricción dietética no acorta la diarrea y puede prolongar el déficit nutricional","Las guías internacionales son unánimes en recomendar realimentación precoz sin restricción"]',
  null,
  null
);

-- Q24 | NUR
-- Educación a padres: signos de alarma para volver a urgencias
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Qué signos de alarma deben conocer los padres para volver a urgencias tras el alta por deshidratación moderada?',
  '["Cualquier nuevo episodio de vómito o diarrea en las primeras 24 horas","Letargia o irritabilidad marcada, signos de deshidratación progresiva (ojos hundidos, llanto sin lágrimas, ausencia de micción >8 horas) o deposiciones con sangre","Fiebre superior a 38 °C o rechazo de la primera toma al llegar a casa","Rechazo de la primera toma de alimentación sólida tras el alta"]',
  '1',
  'Los padres deben consultar de nuevo si aparecen: letargia o decaimiento marcado, signos de deshidratación progresiva (ojos muy hundidos, llanto sin lágrimas, fontanela hundida, ausencia de micción >8 horas), sangre en las heces, vómitos biliosos o empeoramiento general a pesar de cumplir el tratamiento. Episodios aislados de vómito o diarrea sin estos signos no requieren consulta urgente.',
  ARRAY['enfermeria'],
  false,
  '["Los padres deben distinguir la evolución normal de la GEA de los signos que indican complicación o fracaso del tratamiento","La oligoanuria es un signo claro de rehidratación insuficiente"]',
  null,
  null
);

-- Q25 | MED
-- Criterios de alta tras deshidratación moderada tratada
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Qué criterios deben cumplirse para dar el alta desde urgencias tras el tratamiento de una deshidratación moderada?',
  '["Solo ausencia de vómitos durante 1 hora tras finalizar el tratamiento","Tolerancia oral adecuada, mejoría clínica de los signos de deshidratación, ausencia de signos de alarma y familia capaz de continuar el tratamiento en domicilio","Natremia normalizada en analítica de control y recuperación del 100% del peso previo","Desaparición completa de la diarrea y restablecimiento del ritmo intestinal normal"]',
  '1',
  'Los criterios de alta incluyen: tolerancia oral demostrada (SRO o alimentación), mejoría clínica de los signos de deshidratación (relleno capilar normalizado, mucosas más húmedas, mejora del estado general), ausencia de signos de alarma y familia con capacidad y comprensión para continuar el tratamiento en domicilio. No es necesario esperar a que la diarrea desaparezca ni a recuperar el peso previo al proceso.',
  ARRAY['medico'],
  false,
  '["El alta no requiere que la GEA haya finalizado, sino que el niño esté compensado y la familia preparada","La recuperación completa del peso puede tardar días y no es un criterio de alta en urgencias"]',
  null,
  null
);

-- Q26 | NUR
-- Lactancia materna: NO suspender en ningún caso
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  'Una madre en periodo de lactancia materna pregunta si debe suspender la lactancia durante el proceso de GEA de su bebé. ¿Cuál es la respuesta correcta?',
  '["Sí, durante las primeras 24 horas para dar descanso al intestino","No, la lactancia materna debe mantenerse durante toda la enfermedad sin interrupción","Solo suspenderla si el bebé tiene vómitos frecuentes asociados","Sustituir la lactancia materna por SRO hasta que cesen los síntomas"]',
  '1',
  'La lactancia materna no debe suspenderse en ningún caso durante la GEA. La leche materna aporta agua, electrolitos, factores inmunológicos y nutrientes que favorecen la recuperación intestinal. Puede complementarse con SRO pero nunca sustituirse. La interrupción de la lactancia no tiene ningún beneficio clínico demostrado y puede suponer un perjuicio tanto para la madre como para el lactante.',
  ARRAY['enfermeria'],
  false,
  '["La lactancia materna tiene efecto protector y terapéutico en la gastroenteritis aguda","Las guías internacionales son unánimes en recomendar mantener la lactancia materna durante la GEA"]',
  null,
  null
);

-- Q27 | PHARM
-- Probióticos en GEA: evidencia actual por cepas
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Qué dice la evidencia actual sobre el uso de probióticos como adyuvante en la GEA aguda en niños?',
  '["Están contraindicados en menores de 2 años por riesgo de bacteriemia","Lactobacillus rhamnosus GG y Saccharomyces boulardii tienen evidencia de acortar la duración de la diarrea aproximadamente 1 día; pueden considerarse como adyuvante cepa-específico","Todos los probióticos son equivalentes y deben usarse sistemáticamente en GEA moderada-grave","No tienen ningún beneficio demostrado en GEA y ninguna guía los recomienda"]',
  '1',
  'Lactobacillus rhamnosus GG (LGG) y Saccharomyces boulardii son las cepas con mayor evidencia en GEA pediátrica: acortan la duración de la diarrea aproximadamente 1 día y reducen el riesgo de diarrea prolongada. Sin embargo, el efecto es modesto y cepa-dependiente; no todos los productos comerciales tienen la misma evidencia. Las guías ESPGHAN los recomiendan como adyuvantes opcionales, no como tratamiento de primera línea.',
  ARRAY['farmacia'],
  false,
  '["La eficacia de los probióticos es cepa-específica, no es un efecto de clase","Los beneficios son estadísticamente significativos pero clínicamente modestos: aproximadamente 1 día menos de diarrea"]',
  null,
  null
);


-- ─────────────────────────────────────────────
-- 4. CASE BRIEF (scenario_id = 119)
-- ─────────────────────────────────────────────
INSERT INTO case_briefs (
  id, scenario_id, title, context, chief_complaint, chips,
  history, triangle, vitals, exam, quick_labs, imaging, timeline,
  red_flags, objectives, competencies, critical_actions,
  learning_objective, level, estimated_minutes
) VALUES (
  gen_random_uuid(),
  119,
  'Deshidratación por gastroenteritis aguda',
  'Urgencias pediátricas hospitalarias',
  'Lactante de 18 meses con vómitos y diarrea de 48 horas y signos de deshidratación moderada.',
  '["Vómitos 48h","Diarrea acuosa 36h","Relleno capilar 3 s","Mucosas secas","Oliguria 8h"]',
  '{
    "Síntomas": ["Vómitos desde hace 48 horas (hasta 6 episodios en las últimas 12 horas)", "Diarrea acuosa desde hace 36 horas (4-5 deposiciones/día)", "Última micción hace más de 8 horas", "Rechazo parcial de la alimentación desde hace 24 horas"],
    "Antecedentes": "Sin antecedentes patológicos de interés. Vacunación correcta para la edad (incluida rotavirus). Sin alergias conocidas.",
    "Medicación previa": "Ninguna en el momento de la consulta.",
    "Entorno epidemiológico": "Hermano mayor con cuadro similar hace 3 días. Asiste a guardería.",
    "Datos adicionales relevantes": "Peso habitual: 11,8 kg. Peso actual: 11 kg (pérdida de 0,8 kg = 6,8%). Última toma líquida aceptada: 4 horas antes de la consulta."
  }',
  '{"appearance":"green","breathing":"green","circulation":"amber"}',
  '{"fc":148,"fr":28,"sat":98,"temp":37.5,"tas":90,"tad":55,"peso":11}',
  '{
    "Neurológico": "Alerta, reactivo, llanto con lágrimas escasas",
    "Piel y mucosas": "Mucosas orales secas, ojos levemente hundidos, turgencia cutánea levemente disminuida en abdomen",
    "Abdomen": "Blando, depresible, sin defensa, peristaltismo aumentado",
    "Relleno capilar": "3 segundos en yema de dedos"
  }',
  '[{"name":"Glucemia capilar","value":"72 mg/dL (normal, sin hipoglucemia)"},{"name":"Tira de orina","value":"Densidad 1.030, no leucocitos, no nitritos"}]',
  '[{"name":"Rx abdomen","status":"no indicada de rutina"},{"name":"Analítica de sangre","status":"no indicada de rutina en DH moderada sin factores de riesgo"}]',
  '[{"t":0,"evento":"Inicio de vómitos (hace 48 horas)"},{"t":12,"evento":"Inicio de diarrea acuosa (hace 36 horas)"},{"t":40,"evento":"Empeoramiento: vómitos más frecuentes, rechazo alimentación"},{"t":46,"evento":"Última micción documentada"},{"t":48,"evento":"Llegada a urgencias pediátricas"}]',
  '[{"text":"Relleno capilar de 3 segundos (>2 s): alteración de la circulación en el TEP","correct":true},{"text":"Mucosas orales secas: signo de deshidratación moderada-grave","correct":true},{"text":"Oliguria >8 horas: indica déficit de volumen significativo","correct":true},{"text":"Ojos levemente hundidos: signo de Gorelick positivo","correct":true},{"text":"Taquicardia (FC 148 lpm): respuesta compensadora al déficit de volumen","correct":true}]',
  '{
    "MED": [
      "Aplicar el TEP e identificar correctamente la alteración de la circulación",
      "Clasificar el grado de deshidratación (moderada ~7%) y el tipo (isonatrémica)",
      "Decidir no solicitar analítica de rutina en deshidratación moderada sin factores de riesgo",
      "Indicar RHO como primera línea con SRO de baja osmolaridad",
      "Reconocer las contraindicaciones de RHO y de RIR",
      "Indicar RIR con pauta correcta (SS 0,9% ± glucosa 2,5%, 20 mL/kg/h) ante fracaso de RHO"
    ],
    "NUR": [
      "Registrar FC, FR, SpO2, temperatura y peso actual en la primera valoración",
      "Administrar SRO con la pauta correcta en presencia de vómitos (5 mL/2-5 min)",
      "Monitorizar al paciente cada hora durante la RIR",
      "Reponer pérdidas continuadas con las cantidades correctas por peso",
      "Proporcionar educación familiar sobre signos de alarma y realimentación precoz"
    ],
    "PHARM": [
      "Identificar las características de la SRO ESPGHAN (baja osmolaridad, Na+ 60 mEq/L)",
      "Calcular y recomendar la dosis correcta de ondansetrón (0,15 mg/kg, máx 8 mg)",
      "Conocer la precaución de prolongación de QT del ondansetrón",
      "Seleccionar la solución IV correcta para RIR (SS 0,9% ± glucosa 2,5%)",
      "Identificar las contraindicaciones de la RIR (edad, natremia, estabilidad hemodinámica)"
    ]
  }',
  '["Reconocimiento clínico de deshidratación pediátrica","Decisión terapéutica basada en evidencia (RHO primera línea)","Evitar procedimientos innecesarios (analítica rutinaria, IV sin indicación)","Comunicación efectiva con la familia","Trabajo interprofesional en urgencias pediátricas"]',
  '["Aplicar el TEP e identificar la alteración de la circulación","No solicitar analítica de rutina en deshidratación moderada sin factores de riesgo","Iniciar RHO como primera línea con pauta correcta en presencia de vómitos","Administrar ondansetrón a dosis correcta (0,15 mg/kg) si vómitos persistentes","Ante fracaso de RHO, indicar RIR con SS 0,9% ± glucosa 2,5% a 20 mL/kg/h"]',
  'Reconocer y manejar la deshidratación moderada por GEA aplicando la rehidratación oral como primera línea y la hidratación IV rápida cuando está indicada.',
  'basico',
  20
);


-- ─────────────────────────────────────────────
-- 5. CASE RESOURCES (scenario_id = 119)
-- ─────────────────────────────────────────────
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), 119,
   'Urgencias en Pediatría. Manual de la SEUP (4ª edición) — Capítulo: Deshidratación',
   'https://www.seup.org/pdf_public/pub/manuales/urgencias_pediatria_4ed.pdf',
   'SEUP',
   'guía',
   2024,
   true,
   now()),

  (gen_random_uuid(), 119,
   'Protocolo de deshidratación aguda en urgencias pediátricas — SEUP 2020',
   'https://www.seup.org/pdf_public/pub/protocolos/Deshidratacion.pdf',
   'SEUP',
   'protocolo',
   2020,
   true,
   now()),

  (gen_random_uuid(), 119,
   'ESPGHAN/ESPID Evidence-based Guidelines for the Management of Acute Gastroenteritis in Children in Europe',
   'https://journals.lww.com/jpgn/fulltext/2014/03000/espghan_espid_evidence_based_guidelines_for_the.18.aspx',
   'Journal of Pediatric Gastroenterology and Nutrition',
   'guía',
   2014,
   false,
   now()),

  (gen_random_uuid(), 119,
   'Oral Rehydration Therapy for Children with Gastroenteritis — Cochrane Review',
   'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004390.pub3/full',
   'Cochrane Database of Systematic Reviews',
   'metaanálisis',
   2006,
   false,
   now()),

  (gen_random_uuid(), 119,
   'Rapid vs Standard Intravenous Rehydration in Paediatric Gastroenteritis — Freedman et al., NEJM',
   'https://www.nejm.org/doi/full/10.1056/NEJMoa1906809',
   'New England Journal of Medicine',
   'artículo',
   2021,
   false,
   now()),

  (gen_random_uuid(), 119,
   'Ondansetron for vomiting in children with gastroenteritis — Cochrane Review',
   'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD005506.pub3/full',
   'Cochrane Database of Systematic Reviews',
   'metaanálisis',
   2021,
   false,
   now());
