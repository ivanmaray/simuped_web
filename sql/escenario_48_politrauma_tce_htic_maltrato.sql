-- ══════════════════════════════════════════════════════════════════
-- ESCENARIO 48: Politrauma — TCE con HTIC (sospecha de maltrato)
-- MED: 18 preguntas | NUR: 10 preguntas | PHARM: 5 preguntas
-- CRÍTICAS: 9 | PASOS: 5 | Total preguntas: 24
-- Bibliografía: SEUP 2024 HTIC + SEUP 2024 Politrauma + SNS 2024 Maltrato
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- 1. SCENARIO
-- ─────────────────────────────────────────
INSERT INTO scenarios (title, summary, level, difficulty, mode, status, estimated_minutes, max_attempts)
VALUES (
  'Politrauma: TCE con HTIC (sospecha de maltrato)',
  'Niño de 2 años con TCE grave, GCS 8, tríada de Cushing y anisocoria tras traumatismo con historia familiar inconsistente.',
  'avanzado',
  'Avanzado',
  ARRAY['online'],
  'En construcción: en proceso',
  25,
  3
) RETURNING id;
-- ⚠️ Guarda este ID como $SCENARIO_ID

-- ─────────────────────────────────────────
-- 2. STEPS
-- ─────────────────────────────────────────
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  ($SCENARIO_ID, 1,
   'Reconocimiento y activación del código trauma',
   'Activa el código trauma pediátrico y evalúa al niño mediante el Triángulo de Evaluación Pediátrica. Recoge la anamnesis: caída desde el sofá (aprox. 50 cm) hace 2 horas según los padres, con deterioro neurológico progresivo. Detecta hematomas en dorso y región glútea en distintos estadios de evolución.',
   false, null),
  ($SCENARIO_ID, 2,
   'Manejo inicial — vía aérea y hemodinámica',
   'Prepara y ejecuta la secuencia de intubación rápida con control cervical manual. Establece acceso vascular y evalúa el estado hemodinámico. Administra los tratamientos de urgencia para estabilización y neuroprotección.',
   false, null),
  ($SCENARIO_ID, 3,
   'Manejo de la hipertensión intracraneal',
   'El paciente está intubado y sedoanalgesiado. Aparece la tríada de Cushing completa con midriasis derecha fija arreactiva. Instaura medidas específicas de control de la PIC: osmoterapia, objetivos ventilatorios y sedoanalgesia adecuada a la edad.',
   false, null),
  ($SCENARIO_ID, 4,
   'Pruebas complementarias y diagnóstico',
   'Una vez estabilizado, realizas la batería diagnóstica completa. El TC craneal confirma hematoma subdural bilateral con edema cerebral difuso. La exploración oftalmológica evidencia hemorragias retinianas bilaterales extensas. La serie ósea detecta fracturas costales posteriores de distinta evolución radiológica.',
   false, null),
  ($SCENARIO_ID, 5,
   'Actuación ante sospecha de maltrato',
   'Con el diagnóstico clínico de TCE abusivo, activas el protocolo institucional de sospecha de maltrato. Coordinas con trabajo social, el juzgado de guardia y el servicio de protección de menores. La documentación forense del caso es tu responsabilidad clínica.',
   false, null)
RETURNING id;
-- ⚠️ Guarda los IDs como $STEP_ID_1 ... $STEP_ID_5 (en orden de retorno)


-- ─────────────────────────────────────────
-- 3. QUESTIONS
-- ─────────────────────────────────────────

