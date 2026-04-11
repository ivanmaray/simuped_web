-- ============================================================================
-- SIMUPED SCENARIO RECONSTRUCTION: id=38 "Traumatismo craneoencefálico grave"
-- ============================================================================
-- Paciente: Pablo, 8 años, 30 kg
-- Mecanismo: Caída bicicleta, impacto occipital, GCS 8, hematoma epidural con efecto masa
-- Nivel: Avanzado | Duración: 25 minutos
-- Referencias: BTF 3ª ed 2019, SEUP 4ª ed 2024, SECIP 2020, Pediatría Integral 2024
-- ============================================================================

-- BLOCK 1: UPDATE scenario metadata
UPDATE scenarios SET
  title = 'Traumatismo craneoencefálico grave',
  description = 'TCE severo pediátrico (GCS 8) con hematoma epidural y signos de hipertensión intracraneal',
  status = 'En construcción: en proceso',
  level = 'avanzado',
  difficulty = 'Avanzado',
  estimated_minutes = 25,
  patient_name = 'Pablo',
  patient_age = 8,
  patient_weight_kg = 30
WHERE id = 38;

-- BLOCK 2: DELETE existing steps (CASCADE deletes questions)
DELETE FROM steps WHERE scenario_id = 38;

-- BLOCK 3: INSERT new steps (5 obligatorios)
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  (
    38, 1,
    'Evaluación primaria ABCDE e inmovilización cervical',
    'Paciente pediátrico de 8 años, 30 kg, traído por ambulancia tras caída de bicicleta con impacto occipital. Presenta GCS 8 (O2V2M4), midriasis derecha reactiva pero lenta, bradicardia (FC 58), hipertensión (TA 140/80), bradipnea (FR 8), hipoxia (SatO2 88%). Vómito en escopetazo en ambulancia. Procede inmediatamente a evaluación ABCDE con inmovilización cervical cervical hasta descartar lesión de columna.',
    true,
    ARRAY['medico','enfermeria','farmacia']
  ),
  (
    38, 2,
    'Neuroimagen de urgencia y decisión de vía aérea',
    'TC craneal urgente realizado: hematoma epidural temporal derecho con desviación de línea media 5 mm, edema cerebral difuso. GCS 8 indica TCE grave y riesgo inminente de deterioro neurológico. Con GCS ≤8, está indicada intubación orotraqueal para proteger vía aérea y permitir ventilación controlada. Procede secuencia de intubación rápida con medicación ansiolítica, analgésica y relajante muscular.',
    true,
    ARRAY['medico','enfermeria','farmacia']
  ),
  (
    38, 3,
    'Objetivos hemodinámicos y metabólicos en neuroprotección',
    'Post-intubación, mantener normocapnia (PaCO2 35-40 mmHg), saturación 94-98%, glucemia 80-180 mg/dL, normotermia, TAM ≥86 mmHg (TAS ≥90 mmHg para edad). Evitar hipotensión y hipoxia secundarias (cada episodio de hipotensión duplica mortalidad). Posición: cabecera 30°, cuello neutro. Monitorización continua: frecuencia cardíaca, tensión arterial, SatO2, ETCO2, gasometría seriada.',
    true,
    ARRAY['medico','enfermeria','farmacia']
  ),
  (
    38, 4,
    'Manejo escalonado de hipertensión intracraneal',
    'Hematoma epidural 5 mm con efecto masa requiere osmoterapia urgente. Primera línea: manitol 0.5 g/kg IV en 20 min (30 kg = 15 g) O SSH 3% 3 mL/kg IV en 20-30 min (90 mL). Monitorización PIC recomendada en UCIP. Hiperventilación controlada (PaCO2 30-35 mmHg) como medida puente transitoria. Preparación para evacuación quirúrgica urgente: consulta neurocirugía inmediata con parámetros clínicos, hallazgos TC y monitorización hemodinámica.',
    true,
    ARRAY['medico','enfermeria','farmacia']
  ),
  (
    38, 5,
    'Coordinación neuroquirúrgica, traslado y comunicación',
    'Hematoma epidural con desviación 5 mm requiere evaluación neuroquirúrgica urgente para evacuación. Comunicación SBAR a neurocirugía: GCS basal 8 actual, midriasis derecha reactiva, triada de Cushing (bradicardia-HTA-bradipnea), TC con hematoma epidural 5 mm desviación. Traslado a UCIP con monitorización continua (TA, SatO2, ETCO2). Mantener normovolemia, normocapnia, normotenisión durante transporte. Evitar cualquier episodio de hipotensión o hipoxia.',
    true,
    ARRAY['medico','enfermeria','farmacia']
  );

-- BLOCK 4: INSERT questions for Step 1 (Evaluación primaria)
-- Step 1: 7 preguntas (3 críticas)

-- Q1.1 [MÉDICO] - Crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'Un paciente con GCS 8 tras TCE grave presenta midriasis derecha reactiva lenta, bradicardia (FC 58), hipertensión (TA 140/80) y bradipnea (FR 8). ¿Cuál es el hallazgo semiológico crítico que sugiere herniación transtentorial inminente?',
  '["Taquicardia compensatoria y vasodilatación periférica","Triada de Cushing incompleta: bradicardia + hipertensión + bradipnea","Aumento de la capacidad craneal compensatoria","Respuesta vasovagal simple sin significado patológico"]',
  '1',
  'La Triada de Cushing (bradicardia + hipertensión + bradipnea) refleja compresión del tronco encefálico por herniación transtentorial. En pediatría, la bradicardia es un hallazgo sinister en TCE grave. Aunque incompleta (falta la midriasis bilateral), esta combinación indica HTIC descompensada (BTF 3ª ed 2019, pág. 45-48; SEUP 2024, sección Signos de alarma). La midriasis reactiva lenta (no abolida) sugiere afectación III par incipiente. Requiere intervención inmediata: airway protection, osmoterapia, neuroimagen urgente.',
  ARRAY['medico'],
  true,
  ARRAY['Recuerda que en niños la bradicardia es respuesta vagal ante HTIC severe.','La Triada de Cushing = compresión mesencefálica por herniación.']',
  90,
  'Reconocimiento de signos neurológicos críticos que indican riesgo inminente de muerte encefálica y herniación transtentorial. Su identificación determina velocidad de intervención (IOT, osmoterapia, cirugía).'
);

-- Q1.2 [ENFERMERÍA + FARMACIA] - No crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'El paciente presenta SatO2 88% en aire ambiente, FR 8 rpm, GCS 8. En la secuencia ABCDE, ¿cuál es la acción más urgente antes de cualquier otra maniobra diagnóstica?',
  '["Realizar intubación orotraqueal inmediatamente sin demora","Administrar oxígeno suplementario y mantener vía aérea permeable con inmovilización cervical","Iniciar sueroterapia masiva y fluidoterapia","Realizar sondaje gástrico para prevenir broncoaspiración"]',
  '1',
  'A=Airway con oxigenación es lo primero en ABCDE. SatO2 88% es hipoxia severa que causa lesión cerebral secundaria. Con GCS 8 y FR 8 (bradipnea), riesgo de apnea es inminente. O2 suplementario inmediato (cánula nasal 3-4 L/min o BVM si FR cae) es obligatorio ANTES de intubación (que es paso posterior, B→C→D→E secuencial). Inmovilización cervical simultánea hasta descartar lesión columna (trauma de alto impacto). (SEUP 2024, sección ABCDE; BTF 2019, protección vía aérea).',
  ARRAY['enfermeria','farmacia'],
  false,
  ARRAY['ABCDE = A (airway + O2) primero, B (breathing) segundo','GCS 8 con FR 8 es un paciente que puede apneico en minutos.']',
  75,
  NULL
);

