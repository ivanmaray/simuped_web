-- ══════════════════════════════════════════
-- ESCENARIO 26: SÍNDROME HEMOFAGOCÍTICO (HLH) PEDIÁTRICO
-- Caso: Niño de 3 años, 12 días de fiebre, pancitopenia, hiperferritinemia extrema
-- Trigger: VEB. Degranulación CD107a reducida → probable FHL3-5. TPH necesario.
-- MED=17, NUR=16, PHARM=16 | 5 pasos | 39 preguntas | 5 críticas
-- ══════════════════════════════════════════

-- ──────────────────────────────────────────
-- 1. SCENARIO
-- ──────────────────────────────────────────
INSERT INTO scenarios (title, summary, level, difficulty, mode, status, estimated_minutes, max_attempts)
VALUES (
  'Síndrome hemofagocítico pediátrico',
  'Niño de 3 años con 12 días de fiebre alta y deterioro progresivo que no responde a antibióticos. Hepatoesplenomegalia marcada, pancitopenia severa e hiperferritinemia extrema conducen al diagnóstico de linfohistiocitosis hemofagocítica desencadenada por VEB con probable base genética.',
  'avanzado',
  'Avanzado',
  ARRAY['online'],
  'En construcción: en proceso',
  28,
  3
) RETURNING id;
-- ⚠️ Guarda este ID como $SCENARIO_ID

-- ──────────────────────────────────────────
-- 2. STEPS
-- ──────────────────────────────────────────
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  ($SCENARIO_ID, 1, 'Recepción en urgencias', 'Recibir y valorar a un niño de 3 años con fiebre de 12 días de evolución y deterioro progresivo del estado general a pesar de antibioterapia oral. Aplicar el triángulo de evaluación pediátrica y reconocer la combinación de hallazgos clínicos que obliga a sospechar un proceso inflamatorio sistémico grave más allá de una infección convencional.', false, null),
  ($SCENARIO_ID, 2, 'Análisis diagnóstico: criterios HLH-2004', 'Interpretar los resultados analíticos e identificar cuántos criterios diagnósticos del protocolo HLH-2004 cumple el paciente. Decidir el siguiente paso diagnóstico: aspirado de médula ósea, pruebas inmunológicas específicas y necesidad de punción lumbar, sin demorar la actuación clínica.', false, null),
  ($SCENARIO_ID, 3, 'Estudio inmunológico y genético', 'Solicitar e interpretar el estudio inmunológico funcional (perforina, degranulación CD107a, función NK) y decidir la estrategia de estudio genético. Integrar el VEB como agente desencadenante e identificar sus implicaciones terapéuticas específicas.', true, ARRAY['medico','enfermeria','farmacia']),
  ($SCENARIO_ID, 4, 'Inicio del tratamiento específico', 'Iniciar el tratamiento según el protocolo HLH-94/2004: calcular dosis de dexametasona y etopósido para este paciente, aplicar las precauciones de administración necesarias y definir la monitorización de toxicidad. Diferenciar el manejo del síndrome de activación macrofágica (SAM) en enfermedad reumatológica.', true, ARRAY['medico','enfermeria','farmacia']),
  ($SCENARIO_ID, 5, 'Complicaciones, respuesta y planificación del TPH', 'Detectar la aparición de afectación del sistema nervioso central. Evaluar la respuesta al tratamiento e identificar los criterios para indicar el trasplante de progenitores hematopoyéticos (TPH) en formas primarias, refractarias o con afectación neurológica persistente.', true, ARRAY['medico','enfermeria','farmacia'])
RETURNING id;
-- ⚠️ Guarda los IDs como $STEP_ID_1 a $STEP_ID_5

-- ──────────────────────────────────────────
-- 3. QUESTIONS (39 preguntas | MED=17, NUR=16, PHARM=16)
-- ──────────────────────────────────────────
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES

-- ══════════ PASO 1: Recepción en urgencias (6 preguntas) ══════════

-- Q1 | MED | CRÍTICA — reconocimiento HLH
(
  $STEP_ID_1,
  'Niño de 3 años, 12 días de fiebre ≥39°C, hepatoesplenomegalia marcada, petequias y afectación progresiva del estado general a pesar de 7 días de amoxicilina-clavulánico. ¿Cuál es el diagnóstico que no puede demorarse descartar?',
  '["Mononucleosis infecciosa complicada","Leucemia linfoblástica aguda de novo","Síndrome hemofagocítico (HLH)","Sepsis bacteriana con shock incipiente"]',
  '2',
  'La tríada fiebre prolongada + pancitopenia progresiva + hepatoesplenomegalia, con ausencia de respuesta a antibióticos, define el fenotipo clásico del SHF. El retraso diagnóstico es la principal causa de mortalidad evitable: hasta el 50% de las muertes precoces ocurren antes del diagnóstico correcto. La mononucleosis puede ser el trigger del SHF, no un diagnóstico alternativo que descarte el síndrome.',
  ARRAY['medico'],
  true,
  '["Fiebre prolongada + pancitopenia + esplenomegalia + mala respuesta a antibióticos: ¿qué síndrome inflamatorio sistémico pediátrico tiene exactamente este fenotipo?","La mononucleosis puede desencadenar el SHF, no excluirlo"]',
  90,
  'No incluir el SHF en el diagnóstico diferencial conduce a retraso terapéutico y progresión a fallo multiorgánico. Sin tratamiento específico, la mortalidad supera el 90% a corto plazo.'
),

-- Q2 | MED+NUR — clasificación TEP
(
  $STEP_ID_1,
  'Aplicando el triángulo de evaluación pediátrica: el niño está irritable con llanto débil (apariencia alterada), FR 38 rpm sin signos de trabajo respiratorio, y palidez + taquicardia FC 148 lpm (circulación alterada). ¿Cómo se clasifica y qué implica?',
  '["Estable: solo apariencia alterada, observación","Disfunción de órgano diana sin fallo cardiorrespiratorio: requiere actuación urgente pero no es colapso inminente","Fallo cardiorrespiratorio inminente: reanimación inmediata","Parada cardiorrespiratoria compensada"]',
  '1',
  'Dos lados del TEP alterados (apariencia + circulación/piel) sin compromiso respiratorio primario indican disfunción de órgano diana. En el SHF, la anemia severa e inflamación sistémica explican la taquicardia y la palidez. El niño requiere actuación diagnóstica y terapéutica urgente, pero no maniobras de reanimación inmediata.',
  ARRAY['medico','enfermeria'],
  false,
  '["El TEP evalúa tres lados: apariencia, respiración y circulación/piel","Dos lados alterados sin compromiso respiratorio primario = disfunción de órgano diana"]',
  null,
  null
),

-- Q3 | NUR — acceso vascular con trombopenia
(
  $STEP_ID_1,
  'Al canalizar el acceso vascular en este niño con plaquetas 42.000/mm³ y fibrinógeno 118 mg/dL, ¿cuál es la prioridad de enfermería?',
  '["Canalizar vía central femoral de entrada por mayor calibre y fiabilidad","Intentar vía periférica cuando sea posible, aplicar compresión prolongada tras la punción e informar de parámetros de coagulación al médico","Aplicar presión 1 minuto y proceder con normalidad","Esperar corrección de coagulopatía antes de cualquier punción venosa"]',
  '1',
  'Con trombopenia severa y coagulopatía, se prefiere la vía periférica para minimizar el riesgo hemorrágico. La compresión tras la punción debe mantenerse más tiempo del habitual (5-10 min). Se debe comunicar activamente los parámetros de hemostasia al médico para que valore si hay indicación de soporte hemostático previo a procedimientos invasivos. No se debe retrasar el acceso vascular esperando correcciones no decididas aún.',
  ARRAY['enfermeria'],
  false,
  '["Trombopenia <50.000 implica riesgo de sangrado aumentado con cualquier punción","¿Cuál es la vía de menor riesgo hemorrágico?"]',
  null,
  null
),

-- Q4 | MED+NUR+PHARM — marcador de cribado más útil
(
  $STEP_ID_1,
  '¿Qué parámetro analítico urgente tiene mayor valor para orientar precozmente hacia el diagnóstico de HLH en este paciente?',
  '["PCR y procalcitonina","Ferritina sérica","Hemocultivo y urocultivo seriados","Serología VEB IgM e IgG"]',
  '1',
  'La ferritina es el marcador de cribado más accesible y específico del SHF. Valores >500 ng/mL son criterio diagnóstico HLH-2004; >10.000 ng/mL alcanzan 90% de sensibilidad y 96% de especificidad en niños (Allen et al. Pediatr Blood Cancer 2008). La PCR y PCT son inespecíficas. La serología VEB puede identificar el trigger pero no confirma el diagnóstico de SHF ni la necesidad de tratar.',
  ARRAY['medico','enfermeria','farmacia'],
  false,
  '["¿Qué segrega el macrófago activado por IFN-gamma que puede medirse en sangre?","Compara la especificidad de los reactantes de fase aguda habituales con la ferritina en este contexto"]',
  null,
  null
),

