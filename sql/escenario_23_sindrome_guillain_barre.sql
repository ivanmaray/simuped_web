-- ══════════════════════════════════════════════════════════════════
-- ESCENARIO 23: Síndrome de Guillain-Barré con insuficiencia respiratoria
-- Paciente: Niño 8 años, 25 kg. Parálisis flácida ascendente, diplejía
-- facial, disfagia. Antecedente gastroenteritis 3 semanas. FR 28,
-- SpO2 94%, Hughes 3. Riesgo de fallo respiratorio inminente.
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────
-- PASO 1: SCENARIO
-- ──────────────────────────────────────────
INSERT INTO scenarios (title, summary, level, difficulty, mode, status, estimated_minutes, max_attempts)
VALUES (
  'Síndrome de Guillain-Barré con insuficiencia respiratoria',
  'Niño de 8 años con debilidad flácida ascendente, diplejía facial y disfagia tras gastroenteritis. SpO2 94%, FR 28 rpm, Hughes 3. Riesgo de fallo respiratorio inminente que requiere decisión de UCI y escalada a ventilación mecánica.',
  'avanzado',
  'Avanzado',
  ARRAY['online'],
  'En construcción: en proceso',
  25,
  3
) RETURNING id;
-- ⚠️ Guarda este ID como $SCENARIO_ID

-- ──────────────────────────────────────────
-- PASO 2: STEPS
-- ──────────────────────────────────────────
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  ($SCENARIO_ID, 1, 'Reconocimiento y sospecha diagnóstica',
   'Evalúa a un niño de 8 años con 5 días de debilidad progresiva en MMII, ahora con diplejía facial bilateral y voz nasal. Antecedente de gastroenteritis resuelta hace 3 semanas. Identifica el patrón clínico, prioriza el diagnóstico y decide si la punción lumbar es urgente.',
   false, null),
  ($SCENARIO_ID, 2, 'Evaluación de gravedad y decisión de UCI',
   'El paciente tiene FR 28 rpm, SpO2 94% basal, FC 112 lpm, TA 110/70. Disfagia moderada y voz nasal. Cuantifica la gravedad con la escala de Hughes, aplica los predictores de ventilación mecánica y decide el nivel asistencial adecuado.',
   false, null),
  ($SCENARIO_ID, 3, 'Tratamiento inmunomodulador',
   'Indica el tratamiento de primera línea, calcula dosis para 25 kg y prescribe el manejo del dolor neuropático. Decide sobre el uso de corticoides. Registra la medicación y verifica compatibilidades.',
   false, null),
  ($SCENARIO_ID, 4, 'Manejo de complicaciones',
   'A las 24h en UCIp: episodios de bradicardia sinusal (FC 48 lpm autolimitados), disfagia progresiva con riesgo de aspiración y encamamiento prolongado. Maneja la disautonomía, la vía de nutrición y la profilaxis tromboembólica.',
   false, null),
  ($SCENARIO_ID, 5, 'Escalada a ventilación mecánica y decisión terapéutica',
   'A las 48h: FR 35 rpm, SpO2 88% con FiO2 0.5, uso de musculatura accesoria y paradoja abdominal. Decide la indicación de intubación, elige el agente inductor adecuado en SGB y valora la plasmaféresis como segunda línea.',
   false, null)
RETURNING id;
-- ⚠️ Guarda los IDs como $STEP_ID_1, $STEP_ID_2, $STEP_ID_3, $STEP_ID_4, $STEP_ID_5

-- ──────────────────────────────────────────
-- PASO 3: QUESTIONS
-- ──────────────────────────────────────────

-- ===================== STEP 1: Reconocimiento y sospecha diagnóstica =====================

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES

-- Q1: Diagnóstico más probable (MED, CRÍTICA)
(
  $STEP_ID_1,
  '¿Cuál es el diagnóstico más probable en este niño con debilidad flácida ascendente, arreflexia generalizada, diplejía facial bilateral y antecedente de infección GI 3 semanas antes?',
  '["Mielitis transversa aguda","Síndrome de Guillain-Barré","Botulismo infantil","Miastenia gravis juvenil"]',
  '1',
  'El SGB es la causa más frecuente de parálisis flácida aguda en niños. La combinación de debilidad ascendente + arreflexia + antecedente infeccioso 2-4 semanas antes (mimetismo molecular mediado por anticuerpos anti-gangliósido) es el patrón clásico. La diplejía facial en niños es especialmente sugestiva. La mielitis transversa cursa con nivel sensitivo y disfunción vesical; el botulismo afecta primero nervios craneales; la miastenia no produce arreflexia.',
  ARRAY['medico'],
  true,
  '["¿Qué patrón motor (espástico vs flácido) y qué reflejos osteotendinosos esperarías en SGB?","¿En qué se diferencia la distribución temporal de la debilidad en SGB vs mielitis transversa?"]',
  90,
  'Errar el diagnóstico de SGB retrasa el ingreso en UCI, la monitorización respiratoria y el inicio de IgIV, con riesgo de fallo respiratorio sin soporte.'
),