-- ═══ PASO 1: Reconocimiento y activación del código trauma ═══

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_1,
  'Aplicas el Triángulo de Evaluación Pediátrica al llegar al box de reanimación. El niño está hipotónico, no responde a estímulos verbales, con respiraciones lentas e irregulares y palidez cutánea generalizada. ¿Qué patrón del TEP describe este cuadro?',
  '["Disfunción del SNC aislada: apariencia alterada, trabajo respiratorio normal, circulación cutánea normal","Fallo respiratorio puro: apariencia normal, trabajo respiratorio aumentado, circulación normal","PCR inminente: apariencia alterada, trabajo respiratorio anormal, circulación cutánea alterada","Shock compensado: apariencia normal, trabajo respiratorio normal, circulación cutánea alterada"]',
  '2',
  'El TEP muestra las tres patas alteradas (apariencia, trabajo respiratorio, circulación), lo que corresponde a PCR inminente o descompensación global. En este caso la bradipnea irregular indica patrón respiratorio patológico por disfunción del centro respiratorio secundaria a HTIC; la palidez refleja redistribución vascular; la apariencia gravemente alterada traduce disfunción cortical profunda. Requiere actuación inmediata.',
  ARRAY['medico','enfermeria'],
  true,
  '["El TEP evalúa tres vértices: apariencia (tono, mirada, llanto), trabajo respiratorio (no solo esfuerzo sino también patrón) y color de piel","Una respiración lenta e irregular en un niño es tan patológica como la taquipnea con tiraje; ambas reflejan descompensación respiratoria"]',
  90,
  'Un error en la identificación del patrón TEP puede retrasar la activación del equipo de reanimación y el inicio de las medidas de soporte vital, condicionando el pronóstico neurológico.'
),
(
  $STEP_ID_1,
  'La evaluación neurológica muestra GCS 8 (O2V2M4) y anisocoria con midriasis derecha arreactiva. ¿Cuál es la indicación de manejo de la vía aérea en este momento?',
  '["Oxigenoterapia con gafas nasales a alto flujo y vigilancia estrecha cada 15 minutos","Mascarilla con reservorio al 100% y monitorización neurológica horaria","Intubación orotraqueal mediante secuencia rápida de intubación (SRI)","Ventilación no invasiva (CPAP/BiPAP) como medida puente hasta llegar a UCIP"]',
  '2',
  'El GCS ≤8 es indicación absoluta de intubación orotraqueal en TCE grave pediátrico, tanto para proteger la vía aérea como para permitir el control ventilatorio de la PIC. La anisocoria con midriasis arreactiva indica herniación transtentorial inminente, lo que refuerza la urgencia de la SRI. La ventilación no invasiva está contraindicada en un paciente con nivel de conciencia deprimido por riesgo de broncoaspiración.',
  ARRAY['medico'],
  true,
  '["El GCS ≤8 implica incapacidad para proteger la vía aérea de forma fiable en el paciente pediátrico","La midriasis unilateral fija en el contexto de TCE indica compresión del III par craneal por herniación transtentorial; es una emergencia neuroquirúrgica"]',
  90,
  'Retrasar la intubación en un paciente con GCS 8 y signos de herniación puede resultar en parada respiratoria, hipoxia cerebral secundaria y daño neurológico irreversible.'
),
(
  $STEP_ID_1,
  'Mientras se prepara el material de intubación, ¿cuál es la posición correcta para este niño con TCE grave e HTIC?',
  '["Trendelenburg 15° para optimizar el retorno venoso sistémico","Decúbito supino plano con collarín cervical sin elevación de cabecera","Cabecera elevada 15-30° con cuello en posición neutra y alineación en línea media","Semifowler 45° con la cabeza girada hacia el lado de la anisocoria"]',
  '2',
  'La elevación de la cabecera 15-30° con el cuello en posición neutra facilita el drenaje venoso cerebral y reduce la PIC sin comprometer la perfusión cerebral. La posición en línea media evita la compresión de las venas yugulares. El Trendelenburg está contraindicado porque aumenta la PIC. La rotación cefálica también obstruye el retorno venoso yugular.',
  ARRAY['medico','enfermeria'],
  false,
  '["La elevación de cabecera reduce la PIC por mejora del drenaje venoso yugular; no debe superar 30° para no comprometer la PPC","La rotación o flexión cervical comprime las venas yugulares y aumenta la PIC; el cuello debe mantenerse en posición neutra y línea media"]',
  null,
  null
),
(
  $STEP_ID_1,
  'El padre describe que el niño "cayó del sofá mientras él estaba en otra habitación". En la exploración encuentras hematomas en dorso y región glútea en distintos estadios de evolución. ¿Cuál es tu actitud inmediata?',
  '["Solicitar TC abdominal para descartar lesiones viscerales por la caída y centrarte en el TCE","Aceptar el mecanismo referido sin cuestionarlo y centrarte en la estabilización","Registrar detalladamente las lesiones y la historia clínica, y activar el protocolo institucional de sospecha de maltrato","Interrogar exhaustivamente al padre hasta esclarecer la incongruencia antes de cualquier actuación adicional"]',
  '2',
  'Los hematomas en distintos estadios de evolución en localizaciones no habituales de traumatismo accidental (dorso, glúteos) son indicadores de alta sospecha de maltrato físico. La activación del protocolo no requiere confirmación diagnóstica, basta la sospecha fundamentada. El registro detallado y la activación del protocolo son obligatorios aunque la estabilización clínica sea prioritaria.',
  ARRAY['medico','enfermeria'],
  false,
  '["Los hematomas en distintos estadios indican lesiones producidas en diferentes momentos, incompatibles con un único episodio traumático","Las zonas no prominentes (dorso, glúteos, abdomen) son localizaciones de alta sospecha de maltrato; las zonas prominentes (frente, rodillas) son habituales en traumatismo accidental"]',
  null,
  null
);

