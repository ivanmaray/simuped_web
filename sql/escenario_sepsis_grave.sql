-- ============================================================================
-- ESCENARIO SEPSIS GRAVE EN LACTANTE (id=13) - SimuPed
-- Paciente: Hugo, 6 meses, 7.8 kg
-- Autor: Sistema SimuPed
-- Fecha: 2026-04-11
-- ============================================================================
-- BLOQUES DE EJECUCIÓN:
-- 1. UPDATE scenario (estado y configuración)
-- 2. DELETE steps previos (CASCADE borra questions)
-- 3. INSERT steps (obtener $STEP_ID_1 a $STEP_ID_5 del RETURNING)
-- 4. INSERT questions (reemplazar $STEP_ID_N con IDs devueltos)
-- 5. DELETE y INSERT case_brief
-- 6. DELETE y INSERT case_resources
-- ============================================================================

-- BLOQUE 1: Actualizar metadatos del escenario
-- ============================================================================
UPDATE scenarios SET
  status = 'En construcción: en proceso',
  level = 'medio',
  difficulty = 'Intermedio',
  estimated_minutes = 20
WHERE id = 13;

-- BLOQUE 2: Eliminar steps previos (CASCADE elimina questions asociadas)
-- ============================================================================
DELETE FROM steps WHERE scenario_id = 13;

-- BLOQUE 3: Insertar nuevos steps
-- ============================================================================
-- Ejecutar este bloque y guardar los step_ids devueltos en el RETURNING
-- Los IDs se usarán como $STEP_ID_1, $STEP_ID_2, $STEP_ID_3, $STEP_ID_4, $STEP_ID_5
-- ============================================================================

INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  (13, 1, 'Reconocimiento clínico inicial y activación del código sepsis',
   'Hugo, lactante de 6 meses, llega a Urgencias con fiebre de 12 horas, rechazo progresivo de tomas y somnolencia. A la exploración: decaído e irritable, palidez y frialdez de extremidades, relleno capilar >4 segundos. FC 180 lpm, FR 45 rpm, TAS 70 mmHg, SatO2 94%, Glasgow 13. Analítica: leucocitosis, PCR 95 mg/L, PCT 8.5 ng/mL, lactato 4.2 mmol/L. Sin exantema petequial. El equipo debe reconocer sepsis con shock y activar protocolo emergencia.',
   true, ARRAY['medico','enfermeria','farmacia']),

  (13, 2, 'Reanimación hemodinámica inicial e inicio de toma de muestras',
   'Se ha confirmado shock séptico (Phoenix Sepsis Score ≥2 + disfunción cardiovascular). El equipo debe iniciar reanimación con bolo de cristaloide balanceado, establecer acceso vascular seguro y tomar muestras microbiológicas. Monitorización continua de FC, PA, SatO2 y diuresis. Preparar acceso central si no hay respuesta a fluidos en primeros 15 minutos.',
   true, ARRAY['medico','enfermeria','farmacia']),

  (13, 3, 'Antibioterapia empírica precoz y escalada de medidas de soporte',
   'Debe administrarse antibiótico de amplio espectro en <1 hora desde el reconocimiento. Cefotaxima 200 mg/kg/día es la opción para cobertura meningocócica + gram negativos. Si tras 15 min de fluidos persiste hipotensión, iniciar vasopresor (noradrenalina). Considerar dosis de hidrocortisona si refractario. Reevaluar: relleno capilar, diuresis, lactato, frecuencia cardíaca.',
   true, ARRAY['medico','enfermeria','farmacia']),

  (13, 4, 'Evaluación de respuesta y ajuste de soporte vital avanzado',
   'Tras 30-45 minutos: revisar respuesta a fluidos y vasopresor. Si hay mejoría: mantener fluidos, antibiótico, vasopresor según dosis target (TAS ≥65 mmHg, relleno capilar <2s, diuresis >1 mL/kg/h). Si hay deterioro: considerar fallo orgánico múltiple, evaluar necesidad de UCIP, solicitar ecocardiografía para descartar miocarditis, revisar cultivos y respuesta bacteriológica esperada.',
   true, ARRAY['medico','enfermeria','farmacia']),

  (13, 5, 'Preparación para traslado a UCIP y continuidad del cuidado',
   'Hugo requiere ingreso en UCIP: soporte vasopresor activo, disfunción cardiovascular, Glasgow 13, lactato persistente. Comunicación SBAR con UCIP. Pauta de fluidos, dosis actuales de vasopresor, antibiótico administrado, cultivos pendientes, informe de evolución horaria. Coordinar transporte con monitorización continua. Plan de seguimiento de cultivos, escalada de soporte si es necesario, y evaluación de complicaciones (CID, SDRA, fallo renal).',
   true, ARRAY['medico','enfermeria','farmacia'])

RETURNING id AS step_id, step_order;

-- ============================================================================
-- NOTAS ANTES DE EJECUTAR BLOQUE 4:
-- Copia los step_ids del RETURNING anterior y reemplaza:
-- $STEP_ID_1 → id del step_order=1
-- $STEP_ID_2 → id del step_order=2
-- $STEP_ID_3 → id del step_order=3
-- $STEP_ID_4 → id del step_order=4
-- $STEP_ID_5 → id del step_order=5
-- ============================================================================

-- BLOQUE 4: Insertar preguntas (REEMPLAZAR $STEP_ID_N ANTES DE EJECUTAR)
-- ============================================================================

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES

-- ============================================================================
-- PASO 1: RECONOCIMIENTO Y ACTIVACIÓN DEL CÓDIGO SEPSIS
-- ============================================================================

($STEP_ID_1, '¿Cuál es el Phoenix Sepsis Score de Hugo basándose en los parámetros clínicos presentados (comportamiento anómalo, respiración acelerada, oxigenación baja)?',
 '["Phoenix score 0 (sin sepsis)","Phoenix score 2 (sepsis probable)","Phoenix score 1 (sepsis dudosa)","Phoenix score 3 (sepsis confirmada)"]',
 '1',
 'Hugo presenta: (1) comportamiento anómalo (somnolencia, irritabilidad) = 1 punto, (2) frecuencia respiratoria 45 rpm para edad 6 meses (>50% del límite superior) = 1 punto, (3) SatO2 94% en aire ambiente = 1 punto. El Phoenix Sepsis Score ≥2 en contexto de infección sospechada confirma sepsis según criterios 2024 JAMA. Los signos de hipoperfusión (frialdad, relleno capilar >4s, taquicardia extrema FC 180) sugieren shock séptico concomitante.',
 ARRAY['medico'], true, '["Evalúa comportamiento + respiración + oxigenación","Recuerda: Phoenix ≥2 = sepsis; Phoenix ≥2 + disfunción cardiovascular = shock séptico"]', 90,
 'El Phoenix Score <2 demora diagnóstico de sepsis y retrasa intervención crítica. El error causa muerte en lactantes por retraso en antibióticos y fluidos.'),

($STEP_ID_1, '¿Cuál es el mecanismo fisiopatológico de la taquicardia extrema (FC 180 lpm) en Hugo?',
 '["Respuesta simpática compensatoria ante hipotensión y bajo gasto cardíaco","Fiebre aislada sin relación con hipoperfusión","Deshidratación leve por falta de ingesta","Ansiedad del niño durante la exploración"]',
 '0',
 'La taquicardia en shock séptico es mecanismo compensatorio: hipotensión (TAS 70 mmHg = crítica para lactante) → activación simpática → aumento de FC para mantener gasto cardíaco. La vasodilatación distributiva característica de sepsis provoca hipotensión a pesar de taquicardia. La combinación taquicardia + hipotensión + hipoperfusión (frialdad, relleno capilar >4s) es diagnóstica de shock. La fiebre acelera el metabolismo pero no explica la magnitud ni la hipotensión concomitante.',
 ARRAY['medico','enfermeria'], false, '["Piensa en mecanismos de compensación hemodinámica","Recuerda: sepsis = vasodilatación + permeabilidad capilar aumentada"]', 75,
 'No reconocer que la taquicardia es compensación ante hipotensión lleva a no diagnosticar shock y no escalar fluidos/vasopresores.'),

($STEP_ID_1, '¿Cuál es el relleno capilar esperado en shock séptico en fases iniciales?',
 '[">4 segundos (como Hugo)","<2 segundos","Exactamente 3 segundos","Normal 1-1.5 segundos"]',
 '0',
 'En shock séptico hipotensivo con hipoperfusión, el relleno capilar prolongado (>3-4 segundos, Hugo tiene >4s) refleja vasoconstricción compensatoria tardía y flujo tisular reducido. Este es signo de shock descompensado. Relleno capilar >2s = presente hipoperfusión. En fases tardías de shock séptico cálido, el relleno puede ser normal pero la lactacidosis persiste, indicando hipoperfusión celular occult. Hugo requiere fluidos inmediatos.',
 ARRAY['medico','enfermeria'], false, '["Relleno capilar refleja perfusión tisular periférica","Compara con normalidad: <2 segundos"]', 60,
 'Ignorar relleno capilar >2s retrasa diagnóstico de shock y tratamiento.'),

($STEP_ID_1, '¿Cuál es el siguiente paso de atención INMEDIATA después de confirmar shock séptico en Hugo?',
 '["Esperar hemocultivos antes de iniciar antibióticos","Instalar catéter venoso central y administrar bolo de cristaloide 20 mL/kg","Realizar punción lumbar para descartar meningitis","Iniciar antibióticos empíricos sin demora, en paralelo con obtención de muestras"]',
 '1',
 'La secuencia crítica en shock séptico pediátrico es: (1) reconocimiento, (2) acceso vascular de emergencia, (3) bolo de cristaloide balanceado 20 mL/kg (156 mL para Hugo) EN <15 MINUTOS en paralelo con obtención de muestras. Antibiótico DEBE iniciarse en <1h pero no debe retrasar reanimación hemodinámica. La punción lumbar está contraindicada con inestabilidad hemodinámica. Esperar hemocultivos retrasa cobertura y aumenta mortalidad exponencialmente.',
 ARRAY['medico','enfermeria'], true, '["Primera línea: acceso IV + fluidos inmediatos","Reanimación hemodinámica NO debe retrasar obtención de muestras: hazlo en paralelo"]', 90,
 'Esperar hemocultivos o retrasar fluidos causa muerte en lactante con shock séptico. El retraso en fluidos de solo 15 minutos aumenta disfunción orgánica.'),

($STEP_ID_1, '¿Cuál es la dosis exacta de cristaloide balanceado para Hugo (7.8 kg) en reanimación inicial?',
 '["78 mL de cristaloide en bolo único","156 mL de cristaloide infundidos en <15 minutos","234 mL de cristaloide sin límite de tiempo","312 mL limitado a goteo lento"]',
 '1',
 'Bolo de reanimación: 20 mL/kg × 7.8 kg = 156 mL de cristaloide balanceado (solución Ringer lactato o ClNa 0.9%). Debe infundirse EN MENOS DE 15 MINUTOS usando bomba de infusión o jeringa rápida. En lactantes pequeños, usar acceso IV periférico de grueso calibre o línea intraósea de emergencia si no hay acceso IV viable en <1-2 minutos. La Guía SSC 2026 recomienda cristaloide sobre coloide. Tras bolo: reevaluar presión, relleno capilar, diuresis; si persiste hipotensión, preparar vasopresor.',
 ARRAY['medico','enfermeria','farmacia'], true, '["20 mL/kg × peso (kg) = dosis de bolo","En <15 minutos usando bomba o presión manual"]', 90,
 'Dosis incorrecta de fluidos (dosis baja) causa shock persistente. Dosis excesiva sin vasopresor causa edema pulmonar. El cálculo correcto es crítico.'),

