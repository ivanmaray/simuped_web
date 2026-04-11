-- ══════════════════════════════════════════════════════════════════════
-- ESCENARIO 20: POLITRAUMATIZADO PEDIÁTRICO CON SHOCK HIPOVOLÉMICO
-- ══════════════════════════════════════════════════════════════════════
-- Paciente: 7 años, 25 kg, atropello por vehículo
-- Nivel: avanzado
-- Bibliografía: SEUP 2024 (Politrauma + Shock), SECIP 2020 (Hemorragia masiva),
--               ERC 2025 (PLS), Hospital Virgen del Rocío 2024
-- ══════════════════════════════════════════════════════════════════════

-- 1. SCENARIO
INSERT INTO scenarios (title, summary, level, difficulty, mode, status, estimated_minutes, max_attempts)
VALUES (
  'Politraumatizado pediátrico con shock hipovolémico',
  'Niño de 7 años atropellado por vehículo a ~40 km/h. Presenta shock hemorrágico grado II-III con sospecha de lesión esplénica y fractura de fémur. Requiere resucitación con control de daños, activación del protocolo de hemorragia masiva y estabilización para cirugía.',
  'avanzado',
  'Avanzado',
  ARRAY['online'],
  'En construcción: en proceso',
  30,
  3
) RETURNING id;
-- ⚠️ Guarda este ID como $SCENARIO_ID

-- 2. STEPS
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  ($SCENARIO_ID, 1,
   'Triaje y activación del equipo de trauma',
   'Recibir al paciente del SEM. Realizar el Triángulo de Evaluación Pediátrica, calcular el Índice de Trauma Pediátrico y activar el equipo de trauma según criterios clínicos.',
   true, ARRAY['medico','enfermeria','farmacia']),

  ($SCENARIO_ID, 2,
   'Evaluación primaria ABCDE',
   'Realizar evaluación sistemática ABCDE con inmovilización cervical. Asegurar vía aérea, optimizar oxigenación, obtener acceso vascular urgente e iniciar fluidoterapia restrictiva. Prevenir hipotermia desde el primer momento.',
   true, ARRAY['medico','enfermeria','farmacia']),

  ($SCENARIO_ID, 3,
   'Resucitación hemostática y protocolo de hemorragia masiva',
   'Activar el protocolo de hemorragia masiva ante shock hemorrágico refractario a cristaloides. Administrar ácido tranexámico precoz, iniciar transfusión con ratio equilibrado de hemoderivados y minimizar cristaloides adicionales.',
   true, ARRAY['medico','enfermeria','farmacia']),

  ($SCENARIO_ID, 4,
   'Reevaluación y manejo de la tríada letal',
   'Monitorizar objetivos de resucitación hemostática. Corregir hipocalcemia e hipofibrinogenemia. Iniciar soporte vasoactivo si persiste hipotensión tras reposición de volumen. Combatir activamente hipotermia, acidosis y coagulopatía.',
   true, ARRAY['medico','enfermeria','farmacia']),

  ($SCENARIO_ID, 5,
   'Estabilización y preparación para cirugía',
   'Asegurar vía aérea definitiva si deterioro neurológico. Preparar al paciente para traslado a quirófano/UCIP con monitorización continua, medicación vasoactiva y reserva de hemoderivados. Comunicación estructurada SBAR al equipo quirúrgico.',
   true, ARRAY['medico','enfermeria','farmacia'])
RETURNING id;
-- ⚠️ Guarda los IDs como $STEP_ID_1, $STEP_ID_2, $STEP_ID_3, $STEP_ID_4, $STEP_ID_5

-- 3. QUESTIONS

-- ─── PASO 1: Triaje y activación del equipo de trauma ───

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
-- Q1.1 — TEP (todos los roles)
(
  $STEP_ID_1,
  'Llega un niño de 7 años (25 kg) tras atropello por vehículo. Está irritable, pálido, con piel moteada en extremidades. Respiración regular sin signos de trabajo respiratorio. ¿Cuál es la interpretación correcta del Triángulo de Evaluación Pediátrica?',
  '["Apariencia normal, Respiración alterada, Circulación alterada → dificultad respiratoria con shock","Apariencia alterada, Respiración normal, Circulación alterada → shock compensado","Apariencia alterada, Respiración alterada, Circulación normal → dificultad respiratoria con fallo del SNC","Apariencia normal, Respiración normal, Circulación alterada → shock compensado sin afectación neurológica"]',
  '1',
  'El TEP muestra Apariencia alterada (irritabilidad = hipoperfusión cerebral incipiente) + Respiración normal (sin tiraje, sin ruidos) + Circulación alterada (palidez, moteado cutáneo). Este patrón A+C define shock compensado. La irritabilidad no es un signo respiratorio sino de perfusión cerebral comprometida.',
  null,
  false,
  '["La irritabilidad en un traumatizado indica hipoperfusión, no dolor aislado","El moteado cutáneo es un signo de redistribución del flujo sanguíneo"]',
  null,
  null
),

-- Q1.2 — ITP (médico)
(
  $STEP_ID_1,
  'Calculando el Índice de Trauma Pediátrico: peso 25 kg, vía aérea permeable sin soporte, TAS 85 mmHg, GCS 13 (obnubilado), abrasiones en hemitórax, fractura cerrada de fémur. ¿Cuál es la puntuación y su implicación clínica?',
  '["ITP 10 → trauma menor, manejo ambulatorio o en urgencias generales","ITP 8 → trauma potencialmente grave, activar equipo de trauma y valorar derivación a centro de referencia","ITP 6 → trauma grave, traslado inmediato a centro de trauma nivel I sin demora","ITP 4 → trauma muy grave, mortalidad esperada superior al 50%"]',
  '1',
  'ITP: Peso >20 kg (+2), Vía aérea normal (+2), TAS 50-90 mmHg (+1), SNC obnubilado (+1), Herida menor (+1), Fractura cerrada (+1) = 8. Un ITP ≤8 indica necesidad de atención en centro de trauma. El ITP tiene buena correlación con el Injury Severity Score y ayuda a estratificar la gravedad en el triaje inicial.',
  ARRAY['medico'],
  false,
  '["Cada componente del ITP puntúa +2, +1 o -1","Un ITP ≤8 es criterio de derivación a centro de trauma"]',
  null,
  null
),