-- Q5 | PHARM — revisión medicación al ingreso
(
  $STEP_ID_1,
  'El niño ha recibido amoxicilina-clavulánico oral 7 días e ibuprofeno a demanda (última dosis hace 3 horas). Al revisar el tratamiento en urgencias, ¿qué consideración farmacológica es más urgente?',
  '["Continuar el antibiótico hasta obtener hemocultivos negativos","Suspender el ibuprofeno de inmediato por inhibición de función plaquetaria en el contexto de trombopenia severa","Añadir corticoides sistémicos empíricos a la espera del diagnóstico definitivo","Iniciar profilaxis antifúngica empírica por la pancitopenia"]',
  '1',
  'El ibuprofeno inhibe la función plaquetaria vía COX-1 (inhibición irreversible de tromboxano A2), amplificando el riesgo hemorrágico ya presente por la trombopenia. Debe suspenderse inmediatamente y sustitutirse por paracetamol si hay necesidad antipirética. Iniciar corticoides sin diagnóstico establecido puede enmascarar el cuadro. La profilaxis antifúngica no está indicada de entrada sin neutropenia profunda establecida.',
  ARRAY['farmacia'],
  false,
  '["¿Cuál es el mecanismo de acción del ibuprofeno sobre las plaquetas?","¿Qué antipirético alternativo no tiene efecto antiagregante?"]',
  null,
  null
),

-- Q6 | NUR — signos de alarma de deterioro
(
  $STEP_ID_1,
  '¿Cuál de los siguientes signos, si aparece en urgencias, indica deterioro grave e inmediato que requiere escalada terapéutica urgente?',
  '["Temperatura de 40.2°C","Descenso brusco del nivel de consciencia con irritabilidad extrema o episodio convulsivo","Aparición de exantema maculopapular generalizado","Aumento de la hepatomegalia en la exploración seriada"]',
  '1',
  'El deterioro neurológico brusco en el SHF puede indicar afectación del SNC por infiltración de macrófagos activados o encefalopatía inflamatoria, complicación que ocurre en aproximadamente un tercio de las formas familiares y conlleva secuelas permanentes en el 22% de supervivientes. Requiere valoración urgente con RMN y PL, y escalada del tratamiento. La fiebre alta y el aumento de hepatomegalia son esperables en el curso del SHF.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué complicación neurológica tiene el SHF en ~1/3 de formas familiares?","Piensa en qué complicación puede ser irreversible si se retrasa el diagnóstico"]',
  null,
  null
),

-- ══════════ PASO 2: Criterios diagnósticos HLH-2004 (8 preguntas) ══════════

-- Q7 | MED — diagnóstico diferencial: leishmaniasis
(
  $STEP_ID_2,
  '¿Qué entidad debe descartarse de forma activa con prueba específica en todo paciente pediátrico con sospecha de SHF en España, dado que puede presentar todos los criterios HLH-2004 y tiene tratamiento específico diferente?',
  '["Histiocitosis de células de Langerhans","Leishmaniasis visceral","Linfoma de Hodgkin","Enfermedad de Gaucher"]',
  '1',
  'La leishmaniasis visceral es endémica en la cuenca mediterránea (incluyendo España) y puede cumplir todos los criterios HLH-2004 con presentación indistinguible. Debe buscarse mediante tinción y/o PCR en sangre periférica o médula ósea. A diferencia del HLH idiopático, responde específicamente a anfotericina B liposomal sin necesitar etopósido. Su omisión puede llevar a un tratamiento innecesariamente agresivo o, peor, a no tratar la causa subyacente.',
  ARRAY['medico'],
  false,
  '["¿Qué parásito es prevalente en el Mediterráneo y puede presentar hepatoesplenomegalia + pancitopenia + fiebre?","Este diagnóstico tiene tratamiento específico antiparasitario, ¿cuál?"]',
  null,
  null
),

-- Q8 | MED | CRÍTICA — 5/8 criterios confirmados
(
  $STEP_ID_2,
  'Los resultados disponibles: fiebre ≥38,5°C ✓ | esplenomegalia ✓ | Hb 7,2 g/dL + plaquetas 42.000 + neutrófilos 680/mm³ ✓ | triglicéridos 480 mg/dL + fibrinógeno 118 mg/dL ✓ | ferritina 18.540 ng/mL ✓. sCD25, función NK y médula ósea: pendientes. ¿Cuál es la actitud correcta?',
  '["Esperar los resultados de sCD25 y función NK antes de actuar","Iniciar antibioterapia de amplio espectro y observar 48 horas más","El paciente cumple 5/8 criterios HLH-2004: el diagnóstico está establecido, proceder con aspirado de MO y evaluación para tratamiento","Realizar biopsia hepática para confirmar hemofagocitosis antes de cualquier decisión terapéutica"]',
  '2',
  'El diagnóstico de HLH se establece con ≥5/8 criterios del protocolo HLH-2004 o con confirmación molecular. Este paciente cumple exactamente 5 criterios confirmados. Esperar más resultados retrasa innecesariamente la actuación. El aspirado de MO es importante para el diagnóstico diferencial con neoplasia y para buscar hemofagocitosis, pero no bloquea la toma de decisiones terapéuticas.',
  ARRAY['medico'],
  true,
  '["¿Cuántos criterios HLH-2004 se necesitan para establecer el diagnóstico?","Cuenta: fiebre (1) + esplenomegalia (2) + citopenias en ≥2 líneas (3) + TG elevado y/o fibrinógeno bajo (4) + ferritina >500 (5)"]',
  90,
  'No reconocer que 5 criterios ya establecen el diagnóstico lleva a retraso terapéutico injustificado. La mortalidad del SHF no tratado supera el 90%.'
),

-- Q9 | MED+PHARM — sCD25 soluble
(
  $STEP_ID_2,
  'El resultado de sCD25 (receptor soluble de IL-2) es de 14.800 U/mL. ¿Cómo se interpreta y qué implicación tiene?',
  '["Es un valor inespecífico que no modifica el diagnóstico ni el manejo","Confirma activación linfocitaria intensa (umbral diagnóstico ≥2400 U/mL = criterio 6/8 HLH-2004); niveles muy elevados tienen valor pronóstico negativo","Indica tratamiento con anakinra de inmediato como primera línea","Es criterio diagnóstico solo en formas familiares genéticas"]',
  '1',
  'El sCD25 ≥2400 U/mL es el criterio 6 del HLH-2004 y refleja el grado de activación linfocitaria T (subunidad alfa del receptor de IL-2, liberada por linfocitos activados). Este paciente tiene 6,2 veces el umbral diagnóstico. Aunque no modifica la indicación de tratamiento en este caso (ya hay 5 criterios), confirma actividad inflamatoria máxima y el ratio sCD25/ferritina tiene utilidad para diferenciar formas primarias de secundarias.',
  ARRAY['medico','farmacia'],
  false,
  '["sCD25 ≥2400 U/mL es el criterio 6/8 del HLH-2004","¿Qué célula libera sCD25 y qué indica su nivel en relación con la actividad inflamatoria?"]',
  null,
  null
),

-- Q10 | NUR — preparación aspirado de médula ósea
(
  $STEP_ID_2,
  'En la preparación del aspirado de médula ósea en un niño con trombopenia severa y coagulopatía activa, ¿cuál es la actuación de enfermería prioritaria?',
  '["Administrar vitamina K IV de forma rutinaria antes de todo procedimiento invasivo","Verificar parámetros de coagulación y recuento plaquetario, comunicarlos al médico responsable, y preparar material de hemostasia local antes del procedimiento","Asegurar ayuno de 6 horas como única medida preparatoria específica","Administrar plasma fresco congelado 30 minutos antes de forma sistemática"]',
  '1',
  'Antes del procedimiento invasivo, enfermería debe verificar activamente los parámetros de hemostasia, comunicar valores críticos al médico (plaquetas, TP, fibrinógeno) y tener preparado material de hemostasia local. La decisión de transfundir plasma, plaquetas o crioprecipitados corresponde al médico caso a caso y no es un protocolo automático. El ayuno es necesario si se realiza bajo sedación, pero no es la única consideración.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué parámetros de coagulación son relevantes antes de una punción invasiva?","Piensa en la comunicación interprofesional como parte del cuidado del paciente con diátesis hemorrágica"]',
  null,
  null
),