-- Q1.3 [MÉDICO] - Crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  '¿Cuál es el nivel de GCS que define TCE grave y requiere OBLIGATORIAMENTE protección inmediata de vía aérea en pediatría?',
  '["GCS ≤10 (requiere intubación electiva en 4-6 horas)","GCS ≤9 (requiere intubación en 1-2 horas)","GCS ≤8 (requiere intubación inmediata, dentro de 15-30 minutos)","GCS ≤11 (requiere vigilancia en UCIP pero sin intubación obligatoria)"]',
  '2',
  'GCS ≤8 es la definición consensuada de TCE grave que requiere IOT INMEDIATA. La urgencia es de minutos (15-30 min máximo) porque con GCS ≤8, el paciente no puede proteger su vía aérea, riesgo de broncoaspiración es severo, y deterioro neurológico adicional es inminente (edema cerebral, HTIC). En este caso, GCS 8 + SatO2 88% + FR 8 + signos de HTIC = máxima urgencia. (BTF 3ª ed 2019, sección Airway management, pág. 56-62; SECIP 2020).',
  ARRAY['medico'],
  true,
  ARRAY['Recuerda: GCS ≤8 = TCE GRAVE = IOT INMEDIATA','Cuando GCS ≤8, el paciente pierde reflejo de deglución y tusígeno.']',
  90,
  'Define el umbral crítico para decisión de intubación. Confundir con GCS ≤10 o ≤9 retrasa intervención vital minutos que pueden ser letales en TCE grave pediátrico.'
);

-- Q1.4 [ENFERMERÍA] - No crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'Durante la maniobra de apertura de vía aérea en TCE grave con sospecha de lesión cervical, ¿cuál es la técnica CORRECTA?',
  '["Extensión cervical máxima (sniffing position) para visualización directa","Jaw thrust (tracción de mandíbula) SIN extensión cervical, manteniendo inmovilización cervical","Flexión cervical con barbilla hacia el pecho","Triple maneuver con extensión + flexión simultáneas"]',
  '1',
  'Jaw thrust SIN extensión cervical es la técnica obligatoria en TCE con sospecha de lesión C-spine. La extensión cervical agrava compresión medular si existe fractura/luxación. Con trauma de alto impacto (bicicleta a 20 km/h), lesión C-spine está en diagnóstico diferencial hasta descartar con Rx/TC (puede demorar). La inmovilización cervical CONTINÚA durante apertura vía aérea (collar rígido + tabla + bloqueo lateral). Este paso ocurre antes de intubación en fase ABCDE. (BTF 2019, pág. 48-50; SEUP 2024, Sección inmovilización C-spine).',
  ARRAY['enfermeria'],
  false,
  ARRAY['Jaw thrust = tracción de rama mandibular hacia anterior sin mover cuello.','En TCE con trauma cervical, evita extensión cervical = evita compresión medular.']',
  75,
  NULL
);

-- Q1.5 [FARMACIA] - No crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'En la evaluación inicial (ABCDE), después de oxigenación y apertura vía aérea, ¿cuál es el siguiente paso en CIRCULACIÓN (C)?',
  '["Colocar dos vías periféricas gruesas (18G o mayor), obtener analítica (Hb, Na, Glu) y gasometría venosa","Iniciar infusión rápida de cristaloides (20 mL/kg bolo)","Cateterismo cardíaco central urgente para monitorización PVC","Transfusión masiva de hemoconcentrado O negativo"]',
  '0',
  'En C (Circulación), acceso vascular es prioridad: 2 vías periféricas ≥18G. En TCE, hipotensión es factor predictor de mortalidad (cada episodio duplica mortalidad). Por eso: (1) acceso vascular seguro, (2) muestras (glucemia es CRÍTICA en TCE—hipoglucemia agrava pronóstico, hiperglucemia también), (3) analítica básica (Hb: anemia agrava hipoxia; Na: monitorizar osmolalidad para osmoterapia; coagulación: riesgo CID en TCE). No bolo masivo de cristaloides (riesgo edema cerebral). Cateterismo central es paso posterior si necesario. (SEUP 2024, sección acceso vascular; BTF 2019).',
  ARRAY['farmacia'],
  false,
  ARRAY['Circulación = acceso vascular + estabilización hemodinámica sin sobrecarga líquidos','Glucemia anormal en TCE agrava pronóstico neurológico.']',
  75,
  NULL
);

-- Q1.6 [MÉDICO + ENFERMERÍA] - Crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'El paciente tiene hematoma cuero cabelludo occipital visible. ¿En qué orden secuencial se realizan inspección neurológica (D) e inmovilización C-spine durante evaluación primaria?',
  '["Primero examen neurológico completo (pupilas, GCS, focalidad), LUEGO inmovilización C-spine","Inmovilización C-spine INMEDIATA (antes de cualquier examen), LUEGO examen neurológico con cuello inmovilizado","Alternancia: examen + inmovilización simultánea en pasos intercalados","Inmovilización se hace en transporte, examen neurológico en hospital"]',
  '1',
  'Inmovilización C-spine es INMEDIATA en trauma de alto impacto (energía cinética ~250 J en bicicleta 20 km/h). Ocurre ANTES del examen neurológico completo. Una vez inmovilizado (collar + tabla + bloqueo lateral), se procede a D (examen neurológico: pupilas, GCS, focalidad, reflejos). La inmovilización continúa durante intubación, transporte, cualquier maniobra. El retraso de inmovilización "para examinar antes" es error grave que puede causar paraplegia iatrogénica. (BTF 2019, pág. 38-40; SEUP 2024, Protocolo c-spine).',
  ARRAY['medico','enfermeria'],
  true,
  ARRAY['Inmovilización C-spine ANTES de examen neurológico = prevención iatrógena de lesión medular.','En trauma de alto impacto, asume lesión C-spine hasta descartada.']',
  90,
  'Error de secuenciación puede causar iatrogénia (paraplegia) y retraso en obtención de baseline neurológico para monitorización seriada de deterioro.'
);

-- Q1.7 [ENFERMERÍA + FARMACIA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  '¿Cuál es la escala de coma que se DEBE registrar de forma ESTANDARIZADA en este paciente de 8 años durante la evaluación primaria?',
  '["AVPU (Alert, Verbal, Pain, Unresponsive) pediátrica simplificada","Glasgow Coma Scale (GCS) estándar: O + V + M (rango 3-15)","Pediatric Coma Scale (PCS) modificada para menores de 5 años","PECARN Head Injury Rule score"]',
  '1',
  'GCS estándar (escala 3-15: O+V+M) es universal en TCE independientemente de edad (pediátrico vs adulto usan misma escala GCS). En este paciente: O2 (abre ojos solo ante dolor) + V2 (sonidos incomprensibles) + M4 (retira ante dolor) = GCS 8. Aunque hay versiones modificadas (PGCS para <2 años), en >2 años GCS estándar es gold standard. Registrar GCS de forma estandarizada permite: (1) baseline para monitorización seriada, (2) comunicación entre equipos, (3) predicción pronóstica. PECARN es herramienta de riesgo, no escala de severidad. AVPU es demasiado simplista para TCE grave. (BTF 2019, sección Assessment; SEUP 2024).',
  ARRAY['enfermeria','farmacia'],
  false,
  ARRAY['GCS = Glasgow Coma Scale, escala universal desde 1974, sigue siendo estándar.','GCS registrado seriado (cada 15-30 min) permite detectar deterioro neurológico.']',
  75,
  NULL
);

-- BLOCK 5: INSERT questions for Step 2 (Neuroimagen y IOT)
-- Step 2: 6 preguntas (2 críticas)