($STEP_ID_1, '¿Cuál es la razón clínica por la que NO realizar punción lumbar de entrada en Hugo, a pesar de sospecha de meningitis?',
 '["La meningitis no es frecuente en lactantes","La hipotensión y shock contraindican LP por riesgo de herniación cerebral y empeoramiento hemodinámico","La edad de Hugo (6 meses) es protectora contra meningitis","Los hemocultivos confirman meningitis sin necesidad de LP"]',
 '1',
 'En shock séptico pediátrico con inestabilidad hemodinámica, LA PUNCIÓN LUMBAR ESTÁ CONTRAINDICADA porque: (1) posicionamiento para LP puede comprometer vía aérea en sedación, (2) presión intracraneal elevada en meningitis + hipotensión sistémica causa herniación, (3) retrasa reanimación crítica. Protocolo: reanimar primero, estabilizar presión, DESPUÉS realizar LP cuando presión sistólica sea adecuada (usualmente TAS >65-70 mmHg para edad 6 meses mantenida). Los hemocultivos + PCR/PCT elevadas + meningococcemia presumible justifican cobertura meningocócica (cefotaxima) inmediata. La LP se diferencia 6-12h si es necesaria.',
 ARRAY['medico'], true, '["Shock + sospecha meningitis = contraindica LP inicial","Prioridad: reanimación hemodinámica ANTES que LP"]', 90,
 'Realizar LP en shock séptico causa herniación, muerte súbita o empeoramiento cardiovascular catastrófico.'),

($STEP_ID_1, '¿Cuál es el nivel de lactato de Hugo (4.2 mmol/L) y qué significa clínicamente?',
 '["Normal (<2 mmol/L), sin signos de hipoperfusión","Hiperlactatemia moderada, indicador de hipoperfusión tisular y anaerobiosis celular","Hiperlactatemia leve que mejora solo con fluidoterapia","Elevación por esfuerzo físico del llanto, no por sepsis"]',
 '1',
 'Lactato 4.2 mmol/L en Hugo es HIPERLACTATEMIA (normal <2 mmol/L). Refleja hipoperfusión tisular y metabolismo anaeróbico a nivel celular: mitocondrias con flujo de oxígeno insuficiente dependen de glucólisis anaerobia, acumulan lactato. En shock séptico, hiperlactatemia moderada (>2 y <5 mmol/L) indica shock establecido; >5 es shock grave. Hugo requiere fluidos + vasopresor + antibiótico. La normalización del lactato es marcador de respuesta terapéutica (bajar >10% en 2-3h es buen pronóstico). Hiperlactatemia persistente tras reanimación agresiva sugiere disfunción orgánica severa y necesidad UCIP.',
 ARRAY['medico','enfermeria'], false, '["Lactato >2 mmol/L = hipoperfusión presente","En sepsis: lactato >4 es marcador de gravedad"]', 75,
 'No reconocer hiperlactatemia como evidencia de shock retrasa escalada de soporte vasopresor.'),

($STEP_ID_1, '¿Cuál es el diagnóstico diferencial más probable en Hugo considerando edad, presentación y datos analíticos?',
 '["Gastroenteritis viral deshidratante","Sepsis por Neisseria meningitidis (con o sin meningitis)","Bronquiolitis viral leve","Convulsión febril"]',
 '1',
 'El cuadro clínico de Hugo es altamente sugerente de infección invasiva por Neisseria meningitidis: (1) edad 6 meses (pico incidencia meningococcemia), (2) fiebre + decaimiento progresivo + rechazo de tomas, (3) shock séptico (hipotensión extrema, taquicardia, hipoperfusión), (4) sin exantema petequial visible (presencia no es requisito, ausencia no excluye), (5) analítica con leucocitosis, desviación izquierda, PCR y especialmente PCT 8.5 ng/mL (altamente sugerente de bacteriemia invasiva, no viral), (6) lactato elevado por choque. SSC recomienda cobertura meningocócica (cefotaxima) INMEDIATA incluso sin confirmación. Diferenciales menos probables por clínica de shock establecido.',
 ARRAY['medico'], false, '["Meningococcemia es mortal si no se trata en <1h","Cefotaxima cubre meningitis + meningococcemia"]', 75,
 'No considerar meningococcemia retrasa cobertura antibiótica; >90% mortalidad si no se trata.'),

-- ============================================================================
-- PASO 2: REANIMACIÓN HEMODINÁMICA INICIAL
-- ============================================================================

($STEP_ID_2, '¿Cuál es el volumen total de cristaloide a infundir en Hugo durante la fase de reanimación temprana (primeros 15 minutos)?',
 '["78 mL infundidos lentamente durante 1 hora","156 mL infundidos rápidamente en <15 minutos","234 mL de límite máximo sin vasopresores","312 mL con monitorización central"]',
 '1',
 'Bolo de cristaloide: 20 mL/kg para Hugo (7.8 kg) = 156 mL. Debe infundirse rápidamente EN <15 MINUTOS usando bombas de infusión de alta velocidad, jeringas de presión manual o sistemas de presión. En lactantes, usar catéter IV de calibre grueso (20G o más grueso) o acceso intraóseo. Esta es la PRIMERA DOSIS de reanimación. Si tras 15 min persiste hipotensión (TAS <65 mmHg) y mala perfusión, se administra SEGUNDA DOSIS de fluidos (otro 20 mL/kg) MIENTRAS se prepara vasopresor (noradrenalina). Límite: no exceder 40-60 mL/kg de fluidos sin vasopresor; después requiere vasopresores.',
 ARRAY['medico','enfermeria','farmacia'], true, '["20 mL/kg = bolo estándar pediátrico de sepsis","<15 minutos = crítico para tiempo de respuesta"]', 90,
 'Infundir bolo lentamente o en volumen insuficiente deja shock sin tratar; retraso en fluidos >30 min aumenta mortalidad en 5-10%.'),

($STEP_ID_2, '¿Cuál es el tipo de cristaloide recomendado en Guías SSC 2026 para reanimación de sepsis pediátrica?',
 '["Suero salino 0.9% (hipertónico)","Soluciones cristaloides balanceadas (Ringer lactato, acetato balanceado)","Dextrosa 5% con electrolitos","Coloides (albúmina, dextrano)"]',
 '1',
 'Las Guías Surviving Sepsis Campaign 2026 RECOMIENDAN cristaloides balanceados (solución de Ringer lactato, plasma-Lyte, o soluciones con acetato balanceado) sobre suero salino normal 0.9% en reanimación de sepsis pediátrica. Justificación: cristaloides balanceados reducen acidosis metabólica hipercloreémica y mantienen mejor balance ácido-base. SSN 0.9% es aceptable si cristaloides balanceados no disponibles, pero no es primera línea. Coloides (albúmina, dextrano) NO aportan ventaja de mortalidad en sepsis pediátrica y tienen mayor costo; se reservan para expansión secundaria si hipotensión persiste tras fluidos masivos.',
 ARRAY['medico','farmacia'], false, '["Cristaloides balanceados = primera línea","SSN 0.9% = aceptable pero no óptimo"]', 75,
 'Usar coloides de entrada retrasa soporte cardiovascular efectivo.'),

($STEP_ID_2, '¿Cuál es la presión arterial sistólica target para Hugo (6 meses) durante reanimación de shock séptico?',
 '["TAS >90 mmHg (target de adulto)","TAS >65 mmHg (edad-específica para lactante 6 meses)","TAS >50 mmHg (aceptable en sepsis pediátrica)","TAS >110 mmHg (hipertensión intencional)"]',
 '1',
 'El target de presión arterial sistólica en lactantes (6 meses) en shock séptico es TAS ≥65 mmHg aproximadamente. La SSC 2026 utiliza la fórmula: TAS mínima aceptable ≈ 50 + (2 × edad en años) mmHg. Para Hugo (0.5 años): TAS ≥50 + (2 × 0.5) = 51-65 mmHg. Sin embargo, en sepsis, el target práctico es TAS ≥60-65 mmHg más marcadores periféricos (relleno capilar <2s, diuresis >1 mL/kg/h, lactato que baja). Hugo entra con TAS 70 mmHg que es apenas suficiente; requiere mantener o mejorar con fluidos + vasopresor. Hipotensión persistente TAS <60 indica shock refractario y necesidad UCIP.',
 ARRAY['medico','enfermeria'], false, '["Target TAS 60-65 mmHg en lactante 6 meses","Complementar con relleno capilar y diuresis"]', 75,
 'Target de presión adulta (>90 mmHg) causa sobrecarga en lactante; target muy bajo (<50) permite shock occult.'),

($STEP_ID_2, '¿Cuál es la razón fisiopatológica de que los vasodilatadores (nitroglicerina, nitroprusiato) NO sean primera línea en shock séptico pediátrico?',
 '["Causan bradicardia inaceptable","Empeoran hipotensión en shock vasodilatado; requiere primero reanimación con fluidos y luego vasopresor con inotropía para restaurar presión y perfusión","Están contraindicados por la edad","No tienen efecto en bacterias"]',
 '1',
 'En shock séptico, el problema fisiopatológico es VASODILATACIÓN DISTRIBUTIVA + PERMEABILIDAD CAPILAR AUMENTADA → hipotensión + hipoperfusión a pesar de gasto cardíaco inicial normal o elevado. Administrar vasodilatadores añadidos (nitroglicerina, nitroprusiato) EMPEORA la situación. La terapia correcta es: (1) RESTAURAR volumen intravascular (cristaloide), (2) RESTAURAR vasocontricción y presión (vasopresor como noradrenalina), (3) MEJORAR contractilidad si falla (dobutamina o milrinona en segundo escalón). Nitrodilatadores son útiles en shock cardiogénico con congestión (donde el problema es sobrecarga de volumen + contractilidad baja), no en shock séptico.',
 ARRAY['medico','farmacia'], false, '["Shock séptico = vasodilatación, no hipertensión","NO vasodilatadores; SÍ vasoconstrictores + fluidos"]', 75,
 'Usar vasodilatadores en shock séptico causa colapso hemodinámico y muerte.'),

($STEP_ID_2, '¿Cuánto tiempo debe mantenerse el monitoreo continuo de frecuencia cardíaca, presión arterial y saturación de oxígeno en Hugo tras iniciar reanimación?',
 '["30 minutos, luego cada 6 horas","Continuamente durante toda la reanimación y en UCIP; mínimo cada 15 minutos las primeras 2 horas","Cada hora mientras está en Urgencias","Solo 10 minutos, hasta confirmar que está estable"]',
 '1',
 'En shock séptico pediátrico, el monitoreo DEBE ser CONTINUO (ECG, presión arterial no invasiva/invasiva, SatO2, capnografía si intubado) durante TODA la fase de reanimación aguda (primeras 2-3 horas mínimo) y después cada 15-30 minutos hasta que los parámetros se estabilicen. Hugo requiere: monitor cardíaco continuo, tensiómetro cada 5 minutos (las primeras 2h) o presión invasiva si falla vasopresor, saturación continua, entrada de diuresis horaria, lactato seriado (inicial, 2h, 4h). Esta monitorización guía ajustes de fluidos y dosificación de vasopresor. Fallo en monitorización continua lleva a deterioro desapercibido.',
 ARRAY['medico','enfermeria'], false, '["Shock séptico = monitoreo continuo obligatorio","Primeras 2-3h: cada 15 minutos como mínimo"]', 75,
 'Monitoreo insuficiente permite hipotensión silenciosa y disfunción orgánica progresiva sin detección.'),

