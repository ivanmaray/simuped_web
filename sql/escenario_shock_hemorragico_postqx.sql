-- ══════════════════════════════════════════════════════════════
-- ESCENARIO: Shock hemorrágico postquirúrgico pediátrico
-- ══════════════════════════════════════════════════════════════
-- Caso: Niño de 6 años post-apendicectomía complicada (absceso).
-- Vuelve a planta con drenaje abdominal tipo Blake conectado
-- por error al sistema de vacío (aspiración activa). El reservorio
-- se llena rápidamente de sangre. Shock hemorrágico progresivo.
-- ══════════════════════════════════════════════════════════════

-- 1. SCENARIO
INSERT INTO scenarios (title, summary, level, difficulty, mode, status, estimated_minutes, max_attempts)
VALUES (
  'Shock hemorrágico postquirúrgico',
  'Niño de 6 años post-apendicectomía complicada que presenta sangrado activo por drenaje abdominal conectado a vacío por error. Shock hemorrágico progresivo con necesidad de reanimación hemostática y manejo de vía aérea.',
  'medio',
  'Intermedio',
  ARRAY['online'],
  'En construcción: en proceso',
  20,
  3
) RETURNING id;
-- ⚠️ Guarda este ID como $SCENARIO_ID


-- 2. STEPS (usar $SCENARIO_ID)
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  ($SCENARIO_ID, 1,
   'Reconocimiento y alerta',
   'Valorar al paciente postquirúrgico con drenaje que se llena de sangre rápidamente. Identificar signos de shock hemorrágico y activar la cadena de respuesta.',
   false, null),

  ($SCENARIO_ID, 2,
   'Reanimación inicial',
   'Iniciar ABCDE. Canalizar segundo acceso venoso grueso. Desconectar el vacío del drenaje. Administrar volumen y solicitar hemoderivados urgentes.',
   false, null),

  ($SCENARIO_ID, 3,
   'Protocolo de transfusión masiva',
   'Activar el protocolo de transfusión masiva. Administrar hemoderivados en ratio equilibrado, ácido tranexámico y monitorizar objetivos de reanimación hemostática.',
   false, null),

  ($SCENARIO_ID, 4,
   'Manejo de vía aérea',
   'Ante deterioro del nivel de consciencia y fallo de la oxigenación, proceder a intubación de secuencia rápida con fármacos seguros en shock hemorrágico.',
   false, null),

  ($SCENARIO_ID, 5,
   'Estabilización y disposición',
   'Prevenir complicaciones de la transfusión masiva. Monitorizar objetivos terapéuticos. Coordinar revisión quirúrgica urgente.',
   false, null)
RETURNING id;
-- ⚠️ Guarda los IDs como $STEP_ID_1, $STEP_ID_2, $STEP_ID_3, $STEP_ID_4, $STEP_ID_5


-- 3. QUESTIONS

-- ── PASO 1: Reconocimiento y alerta ──────────────────────────

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_1,
  'Al revisar al paciente, observas que el reservorio del drenaje Blake contiene 280 ml de sangre roja en la última hora. El niño pesa 22 kg. ¿Qué porcentaje aproximado de su volemia representa esta pérdida?',
  '["Menos del 5% (pérdida menor)","Aproximadamente un 10% (pérdida leve)","Aproximadamente un 15-18% (pérdida moderada)","Más del 25% (pérdida grave)"]',
  '2',
  'La volemia estimada de un niño de 6 años es 70-80 ml/kg → 22 × 75 = ~1.650 ml. Una pérdida de 280 ml supone ~17% de la volemia, compatible con shock ATLS clase II avanzado/clase III incipiente.',
  null,
  false,
  '["La volemia pediátrica se estima en 70-80 ml/kg en niños mayores de 1 año.","Calcula primero la volemia total del niño y luego qué fracción representan 280 ml."]',
  null,
  null
),
(
  $STEP_ID_1,
  'El niño está pálido, con extremidades frías y relleno capilar de 4 segundos. FC 155 lpm, FR 32 rpm, TAS 78 mmHg, SatO₂ 96%. ¿Qué grado de shock hemorrágico según la clasificación ATLS corresponde mejor a este cuadro?',
  '["Clase I: taquicardia leve, sin hipotensión","Clase II: taquicardia con pulso débil pero tensión normal","Clase III: taquicardia, hipotensión, relleno capilar prolongado, alteración del sensorio","Clase IV: hipotensión grave con bradicardia preterminal"]',
  '2',
  'Taquicardia marcada, hipotensión (TAS <80 en niño de 6 años), relleno capilar >3 seg y palidez con frialdad periférica: shock clase III ATLS (pérdida 25-40% de volemia). La clasificación puede infraestimar la pérdida real en niños, que compensan hasta tarde.',
  ARRAY['medico'],
  true,
  '["En pediatría la hipotensión es un signo tardío; su presencia indica descompensación.","Relaciona los signos del paciente (FC, TAS, relleno capilar, estado mental) con los criterios de cada grado ATLS."]',
  90,
  'Clasificar correctamente el grado de shock determina la agresividad de la reanimación. Infraestimar el grado retrasa la activación del protocolo de transfusión masiva y aumenta la mortalidad.'
),
(
  $STEP_ID_1,
  '¿Cuál es la primera acción que debe realizar enfermería al detectar el sangrado activo por el drenaje?',
  '["Pinzar el drenaje y avisar al cirujano","Desconectar el vacío del drenaje, avisar al equipo y monitorizar al paciente","Administrar un bolo de suero salino 20 ml/kg sin esperar indicación médica","Colocar al paciente en Trendelenburg y esperar valoración"]',
  '1',
  'La acción inmediata de enfermería es interrumpir la fuente de aspiración activa (pinzar o desconectar vacío), avisar al equipo médico y establecer monitorización continua. La expansión de volumen requiere indicación médica, aunque en contextos protocolizados enfermería puede iniciar la canalización de un segundo acceso.',
  ARRAY['enfermeria'],
  true,
  '["El vacío activo puede estar contribuyendo al sangrado por efecto de succión directa sobre la zona quirúrgica.","La prioridad es: detener la causa + pedir ayuda + monitorizar."]',
  60,
  'Mantener el vacío activo sobre el lecho quirúrgico sangrante agrava directamente la hemorragia. Cada minuto de aspiración continua aumenta la pérdida sanguínea.'
);


