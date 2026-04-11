-- ══════════════════════════════════════════
-- ESCENARIO 28: SÍNDROME SEROTONINÉRGICO EN ADOLESCENTE POLITRATADO
-- Nivel: Avanzado | MED=18 | NUR=14 | PHARM=15 | Critical=5
-- Bibliografía: Boyer & Shannon NEJM 2005; Dunkley QJM 2003;
--               Chiew & Isbister Clin Toxicol 2025; Xue & Ickowicz JPPT 2021;
--               Mikkelsen Basic Clin Pharmacol Toxicol 2023
-- ══════════════════════════════════════════

-- ──────────────────────────────────────────
-- 1. SCENARIO
-- ──────────────────────────────────────────
INSERT INTO scenarios (title, summary, level, difficulty, mode, status, estimated_minutes, max_attempts)
VALUES (
  'Síndrome serotoninérgico en adolescente politratado',
  'Adolescente de 16 años con depresión y TDAH en tratamiento con sertralina y metilfenidato que acude a urgencias con agitación, temblor, hipertermia y rigidez muscular de 3 horas de evolución tras duplicar la dosis de sertralina. Caso centrado en el reconocimiento precoz, los criterios de Hunter, el diagnóstico diferencial y el tratamiento escalonado de la toxicidad serotoninérgica moderada-grave.',
  'avanzado',
  'Avanzado',
  ARRAY['online'],
  'En construcción: en proceso',
  25,
  3
) RETURNING id;
-- ⚠️ Guarda este ID como $SCENARIO_ID


-- ──────────────────────────────────────────
-- 2. STEPS
-- ──────────────────────────────────────────
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  ($SCENARIO_ID, 1, 'Sospecha en urgencias',
   'Valorar al adolescente de 16 años que acude con agitación, temblor y rigidez de 3 horas de evolución. Revisar el triángulo de evaluación pediátrica e identificar la combinación farmacológica causal. Establecer monitorización continua y acceso venoso periférico.',
   false, null),
  ($SCENARIO_ID, 2, 'Criterios Hunter y evaluación neurológica',
   'Aplicar los criterios de Hunter para confirmar el síndrome serotoninérgico y clasificar su gravedad. Explorar el sistema neuromuscular (clonus espontáneo, inducible y ocular, hiperreflexia, rigidez). Correlacionar con los hallazgos analíticos urgentes.',
   false, null),
  ($SCENARIO_ID, 3, 'Diagnóstico diferencial',
   'Establecer el diagnóstico diferencial frente al síndrome neuroléptico maligno y el toxídromo anticolinérgico. Identificar las interacciones farmacológicas causantes y los factores precipitantes del episodio.',
   false, null),
  ($SCENARIO_ID, 4, 'Tratamiento según gravedad',
   'Iniciar tratamiento escalonado: suspensión de agentes serotonérgicos, benzodiacepinas IV para agitación y rigidez, manejo activo de la hipertermia y planificación del soporte ventilatorio si no hay respuesta al tratamiento médico.',
   false, null),
  ($SCENARIO_ID, 5, 'Monitorización y prevención',
   'Monitorizar la evolución y los criterios de respuesta. Planificar el ingreso, ajustar el tratamiento psiquiátrico y desarrollar la educación sanitaria para prevenir recidivas.',
   false, null)
RETURNING id;
-- ⚠️ Guarda los IDs como $STEP_ID_1 ... $STEP_ID_5 (en orden de retorno)


-- ──────────────────────────────────────────
-- 3. QUESTIONS
-- ──────────────────────────────────────────
-- Distribución por rol:
--   MED  (18): Q1,Q2,Q3,Q4,Q6,Q7,Q9,Q12,Q13,Q14,Q18,Q19,Q20,Q23,Q24,Q27,Q28,Q32
--   NUR  (14): Q1,Q2,Q4,Q5,Q8,Q9,Q11,Q16,Q20,Q21,Q25,Q26,Q29,Q31
--   PHARM(15): Q1,Q3,Q9,Q10,Q14,Q15,Q16,Q17,Q19,Q22,Q24,Q28,Q29,Q30,Q32
-- Críticas (5): Q4, Q18, Q19, Q20, Q23


-- ━━━ PASO 1: Sospecha en urgencias ━━━

-- Q1: TEP — componentes alterados (ALL)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'El adolescente llega con agitación intensa, confusión, sudoración profusa, FC 118 lpm y TA 145/90 mmHg. FR 22 rpm, SpO2 98% con aire ambiente. Según el triángulo de evaluación pediátrica (TEP), ¿qué componentes están alterados?',
  '["Solo apariencia: agitación y confusión sin otros hallazgos",
    "Apariencia y circulación: agitación/confusión más taquicardia con diaforesis",
    "Los tres vértices: apariencia, trabajo respiratorio y circulación",
    "Solo circulación: taquicardia e hipertensión como hallazgos dominantes"]',
  '1',
  'El TEP muestra apariencia alterada (agitación, confusión) y circulación alterada (taquicardia 118, diaforesis, hipertensión). El trabajo respiratorio está conservado: FR 22 sin tiraje ni uso de musculatura accesoria. Este patrón TEP (apariencia + circulación sin compromiso respiratorio primario) es consistente con disfunción del SNC con respuesta simpática, característico del síndrome serotoninérgico moderado-grave.',
  ARRAY['medico','enfermeria','farmacia'],
  false,
  '["El TEP evalúa tres vértices: apariencia, trabajo respiratorio y circulación a distancia.", "La sudoración y la taquicardia son hallazgos de circulación en el TEP; la FR y el tiraje son de trabajo respiratorio."]',
  null,
  null
);

-- Q2: Tríada clásica SS (MED+NUR)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  '¿Cuál es la tríada clínica clásica del síndrome serotoninérgico que debe buscarse activamente en la exploración inicial?',
  '["Fiebre, rigidez en rueda dentada y bradicardia",
    "Alteración del estado mental, hiperactividad autonómica y anomalías neuromusculares",
    "Miosis, bradicardia y depresión respiratoria",
    "Hipertermia, midriasis y piel seca con íleo paralítico"]',
  '1',
  'La tríada clásica del SS (Boyer & Shannon, NEJM 2005) comprende: 1) alteración del estado mental (agitación, confusión, ansiedad), 2) hiperactividad autonómica (taquicardia, hipertermia, diaforesis, hipertensión) y 3) anomalías neuromusculares (temblor, clonus, hiperreflexia, rigidez). La opción A describe el síndrome neuroléptico maligno; la C el toxídromo opioide; la D el toxídromo anticolinérgico.',
  ARRAY['medico','enfermeria'],
  false,
  '["Piensa en tres sistemas afectados simultáneamente: mental, autonómico y neuromuscular.", "La rigidez en rueda dentada y la bradicardia son más propias del SNM, no del SS."]',
  null,
  null
);