-- ═══ PASO 2: Manejo inicial — vía aérea y hemodinámica ═══

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_2,
  'Para la secuencia de intubación rápida en este niño con HTIC, ¿cuál de los siguientes fármacos de inducción debes EVITAR?',
  '["Propofol 2-3 mg/kg IV","Tiopental 3-5 mg/kg IV","Ketamina 1,5-2 mg/kg IV","Fentanilo 2 mcg/kg IV como premedicación"]',
  '2',
  'La ketamina aumenta la presión intracraneal por vasodilatación cerebral e incremento del flujo sanguíneo cerebral, y está contraindicada en la SRI de pacientes con HTIC, especialmente ante sospecha de hidrocefalia subyacente. El propofol y el tiopental reducen el metabolismo cerebral y la PIC. El fentanilo como premedicación está recomendado para atenuar la respuesta adrenérgica a la laringoscopia y el consiguiente pico de PIC.',
  ARRAY['medico'],
  true,
  '["En TCE con HTIC, los inductores de elección son barbitúricos (tiopental) o propofol, que reducen el metabolismo cerebral y la PIC","El fentanilo previo a la laringoscopia atenúa el pico de PIC provocado por la estimulación de la vía aérea superior"]',
  90,
  'El uso de ketamina en un paciente con HTIC activa puede provocar un pico de PIC que precipite la herniación transtentorial irreversible.'
),
(
  $STEP_ID_2,
  'El niño presenta hemoglobina de 9,5 g/dL, INR 1,5 y lactato de 3,2 mmol/L. Han transcurrido 90 minutos desde el traumatismo. ¿Debes administrar ácido tranexámico (TXA)?',
  '["No, porque el niño no presenta shock hemorrágico activo con inestabilidad hemodinámica evidente","Sí, a 15-20 mg/kg IV (máximo 1 g) en bolo lento de 10 minutos; estamos dentro de la ventana de 3 horas","No, porque el TXA está contraindicado en TCE pediátrico con hemorragia intracraneal","Sí, pero solo si la hemoglobina desciende por debajo de 7 g/dL"]',
  '1',
  'El TXA reduce la mortalidad en trauma grave si se administra en las primeras 3 horas (CRASH-2 y extensiones pediátricas). La SEUP 2024 recomienda 15-20 mg/kg IV (máx. 1 g) en bolo lento. No está contraindicado en TCE con hemorragia intracraneal traumática; existe evidencia de beneficio también en este subgrupo. El lactato elevado y la coagulopatía incipiente (INR 1,5) son indicaciones adicionales que no deben ignorarse.',
  ARRAY['medico'],
  true,
  '["El TXA inhibe la fibrinólisis; su beneficio es máximo en las primeras horas y prácticamente nulo a partir de las 3 horas del traumatismo","INR 1,5 y lactato >2 mmol/L indican coagulopatía traumática temprana; no es necesario esperar a shock instaurado para administrar TXA"]',
  90,
  'No administrar TXA dentro de la ventana de 3 horas en un politraumatizado con coagulopatía incipiente aumenta el riesgo de muerte por hemorragia incoercible.'
),
(
  $STEP_ID_2,
  'Durante la intubación, ¿cómo debe realizarse la inmovilización cervical en este niño de 2 años?',
  '["Collarín cervical rígido del tamaño adecuado como única medida; no es necesaria inmovilización manual adicional","Inmovilización manual en línea (MILS) por un segundo reanimador, mantenida durante toda la laringoscopia; el collarín se retira momentáneamente para facilitar la apertura bucal","Bolsas de arena a ambos lados de la cabeza y cinta frontal adhesiva sobre la camilla","Tracción axial cervical manual para alinear y liberar la vía aérea"]',
  '1',
  'La inmovilización manual en línea (MILS) es el estándar durante la laringoscopia, ya que el collarín debe retirarse momentáneamente para permitir la apertura bucal adecuada. La tracción axial está contraindicada porque puede desplazar una posible lesión cervical inestable. Las bolsas de arena son útiles para traslado pero no para una laringoscopia activa.',
  ARRAY['medico','enfermeria'],
  false,
  '["El collarín cervical limita la apertura bucal durante la laringoscopia; debe retirarse manteniendo la estabilización manual en línea","La MILS no implica tracción; es una estabilización neutra que previene el movimiento involuntario durante la maniobra de intubación"]',
  null,
  null
),
(
  $STEP_ID_2,
  'No consigues canalizar vía periférica tras dos intentos. El niño está hemodinámicamente inestable (FC 58, TA 145/90 por tríada de Cushing, GCS 8). ¿Cuál es el siguiente paso inmediato para establecer acceso vascular?',
  '["Esperar y solicitar al anestesista que coloque un catéter venoso central femoral ecoguiado","Realizar un tercer intento de vía periférica en extremidad superior contralateral","Acceso intraóseo en tibia proximal contralateral","Punción venosa yugular externa como alternativa rápida sin necesidad de equipo especial"]',
  '2',
  'El acceso intraóseo es el estándar de rescate cuando no se logra vía periférica en <90 segundos o 2 intentos en un paciente pediátrico crítico. Permite administrar todos los fármacos, fluidos y hemoderivados necesarios con eficacia equivalente a la vía IV. No debe retrasarse el tratamiento esperando un acceso venoso central, cuya colocación requiere tiempo significativo.',
  ARRAY['medico','enfermeria'],
  true,
  '["La regla en soporte vital pediátrico: si no hay vía periférica en <90 segundos o 2 intentos, intraósea inmediatamente","El acceso intraóseo en tibia proximal puede colocarse en <1 minuto con dispositivo de inserción mecánica (EZ-IO)"]',
  90,
  'Retrasar el acceso vascular en un paciente con herniación inminente impide la administración de osmoterapia y sedoanalgesia urgentes, con riesgo de muerte por enclavamiento.'
),
(
  $STEP_ID_2,
  'Preparas ácido tranexámico 15 mg/kg para este niño de 12 kg (dosis total = 180 mg). ¿Cómo lo administras correctamente?',
  '["Sin dilución, en bolo rápido intravenoso directo en 30 segundos","Diluido en 10 mL de suero fisiológico, en infusión IV lenta de 10 minutos","Diluido en 50 mL de suero fisiológico, en perfusión de 30 minutos","Diluido en 100 mL de suero fisiológico, en perfusión de 60 minutos"]',
  '1',
  'El TXA debe administrarse en bolo lento (10 minutos) para minimizar el riesgo de hipotensión, náuseas y convulsiones que puede producir la administración rápida. Una dilución en 10 mL de SF permite un control adecuado de la velocidad de infusión. La perfusión prolongada de 30-60 minutos no está justificada en urgencias traumáticas donde el tiempo es crítico.',
  ARRAY['farmacia'],
  false,
  '["El TXA en bolo rápido puede producir hipotensión y convulsiones; la infusión lenta de 10 minutos mejora la tolerabilidad sin perder eficacia","La concentración máxima recomendada para TXA IV es 100 mg/mL; diluciones más concentradas aumentan el riesgo de efectos adversos locales"]',
  null,
  null
);