-- Pregunta adicional MED+ENF — Paso 1 (drenajes)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_1,
  'Al revisar el sistema de drenaje, observas que el tubo Blake está conectado a la toma de vacío de pared en lugar de a su propio reservorio cerrado. ¿Por qué esta conexión errónea agrava la hemorragia?',
  '["No la agrava; el vacío de pared y el del reservorio Blake generan la misma presión negativa","El vacío de pared genera una presión negativa muy superior (hasta -200 cmH₂O) a la del reservorio Blake (~-75 a -100 cmH₂O), aspirando activamente sangre del lecho quirúrgico e impidiendo la formación de coágulo","El vacío de pared es intermitente y genera desgarros por tracción, mientras que el reservorio Blake es continuo","El problema no es la presión sino que el vacío de pared no tiene filtro antibacteriano y causa infección del lecho quirúrgico"]',
  '1',
  'El reservorio Blake (tipo Jackson-Pratt) genera un vacío suave y autolimitado de ~75-100 cmH₂O que disminuye a medida que el reservorio se llena. La toma de vacío de pared puede generar hasta -200 cmH₂O de presión negativa continua y no regulada, lo que aspira activamente sangre del lecho quirúrgico, impide la hemostasia local (no deja que se forme coágulo estable) y puede incluso succionar tejido hacia los orificios del drenaje. La primera acción es desconectar el vacío de pared inmediatamente.',
  ARRAY['medico','enfermeria'],
  true,
  '["El reservorio Blake genera vacío autolimitado que se reduce conforme se llena; el de pared es constante.","Piensa en el efecto de una aspiración continua de alta presión sobre un lecho quirúrgico recién intervenido."]',
  60,
  'Mantener el vacío de pared conectado al drenaje succiona activamente sangre y tejido del lecho quirúrgico, impidiendo la hemostasia y convirtiendo un sangrado postquirúrgico menor en una hemorragia masiva. Cada minuto de retraso en desconectarlo agrava la pérdida.'
);


-- Pregunta adicional MED — Paso 1
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_1,
  'En el contexto de hemorragia masiva pediátrica, ¿qué escala recomienda la SECIP para predecir precozmente la necesidad de activar el protocolo de transfusión masiva?',
  '["Escala de Glasgow adaptada a pediatría","Escala ABC (Assessment of Blood Consumptions): valora TAS ≤90, FC ≥120, mecanismo penetrante y FAST positivo","Escala PRISM III de gravedad en UCIP","Escala PELOD de disfunción orgánica pediátrica"]',
  '1',
  'La escala ABC (Assessment of Blood Consumptions) es la recomendada por la SECIP para predecir la necesidad de transfusión masiva. Valora 4 parámetros (1 punto cada uno): TAS ≤90 mmHg, FC ≥120 lpm, mecanismo penetrante y FAST positiva para líquido libre. Con ≥2 puntos la capacidad predictiva es del 38%, con 3 puntos del 45% y con 4 puntos del 100%. En nuestro caso: TAS 78 (sí) + FC 155 (sí) = 2 puntos → 38% de probabilidad de necesitar PTM.',
  ARRAY['medico'],
  false,
  '["Busca una escala diseñada específicamente para predecir la necesidad de transfusión masiva, no una escala de gravedad general.","Esta escala valora 4 ítems dicotómicos (sí/no) relacionados con hemodinámica, mecanismo y ecografía."]',
  null,
  null
);