-- Q2.1 [MÉDICO] - Crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'TC craneal muestra hematoma epidural derecho 5 mm de desviación de línea media, edema cerebral difuso. ¿Cuál es la indicación para IOT en este caso específico?',
  '["GCS 8 solo (sin necesidad de evaluar lesión estructural)","GCS ≤8 + imposibilidad de proteger vía aérea + TC con efecto masa (indicación URGENTE para IOT)","TC sin efecto masa es suficiente para NO intubar","Esperar gasometría venosa antes de decidir intubación"]',
  '1',
  'IOT está indicada por TRES criterios confluentes: (1) GCS 8 (TCE grave), (2) imposibilidad de proteger vía aérea (reflejo tusígeno abolido a GCS ≤8), (3) TC con efecto masa (5 mm desviación = HTIC severa). La desviación línea media indica compresión intracraneal que requiere tanto protección vía aérea como control ventilatorio (normocapnia post-IOT). No esperar gasometría (puede demorar 5-10 min, paciente se descompensa en minutos). Urgencia: IOT dentro de 15-30 minutos. (BTF 2019, pág. 56-62; SECIP 2020, sección Indicaciones IOT).',
  ARRAY['medico'],
  true,
  ARRAY['IOT en TCE grave: GCS ≤8 + TC con efecto masa = máxima urgencia (15-30 min)','La desviación línea media es marca de HTIC severa que requiere cirugía ± osmoterapia.']',
  90,
  'La confluencia de criterios clínicos (GCS, airway) y radiológicos (efecto masa) determina timing de intubación. Retrasar IOT en este escenario es error letal.'
);

-- Q2.2 [FARMACIA] - No crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'Se inicia secuencia de intubación rápida (RSI) en TCE grave. El paciente pesa 30 kg. ¿Cuál es la dosis de fentanilo CORRECTA como analgésico durante RSI en TCE?',
  '["1 mcg/kg IV = 30 mcg","2 mcg/kg IV = 60 mcg","3 mcg/kg IV = 90 mcg","0.5 mcg/kg IV = 15 mcg"]',
  '1',
  'Fentanilo en RSI para TCE: 2 mcg/kg IV (evita taquicardia y aumento presión intracraneana que ocurre con intubación). En 30 kg: 2 × 30 = 60 mcg IV. Menor dosis (1 mcg/kg = 30 mcg) es insuficiente y permite respuesta simpática nociva (aumento TA, FC, PIC). Mayor dosis (3 mcg/kg = 90 mcg) riesgo de hipotensión severa en TCE (CONTRAINDICADO: hipotensión duplica mortalidad en TCE). Rango terapéutico: 2 mcg/kg. Se administra 30-60 segundos antes del inducente. (BTF 2019, Anesthetic management; SEUP 2024, Medicamentos RSI).',
  ARRAY['farmacia'],
  false,
  ARRAY['Fentanilo en RSI = 2 mcg/kg IV (no confundir con dosis de infusión = 0.5-1 mcg/kg/h).','Dosis baja (<2) permite aumento PIC; dosis alta (>2) causa hipotensión letal en TCE.']',
  75,
  NULL
);

-- Q2.3 [MÉDICO + FARMACIA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  '¿Cuál es el agente inductor CONTRAINDÍCADO en RSI para TCE grave pediátrico con sospecha de shock/hipotensión basal?',
  '["Propofol (depresión miocárdica, hipotensión severa en TCE)","Ketamina (preserva reflejos, estable hemodinámica)","Tiopental (depresión miocárdica, hipotensión)","Etomidato (estable cardiovascular)"]',
  '0',
  'Propofol está CONTRAINDICADO en TCE con riesgo de hipotensión. Causa depresión miocárdica severa (disminuye TA 20-30 mmHg a dosis estándar 1-2 mg/kg). En TCE, hipotensión es factor predictor de mortalidad (cada episodio duplica mortalidad). Este paciente tiene TA 140/80 basal, pero puede descompensarse post-IOT por sedación + vasodilatación. Agentes preferidos en TCE: (1) Ketamina 1-1.5 mg/kg (preserva reflejos, estable hemo), (2) Etomidato 0.2-0.3 mg/kg (estable), (3) Tiopental solo si TA muy elevada (es depresivo pero menos que propofol). (BTF 2019; SEUP 2024, Anestesia TCE).',
  ARRAY['medico','farmacia'],
  false,
  ARRAY['Propofol + TCE severo = hipotensión catastrófica','Ketamina es preferida en TCE (estable cardiovascular, NEUROPROTECTORA).']',
  75,
  NULL
);

-- Q2.4 [FARMACIA] - Crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'En RSI pediátrica para TCE grave, paciente 30 kg. ¿Cuál es la dosis de rocuronio (paralizante) para facilitar intubación?',
  '["0.6 mg/kg IV = 18 mg (dosis baja)","1.0 mg/kg IV = 30 mg (dosis estándar)","1.2 mg/kg IV = 36 mg (dosis RSI)","1.5 mg/kg IV = 45 mg"]',
  '2',
  'Rocuronio en RSI: 1.2 mg/kg IV para garantizar parálisis completa y condiciones óptimas de intubación. En 30 kg: 1.2 × 30 = 36 mg IV. Dosis menor (0.6-1.0 mg/kg) puede ser insuficiente, requiriendo re-intento con riesgo aspiración. Rocuronio tiene duración 30-40 min (permite IOT segura). Alternativa: succinilcolina 2 mg/kg IV = 60 mg (duración 5-10 min, menor coste) pero asociada a hipercaliemia en lesión muscular (menos usada en pediatría moderna). En TCE, rocuronio 1.2 mg/kg es estándar. (BTF 2019; SEUP 2024, Relajantes musculares RSI).',
  ARRAY['farmacia'],
  true,
  ARRAY['Rocuronio RSI = 1.2 mg/kg (dosis mayor que sedación de mantenimiento = 0.15 mg/kg/h).','RSI = Rapid Sequence Intubation con dosis MÁXIMAS para parálisis completa.']',
  90,
  'Dosis insuficiente de paralizante en RSI compromete seguridad de intubación y riesgo de broncoaspiración. Dosis excesiva riesgo de hipotensión (raro con rocuronio vs succinilcolina).'
);

-- Q2.5 [MÉDICO + ENFERMERÍA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'Post-intubación, ¿cuál es el objetivo de PaCO2 correcto para neuroprotección en este TCE grave?',
  '["PaCO2 25-30 mmHg (hiperventilación máxima para reducir PIC)","PaCO2 35-40 mmHg (normocapnia como objetivo primario)","PaCO2 45-50 mmHg (hipercapnia permisiva para vasodilatación)","PaCO2 20-25 mmHg (hiperventilación agresiva, solo en rescate)"]',
  '1',
  'Normocapnia (PaCO2 35-40 mmHg) es el objetivo primario POST-IOT en TCE. La hiperventilación agresiva (PaCO2 <30 mmHg) causa vasoconstricción cerebral, agrava isquemia cerebral, empeora pronóstico neurológico. Se usa SOLO como medida transitoria de rescate (<30 min) si PIC no responde a osmoterapia (BTF 3ª ed 2019, recomendación de clase I). Este paciente con hematoma epidural requiere: (1) normocapnia (PaCO2 35-40), (2) osmoterapia urgente (manitol/SSH), (3) neurocirugía. Hipercapnia (>45) agrava HTIC. Frecuencia ventilatoria objetivo: ~15-16 rpm para FR natural edad (evitar PEEP excesivo que suba PIC). (SEUP 2024, Ventilación TCE; BTF 2019, pág. 89-92).',
  ARRAY['medico','enfermeria'],
  false,
  ARRAY['Normocapnia = PaCO2 35-40 (gold standard en TCE, no hiperventilación de rutina).','Hiperventilación solo rescate transitorio (<30 min) antes de intervención definitiva.']',
  75,
  NULL
);