-- Q2: Hallazgo clínico clave (MED+NUR, no crítica)
(
  $STEP_ID_1,
  '¿Qué combinación de hallazgos en la exploración neurológica es más característica del SGB clásico y lo diferencia de otras causas de parálisis flácida aguda?',
  '["Debilidad espástica con hiperreflexia y signo de Babinski positivo","Debilidad flácida arrefléctica con predominio distal y progresión ascendente","Debilidad proximal con reflejos conservados y fasciculaciones","Debilidad con nivel sensitivo definido y retención urinaria"]',
  '1',
  'La neuropatía desmielinizante del SGB produce debilidad flácida arrefléctica de inicio distal con progresión ascendente (polineuropatía). La hiperreflexia sugiere patología central (mielitis); las fasciculaciones con reflejos conservados orientan a ELA o atrofia muscular espinal; el nivel sensitivo con disfunción vesical es propio de mielitis transversa.',
  ARRAY['medico', 'enfermeria'],
  false,
  '["¿Dónde está la lesión en SGB: neurona motora superior, inferior, unión neuromuscular o músculo?","¿La desmielinización periférica produce hiperreflexia o arreflexia?"]',
  null,
  null
),

-- Q3: PL urgente (MED, CRÍTICA)
(
  $STEP_ID_1,
  'Ante la sospecha clínica de SGB, ¿debes realizar punción lumbar de forma urgente en urgencias para confirmar el diagnóstico antes de iniciar tratamiento?',
  '["Sí, la disociación albuminocitológica en LCR es imprescindible para iniciar IgIV","No, el diagnóstico es clínico; la PL es ideal entre la 2ª-3ª semana cuando el LCR es más informativo","Sí, pero solo si los estudios de conducción nerviosa no están disponibles en las próximas 2 horas","No, la PL está contraindicada en SGB por riesgo de herniación"]',
  '1',
  'El diagnóstico de SGB es clínico (criterios de Brighton Level 1-3). La PL no es urgente: en la primera semana el LCR puede ser normal hasta en el 50% de los casos; la disociación albuminocitológica (proteínas elevadas sin pleocitosis) alcanza máxima sensibilidad entre la 2ª-3ª semana. El tratamiento con IgIV no debe retrasarse esperando el resultado del LCR cuando la clínica es compatible. La PL no está contraindicada, simplemente no es diagnósticamente urgente.',
  ARRAY['medico'],
  true,
  '["¿En qué semana de evolución es más sensible el LCR para SGB?","¿Los criterios de Brighton para SGB requieren LCR para niveles 2 y 3?"]',
  90,
  'Retrasar el inicio de IgIV para esperar resultados de PL o estudios neurofisiológicos aumenta el riesgo de deterioro respiratorio rápido y prolonga la parálisis innecesariamente.'
),

-- Q4: Signos de alarma respiratoria (NUR, CRÍTICA)
(
  $STEP_ID_1,
  'Durante la valoración inicial en urgencias, ¿qué signos clínicos indican deterioro respiratorio inminente en un paciente con SGB que deben alertar a enfermería para avisar urgentemente?',
  '["Saturación 96%, FR 22 rpm y habla fluida","FR >30 rpm, diaforesis y respiración paradójica abdominal","Diplejía facial y disfagia leve sin disnea","Arreflexia generalizada y debilidad en MMII"]',
  '1',
  'La tríada FR >30 rpm + diaforesis + respiración paradójica (el abdomen se hunde en inspiración porque el diafragma falla y los músculos intercostales traccionan la pared) indica fatiga diafragmática y fallo respiratorio inminente. En SGB la capacidad vital cae rápidamente; cuando la CV <20 mL/kg o la FR supera 30 rpm con signos de trabajo respiratorio, la intubación es inevitable. La diplejía facial o la arreflexia solas no indican compromiso respiratorio.',
  ARRAY['enfermeria'],
  true,
  '["¿Qué signo de trabajo respiratorio indica fallo del diafragma específicamente?","¿Qué valor de capacidad vital en mL/kg es criterio de intubación en SGB?"]',
  60,
  'No reconocer los signos de fatiga diafragmática puede llevar a una parada respiratoria sin intubación programada, con riesgo vital inmediato.'
);

-- ===================== STEP 2: Evaluación de gravedad y decisión de UCI =====================

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES

-- Q5: Escala de Hughes (MED, no crítica)
(
  $STEP_ID_2,
  '¿Qué puntuación de la escala de Hughes corresponde a un niño con SGB que puede caminar más de 5 metros solo pero necesita apoyo, tiene disfagia leve y diplejía facial sin requerir ventilación?',
  '["Hughes 2: capaz de caminar >5 m sin apoyo","Hughes 3: capaz de caminar >5 m con apoyo","Hughes 4: postrado en cama o silla de ruedas","Hughes 5: requiere ventilación mecánica"]',
  '1',
  'La escala de Hughes estratifica la discapacidad en SGB del 0 (normal) al 6 (muerte). Hughes 3 corresponde a "capaz de caminar >5 m con apoyo o andador", que es el umbral clásico de gravedad moderada que justifica monitorización estrecha y tratamiento activo. Hughes 4 implica incapacidad para caminar; Hughes 5, ventilación mecánica. Conocer la puntuación guía la indicación de IgIV y el nivel asistencial.',
  ARRAY['medico'],
  false,
  '["¿En la escala de Hughes, el 3 implica que puede caminar o que no puede?","¿Qué puntación de Hughes es criterio de tratamiento con IgIV según las guías?"]',
  null,
  null
),

-- Q6: Criterios de ingreso UCI (MED, CRÍTICA)
(
  $STEP_ID_2,
  'Con FR 28 rpm, SpO2 94% basal, disfagia moderada y voz nasal (Hughes 3), ¿cuál es la decisión correcta respecto al nivel asistencial?',
  '["Alta a domicilio con control ambulatorio en 48h","Ingreso en planta de pediatría con monitorización estándar","Ingreso directo en UCIp por riesgo de fallo respiratorio y disfunción bulbar","Observación en urgencias 6h y reevaluación antes de decidir ingreso"]',
  '2',
  'Los criterios de ingreso en UCI en SGB incluyen: disfunción bulbar (disfagia, voz nasal, riesgo de aspiración), SpO2 <95% basal, FR elevada con signos de trabajo respiratorio, y Hughes ≥3 con progresión rápida. Este paciente cumple tres criterios. La monitorización en planta estándar es insuficiente: la CV puede caer en horas y la bradicardia por disautonomía puede requerir marcapasos. La demora en UCI aumenta la mortalidad.',
  ARRAY['medico'],
  true,
  '["¿La disfunción bulbar en SGB es un criterio de UCI o solo de observación en planta?","¿Con SpO2 94% basal en un niño con SGB, cuánto tiempo puede tardar en necesitar ventilación?"]',
  90,
  'Ingresar en planta estándar a un paciente con SGB y disfunción bulbar aumenta el riesgo de parada respiratoria o aspiración sin soporte inmediato disponible.'
),

-- Q7: Predictor mayor de ventilación mecánica (MED, no crítica)
(
  $STEP_ID_2,
  'Según los estudios de predicción de ventilación mecánica en SGB pediátrico, ¿qué hallazgo clínico tiene el mayor odds ratio para predecir necesidad de VM?',
  '["Arreflexia generalizada (OR 4.2)","Progresión rápida en <7 días (OR 3.1)","Disfunción bulbar (disfagia, voz nasal, parálisis facial) (OR 18.67)","Disautonomía (fluctuaciones tensionales, arritmias) (OR 11.55)"]',
  '2',
  'En los estudios de predicción de VM en SGB pediátrico, la disfunción bulbar tiene el mayor OR (18.67), seguida de disautonomía (OR 11.55) y oftalmoplegia (OR 5.68). La disfunción bulbar refleja afectación de nervios craneales bajos (IX, X, XII) e indica extensión proximal de la desmielinización que puede comprometer el centro respiratorio. Su presencia obliga a monitorización en UCI independientemente de la CV inicial.',
  ARRAY['medico'],
  false,
  '["¿Qué nervios craneales controlan la deglución y qué pasa cuando fallan en SGB?","¿La disfunción bulbar precede o sigue habitualmente al fallo respiratorio en SGB?"]',
  null,
  null
),

-- Q8: Monitorización UCIp (NUR, no crítica)
(
  $STEP_ID_2,
  '¿Qué parámetros son prioritarios para monitorizar en UCIp en un niño con SGB y disfunción bulbar?',
  '["Glucemia capilar horaria y temperatura axilar cada 4h","Monitorización cardíaca continua, FR horaria y evaluación de deglución antes de cada toma","Diuresis horaria y balance hídrico estricto","Presión intracraneal y pupilometría cada 2h"]',
  '1',
  'En SGB con disfunción bulbar y disautonomía, la monitorización prioritaria incluye: ECG continuo (bradicardia/taquicardia, bloqueos por disautonomía), FR y patrón respiratorio horario (detectar fatiga diafragmática precoz), y evaluación clínica de deglución antes de cada toma oral (riesgo de aspiración). La glucemia y temperatura son importantes pero no prioritarias. La PIC no está elevada en SGB.',
  ARRAY['enfermeria'],
  false,
  '["¿Por qué puede haber arritmias en SGB si es una neuropatía periférica?","¿Cómo evalúa enfermería la deglución segura antes de ofrecer líquidos?"]',
  null,
  null
),