-- ── PASO 2: Reanimación inicial ──────────────────────────────

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_2,
  'Has desconectado el vacío del drenaje y monitorizado al paciente. ¿Cuál es el volumen y tipo de cristaloide recomendado como bolo inicial en este shock hemorrágico?',
  '["Suero salino 0.9% o Plasmalyte, 10 ml/kg en bolo rápido, priorizando el paso precoz a hemoderivados","Suero salino 0.9% o Plasmalyte, 20 ml/kg en bolo rápido","Ringer lactato 40 ml/kg en infusión continua","Suero glucosado 5%, 20 ml/kg"]',
  '0',
  'En la reanimación con control de daños, el bolo de cristaloide debe ser restrictivo: 10 ml/kg de SSF o cristaloide balanceado (Plasmalyte), pasando precozmente a hemoderivados. La SECIP recomienda limitar los cristaloides (máximo 2 litros en adultos) para evitar coagulopatía dilucional, hipotermia y acidosis. El suero glucosado no tiene indicación en reanimación de volumen.',
  null,
  false,
  '["La reanimación con control de daños limita los cristaloides para evitar dilución de factores de coagulación.","El objetivo es mantener perfusión mínima, no normalizar la tensión antes de controlar el sangrado."]',
  null,
  null
),
(
  $STEP_ID_2,
  'Tras el bolo inicial, el paciente sigue taquicárdico (FC 160) e hipotenso (TAS 72). El drenaje ha acumulado 150 ml más en los últimos 20 minutos. ¿Cuál es el siguiente paso prioritario?',
  '["Repetir bolo de cristaloide 20 ml/kg y reevaluar","Activar el protocolo de transfusión masiva y solicitar hemoderivados urgentes","Administrar adrenalina 0.01 mg/kg IV","Solicitar ecografía abdominal urgente antes de actuar"]',
  '1',
  'Hemorragia activa que no responde al primer bolo de cristaloide: activar protocolo de transfusión masiva (PTM). Los criterios se cumplen: pérdida >40 ml/kg en 3h (ya van ~430 ml ≈ 20 ml/kg en <90 min, ritmo acelerado). La adrenalina no corrige hipovolemia. La ecografía puede hacerse simultáneamente pero no retrasa la reanimación.',
  ARRAY['medico'],
  true,
  '["El cristaloide no transporta oxígeno ni corrige la coagulopatía.","Criterio PTM: pérdida ≥40 ml/kg en 3h O ≥10% volemia en 10 min."]',
  90,
  'Retrasar la activación del PTM en favor de más cristaloides aumenta la coagulopatía dilucional, la acidosis y la mortalidad. Cada 30 minutos de retraso en hemoderivados eleva significativamente la mortalidad en shock hemorrágico pediátrico.'
),
(
  $STEP_ID_2,
  '¿Qué analítica inicial es prioritaria solicitar en este momento?',
  '["Hemograma completo únicamente","Hemograma, gasometría venosa (con lactato y calcio iónico) y coagulación (incluyendo fibrinógeno)","Bioquímica completa con perfil hepático y renal","Pruebas cruzadas solamente"]',
  '1',
  'La analítica de urgencia en shock hemorrágico incluye: hemograma (Hb basal), gasometría venosa (lactato, pH, calcio iónico como marcadores de perfusión y complicación transfusional), coagulación con fibrinógeno (detectar coagulopatía precoz). Las pruebas cruzadas se solicitan simultáneamente pero no retrasan la transfusión de urgencia (se usa grupo O negativo si no hay cruzadas).',
  null,
  false,
  '["Piensa qué parámetros necesitas para evaluar perfusión tisular, estado ácido-base y capacidad de coagulación.","Las pruebas cruzadas son importantes pero no deben retrasar la decisión de transfundir en situación crítica."]',
  null,
  null
);


-- Pregunta adicional ENF — Paso 2
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_2,
  'Al preparar la administración de hemoderivados, ¿qué medida es prioritaria para prevenir la hipotermia en este paciente?',
  '["Cubrir al paciente con una manta convencional y subir la temperatura de la habitación","Utilizar un calentador de fluidos para todos los hemoderivados y cristaloides, y aplicar un sistema de calentamiento activo (manta térmica)","Administrar los hemoderivados a temperatura ambiente sin calentador, ya que calentar la sangre hemoliza los hematíes","Infundir los hemoderivados lo más rápido posible para minimizar el tiempo de exposición al frío"]',
  '1',
  'La hipotermia es parte de la tríada letal (hipotermia + acidosis + coagulopatía). La SECIP recomienda usar calentadores de fluidos para todos los hemoderivados y cristaloides (ritmo de infusión >50 ml/kg/h con calentador). Los calentadores homologados para hemoderivados no hemolizan la sangre. La manta convencional es insuficiente; se necesita calentamiento activo (manta de aire forzado tipo Bair Hugger). Cada grado por debajo de 35°C reduce un 10% la función plaquetaria.',
  ARRAY['enfermeria'],
  false,
  '["La tríada letal del trauma es: hipotermia + acidosis + coagulopatía. Las tres se retroalimentan.","Los calentadores de fluidos homologados no dañan los hematíes; están diseñados para ello."]',
  null,
  null
);