-- Q11 | MED+NUR — indicación de punción lumbar
(
  $STEP_ID_2,
  '¿Cuándo está indicada la punción lumbar en el contexto del SHF pediátrico?',
  '["Solo si hay signos neurológicos francos como convulsiones o coma establecido","En todos los pacientes al diagnóstico de forma sistemática sin excepción","Cuando hay sospecha clínica de afectación del SNC (irritabilidad marcada, alteración de consciencia, meningismo) o en todas las formas primarias por su alta frecuencia de afectación neurológica (≥1/3)","Solo si la RMN cerebral muestra lesiones focales compatibles"]',
  '2',
  'La afectación del SNC en HLH primario ocurre en ≥1/3 de los casos; en formas secundarias es menos frecuente pero posible. La PL está indicada ante sospecha clínica de afectación neurológica y como parte del estudio de formas primarias. Hallazgos típicos: pleocitosis mononuclear o disociación albúmino-citológica. Puede realizarse antes de la RMN si no hay contraindicación (HTIC, coagulopatía severa).',
  ARRAY['medico','enfermeria'],
  false,
  '["¿Con qué frecuencia afecta el SNC el HLH primario?","¿Cuáles son las contraindicaciones relativas para la punción lumbar en este contexto?"]',
  null,
  null
),

-- Q12 | PHARM — hipertrigliceridemia: implicaciones
(
  $STEP_ID_2,
  'Los triglicéridos del paciente son 480 mg/dL. ¿Qué implicación tiene esto para el soporte nutricional y el manejo farmacológico?',
  '["Iniciar estatinas para reducir los triglicéridos como tratamiento específico","Las emulsiones lipídicas IV deben limitarse o suspenderse si se inicia nutrición parenteral; existe riesgo de pancreatitis con TG >400 mg/dL","Es un dato de laboratorio sin impacto en el manejo inmediato","Requiere dieta estricta sin grasas oral durante 48 horas como medida prioritaria"]',
  '1',
  'La hipertrigliceridemia en HLH es consecuencia de la inhibición de la lipoproteinlipasa por TNFα. Con TG >400 mg/dL el riesgo de pancreatitis aumenta significativamente. Las emulsiones lipídicas IV deben reducirse o suspenderse si se inicia nutrición parenteral. El tratamiento hipolipemiante es inapropiado: la causa es inflamatoria y se resolverá con el tratamiento específico del SHF.',
  ARRAY['farmacia'],
  false,
  '["¿Cuál es el mecanismo de la hipertrigliceridemia en el SHF?","¿Qué riesgo existe al infundir lípidos IV a un paciente con TG ya muy elevados?"]',
  null,
  null
),

-- Q13 | NUR — frecuencia de monitorización
(
  $STEP_ID_2,
  '¿Con qué frecuencia mínima debe monitorizarse el hemograma y la coagulación en un paciente con SHF activo durante las primeras 48 horas de diagnóstico?',
  '["Cada 24 horas es suficiente en ausencia de sangrado activo","Cada 6-12 horas o según el deterioro clínico, dado que el SHF puede progresar en horas","Solo cuando hay signos clínicos de sangrado activo","Una vez al día por la mañana junto con el resto de analítica"]',
  '1',
  'El SHF puede progresar hacia fallo multiorgánico en horas. La coagulopatía por consumo (hipofibrinogenemia, trombopenia) puede empeorar de forma rápida y requerir soporte (transfusiones, plasma fresco, crioprecipitados). En las primeras 48 horas de diagnóstico, la monitorización cada 6-12 horas permite detectar precozmente el empeoramiento analítico antes de que se manifieste clínicamente.',
  ARRAY['enfermeria'],
  false,
  '["¿A qué velocidad puede progresar el SHF no tratado?","En las primeras horas tras el diagnóstico, ¿con qué frecuencia es razonable monitorizar en una enfermedad con potencial de fallo multiorgánico?"]',
  null,
  null
),

-- Q14 | NUR+PHARM — umbrales de transfusión
(
  $STEP_ID_2,
  'El paciente tiene Hb 7,2 g/dL, plaquetas 42.000/mm³, FC 148 lpm, FR 38 rpm. No hay sangrado activo visible. ¿Cuál es la indicación transfusional más adecuada?',
  '["Transfundir concentrado de hematíes de inmediato porque Hb <8 g/dL","Transfundir plaquetas de inmediato porque están por debajo de 50.000/mm³","Evaluar tolerancia clínica de la anemia: en ausencia de signos de descompensación hemodinámica grave, puede diferirse la transfusión de hematíes; las plaquetas profilácticas se reservan para <10.000-20.000 sin sangrado","Administrar plasma fresco congelado para corregir el fibrinógeno bajo como primera medida"]',
  '2',
  'La transfusión de hematíes no se indica por umbral de Hb aislado sino por tolerancia clínica. Con taquicardia por fiebre y anemia, pero sin hipotensión ni hipoperfusión grave, puede considerarse diferir. Las plaquetas profilácticas se transfunden habitualmente con <10.000 (o <20.000 con factores de riesgo), no automáticamente a 42.000 sin sangrado activo. El plasma fresco es una decisión médica específica, no la primera medida.',
  ARRAY['enfermeria','farmacia'],
  false,
  '["¿Cuál es el umbral de plaquetas para transfusión profiláctica en ausencia de sangrado activo?","La anemia y taquicardia están presentes: ¿pero hay signos de descompensación hemodinámica?"]',
  null,
  null
),

-- ══════════ PASO 3: Estudio inmunológico y genético (7 preguntas) ══════════

-- Q15 | MED — citometría de flujo: combinación superior
(
  $STEP_ID_3,
  '¿Qué combinación de técnicas de citometría de flujo es superior al ensayo clásico de citotoxicidad NK para el cribado de HLH primario?',
  '["Subpoblaciones de linfocitos B y T con fenotipo completo","Tinción intracitoplasmática de perforina (cribado FHL2) + ensayo de degranulación CD107a (cribado FHL3-5)","Actividad citolítica NK en ensayo funcional clásico aislado","Cuantificación de células NK y NKT por inmunofenotipo"]',
  '1',
  'La combinación perforina + CD107a es superior al ensayo clásico de función NK en sensibilidad y especificidad para HLH genético (Rubin et al. Blood 2017). La tinción de perforina detecta FHL2 (deficiencia de PRF1); el ensayo de degranulación CD107a detecta FHL3-5 (defectos de exocitosis vesicular: UNC13D, STX11, STXBP2) y otras formas. El ensayo funcional NK puede ser falsamente normal.',
  ARRAY['medico'],
  false,
  '["¿Qué tipo de defecto molecular caracteriza a FHL2 (perforina) frente a FHL3-5 (degranulación)?","¿Qué ensayo tiene mayor sensibilidad y especificidad según la evidencia más reciente?"]',
  null,
  null
),

-- Q16 | MED+PHARM — interpretación resultado citometría
(
  $STEP_ID_3,
  'El resultado de citometría de flujo muestra: perforina en NK normal (65% de expresión) + CD107a degranulación reducida (12%, control >20%). ¿Cuál es la interpretación más probable?',
  '["El resultado descarta HLH primario porque la perforina es normal","Perforina normal descarta FHL2 (PRF1), pero la degranulación reducida es compatible con FHL3 (UNC13D/Munc13-4), FHL4 (STX11) o FHL5 (STXBP2): se requiere estudio genético para confirmación molecular","El resultado es normal y el HLH es seguramente secundario a VEB sin base genética","La reducción de CD107a es inespecífica y puede ignorarse"]',
  '1',
  'La perforina normal descarta FHL2, pero la degranulación reducida de CD107a indica defecto en el proceso de exocitosis vesicular (fusión de gránulos con la membrana), no en el contenido de los gránulos. Esto es compatible con FHL3 (Munc13-4), FHL4 (sintaxina-11) o FHL5 (Munc18-2), que juntos representan el ~50% de los FHL en Europa del Sur. El estudio genético (WES/WGS) es necesario para confirmación.',
  ARRAY['medico','farmacia'],
  false,
  '["La perforina es el contenido de la vesícula; CD107a evalúa el proceso de fusión vesicular con la membrana","¿Qué genes controlan la exocitosis de gránulos citotóxicos además de PRF1?"]',
  null,
  null
),

