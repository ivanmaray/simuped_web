-- ══════════════════════════════════════════════════════════════════
-- ESCENARIO 18: BOTULISMO DEL LACTANTE
-- Lactante 2 meses, 5.2 kg — parálisis flácida descendente
-- MED=18 | NUR=14 | PHARM=15 | Critical=4 | Pasos=5
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- 1. SCENARIO
-- ─────────────────────────────────────────
INSERT INTO scenarios (
  title, summary, level, difficulty, mode,
  status, estimated_minutes, max_attempts
)
VALUES (
  'Botulismo del lactante: parálisis flácida descendente',
  'Lactante de 2 meses con estreñimiento de 5 días, hipotonía progresiva y ptosis bilateral tras exposición a infusión herbal casera. Sospecha, confirmación y tratamiento del botulismo del lactante.',
  'avanzado',
  'Avanzado',
  ARRAY['online'],
  'En construcción: en proceso',
  25,
  3
) RETURNING id;
-- ⚠️ Guarda este ID como $SCENARIO_ID

-- ─────────────────────────────────────────
-- 2. STEPS (usar $SCENARIO_ID)
-- ─────────────────────────────────────────
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  ($SCENARIO_ID, 1,
   'Triaje y sospecha diagnóstica',
   'Evalúa al lactante con hipotonía aguda, ptosis bilateral y llanto muy débil. Aplica el TEP estructurado y recoge los antecedentes de exposición a infusiones herbales. Identifica el patrón de parálisis flácida descendente sin fiebre ni alteración de conciencia.',
   false, null),

  ($SCENARIO_ID, 2,
   'Evaluación neurológica y diagnóstico diferencial',
   'Realiza exploración neurológica sistemática buscando los signos cardinales del botulismo: ptosis, oftalmoplejia, midriasis fija, reflejo de succión disminuido y parálisis descendente. Completa el diagnóstico diferencial con otras causas de hipotonía aguda neonatal y solicita las pruebas diagnósticas.',
   false, null),

  ($SCENARIO_ID, 3,
   'Soporte respiratorio y fármacos contraindicados',
   'Monitoriza el deterioro respiratorio progresivo con criterios claros de intubación. Identifica los fármacos absolutamente contraindicados antes de cualquier prescripción. Gestiona las muestras para confirmación en el Centro Nacional de Microbiología.',
   false, null),

  ($SCENARIO_ID, 4,
   'Tratamiento específico con antídoto',
   'Inicia el tratamiento con antídoto botulínico específico (BabyBIG o BAT heptavalente equino según disponibilidad). Gestiona la nutrición enteral, la monitorización intensiva y coordina con farmacia la obtención del medicamento de uso compasivo a través de AEMPS.',
   false, null),

  ($SCENARIO_ID, 5,
   'Recuperación, extubación y alta',
   'Supervisa la recuperación neuromuscular progresiva durante la ventilación mecánica. Planifica los criterios de extubación y reintroducción de la vía oral. Completa la notificación epidemiológica obligatoria y la educación familiar sobre prevención antes del alta.',
   false, null)
RETURNING id;
-- ⚠️ Guarda los IDs como $STEP_ID_1 ... $STEP_ID_5 (en orden de retorno)

-- ─────────────────────────────────────────
-- 3. QUESTIONS (usar $STEP_ID_N)
-- ─────────────────────────────────────────

-- ══ PASO 1: TRIAJE Y SOSPECHA ══

-- Q1 (MED+NUR): Acción inicial ante hipotonía aguda en lactante 2 meses
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_1,
  'Lactante varón de 2 meses, 5.2 kg, lleva 24 horas con ptosis bilateral y llanto muy débil. La abuela refiere haber dado infusión de manzanilla e hinojo hace una semana. TEP: appearance AMBER, breathing AMBER, circulation GREEN. ¿Cuál es la primera acción prioritaria?',
  '["Solicitar TC craneal urgente para descartar masa intracraneal","Evaluar vía aérea y estado respiratorio con TEP estructurado e historia dirigida de exposición","Administrar glucosa IV ante posible hipoglucemia neonatal","Iniciar antibioterapia empírica IV ante sospecha de meningitis bacteriana"]',
  '1',
  'El TEP con appearance y breathing AMBER indica compromiso neurológico y riesgo de insuficiencia respiratoria inminente. La prioridad es evaluar la vía aérea antes que cualquier prueba diagnóstica. La exposición a infusión herbal en menor de 12 meses orienta directamente a botulismo del lactante.',
  ARRAY['medico','enfermeria'],
  false,
  '["El TEP guía la urgencia: ¿cuál componente está más comprometido aquí?","Una historia de exposición a infusiones caseras en un lactante <12 meses es un antecedente de alto valor diagnóstico"]',
  null,
  null
);

-- Q2 (NUR): Relevancia del llanto en el triaje
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_1,
  'Al valorar el TEP en este lactante de 2 meses, el llanto es casi inaudible y débil. ¿Qué indica este hallazgo en el contexto de una parálisis flácida descendente?',
  '["Tono agudo del llanto indicaría irritabilidad meníngea, que queda descartada","Llanto hipertónico sugeriría convulsión focal en curso","Llanto débil o ausente en un lactante previamente normal refleja parálisis bulbar por afectación de nervios craneales bajos","El llanto débil es normal en neonatos y no tiene valor diagnóstico"]',
  '2',
  'En el botulismo del lactante, la toxina bloquea la liberación de acetilcolina de forma descendente, afectando primero nervios craneales. La parálisis de la musculatura bulbar (pares IX-XII) produce disfagia, regurgitación y debilidad del llanto. Es un signo centinela de progresión hacia insuficiencia respiratoria.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué músculos controlan la fonación en un lactante?","El botulismo sigue un patrón topográfico predecible: ¿de dónde empieza la parálisis?"]',
  null,
  null
);

-- Q3 (MED+PHARM): Antecedente diagnóstico clave
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_1,
  '¿Cuál de los siguientes antecedentes tiene mayor relevancia diagnóstica para orientar a botulismo del lactante en este caso?',
  '["Vacunación al día (DTPa, Hib, VPI, neumococo)","Administración de infusión de manzanilla e hinojo por la abuela hace 7 días","Parto vaginal a término sin complicaciones neonatales","Alimentación exclusiva con leche materna sin suplementos"]',
  '1',
  'Las infusiones de plantas medicinales (manzanilla, hinojo, anís, melisa) son un vehículo documentado de esporas de C. botulinum en España, igual que la miel. En menores de 12 meses, el intestino inmaduro permite la germinación de esporas y la producción de toxina in situ, a diferencia de los adultos. Este antecedente es diagnóstico de alto valor.',
  ARRAY['medico','farmacia'],
  false,
  '["¿Qué alimentos o bebidas están contraindicados en menores de 12 meses por riesgo de botulismo?","La fuente de toxina en el botulismo del lactante es diferente a la del botulismo alimentario del adulto"]',
  null,
  null
);