-- ── PASO 3: Protocolo de transfusión masiva ──────────────────

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_3,
  'Se activa el PTM. El niño pesa 22 kg. Según el protocolo SECIP para niños <50 kg, ¿cuál es la dosificación y ratio del primer pack de hemoderivados?',
  '["20 ml/kg de concentrado de hematíes + 20 ml/kg de PFC + 20 ml/kg de plaquetas, ratio 1:1:1","10 ml/kg de concentrado de hematíes + 20 ml/kg de PFC + 10 ml/kg de plaquetas, ratio 1:2:1","20 ml/kg de concentrado de hematíes únicamente, añadiendo plasma solo si hay coagulopatía demostrada","40 ml/kg de concentrado de hematíes + 10 ml/kg de PFC, sin plaquetas en el primer pack"]',
  '0',
  'El protocolo SECIP para niños <50 kg establece el primer pack del PTM a 20 ml/kg de cada componente (CH, PFC y plaquetas) con ratio 1:1:1. Para este niño de 22 kg: ~440 ml de hematíes, ~440 ml de PFC y ~440 ml de plaquetas. El ratio equilibrado 1:1:1 desde el inicio previene la coagulopatía dilucional y ha demostrado reducir mortalidad (estudio PROMMTT). Los paquetes sucesivos se ajustan según analítica y ROTEM.',
  null,
  true,
  '["El protocolo SECIP dosifica por ml/kg en niños <50 kg, no por número fijo de unidades.","Piensa en qué ratio de hemoderivados previene mejor la coagulopatía dilucional desde el inicio."]',
  90,
  'Administrar hemoderivados en proporción desequilibrada (solo hematíes sin plasma ni plaquetas) perpetúa la coagulopatía y aumenta el sangrado. El ratio 1:1:1 equilibrado desde el inicio es el pilar de la reanimación hemostática según la SECIP.'
),
(
  $STEP_ID_3,
  '¿Cuál es la dosis y pauta del ácido tranexámico (TXA) en este paciente?',
  '["50 mg/kg IV en bolo único","15 mg/kg IV en 10 minutos, seguido de perfusión a 2 mg/kg/hora hasta cese del sangrado","10 mg/kg VO cada 8 horas","15 mg/kg IV en bolo rápido, dosis única sin mantenimiento"]',
  '1',
  'TXA: 15 mg/kg IV en 10 min (no en bolo rápido por riesgo de hipotensión), seguido de 2 mg/kg/h en perfusión continua hasta control de la hemorragia. Debe administrarse precozmente (<3h desde el inicio del sangrado). Actúa como antifibrinolítico inhibiendo la conversión de plasminógeno en plasmina.',
  null,
  true,
  '["El TXA debe ir en perfusión lenta (10 min), nunca en bolo rápido directo.","La dosis de mantenimiento es tan importante como la de carga para mantener la inhibición de la fibrinolisis."]',
  90,
  'El TXA reduce la mortalidad por hemorragia si se administra en las primeras 3 horas. La administración en bolo rápido IV puede causar hipotensión en un paciente ya inestable.'
),
(
  $STEP_ID_3,
  'La gasometría muestra calcio iónico de 0.85 mmol/L tras la primera ronda de hemoderivados. ¿Qué complicación de la transfusión masiva estamos viendo y cuál es el tratamiento?',
  '["Hiperpotasemia: administrar salbutamol nebulizado + insulina-glucosa","Hipocalcemia por quelación del citrato: gluconato cálcico 30 mg/kg IV o cloruro cálcico 10 mg/kg IV (por vía central)","Reacción transfusional hemolítica: suspender la transfusión y administrar corticoides","Sobrecarga circulatoria: administrar furosemida 1 mg/kg IV"]',
  '1',
  'La hipocalcemia es la complicación más frecuente de la transfusión masiva. El citrato usado como anticoagulante en los hemoderivados quela el calcio iónico. Con Ca²⁺ <0.9 mmol/L se debe reponer: gluconato cálcico 30 mg/kg IV (periférica) o cloruro cálcico 10 mg/kg IV (vía central, vesicante por periférica). La hipocalcemia puede causar depresión miocárdica y empeorar el shock.',
  ARRAY['medico','farmacia'],
  true,
  '["Los hemoderivados contienen una sustancia anticoagulante que puede afectar a ciertos electrolitos.","Un Ca²⁺ de 0.85 mmol/L es inferior al límite normal; piensa qué proceso de la transfusión masiva puede causarlo."]',
  90,
  'La hipocalcemia no corregida causa depresión miocárdica, prolonga el QT y puede provocar arritmias fatales en un paciente ya en shock. Es la complicación más frecuente y más infradiagnosticada de la transfusión masiva.'
),
(
  $STEP_ID_3,
  'Desde farmacia, ¿qué presentación y preparación del ácido tranexámico usarías para este paciente de 22 kg?',
  '["Ampollas de 500 mg/5 ml. Dosis de carga: 330 mg (3,3 ml) diluidos en 50 ml de SSF, a pasar en 10 min. Mantenimiento: 44 mg/h (0,44 ml/h) en perfusión continua.","Comprimidos de 500 mg machacados por sonda nasogástrica, 1 comprimido cada 8 h","Ampollas de 500 mg/5 ml. Administrar 1.100 mg (22 ml) en bolo IV directo.","Ampollas de 500 mg/5 ml. Dosis de carga: 330 mg en 100 ml de suero glucosado 5%."]',
  '0',
  'TXA 15 mg/kg = 15 × 22 = 330 mg. Presentación habitual: ampollas de 500 mg/5 ml (100 mg/ml). Volumen a extraer: 3,3 ml. Diluir en 50 ml de SSF y pasar en 10 min con bomba. Mantenimiento: 2 mg/kg/h = 44 mg/h → 0,44 ml/h de la solución pura, o diluir en SSF para ajustar ritmo. El suero glucosado no es el diluyente recomendado; se usa SSF o Ringer.',
  ARRAY['farmacia'],
  false,
  '["Presentación estándar de TXA: ampollas de 500 mg en 5 ml (concentración 100 mg/ml).","15 mg/kg × 22 kg = 330 mg. Convierte a ml según la concentración."]',
  null,
  null
);