($STEP_ID_2, '¿Cuál es el rol de la extracción de muestras microbiológicas y analíticas en el primer minuto de atención a Hugo?',
 '["Esperar a que el equipo de reanimación se estabilice","ANTES de cualquier antibiótico: hemocultivos (2 sets), urocultivo, cultivo de LCR si LP viable, PCR/PCT, lactato, hemograma, coagulación, TP, función renal","Solo hemograma, sin hemocultivos","Diferir hemocultivos hasta UCIP"]',
 '1',
 'En sepsis, ANTES de administrar antibiótico (que se da en <1h pero no debe retrasar reanimación): obtener hemocultivos (2 sets, sitios diferentes preferiblemente periférico + línea si disponible), urocultivo (cateterismo si necesario), cultivo de LCR si LP es viable sin riesgo hemodinámico, PCR cuantitativo, procalcitonina, lactato seriado, hemograma completo, coagulación (TP, TTPA, fibrinógeno) por riesgo CID, creatinina/BUN, transaminasas. Esta batería: (1) guía cobertura antibiótica empírica, (2) permite desescalada cuando se conocen sensibilidades, (3) evalúa complicaciones (CID, fallo renal, hepatotoxicidad), (4) prognóstico con lactato y procalcitonina. Demora en toma de muestras <1 minuto no retrasa fluidos ni antibióticos (se hacen en paralelo); diferir las muestras porque "es urgencia" pierde diagnóstico etiológico y guía terapéutica.',
 ARRAY['medico','enfermeria','farmacia'], false, '["Muestras en paralelo con reanimación, no secuencial","Hemocultivos ANTES de antibiótico siempre que sea posible"]', 75,
 'Omitir hemocultivos pierde diagnóstico etiológico y causa antibioterapia ciega.'),

-- ============================================================================
-- PASO 3: ANTIBIOTERAPIA EMPÍRICA Y ESCALADA TERAPÉUTICA
-- ============================================================================

($STEP_ID_3, '¿Cuál es el antibiótico de primera línea recomendado para cobertura meningocócica en Hugo con shock séptico?',
 '["Ampicilina 50 mg/kg/dosis","Penicilina G benzatina 1.2 millones UI","Cefotaxima 200 mg/kg/día (50 mg/kg/dosis cada 6 horas) IV","Chloramphenicol 25 mg/kg/dosis"]',
 '2',
 'CEFOTAXIMA es la cefalosporina de tercera generación elegida en shock meningocócico + sospecha meningitis porque: (1) penetración excelente en LCR incluso sin inflamación meníngea, (2) cobertura de Neisseria meningitidis, Streptococcus pneumoniae, bacilos gram negativos, (3) dosis: 200 mg/kg/día dividido cada 6h = 50 mg/kg/dosis. Para Hugo 7.8 kg = 390 mg cada 6 horas IV. Alternativamente ceftriaxona (80 mg/kg/día = 40 mg/kg/dosis cada 12h = 312 mg cada 12h para Hugo), pero cefotaxima es frecuentemente preferida en meningitis. La ampicilina sola es INSUFICIENTE para meningococo resistente. Chloramphenicol es obsoleto en pediatría. La administración en <1 hora es CRÍTICA: retraso cada 15 min aumenta mortalidad ~7%.',
 ARRAY['medico','farmacia'], true, '["Cefotaxima 50 mg/kg/dosis IV cada 6 horas","Dosis para Hugo: 390 mg IV cada 6h"]', 90,
 'Cephalosporina incorrecta o dosis baja causa meningococcemia progresiva, muerte en <12h.'),

($STEP_ID_3, '¿Cuál es el cálculo de dosis de cefotaxima para Hugo (7.8 kg) en mg/dosis?',
 '["78 mg cada 6 horas","195 mg cada 6 horas","390 mg cada 6 horas","780 mg cada 6 horas"]',
 '2',
 'Dosis = 50 mg/kg/dosis × 7.8 kg = 390 mg CADA 6 HORAS. En totalización diaria: 390 mg × 4 = 1560 mg/día, que es 200 mg/kg/día (1560 / 7.8 = 200). Esta es la dosis estándar pediátrica para meningitis. Verificar que el fármaco esté disponible en concentración apropiada (ej: 500 mg vial o 1 g vial) y reconstituir según instrucciones. En lactantes, pueden diluirse dosis en volúmenes pequeños (ej: 390 mg en 5-10 mL SSN) e infundir en 20-30 min para evitar sobrecarga de volumen.',
 ARRAY['farmacia','medico'], true, '["50 mg/kg × peso = 390 mg para Hugo","Repetir cada 6 horas IV"]', 90,
 'Dosis insuficiente (<300 mg/dosis) permite resistencia y fallo de cobertura. Dosis excesiva sin ajuste renal causa toxicidad.'),

($STEP_ID_3, '¿Cuándo debe iniciarse cefotaxima en relación a la reanimación hemodinámica?',
 '["Después de completar el bolo de cristaloide (15-30 min), cuando presión se haya normalizado","EN PARALELO con la reanimación: acceso IV → bolo de fluidos Y toma de muestras Y antibiótico SIMULTÁNEAMENTE; objetivo <1 hora desde reconocimiento","Solo después de hemocultivos, que tardan 2-3h en resultados positivos","Diferida 6 horas hasta UCIP"]',
 '1',
 'El antibiótico DEBE INICIARSE EN PARALELO con reanimación hemodinámica, NO secuencial. La secuencia es: reconocimiento de shock → acceso IV grueso/intraóseo EN PARALELO: (1) inicio bolo de cristaloide, (2) obtención de hemocultivos + cultivos, (3) administración de cefotaxima. OBJETIVO TOTAL: <1 hora desde reconocimiento hasta cefotaxima IV. Cada minuto de demora en antibiótico aumenta mortalidad: >1h de retraso eleva mortalidad 4-8% en meningococcemia. Esperar a que presión suba es ERROR CRÍTICO: reanimación sin antibiótico fracasa, y antibiótico sin reanimación fracasa; ambos son necesarios simultaneamente. El tiempo de infusión de cefotaxima (15-30 min) se solapa con fluidoterapia.',
 ARRAY['medico','enfermeria','farmacia'], true, '["Antibiótico en paralelo con fluidos, no después","Objetivo total: <60 minutos desde triage"]', 90,
 'Retraso en antibiótico >1h en meningococcemia causa muerte inevitable; cada 15 min de demora suma 1-2% de mortalidad adicional.'),

($STEP_ID_3, '¿Cuál es la vía de administración indicada para cefotaxima en Hugo?',
 '["Vía oral (si es posible)","Vía intramuscular","Vía IV directa o a través de catéter intraóseo","Vía rectal"]',
 '2',
 'En shock séptico pediátrico, TODOS los antibióticos DEBEN ser IV porque: (1) asegura niveles plasmáticos inmediatos y predecibles, (2) el shock reduce perfusión intestinal (riesgo absorción IM/VO impredecible), (3) permeabilidad de barrera hematoencefálica alterada requiere concentraciones sérica altas para LCR. La vía IV puede ser: catéter IV periférico de grueso calibre (20G o mayor) o acceso intraóseo de emergencia si IV es imposible (lactante pequeño, shock profundo). La IM está CONTRAINDICADA en shock por riesgo de no absorción y hematomas. VO/rectal no tienen lugar en emergencia séptica. Reconstitución cefotaxima: usar SSN 0.9% o agua estéril según presentación; infundir en 20-30 minutos IV.',
 ARRAY['medico','enfermeria','farmacia'], false, '["IV o intraósea, nunca IM en shock","Infundir en 20-30 minutos IV"]', 75,
 'Vía IM/VO en shock causa absorción errática y fallo de cobertura.'),

($STEP_ID_3, '¿Cuál es el criterio para INICIAR noradrenalina como vasopresor en Hugo?',
 '["Hipotensión TAS <50 mmHg sin límite de intentos con fluidos","TAS persistentemente <65-70 mmHg TRAS 20-40 mL/kg de cristaloide EN MENOS DE 30 MINUTOS; iniciar MIENTRAS se prepara segunda dosis de fluidos si no hay mejoría","FC >200 lpm sin causa aparente","Lactato >6 mmol/L aisladamente"]',
 '1',
 'NORADRENALINA es vasopresor de PRIMERA LÍNEA en shock séptico pediátrico (SSC 2026, Consenso SECIP-SEUP). Indicación: persistencia de hipotensión TAS <65-70 mmHg (edad-específica para lactante) TRAS recibir 20-30 mL/kg de cristaloide balanceado. Hugo entra con TAS 70 mmHg (bajo); si no mejora a 75-80+ con primer bolo, iniciarse noradrenalina. Dosis inicial: 0.05-0.1 mcg/kg/min IV, titulando cada 2-5 min hasta TAS objetivo (60-70 mmHg para lactante) + relleno capilar <2s. Para Hugo 7.8 kg: preparar noradrenalina 7.8 mg en 50 mL SSN (156 mcg/mL); inicio 1 mL/h IV = 0.1 mcg/kg/min. Requiere monitorización continua; idealmente línea arterial para titulación exacta.',
 ARRAY['medico','farmacia'], true, '["Vasopresor si TAS <65 mmHg TRAS 20-30 mL/kg fluidos","Dosis: 0.05-0.1 mcg/kg/min inicial, titular"]', 90,
 'Retraso en vasopresor causa shock refractario, disfunción orgánica múltiple y muerte.'),

($STEP_ID_3, '¿Cuál es el cálculo de concentración de noradrenalina para infusión IV en Hugo (7.8 kg)?',
 '["7.8 mg de noradrenalina + 50 mL SSN = 156 mcg/mL; 1 mL/h = 0.1 mcg/kg/min","7.8 mg + 10 mL SSN = 780 mcg/mL; 0.5 mL/h = 0.1 mcg/kg/min","7.8 mg + 100 mL SSN = 78 mcg/mL; 2 mL/h = 0.1 mcg/kg/min","Noradrenalina no se puede diluir, debe inyectarse directamente"]',
 '0',
 'Preparación de noradrenalina para Hugo: (1) obtener 7.8 mg de noradrenalina (disponible como ampollas de 1 mg/mL), (2) diluir en 50 mL de solución salina 0.9% estéril. Concentración final = 7.8 mg / 50 mL = 0.156 mg/mL = 156 mcg/mL. (3) Infundir a 1 mL/h IV mediante bomba de precisión: 1 mL/h × 156 mcg/mL / 60 min = 2.6 mcg/min ≈ 0.33 mcg/kg/min (para 7.8 kg) = dosis aceptable. O ajustar para 0.1 mcg/kg/min: velocidad = 0.1 × 7.8 × 60 / 156 = 0.3 mL/h. La dosis se titula cada 2-5 minutos hacia arriba hasta presión objetivo. Nota: La opción con 10 mL también es viable pero concentración >500 mcg/mL requiere línea central para evitar extravasación; los 50 mL permiten infusión por línea periférica.',
 ARRAY['farmacia','medico'], false, '["Dilución estándar: 7.8 mg en 50 mL = 156 mcg/mL","Calcular dosis basada en peso y efecto deseado"]', 75,
 'Concentración incorrecta causa dosis inadecuada, hipotensión persistente o hipertensión de reacción.'),

($STEP_ID_3, '¿Cuál es la indicación de hidrocortisona en Hugo durante esta fase aguda de shock?',
 '["Rutina en todo shock séptico pediátrico","SOLO si persiste shock REFRACTARIO a fluidos + noradrenalina dosis máxima; entonces considerar 50 mg/kg/dosis IV (390 mg para Hugo) cada 6 horas","Contraindica en lactante por inmunosupresión","Aumenta mortalidad si se usa precozmente"]',
 '1',
 'Hidrocortisona NO es tratamiento de primera línea en shock séptico pediátrico. La Guía SSC 2026 la reserva para SHOCK REFRACTARIO: hipotensión persistente TRAS optimizar fluidos (40-60 mL/kg) + vasopresor máximo (noradrenalina >0.5-1 mcg/kg/min) + inotrópico (dobutamina) DURANTE ≥1 hora. Si aún hay hipotensión, ENTONCES considerar hidrocortisona 50 mg/kg/dosis IV cada 6 horas (Hugo 7.8 kg = 390 mg cada 6h). Justificación: insuficiencia suprarrenal relativa en 5-10% de shock séptico severo. Riesgo: esteroides tempranos PUEDEN aumentar mortalidad por inmunosupresión. Hugo está en fase aguda inicial; NO se indica hidrocortisona YA; se reserva para escalada posterior si hay refractariedad.',
 ARRAY['medico','farmacia'], false, '["Hidrocortisona solo en shock refractario","Dosis: 50 mg/kg/dosis cada 6h si refractario"]', 75,
 'Hidrocortisona temprana retrasa respuesta inmunológica a bacteria; usar solo si shock refractario.'),