-- Q3: Agente causal — mecanismo (MED+PHARM)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'El paciente toma sertralina 100 mg/día y metilfenidato 36 mg/día. Ayer duplicó la dosis de sertralina. ¿Por qué esta combinación aumenta el riesgo de síndrome serotoninérgico?',
  '["El metilfenidato inhibe CYP2D6, elevando los niveles plasmáticos de sertralina",
    "El metilfenidato aumenta la liberación sináptica de serotonina e inhibe su recaptación (bloqueo SERT aditivo), sumando efecto al bloqueo SERT de la sertralina",
    "La sertralina potencia los efectos dopaminérgicos del metilfenidato en el núcleo accumbens",
    "Ambos compiten por la glucoproteína-P intestinal, aumentando la biodisponibilidad de la sertralina"]',
  '1',
  'El metilfenidato inhibe los transportadores de dopamina (DAT), noradrenalina (NET) y serotonina (SERT), con efecto serotonérgico aditivo al bloqueo SERT de la sertralina. Al duplicar la dosis de sertralina se supera el umbral de toxicidad serotoninérgica. Esta combinación es una causa reconocida de SS en adolescentes con comorbilidad psiquiátrica (Xue & Ickowicz, JPPT 2021). La inhibición de CYP2D6 es un factor farmacocinético secundario y no el mecanismo principal.',
  ARRAY['medico','farmacia'],
  false,
  '["El metilfenidato no actúa solo sobre dopamina: también bloquea el transportador de serotonina (SERT).", "El mecanismo clave es la acumulación sináptica de serotonina por dos vías de bloqueo SERT simultáneas."]',
  null,
  null
);

-- Q4: Primera medida urgente — suspensión agentes (MED+NUR) CRÍTICA
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  '¿Cuál es la primera medida terapéutica prioritaria ante un síndrome serotoninérgico moderado-grave confirmado?',
  '["Administrar ciproheptadina oral como antagonista específico del receptor 5-HT2A",
    "Suspender de inmediato todos los agentes serotonérgicos",
    "Iniciar perfusión de haloperidol para controlar la agitación y la rigidez",
    "Administrar dantroleno IV para reducir la hipertermia y la rigidez muscular"]',
  '1',
  'La suspensión inmediata de todos los agentes serotonérgicos es la medida más urgente e imprescindible. Sin esta acción, el resto del tratamiento es insuficiente: el SS es autolimitado si se retiran los agentes causales, con resolución en 24-72h en la mayoría de los casos moderados. La ciproheptadina tiene evidencia muy limitada (series de casos) y solo existe en vía oral; el haloperidol puede precipitar un SNM superpuesto; el dantroleno es para el SNM, no para el SS.',
  ARRAY['medico','enfermeria'],
  true,
  '["¿Qué ocurre si se mantienen los agentes serotonérgicos mientras se aplican otras medidas?", "Antes de cualquier antídoto, el primer paso es eliminar la fuente del exceso de serotonina."]',
  90,
  'Mantener los agentes serotonérgicos sin suspenderlos provoca progresión a SS grave con hipertermia >41°C, rabdomiólisis masiva, insuficiencia renal aguda y muerte. Es el error con mayor impacto sobre la mortalidad en el síndrome serotoninérgico.'
);

-- Q5: Monitorización inicial prioritaria (NUR)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  '¿Qué monitorización es prioritaria en los primeros minutos tras la llegada del paciente con sospecha de síndrome serotoninérgico moderado?',
  '["Glucemia capilar y saturación de oxígeno exclusivamente",
    "Temperatura continua, FC, TA, SpO2, ritmo cardíaco y nivel de consciencia seriado",
    "EEG continuo para descartar status epiléptico no convulsivo",
    "Presión venosa central y diuresis horaria como marcadores de estabilidad hemodinámica"]',
  '1',
  'La monitorización básica prioritaria incluye: temperatura continua (la hipertermia es el marcador de gravedad más importante), FC y TA (hiperactividad autonómica), SpO2 (riesgo de insuficiencia respiratoria por rigidez muscular), ritmo cardíaco (arritmias) y nivel de consciencia seriado (deterioro neurológico). La temperatura es el parámetro crítico: si supera 39°C con rigidez que no cede a benzodiacepinas, se debe planificar intubación.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué constante vital puede alcanzar valores letales rápidamente en el SS y requiere vigilancia estrecha?", "La temperatura es el indicador de gravedad más importante en el síndrome serotoninérgico."]',
  null,
  null
);


-- ━━━ PASO 2: Criterios Hunter y evaluación neurológica ━━━

-- Q6: Aplicación criterios Hunter (MED)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'En la exploración neurológica se detecta clonus inducible bilateral en ambos tobillos, agitación marcada y diaforesis. El paciente ha sido expuesto a sertralina y metilfenidato. Según los criterios de Hunter, ¿se confirma el diagnóstico de síndrome serotoninérgico?',
  '["No: el clonus espontáneo es el único criterio confirmatorio en los criterios de Hunter",
    "Sí: clonus inducible más agitación o diaforesis cumple la segunda rama del árbol de Hunter",
    "No: se necesitan al menos 3 criterios de la escala de Sternbach modificada",
    "Sí, pero solo si la temperatura supera 38°C simultáneamente a los hallazgos neuromusculares"]',
  '1',
  'Los criterios de Hunter (Dunkley et al., QJM 2003) son los más validados para el diagnóstico de SS, con sensibilidad 84% y especificidad 97%. El árbol confirma SS si: 1) clonus espontáneo, o 2) clonus inducible/ocular + agitación o diaforesis, o 3) temblor + hiperreflexia, o 4) hipertonía + T >38°C + clonus ocular o inducible. Este paciente cumple la segunda rama: clonus inducible + agitación + diaforesis. No se requiere temperatura mínima para este criterio concreto.',
  ARRAY['medico'],
  false,
  '["Los criterios de Hunter tienen varias ramas diagnósticas, no un único criterio obligatorio.", "El clonus inducible puede ser suficiente si se acompaña de agitación o diaforesis."]',
  null,
  null
);

-- Q7: Clonus espontáneo como criterio único (MED)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  '¿Qué significado clínico tiene la presencia de clonus espontáneo de tobillo en un paciente con exposición reciente a agentes serotonérgicos?',
  '["Es un hallazgo inespecífico que puede verse en cualquier encefalopatía metabólica grave",
    "Confirma el síndrome serotoninérgico por sí solo, sin necesidad de otros criterios de Hunter",
    "Indica inicio de status epiléptico y requiere benzodiacepinas de inmediato como anticonvulsivante",
    "Es específico del síndrome neuroléptico maligno y orienta a retirar antipsicóticos"]',
  '1',
  'Según los criterios de Hunter, el clonus espontáneo de tobillo en un paciente con exposición a agentes serotonérgicos es suficiente para confirmar el diagnóstico de SS sin necesidad de otros hallazgos adicionales. Es el criterio con mayor especificidad dentro del árbol. No es una crisis comicial: en el SS el paciente suele mantener la consciencia y no presenta amnesia posictal. El clonus refleja hiperactividad de las vías serotoninérgicas espinales descendentes.',
  ARRAY['medico'],
  false,
  '["En el árbol de Hunter, ¿hay algún hallazgo que sea diagnóstico por sí solo?", "Distingue entre clonus (oscilación rítmica con estiramiento mantenido) y crisis comicial."]',
  null,
  null
);