-- Pregunta adicional ENF — Paso 3
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_3,
  'Llegan los hemoderivados del banco de sangre. ¿Cuáles son los pasos de verificación de seguridad transfusional que debe realizar enfermería antes de iniciar la transfusión?',
  '["Comprobar únicamente que el grupo sanguíneo del paciente coincide con el de la bolsa","Verificar identidad del paciente (pulsera), grupo ABO/Rh de la bolsa frente a la petición, fecha de caducidad, integridad de la bolsa, y registrar la hora de inicio con constantes basales","Solo es necesario verificar la identidad si es la primera transfusión; en las siguientes se puede omitir","Delegar la verificación en el médico responsable y limitar la actuación de enfermería a conectar el sistema"]',
  '1',
  'La verificación de seguridad transfusional es un acto de enfermería irrenunciable que debe realizarse en CADA unidad transfundida: identificación positiva del paciente (dos identificadores), comprobación de grupo ABO/Rh y número de unidad frente a la solicitud, verificación de fecha de caducidad e integridad visual de la bolsa, registro de constantes basales (FC, TA, Tª) y hora de inicio. Los hemoderivados solo son compatibles con SSF, nunca con otras soluciones.',
  ARRAY['enfermeria'],
  true,
  '["La verificación debe hacerse en cada unidad, no solo en la primera.","Los errores de identificación son la causa más frecuente de reacción transfusional hemolítica grave."]',
  60,
  'El error de identificación en la transfusión (administrar sangre incompatible) puede causar reacción hemolítica aguda fatal. Es la causa más frecuente de muerte evitable asociada a transfusión.'
);

-- Pregunta adicional FARM — Paso 3
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_3,
  'El fibrinógeno plasmático resulta 1.1 g/L. ¿Cuál es la indicación, dosis y preparación del concentrado de fibrinógeno según el protocolo SECIP?',
  '["No está indicado con fibrinógeno >1 g/L; solo se administra si <0.5 g/L","Indicado si fibrinógeno <1.5 g/L: 30-50 mg/kg IV lento (máx 2 g) en 50-100 ml de SSF, por vía diferente al TXA","Indicado si fibrinógeno <2 g/L: 100 mg/kg IV en bolo rápido","Solo se administra fibrinógeno si el ROTEM muestra FIBTEM <4 mm"]',
  '1',
  'La SECIP indica concentrado de fibrinógeno cuando el nivel plasmático es <1.5 g/L (o FIBTEM <8 mm en ROTEM). Dosis: 30-50 mg/kg IV lento en 50-100 ml (máx 2 g en niños). El fibrinógeno es el primer factor que se depleciona en hemorragia activa y su descenso precoz tiene valor predictivo de gravedad. Debe administrarse por vía diferente al TXA. En neonatos y lactantes la dosis puede subir a 70 mg/kg.',
  ARRAY['farmacia'],
  false,
  '["La SECIP establece el umbral de tratamiento en fibrinógeno <1.5 g/L.","El fibrinógeno es el primer factor de coagulación que se consume en hemorragia activa."]',
  null,
  null
);


-- ── PASO 4: Manejo de vía aérea ──────────────────────────────

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_4,
  'A pesar de la reanimación, el paciente presenta Glasgow 8, respiración ineficaz y SatO₂ 88% con mascarilla reservorio. Se decide intubar. ¿Cuál es la combinación de inducción más segura en shock hemorrágico?',
  '["Propofol 2 mg/kg + succinilcolina 1.5 mg/kg","Midazolam 0.2 mg/kg + rocuronio 1 mg/kg","Ketamina 1-2 mg/kg + rocuronio 1 mg/kg","Tiopental 4 mg/kg + vecuronio 0.1 mg/kg"]',
  '2',
  'Ketamina 1-2 mg/kg IV es el inductor de elección en shock hemorrágico por su efecto simpaticomimético que mantiene la tensión arterial y la frecuencia cardíaca. Rocuronio 1 mg/kg proporciona condiciones de intubación en 45-60 seg con mejor perfil de seguridad que succinilcolina. Propofol y tiopental están contraindicados por su efecto vasodilatador e inotrópico negativo en pacientes hipovolémicos.',
  ARRAY['medico'],
  true,
  '["En shock hemorrágico se buscan inductores que mantengan el tono simpático.","Descarta los fármacos con efecto vasodilatador o inotrópico negativo en un paciente ya hipovolémico."]',
  90,
  'Usar propofol o tiopental en un paciente hipovolémico puede provocar colapso hemodinámico y parada cardíaca. La elección del inductor en el paciente inestable es una decisión vital.'
),
(
  $STEP_ID_4,
  'Antes de la intubación, ¿qué maniobras de optimización son prioritarias en este paciente?',
  '["Preoxigenación con mascarilla reservorio a 15 L/min durante 3-5 min y administración de un bolo adicional de hemoderivados/cristaloide para mejorar la hemodinámica antes de la inducción","Administrar atropina 0.02 mg/kg profiláctica y posicionar en Trendelenburg","Sedar con midazolam 0.1 mg/kg antes de la preoxigenación para reducir la ansiedad","Esperar a disponer de fibroscopia antes de intentar la laringoscopia"]',
  '0',
  'La preoxigenación maximiza la reserva de oxígeno y retrasa la desaturación durante la apnea. Optimizar la volemia antes de la inducción es crítico porque los inductores (incluso la ketamina) pueden precipitar hipotensión en hipovolemia grave. La atropina profiláctica ya no se recomienda de rutina en >1 año. La fibroscopia no es de primera línea en una intubación urgente si no hay vía aérea difícil prevista.',
  ARRAY['medico','enfermeria'],
  false,
  '["La inducción anestésica suprime los mecanismos compensadores del shock; hay que optimizar la volemia antes.","La preoxigenación compra tiempo durante la apnea de la secuencia rápida."]',
  null,
  null
),
(
  $STEP_ID_4,
  '¿Qué tubo endotraqueal (TET) seleccionarías para un niño de 6 años y qué profundidad de inserción oral estimada esperarías?',
  '["TET con balón 4.5 mm, inserción a ~14-15 cm de comisura labial","TET con balón 5.0 mm, inserción a ~15-16 cm de comisura labial","TET sin balón 5.5 mm, inserción a ~16-17 cm de comisura labial","TET con balón 6.0 mm, inserción a ~17-18 cm de comisura labial"]',
  '1',
  'Fórmula para TET con balón en >2 años: (edad/4) + 3.5 = (6/4) + 3.5 = 5.0 mm. Profundidad oral estimada: diámetro interno × 3 = 15 cm, o bien (edad/2) + 12 = 15 cm. Actualmente se prefieren tubos con balón incluso en pediatría por menor riesgo de fuga y aspiración.',
  ARRAY['medico','enfermeria'],
  false,
  '["Fórmula TET con balón en >2 años: (edad/4) + 3.5","Profundidad oral: diámetro × 3 o (edad/2) + 12"]',
  null,
  null
);


