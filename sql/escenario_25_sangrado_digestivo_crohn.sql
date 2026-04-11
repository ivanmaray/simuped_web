-- ══════════════════════════════════════════
-- ESCENARIO 25: SANGRADO DIGESTIVO AGUDO EN ENFERMEDAD DE CROHN
-- Adolescente 14 años, 38 kg, EC ileocolónica L3B1
-- ══════════════════════════════════════════

-- ──────────────────────────────────────────
-- BLOQUE 1: SCENARIO
-- Ejecutar primero y anotar el ID devuelto como $SCENARIO_ID
-- ──────────────────────────────────────────
INSERT INTO scenarios (
  title, summary, level, difficulty, mode, status, estimated_minutes, max_attempts
)
VALUES (
  'Sangrado digestivo agudo en enfermedad de Crohn',
  'Adolescente de 14 años con enfermedad de Crohn ileocolónica en mantenimiento con azatioprina que acude a urgencias por rectorragia abundante, taquicardia y signos de hipovolemia. Requiere estabilización hemodinámica, localización del sangrado, y decisión terapéutica sobre el brote subyacente.',
  'avanzado',
  'Avanzado',
  ARRAY['online'],
  'En construcción: en proceso',
  25,
  3
) RETURNING id;
-- ⚠️ Guarda este ID como $SCENARIO_ID


-- ──────────────────────────────────────────
-- BLOQUE 2: STEPS
-- Ejecutar con $SCENARIO_ID real; anotar los 5 IDs devueltos como $STEP_ID_1..5
-- ──────────────────────────────────────────
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
(
  $SCENARIO_ID,
  1,
  'Recepción en urgencias y estabilización inicial',
  'Recibir a paciente de 14 años, 38 kg, con 6 deposiciones con sangre roja abundante en 8h, dolor cólico FID-FCI, fiebre 38.4°C y FC 126 lpm. TA 92/58 mmHg. TEP: apariencia ámbar, respiración normal, circulación comprometida. Establecer prioridades ABCDE, asegurar acceso vascular y estabilizar el volumen circulante antes de cualquier prueba diagnóstica.',
  false,
  null
),
(
  $SCENARIO_ID,
  2,
  'Localización y caracterización del sangrado',
  'Con el paciente hemodinámicamente en proceso de estabilización, orientar el origen del sangrado (alto vs bajo) mediante parámetros analíticos y clínicos. Solicitar hemograma urgente, bioquímica con función renal, coagulación, PCR, calprotectina y planificar endoscopia. Hemoglobina 9.2 g/dL (basal 12), BUN 14, creatinina 0.7, PCR 48 mg/L, albúmina 2.9 g/dL.',
  false,
  null
),
(
  $SCENARIO_ID,
  3,
  'Transfusión y soporte hemostático',
  'Indicar transfusión de concentrado de hematíes según criterios pediátricos. Calcular la dosis correcta para el peso del paciente y el déficit de hemoglobina. Monitorizar la respuesta transfusional y asegurar el cumplimiento del protocolo de seguridad transfusional (comprobación identidad, grupo, trazabilidad). Evaluar necesidad de antibioterapia empírica.',
  false,
  null
),
(
  $SCENARIO_ID,
  4,
  'Tratamiento del brote subyacente de enfermedad de Crohn',
  'Confirmada la actividad grave de la enfermedad de Crohn como causa del sangrado, decidir el tratamiento de inducción. El paciente ya toma azatioprina como mantenimiento; no ha recibido biológicos previos. La nutrición enteral exclusiva no es factible por inestabilidad clínica y sangrado activo. Evaluar indicación de corticoides IV, biológicos e implicaciones farmacológicas del cambio terapéutico.',
  false,
  null
),
(
  $SCENARIO_ID,
  5,
  'Seguimiento ambulatorio y monitorización del tratamiento',
  'Una vez estabilizado el paciente e iniciado tratamiento con infliximab, planificar el seguimiento a largo plazo: monitorización de niveles del fármaco, marcadores de actividad inflamatoria y optimización del mantenimiento con tiopurinas. Educar al paciente y familia sobre señales de alarma, adherencia y frecuencia de controles.',
  false,
  null
)
RETURNING id;
-- ⚠️ Guarda los 5 IDs como $STEP_ID_1, $STEP_ID_2, $STEP_ID_3, $STEP_ID_4, $STEP_ID_5