-- Q8: Técnica exploración clonus inducible (NUR)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  '¿Cómo se explora correctamente el clonus inducible de tobillo durante la valoración neurológica?',
  '["Con el paciente en decúbito prono, se realizan percusiones repetidas en el tendón de Aquiles con martillo de reflejos",
    "Con el paciente en decúbito supino, se realiza una dorsiflexión brusca y mantenida del pie, observando oscilaciones rítmicas involuntarias",
    "Se aplica fricción en la planta del pie en dirección cefalocaudal y se observa respuesta extensora del primer dedo",
    "Se coloca el pie en flexión plantar máxima durante 30 segundos y se mide la frecuencia del temblor resultante"]',
  '1',
  'El clonus de tobillo se explora con el paciente en decúbito supino: se sostiene la pierna con una mano bajo la rodilla y con la otra se realiza una dorsiflexión brusca y mantenida del tobillo. Las oscilaciones rítmicas involuntarias (clonus) indican hiperreflexia espinal por exceso serotoninérgico. Más de 3-5 oscilaciones se considera clonus sostenido clínicamente significativo. La técnica descrita en la opción C corresponde al reflejo plantar (signo de Babinski).',
  ARRAY['enfermeria'],
  false,
  '["El clonus es una respuesta oscilatoria ante el estiramiento brusco y mantenido de un músculo.", "No confundas el reflejo plantar (Babinski) con la exploración del clonus."]',
  null,
  null
);

-- Q9: Clasificación de gravedad (ALL)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'Con temperatura 39.2°C, clonus inducible bilateral, agitación, diaforesis y TA 145/90 mmHg, ¿cómo se clasifica la gravedad de este síndrome serotoninérgico?',
  '["Leve: solo síntomas autonómicos sin anomalías neuromusculares significativas",
    "Moderado: anomalías neuromusculares con hipertermia <41°C y sin insuficiencia orgánica",
    "Grave: temperatura >41°C con rigidez extrema e insuficiencia orgánica establecida",
    "Grave: porque la agitación impide la exploración neurológica completa"]',
  '1',
  'La clasificación de gravedad del SS se basa en temperatura y anomalías neuromusculares. Moderado: T <41°C, clonus inducible u ocular, agitación, diaforesis, taquicardia, hipertensión. Grave: T >41°C, clonus espontáneo o rigidez extrema, insuficiencia orgánica (renal, coagulación). Este caso con T 39.2°C y clonus inducible es moderado-grave, con riesgo de progresión a grave si no se trata. La clasificación orienta directamente el escalón terapéutico.',
  ARRAY['medico','enfermeria','farmacia'],
  false,
  '["La temperatura de 41°C es el umbral que define el SS grave con riesgo vital inmediato.", "¿Existe insuficiencia orgánica establecida en este momento?"]',
  null,
  null
);

-- Q10: CPK elevada e implicación (PHARM)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'La analítica urgente muestra CPK 890 U/L (VR <170 U/L). ¿Qué implica este hallazgo en el SS y qué medida farmacológica indica de forma inmediata?',
  '["Indica daño miocárdico: iniciar monitorización ECG y valorar antiagregación",
    "Indica rabdomiólisis incipiente: hidratación IV agresiva (SSF 0.9%) para proteger la función renal",
    "Es un hallazgo esperable sin implicación clínica en el SS moderado",
    "Indica lesión hepática aguda: monitorizar transaminasas y evitar fármacos hepatotóxicos"]',
  '1',
  'La CPK elevada en el SS indica rabdomiólisis por actividad muscular excesiva y rigidez. La mioglobina liberada precipita en los túbulos renales produciendo insuficiencia renal aguda. La medida fundamental es hidratación IV agresiva con suero salino 0.9%, con objetivo de diuresis >1-2 mL/kg/h (>3 mL/kg/h si la orina es naranja-marrón por mioglobinuria). La CPK aislada sin clínica isquémica no indica daño miocárdico; las transaminasas pueden elevarse secundariamente pero no son la prioridad inmediata.',
  ARRAY['farmacia'],
  false,
  '["La CPK elevada con rigidez muscular apunta a un proceso de destrucción muscular.", "¿Qué órgano se ve amenazado cuando la mioglobina se filtra en los túbulos renales?"]',
  null,
  null
);

-- Q11: Umbral de temperatura para activar protocolo (NUR)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  '¿A partir de qué temperatura debe el personal de enfermería activar el protocolo de enfriamiento activo y avisar urgentemente para valorar intubación en un SS?',
  '["37.5°C, que ya indica activación autonómica y exige intervención",
    "38.5°C, que requiere antipirético inmediato y vigilancia",
    "39°C con rigidez muscular que no cede a benzodiacepinas",
    "41°C, umbral de gravedad máxima que confirma SS grave pero que permite medidas iniciales previas"]',
  '2',
  'En el SS, 39°C con rigidez muscular que no responde a benzodiacepinas es el umbral de activación del protocolo de enfriamiento activo urgente y valoración de intubación. Esperar a 41°C es demasiado tarde: a esa temperatura ya hay daño proteico celular directo, rabdomiólisis masiva y riesgo de CID y muerte. Los antipiréticos convencionales (paracetamol, ibuprofeno) no son eficaces porque la hipertermia no está mediada por prostaglandinas sino por termogénesis muscular.',
  ARRAY['enfermeria'],
  false,
  '["En el SS los antipiréticos convencionales no funcionan. ¿Por qué?", "¿Cuál es el umbral de temperatura que, junto a rigidez refractaria, obliga a medidas urgentes?"]',
  null,
  null
);


-- ━━━ PASO 3: Diagnóstico diferencial ━━━

-- Q12: SS vs SNM — diferencia temporal (MED)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿Cuál es la diferencia temporal más útil para distinguir el síndrome serotoninérgico del síndrome neuroléptico maligno en la práctica clínica?',
  '["El SS se instaura en horas (generalmente <24h) tras la exposición al agente; el SNM tarda días o semanas",
    "El SS dura más de 2 semanas; el SNM se resuelve en 24-48 horas",
    "El SS aparece solo con sobredosis masivas; el SNM con dosis terapéuticas habituales",
    "La diferencia temporal es irrelevante; el diagnóstico se basa exclusivamente en el fármaco implicado"]',
  '0',
  'El SS es de instauración rápida: la mayoría de los casos aparecen en las primeras 6 horas tras el inicio, la modificación de dosis o la adición del agente serotonérgico. El SNM es insidioso: se desarrolla a lo largo de días o semanas tras el inicio o el cambio de un antipsicótico. Este paciente con inicio en 3 horas tras duplicar la dosis de sertralina encaja plenamente en el perfil temporal del SS.',
  ARRAY['medico'],
  false,
  '["¿Cuánto tiempo ha transcurrido entre la modificación de la dosis de sertralina y el inicio de los síntomas?", "El SS es una emergencia farmacológica aguda; el SNM un proceso de instauración lenta."]',
  null,
  null
);