-- Q9: Posicionamiento (NUR, no crítica)
(
  $STEP_ID_2,
  '¿Qué posición es más adecuada para un paciente con SGB, disfagia y riesgo de aspiración encamado en UCI?',
  '["Decúbito supino plano para evitar hipotensión ortostática","Cabecero a 30-45° (semi-Fowler) para reducir riesgo de aspiración y mejorar mecánica diafragmática","Decúbito lateral estricto alternando cada 2h","Trendelenburg para mejorar retorno venoso en episodios de bradicardia"]',
  '1',
  'El cabecero a 30-45° cumple dos objetivos simultáneos en SGB: reduce el riesgo de aspiración en pacientes con disfagia o reflujo, y mejora la mecánica ventilatoria al desplazar el contenido abdominal caudalmente, facilitando el descenso diafragmático. El Trendelenburg está contraindicado en presencia de disfagia. El decúbito supino plano aumenta el riesgo de aspiración y empeora la función diafragmática.',
  ARRAY['enfermeria'],
  false,
  '["¿A qué ángulo de inclinación se reduce significativamente el riesgo de neumonía aspirativa?","¿Cómo afecta la posición horizontal a la excursión diafragmática?"]',
  null,
  null
);

-- ===================== STEP 3: Tratamiento inmunomodulador =====================

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES

-- Q10: Tratamiento de primera línea (MED, CRÍTICA)
(
  $STEP_ID_3,
  '¿Cuál es el tratamiento inmunomodulador de primera línea indicado en este niño con SGB Hughes ≥3 con disfunción bulbar?',
  '["Metilprednisolona IV 30 mg/kg/día × 3 días","IgIV 0.4 g/kg/día × 5 días (2 g/kg total), sin corticoides asociados","IgIV 1 g/kg/día × 2 días + metilprednisolona 2 mg/kg/día","Plasmaféresis como primera opción en <48h de ingreso"]',
  '1',
  'La IgIV en pauta de 0.4 g/kg/día durante 5 días (total 2 g/kg) es la primera línea en SGB pediátrico con Hughes ≥2. Los corticoides están formalmente contraindicados en SGB: los ensayos clínicos demuestran que no aceleran la recuperación y pueden prolongar el curso (incluido el Dutch Guillain-Barré Study). La pauta de 1 g/kg × 2 días tiene eficacia equivalente en adultos pero datos más limitados en pediatría. La plasmaféresis es igualmente eficaz pero más invasiva y reservada como segunda línea o cuando no hay acceso a IgIV.',
  ARRAY['medico'],
  true,
  '["¿Qué dice la evidencia sobre el uso de corticoides en SGB?","¿Cuál es la dosis total de IgIV en SGB independientemente de la pauta elegida?"]',
  90,
  'Administrar corticoides en lugar de IgIV no aporta beneficio terapéutico y puede prolongar el curso de la enfermedad; retrasar el tratamiento correcto aumenta el tiempo en VM y la morbilidad.'
),

-- Q11: Cálculo dosis IgIV (PHARM, no crítica)
(
  $STEP_ID_3,
  'Para un niño de 25 kg con SGB que va a recibir IgIV 0.4 g/kg/día durante 5 días, ¿cuántos gramos totales se administrarán y cuántos gramos por día?',
  '["5 g/día durante 5 días = 25 g totales","10 g/día durante 5 días = 50 g totales","20 g/día durante 5 días = 100 g totales","2 g/día durante 5 días = 10 g totales"]',
  '1',
  'Cálculo: 0.4 g/kg/día × 25 kg = 10 g/día. Durante 5 días: 10 g × 5 = 50 g totales (= 2 g/kg total). Las presentaciones comerciales de IgIV habituales son viales de 5 g/100 mL, 10 g/200 mL o 20 g/400 mL al 5%, o viales de 5 g/50 mL, 10 g/100 mL al 10%. Para 10 g/día al 10%: 100 mL/día. Velocidad de infusión: iniciar a 0.5 mg/kg/min y escalar progresivamente según tolerancia.',
  ARRAY['farmacia'],
  false,
  '["0.4 g/kg/día × 25 kg = ¿cuántos g/día?","¿Cuántos días dura la pauta estándar de IgIV en SGB?"]',
  null,
  null
),

-- Q12: Corticoides en SGB (MED, no crítica)
(
  $STEP_ID_3,
  'El residente de guardia sugiere añadir metilprednisolona "para reducir la inflamación más rápido". ¿Cuál es la respuesta correcta?',
  '["Añadir metilprednisolona 2 mg/kg/día IV durante 5 días junto con la IgIV","No añadir corticoides: la evidencia muestra que no aceleran la recuperación y pueden prolongarla","Sustituir la IgIV por metilprednisolona si el SGB es leve","Añadir corticoides solo si hay afectación de nervios craneales"]',
  '1',
  'El Dutch Guillain-Barré Study (N Engl J Med 1997) y metaanálisis de Cochrane demuestran que los corticoides orales o IV no mejoran el pronóstico en SGB y pueden aumentar la tasa de recaídas. A diferencia del SRNS o la PTI, en SGB los corticoides no tienen papel inmunomodulador beneficioso. La causa es probablemente que el SGB es mediado por anticuerpos específicos anti-gangliósido y no por linfocitos T sensibles a corticoides.',
  ARRAY['medico'],
  false,
  '["¿En qué otras polineuropatías inflamatorias sí se usan corticoides (ej: CIDP)?","¿La evidencia sobre corticoides en SGB es de estudios observacionales o ensayos randomizados?"]',
  null,
  null
),