-- ═══ PASO 3: Manejo de la hipertensión intracraneal ═══

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_3,
  'Detectas tríada de Cushing completa (FC 52, TA 158/95, FR 8 irregular) con midriasis derecha fija arreactiva. ¿Qué tratamiento osmótico inicias con prioridad?',
  '["Manitol 20% 1 g/kg IV en 20 minutos","Suero salino hipertónico 3% a 5 mL/kg en bolo IV","Furosemida 1 mg/kg IV para reducir la volemia cerebral","Dexametasona 0,15 mg/kg IV para reducir el edema perihematoma"]',
  '1',
  'En herniación transtentorial activa, el SSH 3% a 5 mL/kg en bolo es la primera línea según el algoritmo de la SEUP 2024, especialmente en pediatría, donde también actúa como expansor de volumen. El manitol puede usarse de forma alternativa (0,5-1 g/kg) si no hay hipotensión, pero el SSH es preferido en trauma pediátrico. Los corticoides no tienen indicación en HTIC traumática (el estudio CRASH demostró aumento de mortalidad) y la furosemida no es una medida de primera línea.',
  ARRAY['medico'],
  true,
  '["La herniación transtentorial activa (tríada de Cushing + midriasis fija) es una emergencia neurológica que requiere osmoterapia inmediata sin demoras","El SSH 3% tiene efecto osmótico y volumétrico simultáneo, lo que es especialmente ventajoso en politrauma donde puede coexistir hipovolemia"]',
  90,
  'El retraso en la osmoterapia ante signos de herniación transtentorial activa puede resultar en daño isquémico irreversible del tronco del encéfalo y muerte encefálica.'
),
(
  $STEP_ID_3,
  'El paciente está ventilado mecánicamente. La gasometría muestra: pH 7,38, PaCO2 41 mmHg, PaO2 102 mmHg. Los signos de herniación han cedido parcialmente tras la osmoterapia. ¿Cuál es tu objetivo de PaCO2?',
  '["PaCO2 25-30 mmHg (hiperventilación agresiva para máxima vasoconstricción cerebral)","PaCO2 30-35 mmHg (hiperventilación moderada de mantenimiento sistemático)","PaCO2 35-40 mmHg (normocapnia como objetivo estándar en HTIC sin herniación activa)","PaCO2 45-50 mmHg (hipercapnia permisiva para vasodilatación y mejora del flujo cerebral)"]',
  '2',
  'La SEUP 2024 recomienda mantener PaCO2 en 35-40 mmHg como objetivo estándar en HTIC traumática una vez controlada la herniación activa. La hiperventilación moderada (30-35 mmHg) se reserva como medida temporal de rescate en herniación refractaria a osmoterapia. La hiperventilación agresiva (<30 mmHg) produce vasoconstricción excesiva con isquemia cerebral secundaria y está contraindicada de forma mantenida. La hipercapnia está absolutamente contraindicada en HTIC.',
  ARRAY['medico'],
  true,
  '["La hiperventilación reduce PaCO2 → vasoconstricción cerebral → reducción del volumen sanguíneo intracraneal y de la PIC, pero a costa de isquemia si se mantiene","Normocapnia (35-40 mmHg) es el objetivo de mantenimiento; hiperventilación leve (30-35 mmHg) solo como medida de rescate temporal en herniación activa refractaria"]',
  90,
  'Mantener una hiperventilación agresiva de forma sostenida produce vasoconstricción cerebral excesiva con isquemia secundaria que puede ser tan dañina como la propia HTIC.'
),
(
  $STEP_ID_3,
  '¿Cuál de las siguientes medidas está CONTRAINDICADA en el manejo de la HTIC traumática pediátrica?',
  '["Cabecera elevada 15-30° con cuello en posición neutra","Analgesia y sedación adecuadas para evitar picos de PIC por estímulos","Administración de suero glucosado 5% como fluido de mantenimiento intravenoso","Monitorización invasiva de la presión intracraneal si GCS ≤8"]',
  '2',
  'Las soluciones hipotónicas (suero glucosado 5%, glucosalino, Ringer Lactato) están contraindicadas en HTIC porque reducen la osmolaridad sérica y agravan el edema cerebral por aumento del gradiente osmótico intersticial-intracelular. Los fluidos de mantenimiento deben ser isoosmolares (SF 0,9%) o hiperosmolares (SSH). Las demás opciones son medidas estándar y recomendadas en el manejo de la HTIC traumática.',
  ARRAY['medico','farmacia'],
  false,
  '["Cualquier solución con osmolaridad inferior a la plasmática (~308 mOsm/L) puede agravar el edema cerebral por paso de agua al espacio intracelular","El suero glucosado 5% tiene una osmolaridad efectiva ≈0 una vez metabolizada la glucosa, siendo francamente hipotónico para el cerebro"]',
  null,
  null
),
(
  $STEP_ID_3,
  'El paciente ingresa en UCIP intubado. ¿Qué parámetro debe monitorizarse de forma invasiva en un niño con TCE grave y GCS ≤8, según las guías actuales?',
  '["Presión venosa central (PVC) como indicador de volemia y guía de fluidoterapia","Temperatura continua por sonda esofágica para detectar hipertermia","Presión intracraneal (PIC) mediante sensor intraparenquimatoso o drenaje ventricular externo","Saturación de oxígeno por pulsioximetría convencional como único monitor de oxigenación"]',
  '2',
  'La monitorización invasiva de la PIC está indicada en TCE grave pediátrico con GCS ≤8, ya que permite guiar el tratamiento osmótico, ventilatorio y hemodinámico para mantener una presión de perfusión cerebral adecuada (PPC = PAM - PIC). La PVC no es un indicador fiable de volemia en pediatría. La temperatura es importante pero no requiere monitorización invasiva continua desde el primer momento. La pulsioximetría es insuficiente para el manejo fino de la HTIC.',
  ARRAY['enfermeria'],
  false,
  '["La PIC normal en niños es 9-20 mmHg; valores >20 mmHg mantenidos requieren escalada terapéutica inmediata","La presión de perfusión cerebral (PPC = PAM - PIC) debe mantenerse >40-50 mmHg según la edad; para ello necesitas PIC en tiempo real"]',
  null,
  null
),
(
  $STEP_ID_3,
  'En la visita de guardia, el residente propone manitol 20% 1 g/kg IV para el control de la PIC. El paciente acaba de presentar un episodio de hipotensión (TA 68/42 mmHg). ¿Cuál es tu posición?',
  '["De acuerdo; el manitol tiene efecto vasopresor directo que corregirá la hipotensión","Acuerdo parcial; lo administras a dosis reducida (0,25 g/kg) para minimizar el riesgo","En desacuerdo; el manitol es un diurético osmótico contraindicado si existe hipotensión, pues agrava la inestabilidad hemodinámica","De acuerdo; la reducción de PIC es prioritaria sobre la corrección de la tensión arterial en TCE grave"]',
  '2',
  'El manitol produce diuresis osmótica con pérdida de volumen intravascular y está formalmente contraindicado en presencia de hipotensión, ya que puede precipitar shock y reducir la presión de perfusión cerebral, empeorando la isquemia neuronal. Ante hipotensión con HTIC, la alternativa es el SSH 3% (5 mL/kg), que tiene efecto osmótico y expansor de volumen simultáneamente.',
  ARRAY['medico','farmacia'],
  true,
  '["El manitol es diurético osmótico: reduce la volemia; si ya hay hipotensión, reduce aún más la PPC y agrava la isquemia cerebral","El SSH 3% es el osmótico de elección cuando coexisten HTIC e hipotensión, ya que expande el volumen y reduce la PIC de forma simultánea"]',
  90,
  'Administrar manitol en hipotensión puede precipitar shock circulatorio con reducción crítica de la presión de perfusión cerebral, agravando la isquemia neuronal secundaria.'
),
(
  $STEP_ID_3,
  'Preparas la sedoanalgesia de mantenimiento para ventilación mecánica en este niño de 2 años con HTIC. ¿Qué combinación es la más adecuada?',
  '["Propofol en perfusión continua como único sedante a 4 mg/kg/h","Midazolam en bolo IV intermitente cada 4 horas según necesidad","Fentanilo en perfusión continua combinado con midazolam en perfusión, con escalada cuidadosa según respuesta","Ketamina en perfusión continua combinada con dexmedetomidina por sus propiedades neuroprotectoras"]',
  '2',
  'En niños menores de 3 años, el propofol en infusión continua está contraindicado por el riesgo de síndrome de infusión de propofol (PRIS), que puede ser fatal (acidosis metabólica, rabdomiólisis, arritmias). La combinación fentanilo + midazolam en perfusión es la pauta estándar en UCIP pediátrica para esta edad. La ketamina está contraindicada en HTIC. Los bolos intermitentes de midazolam generan picos de sedación y ventanas de infraanalgesia con picos de PIC.',
  ARRAY['farmacia'],
  false,
  '["El síndrome de infusión de propofol (PRIS) es más frecuente en niños pequeños con infusiones >4 mg/kg/h mantenidas; se manifiesta con acidosis metabólica, rabdomiólisis y fallo cardíaco","En niños <3 años con ventilación mecánica, la pauta de sedación debe basarse en midazolam + opioide en perfusión continua, no en propofol"]',
  null,
  null
);