-- Q1.3 — Prioridades enfermería en recepción trauma
(
  $STEP_ID_1,
  'Como enfermera de triaje, recibes al paciente del SEM con inmovilización espinal completa. ¿Cuál es la secuencia correcta de prioridades en la recepción del politraumatizado pediátrico?',
  '["Canalizar vía venosa periférica, extraer analítica completa, administrar analgesia, monitorizar","Trasladar a sala de críticos, monitorización completa, preparar material de vía aérea y acceso vascular, activar protocolo de trauma y asignar roles al equipo","Desvestir al paciente completamente, tomar constantes vitales, avisar al cirujano de guardia, solicitar radiografías","Administrar oxígeno a alto flujo, colocar sonda nasogástrica, sonda vesical y solicitar analítica urgente"]',
  '1',
  'La recepción del politraumatizado sigue un protocolo estructurado: trasladar a sala de críticos con capacidad de resucitación, monitorización inmediata (ECG, SatO₂, PANI), preparación anticipada de material crítico (vía aérea, IO, hemoderivados) y asignación de roles (líder, vía aérea, circulación, registro). La canalización venosa forma parte de la evaluación C, no es el primer paso.',
  ARRAY['enfermeria'],
  false,
  '["El protocolo de trauma requiere una sala preparada y equipo con roles asignados antes de actuar","La monitorización precede a las intervenciones"]',
  null,
  null
),

-- ─── PASO 2: Evaluación primaria ABCDE ───

-- Q2.1 — Vía aérea con control cervical (médico)
(
  $STEP_ID_2,
  'En la evaluación A, el paciente habla con frases cortas, irritable, con collar cervical colocado por el SEM. ¿Cuál es la actitud correcta respecto a la vía aérea?',
  '["Retirar el collar cervical para explorar completamente el cuello y descartar lesión traqueal","Mantener collar cervical, administrar O₂ con mascarilla reservorio a 15 L/min, aspirar si precisa y preparar material de intubación ante posible deterioro","Intubar de forma electiva para asegurar la vía aérea antes del deterioro hemodinámico previsible","Administrar O₂ con gafas nasales a 2 L/min, ya que la SatO₂ es del 96% y no requiere más soporte"]',
  '1',
  'Vía aérea permeable con habla conservada = A estable por el momento. Se mantiene el collar cervical (mecanismo de alta energía) y se administra O₂ a alto flujo con reservorio (objetivo SatO₂ >95%). Se prepara material de IOT por si deterioro, pero la intubación electiva no está indicada con A permeable. Gafas nasales a 2 L/min son insuficientes en shock hemorrágico.',
  ARRAY['medico'],
  false,
  '["En trauma, toda vía aérea estable puede deteriorar: hay que anticiparse","El collar cervical no se retira hasta descartar lesión cervical con criterios validados"]',
  null,
  null
),

-- Q2.2 — Acceso vascular (médico, enfermería) — CRÍTICA
(
  $STEP_ID_2,
  'Al evaluar C, el paciente presenta FC 145, relleno capilar 4 segundos y pulsos periféricos débiles. El primer intento de canalización venosa periférica fracasa. ¿Cuál es la conducta correcta?',
  '["Intentar canalización de vía central yugular o femoral como alternativa inmediata","Realizar un segundo intento de vía periférica y, si fracasa en un total de 60-90 segundos, colocar acceso intraóseo sin más demora","Colocar acceso intraóseo inmediatamente sin intentar una segunda vía periférica","Intentar canalización ecoguiada de vía periférica durante un máximo de 5 minutos antes de considerar IO"]',
  '1',
  'ERC 2025 y SEUP recomiendan no demorar el acceso vascular: si no se consigue vía IV en 60-90 segundos (máximo 2 intentos), colocar IO tibial proximal sin demora. La vía central no es primera alternativa en resucitación inicial del trauma pediátrico. Dedicar 5 minutos a una ecoguiada en shock hemorrágico activo es inaceptable.',
  ARRAY['medico','enfermeria'],
  true,
  '["En shock hemorrágico, cada minuto sin acceso vascular retrasa la resucitación","La vía intraósea permite infundir cristaloides, hemoderivados y fármacos vasoactivos"]',
  90,
  'El retraso en obtener acceso vascular en shock hemorrágico prolonga la hipoperfusión tisular y aumenta la mortalidad. La IO es un acceso fiable que no debe posponerse.'
),

-- Q2.3 — Fluidoterapia inicial restrictiva (médico) — CRÍTICA
(
  $STEP_ID_2,
  'Con acceso vascular conseguido, la FC sube a 150 lpm y la TAS baja a 80 mmHg. ¿Cuál es la estrategia de fluidoterapia inicial correcta en shock hemorrágico pediátrico?',
  '["Bolo de 20 mL/kg de SSF rápido, repetible hasta 60 mL/kg si no hay respuesta hemodinámica","Bolo de 10 mL/kg de cristaloide isotónico; si persiste inestabilidad tras un máximo de 20 mL/kg totales, iniciar hemoderivados","No administrar cristaloides, transfundir directamente concentrado de hematíes a 15 mL/kg","Bolo de 20 mL/kg de coloide (albúmina 5%) por su mayor poder expansor, seguido de cristaloides"]',
  '1',
  'ERC 2025 y SEUP 2024 enfatizan minimizar cristaloides en shock hemorrágico: bolo inicial de 10 mL/kg, máximo 20 mL/kg total. Si no hay respuesta, pasar a hemoderivados. Los bolos de 60 mL/kg diluyen factores de coagulación, empeoran la coagulopatía dilucional y agravan la tríada letal. En nuestro paciente: 250 mL de SSF como primer bolo.',
  ARRAY['medico'],
  true,
  '["Los cristaloides no transportan oxígeno ni contienen factores de coagulación","La resucitación con control de daños prioriza hemoderivados sobre cristaloides"]',
  90,
  'La administración excesiva de cristaloides en shock hemorrágico produce coagulopatía dilucional, hipotermia y acidosis, triplicando el riesgo de mortalidad frente a la resucitación hemostática precoz.'
),

-- Q2.4 — Exposición y prevención de hipotermia (enfermería)
(
  $STEP_ID_2,
  'Durante la evaluación E, se desviste completamente al paciente. Temperatura axilar: 36.0°C. ¿Qué medida es prioritaria tras completar la exploración?',
  '["Mantener al paciente descubierto para facilitar el acceso continuo a heridas y reevaluación","Completar la exploración rápidamente, cubrir con manta térmica, calentar fluidos IV y mantener temperatura ambiente por encima de 24°C","Aplicar calentamiento activo externo solo cuando la temperatura descienda por debajo de 35°C","La prevención de hipotermia es una medida secundaria que puede posponerse durante la resucitación activa"]',
  '1',
  'La hipotermia es un componente de la tríada letal del trauma (hipotermia + acidosis + coagulopatía). Con 36.0°C ya hay riesgo de descenso rápido durante la resucitación con fluidos fríos. Medidas: exploración rápida (<2 min), manta de aire forzado, calentador de fluidos en línea, temperatura ambiente >24°C. Esperar a <35°C es reactivo, no preventivo.',
  ARRAY['enfermeria'],
  false,
  '["La tríada letal del trauma incluye hipotermia, acidosis y coagulopatía","Un grado de descenso térmico altera significativamente la función de los factores de coagulación"]',
  null,
  null
),