-- ── PASO 5: Estabilización y disposición ─────────────────────

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_5,
  '¿Cuáles son los objetivos terapéuticos que debemos monitorizar durante la reanimación hemostática?',
  '["Hb >12 g/dL, plaquetas >150.000, INR <1.0, temperatura >36.5°C","Hb >9 g/dL, plaquetas >50.000, INR <1.5, fibrinógeno >1.5 g/L, Ca²⁺ >0.9 mmol/L, temperatura >35°C, lactato <2 mmol/L","Hb >7 g/dL, plaquetas >20.000, INR <2.0, fibrinógeno >0.5 g/L","Hb >10 g/dL, pH >7.4, lactato <1 mmol/L, temperatura >37°C"]',
  '1',
  'Objetivos de reanimación hemostática: Hb ≥9 g/dL, plaquetas >50.000 (>100.000 en sangrado SNC), INR <1.5, fibrinógeno >1.5 g/L, Ca²⁺ >0.9 mmol/L, temperatura >35°C (evitar la tríada letal: hipotermia, acidosis, coagulopatía), lactato <2 mmol/L y pH >7.2.',
  null,
  false,
  '["Los objetivos deben cubrir oxigenación, hemostasia, electrolitos y temperatura; piensa en qué valores son realistas en emergencia vs valores normales.","Los umbrales son menos exigentes que los valores normales: el objetivo es evitar la tríada letal, no normalizar todos los parámetros."]',
  null,
  null
),
(
  $STEP_ID_5,
  'El cirujano confirma que el paciente necesita revisión quirúrgica urgente. ¿Cuál es la estrategia de manejo más adecuada mientras se prepara quirófano?',
  '["Continuar la reanimación hemostática, mantener la perfusión de TXA, calentar los hemoderivados con calentador de fluidos y coordinar el traslado con monitorización continua","Suspender la transfusión hasta que el cirujano valore en quirófano","Administrar factor VII activado recombinante como primera línea antes de quirófano","Iniciar noradrenalina a 0.1 mcg/kg/min para normalizar la tensión antes de cirugía"]',
  '0',
  'La reanimación hemostática debe mantenerse de forma continua hasta el control quirúrgico del sangrado. Los hemoderivados deben calentarse (calentador de fluidos o manta térmica) para prevenir hipotermia, que empeora la coagulopatía. La noradrenalina no corrige hipovolemia y puede empeorar la perfusión tisular. El factor VII activado es de última línea, no de primera.',
  null,
  false,
  '["La hipotermia empeora la coagulopatía: cada grado por debajo de 35°C reduce un 10% la función plaquetaria.","El control definitivo del sangrado es quirúrgico; la reanimación es el puente hasta la cirugía."]',
  null,
  null
),
(
  $STEP_ID_5,
  'Como farmacéutico/a, ¿qué interacciones y precauciones debes vigilar durante la transfusión masiva en este paciente?',
  '["No infundir calcio por la misma vía que los hemoderivados; vigilar hiperpotasemia con hemoderivados irradiados; verificar caducidad de cada unidad","Administrar sistemáticamente bicarbonato para prevenir acidosis y dexametasona como profilaxis antialérgica","No hay interacciones relevantes; la transfusión masiva es un procedimiento estandarizado sin particularidades farmacológicas","Suspender el TXA durante la administración de plasma porque antagonizan sus efectos"]',
  '0',
  'El calcio IV no debe pasar por la misma vía que los hemoderivados (riesgo de coagulación en el sistema). Los concentrados de hematíes irradiados (si se usan) liberan más potasio. Cada unidad debe verificarse (grupo, caducidad, integridad). El TXA y el plasma NO se antagonizan; el TXA es antifibrinolítico y el plasma aporta factores. El bicarbonato sistemático no está indicado.',
  ARRAY['farmacia'],
  false,
  '["El citrato de los hemoderivados quela calcio; pero el calcio IV coagula la sangre si se mezclan en la misma vía.","La seguridad transfusional incluye: verificación de identidad, grupo, caducidad e integridad de cada unidad."]',
  null,
  null
);