-- Q13: SS vs toxídromo anticolinérgico — hallazgo diferencial (MED)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿Qué hallazgo clínico diferencia mejor el síndrome serotoninérgico del toxídromo anticolinérgico?',
  '["La taquicardia: presente en el SS pero ausente en el toxídromo anticolinérgico",
    "El clonus y la hiperreflexia: presentes en el SS y ausentes en el toxídromo anticolinérgico",
    "La agitación: exclusiva del SS, no aparece en el toxídromo anticolinérgico",
    "La midriasis: presente en el SS y ausente en el toxídromo anticolinérgico"]',
  '1',
  'El clonus y la hiperreflexia son hallazgos neuromusculares específicos del SS que no aparecen en el toxídromo anticolinérgico. Ambos síndromes comparten taquicardia, hipertermia, agitación y midriasis. Los hallazgos que distinguen al anticolinérgico son: piel seca (anhidrosis), ruidos intestinales abolidos y ausencia de anomalías neuromusculares. La diaforesis también diferencia: presente en SS, ausente en anticolinérgico (que cursa con anhidrosis).',
  ARRAY['medico'],
  false,
  '["¿Qué tiene el SS a nivel neuromuscular que el anticolinérgico no tiene?", "La diaforesis (sudoración) es útil: ¿en cuál de los dos está presente y en cuál ausente?"]',
  null,
  null
);

-- Q14: Por qué NO haloperidol (MED+PHARM)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'Un residente propone haloperidol 5 mg IM para controlar la agitación. ¿Por qué esta decisión es incorrecta en el contexto del SS?',
  '["El haloperidol está contraindicado por prolongar el QTc en cualquier paciente agitado con taquicardia",
    "El haloperidol bloquea D2, reduce el umbral convulsivo y empeora la rigidez del SS",
    "El haloperidol no actúa sobre el mecanismo serotoninérgico y puede precipitar o enmascarar un SNM superpuesto, dificultando el diagnóstico diferencial",
    "El haloperidol aumenta la recaptación de serotonina y agrava directamente el exceso serotoninérgico"]',
  '2',
  'El haloperidol en el SS es problemático por dos razones principales: 1) no actúa sobre el mecanismo serotoninérgico subyacente, por lo que la agitación y la rigidez no se controlan eficazmente; 2) el bloqueo D2 puede inducir un componente de SNM o dificultar su diferenciación si el cuadro evoluciona. Las benzodiacepinas son el tratamiento de elección para la agitación en el SS porque actúan sobre GABA-A sin interferir con vías dopaminérgicas ni serotoninérgicas.',
  ARRAY['medico','farmacia'],
  false,
  '["¿El haloperidol actúa sobre el mecanismo causante del SS?", "¿Qué riesgo supone añadir un bloqueante D2 en un contexto de posible SS-SNM?"]',
  null,
  null
);

-- Q15: Mecanismo farmacodinámico SERT aditivo (PHARM)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'Desde el punto de vista farmacodinámico, ¿cuál es el mecanismo exacto por el que la combinación sertralina + metilfenidato aumenta el riesgo de SS?',
  '["Inhibición farmacocinética: el metilfenidato inhibe CYP2C19, que metaboliza la sertralina, elevando sus niveles",
    "Efecto aditivo sobre SERT: ambos fármacos bloquean el transportador de recaptación de serotonina de forma independiente, acumulando serotonina en la sinapsis",
    "El metilfenidato inhibe MAO-B, reduciendo la degradación de serotonina en la hendidura sináptica",
    "Sinergia en el receptor 5-HT2A postsináptico: ambos son agonistas directos de ese receptor"]',
  '1',
  'La sertralina bloquea SERT de forma primaria. El metilfenidato también bloquea SERT (además de DAT y NET), con efecto aditivo sobre la acumulación sináptica de serotonina. Aunque el metilfenidato tiene menor afinidad por SERT que la sertralina, la combinación de los dos junto a la duplicación de dosis supera el umbral de toxicidad. No hay inhibición MAO ni agonismo directo 5-HT2A en este mecanismo. La inhibición de CYP2C19 existe pero es un factor menor, no el mecanismo principal.',
  ARRAY['farmacia'],
  false,
  '["¿Cuál es el transportador clave que determina la concentración sináptica de serotonina?", "¿Actúa el metilfenidato sobre el SERT además del DAT?"]',
  null,
  null
);

-- Q16: Fármacos OTC con riesgo serotoninérgico (PHARM+NUR)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'El farmacéutico revisa la historia y pregunta por automedicación. ¿Cuál de los siguientes fármacos de venta libre (OTC) supone mayor riesgo de SS en un paciente con sertralina?',
  '["Ibuprofeno 600 mg",
    "Dextrometorfano (antitusivo presente en jarabes para la tos)",
    "Loratadina (antihistamínico de segunda generación)",
    "Omeprazol 20 mg"]',
  '1',
  'El dextrometorfano es un inhibidor débil de SERT y agonista de receptores sigma-1, con efecto serotonérgico aditivo al ISRS. Es especialmente peligroso porque se encuentra en jarabes para la tos de venta libre y los pacientes no lo identifican como medicamento con riesgo de interacción. Otros OTC con riesgo: tramadol (inhibidor SERT), hierba de San Juan (hipérico). El ibuprofeno, la loratadina y el omeprazol no tienen interacción serotoninérgica relevante.',
  ARRAY['farmacia','enfermeria'],
  false,
  '["¿Algún antitusivo tiene efecto sobre los transportadores de serotonina?", "Los pacientes no suelen notificar la toma de jarabes para la tos al médico prescriptor."]',
  null,
  null
);

-- Q17: Linezolid como IMAO (PHARM)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿Qué antibiótico de uso hospitalario tiene propiedades inhibidoras de MAO que pueden precipitar un SS grave si se combina con un ISRS?',
  '["Amoxicilina-clavulánico",
    "Linezolid",
    "Levofloxacino",
    "Metronidazol"]',
  '1',
  'El linezolid (oxazolidinona) es un inhibidor de MAO reversible no selectivo. Cuando se administra junto a un ISRS, puede precipitar SS grave incluso con dosis terapéuticas habituales de ambos. Esta interacción está recogida en ficha técnica y es una causa reconocida de SS en pacientes hospitalizados por infecciones graves (neumonía, pie diabético). Debe alertarse siempre que un paciente en tratamiento con ISRS vaya a recibir linezolid.',
  ARRAY['farmacia'],
  false,
  '["¿Qué antibiótico tiene un mecanismo de acción relacionado con las enzimas de degradación de monoaminas?", "Los inhibidores de MAO son el grupo farmacológico con mayor riesgo de desencadenar SS junto a ISRS."]',
  null,
  null
);


-- ━━━ PASO 4: Tratamiento según gravedad ━━━