-- ─── PASO 3: Resucitación hemostática y protocolo de hemorragia masiva ───

-- Q3.1 — Activación del protocolo de hemorragia masiva (médico) — CRÍTICA
(
  $STEP_ID_3,
  'Tras bolo de 10 mL/kg de SSF, persiste FC 155, TAS 78 mmHg, relleno capilar 4 seg. El eFAST muestra líquido libre perihepático y periesplénico. ¿Cuál es el criterio correcto para activar el protocolo de hemorragia masiva?',
  '["Activar solo si la hemoglobina es inferior a 7 g/dL en la analítica de urgencia","Activar ante shock hemorrágico con sospecha de sangrado activo que no responde a cristaloides, sin esperar resultados analíticos","Activar solo tras confirmar lesión esplénica grado IV-V en TC con contraste","Administrar un segundo bolo de 20 mL/kg de cristaloides y reevaluar antes de activar el protocolo"]',
  '1',
  'SECIP y SEUP indican activación por criterios clínicos: shock hemorrágico que no responde a 10-20 mL/kg de cristaloides, con evidencia o sospecha de sangrado activo (eFAST positivo, fractura de fémur, mecanismo de alta energía). La Hb inicial no refleja la pérdida real (hemodilución no completada). Esperar al TC retrasa la resucitación en un paciente inestable.',
  ARRAY['medico'],
  true,
  '["La hemoglobina inicial en trauma agudo puede ser falsamente normal por hemoconcentración","El eFAST positivo en un paciente inestable indica sangrado activo significativo"]',
  90,
  'Retrasar la activación del protocolo de hemorragia masiva esperando confirmación analítica o radiológica prolonga la hipoperfusión y la coagulopatía, aumentando la mortalidad en trauma pediátrico.'
),

-- Q3.2 — Ácido tranexámico (médico, farmacia) — CRÍTICA
(
  $STEP_ID_3,
  'Se decide administrar ácido tranexámico. El paciente pesa 25 kg y han transcurrido 40 minutos desde el atropello. ¿Cuál es la pauta correcta?',
  '["30 mg/kg IV en bolo único, repetible a las 8 horas","15-20 mg/kg IV (máximo 1 g) en 10-20 minutos, idealmente en las primeras 3 horas postraumatismo. En este paciente: 375-500 mg","10 mg/kg IV en bolo rápido directo, seguido de perfusión continua de 5 mg/kg/h durante 8 horas","1 g IV en dosis fija independientemente del peso, administrable hasta 6 horas postraumatismo"]',
  '1',
  'SEUP 2024 y SECIP 2020 recomiendan ácido tranexámico 15-20 mg/kg (máx 1 g) en 10-20 min, administrado en las primeras 3 horas. En paciente de 25 kg: 375-500 mg. El CRASH-2 y su análisis pediátrico demuestran que administrado >3 h puede aumentar el riesgo de eventos tromboembólicos. La dosis de 30 mg/kg excede la recomendación. El bolo rápido directo aumenta el riesgo de hipotensión.',
  ARRAY['medico','farmacia'],
  true,
  '["El beneficio del tranexámico se limita a las primeras 3 horas postrauma","La dosis pediátrica es 15-20 mg/kg, con un techo de 1 g"]',
  90,
  'El ácido tranexámico fuera de ventana temporal o a dosis incorrecta puede ser ineficaz o perjudicial. Su administración precoz reduce la mortalidad por hemorragia en un 10-15%.'
),

-- Q3.3 — Composición del pack de hemorragia masiva (farmacia, médico) — CRÍTICA
(
  $STEP_ID_3,
  'Se activa el protocolo de hemorragia masiva para un paciente de 25 kg (<50 kg). ¿Cuál es la composición correcta del pack pediátrico?',
  '["Concentrado de hematíes 20 mL/kg exclusivamente hasta estabilización, añadiendo plasma solo si hay coagulopatía demostrada","Concentrado de hematíes 20 mL/kg + plasma fresco congelado 20 mL/kg + plaquetas 20 mL/kg, tendiendo a ratio 1:1:1","Concentrado de hematíes 40 mL/kg + plasma fresco congelado 10 mL/kg en ratio 4:1","Sangre total reconstituida 30 mL/kg como producto único de elección"]',
  '1',
  'SECIP 2020 define el pack de hemorragia masiva pediátrica (<50 kg): CH 20 mL/kg + PFC 20 mL/kg + plaquetas 20 mL/kg (ratio 6:2:1 unidades, tendiendo a 1:1:1 en volumen). En 25 kg: 500 mL de cada producto. Administrar solo CH sin PFC ni plaquetas agrava la coagulopatía dilucional. El ratio 4:1 es obsoleto en resucitación con control de daños.',
  ARRAY['farmacia','medico'],
  true,
  '["El ratio de hemoderivados en trauma tiende a equilibrar hematíes, plasma y plaquetas","Los factores de coagulación se pierden con la hemorragia, no solo los hematíes"]',
  90,
  'Un ratio desequilibrado de hemoderivados perpetúa la coagulopatía y el sangrado activo. La resucitación hemostática 1:1:1 reduce la mortalidad frente a protocolos centrados exclusivamente en hematíes.'
),

-- Q3.4 — Limitación de cristaloides (médico, farmacia) — CRÍTICA
(
  $STEP_ID_3,
  'Un residente propone administrar 40 mL/kg adicionales de SSF mientras se esperan los hemoderivados del banco de sangre. ¿Por qué es incorrecta esta estrategia?',
  '["El SSF produce hiperpotasemia grave que agrava la acidosis metabólica del shock","Los cristaloides en exceso diluyen factores de coagulación, agravan la coagulopatía dilucional y potencian la tríada letal del trauma (hipotermia, acidosis, coagulopatía)","El SSF está contraindicado en trauma pediátrico por su alto contenido en cloro y efecto vasodilatador","Los cristaloides aumentan la presión intracraneal de forma desproporcionada en todo paciente con posible TCE"]',
  '1',
  'ERC 2025: minimizar cristaloides en shock hemorrágico (máximo 20 mL/kg). El exceso de cristaloides produce coagulopatía dilucional (dilución de factores y plaquetas), hipotermia (fluidos a temperatura ambiente), acidosis hiperclorémica y edema tisular que dificulta la hemostasia. Si los hemoderivados tardan, usar hematíes O negativo sin cruzar. Los 40 mL/kg propuestos sumarían 1000 mL de cristaloide = 57% del volumen circulante.',
  ARRAY['medico','farmacia'],
  true,
  '["Calcula qué proporción del volumen circulante suponen 40 mL/kg de cristaloide","La resucitación con control de daños prioriza hemoderivados precoces sobre cristaloides"]',
  90,
  'La resucitación masiva con cristaloides es la principal causa evitable de coagulopatía dilucional en el trauma pediátrico, multiplicando por 3 la mortalidad frente a la estrategia hemostática precoz.'
),