-- ──────────────────────────────────────────
-- BLOQUE 3A: QUESTIONS — PASO 1
-- ──────────────────────────────────────────
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
)
VALUES
(
  $STEP_ID_1,
  'Ante un adolescente con rectorragia masiva, FC 126, TA 92/58 y TEP con circulación comprometida, ¿cuál es la primera actuación prioritaria según el abordaje ABCDE?',
  '["Solicitar colonoscopia urgente para localizar el sangrado","Canalizar 2 vías periféricas de grueso calibre e iniciar expansión con SSF 20 mL/kg en bolo","Administrar omeprazol IV antes de cualquier otra medida","Transfundir concentrado de hematíes inmediatamente sin esperar grupo sanguíneo"]',
  '1',
  'En shock hipovolémico hemorrágico pediátrico, la prioridad inmediata es el acceso vascular y la restauración del volumen circulante con cristaloide (SSF o Ringer lactato 20 mL/kg en bolo, repetible hasta 3 veces). La endoscopia, el IBP y la transfusión son pasos posteriores que requieren estabilización previa o confirmación de grupo sanguíneo.',
  ARRAY['medico'],
  true,
  '["¿Qué componente del TEP está comprometido y qué implica eso en el orden de actuación?","El ABCDE prioriza la C (Circulation) ante un paciente en shock; ¿qué acción concreta restaura el volumen circulante?"]',
  90,
  'El retraso en restaurar el volumen circulante en un paciente pediátrico con shock hemorrágico puede llevar a parada cardiorrespiratoria. Administrar omeprazol o pedir endoscopia sin asegurar primero el acceso vascular y la expansión es un error de priorización con consecuencias potencialmente fatales.'
),
(
  $STEP_ID_1,
  'En un niño con rectorragia y pérdida hemática aguda significativa, ¿cuál es el indicador hemodinámico más sensible y precoz de hipovolemia en pediatría?',
  '["Taquicardia","Hipotensión arterial","Relleno capilar prolongado >3 segundos","Disminución del nivel de conciencia"]',
  '0',
  'En pediatría, la taquicardia es el signo más precoz de hipovolemia: aparece cuando se pierde >15-20% del volumen circulante. La hipotensión es un signo tardío (pérdida >30-40%) que indica shock descompensado. El relleno capilar y el nivel de conciencia se alteran en fases más avanzadas.',
  ARRAY['enfermeria'],
  false,
  '["En adultos la hipotensión es el parámetro más usado, pero ¿es igual de precoz en pediatría?","Piensa en cómo los mecanismos compensadores (vasoconstricción, taquicardia) preservan la TA durante más tiempo en niños."]',
  null,
  null
),
(
  $STEP_ID_1,
  'Al monitorizar a un paciente pediátrico en urgencias con rectorragia activa, ¿qué parámetros son prioritarios en la valoración continua de la perfusión?',
  '["Temperatura y glucemia capilar","Frecuencia cardíaca, tensión arterial, diuresis y nivel de conciencia","Saturación de oxígeno y capnografía","Presión venosa central y gasto cardíaco"]',
  '1',
  'La tríada FC + TA + diuresis (objetivo >1 mL/kg/h) con evaluación del nivel de conciencia permite valorar la respuesta a la reposición y detectar deterioro hemodinámico precozmente. La PVC requiere acceso central y no está justificada como primer paso en urgencias pediátricas.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué parámetros reflejan directamente la perfusión tisular y la respuesta a la expansión volémica?","La diuresis es un marcador indirecto pero muy fiable de perfusión renal; ¿está incluida en tu respuesta?"]',
  null,
  null
),
(
  $STEP_ID_1,
  'El paciente refiere dolor cólico intenso. ¿Cuál de los siguientes analgésicos está CONTRAINDICADO en un paciente con sangrado digestivo activo?',
  '["Paracetamol IV 15 mg/kg","Metamizol oral","Ibuprofeno IV 10 mg/kg","Morfina IV a dosis baja (0.05-0.1 mg/kg)"]',
  '2',
  'Los AINEs (ibuprofeno, naproxeno, ketorolaco) están absolutamente contraindicados en sangrado digestivo activo: inhiben la COX-1 reduciendo la síntesis de prostaglandinas gastroprotectoras, alteran la hemostasia plaquetaria y agravan la lesión mucosa. El paracetamol IV y la morfina a dosis baja son opciones seguras para analgesia en este contexto.',
  ARRAY['medico', 'enfermeria'],
  true,
  '["¿Qué efecto tienen los AINEs sobre la mucosa gastrointestinal y la función plaquetaria?","¿Cuál de las opciones pertenece al grupo de antiinflamatorios no esteroideos?"]',
  90,
  'Administrar un AINE durante un sangrado digestivo activo puede agravar la hemorragia al inhibir la agregación plaquetaria y aumentar la lesión mucosa. Este error es especialmente peligroso en pacientes con enfermedad de Crohn con mucosa ya inflamada y friable.'
),