-- ═══ PASO 4: Pruebas complementarias y diagnóstico ═══

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_4,
  'El TC craneal muestra hematoma subdural bilateral con edema cerebral difuso, sin fractura craneal ni lesión del cuero cabelludo. ¿Cuál es el mecanismo traumático que mejor explica este patrón en un niño de 2 años?',
  '["Impacto directo de alta energía contra superficie dura con lesión focal craneal","Caída accidental desde 50 cm sobre superficie blanda (sofá), compatible con el relato parental","Mecanismo de aceleración-desaceleración: traumatismo craneoencefálico abusivo (AHT)","Traumatismo de baja energía en niño con coagulopatía congénita no diagnosticada previamente"]',
  '2',
  'El hematoma subdural bilateral sin fractura craneal ni lesión del cuero cabelludo es el patrón radiológico característico del AHT (Abusive Head Trauma). Las fuerzas de aceleración-desaceleración producen cizallamiento de los puentes venosos durales sin necesidad de impacto directo. Una caída desde 50 cm no genera la energía suficiente para producir SDH bilateral. La coagulopatía podría explicar el hematoma, pero no el conjunto de hallazgos clínicos.',
  ARRAY['medico'],
  false,
  '["El SDH bilateral sin lesión craneal es biomecánicamente incompatible con una caída de baja energía; la energía necesaria para producir SDH por caída supera los 1,5-2 metros de altura","Las fracturas de cráneo sí aparecen en impactos directos de alta energía; su ausencia en SDH bilateral sugiere mecanismo de aceleración-desaceleración pura"]',
  null,
  null
),
(
  $STEP_ID_4,
  'El oftalmólogo describe hemorragias retinianas bilaterales extensas que alcanzan la periferia retiniana. ¿Cuál es el significado clínico de este hallazgo en el contexto de este caso?',
  '["Hallazgo inespecífico presente en cualquier tipo de TCE pediátrico grave","Indicador de coagulopatía grave secundaria al TCE con consumo de factores de coagulación","Hallazgo altamente específico del traumatismo craneoencefálico abusivo (AHT/síndrome del niño zarandeado)","Consecuencia directa del aumento de la PIC que produce estasis venosa retiniana bilateral"]',
  '2',
  'Las hemorragias retinianas bilaterales extensas que alcanzan la periferia son uno de los marcadores más específicos del AHT, con sensibilidad del 85% y especificidad >90% en el contexto adecuado. Su extensión periférica y bilateralidad las distingue de las hemorragias retinianas que pueden aparecer en otras causas (parto vaginal, maniobras de RCP). La triada SDH bilateral + hemorragias retinianas + historia inconsistente tiene un valor predictivo positivo muy elevado para AHT.',
  ARRAY['medico'],
  false,
  '["Las hemorragias retinianas en traumatismo accidental son infrecuentes, habitualmente unilaterales y limitadas al polo posterior","Las hemorragias retinianas bilaterales extensas hasta la periferia son el sello del mecanismo de aceleración-desaceleración por las fuerzas de tracción sobre los vasos vitreorretinianos"]',
  null,
  null
),
(
  $STEP_ID_4,
  '¿Qué proyecciones debe incluir el estudio radiológico esquelético completo en la sospecha de maltrato infantil en un niño menor de 2 años?',
  '["Radiografía de extremidades largas en proyección anteroposterior únicamente","Radiografía de tórax PA, pelvis AP y cráneo AP/lateral","Estudio esquelético completo: cráneo, tórax con oblicuas de costillas, columna, pelvis, extremidades completas con atención especial a metáfisis","TC de cuerpo entero como prueba única que sustituye al esqueleto convencional"]',
  '2',
  'El estudio esquelético completo según criterios ACR/SEUP incluye proyecciones especiales de costillas en oblicua (detectan fracturas posteriores de arco costal, altamente específicas de maltrato) y extremidades completas con atención a metáfisis (fracturas en asa de cubo y en esquina, patognomónicas de maltrato por tracción y torsión). El TC de cuerpo entero no sustituye al esqueleto completo porque tiene menor sensibilidad para fracturas metafisarias y costales posteriores.',
  ARRAY['medico','enfermeria'],
  false,
  '["Las fracturas costales posteriores en el arco costal son las más específicas de maltrato; solo se visualizan bien en proyección oblicua dedicada","Las fracturas metafisarias en asa de cubo (corner fractures) son patognomónicas de maltrato por tracción/torsión de extremidades en lactantes y niños pequeños"]',
  null,
  null
),
(
  $STEP_ID_4,
  'Como enfermera de urgencias, coordinas la valoración del fondo de ojo. ¿Cuándo y cómo debe realizarse en este contexto de sospecha de AHT?',
  '["Puede esperar a la estabilización completa en UCIP; no es urgente en las primeras 12-24 horas","La realiza el pediatra de urgencias con oftalmoscopio directo en el box de reanimación cuando la situación clínica lo permita","Requiere valoración urgente por oftalmólogo, preferiblemente antes de dilatar con midriáticos para no interferir con la evaluación pupilar neurológica","Solo puede realizarse si el paciente está consciente y coopera abriendo los ojos voluntariamente"]',
  '2',
  'La exploración del fondo de ojo debe realizarla el oftalmólogo de forma urgente como parte del protocolo diagnóstico de AHT. Debe realizarse antes de administrar midriáticos para no invalidar la monitorización neurológica pupilar (tamaño, reactividad). Los hallazgos deben documentarse mediante fotografía de retina. Es una pieza clave del diagnóstico y del posterior proceso judicial.',
  ARRAY['enfermeria'],
  false,
  '["Los midriáticos (tropicamida, ciclopentolato) paralizan el esfínter del iris durante 4-6 horas, invalidando la evaluación de los reflejos pupilares neurológicos","La fotografía del fondo de ojo es imprescindible para la documentación forense; la descripción verbal del oftalmólogo no es suficiente como evidencia judicial"]',
  null,
  null
),
(
  $STEP_ID_4,
  'Al prescribir el fluido de mantenimiento intravenoso en UCIP para este niño con TCE grave e HTIC, ¿cuál es la elección correcta?',
  '["Suero glucosalino 1/5 (glucosa 4% + NaCl 0,18%) a velocidad de mantenimiento por fórmula de Holliday-Segar","Ringer Lactato a 40 mL/h como fluido isoosmolar fisiológico","Suero fisiológico 0,9% como mínimo aceptable, o SSH según natremia y osmolaridad sérica","Suero glucosado 10% para mantener glucemia óptima y osmolaridad cerebral"]',
  '2',
  'Los fluidos hipotónicos están formalmente contraindicados en HTIC: el glucosalino 1/5 tiene osmolaridad ~63 mOsm/L, el glucosado 5% tiene osmolaridad efectiva ≈0 tras metabolismo de glucosa, y el Ringer Lactato tiene osmolaridad ~273 mOsm/L (hipotónico). Todos ellos agravan el edema cerebral. El SF 0,9% (308 mOsm/L) es el mínimo aceptable; el SSH es la elección cuando la osmolaridad sérica lo permite.',
  ARRAY['farmacia'],
  false,
  '["La osmolaridad del plasma es ≈308 mOsm/L; cualquier fluido con osmolaridad inferior favorece el paso de agua al espacio intracelular cerebral","El Ringer Lactato tiene osmolaridad de 273 mOsm/L, suficientemente hipotónico para agravar el edema cerebral en HTIC grave"]',
  null,
  null
);