-- Q18: Primera línea — benzodiacepinas (MED) CRÍTICA
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿Cuál es el fármaco de primera línea para controlar la agitación, la rigidez muscular y la hiperactividad autonómica en el SS moderado-grave?',
  '["Midazolam intranasal para sedación rápida sin necesidad de vía venosa",
    "Benzodiacepinas IV (diazepam o lorazepam), que reducen la excitabilidad central y la rigidez muscular sin actuar sobre vías serotoninérgicas",
    "Haloperidol IM como neuroléptico sedante de acción rápida",
    "Propofol en infusión continua como sedación de primera línea en urgencias"]',
  '1',
  'Las benzodiacepinas IV son el tratamiento de primera línea para el SS moderado-grave. Actúan sobre receptores GABA-A, reduciendo la excitabilidad neuronal sin interferir en vías serotoninérgicas ni dopaminérgicas. Controlan la agitación, reducen la rigidez muscular (y con ello la termogénesis) y atenúan la hiperactividad autonómica. El diazepam es preferible en urgencias por su perfil; el lorazepam es una alternativa válida. El haloperidol está contraindicado; el propofol es una opción de rescate si hay intubación.',
  ARRAY['medico'],
  true,
  '["Las benzodiacepinas actúan sobre GABA-A, no sobre serotonina. ¿Cómo controlan entonces la rigidez?", "Reducir la rigidez muscular con benzodiacepinas reduce directamente la termogénesis."]',
  90,
  'No tratar la agitación y la rigidez con benzodiacepinas lleva a progresión de la hipertermia por actividad muscular mantenida, con riesgo de rabdomiólisis masiva, insuficiencia renal aguda y muerte. El uso de antipsicóticos en su lugar puede precipitar un SNM superpuesto.'
);

-- Q19: Dosis diazepam IV en adolescente (MED+PHARM) CRÍTICA
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'Para un adolescente de 16 años y 60 kg con SS moderado-grave, ¿cuál es la dosis inicial correcta de diazepam IV?',
  '["0.01 mg/kg IV (0.6 mg): dosis de inicio en pediatría para minimizar depresión respiratoria",
    "0.1–0.3 mg/kg IV (6–18 mg), administrado lentamente a 1-2 mg/min, con dosis máxima de 10 mg por dosis",
    "0.5 mg/kg IV (30 mg): dosis de carga para sedación profunda inmediata",
    "2 mg/kg IV (120 mg): dosis de inducción anestésica en agitación extrema"]',
  '1',
  'La dosis estándar de diazepam IV para la agitación en el SS es 0.1–0.3 mg/kg por dosis (máximo 10 mg/dosis en adolescentes). Se administra lentamente (1-2 mg/min) para evitar depresión respiratoria. Para este paciente: 6-18 mg IV; habitualmente se inicia con 10 mg valorando respuesta. Puede repetirse cada 5-10 minutos según respuesta clínica, con monitorización estrecha de FR y nivel de consciencia. Dosis insuficiente no controla la rigidez; dosis excesiva sin monitorización puede causar apnea.',
  ARRAY['medico','farmacia'],
  true,
  '["¿Cuánto es 0.1-0.3 mg/kg para un paciente de 60 kg?", "¿Cuál es la dosis máxima por administración en un adolescente?"]',
  90,
  'Una dosis insuficiente de diazepam no controla la rigidez muscular, perpetuando la termogénesis y la progresión a SS grave. Una sobredosis sin monitorización provoca apnea. En ambos extremos existe riesgo vital.'
);

-- Q20: NO antipiréticos convencionales (MED+NUR) CRÍTICA
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'La temperatura es 39.2°C. Una enfermera propone administrar paracetamol 1 g IV para tratar la fiebre. ¿Es correcto?',
  '["Sí: el paracetamol IV es el antipirético de elección en adolescentes por su perfil de seguridad",
    "Sí: combinado con ibuprofeno oral para potenciar el efecto antipirético de forma escalonada",
    "No: la hipertermia del SS no está mediada por prostaglandinas, por lo que los antipiréticos convencionales no son eficaces",
    "No: el paracetamol interacciona con los ISRS y puede elevar los niveles plasmáticos de sertralina"]',
  '2',
  'La hipertermia del SS no está mediada por pirógenos ni prostaglandinas (mecanismo de la fiebre infecciosa), sino por termogénesis muscular excesiva (rigidez, clonus) y alteración del control hipotalámico por exceso serotoninérgico. Por ello, el paracetamol e ibuprofeno son ineficaces. El tratamiento correcto es el enfriamiento activo físico y el control de la rigidez con benzodiacepinas. Administrar antipiréticos convencionales retrasa las medidas eficaces y genera una falsa sensación de tratamiento.',
  ARRAY['medico','enfermeria'],
  true,
  '["¿La hipertermia del SS tiene el mismo mecanismo que la fiebre infecciosa?", "Los antipiréticos actúan sobre las prostaglandinas hipotalámicas. ¿Es ese el mecanismo de la hipertermia en el SS?"]',
  90,
  'Administrar antipiréticos en lugar de enfriamiento activo en el SS genera demora terapéutica mientras la temperatura sigue subiendo por termogénesis muscular. Si la temperatura supera 41°C, el daño proteico celular es irreversible y la mortalidad aumenta drásticamente.'
);

-- Q21: Técnica de enfriamiento activo (NUR)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'Se ha indicado enfriamiento activo para la hipertermia de 39.2°C. ¿Cuál es la técnica más adecuada en la fase inicial en urgencias?',
  '["Baño en agua helada (T <10°C) para lograr un descenso rápido de la temperatura central",
    "Paños húmedos fríos en axilas, ingles y cuello, ventilación con aire, y mantas de enfriamiento externo si disponibles",
    "Suero salino IV frío a 4°C en bolus de 20 mL/kg para enfriamiento interno",
    "Aplicación directa de hielo sobre tronco y extremidades para maximizar la transferencia de calor"]',
  '1',
  'El enfriamiento activo inicial recomendado incluye paños húmedos fríos en zonas de alta vasculatura (axilas, ingles, cuello), ventilación con aire y mantas de enfriamiento externo (si disponibles). El objetivo es bajar la temperatura por debajo de 38.5°C. El baño en agua helada puede causar vasoconstricción periférica paradójica que reduce la disipación de calor. El suero frío IV está reservado para hipotermia inducida en UCI. El hielo directo puede provocar lesiones dérmicas.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué técnicas de enfriamiento son seguras y eficaces en urgencias sin riesgo de vasoconstricción?", "El objetivo es eficiente pero gradual, no un descenso brusco."]',
  null,
  null
);

-- Q22: Ciproheptadina — indicación y limitaciones (PHARM)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'Respecto a la ciproheptadina en el tratamiento del síndrome serotoninérgico, ¿cuál de las siguientes afirmaciones es correcta?',
  '["Es el antídoto de elección en SS grave: debe administrarse IV en dosis de 0.1 mg/kg urgente",
    "Solo existe en formulación oral; su evidencia se basa en series de casos y no sustituye a las benzodiacepinas en el SS moderado-grave",
    "Antagoniza selectivamente el receptor 5-HT1A sin efecto sobre 5-HT2A, lo que la hace útil exclusivamente en SS leve",
    "Su uso está aprobado por la EMA como primera línea para el SS en pediatría"]',
  '1',
  'La ciproheptadina es un antihistamínico H1 con propiedades antagonistas de receptores 5-HT1A y 5-HT2A. Su evidencia en SS se limita a series de casos y reportes aislados, sin ensayos controlados. Solo existe en formulación oral, lo que limita su uso en pacientes agitados o sin vía enteral. La dosis en adolescentes es 4-8 mg VO, con un máximo de 0.5 mg/kg/día. Puede usarse como coadyuvante en SS leve-moderado, pero no sustituye al enfriamiento activo ni a las benzodiacepinas.',
  ARRAY['farmacia'],
  false,
  '["¿Existe presentación IV de ciproheptadina?", "¿En qué nivel de evidencia se basa su uso en el SS?"]',
  null,
  null
);