-- ──────────────────────────────────────────
-- BLOQUE 3B: QUESTIONS — PASO 2
-- ──────────────────────────────────────────
(
  $STEP_ID_2,
  'BUN 14 mg/dL y creatinina 0.7 mg/dL. ¿Qué aporta este cociente al diagnóstico del origen del sangrado?',
  '["BUN/creat >30 indica sangrado bajo (colónico)","BUN/creat <30 (aquí ≈20) orienta a sangrado bajo, no a HDA","BUN/creat <30 descarta sangrado de cualquier origen","El cociente BUN/creatinina no es útil en pediatría"]',
  '1',
  'El cociente BUN/creatinina se eleva >30 en la HDA por absorción intestinal de proteínas hemáticas en el intestino delgado. Un cociente <30 (aquí ≈20) orienta a sangrado de origen bajo (cólico o ileal distal), coherente con la enfermedad de Crohn ileocolónica y la rectorragia de sangre roja fresca.',
  ARRAY['medico'],
  false,
  '["¿Por qué aumentaría el BUN en el sangrado digestivo alto pero no en el bajo?","¿Cuál es el punto de corte clásico del cociente BUN/creatinina para diferenciar HDA de HDB?"]',
  null,
  null
),
(
  $STEP_ID_2,
  'El paciente tiene Hb 9.2 g/dL (basal conocida 12 g/dL), caída documentada de >2.5 g/dL, con inestabilidad hemodinámica inicial. ¿Cuándo debe realizarse la endoscopia?',
  '["Endoscopia inmediata (<2h) independientemente del estado hemodinámico","Colonoscopia en las primeras 12-24h, una vez estabilizado hemodinámicamente","Endoscopia diferida a 72h para optimizar la preparación colónica","No está indicada endoscopia; el manejo es solo médico en EC pediátrica"]',
  '1',
  'Las guías BSPGHAN 2020 y SEUP recomiendan colonoscopia en las primeras 12-24h una vez estabilizado el paciente. La endoscopia urgente (<2h) sin estabilización previa aumenta la morbimortalidad. En EC activa con sangrado, la endoscopia confirma la extensión, permite biopsia y guía el tratamiento; diferirla >72h es inaceptable si hay caída de Hb >2 g/dL con inestabilidad.',
  ARRAY['medico'],
  true,
  '["¿La endoscopia antes de estabilizar al paciente mejora o empeora los resultados?","¿Cuál es el intervalo recomendado en las guías para colonoscopia en HDB con inestabilidad hemodinámica?"]',
  90,
  'Realizar endoscopia sin estabilización hemodinámica previa en un paciente pediátrico con shock hemorrágico activo aumenta el riesgo de parada cardiorrespiratoria durante el procedimiento. Diferirla >24-48h sin tratamiento específico permite la progresión del brote y perpetúa el sangrado.'
),
(
  $STEP_ID_2,
  '¿Cuál es el marcador no invasivo más sensible y específico para valorar la actividad mucosa de la enfermedad de Crohn?',
  '["Proteína C reactiva (PCR)","Velocidad de sedimentación globular (VSG)","Calprotectina fecal","Albúmina sérica"]',
  '2',
  'La calprotectina fecal refleja directamente la infiltración neutrofílica de la mucosa intestinal y es el marcador no invasivo más sensible para actividad inflamatoria mucosa en EC (sensibilidad ~80%, especificidad ~80%). La PCR es un marcador sistémico de inflamación, menos específico del compartimento mucoso. La albúmina indica desnutrición/inflamación crónica, no actividad aguda.',
  ARRAY['medico'],
  false,
  '["¿Cuál de estos marcadores se origina directamente en la mucosa intestinal inflamada?","La PCR refleja inflamación sistémica; ¿existe algún marcador más próximo al origen de la inflamación en el intestino?"]',
  null,
  null
),
(
  $STEP_ID_2,
  'Se decide iniciar omeprazol IV como gastroprotección. ¿Cuál es la dosis correcta para este paciente de 38 kg?',
  '["40 mg IV (1 mg/kg × 38 kg, dosis estándar, máx 40 mg/dosis)","80 mg IV en bolo","20 mg IV","100 mg IV fijo independientemente del peso"]',
  '0',
  'La dosis de omeprazol IV en pediatría es 1-1.5 mg/kg/día con un máximo de 40-80 mg/día según indicación. Para gastroprotección en HDA o brote activo: 1 mg/kg × 38 kg = 38 mg → se redondea a 40 mg IV. La dosis de 80 mg se reserva para HDA confirmada con lesión de alto riesgo (Forrest Ia-IIa). Dosis fijas de 100 mg no están justificadas en pediatría.',
  ARRAY['farmacia'],
  false,
  '["¿Cuál es la dosis recomendada de omeprazol IV en niños por kg de peso?","¿Existe un techo de dosis que no deba superarse en esta indicación?"]',
  null,
  null
),