-- Pregunta adicional MED — Paso 5
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_5,
  'Mientras se prepara quirófano, ¿cuál es la estrategia de manejo tensional recomendada por la SECIP en hemorragia activa sin TCE asociado?',
  '["Normalizar la TAS lo antes posible con vasopresores para garantizar la perfusión","Hipotensión permisiva: tolerar TAS 80-90 mmHg hasta que se controle quirúrgicamente la fuente de sangrado, evitando fluidoterapia excesiva","Mantener TAS >110 mmHg para asegurar presión de perfusión cerebral","No hay objetivo tensional definido; guiarse exclusivamente por el lactato"]',
  '1',
  'La SECIP recomienda la estrategia de hipotensión permisiva: tolerar TAS 80-90 mmHg hasta controlar la fuente de sangrado, siempre garantizando un gasto cardíaco adecuado. La normalización agresiva de la tensión sin control del sangrado aumenta la pérdida hemática, diluye factores de coagulación y empeora la coagulopatía. Excepción: en TCE grave se debe mantener TAS ≥110 o TAM ≥80 para asegurar presión de perfusión cerebral.',
  ARRAY['medico'],
  false,
  '["Normalizar la tensión de forma agresiva antes de controlar el sangrado puede empeorar la hemorragia.","Existe una excepción importante a esta estrategia cuando hay afectación del sistema nervioso central."]',
  null,
  null
);

-- Pregunta adicional FARM — Paso 5
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_5,
  'El INR de control es 1.8 y el paciente no responde adecuadamente al PFC. ¿En qué situaciones está indicado el concentrado de complejo protrombínico (CCP) según la SECIP y a qué dosis?',
  '["Solo está indicado como sustituto del PFC en cualquier paciente con INR elevado, a 50 UI/kg","Indicado en pacientes en tratamiento con anticoagulantes anti-vitamina K como alternativa al PFC, o cuando el INR persiste >1.5 pese a PFC adecuado: dosis 15-25 UI/kg IV en bolo lento","Indicado de rutina en toda transfusión masiva pediátrica como primera línea, a 10 UI/kg","Contraindicado en pediatría; solo aprobado en adultos"]',
  '1',
  'La SECIP indica el CCP (contiene factores II, VII, IX, X) en pacientes en tratamiento con fármacos anti-vitamina K como alternativa al PFC para revertir rápidamente su efecto. También se usa cuando el INR persiste elevado (>1.5) a pesar de PFC adecuado. Dosis: 15-25 UI/kg IV en bolo lento. No es de primera línea en PTM rutinario y no sustituye al PFC de forma generalizada. Su uso en pediatría está establecido aunque con menos evidencia que en adultos.',
  ARRAY['farmacia'],
  false,
  '["El CCP contiene los factores vitamina K-dependientes: II, VII, IX y X.","Su indicación principal es la reversión de anticoagulantes anti-vitamina K, no la sustitución rutinaria del PFC."]',
  null,
  null
);