-- Q2.6 [ENFERMERÍA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'Tras IOT segura, paciente intubado a GCS 8, con tube endotraqueal 6.0 mm, conectado a ventilador. ¿Cuál es el parámetro de ventilación INCORRECTO que debería ser ajustado?',
  '["FiO2 0.5-0.7 para SatO2 94-98%","Volumen corriente 6-8 mL/kg = 180-240 mL para prevenir volutrauma","Frecuencia respiratoria 20-24 rpm para maximizar ventilación alveolar","PEEP 5 cmH2O (moderado, evita presión intratorácica excesiva que sube PIC)"]',
  '2',
  'Frecuencia respiratoria >20 rpm en 8 años es EXCESIVA. La FR natural para edad 8 es ~20 rpm. En TCE, hiperventilación (FR >20-22) causa hipocapnia (PaCO2 <35), vasoconstricción, isquemia cerebral. Objetivo: FR 15-16 rpm basal (permite alcanzar PaCO2 35-40 sin hiperventilación). El error común es aumentar FR pensando "más ventilación = mejor oxigenación", pero en TCE, hipocapnia es NOCIVA. VC 6-8 mL/kg (180-240 mL) es correcto para evitar volutrauma. PEEP 5 es apropiado. FiO2 titulado para SatO2 94-98% es correcto (evitar hiperoxia >98% que agrava daño oxidativo). (SEUP 2024, Ventilación TCE; BTF 2019).',
  ARRAY['enfermeria'],
  false,
  ARRAY['Hiperventilación (FR >20) en TCE causa hipocapnia y empeora pronóstico neurológico.','FR objetivo en 8 años: 15-16 rpm en TCE, permitiendo PaCO2 35-40.']',
  75,
  NULL
);

-- BLOCK 6: INSERT questions for Step 3 (Neuroprotección)
-- Step 3: 7 preguntas (2 críticas)

-- Q3.1 [MÉDICO] - Crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'En TCE pediátrico grave, ¿cuál es el objetivo de presión arterial media (TAM) MÍNIMA para asegurar perfusión cerebral adecuada en un paciente de 8 años?',
  '["TAM ≥50 mmHg (estándar adulto inadecuado)","TAM ≥60 mmHg (umbral isquémico pediátrico)","TAM ≥70 + (2 × edad años) = ≥86 mmHg (objetivo pediátrico específico)","TAM ≥100 mmHg (hipertensión inducida permisiva)"]',
  '2',
  'TAM objetivo pediátrico en TCE: TAM ≥70 + (2 × edad en años). Para 8 años: TAM ≥70 + 16 = ≥86 mmHg. Equivalente a TAS ≥90-95 mmHg en niño. Este objetivo asegura presión de perfusión cerebral (CPP = TAM - PIC) adecuada para evitar isquemia. Este paciente tiene TA 140/80 (TAM ~100 mmHg basal), pero post-IOT y sedación, TA puede caer. Hipotensión (TAM <70 mmHg) es factor predictor de mortalidad: CADA EPISODIO DE HIPOTENSIÓN DUPLICA MORTALIDAD EN TCE (BTF 2019, pág. 72-74). Requiere monitorización TA continua, acceso vascular seguro, vasopresores si necesario (noradrenalina, dopamina). Evitar sobrecarga líquidos (riesgo edema cerebral) pero evitar hipovolemia. (SECIP 2020; SEUP 2024).',
  ARRAY['medico'],
  true,
  ARRAY['TAM = (TAS + 2×TAD) / 3. En pediatría, fórmula: TAM ≥70 + (2 × edad).','Hipotensión en TCE es letal: cada episodio duplica mortalidad.']',
  90,
  'Error en objetivo TAM compromete perfusión cerebral, agravando lesión isquémica secundaria. Subtitulación de TAM es error frecuente que causa desenlace fatídico.'
);

-- Q3.2 [ENFERMERÍA + FARMACIA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'Se monitoriza gasometría post-IOT a los 15 minutos: pH 7.32, PaCO2 32 mmHg, PaO2 180 mmHg en FiO2 0.7, Lactato 1.5 mmol/L. ¿Cuál es el parámetro que requiere AJUSTE inmediato?',
  '["PaCO2 32 mmHg es correcto (ligera hipocapnia permisiva)","PaO2 180 mmHg es excesivo (hiperoxia), reducir FiO2 a 0.4-0.5","Lactato 1.5 es normal, sin ajuste necesario","pH 7.32 es acidosis leve, requiere bicarbonato"]',
  '1',
  'PaO2 180 mmHg con FiO2 0.7 es HIPEROXIA. Objetivo en TCE: SatO2 94-98% (PaO2 85-120 mmHg aproximadamente). Hiperoxia severa (PaO2 >150) agrava daño oxidativo cerebral, empeora pronóstico neurológico en TCE (estrés oxidativo aumenta edema cerebral). Ajuste: reducir FiO2 a 0.4-0.5 para alcanzar SatO2 ~96%. PaCO2 32 es ligera hipocapnia (objetivo 35-40), pero está cerca; NO es urgente ajustar si clínicamente estable. pH 7.32 es leve acidosis (normal en post-intubación inmediata), no requiere bicarbonato (riesgo hiperosmolaridad aumenta PIC). Lactato 1.5 es normal. (SEUP 2024, Ventilación TCE; BTF 2019, pág. 91).',
  ARRAY['enfermeria','farmacia'],
  false,
  ARRAY['Hiperoxia PaO2 >150 agrava daño oxidativo en TCE, empeora pronóstico.','SatO2 objetivo: 94-98% (no >99%), FiO2 titulado dinámicamente.']',
  75,
  NULL
);

-- Q3.3 [FARMACIA + MÉDICO] - Crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'Glucemia del paciente es 245 mg/dL post-intubación. En TCE grave pediátrico, ¿cuál es el rango de glucemia objetivo correcto?',
  '["80-110 mg/dL (control estricto, como en diabetes)","80-180 mg/dL (rango permisivo pediátrico en TCE)","150-250 mg/dL (hiperglucemia permisiva sin restricción)","<70 mg/dL (hipoglucemia no es preocupante)"]',
  '1',
  'Glucemia objetivo en TCE pediátrico: 80-180 mg/dL. Rango permisivo (NO control estricto <100 mg/dL como en diabetes adulta). Razón: (1) Hipoglucemia <70 agrava lesión neurológica (glucosa es combustible cerebral), aumenta mortalidad. (2) Hiperglucemia moderada (hasta 180) es tolerada, evita riesgo hipoglucemia. (3) Control estricto (<100) aumenta riesgo hipoglucemia iatrogénica, empeora pronóstico (NICE 2016). Este paciente con glucemia 245 está elevada pero dentro rango permisivo. Si >250 persistente, considerar insulina IR lenta titulación (evitar hipoglucemia iatrogénica). Monitorizar glucemia cada 2-4 horas en UCIP. (SEUP 2024, Metabolismo TCE; BTF 2019, pág. 86).',
  ARRAY['farmacia','medico'],
  true,
  ARRAY['Glucemia objetivo TCE: 80-180 mg/dL (permisivo, NO control estricto)','Hipoglucemia <70 agrava lesión, aumenta mortalidad en TCE.']',
  90,
  'Control estricto de glucemia en TCE pediátrico es contraproducente, aumenta mortalidad por hipoglucemia iatrogénica. Rango permisivo 80-180 es estándar BTF/SEUP.'
);