-- Q4 (MED): Primer síntoma cronológico
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_1,
  'Este lactante presenta 5 días de estreñimiento antes que cualquier síntoma neurológico. ¿Cuál es la prevalencia del estreñimiento como síntoma inicial en el botulismo del lactante?',
  '["15-20% de los casos; la mayoría debuta directamente con hipotonía","40-60% de los casos; aparece simultáneo a la ptosis","Aproximadamente el 95% de los casos; suele preceder a la parálisis por días","Solo en lactantes alimentados con fórmula adaptada"]',
  '2',
  'El estreñimiento es el síntoma inicial en aproximadamente el 95% de los casos de botulismo del lactante, y suele preceder a los signos neurológicos por 3-7 días. La toxina botulínica inhibe la liberación de ACh en el sistema nervioso autónomo entérico antes de que la parálisis muscular somática sea clínicamente evidente. Este dato anamnésico es fundamental para el diagnóstico precoz.',
  ARRAY['medico'],
  false,
  '["El sistema nervioso autónomo también utiliza acetilcolina como neurotransmisor, ¿qué efecto tiene la toxina sobre él?","¿Qué síntoma gastrointestinal esperarías si se bloquea el peristaltismo colinérgico?"]',
  null,
  null
);

-- Q5 (NUR): Exploración neurológica inicial
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_1,
  'Ante la sospecha de parálisis flácida descendente, ¿qué exploración neurológica debe priorizar enfermería en la evaluación inicial de este lactante?',
  '["Explorar reflejos tendinosos en miembros inferiores (patrón ascendente)","Valorar reflejos primarios (succión, Moro, prensión palmar) y tono axial en sentido craneocaudal","Medir perímetro cefálico y tensión de fontanela anterior","Explorar sensibilidad táctil superficial en dermatomos"]',
  '1',
  'En el botulismo del lactante, la parálisis es descendente: comienza por nervios craneales (ptosis, disfagia, llanto débil) y progresa caudalmente hacia musculatura axial y de extremidades. Valorar los reflejos primitivos (succión, Moro) y el tono axial permite documentar la progresión y detectar deterioro precoz. La sensibilidad está siempre preservada (neurona motora presináptica, sin afectación sensitiva).',
  ARRAY['enfermeria'],
  false,
  '["El botulismo afecta la placa motora presináptica, ¿qué modelos de parálisis son posibles?","Compara el patrón de progresión con el síndrome de Guillain-Barré"]',
  null,
  null
);

-- ══ PASO 2: EVALUACIÓN NEUROLÓGICA Y DIAGNÓSTICO DIFERENCIAL ══

-- Q6 (MED): Diferenciación botulismo vs miastenia grave
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_2,
  'Explorando al lactante, detectas ptosis bilateral, hipomimia y reflejos tendinosos presentes pero disminuidos. ¿Cuál es la característica exploratoria que MEJOR diferencia el botulismo del lactante de la miastenia grave neonatal?',
  '["La miastenia cursa con parálisis ascendente, el botulismo descendente","El botulismo solo afecta a lactantes mayores de 6 meses de edad","El botulismo produce midriasis fija por afectación autonómica, mientras la miastenia respeta las pupilas","La miastenia no produce debilidad de musculatura bulbar ni disfagia"]',
  '2',
  'La toxina botulínica bloquea tanto la sinapsis neuromuscular somática como la autonómica colinérgica, produciendo midriasis por parálisis del esfínter pupilar. La miastenia grave neonatal (anticuerpos anti-AChR maternos) respeta las pupilas porque el defecto es postsináptico en la unión neuromuscular somática sin afectación autonómica. Esta distinción es diagnósticamente clave en la exploración pupilar.',
  ARRAY['medico'],
  false,
  '["¿Cuál es la inervación del esfínter pupilar? ¿Es colinérgica o adrenérgica?","La toxina botulínica no distingue entre sinapsis somáticas y autonómicas colinérgicas"]',
  null,
  null
);

-- Q7 (MED): Patrón EMG en botulismo
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_2,
  'El servicio de neurofisiología realiza un EMG/ENG urgente. ¿Cuál es el hallazgo electrofisiológico característico del botulismo?',
  '["Velocidades de conducción enlentecidas con ondas F ausentes (patrón desmielinizante, Guillain-Barré)","Patrón miopático con fibrilaciones y ondas positivas en reposo","Potenciales de acción compuestos de pequeña amplitud que AUMENTAN con estimulación repetitiva a alta frecuencia (facilitación posttetánica)","Bloqueo completo de la conducción neuromuscular sin respuesta a estimulación"]',
  '2',
  'El botulismo produce un patrón presináptico: los potenciales de acción musculares compuestos (CMAP) son de amplitud reducida basalmente, pero aumentan con estimulación repetitiva a alta frecuencia (20-50 Hz) porque la acumulación de calcio presináptico facilita la fusión de vesículas de ACh residuales. Este patrón de facilitación lo diferencia de la miastenia (decremento con estimulación repetitiva) y del síndrome de Eaton-Lambert.',
  ARRAY['medico'],
  false,
  '["¿Dónde actúa la toxina botulínica: pre o postsináptico?","Compara con el patrón electrofisiológico del síndrome de Lambert-Eaton"]',
  null,
  null
);

-- Q8 (MED+PHARM): Gold standard diagnóstico
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_2,
  '¿Cuál es la prueba diagnóstica de confirmación de botulismo del lactante y en qué tipo de muestra se detecta la toxina?',
  '["Hemocultivo anaerobio en sangre venosa periférica","PCR de neurotoxina botulínica en suero materno","Detección de toxina botulínica y/o C. botulinum en heces del lactante mediante bioensayo en ratón","Anticuerpos anti-neurotoxina botulínica en suero del lactante"]',
  '2',
  'El gold standard es el bioensayo en ratón (mouse lethality assay) sobre muestra de heces del lactante, que detecta simultáneamente toxina libre y C. botulinum viable. En el botulismo del lactante, la toxina se produce in situ en el intestino, por lo que las heces son la muestra con mayor rendimiento diagnóstico (>90%). La serología no tiene utilidad diagnóstica en la fase aguda.',
  ARRAY['medico','farmacia'],
  false,
  '["¿Dónde se produce la toxina en el botulismo del lactante (intestino o alimento)?","¿Qué muestra tiene mayor probabilidad de contener tanto la bacteria como la toxina activa?"]',
  null,
  null
);