-- Q13: Dolor neuropático — fármaco (PHARM, no crítica)
(
  $STEP_ID_3,
  '¿Qué combinación de fármacos es más adecuada para el tratamiento del dolor neuropático en un niño de 8 años con SGB?',
  '["Metamizol 20 mg/kg/dosis + ibuprofeno 10 mg/kg/dosis alternantes","Gabapentina 15 mg/kg/día en 3 dosis + amitriptilina a dosis baja","Morfina IV en perfusión continua desde el inicio","Pregabalina 150 mg/12h (mismo que adultos)"]',
  '1',
  'Las guías de SGB pediátrico recomiendan gabapentina (15 mg/kg/día en 3 dosis) como primera línea para el dolor neuropático, con amitriptilina como coadyuvante si hay componente de alodinia o disestesias. Los AINEs y el metamizol tienen eficacia limitada sobre el dolor neuropático central. La morfina puede usarse como rescate en dolor severo, pero no como primera línea. La pregabalina tiene datos limitados en pediatría y la dosificación no se extrapola directamente del adulto.',
  ARRAY['farmacia'],
  false,
  '["¿Los antiinflamatorios tipo ibuprofeno son eficaces en dolor neuropático periférico?","¿Qué mecanismo de acción tiene la gabapentina sobre el dolor neuropático?"]',
  null,
  null
),

-- Q14: Cálculo gabapentina 25 kg (PHARM, no crítica)
(
  $STEP_ID_3,
  'Para iniciar gabapentina 15 mg/kg/día en 3 dosis en un niño de 25 kg, ¿cuál es la dosis por toma?',
  '["125 mg/dosis (375 mg/día ÷ 3)","50 mg/dosis (150 mg/día ÷ 3)","250 mg/dosis (750 mg/día ÷ 3)","100 mg/dosis (300 mg/día ÷ 3)"]',
  '0',
  'Cálculo: 15 mg/kg/día × 25 kg = 375 mg/día. Dividido en 3 tomas: 375 ÷ 3 = 125 mg/dosis. La gabapentina en solución oral está disponible al 50 mg/mL o en cápsulas de 100, 300 y 400 mg. Para 125 mg se puede usar 1 cápsula de 100 mg + 0.5 mL de solución 50 mg/mL, o 2.5 mL de solución 50 mg/mL. Iniciar a 1/3 de la dosis objetivo el día 1 y escalar en 3-5 días para minimizar somnolencia.',
  ARRAY['farmacia'],
  false,
  '["15 mg/kg/día × 25 kg = ¿mg/día totales?","¿Entre cuántas tomas se divide la gabapentina en pediatría?"]',
  null,
  null
);

-- ===================== STEP 4: Manejo de complicaciones =====================

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES

-- Q15: Disautonomía bradicardia (MED+NUR, no crítica)
(
  $STEP_ID_4,
  'A las 24h en UCI, el paciente presenta episodios de bradicardia sinusal (FC 48 lpm) autolimitados de 20-30 segundos sin síntomas ni hipotensión. ¿Cuál es el manejo más adecuado?',
  '["Administrar atropina IV 0.02 mg/kg en cada episodio para prevenir asistolia","Monitorización estrecha, registrar duración y frecuencia; no intervenir si son autolimitados y sin compromiso hemodinámico","Colocar marcapasos transcutáneo profiláctico inmediatamente","Suspender la IgIV porque la bradicardia es un efecto adverso frecuente"]',
  '1',
  'La disautonomía del SGB (por afectación del sistema nervioso autónomo) produce fluctuaciones de FC y TA que son típicamente autolimitadas. Los episodios de bradicardia sin compromiso hemodinámico solo requieren monitorización. La atropina se reserva para bradicardias sostenidas o con inestabilidad hemodinámica. El marcapasos profiláctico no está indicado rutinariamente. La IgIV no provoca bradicardia; suspenderla sería un error grave. Los fármacos cronotrópicos (ej. betabloqueantes) están contraindicados por el riesgo de bradicardia refractaria.',
  ARRAY['medico', 'enfermeria'],
  false,
  '["¿La disautonomía en SGB produce solo bradicardia o también taquicardia e hipotensión?","¿Cuándo está indicado el marcapasos en disautonomía por SGB?"]',
  null,
  null
),