-- ============================================================================
-- PASO 4: REEVALUACIÓN Y AJUSTE DE SOPORTE
-- ============================================================================

($STEP_ID_4, '¿Cuáles son los parámetros de evaluación de respuesta a reanimación en Hugo después de 30-45 minutos?',
 '["Solo frecuencia cardíaca","Presión arterial sistólica, relleno capilar, diuresis (mL/kg/h), lactato seriado, temperatura de extremidades, estado de consciencia","Hemocultivos que hayan resultado positivos","Número absoluto de leucocitos"]',
 '1',
 'Evaluación de respuesta tras reanimación (30-45 min): (1) Presión arterial sistólica: ¿mejoró >65-70 mmHg? (2) Relleno capilar: ¿<2 segundos ahora? (3) Diuresis: ¿>1 mL/kg/h? Para Hugo 7.8 kg = >7.8 mL/h esperados. (4) Lactato seriado: ¿bajó >10% de inicial? Hugo inicial 4.2 → esperar <3.8 mmol/L a 2h. (5) Temperatura periférica: ¿menos frialdad distal, más rosado? (6) Glasgow/estado: ¿menos somnolencia, más reactivo? Si TODOS mejoran → respuesta buena, mantener fluidos + antibiótico + vasopresor. Si NO mejoran → pensar: (a) fluidos insuficientes, (b) vasopresor dosis baja, (c) complicación no reconocida (neumotórax, hemorragia, miocarditis, trombosis catéter). Estos marcadores son más sensibles que hemoglobina o presión central.',
 ARRAY['medico','enfermeria'], false, '["Evalúa perfusión, no solo presión","Respuesta = TAS mejor + relleno <2s + diuresis + lactato que baja"]', 75,
 'No reevaluar tras reanimación permite perpetuar shock occult sin detección.'),

($STEP_ID_4, '¿Cuándo se considera que Hugo tiene SHOCK REFRACTARIO y requiere UCIP?',
 '["Tras 30 minutos de tratamiento sin mejoría","Hipotensión TAS <65 mmHg PERSISTENTE tras ≥40 mL/kg fluidos + noradrenalina ≥0.5 mcg/kg/min durante ≥30 min; O cualquier signo de disfunción orgánica múltiple (Glasgow <14, lactato >5, entrada-salida desbalanceada, oliguria)","Cualquier sospecha de shock","Solo si hay parada cardiorrespiratoria"]',
 '1',
 'Shock refractario en pediatría = hipotensión persistente + hipoperfusión TRAS reanimación agresiva: ≥40-60 mL/kg de cristaloide + vasopresor (noradrenalina ≥0.5 mcg/kg/min) DURANTE mínimo 30-60 minutos SIN respuesta hemodinámica. Criterios de refractariedad: TAS aún <65 mmHg, relleno capilar aún >2s, oliguria, lactato >5 mmol/L, o signos de disfunción orgánica (Glasgow <14, INR >1.5 por CID, creatinina >1.5× basal). Hugo, si persiste hipotensión tras fluidos iniciales + antibiótico + vasopresor de dosis moderada, es candidato a UCIP para: escalada a múltiples vasopresores, soporte vasoactivo combinado (noradrenalina + dobutamina + fenilefrina), ecocardiografía urgente, posible ECMO si hay miocarditis concomitante. Criterios UCIP: shock refractario, vasopresor activo, disfunción orgánica, Glasgow <14.',
 ARRAY['medico'], false, '["Shock refractario = hipotensión resistente a fluidos + vasopresor optimizado","Criterio UCIP: vasopresor activo + disfunción"]', 75,
 'No reconocer shock refractario retrasa escalada y condena a muerte.'),

($STEP_ID_4, '¿Cuál es el significado clínico de NORMALIZACIÓN del lactato en Hugo (de 4.2 → <2 mmol/L) después de 4 horas de tratamiento?',
 '["Indica curación completa de sepsis","Marcador de buena perfusión tisular restaurada; sugiere respuesta hemodinámica positiva y posibilidad de egreso en 24h","Significa que se puede suspender antibiótico","Indica que el paciente ya no necesita UCIP"]',
 '1',
 'Normalización del lactato (4.2 → <2 mmol/L en 4h) es MARCADOR PRONÓSTICO EXCELENTE en sepsis pediátrica: significa que la hipoperfusión se ha resuelto, el metabolismo anaeróbico ha cedido, las mitocondrias tienen oxígeno adecuado de nuevo. Reduce mortalidad en 40% comparado con lactato que PERSISTE elevado. Esto sugiere que: (1) fluidos son suficientes, (2) perfusión renal/visceral mejoró, (3) no hay disfunción orgánica severa en progresión. PERO: (1) NO significa curación de sepsis (aún requiere antibiótico completo 7-10 días), (2) NO significa alta del hospital (requiere UCIP mínimo 24-48h si shock fue severo), (3) NO significa suspensión de vasopresor (se weaning gradual cuando estable). Lactato persistentemente ALTO o REBOTE indica shock refractario, miocarditis, o complicación vascular.',
 ARRAY['medico'], false, '["Lactato que normaliza = buen pronóstico pero NO alta del hospital","Sigue antibióticos completos aunque lactato mejore"]', 75,
 'Interpretar normalización de lactato como "curación" y suspender antibióticos causa recidiva séptica y muerte.'),

($STEP_ID_4, '¿Cuál es el siguiente paso si Hugo presenta presión mejorada (TAS 75 mmHg) pero persiste Glasgow 13 y lactato aún 3.2 mmol/L tras 2 horas?',
 '["Dar alta a hospitalización general","Mantener monitorización continua, valorar ecocardiografía urgente para descartar miocarditis/bajo gasto cardíaco, considerar escalada a segunda línea de inotropía (dobutamina 5-10 mcg/kg/min) + continuar vasopresor; planear traslado UCIP porque Glasgow bajo + lactato persistente sugieren disfunción cerebral/hepato-renal","Suspender fluidos porque presión mejoró","Solo esperar cultivos"]',
 '1',
 'Patrón clínico de Hugo: presión que mejora BUT perfusión celular aún deficiente (lactato alto + alteración neurológica = bajo gasto cardíaco + hipoperfusión de SNC). Esto sugiere: (1) shock cardiogénico concomitante (posible miocarditis por meningococo/enterovirus), (2) refractariedad inicial a noradrenalina sola. Acciones: (a) ecocardiografía urgente para evaluar función ventricular (fracción eyección, dilatación), (b) añadir inotropía: dobutamina 5-10 mcg/kg/min IV para mejorar contractilidad + perfusión coronaria, (c) mantener monitorización continua, (d) reevaluar lactato en 2h más, (e) si no mejora → traslado UCIP para soporte avanzado (múltiples vasopresores, posible ECMO). NO dar alta ni suspender vigilancia; riesgo de deterioro súbito muy alto.',
 ARRAY['medico','enfermeria'], false, '["Presión mejorada ≠ perfusión restaurada; evalúa lactato + Glasgow","Lactato persistente + Glasgow bajo = escalada requerida"]', 75,
 'Interpretar mejora de presión como estabilidad sin evaluar órganos vitales causa muerte súbita por shock cardiogénico no reconocido.'),

($STEP_ID_4, '¿Cuál es la dosis inicial de dobutamina si se requiere añadir inotropía en Hugo?',
 '["1 mcg/kg/min","2.5-5 mcg/kg/min IV, titulando hasta mejoría de presión, frecuencia cardíaca y lactato","10 mcg/kg/min desde el inicio","Dobutamina no está indicada en sepsis pediátrica"]',
 '1',
 'Dobutamina es INOTRÓPICO beta-adrenérgico (β1 > β2) indicado en shock séptico con bajo gasto cardíaco (miocarditis, disfunción ventricular ecocardiográfica). Dosis: inicio 2.5-5 mcg/kg/min IV, titulación cada 5-10 min hacia arriba hasta 15-20 mcg/kg/min según respuesta (mejoría de presión, relleno capilar, lactato). Para Hugo 7.8 kg: concentración estándar = 250 mg (dopamina/dobutamina) en 50 mL = 5000 mcg/mL. Dosis 5 mcg/kg/min = 5 × 7.8 = 39 mcg/min. Velocidad infusión = 39 mcg/min / 5000 mcg/mL × 60 = 0.47 mL/h ≈ 0.5 mL/h. Se COMBINA con vasopresor (noradrenalina) para: contractilidad + vasocontricción + presión. Riesgo: taquicardia excesiva, arritmias (monitorizar ECG), aumento consumo O2 miocárdico.',
 ARRAY['farmacia','medico'], false, '["Dobutamina inicio 2.5-5 mcg/kg/min, titular a respuesta","Combinada con vasopresor en shock con bajo gasto"]', 75,
 'Dosis excesiva de dobutamina causa taquicardia refractaria, isquemia miocárdica y arritmias.'),

-- ============================================================================
-- PASO 5: TRASLADO A UCIP Y COMUNICACIÓN
-- ============================================================================

($STEP_ID_5, '¿Cuál es el criterio de INDICACIÓN ABSOLUTA para traslado a UCIP en Hugo?',
 '["Vasopresor activo + shock séptico + disfunción orgánica (Glasgow <14, oliguria, lactato >2, CID, o fallo multiorgánico)","Solo si hay parada cardiorrespiratoria","Solo si lactato es >8 mmol/L","Todos los lactantes con fiebre"]',
 '0',
 'Indicaciones de UCIP pediátrica en sepsis: (1) VASOPRESOR activo (noradrenalina, dobutamina, epinefrina) por >15-30 min sin weaning en vista, (2) Shock séptico confirmado, (3) Disfunción orgánica: Glasgow <14 (Hugo 13), oliguria <0.5 mL/kg/h, lactato persistente >2-3 mmol/L, INR >1.5 (CID), creatinina >1.5× edad basal, hipoxia requiriendo O2 >40%, o signos de disfunción miocárdica. Hugo cumple: vasopresor requerido, Glasgow 13, lactato inicial 4.2 elevado. OBLIGATORIO traslado UCIP. La transferencia debe coordinarse con el médico de UCIP mediante comunicación SBAR, documentando pauta de fluidos/vasopresores, antibiótico administrado, cultivos enviados, estado hemodinámico actual, y complicaciones sospechadas (miocarditis, CID, insuficiencia renal).',
 ARRAY['medico'], false, '["UCIP = vasopresor + disfunción orgánica simultaneamente","Hugo cumple todos los criterios"]', 60,
 'No trasladar a UCIP con vasopresor activo causa muerte en hospital de segundo nivel.'),

($STEP_ID_5, '¿Qué información ESENCIAL debe comunicarse al equipo de UCIP mediante SBAR para Hugo?',
 '["Solo el diagnóstico presuntivo","Situación (código sepsis meningocócico), Antecedentes (edad 6 meses, peso 7.8 kg, fiebre 12h), Balanceo (fluidos ≥20-30 mL/kg, antibiótico cefotaxima dosis/hora, vasopresor noradrenalina dosis actual), Recomendación (traslado inminente, requiere UCIP, considerar ecocardiografía urgente, prepare familia)","Solo resultados de laboratorio","Estado actual de paciente únicamente"]',
 '1',
 'Comunicación SBAR (Situation-Background-Assessment-Recommendation) es protocolo estándar en medicina crítica y urgencias para traspaso de información: (S) Situación: "Lactante 6m con código sepsis meningocócico presumible, shock séptico, Glasgow 13"; (B) Antecedentes: edad, peso 7.8 kg, fiebre 12h desde inicio, sin exantema pero leucocitosis, PCR 95, PCT 8.5 elevados, lactato 4.2; (A) Valoración actual: TAS 70-75 mmHg, relleno capilar 4s, FC 180, FR 45, requiere vasopresor, ha recibido cefotaxima + bolo cristaloide, cultivos tomados; (R) Recomendación: traslado UCIP inmediato, soporte avanzado requerido, considere ecocardiografía para descartar miocarditis, prepare familia para UCIP. Esta estructura evita omisión de información crítica y permite al equipo receptor prepararse adecuadamente.',
 ARRAY['medico','enfermeria'], false, '["SBAR = estructura; toda la información en orden lógico","Comunicación clara reduce errores de traspaso"]', 60,
 'Comunicación pobre causa pérdida de información crítica y demoras en UCIP.'),