-- 4. CASE BRIEF (usar $SCENARIO_ID)
INSERT INTO case_briefs (
  id, scenario_id, title, context, chief_complaint, chips,
  history, triangle, vitals, exam, quick_labs, imaging, timeline,
  red_flags, objectives, competencies, critical_actions,
  learning_objective, level, estimated_minutes
) VALUES (
  gen_random_uuid(),
  $SCENARIO_ID,
  'Shock hemorrágico postquirúrgico',
  'Planta de cirugía pediátrica. Hospital terciario con UCI pediátrica y banco de sangre.',
  'Sangrado activo por drenaje abdominal en postoperatorio inmediato de apendicectomía complicada.',
  '["Palidez","Taquicardia","Hipotensión","Drenaje hemático"]',
  '{
    "Motivo de consulta": "Niño de 6 años, 22 kg, operado hace 4 horas de apendicectomía laparoscópica convertida a abierta por absceso apendicular. Drenaje tipo Blake en fosa ilíaca derecha.",
    "Síntomas": ["Palidez progresiva en la última hora","Somnolencia creciente","Quejido","Frialdad de extremidades"],
    "Antecedentes": "Previamente sano. Sin alergias conocidas. No toma medicación habitual. Vacunación correcta.",
    "Datos adicionales relevantes": "Al revisar el sistema de drenaje, se observa que el reservorio Blake está conectado a aspiración de vacío de pared (debería estar a caída libre o con vacío suave propio del reservorio). El reservorio contiene 280 ml de sangre roja brillante acumulada en los últimos 60 minutos."
  }',
  '{"appearance":"red","breathing":"amber","circulation":"red"}',
  '{"fc":155,"fr":32,"sat":96,"temp":35.8,"tas":78,"tad":45,"peso":22}',
  '{
    "Piel": "Palidez generalizada, frialdad acra, relleno capilar 4 segundos",
    "Abdomen": "Blando, doloroso a la palpación en FID. Herida quirúrgica con apósito limpio y seco. Drenaje Blake en FID con débito hemático activo",
    "Neurológico": "Somnoliento, responde a estímulos verbales enérgicos. Glasgow 11 (O3 V3 M5)",
    "Auscultación": "Taquicardia rítmica sin soplos. Murmullo vesicular conservado bilateral"
  }',
  '[{"name":"Hemoglobina capilar (preQx)","value":"12.4 g/dL"},{"name":"Glucemia capilar","value":"105 mg/dL"},{"name":"Gasometría venosa","value":"pH 7.28, Lactato 4.2 mmol/L, Ca²⁺ 1.05 mmol/L"}]',
  '[{"name":"Pruebas cruzadas","status":"solicitadas"},{"name":"ROTEM","status":"recomendado"},{"name":"Ecografía abdominal","status":"recomendada"}]',
  '[
    {"t":-240,"evento":"Cirugía: apendicectomía laparoscópica convertida por absceso. Se deja drenaje Blake en FID."},
    {"t":-60,"evento":"Traslado a planta. Constantes iniciales estables (FC 105, TAS 95)."},
    {"t":0,"evento":"Enfermería detecta reservorio de drenaje con 280 ml hemáticos. Paciente pálido y somnoliento."},
    {"t":5,"evento":"Se avisa al equipo médico. FC 155, TAS 78, SatO₂ 96%."},
    {"t":10,"evento":"Se desconecta vacío del drenaje. Se canaliza segundo acceso IV."},
    {"t":15,"evento":"Bolo SSF 10 ml/kg. Se solicita analítica urgente y hemoderivados."},
    {"t":25,"evento":"Se activa protocolo de transfusión masiva."},
    {"t":35,"evento":"Administración de primer pack de hemoderivados y TXA."},
    {"t":45,"evento":"Glasgow desciende a 8. SatO₂ 88%. Se decide ISR."},
    {"t":50,"evento":"Intubación exitosa con ketamina + rocuronio."},
    {"t":60,"evento":"Traslado a quirófano para revisión quirúrgica urgente."}
  ]',
  '[
    {"text":"Drenaje con débito >5 ml/kg/h de sangre roja","correct":true},
    {"text":"Taquicardia progresiva con hipotensión en postoperatorio","correct":true},
    {"text":"Descenso del nivel de consciencia (Glasgow <12)","correct":true},
    {"text":"Temperatura <36°C en contexto de sangrado activo","correct":true},
    {"text":"Lactato >4 mmol/L","correct":true},
    {"text":"Ligera palidez con FC normal","correct":false}
  ]',
  '{
    "MED":["Reconocer precozmente el shock hemorrágico postquirúrgico","Activar el protocolo de transfusión masiva con criterios adecuados","Realizar intubación de secuencia rápida con fármacos seguros en shock","Dirigir la reanimación hemostática hacia objetivos terapéuticos definidos"],
    "NUR":["Detectar el sangrado activo y el error en el sistema de drenaje","Monitorizar constantes y signos de shock","Preparar accesos venosos y administrar hemoderivados con verificación de seguridad","Prevenir hipotermia con calentamiento activo de fluidos"],
    "PHARM":["Calcular y preparar la perfusión de TXA (carga + mantenimiento)","Conocer la composición de los packs del PTM por peso","Vigilar interacciones y complicaciones farmacológicas de la transfusión masiva","Gestionar la reposición de calcio y otros electrolitos"]
  }',
  '["Reconocimiento precoz del shock hemorrágico","Reanimación hemostática","Trabajo interprofesional","Seguridad transfusional","Manejo de vía aérea en paciente inestable"]',
  '["Desconectar el vacío del drenaje inmediatamente","Activar protocolo de transfusión masiva sin retraso","Administrar TXA 15 mg/kg en los primeros 15 minutos","Usar ketamina (no propofol) como inductor para la ISR","Reponer calcio ante hipocalcemia por citrato"]',
  'Manejar un shock hemorrágico postquirúrgico pediátrico aplicando reanimación hemostática con control de daños, protocolo de transfusión masiva y manejo seguro de la vía aérea.',
  'medio',
  20
);


-- 5. CASE RESOURCES (usar $SCENARIO_ID)
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), $SCENARIO_ID,
   'Protocolo de actuación en hemorragia masiva en pediatría',
   'https://secip.info/images/uploads/2020/07/Hemorragia-masiva-en-pediatr%C3%ADa.pdf',
   'SECIP', 'protocolo', 2020, true, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Anemia aguda posthemorrágica. Transfusión masiva — Manual Clínico H. Virgen del Rocío',
   'https://manualclinico.hospitaluvrocio.es/urgencias-de-pediatria/hematologia-urgencias-de-pediatria/anemia-aguda-posthermorragica-transfusion-masiva/',
   'Hospital Virgen del Rocío', 'protocolo', 2025, true, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Protocolo Transfusión Masiva — Hospital Virgen del Rocío (enero 2025)',
   'https://hospitaluvrocio.es/wp-content/uploads/2025/01/Protocolo-Transfusion-Masiva-ENERO-2025-1.pdf',
   'Hospital Virgen del Rocío', 'protocolo', 2025, true, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Actualización de la reanimación con control de daños en el trauma grave pediátrico. Parte II: Sangre total, coadyuvantes y protocolos de transfusión masiva',
   'https://andespediatrica.cl/index.php/rchped/article/view/5764',
   'Andes Pediatrica', 'revisión', 2025, true, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Reanimación con control de daños en el trauma grave pediátrico. Parte I: Limitación de cristaloides, hipotensión permisiva, reanimación hemostática',
   'https://andespediatrica.cl/index.php/rchped/article/view/5763',
   'Andes Pediatrica', 'revisión', 2025, true, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Resucitación hemostática en pediatría',
   'https://www.secip.com/images/uploads/2018/05/Resucitacion-hemostatica-Dra-Calvo-Monge.pdf',
   'SECIP', 'revisión', 2016, true, now());