-- Q23: Criterios de intubación (MED) CRÍTICA
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿Cuáles son los criterios que indican la necesidad de intubación orotraqueal y parálisis neuromuscular en el SS?',
  '["Agitación que no cede con la primera dosis de benzodiacepinas",
    "Temperatura >38.5°C que no responde al primer ciclo de enfriamiento activo",
    "Temperatura >39-41°C con rigidez muscular extrema que no cede a benzodiacepinas o riesgo de insuficiencia respiratoria",
    "Cualquier episodio de clonus espontáneo, independientemente de la temperatura y la rigidez"]',
  '2',
  'La intubación y la parálisis neuromuscular están indicadas en el SS cuando: 1) la temperatura supera 39-41°C y no responde al enfriamiento activo + benzodiacepinas, 2) hay rigidez muscular extrema con riesgo de insuficiencia respiratoria, o 3) el paciente no protege la vía aérea. La parálisis neuromuscular elimina la termogénesis muscular, principal mecanismo de la hipertermia refractaria. No se intuba solo por agitación o clonus sin los criterios de temperatura y rigidez descritos.',
  ARRAY['medico'],
  true,
  '["La intubación en el SS sirve para eliminar la termogénesis muscular, no solo para proteger la vía aérea.", "¿Cuándo el tratamiento médico (benzodiacepinas + enfriamiento) es claramente insuficiente?"]',
  90,
  'No intubar a tiempo en SS grave con hipertermia >41°C y rigidez refractaria conduce a daño cerebral irreversible, rabdomiólisis masiva y muerte. La parálisis neuromuscular con rocuronio o vecuronio es la única forma eficaz de controlar la termogénesis muscular cuando las benzodiacepinas son insuficientes.'
);

-- Q24: Succinilcolina contraindicada en SS con rabdomiólisis (MED+PHARM)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'Si se decide intubar, ¿por qué está contraindicada la succinilcolina como bloqueante neuromuscular en este contexto?',
  '["Porque la succinilcolina prolonga el QTc y el SS ya cursa con taquicardia sinusal",
    "Porque la succinilcolina puede desencadenar hiperpotasemia grave en pacientes con rabdomiólisis, con riesgo de parada cardíaca",
    "Porque la succinilcolina interacciona con los ISRS y agrava directamente el exceso serotoninérgico",
    "Porque la succinilcolina está contraindicada de forma absoluta en menores de 18 años"]',
  '1',
  'La succinilcolina está contraindicada en el SS con rabdomiólisis por el riesgo de hiperpotasemia grave. En la rabdomiólisis, la activación de los receptores nicotínicos por succinilcolina libera potasio masivamente desde los miocitos dañados, pudiendo provocar hiperpotasemia fulminante y parada cardíaca. El bloqueante de elección es rocuronio (0.6-1.2 mg/kg IV), reversible con sugammadex si es necesario.',
  ARRAY['medico','farmacia'],
  false,
  '["¿Qué ocurre con los receptores nicotínicos en el músculo lesionado por rabdomiólisis?", "¿Qué electrolito libera el músculo dañado cuando se activan sus receptores nicotínicos con succinilcolina?"]',
  null,
  null
);

-- Q25: Monitorización enfermería durante benzodiacepinas IV (NUR)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'Durante la administración de diazepam IV, ¿cuál es el parámetro de monitorización de enfermería más crítico?',
  '["Control del ritmo cardíaco mediante ECG continuo para detectar arritmias inducidas por benzodiacepinas",
    "Vigilancia estrecha de la frecuencia respiratoria y el nivel de consciencia, con material de intubación preparado y accesible",
    "Medición de glucemia capilar cada 15 minutos por riesgo de hipoglucemia inducida por benzodiacepinas",
    "Control de la diuresis horaria para detectar retención urinaria por relajación del detrusor"]',
  '1',
  'Las benzodiacepinas IV pueden provocar depresión respiratoria, especialmente con dosis repetidas o en pacientes con fatiga muscular por rigidez previa. Enfermería debe monitorizar la FR, el nivel de consciencia y la SpO2 de forma continua durante y tras cada dosis. El material de intubación (carro de vía aérea difícil, bolsa-mascarilla, laringoscopio) debe estar listo y al alcance. La depresión respiratoria es el efecto adverso inmediato más grave de las benzodiacepinas IV en este contexto.',
  ARRAY['enfermeria'],
  false,
  '["¿Cuál es el efecto adverso más grave e inmediato de las benzodiacepinas IV?", "¿Qué parámetro vital se ve primero afectado por la depresión del SNC?"]',
  null,
  null
);


-- ━━━ PASO 5: Monitorización y prevención ━━━

-- Q26: Tiempo de resolución esperado (NUR)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  'Si el SS es moderado y se suspenden todos los agentes serotonérgicos con tratamiento adecuado, ¿en qué tiempo se espera habitualmente la resolución del cuadro?',
  '["12-24 horas en la mayoría de los casos",
    "24-72 horas habitualmente",
    "5-7 días, similar al síndrome neuroléptico maligno",
    "2-3 semanas si el ISRS tiene vida media larga como la fluoxetina"]',
  '1',
  'El SS moderado, una vez suspendidos los agentes causales y tratado adecuadamente, se resuelve en 24-72 horas en la mayoría de los casos. A diferencia del SNM (que puede durar 1-2 semanas por el bloqueo dopaminérgico prolongado), el SS depende de la eliminación del exceso serotoninérgico, más rápida. La sertralina tiene una semivida de ~26 horas, lo que orienta sobre la duración. La fluoxetina (t½ 1-4 días + metabolito activo con t½ 4-16 días) puede prolongar el cuadro considerablemente.',
  ARRAY['enfermeria'],
  false,
  '["¿Cuánto tarda en eliminarse la sertralina? ¿El SS dura tanto como el SNM?", "La semivida del fármaco causante orienta sobre la duración del exceso serotoninérgico."]',
  null,
  null
);

-- Q27: Criterios de ingreso en UCI (MED)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Cuáles son los criterios que justifican el ingreso en UCI pediátrica en un síndrome serotoninérgico?',
  '["Cualquier caso con temperatura >38°C o presencia de clonus inducible",
    "Temperatura >39°C con rigidez refractaria, insuficiencia respiratoria, inestabilidad hemodinámica o necesidad de ventilación mecánica",
    "Solo si hay insuficiencia renal establecida con creatinina >2 mg/dL",
    "Necesidad de más de 2 dosis de benzodiacepinas en urgencias, independientemente de la temperatura"]',
  '1',
  'Los criterios de ingreso en UCI en el SS incluyen: 1) temperatura >39-41°C refractaria al enfriamiento activo, 2) rigidez muscular que no cede a benzodiacepinas, 3) insuficiencia respiratoria o necesidad de intubación, 4) inestabilidad hemodinámica o 5) insuficiencia orgánica (renal, coagulación). La necesidad de más de 2 dosis de benzodiacepinas orienta hacia ingreso en observación hospitalaria, pero no es criterio de UCI por sí solo si el paciente está estable.',
  ARRAY['medico'],
  false,
  '["¿En qué situaciones el SS supera la capacidad de manejo en urgencias convencionales?", "La insuficiencia respiratoria o la necesidad de intubación son los criterios de mayor peso para UCI."]',
  null,
  null
);