-- Q17 | MED — estrategia de estudio genético
(
  $STEP_ID_3,
  '¿Qué estrategia de estudio genético es actualmente preferida en la evaluación de un niño con HLH y degranulación alterada en citometría de flujo?',
  '["Panel génico dirigido a los 4 genes FHL (PRF1, UNC13D, STX11, STXBP2) como primera opción por coste","Secuenciación del exoma completo (WES) o del genoma (WGS) como primera opción, por mayor cobertura y capacidad de detectar variantes compuestas o combinadas entre genes","Cariotipo convencional y FISH para descartar neoplasia","Estudio genético solo si hay antecedentes familiares documentados o consanguinidad"]',
  '1',
  'WES/WGS son actualmente preferidos sobre los paneles dirigidos porque: (1) cubren todos los genes conocidos de HLH y variantes aún no descritas, (2) detectan variantes en heterocigosis compuesta o combinaciones entre genes de FHL (hasta el 30% de casos primarios quedan sin diagnóstico molecular con paneles de 4 genes), y (3) el coste-eficacia ha mejorado. El estudio no debe retrasarse esperando criterios adicionales, ya que puede tardar semanas.',
  ARRAY['medico'],
  false,
  '["¿Qué porcentaje de formas primarias sospechadas quedan sin diagnóstico con paneles de solo 4 genes?","¿Qué ventaja tienen WES/WGS sobre un panel dirigido?"]',
  null,
  null
),

-- Q18 | PHARM — biomarcadores CXCL9 e IL-18
(
  $STEP_ID_3,
  '¿Qué aporta la determinación de CXCL9 sérico en el diagnóstico y seguimiento del HLH, comparado con la ferritina?',
  '["CXCL9 es un marcador inespecífico similar a la PCR, sin valor diferencial","CXCL9 es un biomarcador específico del eje IFN-gamma: valores normales pretratamiento son incompatibles con HLH activo, y su normalización se correlaciona con respuesta terapéutica mejor que la ferritina","CXCL9 elevado indica necesidad de iniciar emapalumab de primera línea siempre","CXCL9 solo es útil en HLH primario genético, no en formas secundarias a infección"]',
  '1',
  'CXCL9 es producida por células activadas por IFN-gamma y es un biomarcador altamente sensible y específico de la actividad del HLH, con mejor correlación cinética con la actividad de la enfermedad que la ferritina. Un CXCL9 normal antes del tratamiento hace el diagnóstico de HLH activo muy improbable (Verkamp et al. 2026). Su normalización con tratamiento refleja respuesta al control del eje IFN-gamma. No disponible en todos los centros.',
  ARRAY['farmacia'],
  false,
  '["CXCL9 es inducible por IFN-gamma, la citocina central en la patogenia del HLH","¿Qué implica un CXCL9 absolutamente normal en un paciente con sospecha de HLH activo?"]',
  null,
  null
),

-- Q19 | NUR — comunicación familia sobre estudio genético
(
  $STEP_ID_3,
  'La madre pregunta: "¿Para qué se hace un análisis de ADN si ya saben lo que tiene mi hijo?". ¿Cuál es la respuesta de enfermería más adecuada?',
  '["El estudio genético es obligatorio por protocolo; no precisa explicación específica","El estudio genético permite saber si la enfermedad tiene base hereditaria, lo que cambia el tratamiento definitivo (incluida la necesidad de trasplante), el pronóstico y permite estudiar a los hermanos como posibles donantes o portadores","El estudio genético puede esperar hasta que el niño esté estable; no es urgente","La genética es solo para investigación, no cambia nada en el tratamiento inmediato de su hijo"]',
  '1',
  'La explicación de enfermería debe ser precisa y empática: el estudio genético diferencia formas primarias (defecto permanente que requiere TPH curativo) de secundarias (pueden resolverse con tratamiento), permite valorar a hermanos como posibles donantes de progenitores o como portadores, y orienta el pronóstico a largo plazo. Estas respuestas reducen la ansiedad familiar y mejoran la adherencia al proceso diagnóstico complejo.',
  ARRAY['enfermeria'],
  false,
  '["¿Para qué sirve saber si hay mutación en términos de tratamiento definitivo?","¿Qué implicación tiene para los hermanos del paciente el resultado genético?"]',
  null,
  null
),

-- Q20 | MED+PHARM — VEB y rituximab
(
  $STEP_ID_3,
  'La PCR de VEB en sangre es 45.000 copias/mL. ¿En qué circunstancia estaría indicado añadir rituximab al tratamiento de este HLH asociado a VEB?',
  '["En todos los HLH con VEB positivo, rituximab debe añadirse de primera línea de forma sistemática","Cuando la carga viral de VEB persiste elevada o aumenta a pesar del tratamiento esteroideo, o en HLH-VEB grave con linfocitos B hiperactivados como componente principal del cuadro","Rituximab está contraindicado en HLH porque suprime la inmunidad antiviral residual","Solo en HLH-VEB asociado a linfoma concomitante ya diagnosticado"]',
  '1',
  'Rituximab (anti-CD20) depleta linfocitos B infectados por VEB que actúan como células presentadoras de antígenos, perpetuando la activación T. Está indicado cuando el VEB es el driver activo persistente y la carga viral no desciende con el tratamiento, o en formas graves de EBV-HLH. No se usa de primera línea universal porque no todos los VEB-HLH tienen VEB como driver activo vs. trigger ya resuelto.',
  ARRAY['medico','farmacia'],
  false,
  '["¿Cómo perpetúa el VEB la activación del sistema inmune en el SHF?","¿Qué célula diana destruye el rituximab y por qué es relevante en el VEB-HLH?"]',
  null,
  null
),

-- Q21 | NUR — precauciones de aislamiento VEB activo
(
  $STEP_ID_3,
  '¿Qué precauciones son relevantes durante el ingreso de un niño con HLH y VEB activo en planta de hematología pediátrica?',
  '["Aislamiento de contacto estricto con bata y guantes en absolutamente todas las interacciones","Habitación individual, higiene de manos rigurosa, y evitar contacto cercano con pacientes inmunocomprometidos ingresados en la planta","Mascarilla N95 obligatoria para todo el personal y visitas en todo momento","No hay precauciones especiales: el VEB no se transmite en el entorno hospitalario pediátrico"]',
  '1',
  'El VEB se transmite principalmente por contacto con secreciones orales (saliva). En planta de hematología, donde hay pacientes inmunocomprometidos, la habitación individual y la higiene estricta de manos protegen a otros pacientes vulnerables. No requiere aislamiento estricto de contacto/respiratorio como patógenos de transmisión aérea, pero la separación de pacientes con inmunodeficiencia es prudente.',
  ARRAY['enfermeria'],
  false,
  '["¿Cómo se transmite principalmente el VEB?","¿Qué pacientes del entorno hospitalario son especialmente vulnerables a una infección primaria por VEB?"]',
  null,
  null
),

-- ══════════ PASO 4: Inicio del tratamiento específico (11 preguntas) ══════════

-- Q22 | MED | CRÍTICA — primera línea HLH-94/2004
(
  $STEP_ID_4,
  '¿Cuál es el tratamiento de primera línea estándar para HLH pediátrico según los protocolos HLH-94 y HLH-2004?',
  '["Metilprednisolona 2 mg/kg/día + ciclosporina A desde el inicio","Dexametasona 10 mg/m²/día + etopósido 150 mg/m²/semana IV durante 8 semanas de inducción","Anakinra 4 mg/kg/día SC + dexametasona","Inmunoglobulina IV 1 g/kg × 2 días + dexametasona"]',
  '1',
  'El protocolo HLH-94/2004 establece como columna vertebral dexametasona 10 mg/m²/día (preferida sobre prednisolona por su mayor penetración en el SNC) + etopósido 150 mg/m²/semana durante 8 semanas de inducción, seguido de mantenimiento con descenso de dexametasona y etopósido quincenal hasta el TPH. Este régimen mejoró la supervivencia a 5 años del <10% al 54-62% (Bergsten et al. Blood 2017).',
  ARRAY['medico'],
  true,
  '["La dexametasona tiene ventajas sobre la prednisolona en el SHF, ¿cuál es la principal?","¿Qué citostático introdujo el protocolo HLH-94 y mejoró drásticamente la supervivencia?"]',
  90,
  'Iniciar un tratamiento incorrecto (solo esteroides sin etopósido en HLH primario, o anakinra sin indicación establecida) puede resultar en fallo terapéutico y progresión fatal.'
),