($STEP_ID_5, '¿Cuál es el contenido de PAUTA DE FLUIDOS Y VASOPRESORES a documentar antes de traslado UCIP?',
 '["Último tipo de fluido infundido y volumen","Cristaloide tipo (ej: Ringer lactato), volumen total infundido (20-30 mL/kg), última TAS/FC, vasopresor (ej: noradrenalina dosis actual en mcg/kg/min), última diuresis (mL/h y mL/kg/h), lactato inicial y más reciente, Glasgow, temperatura, medicaciones completadas (cefotaxima dosis/hora)","Solo frecuencia cardíaca","Predicción de si mejorará o empeorará"]',
 '1',
 'Documentación de pauta para UCIP DEBE incluir: (1) Cristaloide administrado: tipo (Ringer lactato o similar), volumen total en mL/kg (Hugo: 156 mL = 20 mL/kg), (2) Presión actual: TAS/TAD/TM más reciente, (3) Vasopresor: droga (noradrenalina), concentración (mcg/mL), dosis actual (mcg/kg/min), velocidad infusión (mL/h), (4) Diuresis: último volumen orinado en mL y en mL/kg/h (meta >1 mL/kg/h), (5) Lactato: inicial y últimas mediciones con horarios, (6) Glasgow/PERC: neurológico actual, (7) Antibiótico: droga (cefotaxima), dosis, hora administración, próxima dosis, (8) Cultivos: sitios tomados, hora, resultado esperado. Esta información permite weaning/escalada segura en UCIP sin reinicio de investigación.',
 ARRAY['medico','enfermeria'], false, '["Documenta COMPLETO: tipo/volumen fluidos, vasopresor, diuresis, labs","Permite continuidad segura de cuidado"]', 75,
 'Pauta incompleta causa decisiones erróneas de escalada/reducción de soporte en UCIP.'),

($STEP_ID_5, '¿Cuál es el protocolo de monitorización de complicaciones durante transporte a UCIP?',
 '["Cese de todo monitoreo durante transporte para no retrasar","ECG continuo, saturación O2, presión arterial cada 5-10 min, vigilancia de acceso IV/intraóseo, comunicación bidireccional con UCIP cada 10 min, equipo de reanimación presente, drogas vasoactivas disponibles en jeringa precargada, plan de manejo de deterioro (bradipnea, desaturación, hipotensión súbita) durante transporte","Solo asegurar que paciente esté tumbado","Monitorización mínima para ir rápido"]',
 '1',
 'Transporte de Hugo a UCIP requiere monitorización CONTINUA porque riesgo de deterioro súbito es ALTO: (1) ECG continuo + oximetría, (2) Presión arterial no invasiva cada 5-10 min (idealmente línea arterial si está disponible), (3) vigilancia de catéteres: asegurar acceso IV/intraóseo permeable, sin infiltración, (4) drogas vasoactivas en jeringa precargada lista (noradrenalina, adrenalina, fentanilo) para titulación rápida, (5) equipo de reanimación presente (bolsa ambú, tubo, laringoscopio), (6) comunicación radio/teléfono bidireccional con UCIP cada 5-10 min para actualizar estado y obtener órdenes si hay cambio, (7) plan de escalada: si desaturación → O2/CPAP/intubación; si hipotensión → bolo vasopresor IV; si FC <60 → atropina/adrenalina. El transporte es "fase crítica" donde no hay disponibilidad de equipo avanzado; anticipación es clave.',
 ARRAY['enfermeria','medico'], false, '["Transporte en sepsis = riesgo extremo de deterioro","Monitorización continua, medicaciones disponibles, comunicación activa"]', 75,
 'Transporte sin monitorización causa paro en ambulancia, defunciones evitables.'),

($STEP_ID_5, '¿Cuál es el plan de seguimiento después de traslado a UCIP para descartar y manejar complicaciones de sepsis?',
 '["Solo ver si sobrevive hasta el alta","Cultivos positivos → identificación de microorganismo + sensibilidades (usualmente 24-48h) → desescalada antibiótica; ecocardiografía urgente si hay signos miocarditis (TRV aumentada, FE baja); monitor de CID cada 12h (INR, TTPA, fibrinógeno, D-dímero) si hay sospecha; creatinina y balance de líquidos diarios; valoración de complicaciones (SDRA, nefropatía AKI, hepatotoxicidad); seguimiento de lactato hasta normalización (predice pronóstico)","Esperanza de que no haya más problemas","Medicaciones sin vigilancia"]',
 '1',
 'Plan de seguimiento POST-UCIP en sepsis meningocócica (Hugo): (1) Cultivos microbiológicos: resultados usuales 24-48h; cuando se conozca microorganismo y sensibilidades, desescalar cefotaxima de amplio espectro a cobertura específica (ej: si es meningococo sensible, considerar penicilina G si no hay resistencia), (2) Miocarditis: ecocardiografía urgente si hay sospecha (taquicardia persistente, presión baja refractaria, lactato alto); troponina seriada si disponible; si hay FE baja, considerar milrinona/dobutamina, (3) Complicaciones de coagulación (CID): INR, TTPA, fibrinógeno cada 12h los primeros 3 días; si INR >1.5 + trombopenia + fibrinógeno bajo → transfusión de plasma fresco congelado, (4) Función renal: creatinina basal vs actual; si creatinina >1.5× basal → AKI por sepsis, reducir dosis de nefrotóxicos, (5) Lactato seriado: meta <2 mmol/L; persistencia >5 mmol/L a 24h sugiere mal pronóstico, (6) Antibióticos: cefotaxima 7-10 días total; si meningitis confirmada, 10-14 días. Estos seguimientos estructurados mejoran pronóstico de 40%.',
 ARRAY['medico'], false, '["UCIP = vigilancia diaria de cultivos, ecocardio, coagulación, renal","Desescalada cuando sensibilidades disponibles"]', 75,
 'Ausencia de seguimiento de complicaciones causa recidiva séptica, shock cardiogénico tardío, muerte.'),

-- ============================================================================
-- PREGUNTAS INTERPROFESIONALES Y DE REFUERZO
-- ============================================================================

($STEP_ID_1, '¿Cuál es la razón fisiopatológica de la frialdad y mala perfusión de extremidades en Hugo?',
 '["Fiebre que causa vasoconstricción paradójica","Vasodilatación distributiva central + vasoconstricción compensatoria periférica en sepsis; el flujo preferentemente central deja extremidades hipoperfundidas","Infección local de extremidades","Hipoglucemia severa"]',
 '1',
 'En shock séptico pediátrico (Hugo), la fisiopatología es: (1) endotoxinas bacterianas liberan citoquinas inflamatorias (TNF-α, IL-1, IL-6), (2) éstas causan vasodilatación distributiva en lecho esplácnico + meningeo + muscular, hipoperfusión tisular regional, (3) compensatoriamente, el SNC activa simpatomiméticos: vasoconstricción periférica (extremidades) para mantener presión central, (4) resultado: extremidades FRÍAS y pálidas (vasoconstricción) mientras presión central aún es baja (vasodilatación esplácnica). Éste es patrón típico de "shock séptico hipotensivo en fase fría". Con reanimación hemodinámica y vasopresor, la perfusión periférica mejora (extremidades rosadas y calientes). La frialdad es SIGNO CLÍNICO DE SHOCK que requiere reanimación urgente.',
 ARRAY['medico'], false, '["Shock séptico = vasodilatación central + vasoconstricción periférica","Frialdad indica hipoperfusión: tratar con urgencia"]', 75,
 'No reconocer frialdad como signo de shock retrasa tratamiento crítico.'),

($STEP_ID_2, '¿Cuál es el objetivo de presión arterial MEDIA (PAM) en Hugo durante reanimación?',
 '["PAM >50 mmHg (objetivo adulto)","PAM >45 mmHg (mínimo para perfusión cerebral)","PAM ≥50-55 mmHg estimado para lactante 6 meses, complementado con relleno capilar y diuresis","PAM >100 mmHg"]',
 '2',
 'Presión Arterial Media (PAM = (TAS + 2×TAD) / 3) en reanimación pediátrica: el objetivo es mantener presión de PERFUSIÓN CEREBRAL adecuada. La fórmula clásica es PPC = PAM - PIC (presión intracraneal). En lactante 6 meses sin sospecha de hipertensión intracraneal, PAM ≥45-50 mmHg es aceptable; con disfunción neurológica (Glasgow 13, como Hugo), PAM ≥50-55 mmHg es más prudente para asegurar PPC >40 mmHg (mínimo para viabilidad neuronal). Hugo con TAS 70, TAD estimada 40 (en shock séptico, TAD es típicamente 1/3 de TAS) → PAM ≈ (70 + 80) / 3 = 50 mmHg (borderline). Tras reanimación, meta es PAM ≥55-60 mmHg. La PAM se monitoriza mejor si hay línea arterial invasiva (recomendado en UCIP). Complementar con relleno capilar y diuresis sigue siendo esencial porque una PAM "adecuada" con relleno capilar aún lento sugiere hipoperfusión regional.',
 ARRAY['medico'], false, '["PAM = (TAS + 2TAD)/3","Objetivo lactante sepsis: PAM ≥45-55 mmHg"]', 75,
 'PAM muy baja (<40) causa isquemia cerebral; muy alta (>80) causa hemorragia cerebral en sepsis con disrupción BBB.'),

($STEP_ID_3, '¿Cuál es el patrón de gases arteriales esperado en Hugo dado su lactato 4.2 mmol/L?',
 '["Alcalosis respiratoria","Acidosis METABÓLICA (pH <7.35, HCO3 <18, EB <0) por hiperlactatemia + acidosis relativa de shock","Alcalosis metabólica","pH normal, sin alteración"]',
 '1',
 'Gasometría de Hugo (dato clínico: pH 7.28, HCO3 14, EB -9) confirma ACIDOSIS METABÓLICA MODERADA a severa. Mecanismo: (1) hiperlactatemia 4.2 mmol/L consume buffer (HCO3), (2) acidosis de shock hipoperfusión produce H+ adicional, (3) resultado: pH bajo (7.28 < 7.35 = normal), HCO3 bajo (14 < 18 = bajo normal), EB negativo (-9 = déficit de base importante). La FR 45 rpm es respuesta compensatoria (Kussmaul): hiperventilación intenta "botar" CO2 para retener base, pero insuficiente en acidosis severa. Esta acidosis es PRONÓSTICO NEGATIVO: sugiere hipoperfusión profunda, posible shock prolongado. Tratamiento: reanimación agresiva (fluidos + vasopresor) para restaurar perfusión → lactato baja → acidosis se resuelve. Rara vez requiere buffer (NaHCO3) en pediatría; el foco es hipoperfusión, no acidosis pura.',
 ARRAY['medico'], false, '["Acidosis metabólica en sepsis = hiperperfusión, requiere fluidos + vasopresor","pH bajo + HCO3 bajo = criterio para acelerar tratamiento"]', 75,
 'Tratar acidosis con bicarbonato sin restaurar perfusión perpetúa shock; enfoque es hipoperfusión.'),