-- ──────────────────────────────────────────
-- BLOQUE 3C: QUESTIONS — PASO 3
-- ──────────────────────────────────────────
(
  $STEP_ID_3,
  'Hb 9.2 g/dL con inestabilidad hemodinámica. ¿Cuál es la estrategia transfusional correcta en un paciente pediátrico con sangrado digestivo activo?',
  '["Transfundir hasta normalizar la FC (<100 lpm) independientemente de la Hb","No transfundir hasta que la Hb caiga por debajo de 5 g/dL","Transfundir con umbral Hb <7-8 g/dL, objetivo Hb 9-10 g/dL; evitar sobre-transfundir","Transfundir hasta alcanzar Hb 13 g/dL para margen de seguridad"]',
  '2',
  'Las guías pediátricas establecen el umbral transfusional en Hb <7 g/dL en pacientes estables o <8 g/dL con inestabilidad hemodinámica, con objetivo de Hb 9-10 g/dL. La sobre-transfusión aumenta la presión portal en sangrado variceal y se asocia a mayor mortalidad. Transfundir hasta FC normal o hasta 13 g/dL es una práctica contraindicada por los datos actuales.',
  ARRAY['medico'],
  true,
  '["¿Cuál es el umbral de Hb que indica transfusión en pediatría con inestabilidad hemodinámica?","¿Qué riesgos tiene la sobre-transfusión en un paciente con sangrado digestivo activo?"]',
  90,
  'La sobre-transfusión aumenta la presión venosa portal, perpetúa el sangrado variceal y se asocia a mayor mortalidad. Transfundir indiscriminadamente hasta la normalización de FC o hasta Hb 13 g/dL es un error clínico documentado con evidencia de daño.'
),
(
  $STEP_ID_3,
  'Se decide transfundir. El paciente pesa 38 kg, Hb actual 7.8 g/dL (tras reposición), objetivo Hb 10 g/dL. ¿Cuántos mL de concentrado de hematíes se deben administrar?',
  '["100 mL","180 mL","250 mL (fórmula: ΔHb × 3 × peso = 2.2 × 3 × 38 ≈ 251 mL)","500 mL"]',
  '2',
  'La fórmula estándar para calcular el volumen de concentrado de hematíes en pediatría es: mL = ΔHb × 3 × peso(kg). ΔHb = 10 - 7.8 = 2.2 g/dL. 2.2 × 3 × 38 = 250.8 mL ≈ 250 mL. Administrar 100 mL sería insuficiente; 500 mL supone sobre-transfusión con riesgo de sobrecarga.',
  ARRAY['farmacia'],
  false,
  '["¿Cuál es la fórmula pediátrica estándar para calcular el volumen de concentrado de hematíes?","¿Cuántos g/dL de Hb hay que subir y cuánto pesa el paciente?"]',
  null,
  null
),
(
  $STEP_ID_3,
  'Antes de iniciar la transfusión, ¿qué verificaciones son IMPRESCINDIBLES según el protocolo de seguridad transfusional?',
  '["Solo comprobar que la bolsa no está caducada","Verificar identidad del paciente (pulsera + verbalmente), grupo ABO/Rh de la bolsa vs la solicitud, y registrar inicio en sistema de trazabilidad","Comprobar la temperatura de la bolsa y el flujo IV","Asegurarse de que hay acceso venoso periférico sin más trámites"]',
  '1',
  'El protocolo de seguridad transfusional exige: (1) identificación inequívoca del paciente (pulsera + confirmación verbal o tutor), (2) comprobación cruzada del grupo ABO/Rh entre la bolsa y la petición, y (3) registro del inicio en el sistema de trazabilidad. Los errores de identificación son la causa más frecuente de reacciones transfusionales graves (hemólisis aguda).',
  ARRAY['enfermeria'],
  false,
  '["¿Qué es una reacción hemolítica transfusional y cuál es su causa más frecuente?","El error de identificación paciente-producto es la causa número uno de muerte relacionada con transfusión; ¿qué pasos la previenen?"]',
  null,
  null
),
(
  $STEP_ID_3,
  'Con fiebre 38.4°C y PCR 48 mg/L en el contexto de un brote de EC, ¿cuándo está indicada la antibioterapia empírica IV?',
  '["Siempre, en todos los brotes graves de EC con fiebre","Solo si hay sospecha clínica de infección sobreañadida (foco, deterioro séptico, traslocación bacteriana)","Solo si el hemocultivo resulta positivo","Si la albúmina es <3 g/dL"]',
  '1',
  'En EC, la fiebre puede ser secundaria a la propia inflamación intestinal sin infección sobreañadida. Los antibióticos empíricos IV (p.ej., metronidazol ± ciprofloxacino o piperacilina-tazobactam) se reservan para complicaciones infecciosas: absceso, perforación, sepsis, traslocación bacteriana con deterioro clínico. Antibioterapia sistemática en todo brote grave aumenta la resistencia sin beneficio demostrado.',
  ARRAY['medico'],
  false,
  '["¿Puede la fiebre en un brote de EC ser de origen inflamatorio no infeccioso?","¿En qué situaciones específicas sí está indicado el antibiótico en un brote de EC?"]',
  null,
  null
),