-- Q23 | MED — cálculo dosis dexametasona
(
  $STEP_ID_4,
  'Este niño pesa 14 kg y tiene superficie corporal 0,61 m². ¿Cuál es la dosis diaria correcta de dexametasona y su pauta de administración?',
  '["10 mg/kg/día en dosis única matutina","6,1 mg/día repartidos en 2 dosis cada 12 horas (3,05 mg/12h)","10 mg/día fija independientemente del peso","20 mg/m²/día en dosis única nocturna"]',
  '1',
  'La dosis de dexametasona en HLH es 10 mg/m²/día dividida en 2 administraciones (q12h) para mantener niveles estables. Para SC 0,61 m²: 10 × 0,61 = 6,1 mg/día → 3,05 mg q12h. En protocolos oncohematológicos se usan mg/m², no mg/kg. La dosis única diaria no está recomendada en el protocolo HLH. Los parámetros farmacocinéticos de la dexametasona justifican la pauta q12h para nivel valle constante.',
  ARRAY['medico'],
  false,
  '["¿Cuál es la unidad de dosificación en los protocolos HLH: mg/kg o mg/m²?","Calcula: 10 mg/m² × 0,61 m² = ?"]',
  null,
  null
),

-- Q24 | PHARM | CRÍTICA — etopósido: dosis y ajuste renal
(
  $STEP_ID_4,
  'Para este niño con SC 0,61 m², ¿cuál es la dosis correcta de etopósido y qué ajuste es obligatorio si el ClCr es de 35 mL/min/1,73m²?',
  '["150 mg totales independientemente de la SC; sin ajuste renal necesario en niños","91,5 mg IV (150 mg/m² × 0,61 m²) semanalmente; con ClCr 10-50 mL/min reducir dosis un 25-50%","75 mg/m²/semana como dosis estándar en menores de 5 años por mayor toxicidad","Dosis según peso: 5 mg/kg/semana"]',
  '1',
  'La dosis estándar de etopósido en HLH pediátrico es 150 mg/m²/semana IV. Para SC 0,61 m²: 91,5 mg/dosis. El etopósido tiene excreción renal significativa (~44%): con ClCr 10-50 mL/min reducir 25%; con ClCr <10 mL/min reducir 50%. Sin ajuste renal en insuficiencia, la mielotoxicidad acumulada puede ser grave e irreversible en el tiempo esperado, con prolongación del nadir.',
  ARRAY['farmacia'],
  true,
  '["La dosis de etopósido en HLH es 150 mg/m²/semana, nunca mg/kg","¿Cuál es la vía de eliminación predominante del etopósido y qué implica en insuficiencia renal?"]',
  90,
  'Un error de dosis de etopósido (sobredosis: mielotoxicidad grave; subdosis: ineficacia terapéutica) es una fuente frecuente de error en HLH. El ajuste renal obligatorio es omitido con frecuencia con consecuencias potencialmente fatales.'
),

-- Q25 | PHARM — toxicidad etopósido: qué monitorizar
(
  $STEP_ID_4,
  '¿Cuáles son los principales parámetros a monitorizar durante el tratamiento con etopósido en este paciente con HLH?',
  '["Solo hemograma semanal porque el resto de órganos no se afectan","Hemograma (nadir mielotóxico días 7-14), función renal, enzimas hepáticas, mucositis, y signos de infección oportunista","Únicamente función renal y hepática, ya que la pancitopenia basal impide valorar el hemograma","Niveles plasmáticos de etopósido en cada ciclo como estándar de práctica"]',
  '1',
  'El etopósido causa mielotoxicidad (nadir días 7-14 tras cada dosis), hepatotoxicidad (transaminasas), mucositis y aumenta el riesgo infeccioso por inmunosupresión adicional. En HLH ya existe pancitopenia basal, lo que dificulta diferenciar toxicidad del fármaco vs. actividad de la enfermedad; la monitorización debe ser especialmente minuciosa y frecuente. Los niveles plasmáticos no se usan rutinariamente.',
  ARRAY['farmacia'],
  false,
  '["¿Cuál es el mecanismo de acción del etopósido y qué órganos afecta principalmente?","Nadir = mínimo del recuento sanguíneo post-quimioterapia: ¿cuándo ocurre con etopósido?"]',
  null,
  null
),

-- Q26 | NUR | CRÍTICA — administración segura etopósido
(
  $STEP_ID_4,
  'Al preparar y administrar la infusión de etopósido, ¿cuál de las siguientes afirmaciones es CORRECTA y su incumplimiento puede causar daño grave?',
  '["Puede administrarse en bolo IV rápido (5 minutos) para minimizar el tiempo de exposición del paciente","Debe infundirse diluido en SF o SG5% a concentración ≤0,4 mg/mL durante mínimo 30-60 minutos para evitar hipotensión grave","Es un fármaco no vesicante, puede extravasarse sin consecuencias significativas","Puede mezclarse en la misma vía con la dexametasona para simplificar la administración"]',
  '1',
  'El etopósido debe infundirse lentamente (≥30 min, idealmente 60 min) diluido a ≤0,4 mg/mL para evitar hipotensión grave, broncoespasmo y reacciones anafilácticas que se producen con la infusión rápida. Requiere vía exclusiva durante la administración. Es un citostático que requiere EPI adecuado al manipularlo (riesgo de exposición). Su extravasación puede causar daño tisular local.',
  ARRAY['enfermeria'],
  true,
  '["¿Qué reacción adversa grave puede ocurrir si el etopósido se infunde demasiado rápido?","¿Cuál es la concentración máxima recomendada para infusión IV del etopósido?"]',
  90,
  'La infusión rápida de etopósido puede causar hipotensión grave, broncoespasmo y colapso cardiovascular. Este error de administración es evitable y puede ser mortal en un paciente ya hemodinámicamente comprometido.'
),

-- Q27 | MED — SAM vs HLH primario: diferencia en primera línea
(
  $STEP_ID_4,
  'Si este niño tuviera diagnóstico previo de artritis idiopática juvenil sistémica (AIJs) y el HLH se presentara como síndrome de activación macrofágica (SAM), ¿qué cambiaría en la primera línea de tratamiento?',
  '["Nada: el tratamiento es idéntico al HLH primario (dexametasona + etopósido)","En SAM la primera línea es corticoides a dosis altas ± ciclosporina A; anakinra como segunda línea; etopósido se reserva para casos refractarios graves","Se iniciaría anakinra como primera línea en todos los SAM sin necesidad de corticoides","Solo se trataría la enfermedad reumatológica subyacente y el SAM se resolvería espontáneamente"]',
  '1',
  'El SAM es el HLH en contexto de enfermedad reumatológica (especialmente sJIA/AIJs). Su fisiopatología tiene mayor protagonismo de IL-1 e IL-18 (menos de IFN-gamma puro que en fHLH). Primera línea: corticoides a dosis altas ± ciclosporina A. Segunda línea: anakinra (anti-IL-1), más eficaz en SAM que en HLH clásico. El etopósido se reserva para SAM muy grave o refractario, no es tratamiento de entrada.',
  ARRAY['medico'],
  false,
  '["¿Cuál es la citocina más importante en el SAM comparado con el HLH primario?","¿Por qué anakinra puede ser más eficaz en SAM que en HLH clásico?"]',
  null,
  null
),

-- Q28 | PHARM — ciclosporina A: monitorización
(
  $STEP_ID_4,
  '¿Qué parámetros deben monitorizarse al añadir ciclosporina A al tratamiento de HLH y cuáles son los rangos terapéuticos en este contexto?',
  '["Solo tensión arterial; la nefrotoxicidad es rara en niños y no requiere monitorización analítica","Niveles valle (C0 objetivo 100-200 ng/mL en HLH), función renal, electrolitos (hiperpotasemia, hipomagnesemia) y tensión arterial","Solo niveles si hay signos clínicos de toxicidad; rutinariamente no es necesario determinarlos","Los niveles de CsA en HLH son los mismos que en trasplante renal (200-350 ng/mL)"]',
  '1',
  'La CsA en HLH requiere: niveles valle C0 objetivo 100-200 ng/mL (distintos del trasplante sólido), función renal (nefrotoxicidad dosis-dependiente por vasoconstricción arteriola aferente), electrolitos (hiperpotasemia e hipomagnesemia frecuentes), y tensión arterial (hipertensión por vasoconstricción). Las interacciones son extensas (inhibidores/inductores CYP3A4): azoles, macrolídos, rifampicina.',
  ARRAY['farmacia'],
  false,
  '["¿Cuál es el mecanismo principal de nefrotoxicidad de la ciclosporina?","¿Son los mismos niveles terapéuticos en HLH que en trasplante de órgano sólido?"]',
  null,
  null
),