-- Q9 (MED+PHARM): Laboratorio de referencia en España
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_2,
  '¿Dónde se realiza la confirmación diagnóstica del botulismo en España y cuál es la demora habitual de los resultados?',
  '["Hospital terciario de referencia regional, resultado en 24-48 horas","Laboratorio de microbiología del propio hospital, 3-5 días","Centro Nacional de Microbiología (CNM, Instituto Carlos III, Madrid), con demora habitual de 15-20 días","Instituto Nacional de Toxicología, resultado en 7-10 días"]',
  '2',
  'En España, el diagnóstico microbiológico de botulismo se centraliza en el Centro Nacional de Microbiología (CNM) del Instituto de Salud Carlos III. Los resultados del bioensayo en ratón tardan habitualmente 15-20 días. Esto significa que el diagnóstico es CLÍNICO en la fase aguda: no se puede ni debe esperar la confirmación para iniciar el tratamiento con antídoto.',
  ARRAY['medico','farmacia'],
  false,
  '["¿Cuánto tarda el bioensayo en ratón? ¿Puede el clínico esperar este tiempo para tratar?","El diagnóstico y tratamiento del botulismo del lactante es fundamentalmente clínico-epidemiológico"]',
  null,
  null
);

-- Q10 (MED+PHARM): Muestras a enviar
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_2,
  '¿Qué muestras deben enviarse al CNM para maximizar el rendimiento diagnóstico del botulismo del lactante?',
  '["Solo hemocultivo aerobio y anaerobio del lactante (suficiente para confirmación)","Heces del lactante (mínimo 10-20 g) + suero del lactante + muestra de alimento sospechoso (infusión herbal) si está disponible","Solo heces del lactante; las demás muestras no aportan información adicional","Hisopo rectal + aspirado gástrico + LCR del lactante"]',
  '1',
  'El protocolo del CNM incluye heces del lactante como muestra principal (máximo rendimiento), suero del lactante (puede detectar toxina circulante en estadios tempranos), y el alimento sospechoso si se conserva. En este caso, la infusión de manzanilla/hinojo es la fuente probable y su análisis puede confirmar el serotipo. LCR e hisopo rectal tienen bajo rendimiento y no están indicados.',
  ARRAY['medico','farmacia'],
  false,
  '["¿Qué muestra tiene más probabilidades de contener toxina activa en el botulismo del lactante?","Si se conserva el alimento sospechoso, ¿tiene valor enviarlo para análisis?"]',
  null,
  null
);

-- ══ PASO 3: SOPORTE RESPIRATORIO Y FÁRMACOS CONTRAINDICADOS ══

-- Q11 (NUR+PHARM): Deterioro respiratorio — prioridad de enfermería
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_3,
  'El lactante presenta ahora FR 48 rpm, trabajo respiratorio con tiraje intercostal leve y SpO2 94% con FiO2 0.21. El llanto es prácticamente inaudible. ¿Cuál es la acción de enfermería más urgente?',
  '["Colocar sonda nasogástrica para iniciar nutrición enteral precoz","Administrar neostigmina IV para revertir el bloqueo neuromuscular","Asegurar posicionamiento óptimo de vía aérea y aplicar O2 de alto flujo con mascarilla reservorio mientras se prepara el material de intubación","Iniciar fisioterapia respiratoria intensiva para movilizar secreciones"]',
  '2',
  'La SpO2 94% con FR 48 y tiraje indica insuficiencia respiratoria inminente. La prioridad es optimizar el aporte de O2 (mascarilla reservorio FiO2 ≈ 0.85) y preparar el material de intubación de inmediato. La neostigmina está contraindicada en botulismo porque el defecto es presináptico (no hay ACh que liberar), y en algunos casos puede exacerbar los síntomas. La fisioterapia está contraindicada en la fase aguda.',
  ARRAY['enfermeria','farmacia'],
  false,
  '["¿Qué SpO2 mínima toleras en un lactante de 2 meses antes de preparar intubación?","El mecanismo de la parálisis en botulismo, ¿responde a anticolinesterásicos?"]',
  null,
  null
);

-- Q12 (MED+PHARM): Criterios de intubación
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_3,
  '¿Cuándo está indicada la intubación orotraqueal en el botulismo del lactante?',
  '["Siempre al diagnóstico clínico sin esperar deterioro, por el riesgo de progresión brusca","Solo si el lactante presenta apnea completa sostenida durante más de 30 segundos","Cuando hay signos de agotamiento respiratorio, SpO2 <93% pese a O2, pérdida del reflejo de tos/deglución eficaz, o PCO2 en ascenso","Si la EMG confirma bloqueo neuromuscular severo en estudios de conducción"]',
  '2',
  'La indicación de intubación es clínica: agotamiento de la musculatura respiratoria (taquipnea + tiraje + movimiento paradójico), SpO2 <93% con O2 suplementario, pérdida del reflejo de deglución/tos (riesgo de aspiración) o hipercapnia progresiva. No se espera a la apnea completa porque en ese punto la situación puede ser irreversible. La EMG no es criterio de intubación.',
  ARRAY['medico','farmacia'],
  false,
  '["¿Qué signos clínicos indican que un lactante está agotando su reserva respiratoria?","¿Es seguro esperar a la apnea completa para intubar en una parálisis neuromuscular progresiva?"]',
  null,
  null
);