-- Q16: Disfagia y vía de nutrición (NUR, no crítica)
(
  $STEP_ID_4,
  'El paciente tiene disfagia progresiva y no puede deglutir de forma segura. ¿Cuál es la vía de soporte nutricional más adecuada?',
  '["Nutrición parenteral total por vía central desde el primer día","Dieta oral triturada con espesante hasta que mejore la disfagia","Sonda nasogástrica para nutrición enteral continua o fraccionada","Restricción hídrica y esperar recuperación espontánea en 24-48h"]',
  '2',
  'La disfagia en SGB con riesgo de aspiración es indicación de sonda nasogástrica para nutrición enteral. La SNG permite continuar nutrición enteral (preferida sobre parenteral: preserva función intestinal, menor riesgo infeccioso, menor coste) de forma segura sin riesgo de aspiración. La dieta oral con espesante no es segura si existe disfunción bulbar franca. La nutrición parenteral se reserva para cuando la enteral no es tolerable o está contraindicada.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué prueba de cabecera puede usar enfermería para detectar aspiración silente antes de decidir la vía oral?","¿La nutrición enteral o parenteral tiene más ventajas en el paciente crítico pediátrico?"]',
  null,
  null
),

-- Q17: Profilaxis TVP (PHARM, no crítica)
(
  $STEP_ID_4,
  'El niño lleva 48h en UCI con encamamiento completo. ¿Qué medida farmacológica es prioritaria para prevenir la enfermedad tromboembólica venosa?',
  '["No se indica profilaxis porque los niños tienen bajo riesgo trombótico","HBPM a dosis profiláctica subcutánea (enoxaparina 0.5 mg/kg/12h en <2 meses o 0.5 mg/kg/día en >2 meses)","Aspirina 5 mg/kg/día oral como antiagregante","Heparina no fraccionada IV en perfusión continua"]',
  '1',
  'En pacientes pediátricos con encamamiento prolongado y parálisis, el riesgo de TVP es real aunque menor que en adultos. Las guías ACCP y SEUP recomiendan HBPM profiláctica (enoxaparina 0.5 mg/kg/12h subcutánea en <2 meses; 0.5 mg/kg/día en niños >2 meses) combinada con medidas físicas (compresión neumática intermitente si disponible). La aspirina no tiene eficacia demostrada en profilaxis de TVP. La heparina no fraccionada IV requiere monitorización compleja y se reserva para tratamiento, no profilaxis.',
  ARRAY['farmacia'],
  false,
  '["¿La parálisis flácida de MMII es un factor de riesgo trombótico en pediatría?","¿En qué dosis se usa la enoxaparina profiláctica en niños?"]',
  null,
  null
);

-- ===================== STEP 5: Escalada a VM y decisión terapéutica =====================

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES

-- Q18: Indicación de VM (MED, CRÍTICA)
(
  $STEP_ID_5,
  'A las 48h: FR 35 rpm, SpO2 88% con FiO2 0.5, uso de esternocleidomastoideo y paradoja abdominal. ¿Cuál es la indicación correcta?',
  '["Oxigenoterapia de alto flujo y reevaluar en 2h antes de intubación","Intubación orotraqueal inmediata y conexión a VM, no demorar","CPAP/BiPAP no invasiva y reevaluar capacidad vital antes de intubar","Nebulización con adrenalina y corticoides para reducir el trabajo respiratorio"]',
  '1',
  'La presencia de SpO2 <90% con FiO2 >0.4, FR >30 rpm y signos de fatiga muscular respiratoria (paradoja abdominal, uso de músculos accesorios) son criterios absolutos de intubación en SGB. La regla 20/30/40 (CV <20 mL/kg, PaO2 <70 mmHg, PaCO2 >40 con signos de fatiga) también orienta. La VNI no está recomendada como puente en SGB con disfunción bulbar por riesgo de aspiración. Demorar la intubación aumenta el riesgo de intubación de urgencia en peores condiciones.',
  ARRAY['medico'],
  true,
  '["¿La paradoja abdominal en inspiración qué músculo indica que está fallando?","¿La VNI es segura en SGB con disfunción bulbar?"]',
  90,
  'Demorar la intubación en fallo respiratorio franco por SGB puede resultar en parada cardiorrespiratoria durante la intubación de urgencia, que tiene peor pronóstico que una intubación programada.'
),

-- Q19: Plasmaféresis segunda línea (MED, no crítica)
(
  $STEP_ID_5,
  'Con el paciente ya intubado y en VM, ¿en qué situación estaría indicado plantear plasmaféresis?',
  '["Nunca; la plasmaféresis está contraindicada en niños menores de 12 años","Como segunda línea si no hay respuesta a IgIV a los 7-10 días, o cuando no hay acceso a IgIV","Siempre en combinación con IgIV para obtener mayor eficacia sinérgica","Inmediatamente antes de intubar para evitar la progresión a VM"]',
  '1',
  'La plasmaféresis y la IgIV tienen eficacia equivalente como monoterapia en SGB. La plasmaféresis se reserva como segunda línea cuando: (1) no hay respuesta a IgIV a los 7-10 días, (2) no está disponible IgIV, o (3) como primera línea en centros con experiencia y acceso venoso adecuado. Los estudios (Cochrane 2012) demuestran que combinarlas no ofrece beneficio adicional sobre cada una por separado. En niños pequeños la plasmaféresis es técnicamente más compleja por el volumen de intercambio y requiere acceso venoso central de gran calibre.',
  ARRAY['medico'],
  false,
  '["¿La combinación de IgIV + plasmaféresis es superior a cada tratamiento solo en SGB?","¿Cuándo se considera que un paciente no responde a IgIV en SGB?"]',
  null,
  null
),