($STEP_ID_3, '¿Cuál es la vía de infusión de antibiótico PREFERIDA en Hugo: periférica vs central?',
 '["Solo central para seguridad","IV periférica de calibre grueso (20G+) es aceptable inicialmente si se obtiene rápido (<2 min); central (PLIC/CVC) es preferida en >30 min de tratamiento o si hay múltiples drogas vasoactivas","Solo oral","Intraósea sin IV"]',
 '1',
 'Acceso vascular en sepsis pediátrica: (1) INICIALMENTE: IV periférica de calibre GRUESO (20G o 18G) en miembro superior, obtener en <2 minutos por equipo experimentado. Si falla acceso IV en 2 intentos → cambiar a ACCESO INTRAÓSEO (emergencia) en tibia proximal o húmero proximal. (2) Cefotaxima y bolo cristaloide se administran por IV periférica sin problema. (3) VASOPRESOR (noradrenalina): puede infundirse por IV periférica PERIFÉRICA pero hay riesgo de extravasación → preferida línea central (PLIC = Periphral Line in Central location, o CVC). (4) TIMING de línea central: si en primeros 15-30 min está disponible, pueden colocarse líneas de múltiples lúmenes; sino, esperar a UCIP. Hugo requiere mínimamente IV periférica gruesa o intraósea para reanimación inicial; línea central puede esperarse a UCIP si no hay disponible rápidamente.',
 ARRAY['medico','enfermeria'], false, '["IV periférica gruesa: aceptable inicialmente","Central preferida para vasopresor pero no retrasa tratamiento inicial"]', 75,
 'Perder tiempo buscando línea central cuando IV periférica disponible retrasa antibiótico.'),

($STEP_ID_4, '¿Cuál es el riesgo de HIPOGLUCEMIA en Hugo durante sepsis y cómo evaluarlo?',
 '["No hay riesgo de hipoglucemia en sepsis","Sepsis consume MUCHA glucosa (metabolismo hipermetabólico); lactantes tienen reservas glucógeno limitadas (~4h); riesgo hipoglucemia es REAL, especialmente si está ayuno; evaluar glucemia capilar cada 30 min las primeras 2h, mantener >70 mg/dL, infundir dextrosa 10% si está ayuno/suero inadecuado","Hipoglucemia solo en RN prematuros","Nunca ocurre en sepsis"]',
 '1',
 'Hipoglucemia EN SEPSIS PEDIÁTRICA es complicación frecuente y peligrosa porque: (1) sepsis es estado hipermetabólico (consumo glucosa muy aumentado), (2) lactante tiene reservas de glucógeno hepático limitadas (~50-100 kcal, dura ~4h), (3) Hugo está con rechazo de tomas (último alimento irregular) + sepsis → riesgo bipolar alto. Evaluación: glucemia capilar (dextrostix) BASAL y cada 30 min las primeras 2h, meta >70 mg/dL (idealmente >100 mg/dL). Si glucemia <70 mg/dL → bolo: dextrosa 10% IV 2-5 mL/kg (~15-40 mL para Hugo) × 2-3 min, luego infusión continua dextrosa 10% o 20% en mantenimiento. El mantenimiento de Hugo incluiría: cristaloide + dextrosa (ej: suero Ringer lactato + dextrosa 5%, 0.45% NaCl + dextrosa 5%, o SSN 0.9% si presión baja + dextrosa 5% separada). Hipoglucemia no corregida causa convulsiones, paro cardíaco, muerte.',
 ARRAY['medico','enfermeria','farmacia'], false, '["Hipoglucemia es riesgo real en sepsis pediátrica","Evalúa glucemia cada 30 min; meta >70 mg/dL"]', 75,
 'Omitir control de glucemia en sepsis pediátrica causa convulsión por hipoglucemia.'),

($STEP_ID_4, '¿Cuál es la indicación de ECOCARDIOGRAFÍA en Hugo durante manejo de sepsis?',
 '["Rutina en todos los lactantes con fiebre","URGENTE si persiste lactato elevado + presión baja + vasopresor dosis moderada sin respuesta adecuada; descartar miocarditis, derrame pericárdico, CID valvular, fracción eyección baja","No indicada en sepsis meningocócica","Solo después de 48h de tratamiento"]',
 '1',
 'Ecocardiografía urgente en Hugo SI: (1) lactato persistente >3-4 mmol/L tras reanimación, (2) presión baja refractaria a fluidos + vasopresor inicial, (3) taquicardia persistente extrema FC >200, (4) dilatación cardíaca visible en radiografía. Objetivo de eco: descartar MIOCARDITIS (causa en ~5-10% meningococcemia invasiva), derrame pericárdico, fracción eyección baja, trombo intracardíaco, endocarditis. Si se encuentra miocarditis (FE <50%, dilatación VI): escalada inmediata a soporte combinado (noradrenalina + dobutamina + milrinona), considerar ECMO si FE <30% + shock refractario. La ecocardiografía portátil en UCIP es rápida (5 min) y no requiere traslado. Hugo tiene alto riesgo de miocarditis por meningococcemia; eco no debe retrasarse.',
 ARRAY['medico'], false, '["Ecocardiografía urgente si lactato alto + presión baja refractaria","Detecta miocarditis, guía escalada de soporte"]', 75,
 'No diagnosticar miocarditis concomitante causa shock cardiogénico tardío y muerte.'),

($STEP_ID_5, '¿Cuál es el plan de desescalada de antibióticos cuando se conozcan sensibilidades de cultivos?',
 '["Suspender cefotaxima inmediatamente","Esperar cultivo positivo (24-48h) + antibiograma (48-72h); si es Neisseria meningitidis sensible a penicilina = cambiar a Penicilina G IV 300,000 U/kg/día (dividido q4h); si es sensible a ceftriaxona/cefotaxima = mantener cefalosporina; si hay resistencia = mantener cefotaxima o escalar según resultado. Duración mínima TOTAL: 10 días para meningitis, 7 días para bacteriemia pura","Cambiar a penicilina V oral cuando baje fiebre","Antibióticos indefinidos"]',
 '1',
 'Desescalada de antibióticos en sepsis meningocócica (Hugo): (1) Cultivos positivos usualmente ~24-48h después de toma, (2) Antibiograma (sensibilidades) ~ 48-72h después, (3) Una vez se CONFIRMA Neisseria meningitidis Y sensibilidad a penicilina (meningococo muy sensible usualmente): cambio de cefotaxima (de amplio espectro) a Penicilina G IV sola. Penicilina G dosis para meningitis: 300,000 U/kg/día = 2,340,000 U/día para Hugo 7.8 kg, dividida cada 4h = 585,000 U IV cada 4h. (4) DURACIÓN: mínimo 10 días para meningitis confirmada, 7 días para bacteriemia sin meningitis. (5) Riesgo: resistencia meningocócica a penicilina es RARA (<1%) pero aumenta en algunos países; si hay resistencia, mantener cefalosporina. (6) Ventaja desescalada: penicilina es más específica, menos toxicidad renal, menor costo. Desescalada NO debe retrasarse esperando cultivos negativos; se realiza cuando confirmación + sensibilidades están disponibles.',
 ARRAY['medico','farmacia'], false, '["Desescalada cuando cultivo + antibiograma disponibles (48-72h)","Penicilina G si meningococo sensible; duración 10 días"]', 75,
 'Mantener cefotaxima innecesariamente tras sensibilidades causa toxicidad acumulada.'),

($STEP_ID_2, '¿Cuál es la estrategia de MONITORIZACIÓN DE DIURESIS en Hugo durante reanimación?',
 '["No es importante en sepsis","Meta >1 mL/kg/h (Hugo = >7.8 mL/h); colocar sonda urinaria de drenaje permanente si está en UCIP; registrar cada micción con volumen, color, densidad; oliguria <0.5 mL/kg/h es signo de hipoperfusión renal persistente y criterio para escalada terapéutica","Solo contar pañales","Esperar a que orine naturalmente"]',
 '1',
 'Diuresis es MARCADOR CRÍTICO de perfusión renal en sepsis: (1) META: >1 mL/kg/h, para Hugo = >7.8 mL/h (aproximadamente 60-80 mL/24h). (2) OLIGURIA <0.5 mL/kg/h = hipoperfusión renal, indicador de shock persistente o insuficiencia renal aguda. (3) MONITORIZACIÓN: en UCIP → sonda urinaria de drenaje permanente (catéter Foley); registro cada hora: volumen (mL), aspecto (claro vs oscuro/ematúrico), gravedad específica si disponible. (4) Utilidad: guía reanimación hemodinámica → oliguria persistente a pesar de fluidos + vasopresor = considerar: hipoperfusión sistémica no resuelta, o lesión renal establecida. (5) Patrón esperado en respuesta: oliguria inicial 12-24h del shock → gradualmente >0.5 → 1 → 2+ mL/kg/h a medida que perfusión mejora. Renal recovery suele tardar 5-7 días en sepsis pediátrica. La ausencia de diuresis durante >24h requiere evaluación de AKI (creatinina, balance hídrico total, ultrasound renal).',
 ARRAY['medico','enfermeria'], false, '["Meta diuresis >1 mL/kg/h; oliguria = escalada requerida","Sonda urinaria en UCIP; registro cada hora"]', 75,
 'No monitorizar diuresis permite hipoperfusión renal silenciosa y fallo renal agudo no reconocido.'),

($STEP_ID_1, '¿Cuál es la razón de evaluar PROCALCITONINA (PCT 8.5 ng/mL) en Hugo además de PCR?',
 '["PCR es suficiente; PCT no añade valor","PCT es MARCADOR específico de infección BACTERIANA invasiva (sepsis, bacteriemia); PCT >2 ng/mL altamente sugerente de bacteria invasiva vs viral; PCT 8.5 en Hugo confirma etiología bacteriana probable, guía decisión de antibióticos empíricos, y sirve de baseline para seguimiento (normalización de PCT a <0.5 en 72h es marcador de respuesta)","PCT está contraindicada en lactantes","PCT mide gravedad de inflamación genérica, como PCR"]',
 '1',
 'Procalcitonina (PCT) vs PCR en sepsis pediátrica: (1) PCR (Proteína C Reactiva): marcador de inflamación genérica, BAJA en viral, PUEDE estar elevada en inflamación estéril (quemaduras, trauma), aumenta lentamente (24-48h). (2) PCT (Procalcitonina): ESPECÍFICO para SEPSIS BACTERIANA/INVASIVA, muy BAJO en viral (<0.1), eleva rápido (primeras horas), alcanza pico a 24-48h. Interpretación: PCT <0.1 = muy probable viral; PCT 0.1-0.5 = dudoso; PCT 0.5-2 = probable bacteria; PCT >2 = casi certeza bacteria invasiva (sepsis, bacteriemia). Hugo tiene PCT 8.5 = ALTAMENTE SUGERENTE de meningococcemia/bacteriemia invasiva → justifica cefotaxima inmediata sin esperar a cultivos. Seguimiento: PCT seriada a 24h y 48h; normalización (<0.5) a 48-72h predice respuesta y mejor pronóstico (mortalidad <5%). Persistencia PCT elevada a 72h sugiere fallo terapéutico o complicación (superinfección, foco no drenado).',
 ARRAY['medico'], false, '["PCT >2 = bacteria invasiva probable","PCT seriada: normalización = buen pronóstico"]', 75,
 'No interpretar PCT 8.5 como confirmación de sepsis bacteriana retrasa antibióticos en casos dudosos.'),

-- ============================================================================
-- PREGUNTAS SOBRE COMPLICACIONES Y MANEJO AVANZADO
-- ============================================================================

