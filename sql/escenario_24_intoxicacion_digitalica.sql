-- ══════════════════════════════════════════════════════════════════════════
-- ESCENARIO 24: INTOXICACIÓN DIGITÁLICA EN LACTANTE CON CARDIOPATÍA CONGÉNITA
-- ══════════════════════════════════════════════════════════════════════════
-- Plataforma: SimuPed Online
-- Nivel: avanzado
-- Público: MIR/adjuntos urgencias-pediatría, enfermería, farmacia
-- Bibliografía: SEUP 2024, Red Antídotos 2025, AHA 2025, RCEM 2025
-- Preguntas: 27 (13 críticas)
-- Roles: MED 14 · NUR 10 · PHARM 10
-- ══════════════════════════════════════════════════════════════════════════

-- 1. SCENARIO
INSERT INTO scenarios (title, summary, level, difficulty, mode, status, estimated_minutes, max_attempts)
VALUES (
  'Intoxicación digitálica en lactante con cardiopatía congénita',
  'Lactante de 9 meses con canal AV completo no corregido y tratamiento crónico con digoxina que presenta bradicardia grave, BAV y extrasístoles ventriculares tras sobredosis accidental por error de dosificación del cuidador. Requiere reconocimiento del toxídrome digitálico, manejo de contraindicaciones (calcio IV, cardioversión) y administración de anticuerpos antidigoxina (Fab).',
  'avanzado',
  'Avanzado',
  ARRAY['online'],
  'En construcción: en proceso',
  25,
  3
) RETURNING id;
-- ⚠️ Guarda este ID como $SCENARIO_ID


-- 2. STEPS
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  ($SCENARIO_ID, 1,
   'Triaje y sospecha de intoxicación digitálica',
   'Lactante de 9 meses, 7.5 kg, con canal AV completo no corregido en tratamiento con digoxina, furosemida y captopril. La abuela lo trae por vómitos repetidos (4 episodios), rechazo de tomas y letargia progresiva de 3 horas. Refiere haber administrado las "gotitas del corazón" con una jeringa diferente a la habitual. Valorar el TEP, sospechar intoxicación digitálica y priorizar el triaje.',
   false, null),

  ($SCENARIO_ID, 2,
   'Evaluación ABCDE y monitorización inicial',
   'Realizar evaluación sistemática ABCDE. Obtener ECG de 12 derivaciones urgente: bradicardia sinusal con BAV de 2.º grado tipo 2:1 y extrasístoles ventriculares aisladas. Solicitar analítica urgente con digoxinemia, ionograma y gasometría. Interpretar resultados: digoxinemia 7.8 ng/mL, K+ 5.9 mEq/L, pH 7.28, lactato 3.8 mmol/L.',
   false, null),

  ($SCENARIO_ID, 3,
   'Estabilización hemodinámica y descontaminación',
   'Iniciar tratamiento puente con atropina para la bradicardia sintomática. Valorar descontaminación con carbón activado. Identificar contraindicaciones críticas: NO administrar calcio IV para la hiperpotasemia y evitar cardioversión eléctrica. Solicitar anticuerpos antidigoxina a farmacia.',
   false, null),

  ($SCENARIO_ID, 4,
   'Anticuerpos antidigoxina: cálculo, preparación y administración',
   'Confirmar indicación múltiple de Fab (bradiarritmia refractaria, hiperpotasemia con toxicidad, digoxinemia >6 ng/mL). Calcular la dosis con la fórmula de intoxicación crónica. Reconstituir y administrar el antídoto con estrategia pediátrica (50 % inicial). Considerar lidocaína o fenitoína como antiarrítmicos puente.',
   false, null),

  ($SCENARIO_ID, 5,
   'Monitorización post-Fab y prevención secundaria',
   'Monitorizar al menos 24 horas tras la administración de Fab. Vigilar hipopotasemia de rebote por reactivación de la Na-K ATPasa y riesgo de toxicidad recurrente a las 4-6 horas. Planificar educación al alta sobre dosificación segura y almacenamiento de medicamentos.',
   false, null)
RETURNING id;
-- ⚠️ Guarda los IDs como $STEP_ID_1, $STEP_ID_2, $STEP_ID_3, $STEP_ID_4, $STEP_ID_5


-- 3. QUESTIONS
-- ─────────────────────────────────────────────
-- PASO 1: Triaje y sospecha (6 preguntas, 1 crítica)
-- ─────────────────────────────────────────────

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES

-- Q1.1 TEP [MED, NUR]
(
  $STEP_ID_1,
  '¿Cómo se interpreta el TEP de este lactante que muestra letargia, respiración sin trabajo aumentado y palidez con relleno capilar >3 segundos?',
  '["Estable: TEP normal, sin alteraciones","Dificultad respiratoria: apariencia normal con respiración alterada","Shock descompensado: apariencia alterada y circulación alterada","Fallo respiratorio: apariencia y respiración alteradas"]',
  '2',
  'La letargia indica alteración de la apariencia y la palidez con relleno capilar enlentecido indica alteración de la circulación. La respiración no muestra trabajo aumentado. Este patrón TEP (apariencia + circulación) define shock descompensado.',
  ARRAY['medico','enfermeria'],
  false,
  '["Evalúa los tres lados del TEP por separado: apariencia, respiración, circulación","Letargia = apariencia alterada; palidez con relleno >3 s = circulación alterada"]',
  null,
  null
),

-- Q1.2 Sospecha diagnóstica [MED]
(
  $STEP_ID_1,
  'Lactante de 9 meses con canal AV completo en tratamiento con digoxina que presenta vómitos repetidos, letargia y bradicardia. ¿Cuál es la primera sospecha diagnóstica?',
  '["Gastroenteritis aguda con deshidratación","Descompensación de la cardiopatía de base por progresión de la insuficiencia cardíaca","Intoxicación digitálica","Sepsis de origen abdominal"]',
  '2',
  'La tríada de vómitos + letargia + bradicardia en un lactante en tratamiento con digoxina obliga a sospechar intoxicación digitálica como primera posibilidad. Los síntomas gastrointestinales (náuseas, vómitos, rechazo alimentario) son las manifestaciones más precoces de la toxicidad por digoxina.',
  ARRAY['medico'],
  false,
  '["Los síntomas GI son la manifestación más precoz de toxicidad digitálica","Piensa en el fármaco que toma habitualmente y que es un one-pill-can-kill en pediatría"]',
  null,
  null
),