-- Q13 (MED+PHARM — CRÍTICA): Aminoglucósidos contraindicados
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_3,
  'Antes de prescribir cualquier fármaco, ¿cuál de los siguientes está ABSOLUTAMENTE CONTRAINDICADO en el botulismo del lactante y por qué mecanismo?',
  '["Omeprazol IV — inhibe el citocromo P450 y aumenta los niveles de toxina","Gentamicina IV — potencia el bloqueo neuromuscular presináptico acelerando la parálisis respiratoria","Metronidazol IV — destruye las esporas intestinales y puede liberar más toxina","TMP-SMX oral — antagoniza el ácido fólico de C. botulinum interfiriendo con el diagnóstico"]',
  '1',
  'Los aminoglucósidos (gentamicina, tobramicina, amikacina) están absolutamente contraindicados en el botulismo. Potencian el bloqueo de la liberación presináptica de ACh de la toxina botulínica por un mecanismo de inhibición de canales de calcio voltaje-dependientes, pudiendo precipitar una apnea súbita fatal. Metronidazol y penicilina también son problemáticos (lisan esporas con posible liberación de toxina adicional). TMP-SMX es el antibiótico más seguro si hay indicación.',
  ARRAY['medico','farmacia'],
  true,
  '["¿Qué ión es fundamental para la fusión de vesículas sinápticas de ACh? ¿Qué afectan los aminoglucósidos?","Recuerda que el botulismo ya bloquea la liberación de ACh: ¿qué ocurre si se añade otro fármaco que también la bloquea?"]',
  90,
  'La administración de aminoglucósidos en un paciente con botulismo puede precipitar parada respiratoria súbita por potenciación del bloqueo presináptico de acetilcolina. Es un error con consecuencias directamente fatales. Todo el equipo (médicos, farmacéuticos, enfermería) debe conocer esta contraindicación absoluta.'
);

-- Q14 (MED+PHARM — CRÍTICA): Antibiótico más seguro
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_3,
  'El lactante desarrolla fiebre y se sospecha sobreinfección respiratoria. Si se requiere antibioterapia, ¿cuál es el antibiótico con mejor perfil de seguridad en el botulismo del lactante?',
  '["Amoxicilina-clavulánico IV (la β-lactamasa protege de la lisis de esporas)","Trimetoprim-sulfametoxazol (TMP-SMX)","Clindamicina IV (buena penetración en tejidos)","Ampicilina IV (primera línea en infecciones neonatales)"]',
  '1',
  'TMP-SMX es el antibiótico de elección cuando hay indicación en el botulismo del lactante. Los betalactámicos (incluida ampicilina) pueden lisar C. botulinum intestinal con liberación de toxina adicional. La clindamicina puede potenciar el bloqueo neuromuscular al igual que los aminoglucósidos. TMP-SMX no tiene efecto potenciador sobre la toxina ni lisis bacteriolítica significativa de C. botulinum.',
  ARRAY['medico','farmacia'],
  true,
  '["¿Qué mecanismo de acción de los betalactámicos podría ser problemático en botulismo intestinal?","¿Cuáles son los antibióticos con efecto potenciador demostrado sobre el bloqueo neuromuscular?"]',
  90,
  'Prescribir clindamicina o ampicilina en un paciente con botulismo activo puede agravar el bloqueo neuromuscular o aumentar la carga de toxina por lisis bacteriana intestinal. La elección incorrecta del antibiótico puede precipitar deterioro neurológico en un paciente ya comprometido.'
);

-- Q15 (PHARM): Dosis de BAT heptavalente en lactante <1 año
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_3,
  'La Red de Antídotos SEFH establece la dosis de suero antibotulinico heptavalente equino (BAT) en lactantes menores de 1 año. ¿Cuál es la dosis correcta para este lactante de 2 meses?',
  '["Un vial completo (100%) independientemente del peso corporal","La mitad del vial (50%) por ser menor de 6 meses","El 10% de un vial de adulto independientemente del peso","0.1 ml/kg del vial reconstituido según superficie corporal"]',
  '2',
  'Según el protocolo de la Red de Antídotos SEFH (actualización 2025), en lactantes menores de 1 año la dosis de BAT heptavalente equino es el 10% de un vial de adulto, independientemente del peso. Esta reducción de dosis no es por menor eficacia requerida, sino para minimizar el riesgo de reacciones de hipersensibilidad al suero equino en pacientes de tan corta edad. BabyBIG (inmunoglobulina humana) es preferible si está disponible.',
  ARRAY['farmacia'],
  false,
  '["¿Cuál es la fuente del BAT heptavalente: humana o equina? ¿Qué implicaciones tiene esto en pediatría?","Consulta el protocolo de la Red de Antídotos SEFH para la dosis pediátrica específica"]',
  null,
  null
);

-- ══ PASO 4: TRATAMIENTO ESPECÍFICO CON ANTÍDOTO ══

-- Q16 (MED+NUR — CRÍTICA): Dosis de BabyBIG
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_4,
  'Se dispone de BabyBIG (inmunoglobulina botulínica humana intravenosa) para este lactante de 2 meses y 5.2 kg. ¿Cuál es la dosis correcta?',
  '["100 mg/kg IV en infusión de 4 horas","50 mg/kg IV en dosis única (infusión lenta de al menos 30 minutos)","25 mg/kg IV cada 12 horas durante 3 días","500 mg fijos IV independientemente del peso corporal"]',
  '1',
  'BabyBIG (Botulism Immune Globulin Intravenous) se administra en dosis única de 50 mg/kg IV. En este lactante de 5.2 kg, la dosis es 260 mg. Proporciona niveles protectores durante aproximadamente 6 meses. BabyBIG es el antídoto de elección cuando está disponible por su origen humano (menor riesgo de hipersensibilidad), pero el BAT heptavalente equino (vial ME) también tiene indicación en menores de 1 año y es alternativa válida cuando BabyBIG no está disponible o no puede obtenerse a tiempo.',
  ARRAY['medico','enfermeria'],
  true,
  '["BabyBIG es una inmunoglobulina IV especial para botulismo del lactante, ¿cuál es su dosis estándar?","Calcula: para un lactante de 5.2 kg a 50 mg/kg, ¿cuántos mg en total?"]',
  90,
  'Una dosis incorrecta de BabyBIG (sub- o sobredosis) puede resultar en protección insuficiente o reacciones adversas evitables. Al ser una administración única y de uso compasivo con disponibilidad limitada, el cálculo correcto es crítico. Una subdosis no puede compensarse con una segunda dosis fácilmente disponible.'
);