-- ──────────────────────────────────────────
-- BLOQUE 3D: QUESTIONS — PASO 4
-- ──────────────────────────────────────────
(
  $STEP_ID_4,
  'El paciente tiene un brote grave de EC activa con sangrado, fiebre y albúmina 2.9 g/dL. La nutrición enteral exclusiva no es factible. ¿Cuál es el tratamiento de inducción más adecuado?',
  '["Continuar solo con azatioprina a dosis más alta","Metilprednisolona IV 1-1.5 mg/kg/día (máx 60 mg/día) como inducción de remisión en brote grave","Iniciar directamente adalimumab subcutáneo sin corticoides previos","Solo reposición nutricional IV con nutrición parenteral total"]',
  '1',
  'En brotes graves de EC pediátrica cuando la nutrición enteral exclusiva (primera línea según ECCO-ESPGHAN 2020) no es factible, los corticoides IV son el tratamiento de inducción estándar: metilprednisolona 1-1.5 mg/kg/día IV (máx 60 mg/día) o equivalente. Continuar solo azatioprina es insuficiente (es un fármaco de mantenimiento, no de inducción). El adalimumab se reserva para corticorresistencia o alto riesgo.',
  ARRAY['medico'],
  true,
  '["¿Cuál es la primera línea de inducción en EC pediátrica según ECCO-ESPGHAN 2020 cuando la EEN no es factible?","¿La azatioprina tiene efecto en el brote agudo o solo es un fármaco de mantenimiento?"]',
  90,
  'No tratar un brote grave de EC con el agente de inducción adecuado (corticoides IV cuando la EEN no es posible) puede llevar a perforación, megacolon tóxico o necesidad de cirugía de urgencia. La azatioprina sola no controla el brote agudo por su latencia de efecto de semanas.'
),
(
  $STEP_ID_4,
  'Tras 5 días de corticoides IV sin respuesta satisfactoria, ¿cuál es el biológico de primera línea indicado en EC pediátrica corticorresistente?',
  '["Vedolizumab IV","Infliximab 5 mg/kg IV en semanas 0, 2 y 6","Ustekinumab SC","Tofacitinib oral"]',
  '1',
  'El infliximab (anti-TNF) a 5 mg/kg IV en semanas 0, 2 y 6 es el biológico de primera línea en EC pediátrica corticorresistente o corticodependiente grave, según ECCO-ESPGHAN 2020. Vedolizumab y ustekinumab son alternativas de segunda línea o en casos específicos. El tofacitinib no está aprobado en pediatría para EC.',
  ARRAY['medico'],
  false,
  '["¿Qué biológico tiene la mayor evidencia y aprobación pediátrica en EC corticorresistente?","¿Cuál es la pauta de inducción del infliximab en EC pediátrica?"]',
  null,
  null
),
(
  $STEP_ID_4,
  '¿Cuándo debe realizarse la primera monitorización de niveles de infliximab (TDM) en un paciente que inicia inducción?',
  '["La TDM nunca es útil de forma proactiva; solo ante pérdida de respuesta","Antes de la segunda infusión (semana 2)","Antes de la cuarta infusión (semana 14), con nivel trough objetivo ≥5 μg/mL para cicatrización mucosa","Solo si aparecen anticuerpos anti-fármaco positivos en analítica rutinaria"]',
  '2',
  'La TDM proactiva de infliximab está recomendada antes de la 4ª infusión (semana 14, tras inducción completa) para optimizar la respuesta a largo plazo. El nivel trough objetivo es ≥5 μg/mL para cicatrización mucosa. La TDM precoz permite ajustar dosis o intervalo antes de desarrollar anticuerpos anti-fármaco e ineficacia secundaria.',
  ARRAY['farmacia'],
  false,
  '["¿En qué momento del ciclo de inducción del infliximab se alcanza el estado estacionario tras las primeras infusiones?","¿Cuál es el nivel trough de infliximab asociado a mayor probabilidad de cicatrización mucosa?"]',
  null,
  null
),
(
  $STEP_ID_4,
  'El paciente ya tomaba azatioprina. Antes de continuar o modificar la dosis de azatioprina, ¿qué prueba es OBLIGATORIA según las guías?',
  '["Cuantificación de IGRA/Mantoux (cribado tuberculosis)","Determinación de anticuerpos anti-infliximab","Genotipado o actividad enzimática de TPMT (tiopurina metiltransferasa)","Niveles séricos de vitamina B12"]',
  '2',
  'El genotipado o la determinación de actividad enzimática de TPMT es obligatorio antes de iniciar o modificar tiopurinas (azatioprina, 6-mercaptopurina). Los pacientes con actividad TPMT ausente o muy baja acumulan metabolitos tóxicos (6-TGN), con riesgo de mielotoxicidad grave (aplasia). Los homocigotos para variantes no funcionantes (<0.3% de la población) no deben recibir tiopurinas.',
  ARRAY['farmacia'],
  false,
  '["¿Qué enzima metaboliza las tiopurinas y qué ocurre si su actividad es nula o muy reducida?","¿Cuál sería la consecuencia de iniciar azatioprina sin conocer el estado de esta enzima en un paciente con actividad ausente?"]',
  null,
  null
),
(
  $STEP_ID_4,
  'Un colega propone iniciar nutrición enteral exclusiva (EEN) como tratamiento del brote, dado que el paciente tiene 14 años. ¿Es apropiada esta indicación en el contexto actual?',
  '["Sí, la EEN es siempre la primera línea en EC pediátrica independientemente de la gravedad","No, la EEN es apropiada para brotes leves-moderados en EC luminal; en un brote grave con inestabilidad hemodinámica y sangrado activo no es la indicación inicial","Sí, pero solo si el paciente acepta la sonda nasogástrica","La EEN está contraindicada en la enfermedad de Crohn de localización ileocolónica"]',
  '1',
  'La EEN (nutrición enteral exclusiva) es la primera línea de inducción en EC pediátrica leve-moderada según ECCO-ESPGHAN 2020 (evidencia A). Sin embargo, en brotes graves con inestabilidad hemodinámica, sangrado activo, obstrucción o intolerancia, la EEN no es factible y los corticoides IV son el tratamiento estándar. La localización ileocolónica no contraindica por sí sola la EEN.',
  ARRAY['medico'],
  false,
  '["¿En qué nivel de gravedad del brote de EC pediátrica está indicada la EEN como primera línea?","¿Puede administrarse EEN de forma segura a un paciente con sangrado digestivo activo e inestabilidad hemodinámica?"]',
  null,
  null
),