-- Q28: Cuándo reiniciar ISRS (MED+PHARM)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Cuándo puede considerarse reiniciar el tratamiento antidepresivo (ISRS) tras un episodio de SS?',
  '["A las 24-48 horas, una vez que la temperatura se ha normalizado y el clonus ha desaparecido",
    "Nunca: los ISRS están contraindicados de forma permanente tras un episodio de SS",
    "No antes de 2 semanas desde la resolución completa, con reevaluación psiquiátrica y eliminación de los agentes serotonérgicos concomitantes no imprescindibles",
    "Inmediatamente con un ISRS de menor potencia para evitar la recaída depresiva durante el ingreso"]',
  '2',
  'Tras un SS, el reinicio del ISRS no debe considerarse antes de 2 semanas, con resolución clínica completa, reevaluación psiquiátrica de la indicación, revisión y deprescripción de todos los agentes serotonérgicos concomitantes no imprescindibles, y reinicio a la dosis mínima eficaz. El reinicio inmediato mantiene el riesgo de recidiva. El SS no contraindica el uso futuro de ISRS de forma absoluta, pero obliga a revisar la combinación farmacológica causante.',
  ARRAY['medico','farmacia'],
  false,
  '["¿Cuánto tiempo se necesita para que el cuadro esté resuelto de forma segura?", "¿El SS contraindica para siempre el uso de ISRS?"]',
  null,
  null
);

-- Q29: Educación sobre combinaciones peligrosas (PHARM+NUR)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  'Al dar el alta, ¿qué combinaciones farmacológicas debe identificar el paciente (o su familia) como potencialmente peligrosas al combinar con un ISRS?',
  '["Paracetamol, ibuprofeno y antihistamínicos de segunda generación",
    "Jarabes con dextrometorfano, tramadol, hierba de San Juan y antibióticos tipo linezolid",
    "Anticonceptivos orales, metformina y anticoagulantes orales directos",
    "Vitamina D, suplementos de hierro y calcio oral"]',
  '1',
  'Las combinaciones que deben conocer paciente y familia: jarabes para la tos con dextrometorfano (muy frecuentes en OTC), tramadol (analgésico con efecto SERT), hierba de San Juan (hipérico, serotonérgico de venta libre), linezolid (antibiótico hospitalario con propiedad IMAO) e IMAO clásicos (fenelzina, tranilcipromina). La clave es que el paciente informe siempre de su tratamiento con ISRS a cualquier prescriptor o farmacéutico, incluidos los de urgencias.',
  ARRAY['farmacia','enfermeria'],
  false,
  '["¿Cuál de estos grupos tiene mecanismo serotonérgico documentado?", "Recuerda los OTC que pueden ser serotonérgicos sin que el paciente lo identifique como medicamento con riesgo."]',
  null,
  null
);

-- Q30: Farmacovigilancia — obligación de notificación (PHARM)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Qué obligación de farmacovigilancia genera este episodio de síndrome serotoninérgico grave?',
  '["Ninguna: el SS es un efecto predecible de los ISRS y no requiere notificación formal",
    "Notificación al sistema de farmacovigilancia de la AEMPS (tarjeta amarilla), aplicable a cualquier profesional sanitario ante una RAM grave o inesperada",
    "La notificación es obligatoria solo si el SS fue mortal o requirió ventilación mecánica",
    "La obligación de notificación recae exclusivamente en el médico prescriptor del ISRS, no en el farmacéutico"]',
  '1',
  'En España, el sistema de notificación espontánea de la AEMPS (tarjeta amarilla, actualmente FEDRA online) permite y fomenta que cualquier profesional sanitario —incluido el farmacéutico— notifique RAM graves, inesperadas o de interés especial. El SS por interacción ISRS + metilfenidato es una RAM grave que debe notificarse para contribuir a la señal de seguridad del sistema. La notificación es voluntaria para profesionales (obligatoria para la industria), pero éticamente exigible ante RAM graves.',
  ARRAY['farmacia'],
  false,
  '["¿Qué sistema de notificación de reacciones adversas existe en España?", "¿Todos los profesionales sanitarios pueden (y deben) notificar una RAM grave?"]',
  null,
  null
);

-- Q31: Monitorización prioritaria en 24h — mioglobinuria (NUR)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  'Durante las primeras 24 horas de ingreso, ¿qué parámetro de enfermería tiene mayor prioridad para detectar complicaciones tardías del síndrome serotoninérgico?',
  '["Glucemia capilar horaria por riesgo de hipoglucemia reactiva post-hipertermia",
    "Diuresis horaria y color de la orina para detectar mioglobinuria por rabdomiólisis",
    "Frecuencia respiratoria exclusivamente para valorar el efecto residual de las benzodiacepinas",
    "Temperatura axilar cada 8 horas para confirmar la resolución de la hipertermia"]',
  '1',
  'La complicación tardía más grave del SS es la rabdomiólisis con mioglobinuria y fracaso renal agudo. La monitorización de la diuresis horaria y el color de la orina (naranja-marrón indica mioglobinuria) es la prioridad. Una diuresis <0.5 mL/kg/h con orina oscura obliga a aumentar la hidratación IV de inmediato. La temperatura también se monitoriza (cada 4h, no cada 8h), pero la detección de la mioglobinuria es la que puede cambiar la conducta con mayor urgencia.',
  ARRAY['enfermeria'],
  false,
  '["¿Qué complicación muscular del SS puede dañar el riñón de forma irreversible?", "¿Cómo se detecta la presencia de mioglobina en la orina sin analítica formal?"]',
  null,
  null
);