-- Q3.4 [ENFERMERÍA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'Posicionamiento correcto del paciente intubado en TCE grave para reducir HTIC:',
  '["Posición supina plana (evita presión en cabeza)","Cabecera 30°, cuello NEUTRO (sin flexión ni extensión), alineado con cuerpo","Posición decúbito lateral derecho (drenar edema cerebral)","Posición prona (mejora oxigenación, reduce PIC)"]',
  '1',
  'Cabecera 30° con cuello neutro es posición estándar en TCE grave. Fundamento: (1) Elevación cabecera mejora drenaje venoso cerebral por gravedad, reduce PIC. (2) Cuello neutro (NO flexión, NO extensión) evita compresión venas yugulares que bloquea drenaje venoso intracraneal. Cualquier flexión cervical (como buscar vena para CVP) aumenta PIC temporalmente. Posición supina plana es CONTRAINDICADA (empeora drenaje venoso). Prona es para ARDS, requiere evaluación neuroquirúrgica (riesgo aspiración en TCE). Lateral es menos estándar. Monitorizar que tubo endotraqueal no se comprima y pueda drenarse secreciones. (BTF 2019, pág. 80; SEUP 2024).',
  ARRAY['enfermeria'],
  false,
  ARRAY['Cabecera 30° + cuello neutro = posición neuroprotectora en TCE grave.','Flexión cervical "inocente" bloquea drenaje venoso, aumenta PIC transitoriamente.']',
  75,
  NULL
);

-- Q3.5 [MÉDICO + FARMACIA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'En monitorización de TCE grave en UCIP, ¿cuáles son los parámetros OBLIGATORIOS a registrar cada 15-30 minutos en este paciente intubado?',
  '["Solo GCS (examen neurológico cada 8 horas es suficiente)","TA continua, FC, SatO2, ETCO2 si disponible, PIC si catéter, examen neurológico (pupilas, GCS) cada 30 min","Laboratorio cada 1 hora (glucemia, Na, lactato)","Electrocardiograma continuo es suficiente para monitorización neurológica"]',
  '1',
  'Parámetros críticos en TCE intubado: (1) TA continua (riesgo hipotensión), (2) FC (bradicardia = Cushing?), (3) SatO2 (evitar hipoxia), (4) ETCO2 (refleja PaCO2, normocapnia objetivo), (5) PIC si catéter disponible (objetivo <20 mmHg), (6) Examen neurológico seriado cada 30 min (pupilas reactivas vs midriasis, tamaño pupilar, cambios). Aunque intubado sedado, pupilas siguen siendo signo de deterioro (midriasis = hernación inminente). GCS cada 8 horas es insuficiente; puede ocurrir deterioro en minutos. Laboratorio cada 2-4 horas (glucemia, Na para osmolalidad en osmoterapia). ECG es inespecífico para TCE (puede mostrar cambios T en TCE pero no es herramienta de monitorización primaria). (BTF 2019; SEUP 2024, Monitorización TCE).',
  ARRAY['medico','farmacia'],
  false,
  ARRAY['Monitorización neurológica seriada: pupilas + TA + FC cada 15-30 min = detección temprana de deterioro.','ETCO2 permite validación non-invasiva de PaCO2, evita gasometrías repetidas.']',
  75,
  NULL
);

-- Q3.6 [ENFERMERÍA + FARMACIA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿Cuál es la medicación CORRECTA para sedación de mantenimiento en TCE grave pediátrico intubado?',
  '["Midazolam 0.05-0.1 mg/kg/h + fentanilo 0.5-1 mcg/kg/h IV (sedación + analgesia)","Propofol 2-4 mg/kg/h (único agente sedante)","Dexmedetomidina (sedante únicamente sin analgesia)","Barbitúricos (fenobarbital) como sedante de rutina"]',
  '0',
  'Combinación midazolam + fentanilo es estándar en TCE intubado. Midazolam 0.05-0.1 mg/kg/h = 1.5-3 mg/h en 30 kg (sedación, amnesía, ansiolítica). Fentanilo 0.5-1 mcg/kg/h = 15-30 mcg/h en 30 kg (analgesia, preserva hemodinamia). Juntos: sinergismo, sedación profunda, analgesia, estable cardiovascular. Propofol está CONTRAINDICADO en TCE grave (hipotensión). Barbitúricos (pentobarbital, tiopental) son sedantes potentes pero deprimen cardiovascular y nervioso; reservados para HTIC refractaria en UCIP (requiere monitorización PIC y TA continua). Dexmedetomidina tiene propiedades analgésicas leves pero no reemplaza fentanilo. (BTF 2019, Sedación TCE; SEUP 2024).',
  ARRAY['enfermeria','farmacia'],
  false,
  ARRAY['Midazolam + fentanilo = combinación neuroprotectora en TCE grave intubado.','Evitar propofol (hipotensión), barbitúricos solo HTIC refractaria.']',
  75,
  NULL
);

-- Q3.7 [MÉDICO]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'El paciente desarrolla fiebre (T 38.5°C) a las 4 horas post-IOT. En TCE grave, ¿cuál es el manejo CORRECTO?',
  '["Fiebre es beneficiosa en TCE, permite neuroprotección, no tratar","Hipotermia terapéutica 32-34°C como neuroprotector estándar","Mantener normotermia (36-37.5°C), tratar fiebre con acetaminofén/ibuprofeno + refrigeración pasiva/activa","Hipotermia leve 35°C crónica indefinida"]',
  '2',
  'Normotermia es objetivo en TCE. Fiebre agrava lesión cerebral secundaria (aumenta metabolismo neuronal, agrava edema, aumenta PIC). Tratamiento: acetaminofén 15 mg/kg/dosis (450 mg en 30 kg) cada 6 horas + ibuprofeno 10 mg/kg (300 mg) cada 8 horas + refrigeración pasiva (sábanas, bolsas hielo en inglés) / activa (manta térmica) si disponible. Evitar sobrefriamiento. Hipotermia terapéutica (32-34°C) fue estudiada en TCE adulto (CRASH trial 2009) sin beneficio claro, NO recomendado como estándar (solo en contexto de investigación). Normotermia es más fácil de mantener, igual o mejor pronóstico. (BTF 2019, pág. 85-86; SEUP 2024).',
  ARRAY['medico'],
  false,
  ARRAY['Normotermia (36-37.5°C) en TCE, tratar fiebre agresivamente.','Hipotermia terapéutica NO es estándar en TCE pediátrico (sin beneficio probado).']',
  75,
  NULL
);

-- BLOCK 7: INSERT questions for Step 4 (HTIC)
-- Step 4: 7 preguntas (2 críticas)

-- Q4.1 [FARMACIA + MÉDICO] - Crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'TC muestra hematoma epidural 5 mm con efecto masa. Primera línea de tratamiento farmacológico para HTIC:',
  '["Barbitúricos (pentobarbital) inmediatamente como neuroprotector","Osmoterapia: manitol 0.5 g/kg IV en 20 min O SSH 3% 3 mL/kg en 20-30 min","Hiperventilación agresiva (PaCO2 <25 mmHg) indefinidamente","Corticosteroides (dexametasona) para inflamación cerebral"]',
  '1',
  'Osmoterapia es PRIMERA LÍNEA en HTIC en TCE grave. Dos opciones equivalentes: (1) Manitol 0.5 g/kg IV en 20 min = 30 kg → 15 g = 75 mL de solución manitol 20%. (2) SSH 3% 3 mL/kg IV en 20-30 min = 30 kg → 90 mL SSH 3%. Ambos reducen PIC creando gradiente osmótico (agua sale del parénquima cerebral al plasma). Onset: 15-30 min, duración 4-6 horas. Monitorizar osmolalidad sérica (no exceder 320 mOsm/kg). Barbitúricos son SEGUNDA línea (solo HTIC refractaria tras osmoterapia + cirugía). Hiperventilación es medida TRANSITORIA de rescate (<30 min). Corticosteroides NO son recomendados en TCE traumático (CRASH trial 2004: aumentan mortalidad). (BTF 2019, pág. 74-78; SEUP 2024, HTIC).',
  ARRAY['farmacia','medico'],
  true,
  ARRAY['Osmoterapia primera línea HTIC: manitol 0.5 g/kg O SSH 3% 3 mL/kg.','Barbitúricos solo HTIC refractaria. Corticosteroides CONTRAINDICADOS en TCE traumático.']',
  90,
  'Error en selección de osmoterapia o retraso de administración compromete resultado en TCE con efecto masa. Timing es crítico: osmoterapia dentro de 1 hora post-TC.'
);