-- Q17 (MED+PHARM — CRÍTICA): Obtención de BabyBIG en España
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_4,
  '¿Cómo se obtiene BabyBIG en España para un caso de botulismo del lactante confirmado clínicamente?',
  '["Está disponible en el stock de la farmacia de todos los hospitales terciarios pediátricos de España","Se solicita a través de la Agencia Española de Medicamentos y Productos Sanitarios (AEMPS) como medicamento extranjero de uso compasivo urgente","Se importa directamente desde el CDPH de California sin trámites intermedios","No está disponible en España; el BAT heptavalente equino es siempre la única opción"]',
  '1',
  'BabyBIG no tiene autorización de comercialización en España y debe solicitarse a la AEMPS como medicamento extranjero (ME) de uso urgente. El proceso debe iniciarse al diagnóstico clínico, sin esperar confirmación microbiológica. Importante: el BAT heptavalente equino (A-G, vial solución inyectable, ME) también tiene indicación en menores de 1 año y puede obtenerse de forma más inmediata a través de la Red de Antídotos SEFH. Ambos antídotos tienen indicación en <1 año; BabyBIG se prefiere por seguridad (origen humano), pero BAT es alternativa igualmente válida.',
  ARRAY['medico','farmacia'],
  true,
  '["¿BabyBIG tiene autorización de la EMA o AEMPS para su uso en España?","¿Qué vía administrativa permite usar en España un medicamento no autorizado en situaciones de urgencia?"]',
  90,
  'No conocer el procedimiento de obtención de BabyBIG a través de AEMPS puede resultar en un retraso fatal en el inicio del tratamiento. Al no estar en el stock hospitalario, el trámite debe iniciarse en las primeras horas desde el diagnóstico clínico, sin esperar confirmación microbiológica. Farmacia hospitalaria debe conocer este proceso de urgencia.'
);

-- Q18 (PHARM): Preparación de BAT heptavalente en farmacia
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_4,
  'El servicio de farmacia recibe la prescripción de BAT heptavalente equino para este lactante de 2 meses. ¿Qué volumen del vial debe preparar según el protocolo de la Red de Antídotos SEFH?',
  '["El vial completo (100%) por ser una emergencia que requiere máxima dosis","La mitad del vial (50%) calculado por peso/edad","El 10% del contenido del vial de adulto, independientemente del peso","El volumen calculado según mg/m² de superficie corporal"]',
  '2',
  'La Red de Antídotos SEFH establece que en lactantes menores de 1 año, la dosis de BAT heptavalente equino es el 10% de un vial de adulto, sin ajuste por peso. Esta dosificación se establece para minimizar la carga antigénica del suero equino y el riesgo de reacciones anafilácticas, que son más graves en lactantes. Farmacia debe diluir adecuadamente esta fracción antes de la infusión IV.',
  ARRAY['farmacia'],
  false,
  '["Recuerda la dosis pediátrica de BAT de la Red de Antídotos SEFH para menores de 1 año","¿La dosis se ajusta por peso o es fija como porcentaje del vial?"]',
  null,
  null
);

-- Q19 (MED+PHARM): BabyBIG vs BAT equino
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_4,
  '¿Cuál es la ventaja principal de BabyBIG sobre el BAT heptavalente equino en el tratamiento del botulismo del lactante?',
  '["Mayor eficacia neutralizante al cubrir los 7 serotipos botulínicos (A-G) frente a solo 2 del equino","Menor riesgo de reacciones de hipersensibilidad y enfermedad del suero al ser de origen humano","Disponibilidad inmediata sin trámites administrativos en todos los hospitales españoles","Menor coste farmacéutico por vial para el hospital"]',
  '1',
  'Tanto BabyBIG como el BAT heptavalente equino tienen indicación en el botulismo del lactante (<1 año). La principal ventaja de BabyBIG es su origen humano, que reduce significativamente el riesgo de reacciones anafilácticas y enfermedad del suero, más graves en lactantes. El BAT heptavalente (A-G, vial ME) cubre los 7 serotipos y puede obtenerse a través de la Red de Antídotos SEFH de forma más inmediata, mientras que BabyBIG se solicita a AEMPS. La elección depende de disponibilidad y tiempo de obtención; BabyBIG se prefiere cuando está disponible, pero BAT es una alternativa igualmente válida e indicada.',
  ARRAY['medico','farmacia'],
  false,
  '["¿Cuál es la fuente de BabyBIG? ¿Por qué importa el origen humano vs equino?","¿Qué serotipos de toxina botulínica son más frecuentes en el botulismo del lactante?"]',
  null,
  null
);

-- Q20 (MED+NUR): Manejo nutricional
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_4,
  '¿Cuál es el manejo nutricional adecuado durante la fase aguda del botulismo del lactante con disfagia severa y reflejo de succión ausente?',
  '["Continuar lactancia materna con posición incorporada a 45° y tetina de flujo lento","Nutrición parenteral total desde el inicio como primera opción nutricional","Suspender vía oral e iniciar nutrición enteral continua por sonda nasogástrica","Alimentación oral a demanda con monitorización de SpO2 durante la toma"]',
  '2',
  'La disfagia severa por parálisis bulbar elimina la vía oral segura (riesgo de aspiración). La nutrición enteral por sonda nasogástrica es la primera opción porque mantiene el trofismo intestinal y es menos invasiva que la parenteral. La sonda nasogástrica también puede usarse para administrar medicación. La nutrición parenteral se reserva para casos con íleo intestinal o intolerancia a la enteral.',
  ARRAY['medico','enfermeria'],
  false,
  '["Si el reflejo de deglución está abolido, ¿es segura la vía oral?","¿Qué ruta de nutrición es preferible cuando el tracto digestivo es funcional?"]',
  null,
  null
);

-- Q21 (NUR): Frecuencia de monitorización respiratoria
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_4,
  '¿Con qué tipo de monitorización debe controlarse la función respiratoria de un lactante con botulismo durante la hospitalización?',
  '["Control cada 8 horas con pulsioximetría spot y registro en la historia clínica","Control cada 4 horas con pulsioximetría continua en planta de hospitalización convencional","Monitorización continua en UCI pediátrica o unidad de cuidados intermedios con cardiorrespirograma","Solo cuando el lactante presente signos visibles de dificultad respiratoria"]',
  '2',
  'El botulismo del lactante puede progresar a insuficiencia respiratoria de forma brusca e impredecible. La monitorización debe ser continua (cardiorrespirograma, pulsioximetría, capnografía si está intubado) en un entorno de UCI pediátrica o equivalente. La monitorización intermitente en planta convencional no detecta el deterioro precoz y no permite la respuesta rápida necesaria en este cuadro.',
  ARRAY['enfermeria'],
  false,
  '["¿Puede la progresión de la parálisis en botulismo ser brusca o siempre es gradual y predecible?","¿Qué entorno asistencial garantiza la detección precoz de apnea en un lactante?"]',
  null,
  null
);