-- Q3.5 — Administración de hemoderivados (enfermería)
(
  $STEP_ID_3,
  'Se reciben los hemoderivados del banco de sangre. ¿Cuál es la práctica correcta de administración en la emergencia hemorrágica?',
  '["Transfundir sin filtro para maximizar la velocidad de infusión en situación de emergencia","Verificar compatibilidad (O negativo si no hay cruzadas), usar calentador de fluidos en línea, filtro estándar de 170 μm y monitorizar signos de reacción transfusional","Administrar los tres productos simultáneamente por la misma vía venosa para ahorrar tiempo","Iniciar la transfusión a ritmo lento durante 15 minutos de observación y luego aumentar velocidad"]',
  '1',
  'En emergencia hemorrágica se usan hematíes O negativo si no hay tiempo para cruzar. El calentador de fluidos previene hipotermia (cada unidad de CH a 4°C baja ~0.25°C la temperatura corporal). El filtro de 170 μm es obligatorio para retener microagregados. Los productos no se mezclan en la misma vía (riesgo de incompatibilidad). En emergencia vital no se aplica la norma de ritmo lento inicial.',
  ARRAY['enfermeria'],
  false,
  '["Cada unidad de concentrado de hematíes almacenada a 4°C enfría al paciente","Los hemoderivados diferentes nunca deben mezclarse en la misma línea de infusión"]',
  null,
  null
),

-- ─── PASO 4: Reevaluación y manejo de la tríada letal ───

-- Q4.1 — Objetivos de resucitación (médico, enfermería, farmacia) — CRÍTICA
(
  $STEP_ID_4,
  'Tras el primer pack de hemorragia masiva, la analítica muestra: Hb 7.8 g/dL, plaquetas 85.000, fibrinógeno 120 mg/dL, INR 1.6, pH 7.22, lactato 5.8 mmol/L, Ca²⁺ ionizado 0.85 mmol/L, Tª 35.4°C. ¿Qué objetivos guían la resucitación hemostática?',
  '["Hb >12 g/dL, plaquetas >150.000, fibrinógeno >300 mg/dL, INR <1.0, normalización completa de todos los parámetros","Hb 8-9 g/dL, plaquetas >50.000, fibrinógeno >150 mg/dL, INR <1.5, pH >7.2, lactato <4 mmol/L, Ca²⁺ ≥0.9 mmol/L, Tª >35°C","Hb >10 g/dL, plaquetas >100.000, fibrinógeno >200 mg/dL, pH >7.35 como objetivo primario","Monitorizar exclusivamente hemoglobina y lactato; el resto de parámetros se corrigen al controlar el sangrado"]',
  '1',
  'SECIP 2020 define objetivos de resucitación hemostática: Hb 8-9 (no sobretransfundir), plaquetas >50.000, fibrinógeno >150, INR <1.5. Objetivos metabólicos: pH >7.2, lactato <4. Objetivos de la tríada letal: Ca²⁺ ≥0.9 (esencial para la cascada de coagulación), Tª >35°C. En este paciente: fibrinógeno, INR, Ca²⁺ y temperatura están fuera de objetivo y requieren intervención activa.',
  null,
  true,
  '["El calcio ionizado es cofactor esencial de la cascada de coagulación","El fibrinógeno es el primer factor que se depleciona en la hemorragia masiva"]',
  90,
  'No alcanzar los objetivos de resucitación hemostática perpetúa el círculo vicioso de la tríada letal. La monitorización parcial (solo Hb) omite la coagulopatía y la acidosis, principales determinantes de mortalidad.'
),

-- Q4.2 — Reposición de calcio y fibrinógeno (farmacia) — CRÍTICA
(
  $STEP_ID_4,
  'El Ca²⁺ ionizado es 0.85 mmol/L y el fibrinógeno 120 mg/dL en un paciente de 25 kg. ¿Cuál es la reposición correcta?',
  '["Gluconato cálcico 100 mg/kg IV lento + crioprecipitados 5 mL/kg","Cloruro cálcico 20 mg/kg IV lento (o gluconato cálcico 60 mg/kg) + concentrado de fibrinógeno 30-50 mg/kg IV. En este paciente: CaCl₂ 500 mg + fibrinógeno 750-1250 mg","No reponer calcio hasta que Ca²⁺ descienda por debajo de 0.7 mmol/L; administrar fibrinógeno solo si es inferior a 50 mg/dL","Calcio oral 500 mg como suplemento + dosis adicional de ácido tranexámico como sustituto del aporte de fibrinógeno"]',
  '1',
  'La hipocalcemia en transfusión masiva se debe a la quelación por citrato del anticoagulante. Objetivo: Ca²⁺ ≥0.9 mmol/L. CaCl₂ 20 mg/kg IV lento (contiene 3× más calcio elemental que gluconato) o gluconato cálcico 60 mg/kg. Fibrinógeno <150 mg/dL → concentrado de fibrinógeno 30-50 mg/kg (alternativa: crioprecipitados 5-10 mL/kg). En 25 kg: fibrinógeno 750-1250 mg. El tranexámico es antifibrinolítico, no aporta fibrinógeno.',
  ARRAY['farmacia'],
  true,
  '["El citrato del anticoagulante de los hemoderivados quela el calcio ionizado","El fibrinógeno es el primer factor en caer por debajo del umbral hemostático"]',
  90,
  'La hipocalcemia no corregida durante la transfusión masiva produce disfunción miocárdica, vasodilatación y coagulopatía, pudiendo causar parada cardíaca. El fibrinógeno bajo perpetúa el sangrado activo.'
),