-- Q1.3 FC bradicardia [NUR] — CRÍTICA
(
  $STEP_ID_1,
  'La frecuencia cardíaca de este lactante de 9 meses es de 75 lpm. ¿Cómo se interpreta?',
  '["Normal para su edad","Bradicardia leve sin repercusión clínica esperable","Bradicardia moderada: monitorizar y reevaluar en 15 minutos","Bradicardia grave: el rango normal a esta edad es 110-160 lpm"]',
  '3',
  'El rango normal de FC en un lactante de 6-12 meses es 110-160 lpm (RCEM 2025, Tabla 2). Una FC de 75 lpm representa una bradicardia grave con potencial compromiso hemodinámico inmediato.',
  ARRAY['enfermeria'],
  true,
  '["Recuerda los rangos de FC normales por edad en el lactante","A los 6-12 meses, la FC normal es 110-160 lpm"]',
  60,
  'Una FC de 75 lpm en un lactante de 9 meses supone una bradicardia grave (normal 110-160 lpm). No reconocerla retrasa el tratamiento de una arritmia potencialmente mortal por intoxicación digitálica.'
),

-- Q1.4 Rango terapéutico [PHARM]
(
  $STEP_ID_1,
  '¿Cuál es el rango terapéutico habitual de digoxinemia en pediatría?',
  '["0.5-1.0 ng/mL","0.8-2.0 ng/mL","2.0-4.0 ng/mL","1.5-3.0 ng/mL"]',
  '1',
  'El rango terapéutico de digoxinemia en pediatría es 0.8-2.0 ng/mL. Niveles >2 ng/mL aumentan el riesgo de toxicidad, aunque esta puede aparecer con niveles en rango si coexisten factores predisponentes (hipopotasemia, hipomagnesemia, hipercalcemia, insuficiencia renal).',
  ARRAY['farmacia'],
  false,
  '["El rango terapéutico es estrecho: la ventana terapéutica de la digoxina es una de las más reducidas en farmacología","Niveles >2 ng/mL se asocian a toxicidad"]',
  null,
  null
),

-- Q1.5 Nivel de triaje [MED, NUR]
(
  $STEP_ID_1,
  '¿Qué nivel de triaje corresponde a este paciente?',
  '["Nivel III (urgente): atención en menos de 30 minutos","Nivel II (emergente): atención en menos de 15 minutos","Nivel I (resucitación): atención inmediata en sala de reanimación","Nivel IV (menos urgente): puede esperar hasta 60 minutos"]',
  '2',
  'Un lactante con bradicardia grave, TEP de shock descompensado y sospecha de intoxicación digitálica requiere atención inmediata en sala de reanimación (nivel I / resucitación). La demora puede ser letal si progresa a BAV completo o arritmia ventricular.',
  ARRAY['medico','enfermeria'],
  false,
  '["Valora el TEP: shock descompensado exige nivel máximo de triaje","La bradicardia grave en lactante con cardiopatía es una emergencia vital"]',
  null,
  null
),

-- Q1.6 Acción enfermería triaje [NUR]
(
  $STEP_ID_1,
  'Al recibir a este lactante en la sala de reanimación, ¿qué acción de enfermería es prioritaria?',
  '["Canalizar dos vías periféricas de grueso calibre y administrar bolo de SSF 20 mL/kg","Canalizar vía venosa periférica, obtener ECG de 12 derivaciones y extraer analítica urgente de forma simultánea","Administrar oxígeno al 100 % con mascarilla reservorio y preparar intubación","Sondaje nasogástrico inmediato para lavado gástrico"]',
  '1',
  'La prioridad es obtener un acceso venoso, un ECG de 12 derivaciones (para identificar la arritmia) y una analítica urgente (digoxinemia, K+, gasometría) de forma simultánea. El bolo de volumen no está indicado como primera acción en un shock cardiogénico por bradicardia. El lavado gástrico no está recomendado en intoxicación digitálica.',
  ARRAY['enfermeria'],
  false,
  '["El ECG es esencial para guiar el tratamiento de la arritmia","La analítica urgente con digoxinemia y K+ es imprescindible para decidir el antídoto"]',
  null,
  null
),


-- ─────────────────────────────────────────────
-- PASO 2: Evaluación ABCDE y monitorización (5 preguntas, 3 críticas)
-- ─────────────────────────────────────────────

-- Q2.1 ECG [MED, NUR] — CRÍTICA
(
  $STEP_ID_2,
  'El ECG muestra bradicardia sinusal con BAV de 2.º grado tipo 2:1 y extrasístoles ventriculares aisladas. ¿Cuál es la interpretación correcta en el contexto de este paciente?',
  '["Hallazgo habitual en un canal AV completo operado; no atribuible a digoxina","Patrón característico de toxicidad digitálica: coexistencia de bradiarritmia supraventricular y ectopia ventricular","Indica isquemia miocárdica aguda; solicitar troponinas de alta sensibilidad","Patrón exclusivo de hiperpotasemia pura; no sugiere intoxicación digitálica"]',
  '1',
  'La coexistencia de bradiarritmia supraventricular (BAV) con ectopia ventricular (extrasístoles ventriculares) es el patrón electrocardiográfico más específico de toxicidad digitálica. Otros hallazgos incluyen: cubeta digitálica (infradesnivelación cóncava de ST), ritmo de la unión, taquicardia auricular con BAV y TV bidireccional.',
  ARRAY['medico','enfermeria'],
  true,
  '["En la toxicidad digitálica coexisten arritmias por automatismo aumentado (ectopia ventricular) y por bloqueo de conducción (BAV)","El patrón bradicardia + taquicardia es la clave diagnóstica"]',
  60,
  'No reconocer el patrón ECG de toxicidad digitálica (BAV + ectopia ventricular simultáneos) retrasa la indicación de anticuerpos antidigoxina y expone al paciente a progresión hacia arritmias letales (TV, FV, BAV completo con asistolia).'
),