-- Q22 (PHARM+NUR): Fármacos a evitar (lista ampliada)
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_4,
  '¿Qué grupos farmacológicos deben evitarse en el botulismo del lactante por riesgo de potenciación del bloqueo neuromuscular o liberación adicional de toxina?',
  '["Únicamente los aminoglucósidos (gentamicina, amikacina, tobramicina)","Aminoglucósidos, clindamicina, sales de magnesio, bloqueantes neuromusculares y betalactámicos en altas dosis","Solo los bloqueantes neuromusculares despolarizantes (succinilcolina)","Únicamente los opiáceos por su efecto de depresión respiratoria central"]',
  '1',
  'La lista de fármacos problemáticos en botulismo incluye: aminoglucósidos y clindamicina (potencian el bloqueo presináptico), sales de magnesio (mismo mecanismo que aminoglucósidos, compite con Ca++ presináptico), bloqueantes neuromusculares (potencian la parálisis muscular), y betalactámicos en altas dosis (posible lisis bacteriana con liberación de toxina en botulismo intestinal). Esta lista debe estar disponible en la prescripción y en la cabecera del paciente.',
  ARRAY['farmacia','enfermeria'],
  false,
  '["¿Qué tienen en común los aminoglucósidos y el magnesio en la fisiología de la placa neuromuscular?","¿Qué ocurre cuando los betalactámicos lisan C. botulinum en el intestino de un lactante?"]',
  null,
  null
);

-- ══ PASO 5: RECUPERACIÓN, EXTUBACIÓN Y ALTA ══

-- Q23 (NUR): Complicaciones durante la VM prolongada
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_5,
  '¿Cuál es la complicación respiratoria más frecuente que debe anticiparse durante la ventilación mecánica prolongada en el botulismo del lactante?',
  '["Neumotórax espontáneo por barotrauma de la ventilación protectora","Atelectasias por hiposecreción bronquial (la toxina inhibe la producción de moco)","Neumonía asociada a ventilación (NAV) y atelectasias por acumulación de secreciones bronquiales","Edema pulmonar no cardiogénico por sobrecarga hídrica de los antídotos"]',
  '2',
  'La NAV es la principal complicación infecciosa de la VM prolongada en el botulismo del lactante, junto a las atelectasias por retención de secreciones. La parálisis de la musculatura respiratoria impide la tos eficaz, favoreciendo el acúmulo de moco. Las medidas preventivas incluyen: aspiración endotraqueal regular, higiene oral con clorhexidina, cabecero a 30°, fisioterapia respiratoria pasiva y rotación de la posición del lactante.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué mecanismo de defensa pulmonar está abolido cuando el lactante está paralizado y ventilado?","¿Qué complicación es más frecuente en pacientes intubados durante semanas?"]',
  null,
  null
);

-- Q24 (NUR): Criterio para reintroducción de vía oral
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_5,
  '¿Qué criterio es fundamental para valorar la reintroducción de la alimentación oral en el lactante con botulismo en fase de recuperación?',
  '["Normalización del trazado EMG de control (potenciales de amplitud >50% del basal)","Recuperación del tono muscular en las cuatro extremidades","Presencia de reflejo de succión-deglución coordinado y tos eficaz ante estimulación","Extubación satisfactoria mantenida durante más de 48 horas sin reintubación"]',
  '2',
  'La capacidad de succión-deglución coordinada y la tos eficaz son los requisitos mínimos para reintroducir la vía oral con seguridad, independientemente del estado de extubación. La deglución puede evaluarse con una prueba de succión no nutritiva o, en casos dudosos, con videofluoroscopia. La extubación no garantiza por sí sola la capacidad de deglución segura: ambos deben evaluarse de forma independiente.',
  ARRAY['enfermeria'],
  false,
  '["¿Se puede deglutir de forma segura si la tos es ineficaz?","¿La extubación exitosa implica recuperación de todos los grupos musculares, incluidos los bulbares?"]',
  null,
  null
);

-- Q25 (MED+NUR): Pronóstico y recuperación
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_5,
  '¿Cómo es el patrón de recuperación esperado en el botulismo del lactante con soporte adecuado?',
  '["Recuperación rápida en días, ya que el lactante regenera acetilcolina más rápidamente que el adulto","Recuperación progresiva pero completa en semanas-meses, a medida que el organismo forma nuevas terminales nerviosas funcionales","Recuperación parcial con secuelas neuromusculares permanentes en más del 50% de los casos","Recuperación dependiente de la administración de anticolinesterásicos (piridostigmina) para acelerar el proceso"]',
  '1',
  'La recuperación en el botulismo del lactante es progresiva pero completa en prácticamente todos los casos con soporte adecuado. La toxina daña la terminal axónica presináptica de forma irreversible, por lo que la recuperación depende de la brotación de nuevas terminales nerviosas (sprouting), proceso que tarda semanas a meses. La mortalidad con soporte ventilatorio adecuado es <2% en centros con experiencia. Los anticolinesterásicos no aceleran la recuperación (no hay ACh que potenciar).',
  ARRAY['medico','enfermeria'],
  false,
  '["¿La toxina botulínica es reversible (se elimina) o el axón debe regenerar nuevas terminales?","¿Cuál es la mortalidad del botulismo del lactante con soporte ventilatorio adecuado?"]',
  null,
  null
);

-- Q26 (ALL roles): Prevención al alta
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_5,
  '¿Cuál es la medida preventiva más efectiva que debe comunicarse a la familia al alta para evitar un nuevo episodio de botulismo del lactante?',
  '["Administrar probióticos de Lactobacillus para colonización intestinal competitiva protectora","No introducir alimentación complementaria sólida hasta los 12 meses de edad","Evitar la administración de miel, infusiones caseras (manzanilla, hinojo, anís, melisa) y jarabes de plantas medicinales en menores de 12 meses","Hervir el agua de preparación de biberones durante 10 minutos para eliminar esporas"]',
  '2',
  'Miel e infusiones de plantas medicinales son los dos principales vehículos de esporas de C. botulinum documentados en España. Esta recomendación es universal para todos los menores de 12 meses, con o sin antecedente de botulismo. El intestino inmaduro del lactante permite la germinación de esporas y producción de toxina in situ. Hervir el agua no elimina esporas (resistentes a 100°C durante horas); se precisaría autoclave.',
  ARRAY['medico','enfermeria','farmacia'],
  false,
  '["¿Son las esporas de C. botulinum sensibles al calor de la cocción doméstica (100°C)?","¿Qué alimentos o bebidas han documentado asociación con botulismo del lactante en España?"]',
  null,
  null
);