-- Q4.3 — Elección de vasopresor (médico) — CRÍTICA
(
  $STEP_ID_4,
  'Tras 2 packs de hemorragia masiva y corrección de hipocalcemia, persiste TAS 72 mmHg con FC 140. ¿Cuál es el vasopresor de primera línea en esta situación?',
  '["Adrenalina 0.1-1 μg/kg/min como vasopresor de primera línea universal en shock pediátrico","Noradrenalina 0.05-1 μg/kg/min como vasopresor de primera línea en shock hemorrágico refractario a volumen","Dopamina 5-10 μg/kg/min por su efecto inotrópico y vasopresor combinado","Vasopresina 0.0003-0.002 U/kg/min como primera línea en shock hemorrágico"]',
  '1',
  'ERC 2025 recomienda noradrenalina como vasopresor de primera línea en shock hemorrágico. Su efecto predominantemente alfa-adrenérgico restaura el tono vascular sin taquicardia excesiva. La adrenalina es primera línea en shock frío/séptico, no en hemorrágico. La dopamina tiene peor perfil de seguridad (arritmias, supresión de eje hipofisario). La vasopresina es una alternativa de segunda línea.',
  ARRAY['medico'],
  true,
  '["En shock hemorrágico, el problema principal es la pérdida de tono vascular por vasodilatación","Las guías ERC 2025 han actualizado la elección de vasopresor en pediatría"]',
  60,
  'El uso de un vasopresor inadecuado o el retraso en iniciar soporte vasoactivo en shock hemorrágico refractario aumenta la hipoperfusión tisular y el riesgo de fracaso multiorgánico.'
),

-- Q4.4 — Manejo de hipotermia (enfermería)
(
  $STEP_ID_4,
  'La temperatura del paciente ha descendido a 35.2°C a pesar de las medidas iniciales. ¿Qué intervenciones adicionales de enfermería son apropiadas?',
  '["Centrarse exclusivamente en el soporte hemodinámico; la hipotermia leve no es prioritaria","Calentar todos los fluidos IV y hemoderivados con calentador en línea, aplicar manta de aire caliente forzado, mantener temperatura ambiente por encima de 24°C y minimizar la exposición corporal","Administrar líquidos calientes por vía oral o enteral para calentamiento central","Aplicar bolsas de agua caliente directamente sobre la piel del paciente en zonas axilares e inguinales"]',
  '1',
  'La hipotermia <35°C reduce la actividad de los factores de coagulación un 10% por cada grado de descenso y altera la función plaquetaria. Medidas activas: calentador de fluidos IV (obligatorio con transfusión masiva), manta de aire forzado (método más eficaz de calentamiento externo), temperatura ambiente >24°C, minimizar exposición. Las bolsas de agua caliente tienen riesgo de quemadura en piel hipoperfundida. La vía oral está contraindicada en paciente inestable.',
  ARRAY['enfermeria'],
  false,
  '["Cada grado de hipotermia reduce la eficacia de los factores de coagulación un 10%","El calentamiento de fluidos IV es obligatorio durante la transfusión masiva"]',
  null,
  null
),

-- ─── PASO 5: Estabilización y preparación para cirugía ───

-- Q5.1 — SRI en shock (médico, farmacia) — CRÍTICA
(
  $STEP_ID_5,
  'El paciente deteriora neurológicamente (GCS 10) y precisa intubación. ¿Cuál es la secuencia de inducción rápida correcta en el politraumatizado con shock hemorrágico?',
  '["Propofol 2 mg/kg + succinilcolina 2 mg/kg, premedicación con atropina 0.02 mg/kg","Ketamina 1-2 mg/kg + rocuronio 1.2 mg/kg, sin atropina como premedicación rutinaria","Midazolam 0.2 mg/kg + rocuronio 0.6 mg/kg + atropina 0.02 mg/kg como premedicación","Etomidato 0.3 mg/kg + succinilcolina 1.5 mg/kg + fentanilo 2 μg/kg"]',
  '1',
  'Ketamina es el inductor de elección en shock (mantiene tono simpático y presión arterial). Dosis reducida (1 mg/kg) si inestabilidad extrema. Rocuronio a 1.2 mg/kg para secuencia rápida. ERC 2025: la atropina ya NO se recomienda como premedicación rutinaria en SRI pediátrica (cambio respecto a guías previas). Propofol está contraindicado en shock (vasodilatación e hipotensión). El midazolam carece de efecto analgésico y produce hipotensión.',
  ARRAY['medico','farmacia'],
  true,
  '["La ketamina es el único inductor que mantiene el tono simpático","Las guías ERC 2025 han eliminado la atropina como premedicación rutinaria en SRI"]',
  90,
  'El uso de propofol o midazolam en shock hemorrágico puede precipitar colapso cardiovascular y parada. La elección del inductor es una decisión crítica de supervivencia.'
),

-- Q5.2 — Preparación para traslado (médico, enfermería)
(
  $STEP_ID_5,
  'El paciente se estabiliza (FC 120, TAS 90, lactato en descenso) y se programa traslado a quirófano para esplenectomía parcial y fijación de fémur. ¿Qué es imprescindible antes del traslado?',
  '["Completar TC body con contraste antes del traslado, independientemente del tiempo que requiera","Verificar reserva de hemoderivados cruzados, confirmar bombas de infusión con noradrenalina cargada, monitorización portátil continua y comunicación SBAR al equipo quirúrgico y anestesia","Suspender la noradrenalina 30 minutos antes del traslado para evaluar la estabilidad hemodinámica real del paciente","Esperar resultado completo de coagulación para confirmar corrección antes de autorizar el traslado"]',
  '1',
  'El traslado intrahospitalario del politraumatizado requiere: hemoderivados cruzados disponibles (mínimo 2 packs adicionales), medicación vasoactiva en bomba sin interrupción, monitorización portátil (ECG, SatO₂, PANI, ETCO₂ si intubado), y comunicación SBAR al equipo receptor con resumen de intervenciones, hemoderivados administrados y situación hemodinámica actual. Suspender noradrenalina provoca hipotensión de rebote.',
  ARRAY['medico','enfermeria'],
  false,
  '["El traslado intrahospitalario es un momento de alto riesgo para desestabilización","La comunicación SBAR garantiza transferencia de información crítica sin omisiones"]',
  null,
  null
),

-- Q5.3 — Gestión farmacológica en traslado (farmacia)
(
  $STEP_ID_5,
  'Durante el traslado a quirófano, ¿qué aspectos farmacológicos requieren especial atención?',
  '["Suspender todas las perfusiones y reiniciarlas en quirófano para simplificar logísticamente el traslado","Mantener perfusión de noradrenalina sin interrupción, verificar compatibilidad de fármacos en misma vía, asegurar sedoanalgesia continua (ketamina o fentanilo) y disponer de medicación de rescate preparada","Administrar un bolo de morfina 0.2 mg/kg IV para cubrir analgesia durante todo el traslado","Cambiar toda la medicación intravenosa a vía oral o rectal para facilitar el traslado"]',
  '1',
  'Durante el traslado: noradrenalina NUNCA se interrumpe (riesgo de colapso), sedoanalgesia continua si intubado (ketamina en perfusión 0.5-2 mg/kg/h o fentanilo 1-2 μg/kg/h), verificar compatibilidad de fármacos en Y (noradrenalina y ketamina son compatibles). Medicación de rescate preparada: adrenalina, atropina, bolo de cristaloide. Un bolo único de morfina 0.2 mg/kg produce hipotensión en shock y no cubre la duración del traslado.',
  ARRAY['farmacia'],
  false,
  '["La interrupción de vasopresores durante el traslado es causa frecuente de parada cardíaca","La compatibilidad de fármacos en la misma vía debe verificarse antes de cualquier traslado"]',
  null,
  null
),