-- ═══ PASO 5: Actuación ante sospecha de maltrato ═══

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES
(
  $STEP_ID_5,
  'Ante la sospecha fundamentada de maltrato físico grave, ¿a quién debes notificar de forma obligatoria e inmediata?',
  '["Solo al servicio de pediatría para ingreso en planta; el médico de guardia no tiene obligación de notificación judicial directa","Al trabajador social del hospital únicamente, quien gestiona de forma autónoma la notificación judicial","Al trabajador social del hospital Y al juzgado de guardia mediante parte de lesiones firmado por el médico responsable","A la policía directamente, omitiendo el circuito hospitalario de protección de menores"]',
  '2',
  'La notificación de sospecha de maltrato infantil es obligatoria por ley (Ley Orgánica 1/1996 de Protección Jurídica del Menor, modificada por Ley 26/2015) e implica notificación simultánea al trabajador social del hospital y al juzgado de guardia mediante parte de lesiones. No es suficiente con la notificación interna al servicio social; la comunicación judicial directa es obligatoria e inmediata para activar la protección legal del menor.',
  ARRAY['medico'],
  true,
  '["El parte de lesiones con sospecha de maltrato es un documento médico-legal obligatorio que debe firmarse siempre, independientemente de la certeza diagnóstica; basta la sospecha fundamentada","El trabajador social coordina el proceso de protección, pero no sustituye la obligación médica de notificación judicial directa al juzgado de guardia"]',
  90,
  'No notificar al juzgado de guardia implica incumplimiento de obligación legal de denuncia y puede dejar al menor en situación de riesgo vital si regresa con el agresor.'
),
(
  $STEP_ID_5,
  'Los padres modifican la historia en dos ocasiones durante el turno: primero "cayó del sofá", luego "se cayó de la trona". ¿Qué valor clínico tiene este cambio de versión?',
  '["Es esperable; los padres están en situación de shock emocional y pueden confundir detalles sin que ello tenga valor diagnóstico","Solo es significativo si la historia cambia tres o más veces o entre dos cuidadores distintos","Es un indicador mayor de sospecha de maltrato; la inconsistencia del relato es un criterio diagnóstico establecido en todas las guías","No tiene valor clínico si el mecanismo general referido (una caída) es el mismo en ambas versiones"]',
  '2',
  'La inconsistencia de la historia clínica entre distintos momentos o interrogadores es uno de los criterios diagnósticos mayores de maltrato físico infantil en todas las guías internacionales. No se trata de juzgar a los cuidadores, sino de registrar objetivamente los cambios. La variación del mecanismo (sofá vs. trona) no es un detalle menor: implica alturas, superficies y biomecánicas muy distintas, con implicaciones forenses directas.',
  ARRAY['medico','enfermeria'],
  false,
  '["En maltrato, la historia suele ser cambiante porque el relato está construido para justificar lesiones no accidentales; cualquier cambio debe documentarse con cita textual y hora","Un mecanismo inconsistente con la lesión es un criterio diagnóstico mayor de AHT; debe registrarse siempre aunque la historia parezca plausible en términos generales"]',
  null,
  null
),
(
  $STEP_ID_5,
  'Como enfermera responsable del caso, ¿qué elementos son imprescindibles en tu registro de enfermería en un caso de sospecha de maltrato?',
  '["El registro habitual de constantes vitales, procedimientos realizados y medicación administrada es suficiente","Descripción objetiva de las lesiones con localización, tamaño, forma y color; fotografías forenses fechadas con escala métrica; transcripción literal de las declaraciones de los cuidadores con hora de registro","Informe narrativo de sospecha firmado solo por el médico; enfermería no tiene responsabilidad documental forense","Las fotografías de lesiones en menores requieren consentimiento paterno firmado previamente y no pueden realizarse en urgencias sin él"]',
  '1',
  'La documentación forense de enfermería es una pieza clave del proceso judicial. Debe incluir: descripción objetiva de lesiones (localización anatómica precisa, tamaño en cm, color, morfología), fotografías con escala métrica y fecha, y transcripción literal de las declaraciones de los cuidadores con la hora exacta. Las fotografías forenses en menores víctimas de presunto delito no requieren consentimiento parental previo y deben realizarse con independencia de la oposición familiar.',
  ARRAY['enfermeria'],
  false,
  '["La documentación de enfermería tiene valor probatorio en el proceso judicial; sus anotaciones pueden ser determinantes en la sentencia","Las fotografías deben tomarse incluso si los padres se oponen: la protección del menor prima sobre el consentimiento de quien puede ser el agresor"]',
  null,
  null
),
(
  $STEP_ID_5,
  'Los padres exigen el alta voluntaria y quieren marcharse con el niño antes de completar la evaluación. ¿Puedes retener al menor sin orden judicial previa?',
  '["No, en ningún caso; si los padres solicitan el alta, debes dejar marchar al menor aunque tengas sospecha de maltrato","Sí, el médico tiene autoridad plena para retener a cualquier menor en situación de riesgo sin necesidad de actuación judicial","Sí, ante riesgo vital inminente el equipo puede retener al menor de forma provisional, comunicándolo de forma inmediata al juzgado de guardia y al servicio de protección de menores","No, pero puedes solicitar a seguridad del hospital que impida físicamente la salida sin comunicación judicial"]',
  '2',
  'Ante riesgo vital inminente, el equipo sanitario puede retener provisionalmente a un menor al amparo de la obligación de protección de personas vulnerables. Esta retención provisional debe comunicarse de forma inmediata al juzgado de guardia (para que emita una medida cautelar) y al servicio de protección de menores. No es una retención indefinida por decisión unilateral del médico, sino una medida provisional con comunicación judicial urgente y obligatoria.',
  ARRAY['medico'],
  false,
  '["La retención sin orden judicial es excepcional y provisional; no puede mantenerse indefinidamente sin respaldo judicial","La comunicación urgente al juzgado de guardia debe realizarse inmediatamente tras la decisión de retención, documentando los motivos clínicos y de seguridad del menor"]',
  null,
  null
);