($STEP_ID_5, '¿Cuál es el riesgo de SÍNDROME DE DIFICULTAD RESPIRATORIA AGUDA (SDRA) en Hugo y cómo prevenirlo?',
 '["Sin riesgo en sepsis meningocócica","Riesgo moderado en shock séptico por lesión pulmonar inducida por citoquinas; prevención: limitar VOLUMEN TOTAL de fluidos a 40-60 mL/kg antes de vasopresor (Hugo ha recibido ~20-30 mL/kg); monitorizar SatO2, FR, trabajo respiratorio; si SatO2 <90% o FR >60 durante reanimación → evaluar radiografía de tórax, considerar CPAP no invasiva o intubación temprana; en UCIP: ventilación lung protective (Vt 6-8 mL/kg, PEEP 5-10)","SDRA es igual a neumonía","No requiere monitorización"]',
 '1',
 'Riesgo de SDRA (Síndrome de Dificultad Respiratoria Aguda) en sepsis meningocócica pediátrica: (1) Mecanismo: endotoxinas lipopolisacáridas LPS + citoquinas (TNF-α, IL-1, IL-6) causan permeabilidad capilar aumentada NO solo sistémica sino también PULMONAR → edema pulmonar no cardiogénico (en esta etapa, función cardíaca puede ser normal). (2) Riesgo aumentado por: sobrecarga hídrica (>60 mL/kg), shock prolongado, ventilación con presiones altas. (3) Prevención: (a) NO administrar fluidos sin límite; usar 20-40 mL/kg de cristaloide, después vasopresor, (b) Monitorizar saturación O2 y FR cada 5 min; meta FR <50 rpm para edad 6 meses, (c) Radiografía de tórax si SatO2 cae o FR sube excesivamente. (4) Signos de SDRA: SatO2 <90% con FiO2 >40%, infiltrados bilaterales en RX, trabajo respiratorio aumentado (retracciones, quejido). (5) Manejo: oxigenoterapia, CPAP/BiPAP no invasiva si disponible, intubación temprana si hay fatiga, ventilación lung-protective (Vt 6-8 mL/kg, PEEP 5-10). Hugo requiere monitorización continua de SatO2.',
 ARRAY['medico','enfermeria'], false, '["SDRA riesgo real en shock meningocócico","Prevención: no exceder 60 mL/kg fluidos sin vasopresor"]', 75,
 'No reconocer SDRA temprano causa hipoxia progresiva, intubación urgente, mal pronóstico.'),

($STEP_ID_4, '¿Cuál es el mecanismo de COAGULACIÓN INTRAVASCULAR DISEMINADA (CID) en Hugo y cómo evaluarla?',
 '["CID no ocurre en sepsis meningocócica","Meningococcemia causa CID: endotoxina LPS + citoquinas activan cascada coagulación, consumo masivo de plaquetas + factores → trombopenia, INR elevado, TTPA prolongado, fibrinógeno bajo, D-dímero alto, hemorragias mucosas/cutáneas. Evaluación: recuento plaquetas (base), INR, TTPA, fibrinógeno, D-dímero basales; repetir cada 12h las primeras 24h. Si hay sospecha CID: transfusión de plasma fresco congelado (PFC) 10-15 mL/kg o crioprecipitado si fibrinógeno <100 mg/dL. Monitorizar sangrado (mucosas, equipos invasivos)","Solo laboratorio crónico","No necesita tratamiento"]',
 '1',
 'Coagulación Intravascular Diseminada (CID) EN MENINGOCOCCEMIA INVASIVA: (1) Prevalencia: ~5-15% de sepsis meningocócica, >90% mortalidad si no tratada. (2) Mecanismo: endotoxina meningocócica (LPS) + TNF-α activan vía extrínseca de coagulación de modo masivo → generación de trombina sin control → consumo de plaquetas, fibrinógeno, factores II/V/VII/X → coagulopatía consumptiva. (3) Manifestaciones: trombopenia (<50,000/μL), coagulopatía (INR >2), fibrinógeno <100 mg/dL, D-dímero muy elevado (>2000 ng/mL). (4) Evaluación BASAL: plaquetas, INR, TTPA, fibrinógeno, D-dímero. Repetir cada 12h × 24h. (5) Score CID: si ≥5 puntos en escala ISTH → probable CID. (6) Tratamiento: NO anticoagulación de rutina (contraindicada); SÍ transfusión de PFC si INR >1.5 (10-15 mL/kg = 78-117 mL para Hugo), crioprecipitado si fibrinógeno <100 (0.2 unidades/kg). Tratamiento fundamental: reanimación del shock (fluidos + vasopresor) porque shock persistente perpetúa CID. (7) Pronóstico: mortalidad CID + meningococcemia es muy alta; requiere UCIP, transfusiones seriadas, monitorización continua.',
 ARRAY['medico','farmacia'], false, '["CID en meningococcemia tiene alta mortalidad","Evalúa INR/TTPA/fibrinógeno/D-dímero basalmente y cada 12h"]', 75,
 'No evaluar CID permite hemorragia silenciosa y muerte por coagulopatía.'),

($STEP_ID_3, '¿Cuál es la contraindicación ABSOLUTA de ANTIINFLAMATORIOS (ibuprofeno, paracetamol excesivo) en Hugo?',
 '["No hay contraindicación; pueden usarse libremente","Acetaminofén (paracetamol) moderado para fiebre es aceptable; PERO ibuprofeno está CONTRAINDICADO porque AINE empeoran hipoperfusión y daño renal en shock séptico por inhibición de prostaglandinas protectoras (vasodilatación renal). En sepsis, control de fiebre es MENOR prioridad que reanimación hemodinámica. Si fiebre muy alta (>40°C), usar acetaminofén, pero enfoque es antibióticos + fluidos + vasopresor.","Paracetamol causa toxicidad hepática en sepsis","Los AINE mejoran pronóstico"]',
 '1',
 'Antiinflamatorios en sepsis pediátrica - CONTRAINDICACIONES: (1) AINE (ibuprofeno, naproxeno) están CONTRAINDICADOS en shock séptico porque inhiben ciclooxigenasa → reducen prostaglandinas E1/I2 → disminuyen flujo renal + vasodilatación mesentérica protectora → empeoran hipoperfusión renal y sistémica. (2) Acetaminofén (paracetamol) en dosis moderadas (15 mg/kg/dosis, máximo 5 dosis/día) es aceptable para control de fiebre; NO está contraindicado. (3) Control de FIEBRE en sepsis es BAJA PRIORIDAD en primera hora; el enfoque es reanimación hemodinámica, antibiótico, vasopresor. Si fiebre es >39.5°C y el paciente está incómodo, acetaminofén es aceptable. (4) Antipirético excesivo (dosis masivas paracetamol) causa hepatotoxicidad acumulativa; evitar. (5) NO aspirina en niños (riesgo Síndrome Reye). Hugo requiere acetaminofén máximo si es necesario, pero NO ibuprofeno.',
 ARRAY['medico','farmacia'], false, '["AINE contraindicados en shock séptico","Acetaminofén moderado aceptable para fiebre"]', 75,
 'Usar ibuprofeno en shock séptico empeora hipoperfusión renal y daño renal agudo.'),

($STEP_ID_2, '¿Cuál es la ventaja de usar SOLUCIONES CRISTALOIDES BALANCEADAS vs SUERO SALINO 0.9% en Hugo?',
 '["No hay diferencia; son equivalentes","Cristaloides balanceados (Ringer lactato, plasma-Lyte) mantienen mejor pH fisiológico (balance iónico: Na+, K+, Cl-, lactato/acetato); SSN 0.9% tiene MUCHO cloro (154 mEq/L vs 140 fisiológico) → causa acidosis hipercloreémica (pH baja, HCO3 baja adicional), mayor tasa de AKI, mayor necesidad de diálisis en pediatría. Hugo ya tiene acidosis metabólica (pH 7.28); usar cristaloide balanceado evita empeorar pH. Guía SSC 2026 recomienda balanceado como primera línea.","SSN 0.9% es más barato y mejor","Cristaloides balanceados causan hipopotasemia"]',
 '1',
 'Cristaloide balanceado vs SSN 0.9% en reanimación séptica pediátrica: (1) SSN 0.9%: concentración Cl- 154 mEq/L (fisiológico es 98-107 mEq/L) → hipercloreemia → causa acidosis metabólica adicional por retención de Cl- e intercambio aniónico en riñón. (2) Impacto en Hugo: ya tiene acidosis (pH 7.28, HCO3 14, EB -9); administrar SSN empeora pH a 7.20-7.25, amplifica disfunción renal. (3) Cristaloides balanceados (Ringer lactato, solución acetato balanceada tipo plasma-Lyte): composición más cercana a plasma: Na+ 130-140, K+ 4-5, Cl- 98-109, lactato/acetato buffer → mantiene mejor pH sin acidosis iatrogénica. (4) Ventajas balanceado: mejor balance ácido-base, menor incidencia AKI, menor necesidad diálisis, mejor pronóstico renal a largo plazo. (5) Costo: cristaloide balanceado es más caro (~2-3× SSN), pero en sepsis pediátrica el beneficio de morbi-mortalidad justifica. (6) Guía SSC 2026 recomienda balanceado PRIMERA LÍNEA en reanimación séptica pediátrica. Hugo debe recibir Ringer lactato o plasma-Lyte, no SSN.',
 ARRAY['medico','farmacia'], false, '["Cristaloide balanceado evita acidosis iatrogénica","SSC 2026 recomienda balanceado en sepsis"]', 75,
 'Usar SSN 0.9% en sepsis con acidosis preexistente empeora pH y pronóstico renal.'),

($STEP_ID_1, '¿Cuál es la interpretación del Glasgow Score de 13 en Hugo en contexto de sepsis?',
 '["Normal para lactante de 6 meses","Ligera alteración neurológica: apertura ocular 3 (respuesta al dolor), respuesta verbal 4 (sonidos/vocalizaciones anómalas), respuesta motora 6 (obedece órdenes/movimiento propositivo); indica DISFUNCIÓN NEUROLÓGICA por encefalopatía séptica (hipoperfusión cerebral + citoquinas neuroinflamatorios); criterio para UCIP, monitorización continua SatO2/FiO2, evitar hipoxia/hipercapnia, reanimación hemodinámica agresiva para restaurar PPC (presión perfusión cerebral)","Glasgow normal es 15; Hugo está en coma","Glasgow 13 no tiene valor en sepsis"]',
 '1',
 'Glasgow Score en Hugo (13) en contexto SEPSIS: (1) Desglose supuesto: Apertura ocular 3 (respuesta al dolor), Respuesta verbal 4 (sonidos anómalos, no palabras), Respuesta motora 6 (movimiento propositivo). Total = 3+4+6 = 13. (2) En lactante 6 meses, Glasgow 13 está ANORMAL (normal es 14-15 para edad). (3) Significado en sepsis: encefalopatía séptica = hipoperfusión cerebral + efecto directo citoquinas (TNF-α, IL-1) en SNC. (4) Interpretación clínica: Hugo tiene DISFUNCIÓN NEUROLÓGICA LEVE-MODERADA, no coma profundo. (5) Implicaciones: requiere UCIP para monitorización continua, evitar hipoxia (SatO2 <90%) que empeora Glasgow, evitar hipercapnia (CO2 >55 mmHg), mantener presión de perfusión cerebral (PPC = PAM - PIC; meta PPC >40 mmHg). (6) Monitorización: Glasgow cada hora hasta estabilización, o cada 2h después. Empeoramiento Glasgow (caída >2 puntos) requiere ecocardiografía urgente para descartar miocarditis + bajo gasto cerebral. Mejora esperada con reanimación (Glasgow sube a 14-15 en 24-48h).',
 ARRAY['medico'], false, '["Glasgow 13 = encefalopatía séptica leve-moderada","Requiere UCIP y vigilancia de PPC"]', 75,
 'Ignorar Glasgow bajo lleva a hipoxia silenciosa y deterioro neurológico no reconocido.'),