-- Q27 (NUR+PHARM): Notificación epidemiológica
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_5,
  '¿Qué debe hacerse en cuanto al sistema de vigilancia epidemiológica ante un caso sospechoso de botulismo del lactante?',
  '["Notificar solo cuando el resultado del bioensayo del CNM sea positivo (evitar alarmas con casos sospechosos)","Notificación inmediata (urgente) como enfermedad de declaración obligatoria, incluyendo casos sospechosos sin esperar confirmación microbiológica","Notificación mensual agregada a la CCAA junto con el resto de enfermedades de declaración","Notificar solo si se identifican más casos en el mismo entorno familiar o comunitario"]',
  '1',
  'El botulismo es una Enfermedad de Declaración Obligatoria (EDO) urgente en España. La notificación debe realizarse de forma inmediata al diagnóstico de sospecha clínica, sin esperar la confirmación microbiológica (que tarda 15-20 días). La notificación precoz permite: identificar la fuente de exposición, evitar otros casos, y coordinar la obtención de antídoto con AEMPS. El caso sospechoso también activa el protocolo de alerta de salud pública.',
  ARRAY['enfermeria','farmacia'],
  false,
  '["¿Se puede esperar 15-20 días a la confirmación del CNM para notificar el caso?","¿Qué categoría de declaración tiene el botulismo en el sistema EDO español?"]',
  null,
  null
);

-- Q28 (MED+NUR): Criterios de alta hospitalaria
INSERT INTO questions (
  step_id, question_text, options, correct_option, explanation,
  roles, is_critical, hints, time_limit, critical_rationale
) VALUES (
  $STEP_ID_5,
  '¿Cuándo debe considerarse el alta hospitalaria en el botulismo del lactante?',
  '["Cuando el bioensayo en heces resulta negativo, confirmando la eliminación de la toxina","Cuando lleva 48 horas sin fiebre y los reactantes de fase aguda se normalizan","Cuando tolera alimentación oral completa, no requiere soporte respiratorio y la familia ha recibido educación detallada sobre signos de alarma y prevención","A los 30 días del inicio del tratamiento con antídoto, independientemente del estado clínico"]',
  '2',
  'Los criterios de alta en el botulismo del lactante son clínicos, no microbiológicos: tolerancia completa de la vía oral (al menos 24-48 horas), ausencia de soporte respiratorio, buen tono axial y seguimiento del entorno familiar. La negativización del bioensayo no es criterio de alta (puede tardar meses). La familia debe conocer los signos de alarma de recaída y la eliminación definitiva de la fuente de esporas del hogar.',
  ARRAY['medico','enfermeria'],
  false,
  '["¿Es necesario esperar la negativización del bioensayo para dar el alta?","¿Qué criterios funcionales garantizan que el lactante puede estar en casa de forma segura?"]',
  null,
  null
);

-- ─────────────────────────────────────────
-- 4. CASE BRIEF (usar $SCENARIO_ID)
-- ─────────────────────────────────────────
INSERT INTO case_briefs (
  id, scenario_id, title, context, chief_complaint, chips,
  history, triangle, vitals, exam, quick_labs, imaging, timeline,
  red_flags, objectives, competencies, critical_actions,
  learning_objective, level, estimated_minutes
)
VALUES (
  gen_random_uuid(),
  $SCENARIO_ID,
  'Botulismo del lactante: parálisis flácida descendente',
  'Urgencias pediátricas hospitalarias. Lactante de 2 meses traído por sus padres ante cuadro de debilidad progresiva de 3 días y llanto muy débil desde hace 24 horas.',
  'Lactante de 2 meses con hipotonía progresiva, ptosis bilateral y llanto casi inaudible desde hace 24 horas.',
  '["Ptosis bilateral","Hipotonía descendente","Estreñimiento 5 días","Exposición a infusión herbal"]',
  '{
    "Síntomas": ["Estreñimiento de 5 días de evolución (primer síntoma)", "Debilidad generalizada progresiva los últimos 3 días", "Ptosis bilateral y llanto muy débil desde hace 24 horas", "Dificultad para lactar referida por la madre"],
    "Antecedentes": "Lactante varón de 2 meses, nacido a término por parto vaginal. PN 3.120 g. Sin patología neonatal. Vacunación al día.",
    "Medicación previa": "Ninguna. La abuela materna administró infusión de manzanilla e hinojo (preparada en casa) hace 7 días por cólico del lactante.",
    "Alimentación": "Lactancia materna exclusiva, sin suplementos ni fórmula.",
    "Entorno": "Domicilio rural, sin exposición a otras sustancias. No contacto con otros enfermos."
  }',
  '{"appearance":"amber","breathing":"amber","circulation":"green"}',
  '{"fc":118,"fr":42,"sat":97,"temp":36.9,"peso":5}',
  '{
    "Neurológica": "Hipotonía axial marcada (head lag), reflejos tendinosos profundos presentes pero hiporreflexia generalizada. Reflejo de succión muy disminuido. Moro ausente. Pupilas midriáticas (5mm) con reflejo fotomotor lento bilateral.",
    "Oftalmológica": "Ptosis bilateral completa. Movimientos oculares limitados en todas las direcciones (oftalmoplejia). Lagoftalmos bilateral.",
    "Respiratoria": "Tiraje intercostal leve. Murmullo vesicular presente y simétrico. No crepitantes.",
    "Abdominal": "Distensión abdominal leve. Ruidos intestinales muy disminuidos. Sin masas. Sin hepatoesplenomegalia.",
    "Piel": "Relleno capilar <2s. No exantema. No petequias."
  }',
  '[{"name":"Glucemia capilar","value":"82 mg/dL"},{"name":"Hemograma urgente","value":"Leucocitos 9.200, sin desviación izquierda"},{"name":"PCR","value":"<5 mg/L (negativa)"},{"name":"Gasometría capilar","value":"pH 7.38, pCO2 40, HCO3 23, lactato 1.2"}]',
  '[{"name":"Rx tórax","status":"done"},{"name":"Ecografía abdominal","status":"recommended"},{"name":"TC craneal","status":"recommended"},{"name":"EMG/ENG urgente","status":"ordered"}]',
  '[{"t":-168,"evento":"Abuela administra infusión de manzanilla e hinojo por cólico"},{"t":-120,"evento":"Inicio de estreñimiento (5 días antes de la consulta)"},{"t":-72,"evento":"Aparece debilidad generalizada con hipotonía axial progresiva"},{"t":-24,"evento":"Ptosis bilateral y llanto casi inaudible"},{"t":0,"evento":"Llegada a Urgencias Pediátricas. TEP: appearance AMBER, breathing AMBER"}]',
  '[{"text":"Ptosis bilateral + midriasis fija en lactante sin fiebre: afectación de nervios craneales colinérgicos","correct":true},{"text":"Parálisis flácida descendente progresiva (inicio craneal → tronco → extremidades)","correct":true},{"text":"Estreñimiento previo de 5 días como primer síntoma autonómico","correct":true},{"text":"Exposición a infusión herbal casera en <12 meses (fuente de esporas de C. botulinum)","correct":true},{"text":"Ausencia de fiebre, ausencia de alteración de consciencia, sensibilidad conservada","correct":true}]',
  '{
    "MED": ["Reconocer el patrón clínico de botulismo del lactante (parálisis descendente + antecedente herbal)", "Establecer el diagnóstico diferencial con otras causas de hipotonía aguda neonatal", "Identificar los fármacos absolutamente contraindicados (aminoglucósidos, clindamicina, magnesio)", "Calcular la dosis correcta de BabyBIG (50 mg/kg dosis única) y gestionar su obtención urgente vía AEMPS"],
    "NUR": ["Reconocer los signos de deterioro respiratorio y aplicar el TEP sistemáticamente", "Monitorizar la progresión de la parálisis de forma estructurada (reflejos, tono, succión)", "Implementar la nutrición enteral por SNG con técnica segura", "Conocer los criterios de alta y la educación familiar sobre prevención"],
    "PHARM": ["Identificar los fármacos contraindicados en botulismo y alertar sobre prescripciones incorrectas", "Conocer la dosis pediátrica del BAT heptavalente (10% del vial en <1 año)", "Gestionar la solicitud urgente de BabyBIG como medicamento extranjero a través de AEMPS", "Preparar correctamente el antídoto según el protocolo de la Red de Antídotos SEFH"]
  }',
  '["Reconocimiento del patrón clínico de botulismo del lactante","Diagnóstico diferencial de hipotonía aguda neonatal","Manejo respiratorio de insuficiencia neuromuscular progresiva","Conocimiento de fármacos contraindicados","Obtención y dosificación correcta del antídoto específico","Prevención y educación familiar","Notificación epidemiológica urgente","Trabajo interprofesional en urgencias"]',
  '["NO administrar aminoglucósidos bajo ningún concepto","Calcular correctamente la dosis de BabyBIG: 50 mg/kg IV dosis única","Iniciar la solicitud urgente a AEMPS sin esperar confirmación microbiológica","Suspender vía oral ante pérdida del reflejo de deglución e iniciar SNG","Notificación inmediata como EDO urgente al diagnóstico de sospecha"]',
  'Diagnosticar y manejar el botulismo del lactante reconociendo el patrón clínico específico, los fármacos contraindicados y la obtención urgente del antídoto adecuado.',
  'avanzado',
  25
);