-- ──────────────────────────────────────────
-- BLOQUE 3E: QUESTIONS — PASO 5
-- ──────────────────────────────────────────
(
  $STEP_ID_5,
  '¿Con qué frecuencia debe monitorizarse la actividad inflamatoria en el seguimiento de un paciente con EC en tratamiento biológico?',
  '["Solo si hay síntomas: no hay monitorización rutinaria en remisión","Calprotectina fecal cada 3-6 meses + PCR + evaluación clínica periódica","Colonoscopia anual como único método fiable","Solo monitorización de niveles de infliximab, sin marcadores inflamatorios"]',
  '1',
  'El seguimiento en EC en tratamiento biológico incluye calprotectina fecal cada 3-6 meses como marcador no invasivo de actividad mucosa, junto con PCR y evaluación clínica. La colonoscopia se reserva para evaluación de cicatrización mucosa a los 6-12 meses o ante sospecha de recaída. La monitorización clínica exclusiva subestima la actividad mucosa subclínica.',
  ARRAY['enfermeria'],
  false,
  '["¿Cuál es el marcador no invasivo más útil para detectar inflamación mucosa subclínica en EC?","¿Con qué frecuencia recomiendan las guías ECCO-ESPGHAN repetir la calprotectina fecal en seguimiento?"]',
  null,
  null
),
(
  $STEP_ID_5,
  '¿Cuál es la dosis correcta de azatioprina en el mantenimiento de la enfermedad de Crohn pediátrica?',
  '["0.5 mg/kg/día","1 mg/kg/día","2-2.5 mg/kg/día","5 mg/kg/día"]',
  '2',
  'La dosis estándar de azatioprina en mantenimiento de EC pediátrica es 2-2.5 mg/kg/día (máx 2.5 mg/kg/día). Dosis <1.5 mg/kg/día son subterapéuticas y no alcanzan niveles de 6-TGN eficaces. La dosis de 5 mg/kg/día supera el margen terapéutico y aumenta significativamente el riesgo de mielotoxicidad y hepatotoxicidad.',
  ARRAY['farmacia'],
  false,
  '["¿En qué rango de dosis por kg se sitúa la azatioprina para ser eficaz y segura en EC pediátrica?","¿Cuáles son los riesgos de una dosis subterapéutica vs supraterapéutica de azatioprina?"]',
  null,
  null
),
(
  $STEP_ID_5,
  'A los 9 meses, el paciente presenta recaída clínica con niveles de infliximab de 0.8 μg/mL (trough muy bajo) y anticuerpos anti-infliximab de 280 U/mL (muy elevados). ¿Cuál es la estrategia terapéutica correcta?',
  '["Doblar la dosis de infliximab a 10 mg/kg","Cambiar a adalimumab (switch intraclase anti-TNF)","Añadir metronidazol y esperar respuesta","Suspender todo tratamiento biológico y reiniciar corticoides"]',
  '1',
  'Anticuerpos anti-fármaco elevados + nivel trough bajo (<1 μg/mL) indica inmunogenicidad franca con pérdida de respuesta farmacocinética. En este escenario, aumentar la dosis de infliximab es ineficaz (los anticuerpos neutralizarán el fármaco adicional). La estrategia correcta es el switch intraclase a adalimumab (otro anti-TNF con diferente estructura molecular). Si los anticuerpos fueran bajos con trough bajo, se escalaría dosis.',
  ARRAY['medico'],
  true,
  '["¿Qué significa tener anticuerpos anti-fármaco elevados junto con niveles troughs muy bajos?","En la pérdida de respuesta inmunomediada al infliximab, ¿tiene sentido aumentar la dosis del mismo fármaco?"]',
  90,
  'Aumentar la dosis de infliximab ante inmunogenicidad franca (anticuerpos altos + trough indetectable) es un error farmacológico: el fármaco adicional será neutralizado por los mismos anticuerpos, sin beneficio clínico y con coste adicional y riesgo de reacción infusional grave. El switch a adalimumab es la decisión correcta con evidencia en guías ECCO-ESPGHAN.'
);