-- Q20: IgIV velocidad de infusión (PHARM, no crítica)
(
  $STEP_ID_5,
  'Al preparar la IgIV para infusión en un niño de 25 kg, ¿cuál es la pauta de velocidad de infusión correcta para minimizar reacciones adversas?',
  '["Infundir a velocidad máxima desde el inicio para reducir el tiempo de administración","Iniciar a velocidad lenta (0.5-1 mg/kg/min) y aumentar progresivamente cada 15-30 min según tolerancia","La velocidad de infusión no influye en la incidencia de reacciones adversas a IgIV","Administrar siempre con premedicación de hidrocortisona y antihistamínico obligatoriamente"]',
  '1',
  'La velocidad de infusión es el principal factor modificable de las reacciones adversas a IgIV (cefalea, fiebre, escalofríos, hipotensión). El protocolo estándar es: iniciar a 0.5 mg/kg/min durante los primeros 30 min; si tolerancia adecuada, escalar a 1 mg/kg/min y luego hasta máximo 2-4 mg/kg/min. La premedicación con antihistamínicos o paracetamol puede considerarse en pacientes con antecedentes de reacciones, pero no es obligatoria en primera infusión. La hidrocortisona rutinaria no está recomendada.',
  ARRAY['farmacia'],
  false,
  '["¿Qué reacciones adversas son más frecuentes al inicio de la infusión de IgIV?","¿La velocidad de infusión es el principal factor de riesgo modificable para reacciones a IgIV?"]',
  null,
  null
);