-- Q2.2 Monitorización [NUR] — CRÍTICA
(
  $STEP_ID_2,
  '¿Cuál es la monitorización prioritaria inmediata en este lactante con sospecha de intoxicación digitálica?',
  '["Pulsioximetría y temperatura cada 15 minutos","ECG continuo, pulsioximetría continua y tensión arterial no invasiva cada 5 minutos","Monitorización de diuresis horaria y temperatura axilar","Glucemia capilar horaria y balance hídrico estricto"]',
  '1',
  'La monitorización ECG continua es la prioridad absoluta en la intoxicación digitálica: las arritmias potencialmente letales (TV, FV, BAV completo) pueden aparecer de forma súbita. Se complementa con pulsioximetría continua y TA no invasiva frecuente para detectar deterioro hemodinámico.',
  ARRAY['enfermeria'],
  true,
  '["Las arritmias mortales pueden aparecer de forma brusca: ¿qué monitor lo detecta?","Piensa en las tres constantes más relevantes en una intoxicación cardiotóxica"]',
  60,
  'La monitorización ECG continua es imprescindible porque la intoxicación digitálica puede desencadenar arritmias letales (TV/FV, BAV completo con asistolia) de forma súbita e impredecible. No disponer de ECG continuo impide la detección precoz.'
),

-- Q2.3 Analítica [MED]
(
  $STEP_ID_2,
  '¿Qué panel analítico urgente es prioritario en la sospecha de intoxicación digitálica?',
  '["Hemograma, PCR y procalcitonina","Digoxinemia, ionograma (K+, Ca++, Mg++), gasometría venosa y función renal","Hemograma, coagulación y perfil hepático","Troponina de alta sensibilidad, BNP y dímero D"]',
  '1',
  'La analítica urgente debe incluir digoxinemia (confirma toxicidad y permite calcular dosis de Fab), ionograma con K+ (la hiperpotasemia es indicación de Fab y el calcio/magnesio influyen en la toxicidad), gasometría (acidosis metabólica) y función renal (la insuficiencia renal prolonga la semivida de la digoxina de 36 a >100 horas).',
  ARRAY['medico'],
  false,
  '["¿Qué dato necesitas para calcular la dosis del antídoto?","El potasio es clave pronóstica y terapéutica en la toxicidad digitálica"]',
  null,
  null
),

-- Q2.4 Furosemida e hipopotasemia [PHARM]
(
  $STEP_ID_2,
  'Esta paciente recibe furosemida crónica junto con digoxina. ¿Qué alteración iónica predispone a mayor toxicidad digitálica?',
  '["Hiperpotasemia crónica inducida por furosemida","Hiponatremia dilucional por furosemida","Hipopotasemia crónica: aumenta la sensibilidad miocárdica a la digoxina al potenciar su unión al receptor Na-K ATPasa","Hipercalcemia secundaria al tratamiento diurético"]',
  '2',
  'La furosemida causa hipopotasemia e hipomagnesemia crónicas. La hipopotasemia aumenta la unión de la digoxina a la subunidad alfa de la Na-K ATPasa miocárdica (compiten por el mismo sitio de unión), lo que potencia la toxicidad incluso con niveles séricos en rango terapéutico. Es paradójico que en la sobredosis aguda se produzca hiperpotasemia por inhibición masiva de la bomba.',
  ARRAY['farmacia'],
  false,
  '["La digoxina y el K+ compiten por la unión a la Na-K ATPasa","El diurético de asa causa pérdida renal crónica de K+ y Mg++"]',
  null,
  null
),

-- Q2.5 Indicación Fab por analítica [MED, PHARM] — CRÍTICA
(
  $STEP_ID_2,
  'Los resultados muestran digoxinemia 7.8 ng/mL y K+ 5.9 mEq/L. ¿Cuál de las siguientes afirmaciones sobre la indicación de anticuerpos antidigoxina (Fab) es correcta?',
  '["Solo la digoxinemia >6 ng/mL es indicación; el potasio no influye en la decisión","Solo el K+ >5 mEq/L es indicación; la digoxinemia no determina la indicación","Ambos hallazgos son indicaciones independientes de Fab: digoxinemia >6 ng/mL a cualquier hora Y K+ >5 mEq/L con signos de toxicidad","Ninguno por sí solo justifica los Fab; la indicación requiere parada cardíaca"]',
  '2',
  'Según la Red de Antídotos 2025 y la AHA 2025, tanto la digoxinemia >6 ng/mL (a cualquier hora post-ingesta) o >15 ng/mL en cualquier momento como el K+ >5 mEq/L con signos de toxicidad son indicaciones independientes y suficientes para administrar anticuerpos antidigoxina. Otras indicaciones: bradicardia <40 lpm que no responde a atropina (máx 2 mg), TV/FV/asistolia, shock cardiogénico.',
  ARRAY['medico','farmacia'],
  true,
  '["La Red de Antídotos 2025 lista al menos 5 indicaciones independientes de Fab","¿Puede el potasio por sí solo indicar el antídoto?"]',
  60,
  'Tanto la digoxinemia >6 ng/mL como el K+ >5 mEq/L con toxicidad son indicaciones independientes de Fab. Retrasar la indicación por no reconocer estos criterios aumenta el riesgo de arritmia ventricular letal o asistolia.'
),


-- ─────────────────────────────────────────────
-- PASO 3: Estabilización hemodinámica y descontaminación (6 preguntas, 4 críticas)
-- ─────────────────────────────────────────────

-- Q3.1 Atropina puente [MED] — CRÍTICA
(
  $STEP_ID_3,
  'Mientras se preparan los anticuerpos antidigoxina, ¿cuál es el tratamiento puente de primera línea para la bradicardia sintomática con BAV?',
  '["Isoproterenol en perfusión continua a 0.05-0.5 mcg/kg/min","Atropina 0.02 mg/kg IV (mínimo 0.1 mg, máximo 0.5 mg/dosis)","Adrenalina 0.01 mg/kg IV en bolus","Marcapasos transcutáneo inmediato"]',
  '1',
  'La atropina es el fármaco puente de primera línea para la bradicardia sintomática en la intoxicación digitálica (Red Antídotos 2025: indicación de Fab si bradicardia que no responde a atropina máx 2 mg). El isoproterenol puede aumentar la ectopia ventricular. El marcapasos tiene eficacia variable en intoxicación digitálica y puede desencadenar arritmias por irritación miocárdica directa.',
  ARRAY['medico'],
  true,
  '["¿Qué parasimpaticolítico actúa sobre el nodo AV?","El isoproterenol es beta-agonista: ¿qué riesgo tiene en un corazón sensibilizado por digoxina?"]',
  90,
  'La atropina es el primer escalón antes de los Fab. El isoproterenol puede desencadenar TV/FV en un miocardio sensibilizado por digoxina. Elegir mal el fármaco puente puede precipitar una arritmia letal mientras se espera al antídoto.'
),