-- ─────────────────────────────────────────
-- 4. CASE BRIEF
-- ─────────────────────────────────────────
INSERT INTO case_briefs (
  id, scenario_id, title, context, chief_complaint, chips,
  history, triangle, vitals, exam, quick_labs, imaging, timeline,
  red_flags, objectives, competencies, critical_actions,
  learning_objective, level, estimated_minutes
) VALUES (
  gen_random_uuid(),
  $SCENARIO_ID,
  'Politrauma: TCE con HTIC (sospecha de maltrato)',
  'Urgencias pediátricas hospitalarias — box de reanimación. Niño traído por el SUMMA con activación de código trauma.',
  'Inconsciencia progresiva tras caída desde sofá referida por los padres.',
  '["GCS 8 (O2V2M4)","Anisocoria derecha arreactiva","Tríada de Cushing","Hematomas en distintos estadios"]',
  '{
    "Síntomas": ["Deterioro del nivel de conciencia progresivo en las últimas 2 horas","Vómitos en proyectil en domicilio (2 episodios)","Hipotonía generalizada"],
    "Antecedentes": "Sin antecedentes médicos de interés. No intervenciones quirúrgicas previas. Vacunación al día.",
    "Medicación previa": "Ninguna.",
    "Motivo de consulta": "Caída accidental desde el sofá (aprox. 50 cm) hace 2 horas según relato de los padres, con deterioro neurológico progresivo desde entonces.",
    "Datos adicionales": "Hematomas en dorso y región glútea en distintos estadios de evolución. Historia que varía en dos ocasiones durante el triaje (sofá → trona)."
  }',
  '{"appearance":"red","breathing":"amber","circulation":"amber"}',
  '{"fc":58,"fr":10,"sat":94,"temp":37.1,"tas":148,"tad":92,"peso":12}',
  '{"Neurológico":"GCS 8 (O2V2M4). Anisocoria: pupila derecha 6 mm arreactiva, izquierda 3 mm reactiva. Hipotónico. No focalidad motora valorable.","Piel":"Palidez cutánea generalizada. Hematomas múltiples en distintos estadios (amarillo-verdoso y violáceo reciente) en dorso lumbar y glúteos. Sin lesiones en cuero cabelludo ni fractura craneal palpable.","Respiratorio":"FR 10 rpm. Respiración irregular tipo Cheyne-Stokes. Murmullo vesicular conservado bilateral. Sin tiraje.","Cardiovascular":"FC 58 lpm. TA 148/92 mmHg. Relleno capilar 3 segundos. Pulsos centrales presentes."}',
  '[{"name":"Hemoglobina","value":"9,5 g/dL"},{"name":"Glucemia capilar","value":"94 mg/dL"},{"name":"Lactato","value":"3,2 mmol/L"},{"name":"INR","value":"1,5"},{"name":"Sodio","value":"138 mEq/L"}]',
  '[{"name":"TC craneal urgente","status":"ordered"},{"name":"Rx tórax","status":"done"},{"name":"Serie ósea completa","status":"ordered"},{"name":"Fondo de ojo (oftalmología urgente)","status":"ordered"}]',
  '[{"t":0,"evento":"Traumatismo (según relato parental: caída desde sofá ~50 cm)"},{"t":60,"evento":"Inicio de vómitos y deterioro del nivel de conciencia en domicilio"},{"t":90,"evento":"Llamada al 112 por pérdida de conciencia"},{"t":120,"evento":"Llegada a urgencias pediátricas (GCS 8, anisocoria)"},{"t":125,"evento":"Activación código trauma pediátrico"}]',
  '[{"text":"GCS ≤8 con anisocoria unilateral fija (herniación transtentorial inminente)","correct":true},{"text":"Tríada de Cushing completa (hipertensión + bradicardia + bradipnea irregular)","correct":true},{"text":"Hematomas en distintos estadios en zonas no prominentes (dorso, glúteos)","correct":true},{"text":"Historia clínica cambiante e inconsistente con el patrón lesional","correct":true}]',
  '{
    "MED":["Reconocer los signos de herniación transtentorial e HTIC grave","Ejecutar la SRI correcta evitando fármacos contraindicados en HTIC","Indicar y dosificar correctamente la osmoterapia de emergencia","Aplicar el protocolo de sospecha de maltrato con notificación obligatoria"],
    "NUR":["Identificar el patrón TEP y activar el código trauma precozmente","Ejecutar la inmovilización cervical correcta (MILS) durante la intubación","Documentar forense y clínicamente las lesiones con fotografías fechadas","Coordinar la valoración oftalmológica urgente antes de administrar midriáticos"],
    "PHARM":["Calcular y preparar TXA a dosis pediátrica con dilución y velocidad correctas","Identificar los fluidos contraindicados en HTIC","Seleccionar la sedoanalgesia de mantenimiento adecuada evitando el síndrome de infusión de propofol en menores de 3 años"]
  }',
  '["Reconocimiento del TEP y activación precoz del código trauma","Secuencia de intubación rápida en TCE grave pediátrico","Osmoterapia de emergencia en herniación transtentorial","Interpretación de hallazgos diagnósticos de AHT","Protocolo obligatorio de notificación de maltrato","Trabajo interprofesional en escenario de alta complejidad ético-clínica"]',
  '["GCS ≤8 → intubación orotraqueal inmediata por SRI (VNI contraindicada)","Evitar ketamina en la SRI por HTIC activa","TXA 15-20 mg/kg (máx 1 g) en bolo lento en <3 horas del trauma","SSH 3% 5 mL/kg en bolo ante tríada de Cushing + midriasis fija","PaCO2 35-40 mmHg como objetivo de mantenimiento (30-35 solo si herniación activa refractaria)","Evitar fluidos hipotónicos (glucosado, Ringer Lactato, glucosalino) en HTIC","Manitol contraindicado si hipotensión arterial","Notificación obligatoria a trabajo social + juzgado de guardia ante sospecha de maltrato"]',
  'Manejar el TCE grave pediátrico con HTIC integrando el reconocimiento del AHT y el protocolo obligatorio de sospecha de maltrato.',
  'avanzado',
  25
);