-- ─── PREGUNTAS ADICIONALES: ENFERMERÍA ───

-- Q-NUR-A — Valoración del dolor y analgesia inicial en trauma (enfermería, paso 2)
(
  $STEP_ID_2,
  'El paciente politraumatizado presenta llanto inconsolable e irritabilidad. ¿Cuál es la estrategia correcta de valoración y manejo del dolor en la evaluación inicial?',
  '["Posponer la analgesia hasta completar toda la evaluación primaria y secundaria para no enmascarar signos clínicos","Valorar dolor con escala FLACC (preescolar) o EVA (escolar), administrar fentanilo IV 1-2 μg/kg como analgesia de elección en trauma con inestabilidad hemodinámica","Administrar ibuprofeno rectal 10 mg/kg como primera línea analgésica por su efecto antiinflamatorio en fracturas","Valorar dolor con escala numérica y administrar metamizol IV 40 mg/kg como primera opción universal"]',
  '1',
  'El dolor no tratado en el politraumatizado aumenta la respuesta catecolaminérgica, la taquicardia y el consumo de oxígeno. A los 7 años se puede usar EVA; si no colabora, FLACC. El fentanilo IV (1-2 μg/kg) es el analgésico de elección en trauma con compromiso hemodinámico: potente, titulable, rápido inicio de acción y mínimo efecto hipotensor a estas dosis. Los AINE están contraindicados en shock (riesgo renal, alteración plaquetaria). El metamizol puede producir hipotensión en bolo rápido.',
  ARRAY['enfermeria'],
  false,
  '["El dolor no tratado agrava la respuesta de estrés y empeora la taquicardia","El fentanilo es el opioide con menor repercusión hemodinámica a dosis analgésicas"]',
  null,
  null
),

-- Q-NUR-B — Monitorización durante transfusión masiva (enfermería, paso 3)
(
  $STEP_ID_3,
  'Durante la transfusión masiva, ¿qué parámetros de monitorización de enfermería son prioritarios además de las constantes vitales habituales?',
  '["Monitorizar exclusivamente FC, TA y SatO₂ cada 15 minutos durante la transfusión","Monitorización continua (FC, TA, SatO₂), diuresis horaria con sonda vesical (objetivo >1 mL/kg/h), temperatura continua, balance estricto de entradas y salidas, y vigilancia de signos de reacción transfusional","Realizar ECG de 12 derivaciones cada 30 minutos para detectar hiperpotasemia","Monitorizar solo la diuresis como marcador único de perfusión tisular"]',
  '1',
  'La monitorización durante transfusión masiva pediátrica requiere: constantes continuas (FC, TA invasiva ideal, SatO₂), temperatura continua (riesgo de hipotermia con hemoderivados), diuresis horaria (sonda vesical, objetivo >1 mL/kg/h = >25 mL/h en 25 kg como marcador de perfusión renal), balance estricto (volumen de cristaloides + cada hemoderivado), y vigilancia activa de reacciones transfusionales (fiebre, urticaria, hipotensión, hemoglobinuria).',
  ARRAY['enfermeria'],
  false,
  '["La diuresis es un marcador de perfusión renal y respuesta a la resucitación","La hipotermia durante la transfusión masiva agrava la coagulopatía"]',
  null,
  null
),

-- Q-NUR-C — Cuidados del acceso intraóseo (enfermería, paso 2)
(
  $STEP_ID_2,
  'Se ha colocado un acceso intraóseo tibial proximal para la resucitación. ¿Cuáles son los cuidados de enfermería específicos de la vía intraósea?',
  '["Fijar con apósito estéril, infundir a gravedad normal como una vía venosa periférica convencional","Fijar firmemente, aspirar médula para confirmar posición, conectar a bomba de presión o jeringa para infusión (flujo por gravedad insuficiente), vigilar síndrome compartimental y limitar uso a 24 horas","No es necesaria fijación especial; la aguja IO se mantiene en posición por el hueso cortical","Limitar la infusión exclusivamente a cristaloides, ya que los hemoderivados obstruyen la aguja IO"]',
  '1',
  'La vía IO requiere cuidados específicos: fijación robusta (riesgo de desplazamiento), confirmación de posición (aspiración de médula, flujo sin extravasación), infusión con presión positiva (bolsa presurizada o bomba, el flujo por gravedad es insuficiente por la resistencia del espacio medular), vigilancia de extravasación y síndrome compartimental cada 15-30 min, y retirada en <24 h o al conseguir acceso IV definitivo. Por vía IO se pueden infundir todos los fármacos y hemoderivados.',
  ARRAY['enfermeria'],
  true,
  '["El flujo por gravedad a través de una IO es insuficiente para resucitación","La vigilancia del síndrome compartimental es específica de la vía intraósea"]',
  60,
  'La infusión por gravedad a través de una IO no alcanza flujos adecuados para resucitación. La extravasación no detectada puede causar síndrome compartimental y pérdida de la extremidad.'
),

-- ─── PREGUNTAS ADICIONALES: FARMACIA ───

-- Q-PHARM-A — Clasificación del shock hemorrágico y estimación de pérdidas (farmacia, paso 1)
(
  $STEP_ID_1,
  'El volumen circulante estimado de un niño de 25 kg es 1750 mL (70 mL/kg). Presenta FC 145, TAS 85, relleno capilar 4 seg, irritabilidad y diuresis disminuida. ¿A qué grado de shock hemorrágico corresponde y qué porcentaje de volemia se ha perdido?',
  '["Grado I: pérdida <15% (< 260 mL). Taquicardia leve sin repercusión hemodinámica","Grado II: pérdida 15-25% (260-440 mL). Taquicardia, relleno capilar prolongado, TAS en límite bajo, irritabilidad. Shock compensado","Grado III: pérdida 25-40% (440-700 mL). Hipotensión franca, taquicardia marcada, obnubilación","Grado IV: pérdida >40% (>700 mL). Shock descompensado con hipotensión grave y riesgo de PCR"]',
  '1',
  'Según la clasificación SEUP 2024 (Tabla 2): Grado II = pérdida 15-25% del volumen circulante. Signos: taquicardia (FC 145), relleno capilar prolongado (4 seg), TAS en límite inferior (85 mmHg en niño de 7 años, donde lo normal es >90), irritabilidad (hipoperfusión cerebral incipiente) y oliguria relativa. Es un shock compensado pero en riesgo de progresión a grado III. Pérdida estimada: 260-440 mL. Esto ayuda a calcular las necesidades de reposición.',
  ARRAY['farmacia'],
  false,
  '["El volumen circulante pediátrico es 70 mL/kg a partir de los 3 meses","La taquicardia con TAS mantenida define el shock compensado"]',
  null,
  null
),