-- Q3.2 Dosis atropina [PHARM] — CRÍTICA
(
  $STEP_ID_3,
  '¿Cuál es la dosis correcta de atropina para este lactante de 7.5 kg?',
  '["0.01 mg/kg = 0.075 mg IV","0.02 mg/kg = 0.15 mg IV (mín 0.1 mg, máx 0.5 mg/dosis en niños)","0.04 mg/kg = 0.30 mg IV","0.1 mg IV dosis fija pediátrica independiente del peso"]',
  '1',
  'La dosis de atropina en pediatría es 0.02 mg/kg IV, con un mínimo de 0.1 mg (dosis menores pueden causar bradicardia paradójica por efecto central) y un máximo de 0.5 mg por dosis en niños. Para 7.5 kg: 0.02 × 7.5 = 0.15 mg IV. Se puede repetir cada 3-5 minutos hasta un máximo acumulado de 1 mg en niños.',
  ARRAY['farmacia'],
  true,
  '["La dosis mínima existe porque dosis subóptimas de atropina pueden causar bradicardia paradójica","Calcula: 0.02 mg/kg × 7.5 kg"]',
  60,
  'Dosis inferiores al mínimo de 0.1 mg pueden causar bradicardia paradójica. Dosis excesivas aumentan el consumo miocárdico de oxígeno. El error de cálculo en un lactante puede tener consecuencias inmediatas.'
),

-- Q3.3 Calcio CONTRAINDICADO [MED, PHARM] — CRÍTICA
(
  $STEP_ID_3,
  'El K+ es 5.9 mEq/L. Un residente propone administrar calcio IV para protección miocárdica frente a la hiperpotasemia. ¿Cuál es la respuesta correcta?',
  '["Correcto: el cloruro cálcico 20 mg/kg IV es primera línea en hiperpotasemia grave","Correcto, pero usar gluconato cálcico 50 mg/kg IV en vez de cloruro cálcico","CONTRAINDICADO: el calcio IV en intoxicación digitálica puede precipitar asistolia refractaria","No indicado por el momento; administrar solo si K+ >6.5 mEq/L"]',
  '2',
  'El calcio IV está CONTRAINDICADO en la hiperpotasemia asociada a intoxicación digitálica. La hipercalcemia potencia el efecto tóxico de los digitálicos sobre el miocardio (ambos aumentan el calcio intracelular), pudiendo precipitar una asistolia refractaria. El tratamiento de la hiperpotasemia en este contexto son los Fab, que al neutralizar la digoxina reactivan la Na-K ATPasa y normalizan el K+.',
  ARRAY['medico','farmacia'],
  true,
  '["¿Cuál es el mecanismo de acción tóxico de la digoxina? Inhibe la Na-K ATPasa → aumenta Ca++ intracelular","Si añades calcio exógeno al calcio que ya está elevado intracelularmente…"]',
  60,
  'El calcio IV está ABSOLUTAMENTE CONTRAINDICADO en la hiperpotasemia por intoxicación digitálica. Administrarlo puede causar asistolia refractaria al potenciar la sobrecarga de calcio intracelular miocárdico. Este es uno de los errores letales más frecuentes en urgencias.'
),

-- Q3.4 Carbón activado [NUR]
(
  $STEP_ID_3,
  '¿Está indicada la descontaminación digestiva con carbón activado en este lactante? La última administración errónea fue hace aproximadamente 3 horas.',
  '["No: la digoxina no se adsorbe por carbón activado","Sí: la digoxina se adsorbe bien por carbón activado y, al ser un fármaco con circulación enterohepática, el carbón puede ser útil incluso pasadas 1-2 horas, si la vía aérea está protegida","Sí, pero solo por vía rectal en lactantes","No: está contraindicado en menores de 12 meses"]',
  '1',
  'La digoxina se adsorbe eficazmente por carbón activado (no pertenece al grupo PHAILS). Aunque la ventana habitual es <1-2 horas, la digoxina tiene circulación enterohepática y absorción prolongada en formas líquidas (elixir), lo que extiende la utilidad del carbón (SEUP 2024). En lactantes se administra por SNG a 1 g/kg, con cabecero elevado 30-45° y vía aérea protegida.',
  ARRAY['enfermeria'],
  false,
  '["¿Pertenece la digoxina al grupo PHAILS (sustancias no adsorbidas por carbón)?","La circulación enterohepática de la digoxina amplía la ventana del carbón activado"]',
  null,
  null
),

-- Q3.5 Dosis carbón [PHARM]
(
  $STEP_ID_3,
  '¿Cuál es la dosis y vía de administración del carbón activado en este lactante de 7.5 kg?',
  '["0.5 g/kg = 3.75 g por vía oral con jeringa","1 g/kg = 7.5 g por sonda nasogástrica","2 g/kg = 15 g por sonda nasogástrica","Dosis fija de 25 g por vía oral"]',
  '1',
  'La dosis de carbón activado en lactantes y niños es 1 g/kg (máximo 50 g en adolescentes). Para 7.5 kg: 7.5 g por SNG. Se prepara en suspensión acuosa y se administra lentamente con el cabecero elevado 30-45° para minimizar el riesgo de broncoaspiración.',
  ARRAY['farmacia'],
  false,
  '["La dosis pediátrica de carbón activado es peso-dependiente","En lactantes no colaboradores, ¿cuál es la vía de administración más segura?"]',
  null,
  null
),

-- Q3.6 Cardioversión contraindicada [MED] — CRÍTICA
(
  $STEP_ID_3,
  'Si este lactante presentara taquicardia ventricular con pulso, ¿se podría realizar cardioversión eléctrica sincronizada?',
  '["Sí, cardioversión sincronizada a 1 J/kg como en cualquier TV inestable con pulso","Sí, pero comenzar con 0.5 J/kg por la edad del paciente","Contraindicada en intoxicación digitálica: puede desencadenar FV refractaria. Priorizar Fab y considerar lidocaína o fenitoína","Solo si fracasa la amiodarona en dos intentos"]',
  '2',
  'La cardioversión eléctrica en presencia de intoxicación digitálica puede desencadenar fibrilación ventricular refractaria por la hiperexcitabilidad miocárdica inducida por la digoxina. La AHA 2025 (COR 2b, C-EO) recomienda lidocaína o fenitoína para arritmias ventriculares hasta que los Fab estén disponibles. Si la cardioversión es absolutamente imprescindible, usar la menor energía posible.',
  ARRAY['medico'],
  true,
  '["¿Qué ocurre al aplicar una descarga eléctrica sobre un miocardio sensibilizado por digoxina?","La AHA 2025 recomienda antiarrítmicos específicos para la TV por digitálicos"]',
  60,
  'La cardioversión eléctrica en intoxicación digitálica puede precipitar FV refractaria intratable. Priorizar tratamiento farmacológico (Fab + lidocaína/fenitoína) salva vidas; la descarga inadecuada puede ser letal.'
),