-- Q29 | NUR — monitorización dexametasona en niño pequeño
(
  $STEP_ID_4,
  'En la monitorización de un niño de 3 años con dexametasona a 10 mg/m²/día, ¿cuál de los siguientes efectos adversos requiere vigilancia más urgente en las primeras 72 horas?',
  '["Acné y estrías cutáneas","Hipertensión arterial e hiperglucemia, con riesgo de cetoacidosis esteroidea","Pérdida ponderal progresiva","Osteoporosis a largo plazo"]',
  '1',
  'La dexametasona a altas dosis causa hiperglucemia (frecuente en niños pequeños por menor reserva insulínica) e hipertensión arterial desde las primeras horas-días. La hiperglucemia severa puede requerir insulina. La hipertensión muy elevada puede causar daño orgánico agudo. Glucemia y TA deben monitorizarse cada 4-6 horas en las primeras 48-72 horas. Las complicaciones crónicas son menos relevantes en el contexto agudo.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué efectos metabólicos agudos producen los corticoides sistémicos a dosis altas?","¿Con qué frecuencia deben medirse glucemia y TA con dexametasona a dosis de inducción?"]',
  null,
  null
),

-- Q30 | MED+PHARM — emapalumab: indicación y mecanismo
(
  $STEP_ID_4,
  '¿En qué situación clínica está aprobado el emapalumab y cuál es su mecanismo de acción?',
  '["Como primera línea en todos los HLH pediátricos primarios por ser más selectivo que el etopósido","Para HLH primario pediátrico refractario, recidivante o con progresión a pesar del tratamiento convencional; bloquea directamente el IFN-gamma","Solo para SAM en enfermedad reumatológica en pacientes con respuesta insuficiente a anakinra","Para adultos con HLH refractario; no aprobado en pediatría"]',
  '1',
  'Emapalumab (anti-IFN-gamma monoclonal) está aprobado por FDA (2018) para HLH primario pediátrico refractario, recidivante o con intolerancia al tratamiento convencional. Estudios fase II (Locatelli et al. NEJM 2020) mostraron respuesta del 63% como puente al TPH. Bloquea directamente el IFN-gamma, la citocina central en la patogenia del HLH. No reemplaza la primera línea en debut.',
  ARRAY['medico','farmacia'],
  false,
  '["¿Cuál es la diana terapéutica del emapalumab y por qué es relevante en el HLH?","¿En qué tipo de HLH y en qué circunstancia está aprobado su uso?"]',
  null,
  null
),

-- Q31 | NUR — mucositis por etopósido
(
  $STEP_ID_4,
  '¿Qué cuidados de enfermería son prioritarios para la prevención y manejo de la mucositis oral en un niño de 3 años en tratamiento con etopósido?',
  '["La mucositis no aparece con etopósido a dosis bajas; no requiere medidas preventivas específicas","Higiene oral suave con colutorio de clorhexidina diluida o bicarbonato cada 4-6 horas, mucosa labial hidratada, analgesia adecuada, y evitar alimentos traumatizantes (duros, ácidos, muy calientes)","Solo analgesia con ibuprofeno a demanda si hay dolor","Uso de enjuagues con lidocaína viscosa sin otras medidas complementarias"]',
  '1',
  'El etopósido puede causar mucositis, especialmente con la administración repetida y en contexto de pancitopenia. Los cuidados preventivos incluyen: higiene oral suave y frecuente, mucosa hidratada, analgesia adecuada escalonada (paracetamol → morfina si severo), evitar traumas mucosos, y vigilar candidiasis oral sobreañadida. El ibuprofeno está contraindicado por riesgo hemorrágico.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué efecto tiene el etopósido sobre la mucosa oral?","¿Qué analgésico está contraindicado en este paciente con trombopenia?"]',
  null,
  null
),

-- Q32 | PHARM — interacción azoles + ciclosporina
(
  $STEP_ID_4,
  'Este paciente inicia fluconazol profiláctico. ¿Qué interacción farmacológica crítica debe considerarse con la ciclosporina A?',
  '["No hay interacción entre fluconazol y ciclosporina","Fluconazol inhibe CYP3A4 y puede aumentar significativamente los niveles de ciclosporina A (hasta 2-3 veces), con riesgo de nefrotoxicidad grave; requiere reducción de dosis de CsA y monitorización intensiva de niveles","Fluconazol reduce los niveles de ciclosporina; requiere aumentar la dosis de CsA","La interacción solo es relevante con voriconazol, no con fluconazol"]',
  '1',
  'Fluconazol es un inhibidor potente de CYP3A4, la vía principal de metabolismo de la ciclosporina A. La coadministración puede aumentar los niveles de CsA 2-3 veces, con riesgo de nefrotoxicidad, hiperpotasemia e hipertensión. Es necesario reducir la dosis de CsA (habitualmente a la mitad) y monitorizar niveles cada 48-72 horas hasta la estabilización. Esta interacción es aplicable a todos los azoles (especialmente voriconazol y posaconazol).',
  ARRAY['farmacia'],
  false,
  '["¿Cuál es la enzima metabolizadora principal de la ciclosporina A?","¿Los azoles son inhibidores o inductores del CYP3A4?"]',
  null,
  null
),

-- ══════════ PASO 5: Complicaciones, respuesta y TPH (8 preguntas) ══════════

-- Q33 | MED | CRÍTICA — afectación SNC: reconocimiento y diagnóstico
(
  $STEP_ID_5,
  'A los 7 días de tratamiento, el niño desarrolla irritabilidad extrema, hipertonía y una crisis convulsiva breve. ¿Cuál es la acción diagnóstica más urgente?',
  '["Iniciar fenitoína y esperar evolución 24 horas sin pruebas de imagen urgentes","Realizar RMN cerebral urgente y punción lumbar (si no hay contraindicación de HTIC) para diagnóstico de afectación del SNC por HLH activo","Aumentar empíricamente la dosis de dexametasona sin más pruebas diagnósticas","Solicitar EEG y consultar con neurología pediátrica como única medida urgente"]',
  '1',
  'La afectación del SNC puede ocurrir incluso con tratamiento si el HLH no está controlado. Convulsiones + irritabilidad + hipertonía indican afectación neurológica activa. La RMN muestra lesiones inflamatorias y la PL revela pleocitosis o disociación albúmino-citológica. El diagnóstico rápido es urgente porque la afectación neurológica requiere terapia intratecal específica y es el factor pronóstico más negativo a largo plazo (secuelas en 22% de supervivientes).',
  ARRAY['medico'],
  true,
  '["¿En qué porcentaje de HLH primario aparece afectación del SNC?","¿Qué dos pruebas complementarias ofrecen más información sobre la afectación neurológica del SHF?"]',
  90,
  'Retrasar el diagnóstico de afectación del SNC lleva a progresión de daño neurológico irreversible. Las secuelas neurológicas son la complicación más grave a largo plazo en supervivientes de HLH.'
),

-- Q34 | MED — criterios de respuesta al tratamiento
(
  $STEP_ID_5,
  '¿Qué parámetros reflejan mejor la respuesta al tratamiento de HLH a las 2-4 semanas?',
  '["Solo la normalización completa de la ferritina","Resolución de fiebre, mejoría >75% de ferritina, mejoría de citopenias, disminución de sCD25 y normalización de CXCL9 (cuando disponible)","Hemograma completamente normal y ausencia de esplenomegalia en eco","Solo la negativización de la PCR del agente desencadenante (VEB)"]',
  '1',
  'La evaluación de respuesta en HLH es multidimensional: resolución de fiebre, mejoría ≥75% de ferritina (o normalización), recuperación de citopenias, disminución de sCD25 y normalización de CXCL9. Ningún parámetro aislado es suficiente. La normalización completa en 2 semanas es el objetivo; muchos pacientes tardan más. La persistencia de criterios HLH a las 4 semanas debe llevar a plantearse escalada terapéutica.',
  ARRAY['medico'],
  false,
  '["¿Cuántos parámetros evalúan la respuesta al tratamiento en HLH?","¿Qué porcentaje de reducción de ferritina se considera respuesta clínicamente relevante?"]',
  null,
  null
),