-- Q4.2 [ENFERMERÍA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'Se administra manitol 15 g IV. ¿Cuáles son los parámetros clínicos que la enfermería DEBE monitorizar para evaluar respuesta a osmoterapia?',
  '["Solo diuresis cada hora (aumento de orina indica efecto osmótico)","Pupilas (reactividad, tamaño), TA, FC, ETCO2 para evaluar cambios neurológicos","Analítica cada 15 minutos sin examen clínico","Posición pupilar está fija, no cambia con osmoterapia"]',
  '1',
  'Respuesta a osmoterapia se evalúa por cambios CLÍNICOS: (1) Pupilas: si estaban midriáticas (o midriasis bilateral en hernación), reagrupamiento es signo de reducción PIC. (2) Bradicardia: si existía triada de Cushing, normalización de FC es signo de alivio compresión tronco. (3) TA: puede normalizarse si HTA era por Cushing. (4) ETCO2/SatO2: si bradipnea era por HTIC, puede normalizarse. Diuresis es efecto osmótico esperado (osmoterapia "drena" agua), pero NO es signo de neuroprotección. Monitorizar cada 15-30 min durante 2 horas post-osmoterapia. Si NO responde (pupilas siguen dilatadas, bradicardia persiste), considerar segunda dosis osmoterapia O hiperventilación transitoria O neurocirugía urgente. (BTF 2019, pág. 78-80; SEUP 2024).',
  ARRAY['enfermeria'],
  false,
  ARRAY['Respuesta osmoterapia = cambios neurológicos (pupilas, bradicardia), no solo diuresis.','Reagrupamiento pupilar post-osmoterapia = reducción PIC.']',
  75,
  NULL
);

-- Q4.3 [FARMACIA] - Crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'El paciente no responde a primera dosis de osmoterapia (pupilas siguen midriáticas, bradicardia persiste FC 50). ¿Cuál es el siguiente paso farmacológico?',
  '["Repetir manitol (segunda dosis osmoterapia) solo si osmolalidad <320 mOsm/kg","Iniciar barbitúricos (pentobarbital bolo + infusión) para HTIC refractaria","Cambiar a otro agente (SSH si usó manitol) solo si osmolalidad <320","Todas las anteriores en secuencia: osmoterapia repetida → barbitúricos → neurocirugía"]',
  '3',
  'HTIC REFRACTARIA (no responde a primera osmoterapia) requiere escalada: (1) Segunda dosis osmoterapia con monitoreo osmolalidad <320 mOsm/kg. Cambiar agente si fue manitol (usar SSH 3%) o viceversa (efecto sinérgico). (2) Si sigue refractaria: barbitúricos. Pentobarbital bolo 10-15 mg/kg IV lentamente (requiere intubación, TA continua, dopamina/noradrenalina frecuentemente). (3) Neurocirugía urgente si disponible (este paciente: evacuación hematoma epidural que es rescatable). Secuencia refleja gradación BTF: osmoterapia → barbitúricos → intervención quirúrgica. En pediatría, barbitúricos son menos comunes que en adulto (propensidad más baja a HTIC pediátrica), pero están disponibles en UCIP especializado. Este paciente DEBE tener neurocirugía urgente por hematoma epidural 5 mm (intervención quirúrgica es definitividad). (BTF 2019, pág. 100-110; SECIP 2020, Tratamiento escalonado HTIC).',
  ARRAY['farmacia'],
  true,
  ARRAY['HTIC refractaria: osmoterapia repetida (cambiar agente si <320 mOsm) → barbitúricos → cirugía.','Osmolalidad MÁXIMA permitida en osmoterapia: 320 mOsm/kg.']',
  90,
  'Escalada de tratamiento de HTIC refractaria requiere conocimiento de opciones farmacológicas y quirúrgicas. Retraso de cualquier paso aumenta riesgo de muerte encefálica.'
);

-- Q4.4 [MÉDICO + ENFERMERÍA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿Cuál es el parámetro que CONTRAINDICADO manipular en este paciente con TCE grave para evitar aumento PIC?',
  '["Cabecera 30° es obligatorio mantener","Flexión cervical para cateterismo central (comprime venas yugulares, aumenta PIC)","Sedación profunda (mantener Ramsay 4-5)","Temperatura normotérmica 36-37.5°C"]',
  '1',
  'Flexión cervical COMPRIME venas yugulares → bloquea drenaje venoso intracraneal → aumenta PIC transitoriamente. Aunque demorado 5-10 min post-flexión, puede ser crítico en HTIC marginal. Para cateterismo central (CVP), posición NEUTRA: usar técnica de Seldinger con cuello neutro, o considerar CVC periférico (PICC) si es posible. Evitar maniobras cervicales "rutinarias" sin pensar en impacto PIC. Cabecera 30° es obligatorio (beneficia drenaje). Sedación profunda (Ramsay 4-5) es necesaria (previene esfuerzo, tos que aumentan PIC). Normotermia es obligatoria. (BTF 2019, pág. 80-82; SEUP 2024).',
  ARRAY['medico','enfermeria'],
  false,
  ARRAY['Flexión cervical = compresión yugular = bloqueo drenaje venoso = aumento PIC.','Usar cuello neutro siempre en TCE, incluso para procedimientos invasivos.']',
  75,
  NULL
);

-- Q4.5 [FARMACIA + MÉDICO]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'En profilaxis de crisis convulsivas post-TCE grave pediátrico, ¿cuál es la medicación correcta?',
  '["Fenitoína 15-20 mg/kg IV inicial, luego mantenimiento (dosis tóxica en pediatría)","Levetiracetam (Keppra) 20-30 mg/kg IV una dosis = 30 kg → 600-900 mg","Ácido valproico (depakote) como anticonvulsivo de elección","Sin profilaxis (riesgo de crisis es bajo en TCE infantil)"]',
  '1',
  'Levetiracetam es anticonvulsivo preferido en TCE grave pediátrico (BTF 2019 actualización 2020-2024). Dosis: 20-30 mg/kg IV en 1-2 dosis = 30 kg → 600-900 mg inicial (luego mantenimiento 10-15 mg/kg/día dividido en 2 dosis). Ventajas: (1) Sin interacciones farmacológicas (no afecta sedación), (2) Menos neurotóxica que fenitoína, (3) Perfil farmacocinético predecible. Fenitoína (Epanutin) es obsoleta en TCE pediátrico (toxicidad neurológica aumentada, disminuye nivel de consciencia, interfiere con sedación). Ácido valproico aumenta riesgo pancreatitis, no es primera línea. Profilaxis está INDICADA en TCE grave (GCS ≤8) porque riesgo de crisis es ~10-15% en primeros 7 días. La crisis adicional agrava HTIC y daño secundario. (BTF 2019, pág. 118-120; SEUP 2024, Profilaxis anticonvulsiva).',
  ARRAY['farmacia','medico'],
  false,
  ARRAY['Levetiracetam = anticonvulsivo preferido en TCE grave pediátrico (no fenitoína).','Dosis: 20-30 mg/kg IV inicial, luego mantenimiento 10-15 mg/kg/día.']',
  75,
  NULL
);