-- ─────────────────────────────────────────────
-- PASO 4: Anticuerpos antidigoxina (6 preguntas, 3 críticas)
-- ─────────────────────────────────────────────

-- Q4.1 Indicaciones múltiples [MED] — CRÍTICA
(
  $STEP_ID_4,
  '¿Cuántas indicaciones independientes de anticuerpos antidigoxina se cumplen en este paciente (bradicardia con BAV que no responde a atropina, K+ 5.9 mEq/L con signos de toxicidad, digoxinemia 7.8 ng/mL)?',
  '["Una: solo la digoxinemia elevada justifica los Fab","Dos: la digoxinemia >6 ng/mL y el potasio >5 mEq/L","Tres: bradiarritmia refractaria a atropina, K+ >5 mEq/L con toxicidad y digoxinemia >6 ng/mL son indicaciones independientes","Ninguna de forma aislada; se requiere parada cardiorrespiratoria"]',
  '2',
  'Este paciente cumple tres indicaciones independientes: (1) bradiarritmia con BAV que no responde a atropina (máx 2 mg en adultos), (2) K+ >5 mEq/L con signos de toxicidad digitálica y (3) digoxinemia >6 ng/mL medida en cualquier momento. Cada una por separado justifica la administración inmediata de Fab (Red de Antídotos 2025). Otras indicaciones: TV/FV/asistolia y shock cardiogénico.',
  ARRAY['medico'],
  true,
  '["La Red de Antídotos 2025 enumera al menos 5 indicaciones independientes","Cada criterio positivo es suficiente por sí solo para indicar el antídoto"]',
  90,
  'Este paciente cumple tres criterios independientes de Fab. No reconocer la multiplicidad de indicaciones puede generar dudas que retrasen un tratamiento urgente y potencialmente salvador.'
),

-- Q4.2 Cálculo dosis Fab [PHARM] — CRÍTICA
(
  $STEP_ID_4,
  'Calcula el número de viales de anticuerpos antidigoxina necesarios. Lactante de 7.5 kg, digoxinemia 7.8 ng/mL, intoxicación crónica. Fórmula: viales = digoxinemia (ng/mL) × peso (kg) / 100.',
  '["0.39 viales → redondear a 1 vial (40 mg)","0.585 viales → redondear a 1 vial (40 mg)","1.17 viales → redondear a 2 viales (80 mg)","5.85 viales → redondear a 6 viales (240 mg)"]',
  '1',
  'Fórmula AHA 2025 para intoxicación crónica: viales = [digoxina ng/mL] × peso (kg) / 100 = 7.8 × 7.5 / 100 = 0.585 → 1 vial (40 mg). Alternativamente, fórmula CCTD (Red Antídotos): CCTD = 7.8 × 5 × 7.5 / 1000 = 0.2925 mg → viales = 0.2925 / 0.5 = 0.585. Ambas fórmulas convergen. La opción de 5.85 viales correspondería a usar erróneamente la fórmula de sobredosis aguda masiva.',
  ARRAY['farmacia'],
  true,
  '["Aplica la fórmula de intoxicación CRÓNICA (no aguda): usa el nivel sérico y el peso","7.8 × 7.5 / 100 = ?"]',
  90,
  'El cálculo correcto da 0.585 → 1 vial (40 mg). La sobredosificación de Fab causa hipopotasemia grave y descompensación de la ICC al retirar bruscamente el efecto inotrópico positivo. La infradosificación deja toxicidad activa.'
),

-- Q4.3 Reconstitución Fab [PHARM] — CRÍTICA
(
  $STEP_ID_4,
  '¿Cómo se reconstituye y administra el vial de anticuerpos antidigoxina (40 mg) en este lactante?',
  '["Diluir directamente en 500 mL de SSF 0.9 % y pasar en 2 horas","Reconstituir con 4 mL de agua estéril, diluir en volumen ajustado de SSF 0.9 % (evitar sobrecarga hídrica en lactantes) e infundir en 30 minutos","Administrar en bolus IV directo sin reconstitución ni dilución","Reconstituir con 10 mL de suero glucosado 5 % e infundir en 15 minutos"]',
  '1',
  'Según la Red de Antídotos 2025: reconstituir cada vial con 4 mL de agua estéril para inyección, diluir posteriormente en SSF 0.9 % (en adultos 100 mL; en lactantes ajustar el volumen para minimizar el riesgo de sobrecarga hídrica). Infundir en 30 minutos. En situación de parada cardiorrespiratoria se puede administrar en bolus IV directo sin diluir.',
  ARRAY['farmacia'],
  true,
  '["El diluyente de reconstitución es agua estéril, no suero","En lactantes con ICC, ¿por qué hay que ajustar el volumen de dilución?"]',
  60,
  'La reconstitución incorrecta (diluyente inadecuado, volumen excesivo en lactante con ICC) puede causar precipitación del fármaco, sobrecarga hídrica o fallo terapéutico. En PCR el bolus directo es la pauta correcta.'
),

-- Q4.4 Estrategia pediátrica 50 % [MED]
(
  $STEP_ID_4,
  'En la estrategia pediátrica de administración de Fab, ¿cuál es la pauta recomendada?',
  '["Administrar el 100 % de la dosis calculada en infusión única","Administrar el 50 % de la dosis inicialmente y completar en 1-2 horas si persisten síntomas o arritmias","Administrar el 25 % cada 30 minutos hasta completar la dosis total","Iniciar perfusión continua de Fab durante 6 horas"]',
  '1',
  'La Red de Antídotos 2025 recomienda en pediatría administrar inicialmente el 50 % de la dosis calculada y completar con el resto a las 1-2 horas si persisten las manifestaciones de toxicidad. Esta estrategia reduce el riesgo de hipopotasemia brusca y de descompensación hemodinámica por retirada completa del efecto digitálico en pacientes que dependen de la digoxina para su gasto cardíaco.',
  ARRAY['medico'],
  false,
  '["En un lactante con ICC que depende de digoxina, retirar todo el efecto digitálico de golpe puede ser contraproducente","La pauta pediátrica busca equilibrio entre neutralizar la toxicidad y mantener cierto efecto terapéutico"]',
  null,
  null
),