-- Q32: Estrategia de reinicio seguro del tratamiento (MED+PHARM)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  'Una vez resuelto el episodio, el psiquiatra plantea reiniciar el tratamiento de la depresión y el TDAH. ¿Cuál es la estrategia farmacológica más segura?',
  '["Reiniciar sertralina 100 mg/día con metilfenidato 18 mg/día (dosis reducida) bajo estrecha vigilancia ambulatoria",
    "Cambiar el ISRS a fluoxetina a dosis altas por su menor potencia serotonérgica relativa",
    "Reiniciar un solo agente a la dosis mínima eficaz, evaluar tolerabilidad y evitar combinaciones serotonérgicas no imprescindibles hasta confirmar seguridad",
    "Sustituir el ISRS por una benzodiacepina de liberación prolongada para el manejo a largo plazo de la depresión"]',
  '2',
  'La estrategia más segura tras un SS es: 1) reiniciar un solo agente a dosis mínima eficaz (el que aporte mayor beneficio psiquiátrico con menor riesgo serotoninérgico relativo), 2) evaluar tolerabilidad durante al menos 2 semanas antes de añadir un segundo agente serotonérgico, y 3) valorar con psiquiatría si la combinación ISRS + metilfenidato es imprescindible o si puede manejarse con monoterapia. Reiniciar la combinación a dosis reducida mantiene el riesgo; la fluoxetina no tiene menor potencia serotonérgica; las benzodiacepinas no tratan la depresión.',
  ARRAY['medico','farmacia'],
  false,
  '["¿La solución es solo reducir dosis o también revisar la necesidad de cada combinación?", "¿Puede el paciente prescindir de alguno de los dos agentes que causaron el SS?"]',
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
  'Síndrome serotoninérgico en adolescente politratado',
  'Urgencias pediátricas hospitalarias de tercer nivel',
  'Adolescente de 16 años con agitación, temblor, rigidez muscular e hipertermia de 3 horas de evolución.',
  '["Agitación e hiperactividad","Temblor y clonus","Hipertermia 39.2°C","Diaforesis profusa"]',
  '{
    "Síntomas": ["Agitación intensa de inicio brusco", "Temblor generalizado", "Rigidez muscular progresiva", "Diaforesis profusa", "Cefalea intensa"],
    "Antecedentes": "Depresión mayor diagnosticada hace 8 meses. TDAH diagnosticado hace 3 años. Sin otras patologías conocidas.",
    "Medicación previa": "Sertralina 100 mg/día (pauta de 6 semanas). Metilfenidato 36 mg/día (desde hace 3 años). Ayer duplicó dosis de sertralina a 200 mg sin indicación médica.",
    "Alergias": "No conocidas.",
    "Motivo de consulta": "Los padres refieren que desde hace 3 horas el adolescente está muy agitado, con temblor, sudoración y que le notan raro. En las últimas 2 horas ha desarrollado rigidez muscular y ha subido la fiebre.",
    "Antecedentes familiares": "Madre con depresión en tratamiento con venlafaxina."
  }',
  '{"appearance":"red","breathing":"green","circulation":"amber"}',
  '{"fc":118,"fr":22,"sat":98,"temp":39.2,"tas":145,"tad":90,"peso":60}',
  '{
    "Neurológico": "Agitación intensa, confusión moderada (GCS 13: O4V3M6). Pupilas midriáticas reactivas. Clonus inducible bilateral en tobillos (5-6 oscilaciones). Hiperreflexia generalizada (++/++++). Sin focalidad neurológica.",
    "Cutáneo": "Diaforesis profusa. Piel enrojecida y caliente. Sin exantema.",
    "Muscular": "Rigidez muscular en extremidades, predominio distal. Sin rigidez en rueda dentada."
  }',
  '[{"name":"Glucemia capilar","value":"108 mg/dL"},{"name":"CPK","value":"890 U/L (↑)"},{"name":"Creatinina","value":"0.9 mg/dL"},{"name":"Potasio","value":"3.8 mEq/L"},{"name":"Sodio","value":"140 mEq/L"},{"name":"Gasometría venosa","value":"pH 7.35, pCO2 43"}]',
  '[{"name":"ECG","status":"done"},{"name":"Orina (color)","status":"ordered"}]',
  '[{"t":-1440,"evento":"El adolescente duplica la dosis de sertralina (de 100 mg a 200 mg) sin consultar al médico"},{"t":-180,"evento":"Inicio brusco de agitación, temblor y diaforesis"},{"t":-60,"evento":"Aparece rigidez muscular e hipertermia progresiva"},{"t":0,"evento":"Llegada a urgencias pediátricas en ambulancia"}]',
  '[{"text":"Temperatura 39.2°C con rigidez muscular — umbral de enfriamiento activo urgente","correct":true},{"text":"Clonus inducible bilateral — criterio de Hunter para SS confirmado","correct":true},{"text":"Agitación con confusión (GCS 13) — alteración del estado mental","correct":true},{"text":"CPK 890 U/L — rabdomiólisis incipiente con riesgo renal","correct":true},{"text":"TA 145/90 + FC 118 — hiperactividad autonómica significativa","correct":true}]',
  '{
    "MED": ["Confirmar el diagnóstico de SS aplicando los criterios de Hunter", "Clasificar la gravedad del SS y decidir el escalón terapéutico", "Establecer diagnóstico diferencial frente a SNM y toxídromo anticolinérgico", "Indicar y dosificar correctamente benzodiacepinas IV", "Planificar criterios de intubación y bloqueante neuromuscular seguro"],
    "NUR": ["Reconocer la tríada clínica del SS en la valoración inicial", "Monitorizar temperatura y umbrales de alarma", "Aplicar técnica correcta de enfriamiento activo", "Vigilar depresión respiratoria durante la administración de benzodiacepinas IV", "Detectar mioglobinuria como complicación tardía"],
    "PHARM": ["Identificar la interacción farmacodinámica sertralina + metilfenidato", "Reconocer fármacos OTC y hospitalarios con riesgo serotoninérgico", "Dosificar correctamente diazepam IV en el adolescente", "Conocer las limitaciones de la ciproheptadina en el SS grave", "Elaborar un plan de seguridad farmacológica al alta"]
  }',
  '["Reconocimiento de toxídromos farmacológicos","Aplicación de criterios diagnósticos estructurados (Hunter)","Trabajo interprofesional en urgencias","Comunicación de riesgo y educación al alta","Farmacovigilancia y notificación de RAM"]',
  '["Suspender todos los agentes serotonérgicos de forma inmediata","Administrar benzodiacepinas IV (diazepam 0.1-0.3 mg/kg) para agitación y rigidez","Iniciar enfriamiento activo físico — NO antipiréticos convencionales","Planificar intubación con rocuronio (NO succinilcolina) si T >39-41°C con rigidez refractaria"]',
  'Reconocer el síndrome serotoninérgico mediante los criterios de Hunter, clasificar su gravedad y aplicar el tratamiento escalonado correcto: suspensión de agentes, benzodiacepinas IV y enfriamiento activo.',
  'avanzado',
  25
);


-- ──────────────────────────────────────────
-- 5. CASE RESOURCES
-- ──────────────────────────────────────────
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), $SCENARIO_ID,
   'The Serotonin Syndrome',
   'https://www.nejm.org/doi/10.1056/NEJMra041867',
   'New England Journal of Medicine',
   'revisión', 2005, false, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'The Hunter Serotonin Toxicity Criteria: simple and accurate diagnostic decision rules for serotonin toxicity',
   'https://pubmed.ncbi.nlm.nih.gov/12829679/',
   'QJM: An International Journal of Medicine',
   'artículo', 2003, false, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Serotonin toxicity: mechanisms and clinical features - an update',
   'https://pmc.ncbi.nlm.nih.gov/articles/PMC11862804/',
   'Clinical Toxicology',
   'revisión', 2025, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Serotonin Syndrome in Children and Adolescents Taking Psychotropic Medications',
   'https://pmc.ncbi.nlm.nih.gov/articles/PMC8315218/',
   'Journal of Pediatric Pharmacology and Therapeutics',
   'revisión', 2021, true, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Serotonin syndrome — A focused review',
   'https://pubmed.ncbi.nlm.nih.gov/37309284/',
   'Basic & Clinical Pharmacology & Toxicology',
   'revisión', 2023, false, now()),

  (gen_random_uuid(), $SCENARIO_ID,
   'Serotonin syndrome in adults — Management and prognosis (UpToDate)',
   'https://www.uptodate.com/contents/serotonin-syndrome-management-and-prognosis',
   'UpToDate',
   'revisión', 2024, false, now());