-- Q35 | PHARM — ruxolitinib: mecanismo e indicación
(
  $STEP_ID_5,
  '¿En qué situación clínica se plantea el uso de ruxolitinib en HLH y cuál es su mecanismo de acción?',
  '["Como primera línea en HLH secundario en lugar de etopósido, por mayor seguridad","En HLH refractario o como terapia puente al TPH; inhibe JAK1/JAK2 bloqueando la señalización de múltiples citocinas proinflamatorias (IFN-gamma, IL-6, IL-18)","Solo en adultos con HLH secundario a neoplasias hematológicas","Está contraindicado en pacientes con pancitopenia activa"]',
  '1',
  'Ruxolitinib es un inhibidor de JAK1/JAK2 que bloquea la señalización de citocinas clave en HLH (IFN-γ, IL-6, IL-18, IL-2). Se usa en HLH refractario/recidivante como alternativa o combinado con el tratamiento estándar, y como puente al TPH. Evidencia creciente en formas secundarias y SAM. Ventaja: administración oral. La trombocitopenia es un efecto adverso a monitorizar, no es contraindicación absoluta.',
  ARRAY['farmacia'],
  false,
  '["¿Qué vía de señalización de citocinas inhibe el ruxolitinib?","¿En qué fase del manejo del HLH tiene indicación el ruxolitinib?"]',
  null,
  null
),

-- Q36 | NUR — educación familiar pre-TPH
(
  $STEP_ID_5,
  '¿Qué información esencial debe incluir la educación de enfermería a la familia antes del inicio del acondicionamiento para el TPH en un niño con HLH primario?',
  '["Solo los riesgos del trasplante sin mencionar beneficios para no generar falsas expectativas","Objetivo del TPH (único tratamiento curativo), riesgos principales (EICH, infecciones, toxicidad del acondicionamiento), cronograma aproximado del ingreso, período de aplasia y su manejo, y necesidad de seguimiento prolongado posterior","Informar solo al paciente mayor y no a los padres de menores de 14 años","Describir solo el procedimiento técnico evitando hablar de pronóstico y complicaciones"]',
  '1',
  'La educación familiar pre-TPH es fundamental para un consentimiento informado real. Debe incluir: objetivo curativo (corregir el defecto genético de citotoxicidad), riesgos (EICH aguda/crónica, infecciones oportunistas, fallo del injerto, toxicidad del acondicionamiento), cronograma del ingreso, cuidados durante la aplasia, y seguimiento a largo plazo. La comunicación honesta y empática mejora la adherencia y la capacidad de la familia de manejar complicaciones.',
  ARRAY['enfermeria'],
  false,
  '["¿Cuál es el objetivo principal del TPH en HLH primario?","¿Qué necesita conocer una familia para dar un consentimiento realmente informado?"]',
  null,
  null
),

-- Q37 | MED+NUR — fallo multiorgánico: escalada
(
  $STEP_ID_5,
  'El paciente desarrolla disfunción renal (creatinina 1,8 mg/dL, oliguria) e hipotensión que requiere soporte vasoactivo. ¿Cuál es la combinación de medidas más adecuada?',
  '["Suspender el etopósido y esperar mejoría espontánea sin cambios en el tratamiento específico","Ingreso en UCIP, soporte hemodinámico, ajustar etopósido por función renal (reducir 25-50%), mantener y escalar el tratamiento específico del HLH (emapalumab, ruxolitinib, ATG según respuesta)","Suspender todo tratamiento inmunosupresor para mejorar las defensas del paciente","Solo soporte hemodinámico sin modificar el tratamiento específico del HLH"]',
  '1',
  'El fallo multiorgánico en HLH activo requiere: (1) soporte en UCIP, (2) mantener y escalar el tratamiento específico (no suspenderlo: la causa del fallo orgánico es la inflamación no controlada), (3) ajustar dosis de fármacos con eliminación renal (etopósido: reducir 25-50% con ClCr reducido), y (4) plantear escalada terapéutica (emapalumab, ATG, ruxolitinib) si la respuesta es insuficiente. Suspender el tratamiento específico empeora el cuadro.',
  ARRAY['medico','enfermeria'],
  false,
  '["¿Cuál es la causa del fallo multiorgánico en el HLH activo? ¿Se resuelve suspendiendo el tratamiento?","¿Qué ajuste farmacológico requiere la insuficiencia renal aguda sobre el etopósido?"]',
  null,
  null
),

-- Q38 | PHARM — profilaxis antiinfecciosa post-TPH
(
  $STEP_ID_5,
  'Tras el TPH de intensidad reducida en el paciente con HLH primario, ¿cuál es la profilaxis antiinfecciosa estándar durante el período de aplasia?',
  '["Solo amoxicilina oral durante 1 mes por ser el antibiótico más manejable","Profilaxis antibacteriana (cotrimoxazol para Pneumocystis jirovecii), antifúngica (fluconazol o posaconazol), y antiviral (aciclovir/valganciclovir para CMV/VHS/VEB con monitorización de PCR CMV)","Solo profilaxis antifúngica con fluconazol en la fase de aplasia","No se requiere profilaxis antiinfecciosa específica si el paciente está clínicamente estable"]',
  '1',
  'El período post-TPH implica inmunodeficiencia profunda. La profilaxis estándar incluye: cotrimoxazol (Pneumocystis jirovecii, habitualmente desde la recuperación de neutrófilos durante 6-12 meses), fluconazol o posaconazol (hongos), aciclovir o valganciclovir (CMV, VHS, VEB con monitorización seriada de PCR CMV). La vacunación debe reiniciarse una vez alcanzada la reconstitución inmune (1-2 años post-TPH).',
  ARRAY['farmacia'],
  false,
  '["¿Qué tres grupos de microorganismos son los más peligrosos en la aplasia post-TPH?","¿Qué profilaxis específica cubre el Pneumocystis jirovecii?"]',
  null,
  null
),

-- Q39 | NUR+PHARM — anakinra en SAM: administración
(
  $STEP_ID_5,
  'En un paciente con SAM (HLH secundario a AIJs) que no responde a corticoides, se decide iniciar anakinra. ¿Qué debe saber el equipo de enfermería y farmacia sobre su administración?',
  '["Anakinra puede mezclarse en bolsa IV con suero fisiológico sin necesidad de precauciones especiales","Anakinra se administra SC o IV (2-10 mg/kg/día en 2-4 dosis); la vía SC requiere rotación sistemática de zonas de inyección; es termolábil y debe conservarse entre 2-8°C sin congelar; la vía IV se prefiere en pacientes críticos","Anakinra es equivalente al etanercept y puede usarse indistintamente en SAM","La dosis estándar en SAM es 1 mg/kg/día SC en dosis única nocturna"]',
  '1',
  'Anakinra (inhibidor del receptor de IL-1) en SAM grave se usa a 2-10 mg/kg/día dividida en 2-4 dosis SC o IV. La vía SC requiere rotación de puntos de inyección (muslo, abdomen, brazos) para minimizar reacciones locales y lipodistrofia. Es termolábil: conservar en nevera 2-8°C sin congelar. La vía IV permite biodisponibilidad más predecible en pacientes críticos o con mala absorción SC. No es equivalente al etanercept (diferente diana y mecanismo).',
  ARRAY['enfermeria','farmacia'],
  false,
  '["¿Cómo se conserva la anakinra y a qué temperatura?","¿Cuántas dosis diarias se usan en SAM grave y por qué se fracciona la dosis?"]',
  null,
  null
);