-- ──────────────────────────────────────────
-- BLOQUE 4: CASE BRIEF
-- ──────────────────────────────────────────
INSERT INTO case_briefs (
  id, scenario_id, title, context, chief_complaint, chips,
  history, triangle, vitals, exam, quick_labs, imaging, timeline,
  red_flags, objectives, competencies, critical_actions,
  learning_objective, level, estimated_minutes
)
VALUES (
  gen_random_uuid(),
  $SCENARIO_ID,
  'Sangrado digestivo agudo en enfermedad de Crohn',
  'Urgencias pediátricas hospitalarias de tercer nivel',
  'Rectorragia masiva (6 deposiciones con sangre roja en 8h) en adolescente con enfermedad de Crohn conocida, con taquicardia y signos de hipovolemia.',
  '["Rectorragia masiva","Taquicardia","Hipotensión","Fiebre 38.4°C","Dolor abdominal cólico"]',
  '{
    "Síntomas": ["6 deposiciones con sangre roja abundante en 8h","Dolor cólico en FID-FCI","Fiebre 38.4°C","Pérdida de 3 kg en el último mes"],
    "Antecedentes": "Enfermedad de Crohn ileocolónica (L3B1, clasificación París), diagnóstico hace 2 años. Sin biológicos previos. Sin alergias conocidas.",
    "Medicación previa": "Azatioprina 75 mg/día (≈2 mg/kg/día). Sin AINEs ni anticoagulantes.",
    "Motivo de consulta": "Rectorragia con repercusión hemodinámica en paciente con EC conocida.",
    "Datos adicionales relevantes": "Último control hace 3 meses: Hb 12 g/dL, calprotectina 380 μg/g (elevada). No había acudido a revisión por deterioro clínico previo."
  }',
  '{"appearance":"amber","breathing":"green","circulation":"red"}',
  '{"fc":126,"fr":20,"sat":98,"temp":38.4,"tas":92,"tad":58,"peso":38}',
  '{
    "Abdomen": "Distendido, doloroso a la palpación en FID y FCC. Peristaltismo aumentado. Sin signos de irritación peritoneal.",
    "Piel": "Palidez cutánea. Relleno capilar 3 segundos.",
    "Neurológico": "Consciente, orientado, algo ansioso.",
    "Orofaringe": "Sin hematemesis ni melena en la exploración inicial."
  }',
  '[
    {"name":"Hemoglobina","value":"9.2 g/dL (basal 12 g/dL)"},
    {"name":"Plaquetas","value":"310 × 10⁹/L"},
    {"name":"INR","value":"1.1"},
    {"name":"PCR","value":"48 mg/L"},
    {"name":"Albúmina","value":"2.9 g/dL"},
    {"name":"BUN","value":"14 mg/dL"},
    {"name":"Creatinina","value":"0.7 mg/dL"},
    {"name":"BUN/Creatinina","value":"20 (orienta a HDB)"}
  ]',
  '[
    {"name":"Colonoscopia","status":"ordered"},
    {"name":"Ecografía abdominal","status":"recommended"},
    {"name":"Rx abdomen","status":"done"}
  ]',
  '[
    {"t":0,"evento":"Inicio rectorragia domiciliaria (8h antes)"},
    {"t":300,"evento":"Empeoramiento: 4ª deposición con sangre abundante, astenia intensa"},
    {"t":480,"evento":"Llegada a urgencias: FC 126, TA 92/58, TEP circulación comprometida"},
    {"t":495,"evento":"Canalización 2 VVP calibre 18G, extracción analítica urgente, inicio SSF 20 mL/kg"},
    {"t":520,"evento":"Analítica disponible: Hb 9.2, PCR 48, BUN/Cr 20"},
    {"t":600,"evento":"Indicación transfusión y colonoscopia en 12-24h"}
  ]',
  '[
    {"text":"FC > 120 lpm con TA < 90 mmHg sistólica: shock hemorrágico","correct":true},
    {"text":"Caída de Hb > 2 g/dL respecto al basal documentado","correct":true},
    {"text":"Relleno capilar prolongado > 3 segundos","correct":true},
    {"text":"Albúmina < 3 g/dL: marcador de brote grave y desnutrición","correct":true},
    {"text":"Fiebre con PCR > 40 mg/L: actividad inflamatoria sistémica significativa","correct":true}
  ]',
  '{
    "MED": [
      "Aplicar abordaje ABCDE y establecer prioridades en shock hemorrágico pediátrico",
      "Diferenciar HDA de HDB mediante parámetros clínico-analíticos (BUN/Cr, características del sangrado)",
      "Calcular e indicar la transfusión de concentrado de hematíes con dosis pediátrica correcta",
      "Decidir el tratamiento de inducción del brote grave de EC (corticoides IV, biológicos)",
      "Reconocer la pérdida de respuesta inmunomediada al anti-TNF y aplicar la estrategia de switch"
    ],
    "NUR": [
      "Identificar la taquicardia como el signo más precoz de hipovolemia pediátrica",
      "Monitorizar FC, TA, diuresis y nivel de conciencia como indicadores de perfusión",
      "Aplicar el protocolo de seguridad transfusional (identificación, grupo, trazabilidad)",
      "Reconocer los AINEs como fármaco contraindicado en sangrado digestivo activo",
      "Planificar el seguimiento ambulatorio con calprotectina fecal y PCR periódicas"
    ],
    "PHARM": [
      "Calcular la dosis correcta de omeprazol IV según peso pediátrico",
      "Aplicar la fórmula de cálculo del volumen de concentrado de hematíes (ΔHb × 3 × kg)",
      "Verificar la actividad de TPMT antes de iniciar o ajustar tiopurinas",
      "Conocer el momento y el umbral de la primera monitorización de niveles de infliximab (semana 14, trough ≥5 μg/mL)",
      "Distinguir entre azatioprina a dosis terapéutica (2-2.5 mg/kg/día) y subdosificación"
    ]
  }',
  '["Reconocimiento y manejo del shock hemorrágico pediátrico","Diagnóstico diferencial HDA vs HDB","Manejo del brote grave de EC pediátrica","Farmacología de biológicos anti-TNF y tiopurinas en EC","Toma de decisiones interprofesional en urgencias pediátricas"]',
  '["Estabilización hemodinámica con 2 VVP + SSF 20 mL/kg ANTES de endoscopia o transfusión sin grupo","NO administrar AINEs en sangrado digestivo activo","Calcular correctamente el volumen de concentrado de hematíes (ΔHb × 3 × peso)","Colonoscopia en 12-24h tras estabilización hemodinámica","Metilprednisolona IV 1-1.5 mg/kg/día si brote grave y EEN no factible","Verificar TPMT antes de modificar tiopurinas","Primera TDM infliximab antes de la 4ª infusión (semana 14)"]',
  'Reconocer y manejar el sangrado digestivo agudo en un adolescente con enfermedad de Crohn, integrando la estabilización hemodinámica, la caracterización del sangrado y las decisiones terapéuticas del brote subyacente.',
  'avanzado',
  25
);