-- Q-PHARM-B — Preparación de noradrenalina pediátrica (farmacia, paso 4)
(
  $STEP_ID_4,
  'Se indica iniciar noradrenalina a 0.1 μg/kg/min en un paciente de 25 kg. ¿Cuál es la preparación correcta y la velocidad de infusión?',
  '["Diluir 1 ampolla (10 mg/10 mL) en 250 mL de SG5% y pasar a 37.5 mL/h","Aplicar regla pediátrica: 0.15 mg × 25 kg = 3.75 mg en 50 mL de SG5% (75 μg/mL); a 0.1 μg/kg/min = 2.5 μg/min = 2 mL/h. Vía central o IO exclusivamente","Preparar noradrenalina pura sin diluir a 1 mg/mL y administrar con bomba de jeringa a 0.15 mL/h","Diluir 5 mg en 500 mL de SSF y ajustar ritmo de goteo manual según respuesta tensional"]',
  '1',
  'La regla práctica pediátrica para noradrenalina: 0.15 mg × peso(kg) en 50 mL de SG5%. Así, 1 mL/h = 0.05 μg/kg/min. Para 25 kg: 3.75 mg en 50 mL (concentración 75 μg/mL). A 0.1 μg/kg/min = 2.5 μg/min = 2 mL/h. Siempre por vía central o IO (riesgo de necrosis tisular por extravasación en vía periférica). Nunca en goteo manual: requiere bomba de infusión. El SG5% es el diluyente de elección (la noradrenalina se degrada en soluciones alcalinas).',
  ARRAY['farmacia'],
  true,
  '["Las reglas de dilución pediátrica simplifican el cálculo a mL/h","La noradrenalina requiere vía central o IO por riesgo de necrosis por extravasación"]',
  90,
  'Un error en la dilución o velocidad de infusión de noradrenalina puede causar hipertensión grave o hipoperfusión persistente. La administración por vía periférica puede producir necrosis tisular extensa.'
),