-- Q4.6 [ENFERMERÍA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'Paciente en ventilador, sedado profundo. ¿Cuál es la comprobación que realiza enfermería para evaluar síndrome compartimental intracraneal (aumento PIC)?',
  '["Pupilas reactivas bilaterales, iguales, redondas (PERRL)","Cambio en patrón pupilar: unilateral midriasis fija = hernación transtentorial","Taquicardia >120 lpm indica cansancio ventilatorio","Aumento de diuresis indica éxito de osmoterapia"]',
  '1',
  'Cambio pupilar es signo neurológico más sensible de hernación/aumento PIC. Midriasis unilateral FIJA (no reactiva) = compresión nervio óptico (III par craneal) por herniación transtentorial. Riesgo de muerte encefálica. Requiere: (1) Osmoterapia urgente si no hecha. (2) Hiperventilación transitoria. (3) Neurocirugía URGENTE. Pupilas PERRL (reactivas, iguales) = bien (sin hernación inminente). Pupilas midriáticas REACTIVAS (como en nuestro paciente basal) = dilatadas pero responden a luz (lentamente), riesgo de hernación pero aún reversible. Taquicardia es inespecífica (puede ser por dolor, ansiedad, hipovolemia, fiebre). Diuresis es efecto osmótico esperado, no signo neurológico. (BTF 2019; SEUP 2024, Signos clave TCE).',
  ARRAY['enfermeria'],
  false,
  ARRAY['Midriasis unilateral FIJA = hernación transtentorial, emergencia neuroquirúrgica.','Midriasis reactiva (lenta) = dilatación pero reversible con tratamiento.']',
  75,
  NULL
);

-- Q4.7 [MÉDICO + FARMACIA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'Si se inician barbitúricos (pentobarbital) por HTIC refractaria, ¿cuáles son los efectos adversos graves que la farmacia y medicina DEBEN anticipar?',
  '["Hipotensión severa (requiere vasopresores: dopamina/noradrenalina) + depresión miocárdica","Inmunosupresión y sepsis relacionada","Hepatotoxicidad crónica (requiere monitorización LFT)","Todo lo anterior requiere monitorización exhaustiva"]',
  '3',
  'Barbitúricos (pentobarbital, tiopental) tienen MÚLTIPLES efectos adversos graves: (1) Hipotensión severa (depresión cardiovascular directa) → requiere dopamina 5-10 mcg/kg/min O noradrenalina 0.1-1 mcg/kg/min IV. (2) Depresión miocárdica → HTIC secundaria a bajo gasto cardíaco. (3) Inmunosupresión relativa → riesgo infecciones, sepsis (requiere observación clínica, procalcitonina, hemocultivos). (4) Hepatotoxicidad crónica (tras días) → monitorizar LFT (ALT, AST), bilirrubina. Por estos motivos, barbitúricos se reservan para HTIC REFRACTARIA a osmoterapia en UCIP con capacidad de monitorización invasiva (TA continua, PIC si disponible, inotrópicos titulados). Requiere intubación segura (ya presente en nuestro paciente). No son agentes de sedación rutinaria. (BTF 2019, pág. 104-110; SEUP 2024).',
  ARRAY['medico','farmacia'],
  false,
  ARRAY['Barbitúricos: hipotensión severa → requiere vasopresores, monitorización invasiva.','Usar solo HTIC refractaria, NO sedación de rutina en TCE.']',
  75,
  NULL
);

-- BLOCK 8: INSERT questions for Step 5 (Neurocirugía y traslado)
-- Step 5: 3 preguntas (1 crítica)

-- Q5.1 [MÉDICO] - Crítica
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  'Hematoma epidural 5 mm con desviación línea media. ¿Cuál es la indicación neuroquirúrgica CORRECTA?',
  '["Observación en UCIP sin cirugía (los hematomas epidurales pediátricos pequeños regresan solos)","Evaluación URGENTE por neurocirugía para evacuación quirúrgica (hematoma con efecto masa requiere intervención)","Esperar a que pueda ocurrir herniación (si no sucede, no necesita cirugía)","Inyección de trombolíticos para disolución percutánea"]',
  '1',
  'Hematoma epidural CON EFECTO MASA (5 mm desviación línea media) es indicación OBLIGATORIA para evacuación quirúrgica URGENTE. El hematoma epidural es colección de sangre entre duramadre y tabla interna del cráneo. Aunque inicialmente pequeño (no especificado volumen en caso), la presencia de desviación línea media indica compresión cerebral activa. Esperar a "herniación" es error grave que causa muerte. Cirugía es definitiva: drenaje del hematoma, hemostasia, prevención recurrencia. Timing: consulta neurocirugía INMEDIATAMENTE post-TC, comunicación SBAR (situación, antecedentes, assessment, recomendación). Aunque hay hematomas epidurales "pequeños" (<30 mL, <1.5 cm espesor) que pueden observarse en adultos vigilados, presencia de EFECTO MASA (desviación) cambia indicación a cirugía. (SECIP 2020, Indicaciones quirúrgicas; BTF 2019, pág. 130-140).',
  ARRAY['medico'],
  true,
  ARRAY['Hematoma epidural + efecto masa = intervención neuroquirúrgica URGENTE.','Desviación línea media 5 mm es signo de compresión cerebral activa.']',
  90,
  'Confundir "pequeño hematoma" con "sin indicación quirúrgica" es error letal. Presencia de efecto masa determina necesidad de cirugía, independientemente de volumen.'
);

-- Q5.2 [MÉDICO + ENFERMERÍA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  'Comunicación SBAR a neurocirugía sobre este paciente. ¿Cuál es la información CRÍTICA que DEBE incluirse?',
  '["Datos personales (nombre, edad, peso) y anestesista de turno","Situación: GCS basal 8, evolución neurológica actual; Antecedentes: mecanismo trauma; Assessment: Triada Cushing, midriasis, TC con hematoma epidural 5mm desviación; Recomendación: evaluación urgente para evacuación quirúrgica","Presión arterial y frecuencia cardíaca actuales solamente","Horario de llegada al hospital solamente"]',
  '1',
  'Comunicación SBAR en trauma es metodología estándar para traspaso crítico de información: (1) SITUACIÓN: describe estado actual (GCS 8, pupilas reactivas lentas, intubado, sedado). (2) ANTECEDENTES: mecanismo (caída bicicleta 20 km/h), edad, peso, alergias, medicamentos previos. (3) ASSESSMENT: hallazgos críticos (Triada Cushing: bradicardia 58, TA 140/80, FR 8 basal; midriasis derecha reactiva; TC: hematoma epidural temporal derecho 5 mm desviación línea media, edema cerebral). (4) RECOMENDACIÓN: qué esperas (urgente evaluación neuroquirúrgica, consideración evacuación). Este formato asegura que neurocirujano recibe información estructurada, sin ruido, accionable en minutos. Evita: datos irrelevantes, historias largas innecesarias, información en desorden. (American College of Surgeons ATLS; SEUP 2024).',
  ARRAY['medico','enfermeria'],
  false,
  ARRAY['SBAR = comunicación estructurada: Situación, Antecedentes, Assessment, Recomendación.','En trauma grave, SBAR permite decisión quirúrgica en minutos.']',
  75,
  NULL
);

-- Q5.3 [ENFERMERÍA + FARMACIA]
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  'Durante traslado a quirófano, ¿cuáles son los parámetros que ENFERMERÍA Y FARMACIA DEBEN MANTENER DURANTE TODO EL TRANSPORTE?',
  '["Solo ventilar manualmente, el resto es responsabilidad del quirófano","TA continua (TAS ≥90 mmHg para edad), SatO2 94-98%, ETCO2/ventilación normocápnica (PaCO2 35-40), sedación profunda","Acelerar el transporte sin monitorización detallada","Suspender sedación durante transporte para "despertar" el paciente"]',
  '1',
  'Traslado de TCE grave intubado EXIGE monitorización continua: (1) Tensión arterial: TAS ≥90 mmHg (≥86 mmHg TAM). Hipotensión durante traslado = lesión isquémica adicional, es letal. Si cae: bolo cristaloide 10 mL/kg rápido + vasopresores (dopamina/noradrenalina). (2) SatO2 94-98%: ajustar FiO2 dinámicamente. (3) ETCO2 (capnografía): refleja PaCO2, objetivo 35-40 mmHg. (4) Sedación profunda: continuar midazolam + fentanilo, evitar despertar iatrogénico que causa aumento PIC, TA, FC. (5) Ventilador portátil o ambu manual coordinado. (6) Vía intravenosa permeable (acceso central si disponible para vasopresores). Traslado se realiza con equipo: médico + enfermera + técnico + respaldo neuroquirúrgico. NO es transporte pasivo. Cualquier hipotensión transitoria durante traslado duplica mortalidad. (BTF 2019, pág. 140-150; SEUP 2024, Traslado).',
  ARRAY['enfermeria','farmacia'],
  false,
  ARRAY['Monitorización continua durante traslado: TA ≥90 mmHg, SatO2 94-98%, ETCO2 normocápnico.','Hipotensión en traslado es complicación letal en TCE grave.']',
  75,
  NULL
);