-- Q4.5 Vigilancia enfermería infusión [NUR]
(
  $STEP_ID_4,
  'Durante la infusión de anticuerpos antidigoxina, ¿qué vigilancia específica debe realizar enfermería?',
  '["Control de temperatura axilar cada 30 minutos exclusivamente","ECG continuo, TA cada 5 minutos, vigilancia de signos de reacción alérgica/anafilaxia y control seriado de K+","Balance hídrico horario como única monitorización adicional","Auscultación pulmonar cada 15 minutos sin más monitorización"]',
  '1',
  'Durante la infusión de Fab se debe mantener ECG continuo (para valorar la resolución de la arritmia), TA frecuente (cada 5 minutos), vigilancia activa de reacciones alérgicas (los Fab son fragmentos de anticuerpos ovinos; existe riesgo de anafilaxia aunque es bajo) y controles seriados de K+ (la reactivación de la Na-K ATPasa puede causar hipopotasemia brusca).',
  ARRAY['enfermeria'],
  false,
  '["Los Fab son proteínas de origen animal: ¿qué reacción adversa inmediata debes vigilar?","¿Qué ion se desplaza masivamente al interior celular al neutralizar la digoxina?"]',
  null,
  null
),

-- Q4.6 Antiarrítmicos puente [MED, PHARM]
(
  $STEP_ID_4,
  '¿Qué antiarrítmicos puede considerar el equipo para tratar extrasístoles ventriculares frecuentes o TV por digoxina mientras se esperan los Fab?',
  '["Amiodarona IV y verapamilo IV","Lidocaína IV o fenitoína IV","Procainamida IV y flecainida IV","Betabloqueantes IV (esmolol) y adenosina IV"]',
  '1',
  'La AHA 2025 (COR 2b, C-EO) recomienda considerar lidocaína o fenitoína para arritmias ventriculares inducidas por digoxina hasta que los Fab estén disponibles. Los antiarrítmicos clase IA (procainamida) y IC (flecainida) están contraindicados por su efecto proarrítmico adicional. Los betabloqueantes pueden empeorar la bradicardia y el BAV. La amiodarona tiene datos insuficientes en este contexto específico.',
  ARRAY['medico','farmacia'],
  false,
  '["La AHA 2025 menciona dos antiarrítmicos específicos para arritmias ventriculares por digitálicos","¿Qué clases de antiarrítmicos están contraindicadas (IA, IC)?"]',
  null,
  null
),


-- ─────────────────────────────────────────────
-- PASO 5: Monitorización post-Fab y prevención (4 preguntas, 2 críticas)
-- ─────────────────────────────────────────────

-- Q5.1 Monitorización ≥24h [NUR] — CRÍTICA
(
  $STEP_ID_5,
  '¿Cuánto tiempo mínimo debe monitorizarse al paciente tras la administración de anticuerpos antidigoxina?',
  '["6 horas","12 horas","24 horas o más","48 horas obligatoriamente en UCIP"]',
  '2',
  'La monitorización debe mantenerse al menos 24 horas (Red de Antídotos 2025). Existe riesgo de toxicidad rebote a las 4-6 horas, cuando los complejos Fab-digoxina se metabolizan y liberan digoxina libre de nuevo. Este riesgo es mayor en pacientes con insuficiencia renal y en sobredosis masivas.',
  ARRAY['enfermeria'],
  true,
  '["¿Cuándo se produce el pico de riesgo de rebote tras los Fab?","El metabolismo de los complejos Fab-digoxina libera digoxina activa"]',
  60,
  'La toxicidad rebote puede ocurrir a las 4-6 horas post-Fab al degradarse los complejos Fab-digoxina y liberarse digoxina libre. No mantener monitorización adecuada puede resultar en arritmias recurrentes no detectadas.'
),

-- Q5.2 Hipopotasemia post-Fab [MED] — CRÍTICA
(
  $STEP_ID_5,
  '¿Cuál es la complicación metabólica más frecuente e inmediata tras la administración exitosa de Fab?',
  '["Hipernatremia por dilución de los complejos Fab","Hiperpotasemia de rebote por redistribución","Hipopotasemia por reactivación masiva de la Na-K ATPasa","Hipoglucemia por aumento del consumo energético miocárdico"]',
  '2',
  'Al neutralizar la digoxina, los Fab reactivan la Na-K ATPasa en todas las células. La bomba internaliza K+ masivamente desde el espacio extracelular, provocando hipopotasemia que puede ser grave y rápida (Red de Antídotos 2025). Esta hipopotasemia puede causar nuevas arritmias por un mecanismo diferente al de la intoxicación original. Requiere monitorización seriada de K+ (cada 1-2 horas) y reposición activa.',
  ARRAY['medico'],
  true,
  '["¿Qué hace la Na-K ATPasa cuando se reactiva? Mete K+ dentro de la célula","El paciente pasa de hiperK (por toxicidad) a hipoK (por Fab) en minutos"]',
  60,
  'La hipopotasemia post-Fab puede ser rápida, grave y arritmogénica. No anticiparla ni monitorizarla activamente (K+ seriado cada 1-2 horas) puede resultar en nuevas arritmias ventriculares, esta vez por hipopotasemia.'
),