($STEP_ID_5, '¿Cuál es el plan de SOPORTE NUTRICIONAL en Hugo durante fase aguda UCIP?',
 '["Nutrición enteral agresiva desde el primer día","Nutrición parenteral/enteral diferida 24-48h hasta que shock se estabilice; prioridad es reanimación, no nutrición. Una vez vasopresor es estable (disminuyendo dosis) y presión normalizada, iniciar nutrición enteral trófica (10-20 mL/kg/día) por sonda nasogástrica; escalar gradualmente según tolerancia (residuo gástrico, distensión). Si intolerancia → nutrición parenteral. Meta calórica es SECUNDARIA en fase aguda.","Inanición completa es benéfica en sepsis","Solo glucosa IV sin proteína"]',
 '1',
 'Nutrición en shock séptico pediátrico AGUDO (Hugo): (1) FASE AGUDA (primeras 24-48h): INANICIÓN INTENCIONAL de nutrición proteica/lipídica porque el metabolismo está alterado (catabolismo extremo, intolerancia GI). Prioridad ABSOLUTA es reanimación hemodinámica, no nutrición. (2) Soporte calórico mínimo: dextrosa IV (glucose en suero IV) para hipoglucemia, pero NO sobrecarga. (3) FASE SUBAGUDA (después 48-72h, cuando shock está controlado, vasopresor en dosis decreciente): iniciar nutrición ENTERAL TRÓFICA (low trophic feeding) 10-20 mL/kg/día por sonda nasogástrica (ej: fórmula adaptada diluida, leche materna si disponible). (4) Escalar gradualmente cada 12-24h según tolerancia: monitorizar residuo gástrico (meta <25% del volumen infundido), distensión abdominal, diarrea. Si intolerancia → revertir a trófica, evaluar motilidad (usar procinéticos si necesario metoclopramida, domperidona). (5) Alternativa si intolerancia GI severa: nutrición parenteral central después 5-7 días. Meta calórica es alcanzada lentamente en sepsis (5-10 días), no acelerado. La sobrealimentación temprana empeora metabolismo anaeróbico y acidosis.',
 ARRAY['medico','enfermeria','farmacia'], false, '["Inanición intencional primeras 24-48h; nutrición enteral trófica después 48-72h","Nutrición secundaria a reanimación en fase aguda"]', 75,
 'Nutrición enteral masiva temprana causa intolerancia, vómito aspiración, infección.'),

($STEP_ID_3, '¿Cuál es el rol de SEDOANALGESIA en Hugo durante reanimación en UCIP?',
 '["Contraindicada en shock séptico","Indicada si se intubaría para manejo de vía aérea o si hay agitación/ansiedad que interfiera con tratamiento; MINíMO: fentanilo 1-2 mcg/kg/dosis IV PRN (cada 1-2h) para analgesia; si requiere sedación: propofol 1-2 mg/kg IV bolo, luego 10-50 mcg/kg/min infusión (SOLO si presión estable), O midazolam 0.05-0.1 mg/kg/dosis IV q2-4h. CUIDADO: sedantes bajan presión → usar con vasopresor optimizado. Meta: MÍNIMA sedación (Richmond Agitation-Sedation Scale -1 a 0 = vigilante-calmo); evitar sedación profunda que impida evaluación neurológica.","Sedación completa es beneficiosa en todos los lactantes","Sin protocolo de sedación"]',
 '1',
 'Sedoanalgesia en sepsis meningocócica pediátrica (Hugo): (1) Indicación: Hugo requiere minimamente analgesia si está intubado o con procedimientos; sedación es SECUNDARIA. (2) Analgesia: fentanilo 1-2 mcg/kg/dosis IV cada 1-2h PRN para reducir disconfort/agitación. No deprime presión tanto como otros opioides. (3) Sedación: SOLO si se va a intubar o agitación refractaria. Opciones: (a) Propofol 1-2 mg/kg bolo IV, luego 10-50 mcg/kg/min infusión (POTENT HIPOTENSIVO → usar solo con vasopresor optimizado). (b) Midazolam 0.05-0.1 mg/kg/dosis IV q2-4h (menos hipotensor que propofol). (4) OBJETIVO: mantener Richmond Agitation-Sedation Scale (RASS) -1 a 0 (vigilante a tranquilo); EVITAR sedación profunda (RASS -2 a -5) que impide evaluación neurológica seriada (Glasgow cambios, reflejos, respuesta a dolor). (5) Monitorización: presión, FC, SatO2 durante/después sedación; tener atropina/vasopresores disponibles. (6) EVITAR: ketamina (aunque mantiene presión, puede causar efectos disociativos anómalos en niños); tiopental (hipotensor extremo en shock).',
 ARRAY['medico','farmacia'], false, '["Sedación mínima en sepsis; fentanilo preferido para analgesia","Evita sedación profunda que impida evaluación neurológica"]', 75,
 'Sedación profunda innecesaria oculta cambios neurológicos y retrasa diagnóstico de complicaciones.'),

($STEP_ID_4, '¿Cuál es el criterio de RESOLUCIÓN DE SHOCK en Hugo para considerar reducción de vasopresor?',
 '["Cuando presión arterial sea >70 mmHg","TAS ≥65-70 mmHg MANTENIDA ≥30 min + relleno capilar <2s + diuresis >1 mL/kg/h + lactato <3 mmol/L + vasopresor dosis decreciente (ej: noradrenalina <0.3 mcg/kg/min); ENTONCES iniciar weaning gradual de vasopresor, reduciendo 10-20% cada 2-4h (si presión se mantiene), o mantener si presión cae. Objetivo: descontinuar vasopresor en 24-72h si evolución favorable.","Presión normal = curación; suspender vasopresor inmediatamente","Vasopresor debe mantenerse indefinidamente"]',
 '1',
 'Weaning (reducción) de vasopresor en shock séptico pediátrico (Hugo): (1) Criterios de ESTABILIDAD hemodinámica: simultáneamente presentes (NO solo uno). (a) Presión: TAS ≥65-70 mmHg MANTENIDA ≥30 min sin fluctuaciones. (b) Relleno capilar: <2 segundos de forma consistente. (c) Diuresis: >1 mL/kg/h (Hugo >7.8 mL/h) de forma sostenida. (d) Lactato: <3 mmol/L (idealmente <2), con tendencia descendente (no meseta). (e) Vasopresor en DOSIS DECRECIENTE: ej: noradrenalina bajó de 0.5 mcg/kg/min inicial a 0.2-0.3 mcg/kg/min actual. (2) Si se cumplen todos: INICIAR WEANING. Técnica: reducir vasopresor 10-20% cada 2-4h (ej: noradrenalina 0.3 → 0.25 → 0.2 → 0.1 mcg/kg/min). Monitorizar presión cada 5 min durante cambio; si cae >10 mmHg → pausar weaning, reintentar en 2-4h. (3) Tiempo: weaning typically 24-48h en sepsis pediátrica respondedora. (4) Indicador mal pronóstico: vasopresor que NO puede reducirse en 48-72h = shock refractario, sugerir miocarditis, CID severa, o infección no controlada.',
 ARRAY['medico','enfermeria'], false, '["Weaning cuando TODOS los criterios presentes, no solo presión","Reducción gradual 10-20% cada 2-4h"]', 75,
 'Reducción rápida o prematura de vasopresor causa shock de reacción; weaning demasiado lento prolonga UCIP innecesariamente.')

;

-- ============================================================================
-- BLOQUE 5: Eliminar y reinsert case_brief
-- ============================================================================

DELETE FROM case_briefs WHERE scenario_id = 13;

INSERT INTO case_briefs (
  id, scenario_id, patient_name, patient_age, patient_weight, chief_complaint,
  triangle, vitals, quick_labs, red_flags, objectives, critical_actions, created_at
)
VALUES (
  gen_random_uuid(), 13,
  'Hugo', '6 meses', 7.8,
  'Fiebre 39.5°C de 12 horas, rechazo progresivo de tomas, somnolencia',
  '{"appearance":"red","breathing":"amber","circulation":"red"}',
  '{"fc":180,"fr":45,"sat":94,"temp":39.2,"tas":70,"tad":40,"peso":7.8,"relleno_capilar":"4 seg","glasgow":13,"frialdad_distal":true}',
  '{"leucocitos":15000,"pcr":95,"pct":8.5,"lactato":4.2,"ph":7.28,"hco3":14,"eb":-9,"plaquetas":120000,"glucosa":92}',
  '["Relleno capilar >4 segundos","Taquicardia extrema FC 180 lpm","SatO2 94% en aire ambiente","Glasgow 13 (encefalopatía)","Frialdad y palidez distal","Hipotensión TAS 70 mmHg crítica para edad","Acidosis metabólica (pH 7.28, EB -9)","Hiperlactatemia 4.2 mmol/L","Leucocitosis con desviación izquierda","PCT 8.5 sugerente de bacteriemia invasiva"]',
  '{"medico":"Reconocer sepsis (Phoenix Score ≥2) + shock séptico (disfunción cardiovascular). Activar código sepsis. Iniciar bolo cristaloide 156 mL en <15 min. Obtener hemocultivos, PCR, PCT, gasometría, coagulación. Iniciar cefotaxima 390 mg IV en <1h. Preparar noradrenalina si hipotensión persiste. Descartar meningitis (no LP si inestable). Reevaluar cada 15 min. Traslado UCIP para escalo de soporte y monitorización avanzada.","enfermeria":"Acceso IV de grueso calibre o intraóseo de emergencia. Monitorización continua: ECG, presión NO invasiva cada 5 min, SatO2 continuo, capnografía si intuba. Administrar bolo rápidamente (bomba o presión manual). Toma de muestras microbiológicas (hemocultivo x2, urocultivo). Registro de entrada/salida de fluidos. Sonda urinaria en UCIP: meta diuresis >1 mL/kg/h (>7.8 mL/h). Colocar alarmas de hipotensión/bradicardia. Comunicación SBAR con UCIP.","farmacia":"Validar prescripción cefotaxima 390 mg IV cada 6h (o ceftriaxona alternativa). Preparar noradrenalina 7.8 mg en 50 mL SSN (concentración 156 mcg/mL) en jeringa precargada. Verificar dosis cristaloide 156 mL (20 mL/kg × 7.8 kg). Asegurar disponibilidad de atropina, adrenalina, fentanilo para emergencias en transporte. Documentar medicaciones administradas, horas, dosis."}',
  '["Activación código sepsis INMEDIATA (Phoenix ≥2 + hipotensión)","Bolo cristaloide 156 mL en <15 minutos","Hemocultivos ANTES de antibiótico (paralelo con reanimación)","Cefotaxima 390 mg IV en <1 hora desde reconocimiento (criterio SSC <1h)","Noradrenalina 0.05-0.1 mcg/kg/min si TAS <65 mmHg tras fluidos","Monitorización continua: ECG, presión cada 5 min, diuresis horaria, lactato seriado","NO realizar punción lumbar si inestabilidad hemodinámica (LP diferida a UCIP estabilizado)","Traslado UCIP: comunicación SBAR, pauta fluidos/vasopresor documentada, cultivos identificados, familia informada"]',
  now()
);

-- ============================================================================
-- BLOQUE 6: Eliminar y reinsert case_resources (BIBLIOGRAFÍA)
-- ============================================================================

DELETE FROM case_resources WHERE scenario_id = 13;

INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), 13,
   'Surviving Sepsis Campaign International Guidelines for the Management of Septic Shock and Sepsis-Associated Organ Dysfunction 2026',
   'https://pubmed.ncbi.nlm.nih.gov/41869844/',
   'SCCM/ESICM/ACCP/ESMID',
   'guía',
   2026,
   false,
   now()),

  (gen_random_uuid(), 13,
   'The Phoenix Sepsis Score: Validation of a New Consensus-Based Pediatric Sepsis Definition in Retrospective Digital Health Data',
   'https://pmc.ncbi.nlm.nih.gov/articles/PMC10900966/',
   'JAMA',
   'artículo',
   2024,
   true,
   now()),

  (gen_random_uuid(), 13,
   'Protocolo de Sepsis (4ª edición) - Sociedad Española de Urgencias Pediátricas',
   'https://seup.org/wp-content/uploads/2024/04/12_Sepsis_4ed.pdf',
   'SEUP',
   'guía',
   2024,
   true,
   now()),

  (gen_random_uuid(), 13,
   'Consenso Español de Shock Séptico en Pediatría - SECIP/SEUP',
   'https://seup.org/pdf_public/pub/consenso_sepsis_shock.pdf',
   'SECIP/SEUP',
   'guía',
   2020,
   true,
   now()),

  (gen_random_uuid(), 13,
   'Severe Sepsis and Septic Shock: A Review of Literature and Updates from the ACCP Evidence-Based Practice Guidelines',
   'https://pubmed.ncbi.nlm.nih.gov/33264437/',
   'Critical Care Medicine',
   'artículo',
   2024,
   false,
   now());

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Ejecución completada. Todos los bloques están listos para ejecutar.
-- Guarda los step_ids del RETURNING del Bloque 3 y reemplazalos en Bloque 4.