-- ─────────────────────────────────────────
-- 5. CASE RESOURCES
-- ─────────────────────────────────────────
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), $SCENARIO_ID,
   'Guía de práctica clínica de hipertensión intracraneal en urgencias de pediatría — SEUP 2024',
   'https://seup.org/pdf_public/gt/htic_urgencias_pediatria.pdf',
   'SEUP', 'guía', 2024, true, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Guía de práctica clínica de politrauma pediátrico — SEUP 2024',
   'https://seup.org/pdf_public/gt/politrauma_pediatrico.pdf',
   'SEUP', 'guía', 2024, true, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Protocolo de actuación ante sospecha de maltrato infantil — Ministerio de Sanidad / SNS 2024',
   'https://www.sanidad.gob.es/biblioPublic/publicaciones/recursos_propios/respCiudadana/docs/MaltratoInfantil.pdf',
   'Ministerio de Sanidad', 'protocolo', 2024, true, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Abusive Head Trauma: Evidence-based diagnosis and management — Pediatrics 2020',
   'https://doi.org/10.1542/peds.2020-0203',
   'Pediatrics (AAP)', 'artículo', 2020, false, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Effects of tranexamic acid on death, vascular occlusive events, and blood transfusion in trauma patients (CRASH-2) — Lancet 2010',
   'https://doi.org/10.1016/S0140-6736(10)60835-5',
   'The Lancet', 'artículo', 2010, false, now());