-- ──────────────────────────────────────────
-- 4. CASE BRIEF
-- ──────────────────────────────────────────
INSERT INTO case_briefs (
  id, scenario_id, title, context, chief_complaint, chips,
  history, triangle, vitals, exam, quick_labs, imaging, timeline,
  red_flags, objectives, competencies, critical_actions,
  learning_objective, level, estimated_minutes
) VALUES (
  gen_random_uuid(),
  $SCENARIO_ID,
  'Síndrome hemofagocítico pediátrico',
  'Urgencias pediátricas hospitalarias. Derivado desde pediatría de atención primaria por fiebre prolongada con mala evolución y pancitopenia en analítica urgente.',
  'Niño de 3 años con 12 días de fiebre alta (39-40°C), hepatoesplenomegalia marcada, petequias y deterioro progresivo del estado general a pesar de antibioterapia oral.',
  '["Fiebre >12 días sin respuesta a antibióticos","Pancitopenia severa","Hepatoesplenomegalia marcada","Hiperferritinemia extrema (18.540 ng/mL)"]',
  '{
    "Síntomas": [
      "Fiebre alta persistente 39-40°C (12 días)",
      "Decaimiento y anorexia progresivos",
      "Abdomen distendido (esplenomegalia palpable 6 cm bajo reborde costal)",
      "Petequias en extremidades inferiores",
      "Ictericia conjuntival leve desde hace 3 días"
    ],
    "Antecedentes": "Sin antecedentes patológicos de interés. No consanguinidad conocida. Un hermano mayor sano.",
    "Medicación previa": "Amoxicilina-clavulánico oral 7 días (sin mejoría). Ibuprofeno a demanda (última dosis hace 3 horas).",
    "Epidemiología": "No viajes recientes. Zona mediterránea española. Guardería.",
    "Historia familiar": "Sin historia familiar de SHF, inmunodeficiencias ni consanguinidad conocida."
  }',
  '{"appearance":"amber","breathing":"green","circulation":"amber"}',
  '{"fc":148,"fr":38,"sat":97,"temp":39.6,"tas":88,"tad":52,"peso":14}',
  '{"Neurológico":"Irritable, llanto débil, consciente pero con respuesta disminuida a estímulos lúdicos","Cutáneo":"Petequias en MMII, ictericia conjuntival leve, palidez mucocutánea","Abdominal":"Hepatomegalia 4 cm + esplenomegalia 6 cm bajo reborde costal, blandas y dolorosas a la palpación","Ganglionar":"Adenopatías cervicales bilaterales 1-2 cm, móviles"}',
  '[
    {"name":"Hemoglobina","value":"7,2 g/dL"},
    {"name":"Plaquetas","value":"42.000/mm³"},
    {"name":"Neutrófilos","value":"680/mm³"},
    {"name":"Ferritina","value":"18.540 ng/mL"},
    {"name":"Triglicéridos","value":"480 mg/dL"},
    {"name":"Fibrinógeno","value":"118 mg/dL"},
    {"name":"AST/GOT","value":"245 U/L"},
    {"name":"ALT/GPT","value":"189 U/L"},
    {"name":"Bilirrubina total","value":"3,2 mg/dL"},
    {"name":"PCR VEB IgM","value":"Positiva"},
    {"name":"PCR VEB sangre","value":"45.000 copias/mL"},
    {"name":"sCD25 soluble","value":"Pendiente"}
  ]',
  '[
    {"name":"Eco abdominal","status":"done"},
    {"name":"Radiografía de tórax","status":"done"},
    {"name":"Aspirado médula ósea","status":"ordered"},
    {"name":"RMN cerebral","status":"recommended"}
  ]',
  '[
    {"t":0,"evento":"Inicio de fiebre alta, tratamiento antipirético en domicilio"},
    {"t":3,"evento":"Persistencia de fiebre; pediatra inicia amoxicilina-clavulánico"},
    {"t":7,"evento":"Sin mejoría; aparición de palidez y hepatoesplenomegalia"},
    {"t":10,"evento":"Petequias en extremidades; derivación urgente al hospital"},
    {"t":12,"evento":"Llegada a urgencias hospitalarias; analítica urgente con pancitopenia e hiperferritinemia"}
  ]',
  '[
    {"text":"Fiebre prolongada >10 días sin respuesta a antibióticos","correct":true},
    {"text":"Pancitopenia en ≥2 líneas hematológicas","correct":true},
    {"text":"Ferritina >10.000 ng/mL (elevadísima especificidad en niños)","correct":true},
    {"text":"Hipertrigliceridemia + hipofibrinogenemia simultáneas","correct":true},
    {"text":"Esplenomegalia marcada de rápida aparición","correct":true},
    {"text":"Deterioro neurológico (irritabilidad, convulsión)","correct":true}
  ]',
  '{
    "MED":["Aplicar criterios HLH-2004 e identificar los 5/8 cumplidos","Indicar aspirado de médula ósea, estudio inmunológico y genético","Iniciar protocolo HLH-94/2004 (dexametasona + etopósido) con dosificación correcta","Reconocer y manejar la afectación del SNC","Distinguir el manejo de HLH primario vs. SAM reumatológico"],
    "NUR":["Reconocer los signos de alarma del deterioro en SHF","Preparar y monitorizar la administración segura de etopósido","Monitorizar la toxicidad de dexametasona (hiperglucemia, HTA)","Comunicar empáticamente a la familia el proceso diagnóstico y terapéutico","Vigilar la mucositis y la coagulopatía como complicaciones frecuentes"],
    "PHARM":["Calcular correctamente las dosis de etopósido con ajuste por SC y función renal","Identificar interacciones farmacológicas relevantes (CsA-azoles, ibuprofeno)","Monitorizar los niveles de ciclosporina A y su toxicidad","Conocer las indicaciones de emapalumab, ruxolitinib y anakinra","Gestionar la profilaxis antiinfecciosa en el período post-TPH"]
  }',
  '["Reconocimiento precoz del SHF en urgencias","Aplicación de criterios diagnósticos HLH-2004","Dosificación correcta de citostáticos en pediatría","Comunicación interprofesional en situaciones de urgencia oncohematológica","Planificación del trasplante de progenitores hematopoyéticos"]',
  '["Reconocer HLH ante fiebre prolongada + pancitopenia + hepatoesplenomegalia sin demora","Aplicar criterios HLH-2004: ≥5/8 = diagnóstico establecido, actuar","Iniciar dexametasona 10 mg/m²/día + etopósido 150 mg/m²/semana con dosis calculadas correctamente","Suspender ibuprofeno inmediatamente al ingreso","Descartar leishmaniasis visceral en España antes de asumir HLH idiopático"]',
  'Identificar el síndrome hemofagocítico pediátrico de forma precoz, aplicar los criterios diagnósticos HLH-2004 e iniciar tratamiento específico sin demora para prevenir el fallo multiorgánico y la afectación neurológica irreversible.',
  'avanzado',
  28
);

-- ──────────────────────────────────────────
-- 5. CASE RESOURCES
-- ──────────────────────────────────────────
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), $SCENARIO_ID,
   'Pediatric Hemophagocytic Lymphohistiocytosis: A Comprehensive Review (Verkamp, Jordan, Allen 2026)',
   'https://ashpublications.org/blood/article/doi/10.1182/blood.2025028762/543721',
   'Blood (ASH)',
   'revisión',
   2026,
   false,
   now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Consensus-Based Guidelines for Recognition, Diagnosis, and Management of HLH in Critically Ill Children and Adults (Hines et al. 2022)',
   'https://journals.lww.com/ccmjournal/Abstract/2022/06000/Consensus_Based_Guidelines_for_the_Recognition,.24.aspx',
   'Critical Care Medicine',
   'guía',
   2022,
   false,
   now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Diagnostic Challenge of HLH: Ferritin >10,000 ng/mL — What Does It Really Mean? (Si et al. 2021)',
   'https://link.springer.com/article/10.1007/s10875-021-01053-3',
   'Journal of Clinical Immunology',
   'artículo',
   2021,
   false,
   now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Síndromes hemofagocíticos: la importancia del diagnóstico y tratamiento precoces (Astigarraga et al. 2018)',
   'https://www.analesdepediatria.org/es-sindromes-hemofagociticos-importancia-del-diagnostico-articulo-S1695403318301838',
   'Anales de Pediatría',
   'artículo',
   2018,
   true,
   now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Síndrome hemofagocítico — Pediatría Integral (Galán Gómez, Pérez Martínez — Hospital La Paz 2021)',
   'https://www.pediatriaintegral.es/wp-content/uploads/2021/xxv06/06/n6-326e1-9_VictorGalan.pdf',
   'Pediatría Integral',
   'revisión',
   2021,
   true,
   now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Emapalumab in Children with Primary Hemophagocytic Lymphohistiocytosis (Locatelli et al. NEJM 2020)',
   'https://www.nejm.org/doi/full/10.1056/NEJMoa1913842',
   'New England Journal of Medicine',
   'artículo',
   2020,
   false,
   now());

-- ══════════════════════════════════════════
-- RESUMEN
-- ══════════════════════════════════════════
-- Pasos: 5
-- Preguntas totales: 39
-- MED: Q1,Q2,Q4,Q7,Q8,Q9,Q11,Q15,Q16,Q17,Q20,Q22,Q23,Q27,Q30,Q33,Q34,Q37 = 18
-- NUR: Q2,Q3,Q4,Q6,Q10,Q11,Q13,Q14,Q19,Q21,Q26,Q29,Q31,Q36,Q37,Q39 = 16
-- PHARM: Q4,Q5,Q9,Q12,Q14,Q16,Q18,Q20,Q24,Q25,Q28,Q30,Q32,Q35,Q38,Q39 = 16
-- Críticas: Q1(MED), Q8(MED), Q22(MED), Q24(PHARM), Q26(NUR), Q33(MED) = 6
-- ══════════════════════════════════════════