-- Q-PHARM-C — Interacciones y seguridad farmacológica en transfusión masiva (farmacia, paso 3)
(
  $STEP_ID_3,
  '¿Cuál de los siguientes principios de seguridad farmacológica es correcto durante el protocolo de hemorragia masiva pediátrica?',
  '["El ácido tranexámico puede administrarse mezclado con el concentrado de hematíes en la misma bolsa para ahorrar una vía","El gluconato cálcico debe administrarse por una vía diferente a la de los hemoderivados, ya que el calcio revierte el efecto anticoagulante del citrato y puede producir microcoágulos en la línea de infusión","Los hemoderivados pueden diluirse con SSF al 0.9% o Ringer Lactato indistintamente en la misma línea","La heparina de lavado de vías centrales es compatible con la transfusión simultánea de plaquetas"]',
  '1',
  'El calcio (tanto CaCl₂ como gluconato) nunca debe mezclarse con hemoderivados en la misma línea: neutraliza el citrato anticoagulante y genera microcoágulos que obstruyen el filtro y pueden embolizar. Administrar por vía separada o con lavado intermedio. El Ringer Lactato contiene calcio (1.8 mmol/L) y está contraindicado como diluyente de hemoderivados por el mismo motivo. El único diluyente compatible es SSF 0.9%. El ácido tranexámico se administra por vía IV independiente, nunca mezclado con hemoderivados.',
  ARRAY['farmacia'],
  false,
  '["El calcio revierte el citrato anticoagulante presente en las bolsas de hemoderivados","El Ringer Lactato contiene calcio en su composición"]',
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
  'Politraumatizado pediátrico con shock hipovolémico',
  'Urgencias pediátricas hospitalarias con capacidad de activación de equipo de trauma y protocolo de hemorragia masiva',
  'Niño de 7 años traído por SEM tras atropello por vehículo a ~40 km/h mientras cruzaba la calle.',
  '["Atropello por vehículo","Palidez y moteado cutáneo","Dolor abdominal con defensa","Deformidad en muslo izquierdo"]',
  '{
    "Motivo de consulta": "Atropello por vehículo a ~40 km/h hace 25 minutos. Impacto lateral izquierdo.",
    "Síntomas": ["Dolor abdominal difuso con defensa en hipocondrio izquierdo","Dolor e impotencia funcional en muslo izquierdo","Irritabilidad progresiva","Palidez y frialdad acra"],
    "Antecedentes": "Sano previamente. Vacunación al día según calendario. Sin alergias medicamentosas conocidas. Sin cirugías previas.",
    "Medicación previa": "Ninguna",
    "Datos adicionales relevantes": "SEM: GCS 13 en escena (E3V5M5), collar cervical y tabla espinal, O₂ al 100% con mascarilla reservorio. Tiempo prehospitalario 25 min. No pérdida de consciencia referida por testigos. Pupilas isocóricas en escena."
  }',
  '{"appearance":"amber","breathing":"green","circulation":"red"}',
  '{"fc":145,"fr":28,"sat":96,"temp":36.0,"tas":85,"tad":50,"peso":25}',
  '{
    "Cabeza y cuello": "Collar cervical in situ. Abrasión frontal derecha superficial. Pupilas isocóricas y reactivas. No otorragia ni rinorragia.",
    "Tórax": "Abrasiones en hemitórax derecho. Murmullo vesicular bilateral conservado. No crepitantes ni enfisema subcutáneo a la palpación.",
    "Abdomen": "Distensión abdominal leve. Dolor difuso a la palpación con defensa involuntaria en hipocondrio izquierdo. Ruidos hidroaéreos disminuidos.",
    "Extremidades": "Deformidad y tumefacción en tercio medio de muslo izquierdo con impotencia funcional. Pulso pedio presente bilateral pero débil. Relleno capilar 4 segundos.",
    "Piel y perfusión": "Palidez generalizada. Moteado reticular en extremidades. Frialdad acra bilateral.",
    "Neurológico": "GCS 13 (E3V5M5). Irritable. Orientado parcialmente. Moviliza las 4 extremidades con limitación por dolor en MI izquierdo."
  }',
  '[{"name":"Hemoglobina","value":"11.2 g/dL (inicial, no refleja pérdida real)"},{"name":"Hematocrito","value":"34%"},{"name":"Plaquetas","value":"195.000/μL"},{"name":"Fibrinógeno","value":"180 mg/dL"},{"name":"INR","value":"1.2"},{"name":"Gasometría venosa","value":"pH 7.28, pCO₂ 32, HCO₃ 16, EB -9"},{"name":"Lactato","value":"4.2 mmol/L"},{"name":"Glucemia","value":"165 mg/dL (estrés)"},{"name":"Ca²⁺ ionizado","value":"1.05 mmol/L"},{"name":"Grupo sanguíneo","value":"Solicitado (pendiente)"}]',
  '[{"name":"eFAST","status":"ordered"},{"name":"Rx tórax AP","status":"ordered"},{"name":"Rx pelvis AP","status":"ordered"},{"name":"TC body con contraste","status":"recommended"}]',
  '[{"t":0,"evento":"Atropello por vehículo a ~40 km/h. Impacto lateral izquierdo."},{"t":5,"evento":"Llegada SEM. GCS 13. Inmovilización espinal completa, O₂ alto flujo."},{"t":25,"evento":"Llegada a urgencias hospitalarias. Activación equipo de trauma."},{"t":30,"evento":"TEP: A alterada, B normal, C alterada. ITP 8. Evaluación primaria ABCDE."},{"t":35,"evento":"Acceso IO tibial tras fracaso de 2 intentos IV. Bolo SSF 10 mL/kg."},{"t":40,"evento":"eFAST: líquido libre perihepático y periesplénico. Activación protocolo hemorragia masiva."},{"t":42,"evento":"Administración de ácido tranexámico 15 mg/kg (375 mg) IV en 15 min."},{"t":45,"evento":"Inicio primer pack hemorragia masiva: CH O- 20 mL/kg + PFC 20 mL/kg + plaquetas."},{"t":55,"evento":"Control analítico: Hb 7.8, fibrinógeno 120, INR 1.6, Ca²⁺ 0.85. Corrección activa."},{"t":60,"evento":"Segundo pack hemorragia masiva. Inicio noradrenalina 0.1 μg/kg/min."},{"t":70,"evento":"Deterioro neurológico GCS 10. SRI con ketamina + rocuronio. IOT exitosa."},{"t":80,"evento":"Estabilización hemodinámica. FC 120, TAS 90, lactato en descenso."},{"t":90,"evento":"Traslado a quirófano para esplenectomía parcial y fijación de fémur."}]',
  '[{"text":"Taquicardia progresiva con hipotensión arterial (shock descompensado)","correct":true},{"text":"Distensión abdominal progresiva (sangrado intraabdominal activo)","correct":true},{"text":"Descenso de hemoglobina en controles seriados","correct":true},{"text":"Acidosis metabólica persistente con lactato en ascenso","correct":true},{"text":"Hipotermia inferior a 35°C (componente de la tríada letal)","correct":true},{"text":"Coagulopatía: INR >1.5 o fibrinógeno <150 mg/dL","correct":true},{"text":"Hipocalcemia ionizada <0.9 mmol/L durante transfusión masiva","correct":true},{"text":"Deterioro neurológico (descenso de GCS ≥2 puntos)","correct":true}]',
  '{
    "MED":["Realizar evaluación sistemática ABCDE con control cervical","Clasificar el grado de shock hemorrágico y reconocer la progresión a descompensado","Indicar fluidoterapia restrictiva (máximo 20 mL/kg cristaloides) y activar protocolo de hemorragia masiva por criterios clínicos","Seleccionar el vasopresor adecuado (noradrenalina) y los fármacos de SRI correctos (ketamina + rocuronio, sin atropina)","Coordinar la comunicación SBAR para el traslado a quirófano"],
    "NUR":["Preparar la sala de trauma con material y asignación de roles","Obtener acceso vascular urgente (IV o IO en <90 segundos)","Administrar hemoderivados con calentador, filtro y monitorización de reacciones","Implementar medidas activas de prevención de hipotermia durante toda la resucitación","Preparar monitorización portátil y material de traslado"],
    "PHARM":["Calcular y preparar la dosis de ácido tranexámico ajustada al peso","Preparar el pack de hemorragia masiva pediátrica con ratio adecuado","Calcular la reposición de calcio y fibrinógeno según objetivos analíticos","Verificar compatibilidad de fármacos en perfusión continua","Asegurar la continuidad de medicación vasoactiva y sedoanalgesia durante el traslado"]
  }',
  '["Evaluación estructurada ABCDE del politraumatizado","Reconocimiento precoz del shock hemorrágico","Resucitación con control de daños","Trabajo en equipo interprofesional con roles definidos","Toma de decisiones bajo presión temporal","Comunicación estructurada SBAR"]',
  '["Limitar cristaloides a 20 mL/kg y pasar a hemoderivados precozmente","Activar protocolo de hemorragia masiva por criterios clínicos sin esperar analítica","Administrar ácido tranexámico en las primeras 3 horas","Corregir hipocalcemia e hipofibrinogenemia durante la transfusión masiva","Elegir ketamina como inductor de SRI en shock hemorrágico","No usar atropina como premedicación rutinaria en SRI (ERC 2025)"]',
  'Manejar la resucitación con control de daños en un politraumatizado pediátrico con shock hemorrágico, integrando la evaluación ABCDE, el protocolo de hemorragia masiva y la prevención de la tríada letal.',
  'avanzado',
  30
);

-- 5. CASE RESOURCES
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), $SCENARIO_ID,
   'Politraumatismo pediátrico — Manual de Urgencias de Pediatría SEUP, 4ª edición',
   'https://seup.org/wp-content/uploads/2024/04/19_Politrauma_4ed.pdf',
   'SEUP', 'protocolo', 2024, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Shock en Pediatría — Manual de Urgencias de Pediatría SEUP, 4ª edición',
   'https://seup.org/wp-content/uploads/2024/04/13_Shock_4ed.pdf',
   'SEUP', 'protocolo', 2024, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Hemorragia masiva en pediatría — Documento de consenso SECIP',
   'https://secip.info/images/uploads/2020/07/Hemorragia-masiva-en-pediatr%C3%ADa.pdf',
   'SECIP', 'guía', 2020, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'European Resuscitation Council Guidelines 2025: Paediatric Life Support',
   'https://www.resuscitationjournal.com/action/showPdf?pii=S0300-9572%2825%2900279-5',
   'ERC / Resuscitation', 'guía', 2025, false, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Manual Clínico de Urgencias Pediátricas — Emergencias. Hospital Virgen del Rocío',
   'https://manualclinico.hospitaluvrocio.es/wp-content/uploads/2022/04/MC-UrgPed-EMERGENCIAS.pdf',
   'Hospital Virgen del Rocío', 'protocolo', 2024, true, now());