-- ──────────────────────────────────────────
-- PASO 4: CASE BRIEF
-- ──────────────────────────────────────────
INSERT INTO case_briefs (
  id, scenario_id, title, context, chief_complaint, chips,
  history, triangle, vitals, exam, quick_labs, imaging, timeline,
  red_flags, objectives, competencies, critical_actions,
  learning_objective, level, estimated_minutes
) VALUES (
  gen_random_uuid(),
  $SCENARIO_ID,
  'Síndrome de Guillain-Barré con insuficiencia respiratoria',
  'Urgencias pediátricas hospitalarias. Niño de 8 años traído por sus padres por debilidad progresiva en piernas de 5 días de evolución, con diplejía facial bilateral y cambio de voz desde ayer.',
  'Debilidad progresiva en piernas con dificultad para caminar, voz nasal y dificultad para tragar desde hace 24 horas.',
  '["Debilidad flácida ascendente","Diplejía facial bilateral","Disfagia y voz nasal","Antecedente gastroenteritis 3 semanas"]',
  '{
    "Síntomas": ["Debilidad progresiva MMII de 5 días", "Dificultad para caminar sin apoyo desde ayer", "Diplejía facial bilateral", "Voz nasal, disfagia leve", "Sin fiebre, sin alteración del nivel de conciencia"],
    "Antecedentes": "Niño previamente sano. Gastroenteritis autolimitada hace 3 semanas (Campylobacter sospechado, no confirmado microbiológicamente). Vacunaciones al día.",
    "Medicación previa": "Ninguna",
    "Exploración neurológica": "Tetraparesia flácida con predominio distal en MMII. Arreflexia osteotendinosa generalizada. Fuerza MMII 3/5 proximal, 2/5 distal. MMSS 4/5. Diplejía facial bilateral. Sensibilidad táctil y algésica preservadas (ligera hipestesia distal). Sin alteración de pares craneales III, IV, VI.",
    "Datos adicionales": "Puede caminar >5 metros con apoyo de los padres (Hughes 3). SpO2 94% sin suplemento O2. No signos meníngeos. Fondo de ojo diferido."
  }',
  '{"appearance":"amber","breathing":"amber","circulation":"green"}',
  '{"fc":112,"fr":28,"sat":94,"temp":37.0,"tas":110,"tad":70,"peso":25}',
  '{"Neurológico":"Tetraparesia flácida arrefléctica predominio distal. Diplejía facial bilateral. Sin alteración del nivel de conciencia ni pares oculomotores.","Orofaríngeo":"Disfagia a sólidos, voz nasal. Reflejo nauseoso débil bilateral.","Respiratorio":"Taquipnea leve. Murmullo vesicular conservado. Sin uso de musculatura accesoria en reposo. Saturación 94% basal."}',
  '[{"name":"Glucemia capilar","value":"92 mg/dL"},{"name":"Lactato venoso","value":"1.8 mmol/L"},{"name":"Hemoglobina","value":"12.1 g/dL"},{"name":"Sodio","value":"138 mEq/L"}]',
  '[{"name":"Rx tórax","status":"done"},{"name":"ECG","status":"done"},{"name":"Monitorización SpO2 continua","status":"done"},{"name":"LCR (PL diferida 2ª-3ª semana)","status":"recommended"},{"name":"Estudio electrofisiológico","status":"recommended"}]',
  '[{"t":0,"evento":"Inicio debilidad MMII (Day 0 de la secuencia clínica)"},{"t":-21,"evento":"Gastroenteritis aguda autolimitada 3 semanas antes"},{"t":3,"evento":"Debilidad progresiva, incapaz de correr"},{"t":5,"evento":"Dificultad para caminar sin apoyo"},{"t":6,"evento":"Diplejía facial, voz nasal, disfagia"},{"t":6,"evento":"Llegada a urgencias: FR 28, SpO2 94%"}]',
  '[{"text":"FR >25 rpm con saturación <95% en reposo","correct":true},{"text":"Disfagia con riesgo de aspiración (reflejo nauseoso débil)","correct":true},{"text":"Diplejía facial bilateral (progresión hacia nervios craneales bulbares)","correct":true},{"text":"Progresión rápida (<7 días hasta afectación bulbar)","correct":true},{"text":"SpO2 96% sin disnea subjetiva","correct":false}]',
  '{
    "MED":["Establecer el diagnóstico de SGB por criterios clínicos sin esperar LCR","Cuantificar la gravedad con la escala de Hughes e indicar ingreso en UCI","Indicar IgIV 0.4 g/kg/día × 5 días y rechazar corticoides","Reconocer los criterios de intubación: CV <20 mL/kg, FR >30, SpO2 <90%"],
    "NUR":["Identificar signos de fatiga diafragmática: paradoja abdominal, uso de accesorios","Monitorizar FC continua y detectar arritmias por disautonomía","Garantizar posición 30-45° y vía de nutrición segura en disfagia","Valorar deglución antes de cada toma oral"],
    "PHARM":["Calcular correctamente la dosis de IgIV 0.4 g/kg/día para 25 kg (10 g/día, 50 g total)","Prescribir gabapentina 15 mg/kg/día en 3 dosis para dolor neuropático","Administrar IgIV iniciando a velocidad lenta y escalando progresivamente","Indicar HBPM profiláctica en encamamiento prolongado"]
  }',
  '["Reconocimiento de parálisis flácida aguda en pediatría","Toma de decisiones críticas en insuficiencia respiratoria inminente","Trabajo interprofesional en UCI pediátrica","Farmacología del dolor neuropático pediátrico","Comunicación efectiva en situaciones de urgencia"]',
  '["Diagnosticar SGB por clínica sin demorar IgIV para esperar LCR","Decidir ingreso en UCI ante disfunción bulbar + SpO2 <95%","No administrar corticoides en SGB","Intubar de forma programada ante signos de fatiga diafragmática (no esperar apnea)","Calcular dosis de IgIV: 0.4 g/kg/día × 5 días = 2 g/kg total"]',
  'Reconocer el SGB con riesgo de fallo respiratorio, tomar decisiones de UCI y tratamiento inmunomodulador (IgIV) sin retrasos diagnósticos.',
  'avanzado',
  25
);

-- ──────────────────────────────────────────
-- PASO 5: CASE RESOURCES
-- ──────────────────────────────────────────
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), $SCENARIO_ID,
   'Diagnóstico y tratamiento del síndrome de Guillain-Barré en Urgencias de Pediatría — Guía de la SEUP 2024',
   'https://seup.org/pdf_public/pub/protocolos/guillain-barre.pdf',
   'SEUP', 'guía', 2024, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Guillain-Barré syndrome in children: Epidemiology, clinical features, and diagnosis — UpToDate',
   'https://www.uptodate.com/contents/guillain-barre-syndrome-in-children-epidemiology-clinical-features-and-diagnosis',
   'UpToDate', 'revisión', 2024, false, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Predictors of mechanical ventilation in childhood Guillain-Barré syndrome — Neurology 2021',
   'https://doi.org/10.1212/WNL.0000000000012553',
   'Neurology', 'artículo', 2021, false, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Intravenous immunoglobulin for Guillain-Barré syndrome — Cochrane Database 2023',
   'https://doi.org/10.1002/14651858.CD002063.pub7',
   'Cochrane', 'metaanálisis', 2023, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Plasma exchange for Guillain-Barré syndrome — Cochrane Database 2017',
   'https://doi.org/10.1002/14651858.CD001798.pub3',
   'Cochrane', 'metaanálisis', 2017, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'European Academy of Neurology/PNS Guideline for Guillain-Barré Syndrome 2023',
   'https://doi.org/10.1111/jns.12615',
   'European Journal of Neurology', 'guía', 2023, false, now());