-- Q5.3 Hemodiálisis no útil [PHARM]
(
  $STEP_ID_5,
  'Un consultor plantea hemodiálisis de rescate para acelerar la eliminación de digoxina. ¿Es una estrategia eficaz?',
  '["Sí: la hemodiálisis es el tratamiento definitivo en intoxicación digitálica grave","Sí, como adyuvante a los Fab para acelerar la eliminación","No está recomendada: la digoxina tiene un gran volumen de distribución (5-8 L/kg) y no se elimina eficazmente por técnicas extracorpóreas","Solo es útil la hemoperfusión con carbón, no la hemodiálisis convencional"]',
  '2',
  'La AHA 2025 (COR 3: No Benefit, LOE B-NR) establece que la hemodiálisis, hemofiltración, hemoperfusión y plasmaféresis NO están recomendadas para la intoxicación por digoxina y glucósidos cardíacos relacionados. La digoxina tiene un volumen de distribución muy elevado (5-8 L/kg) con extensa unión tisular, lo que hace que su eliminación extracorpórea sea marginal.',
  ARRAY['farmacia'],
  false,
  '["¿Qué relación hay entre el volumen de distribución de un fármaco y su dializabilidad?","Un Vd de 5-8 L/kg indica que el fármaco está mayoritariamente en los tejidos, no en plasma"]',
  null,
  null
),

-- Q5.4 Prevención al alta [MED, NUR]
(
  $STEP_ID_5,
  'Antes del alta, ¿cuál es la intervención preventiva prioritaria en este caso?',
  '["Cambiar la digoxina por milrinona oral para eliminar el riesgo de intoxicación","Educación estructurada a todos los cuidadores: uso de jeringa calibrada específica, almacenamiento seguro con cierre de seguridad y reconocimiento de signos de alarma de toxicidad","Derivar a cardiología para suspender toda la medicación oral","Notificación judicial obligatoria por negligencia del cuidador"]',
  '1',
  'La prevención de nuevos episodios requiere educación activa y estructurada a TODOS los cuidadores (no solo a los padres): uso exclusivo de la jeringa dosificadora calibrada que acompaña al elixir, almacenamiento con cierre de seguridad fuera del alcance de los niños, y reconocimiento de los signos precoces de toxicidad (vómitos, rechazo alimentario, somnolencia). La RCEM 2025 enfatiza considerar la posibilidad de error de medicación o custodia inadecuada en intoxicaciones pediátricas.',
  ARRAY['medico','enfermeria'],
  false,
  '["El error fue por confusión de la jeringa dosificadora: ¿cómo se previene?","Piensa en los tres pilares: dosificación correcta, almacenamiento seguro, educación en signos de alarma"]',
  null,
  null
);


-- 4. CASE BRIEF
INSERT INTO case_briefs (
  id, scenario_id, title, context, chief_complaint, chips,
  history, triangle, vitals, exam, quick_labs, imaging, timeline,
  red_flags, objectives, competencies, critical_actions,
  learning_objective, level, estimated_minutes
) VALUES (
  gen_random_uuid(),
  $SCENARIO_ID,
  'Intoxicación digitálica en lactante con cardiopatía congénita',
  'Urgencias pediátricas de hospital terciario con UCIP y farmacia con disponibilidad de anticuerpos antidigoxina (stock nivel B: 10 viales)',
  'Lactante de 9 meses con vómitos repetidos, rechazo de tomas y letargia progresiva de 3 horas de evolución.',
  '["Bradicardia grave","Vómitos y letargia","BAV + EV en ECG","Hiperpotasemia"]',
  '{
    "Síntomas": ["Vómitos repetidos (4 episodios en 3 horas)", "Rechazo de todas las tomas", "Letargia progresiva", "Palidez y frialdad acra"],
    "Antecedentes": "Canal auriculoventricular completo no corregido (cirugía programada para los 12 meses). ICC en tratamiento médico desde los 2 meses. Vacunación al día. Sin alergias conocidas. Desarrollo ponderal en P10.",
    "Medicación habitual": "Digoxina elixir 0.05 mg/mL: 0.5 mL/12 h (25 mcg/12 h). Furosemida 1 mg/kg/día en 2 tomas. Captopril 0.5 mg/kg/8 h. Suplemento de KCl oral.",
    "Motivo de consulta": "Lactante de 9 meses traído por la abuela por vómitos, rechazo alimentario y somnolencia creciente de 3 horas de evolución.",
    "Circunstancia de la sobredosis": "Abuela al cuidado del lactante confundió la jeringa dosificadora: administró 2.5 mL (125 mcg) por toma en lugar de 0.5 mL (25 mcg), en 3 tomas durante las últimas 12 horas. Dosis total recibida: 375 mcg (5× la dosis habitual por toma)."
  }',
  '{"appearance":"amber","breathing":"green","circulation":"red"}',
  '{"fc":75,"fr":32,"sat":96,"temp":36.4,"peso":7.5}',
  '{
    "Piel": "Palidez generalizada, frialdad acra, relleno capilar 4 segundos",
    "Cardiovascular": "Bradicardia, tonos arrítmicos, no soplos nuevos respecto a previos",
    "Neurológico": "Letargia, hipotonía leve, pupilas medias normorreactivas, fontanela anterior normotensa",
    "Abdomen": "Blando, no distendido, hepatomegalia de 2 cm conocida por su cardiopatía"
  }',
  '[{"name":"Digoxinemia","value":"7.8 ng/mL (terapéutico: 0.8-2.0)"},{"name":"K+","value":"5.9 mEq/L"},{"name":"Ca++ iónico","value":"1.15 mmol/L"},{"name":"Mg++","value":"0.7 mmol/L (bajo)"},{"name":"Creatinina","value":"0.3 mg/dL"},{"name":"pH venoso","value":"7.28"},{"name":"Lactato","value":"3.8 mmol/L"},{"name":"Glucemia","value":"78 mg/dL"},{"name":"Na+","value":"138 mEq/L"}]',
  '[{"name":"ECG 12 derivaciones","status":"done"},{"name":"Rx tórax","status":"ordered"},{"name":"Ecocardiografía","status":"recommended"}]',
  '[{"t":-12,"evento":"Primera toma errónea por la abuela: 2.5 mL de elixir de digoxina (125 mcg en vez de 25 mcg)"},{"t":-6,"evento":"Segunda toma errónea: 2.5 mL (125 mcg). Sin síntomas aparentes"},{"t":-3,"evento":"Tercera toma errónea: 2.5 mL (125 mcg). Inicio de vómitos y rechazo alimentario"},{"t":-1,"evento":"Letargia progresiva. La abuela llama a los padres y deciden acudir a urgencias"},{"t":0,"evento":"Llegada a urgencias: lactante letárgico, pálido, bradicárdico"},{"t":5,"evento":"Triaje nivel I. ECG urgente: bradicardia sinusal, BAV 2:1, EV aisladas"},{"t":15,"evento":"Analítica: digoxinemia 7.8 ng/mL, K+ 5.9 mEq/L, pH 7.28"},{"t":20,"evento":"Atropina 0.15 mg IV como puente. Solicitud urgente de Fab a farmacia"},{"t":30,"evento":"Carbón activado 7.5 g por SNG"},{"t":40,"evento":"Inicio de infusión de anticuerpos antidigoxina (20 mg = 50 % de 1 vial)"},{"t":70,"evento":"Fin de primera dosis. FC mejora a 115 lpm. ECG: ritmo sinusal, BAV resuelto"},{"t":100,"evento":"K+ control: 3.2 mEq/L. Inicio de reposición de KCl IV"},{"t":360,"evento":"Ventana de vigilancia de toxicidad rebote (4-6 h post-Fab). Sin recurrencia"}]',
  '[{"text":"Bradicardia grave para la edad: FC 75 lpm en lactante de 9 meses (normal 110-160)","correct":true},{"text":"Vómitos repetidos con letargia progresiva en paciente con digoxina crónica","correct":true},{"text":"BAV de 2.º grado + extrasístoles ventriculares en ECG: patrón de toxicidad digitálica","correct":true},{"text":"Hiperpotasemia (K+ 5.9 mEq/L) con signos de toxicidad digitálica","correct":true},{"text":"Digoxinemia 7.8 ng/mL (>6 ng/mL: indicación absoluta de Fab)","correct":true},{"text":"Hipomagnesemia (Mg++ 0.7 mmol/L) que potencia la toxicidad digitálica","correct":true},{"text":"Febrícula >38 °C como signo de toxicidad digitálica","correct":false},{"text":"Hipoglucemia grave como marcador de gravedad en intoxicación digitálica","correct":false}]',
  '{
    "MED":["Reconocer el toxídrome digitálico en lactante con cardiopatía congénita","Interpretar el ECG con BAV y ectopia ventricular como patrón de toxicidad digitálica","Indicar anticuerpos antidigoxina basándose en criterios clínicos y analíticos independientes","Evitar contraindicaciones letales: calcio IV en hiperpotasemia y cardioversión eléctrica","Anticipar y tratar la hipopotasemia post-Fab"],
    "NUR":["Identificar bradicardia grave para la edad y activar protocolo de emergencia","Garantizar monitorización ECG continua y vigilancia de arritmias súbitas","Obtener ECG de 12 derivaciones y analítica urgente de forma simultánea","Administrar Fab según protocolo pediátrico y vigilar reacciones adversas","Monitorizar al menos 24 h post-Fab para detectar toxicidad rebote"],
    "PHARM":["Conocer el rango terapéutico de digoxina y los factores que modifican la toxicidad","Calcular la dosis de Fab con la fórmula de intoxicación crónica","Reconstituir y preparar correctamente el vial de Fab para un lactante con ICC","Identificar la interacción furosemida-digoxina como factor predisponente","Prevenir y tratar la hipopotasemia post-Fab con reposición activa"]
  }',
  '["Reconocimiento del toxídrome digitálico","Manejo de antídoto específico (anticuerpos antidigoxina)","Contraindicaciones farmacológicas en contexto de intoxicación","Cálculo de dosis de antídotos en pediatría","Trabajo interprofesional en emergencia toxicológica","Comunicación con cuidadores y prevención de errores de medicación"]',
  '["Reconocer la bradicardia grave e interpretar el ECG como toxicidad digitálica","NO administrar calcio IV para la hiperpotasemia","NO realizar cardioversión eléctrica salvo situación de último recurso","Indicar anticuerpos antidigoxina sin demora ante criterios positivos","Calcular correctamente la dosis de Fab con la fórmula de intoxicación crónica","Monitorizar K+ post-Fab y reponer activamente","Vigilar toxicidad rebote durante al menos 24 horas"]',
  'Diagnosticar y tratar una intoxicación digitálica en un lactante con cardiopatía congénita, aplicando el manejo con anticuerpos antidigoxina y evitando intervenciones contraindicadas (calcio IV, cardioversión eléctrica).',
  'avanzado',
  25
);