-- ─────────────────────────────────────────
-- 5. CASE RESOURCES (usar $SCENARIO_ID)
-- ─────────────────────────────────────────
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), $SCENARIO_ID,
   'Botulismo en el lactante. Pediatría Atención Primaria',
   'https://pap.es/articulo/13718/botulismo-en-el-lactante',
   'Pediatría Atención Primaria (PAP)', 'artículo', 2023, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Hipotonía aguda en el lactante: botulismo. Formación Activa en Pediatría de Atención Primaria (FAPAP)',
   'https://fapap.es/articulo/457/hipotonia-aguda-en-lactante-botulismo',
   'FAPAP', 'revisión', 2022, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Suero antibotulinico heptavalente BAT — Protocolo de uso. Red de Antídotos SEFH (actualización 2025)',
   'https://redantidotos.org/wp-content/uploads/2018/04/Suero-antibotulinico_Red-Antidotos_2025.pdf',
   'Red de Antídotos SEFH', 'protocolo', 2025, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Infant botulism: epidemiology, clinical features, and management (PubMed 36413169)',
   'https://pubmed.ncbi.nlm.nih.gov/36413169/',
   'Current Opinion in Pediatrics', 'revisión', 2023, false, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Botulismo del lactante. Anales de Pediatría',
   'https://www.analesdepediatria.org/es-botulismo-del-lactante-articulo-S1695403308701887',
   'Anales de Pediatría', 'artículo', 2008, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Botulism in infants, children and adolescents. UpToDate',
   'https://www.uptodate.com/contents/botulism-in-infants-children-and-adolescents',
   'UpToDate', 'revisión', 2024, false, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Infant Botulism: Epidemiology, Clinical Features, and Management. CDPH / California Department of Public Health',
   'https://www.cdph.ca.gov/Programs/CID/DCDC/Pages/InfantBotulism.aspx',
   'CDPH California', 'protocolo', 2024, true, now());

-- ══════════════════════════════════════════════════════════════════
-- CATEGORÍAS (ejecutar DESPUÉS de obtener el $SCENARIO_ID real)
-- Categorías sugeridas: Neurología + Infecciosas + Críticos + Urgencias
-- ══════════════════════════════════════════════════════════════════
-- INSERT INTO scenario_categories (scenario_id, category_id) VALUES
--   ($SCENARIO_ID, '9fd3d6f0-9c73-4a2f-a0ad-4e0fa8fa7312'), -- Neurología
--   ($SCENARIO_ID, '<ID_INFECCIOSAS>'),                       -- Infecciosas (verificar UUID)
--   ($SCENARIO_ID, 'cefb1f2c-c63d-47bf-99a6-50f4cac9d609'), -- Críticos
--   ($SCENARIO_ID, '4ab4cd3e-b448-4933-b7ab-db374da6b95c'); -- Urgencias

-- ══════════════════════════════════════════════════════════════════
-- VERIFICACIÓN ESPERADA
-- SELECT roles, COUNT(*) FROM questions WHERE step_id IN
--   (SELECT id FROM steps WHERE scenario_id = $SCENARIO_ID)
--   GROUP BY roles ORDER BY roles;
-- MED=18, NUR=14, PHARM=15, Critical=4
-- ══════════════════════════════════════════════════════════════════