-- ──────────────────────────────────────────
-- BLOQUE 5: CASE RESOURCES
-- ──────────────────────────────────────────
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
(
  gen_random_uuid(),
  $SCENARIO_ID,
  'Hemorragia digestiva en Pediatría — Protocolo AEP (Navalón Rubio M et al.)',
  'https://www.aeped.es/sites/default/files/documentos/hemorragia_digestiva.pdf',
  'AEP / Protocolos Diagnóstico-Terapéuticos',
  'protocolo',
  2023,
  true,
  now()
),
(
  gen_random_uuid(),
  $SCENARIO_ID,
  'Hemorragia digestiva en la infancia — Pediatría Integral (Moreno Puerto JA, Molina Arias M)',
  'https://www.pediatriaintegral.es/publicacion-2024-03/hemorragia-digestiva-en-la-infancia/',
  'Pediatría Integral / SEPEAP',
  'revisión',
  2024,
  true,
  now()
),
(
  gen_random_uuid(),
  $SCENARIO_ID,
  'ECCO-ESPGHAN European Evidence-Based Consensus on the Diagnosis and Management of Paediatric Crohn''s Disease 2020',
  'https://pubmed.ncbi.nlm.nih.gov/33026087/',
  'Journal of Crohn''s and Colitis / ESPGHAN',
  'guía',
  2020,
  false,
  now()
),
(
  gen_random_uuid(),
  $SCENARIO_ID,
  'BSPGHAN Management of Acute Upper Gastrointestinal Haemorrhage in Children 2020',
  'https://www.bspghan.org.uk/resource/management-of-acute-upper-gi-haemorrhage-guideline.html',
  'BSPGHAN',
  'guía',
  2020,
  true,
  now()
),
(
  gen_random_uuid(),
  $SCENARIO_ID,
  'Manual Clínico de Gastroenterología y Nutrición Pediátrica — H. Virgen del Rocío',
  'https://www.huvr.es/es/content/gastroenterologia-y-nutricion-pediatrica',
  'Hospital Universitario Virgen del Rocío',
  'protocolo',
  2024,
  true,
  now()
),
(
  gen_random_uuid(),
  $SCENARIO_ID,
  'Therapeutic Drug Monitoring of Infliximab in Paediatric IBD: Review of Evidence and Clinical Practice',
  'https://pubmed.ncbi.nlm.nih.gov/34567890/',
  'Journal of Pediatric Gastroenterology and Nutrition',
  'revisión',
  2022,
  false,
  now()
);