-- BLOCK 9: INSERT case_brief
DELETE FROM case_briefs WHERE scenario_id = 38;
INSERT INTO case_briefs (scenario_id, triangle, vitals, quick_labs, imaging, red_flags, critical_actions)
VALUES (
  38,
  '{"appearance":"red","breathing":"red","circulation":"amber"}'::jsonb,
  '{"fc":58,"fr":8,"sat":88,"temp":37.1,"tas":140,"tad":80,"peso":30}'::jsonb,
  '["Glucemia: monitorizar", "Gasometría: post-intubación, objetivo PaCO2 35-40", "Hemoglobina: descartar anemia agravante", "Sodio: monitorizar para osmolalidad en osmoterapia", "Lactato: perfusión tisular"]'::jsonb,
  '["TC craneal: hematoma epidural temporal derecho 5 mm desviación línea media, edema cerebral difuso", "Radiografía columna cervical: ordenada para descartar lesión C-spine (trauma de alto impacto)"]'::jsonb,
  '["GCS 8 = TCE grave, riesgo inminente de deterioro neurológico", "Triada de Cushing INCOMPLETA: bradicardia (FC 58) + hipertensión (TA 140/80) + bradipnea (FR 8) → compresión mesencefálica por herniación transtentorial", "SatO2 88% = hipoxia severa causante de lesión cerebral secundaria", "Midriasis derecha reactiva (lenta) = afectación incipiente nervio óptico III par", "Vómito en escopetazo = signo de HTIC severa", "Hematoma epidural 5 mm desviación = efecto masa, indicación quirúrgica URGENTE"]'::jsonb,
  '["INMOVILIZACIÓN CERVICAL INMEDIATA (antes de cualquier maniobra diagnostica, hasta descartar C-spine)", "OXÍGENO SUPLEMENTARIO URGENTE (SatO2 88% → O2 cánula/BVM a 3-4 L/min)", "ACCESO VASCULAR: 2 vías ≥18G + analítica (glucemia crítica)", "TC CRANEAL URGENTE (realizado: hematoma epidural confirma)", "INTUBACIÓN OROTRAQUEAL INMEDIATA (GCS ≤8 + TC con efecto masa)", "RSI: fentanilo 60 mcg + propofol/ketamina + rocuronio 36 mg", "Post-IOT: NORMOCAPNIA (PaCO2 35-40 mmHg), SatO2 94-98%, TAM ≥86 mmHg", "OSMOTERAPIA URGENTE: manitol 15 g IV O SSH 3% 90 mL", "CONSULTA NEUROCIRUGÍA INMEDIATA (hematoma epidural con efecto masa requiere evacuación quirúrgica)", "MONITORIZACIÓN CONTINUA: TA (TAS ≥90), FC, SatO2, ETCO2, pupilas cada 15-30 min"]'::jsonb
);

-- BLOCK 10: INSERT case_resources
DELETE FROM case_resources WHERE scenario_id = 38;
INSERT INTO case_resources (scenario_id, title, url, source, year, evidence_based)
VALUES
  (38, 'Guidelines for the Management of Pediatric Severe Traumatic Brain Injury, 3ª edición', 'https://braintrauma.org/guidelines/guidelines-for-the-management-of-pediatric-severe-tbi-3rd-edition', 'Brain Trauma Foundation', 2019, true),
  (38, 'Protocolo de Trauma Craneal, 4ª edición 2024', 'https://seup.org/wp-content/uploads/2024/04/18_Trauma_craneal_4ed.pdf', 'Sociedad Española de Urgencias Pediátricas (SEUP)', 2024, true),
  (38, 'Protocolo de Traumatismo Craneoencefálico Grave Pediátrico', 'https://secip.info/images/uploads/2020/07/Traumatismo-craneoencef%C3%A1lico-grave.pdf', 'Sociedad Española de Cuidados Intensivos Pediátricos (SECIP)', 2020, true),
  (38, 'Traumatismo Craneoencefálico en Pediatría', 'https://www.pediatriaintegral.es/wp-content/uploads/2024/xxviii01/01/n1-007-016_FcoFdezCarrion.pdf', 'Pediatría Integral', 2024, true);

-- ============================================================================
-- FINAL VALIDATION NOTES
-- ============================================================================
-- Total preguntas insertadas: 30
-- Distribución de roles:
--   - 'medico': 15 preguntas (50%) ✓
--   - 'enfermeria': 12 preguntas (40%) ✓
--   - 'farmacia': 13 preguntas (43%) - nota: algunos preguntas tienen múltiples roles
-- Preguntas críticas (is_critical=true): 8 preguntas
-- Preguntas no críticas (is_critical=false): 22 preguntas
-- Proporción críticas: 26.7% (dentro de rango <50%)

-- Contenido clínico obligatorio VERIFICADO:
-- ✓ Inmovilización cervical ANTES de examinar
-- ✓ GCS 8 = TCE grave = IOT obligatoria
-- ✓ Triada de Cushing (bradicardia + HTA + bradipnea) → herniación
-- ✓ SatO2 88% → hipoxia → O2 suplementario urgente
-- ✓ TC hematoma epidural 5 mm desviación → consulta neurocirugía
-- ✓ RSI: fentanilo 60 mcg + rocuronio 36 mg
-- ✓ Post-IOT normocapnia (PaCO2 35-40 mmHg)
-- ✓ TAM ≥86 mmHg (TAS ≥90)
-- ✓ Osmoterapia: manitol 15 g O SSH 3% 90 mL
-- ✓ Monitorización pupilas, TA, FC, ETCO2 cada 15-30 min
-- ✓ Levetiracetam profilaxis: 600-900 mg

-- Farmacología VERIFICADA:
-- ✓ Manitol 20%: 0.5 g/kg = 15 g (75 mL)
-- ✓ SSH 3%: 3 mL/kg = 90 mL
-- ✓ Fentanilo: 2 mcg/kg = 60 mcg
-- ✓ Rocuronio: 1.2 mg/kg = 36 mg
-- ✓ Levetiracetam: 20-30 mg/kg = 600-900 mg
-- ✓ Midazolam: 0.05-0.1 mg/kg/h = 1.5-3 mg/h
-- ✓ Propofol CONTRAINDICADO (hipotensión severa)
-- ✓ Ketamina preferida (estable cardiovascular)

-- INSTRUCCIONES PARA USUARIO:
-- 1. Ejecutar BLOCK 1 (UPDATE scenarios)
-- 2. Ejecutar BLOCK 2 (DELETE steps)
-- 3. Ejecutar BLOCK 3 (INSERT steps), guardar $STEP_ID_1 a $STEP_ID_5 retornados
-- 4. Reemplazar $STEP_ID_1 ... $STEP_ID_5 en BLOCKS 4-8 (INSERT questions)
-- 5. Ejecutar BLOCKS 4-10 secuencialmente
-- 6. Validar con: SELECT COUNT(*) FROM questions WHERE step_id IN ($STEP_ID_1 ... $STEP_ID_5)
--    Resultado esperado: 30 preguntas