-- 5. CASE RESOURCES
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), $SCENARIO_ID,
   'Intoxicaciones. Protocolos diagnósticos y terapéuticos en urgencias de pediatría (4.ª ed)',
   'https://seup.org/wp-content/uploads/2024/04/25_Intoxicaciones_4ed.pdf',
   'SEUP', 'protocolo', 2024, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Anticuerpos antidigoxina — Ficha de antídoto',
   'https://redantidotos.org/wp-content/uploads/2018/04/Anticuerpos-antidigoxina_Red-Antidotos_2025.pdf',
   'Red de Antídotos', 'protocolo', 2025, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Part 10: Adult and Pediatric Special Circumstances of Resuscitation — 2025 AHA Guidelines for CPR and ECC',
   'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-and-pediatric-special-circumstances-of-resuscitation',
   'AHA / Circulation', 'guía', 2025, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Management of patients with suspected but unidentified poisoning in the emergency department (RCEM Best Practice Guideline 2025)',
   'https://ep.bmj.com/content/early/2026/01/06/archdischild-2025-329469',
   'RCEM / Arch Dis Child Educ Pract Ed', 'guía', 2025, false, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'ToxSEUP: Digoxina — Ficha toxicológica pediátrica',
   'https://toxseup.org/digoxina/',
   'SEUP / ToxSEUP', 'protocolo', 2024, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Antidotes for cardiac glycoside poisoning (Cochrane Database of Systematic Reviews)',
   'https://doi.org/10.1002/14651858.CD005490.pub2',
   'Cochrane Library', 'revisión', 2006, true, now());


-- ══════════════════════════════════════════════════════════════════════════
-- FIN DEL ESCENARIO 24
-- ══════════════════════════════════════════════════════════════════════════
-- Resumen:
--   • 5 pasos clínicos
--   • 27 preguntas (13 críticas)
--   • Distribución por rol: MED 14 · NUR 10 · PHARM 10
--   • Contraindicaciones críticas: calcio IV en hiperK+digoxina, cardioversión eléctrica
--   • Fórmulas de cálculo: Fab = digoxinemia × peso / 100 (crónica)
--   • Bibliografía: 6 recursos (SEUP, Red Antídotos, AHA 2025, RCEM 2025, ToxSEUP, Cochrane)
-- ══════════════════════════════════════════════════════════════════════════
