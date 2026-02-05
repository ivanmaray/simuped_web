-- ==============================================================================
-- EXTRACCIÓN COMPLETA ESCENARIO 57 (INTOXICACIÓN POR PARACETAMOL)
-- ==============================================================================
-- Escenario ID: 57
-- Título: Intoxicación por Paracetamol en Niña de 8 años
-- Protocolo: SNAP para intoxicación aguda por paracetamol
-- Total preguntas: 36 (14 médico, 12 enfermería, 10 farmacia)
-- Críticas: 4 (1 por step), con temporizador >90 segundos
-- ==============================================================================

-- ==============================================================================
-- PASO 1: CASE BRIEF
-- ==============================================================================

DELETE FROM case_briefs WHERE scenario_id = 57;

INSERT INTO case_briefs (
  scenario_id,
  title,
  context,
  chief_complaint,
  history,
  exam,
  vitals,
  quick_labs,
  objectives,
  critical_actions,
  red_flags,
  competencies,
  triangle
) VALUES (
  57,
  'Intoxicación Aguda por Paracetamol en Niña de 8 años',
  'Urgencias Pediátricas. Niña de 8 años que acude 3 horas después de ingesta accidental de paracetamol. Los padres traen el envase vacío: 8 comprimidos de 500 mg = 4000 mg total. Niña pesa 26 kg. Ingesta única a hora conocida (hace 3 horas). Actualmente asintomática, pero requiere valoración y tratamiento preventivo con NAC según nomograma Rumack-Matthew.',
  'Ingesta accidental de paracetamol hace 3 horas',
  '{"antecedentes": "Niña de 8 años previamente sana, sin alergias conocidas, vacunación completa. Medicaciones: ninguna.", "enfermedad_actual": "Padres encuentran frasco vacío de paracetamol. Aproximadamente 8 comprimidos de 500 mg (4000 mg totales) ingeridos hace 3h. Niña refiere leve malestar abdominal. Niega vómitos, dolor abdominal intenso, o síntomas sistémicos. Hora estimada ingesta: 15:30 (hora actual: 18:30)."}',
  '{"aspecto_general": "Niña alerta, aparentemente bien, sin distrés.", "abdomen": "Blando, depresible, sin dolor a la palpación, sin hepatomegalia", "hepatico": "Hígado no palpable, borde no palpable, sin cambios de coloración de piel", "neuro": "Glasgow 15/15, lúcida y orientada", "piel": "Tez normal, sin ictericia, sin petequias"}',
  '{"temperatura": "36.8°C", "fc": 85, "fr": 20, "tas": 110, "tad": 70, "sao2": 98, "peso": 26, "glasgow": 15}',
  '{"hemograma": {"hb": "13.2 g/dL", "leucocitos": "7200/μL", "plaquetas": "245.000/μL"}, "bioquimica": {"glucosa": "92 mg/dL", "urea": "18 mg/dL", "creatinina": "0.7 mg/dL", "ALT": "32 U/L", "AST": "28 U/L", "bilirrubina": "0.6 mg/dL", "sodio": "138 mEq/L", "potasio": "4.1 mEq/L"}, "coagulacion": {"INR": 1.0, "TP": "12 seg"}, "otros": {"paracetamol_plasma": "sin disponible en urgencias; se extraerá a 4h post-ingesta"}}',
  '["Reconocer intoxicación potencial por paracetamol y uso del nomograma Rumack-Matthew", "Administración temprana de N-acetilcisteína (NAC) si nivel plasmático >150 μg/mL a 4h post-ingesta", "Monitorización de función hepática, coagulación y estado clínico", "Comprensión del protocolo SNAP (Severe Paracetamol Over-dose ): bolsas 100-200-100 mg/kg", "Educación familiar sobre signos de hepatotoxicidad e higiene con medicamentos", "Evaluación de intento autolítico si ingesta deliberada"]'::jsonb,
  '["Extraer nivel plasmático EXACTAMENTE a 4h post-ingesta (15:30 + 4h = 19:30)", "Hemocultivos previos a NAC pero NO retrasar si es necesario", "Si nivel >150 μg/mL: iniciar NAC SNAP 100 mg/kg en 2h (2600 mg IV), seguido de 200 mg/kg en 10h (5200 mg IV)", "Criterios parada SNAP a 2h: INR ≤1.3 + ALT <100 + paracetamol plasma <20 → completar bolsa 2", "Vigilancia de signos de anafilatoide (histamina): prepara difenhidramina 1 mg/kg IV + adrenalina 0.01 mg/kg IM", "Educación familia: educación alta, medicamentos a evitar (paracetamol OTC, AINEs, alcohol ≥7 días)", "Si intento autolítico: valoración psiquiátrica ANTES alta, plan de seguridad"]'::jsonb,
  '["Intoxicación por paracetamol: puede ser asintomática inicialmente pero causa hepatotoxicidad severa en días posteriores", "Nomograma Rumack-Matthew: línea de decisión tratamiento a 4h post-ingesta ~150 μg/mL (crítica para pediátricos)", "Anafilactoide a NAC: 2-10% casos, histamina liberada, manifestaciones: prurito, rash, hipotensión, broncoespasmo", "Síntomas de insuficiencia hepática fulminante: ictericia progresiva + confusión (encefalopatía) + coagulopatía + RUQ dolor severo", "Kings College criteria trasplante: INR >3.5 + encefalopatía grado III-IV = urgencia trasplante"]'::jsonb,
  '["Manejo de intoxicación aguda en urgencias pediátricas", "Toxicología pediátrica: nomogramas, farmacocinética, dosificación mg/kg", "Fluidoterapia IV: accesos vasculares, diluyentes, velocidad infusión", "Monitorización hemodinámica y reacciones adversas a medicamentos", "Comunicación y educación sanitaria a familias", "Valoración de ideación autolítica y derivación mental"]'::jsonb,
  '{"appearance":"well","breathing":"normal","circulation":"normal"}'::jsonb
);

-- ==============================================================================
-- PASO 2: STEPS
-- ==============================================================================

DELETE FROM steps WHERE scenario_id = 57;

INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  57,
  1,
  'Valoración Inicial y Nomograma',
  'Niña de 8 años (26 kg) acude a urgencias 3 horas después de ingesta accidental de 8 comprimidos de paracetamol 500 mg (4000 mg totales). Los padres refieren que la encontraron junto al frasco vacío. Niña está alerta, sin síntomas gastrointestinales graves, aparentemente bien. Constantes vitales normales. Actualmente te encuentras en el momento crítico para decidir si realizar extracción de nivel plasmático a 4h exactas post-ingesta (19:30). Necesitas aplicar el nomograma Rumack-Matthew para calcular riesgo de hepatotoxicidad.',
  false
);

INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  57,
  2,
  'Resultado Nomograma e Iniciación NAC',
  'Se ha extraído nivel plasmático a las 4h exactas post-ingesta: 155 μg/mL (ARRIBA de la línea de tratamiento pediátrica ~150 μg/mL). Hace 1h en urgencias. Niña continúa asintomática. Está canalizada vía periférica gruesa (18-20G). Hemocultivos ya han sido extraídos. Ahora requiere iniciación inmediata de protocolo SNAP con NAC IV. El farmacéutico está preparando la primera bolsa. Peso confirmado 26 kg.',
  false
);

INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  57,
  3,
  'Administración NAC y Manejo de Reacciones',
  'Ha transcurrido 1h desde la extracción de nivel (ahora son las 20:30). Primera bolsa NAC (2600 mg/300 mL SSN 0.9%, infusión a 150 mL/h durante 2 horas) está terminando. Niña refiere prurito leve generalizado y pequeño rash urticariforme en tronco (sugestivo de reacción anafilactoide NAC, histamina). Constantes vitales: FC 100, TA 105/70 (normal), SatO2 98%, Glasgow 15. ¿Cómo procedes?',
  false
);

INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  57,
  4,
  'Reevaluación y Preparación para Alta',
  'Han transcurrido 12 horas desde inicio NAC (ha completado SNAP 12h total: 2600 mg + 5200 mg). Laboratorios a las 2h fin bolsa 1: INR 1.2, ALT 58 U/L, paracetamol plasma <10 μg/mL. Criterios parada cumplen pero se completó bolsa 2 por protocolo. Niña está completamente asintomática, alerta, buen estado general. Laboratorios actuales (12h post-NAC): ALT 42 U/L, AST 35 U/L, INR 1.0, función hepática y coagulación normales. Está lista para alta pero requiere educación familiar y evaluación de si fue ingesta deliberada (intento autolítico).',
  false
);

-- ==============================================================================
-- PASO 3: QUESTIONS (36 preguntas)
-- ==============================================================================

DELETE FROM attempt_answers WHERE question_id IN (SELECT q.id FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = 57);
DELETE FROM questions WHERE step_id IN (SELECT id FROM steps WHERE scenario_id = 57);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Niña 8 años, 26 kg, ingestión 8 × 500 mg paracetamol hace 3h. Cálculo dosis total en mg/kg:',
  '["153.8 mg/kg (4000÷26) supera 150; timing 3h favorable NAC temprana", "77 mg/kg: error conteo comprimidos (4 × 500)", "31 mg/kg: sería seguro pero contradice historia (8×500=4000)", "4000 mg absoluto: válido solo nomograma usa dosis absoluta"]',
  0,
  '8 × 500 = 4000 mg ÷ 26 kg = 153.8 mg/kg. Supera 150 mg/kg pediátrico. Error cálculo u omisión mg/kg = riesgo protección insuficiente.',
  ARRAY['medico'],
  true,
  '["153.8 mg/kg","4000÷26","Timing 3h"]',
  120,
  'Cálculo erróneo omite tratamiento preventivo.'
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Nomograma Rumack-Matthew: línea de tratamiento a 4h es aproximadamente:',
  '["~150 μg/mL (línea referencia pediátrica)", "~100 μg/mL", "~200 μg/mL", "~250 μg/mL"]',
  0,
  'Línea de tratamiento pediátrica ~150 μg/mL a 4h (referencia decisión NAC).',
  ARRAY['medico'],
  false,
  '["150 μg/mL a 4h"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Ingesta única a hora conocida. Timing para extracción nivel con nomograma:',
  '["Estrictamente a 4h post-ingesta exactas (no antes ni después)", "Antes de 4h para anticipar nivel pico", "Después de 4h sin urgencia", "Flexible: cualquier momento primeras 6h"]',
  0,
  'Nomograma válido ≥4h post-ingesta. Extraer 4h exactas; antes da falsos negativos, omite tratamiento.',
  ARRAY['medico'],
  false,
  '["4h exactas post-ingesta","No antes: falsos negativos"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Muestra para nomograma a 4h post-ingesta. Datos CRÍTICOS en etiqueta:',
  '["Hora exacta extracción + hora estimada ingesta (ejes nomograma)", "Nombre paciente y DOB", "Hora llegada urgencias", "Tipo presentación fármaco"]',
  0,
  'Nomograma: ejes concentración × tiempo post-ingesta. Sin ambos tiempos curva ininterpretable.',
  ARRAY['enfermeria'],
  false,
  '["Hora extracción + hora ingesta"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Vía aérea y acceso IV pediátricos. Calibre recomendado para NAC en 26 kg:',
  '["IV gruesa 18-20G (dos accesos: uno NAC, otro soporte)", "22-24G (periférica delgada)", "Vía central directamente", "Oral (NAC VO)"]',
  0,
  'NAC IV 2600 mg/2h: vía gruesa (18-20G) permite flujo adecuado. Dos accesos: uno NAC, otro medicaciones.',
  ARRAY['enfermeria'],
  false,
  '["IV gruesa 18-20G","Dos accesos"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Histamina NAC reacción anafilactoide (2-10% SNAP). Prepare enfermería ANTES infusión con dosis pediátricas:',
  '["Difenhidramina 1 mg/kg (26 mg IV), adrenalina 0.01 mg/kg (0.26 mg IM), SSN expansor, O2, RCP disponibles", "Antihistamínico oral + paracetamol profilaxis agiliza", "Monitorización; tratamiento solo si síntomas", "Epinefrina IM calibre alto; reacción siempre severa"]',
  0,
  'Anafilatoide NAC 2-10%: calcule dosis mg/kg ANTES iniciar. Difenhidramina 26 mg; adrenalina 0.26 mg IM. Intervención rápida crítica.',
  ARRAY['enfermeria'],
  false,
  '["Difenhidramina 26 mg","Adrenalina 0.26 mg"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Monitorización Glasgow/nivel conciencia durante valoración inicial. ¿Frecuencia?',
  '["Cada 30 min o más frecuente si empeoramiento; alertar si Glasgow <12", "Solo al inicio", "Cada 4 horas", "No rutinariamente"]',
  0,
  'Encefalopatía hepática puede progresar rápidamente. Vigilancia neurológica seriada crítica.',
  ARRAY['enfermeria'],
  false,
  '["Glasgow c/30 min","<12 = alerta médico"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Comunicación a familia: explicar por qué esperar 4h para extraer nivel. Mensajismo:',
  '["Se necesitan 4h para tóxico distribuya, alcance concentración máxima; antes resultado falso bajo, omite tratamiento", "Sin explicación", "Porque sí protocolo", "Razones complicadas"]',
  0,
  'Comunicación clara familia: nomograma requiere 4h para lectura válida; antes falsos negativos omitirían NAC.',
  ARRAY['enfermeria'],
  false,
  '["Educación familia 4h"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Paciente Glasgow 12/15, FR 8 (bradipnea severa), cianosis peribucal, SpO2 85%. Prioridad inmediata:',
  '["ABC: vía aérea (intubación), O2 inmediato, ventilatorio; naloxona si opioides; DESPUÉS nivel paracetamol", "Carbón activado VO inmediato", "Extraer paracetamol/nomograma", "NAC inmediato; acetilcisteína mejora bradipnea"]',
  0,
  'Glasgow 12 + FR 8 + SpO2 85% + cianosis = paro inminente. ABC antes toxicología específica. Coingesta opioide → naloxona.',
  ARRAY['medico'],
  false,
  '["ABC primero","FR <8=crítica"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Orden médica: "NAC 2-bag: 200 mg en 4h para 26 kg (total 400 mg)". Validación farmacia:',
  '["Intervención: SNAP 100 mg/kg (2h) + 200 mg/kg (10h) ≠ 200 mg. Para 26 kg: 2600 + 5200 mg. Registrar error", "Dispensar 200 mg/4h; dosis fija válida OTC", "3-bag tradicional (150-50-100 mg/kg): 3900 + 1300 + 2600", "4000 mg total sin desglose"]',
  0,
  'Orden confunde: 400 mg ≠ SNAP bolsas. SNAP: 100 mg/kg (2h)=2600 mg; 200 mg/kg (10h)=5200 mg. Intervención obligatoria.',
  ARRAY['farmacia'],
  false,
  '["SNAP 2600+5200","NO 400 mg","Error crítico"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'NAC diluyente recomendado para 26 kg (sin restricción hídrica):',
  '["SSN 0.9%; 10-15 mg/mL; volumen 250-300 mL", "Glucosa 5%; 15-20 mg/mL; 250-300 mL", "Agua estéril; 10 mg/mL; 250 mL", "Sin diluir; 200 mg/mL directo IV"]',
  0,
  'NAC IV: diluyente SSN 0.9%; 10-15 mg/mL minimiza irritación; agua pura causa flebitis.',
  ARRAY['farmacia'],
  false,
  '["SSN 0.9%","10-15 mg/mL"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Etiquetado bolsa NAC para Urgencias (2600 mg/300 mL). Seleccione etiqueta correcta:',
  '["Nombre; 2600 mg; 300 mL; conc. ≈8.7 mg/mL; 100 mg/kg; hora prep/expir", "Nombre; 2600 mg; 10 mg/mL; sin volumen ni mg/kg", "Nombre; 200 mL; 13 mg/mL; sin hora", "Lote vencimiento; sin datos dosimétricos"]',
  0,
  'Etiquetado completo: 2600÷300≈8.7 mg/mL. Trazabilidad crítica infusiones pediátricas.',
  ARRAY['farmacia'],
  false,
  '["Etiqueta: conc, dosis"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 1 LIMIT 1),
  'Educación familia: medicamentos evitar en casa post-alta (≥1 semana):',
  '["Paracetamol OTC (jarabe 160 mg/5 mL: 10 mL=320 mg); AINEs; alcohol; paracetamol-codeína", "OTC habituales; 10 mL jarabe es baja dosis", "Ibuprofeno preferible; paracetamol cápsulas OK", "Paracetamol siempre seguro; evitar AINEs"]',
  0,
  'Educación reexposición: riesgo hepatotoxicidad. Paracetamol OTC (160 mg/5 mL) = 320 mg/toma riesgo acumulativo.',
  ARRAY['farmacia'],
  false,
  '["EVITAR paracetamol OTC"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 2 LIMIT 1),
  'Nivel plasmático 4h: 155 μg/mL. Línea Rumack pediátrica ~150. Conducta y seguimiento:',
  '["Iniciar NAC SNAP 2600 mg/2h. A 2h: si INR ≤1.3 + ALT <100 + paracetamol <20 → bolsa 2", "Observar sin NAC; 155 marginal", "Repetir 6h; NAC solo si >200", "Diuresis forzada"]',
  0,
  '155 > 150: SNAP obligatorio. Criterios parada 2h: INR ≤1.3 AND ALT <100 AND paracetamol <20 → completar 12h.',
  ARRAY['medico'],
  true,
  '["155 > 150","SNAP 12h"]',
  120,
  'No tratar omite protección.'
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 2 LIMIT 1),
  'Llegada tardía 18h post-ingesta. Nivel 95 μg/mL (bajo), ALT 55, INR 1.2. ¿NAC?',
  '["SÍ: NAC hasta 24h si LFT↑; beneficio tardío pero presente", "NO: fuera ventana", "Repetir nivel", "Solo observar"]',
  0,
  'NAC beneficio hasta 24h si daño hepático (LFT↑). Iniciar aunque tardío.',
  ARRAY['medico'],
  false,
  '["Ventana extendida si LFT↑"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 2 LIMIT 1),
  'Valor justo en línea (150 μg/mL exacto). Decisión:',
  '["Tratar NAC: en línea = indicación (no esperar)", "Observar", "Repetir nivel", "Solo si >150"]',
  0,
  'En línea: tratar por seguridad (ante duda protege).',
  ARRAY['medico'],
  false,
  '["En línea = trata"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 2 LIMIT 1),
  'Nausea/vómito durante nomograma/espera (antes NAC). Manejo:',
  '["Observar; antiemético IV (ondansetrón 0.1-0.15 mg/kg) si persiste; vigilar aspiración", "Forzar vómito", "Carbón activado", "Reposo solo"]',
  0,
  'Náusea común; antiemético si persiste; cuidado aspiración con Glasgow bajo.',
  ARRAY['enfermeria'],
  false,
  '["Antiemético si persiste"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 2 LIMIT 1),
  'Paciente prurito leve 30 min NAC. ¿Acción?',
  '["Observar, mantener acceso, antihistamínico listo NO detener; si avanza → detener", "Detener inmediatamente", "Continuar sin cambios", "Dar antihistamínico IM"]',
  0,
  'Prurito leve: precursor reacción pero no siempre. Vigilancia; intervenir si progresa.',
  ARRAY['enfermeria'],
  false,
  '["Observar y prepararse"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 2 LIMIT 1),
  'Farmacéutico revisa nomograma 4h: 155 μg/mL (>150). Calcule SNAP dosis:',
  '["100 mg/kg/2h = 2600 mg; 200 mg/kg/10h = 5200 mg. Verificar stock ampollas, SSN, IV", "NAC no necesario; 155 cae <6h post-distribución", "Dosificación OTC: acetaminofén 15 mg/kg c/4-6h", "Segundo nivel; si baja <150 evitar NAC"]',
  0,
  'Nomograma >150: farmacéutico calcula 100 × 26 = 2600 mg (2h); 200 × 26 = 5200 mg (10h). Stock crítico.',
  ARRAY['farmacia'],
  false,
  '["2600 mg (2h)","5200 mg (10h)"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 2 LIMIT 1),
  'Nivel 142 μg/mL a 4h (bajo, cerca línea). Médico-farmacia: "Evitar NAC?". Farmacéutico:',
  '["Tratar NAC: 142 cercano ~150; SNAP por seguridad, conservador pediátrico", "No tratar: 142 bajo, sin riesgo", "Repetir 6h; posponer NAC", "Nomograma adultos usa 200; no aplica"]',
  0,
  'Farmacéutico voz crítica: 150 línea pediátrica; 142 cercano = riesgo marginal → NAC por protección.',
  ARRAY['farmacia'],
  false,
  '["142 cerca 150 → NAC"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 2 LIMIT 1),
  'Dilución y volumen segunda bolsa SNAP (200 mg/kg en 10h, 5200 mg):',
  '["5200 mg en 300-400 mL SSN 0.9% (≈13-17 mg/mL) para 10h", "Bolsa pequeña concentrada completar rápido", "Infundir rápido 2-3h eficacia", "Vía oral únicamente"]',
  0,
  'Segunda bolsa: 5200 mg en 300-400 mL SSN; infusión más lenta (10h vs 2h).',
  ARRAY['farmacia'],
  false,
  '["Volumen 300-400 mL"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 3 LIMIT 1),
  'Criterios SNAP discontinuación 2h (fin bolsa 1): INR ≤1.3 Y ALT <100 Y paracetamol <20. Paciente: INR 1.2, ALT 22, paracetamol 12. ¿Bolsa 2?',
  '["SÍ: criterios cumplen; pero protocolo SNAP 12h recomienda completar bolsa 2", "NO: puede alta", "Esperar 6h", "Cambiar VO"]',
  0,
  'Criterios parada cumplen pero protocolo 12h completo recomienda bolsa 2 por cobertura.',
  ARRAY['medico'],
  false,
  '["Completar SNAP 12h"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 3 LIMIT 1),
  'Primera bolsa SNAP: 2600 mg/300 mL SSN (conc. ~8.7 mg/mL). Calcule velocidad 2h y detecte riesgo:',
  '["300 mL ÷ 2h = 150 mL/h. Conc. 8.7 mg/mL segura pero NAC irritante; vigilancia flebitis obligatoria", "75 mL/h; duración 4h mejor tolerancia pero protocolo 2h", "300 mL/h; bolus rápido conc. baja pero sobrecarga volumen", "Mixta 150→100 mL/h"]',
  0,
  '300 mL ÷ 2 h = 150 mL/h. NAC irritante → vigilancia IV seriada crítica (flebitis).',
  ARRAY['farmacia'],
  false,
  '["150 mL/h","Flebitis risk"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 3 LIMIT 1),
  'Validación dosis preparación NAC: 26 kg, 100 mg/kg primera bolsa. ¿Double check?',
  '["Verificar: 26 × 100 = 2600 mg; orden legible; 200 mg/mL: 2600÷200 = 13 mL", "Sin verificación", "Solo nombre paciente", "Confianza prescriptor"]',
  0,
  'Double check farmacéutico: mg/kg × 26 = 2600 mg; cálculo volumen ampollas (200 mg/mL → 13 mL).',
  ARRAY['farmacia'],
  false,
  '["Double check mg/kg"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 3 LIMIT 1),
  'Paciente durante NAC refiere dolor localizado extremidad IV. ¿Causa y acción?',
  '["Flebitis química NAC irritante o extravasación; revisar, cambiar vía; difenhidramina local", "Alergia a NAC", "Sin importancia", "Continuar"]',
  0,
  'NAC irritante: riesgo flebitis. Vigilancia IV seriada; cambiar si inflamación progresa.',
  ARRAY['enfermeria'],
  false,
  '["NAC irritante → vigilancia"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 3 LIMIT 1),
  'Cambio turno enfermería durante NAC (bolsa 1 curso). Handoff crítico:',
  '["Comunicar: tiempos inicio/fin, constantes, eventos, medicaciones, próximas, cuidado IV", "Cambio sin comunicación", "Nota escrita solo", "Sin detalles"]',
  0,
  'Handoff completo esencial: continuidad cuidado, trazabilidad, seguridad.',
  ARRAY['enfermeria'],
  false,
  '["Handoff estructurado"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 3 LIMIT 1),
  'Reacción anafilactoide 45 min: prurito, rash, TA 82/45 (caída 20 mmHg), sibilancias, piel fría. Manejo:',
  '["Detener NAC. O2 6 L/min (SpO2 >94%). Difenhidramina 26 mg IV (1 mg/kg); SSN bolo 10-20 mL/kg; adrenalina 0.26 mg IM (0.01 mg/kg)", "Continuar NAC mitad vel", "Suspender NAC definitivamente", "Solo corticoides"]',
  0,
  'Shock anafilactoide: ABC inmediato. Dosis mg/kg: difenhidramina 1 mg/kg (26 mg IV); adrenalina 0.01 mg/kg (0.26 mg IM).',
  ARRAY['medico'],
  true,
  '["Detén NAC","Adrenalina 0.26 mg"]',
  150,
  'Continuar = shock fulminante.'
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 3 LIMIT 1),
  'Paciente día 2 post-NAC (fin SNAP 12h). AST 300, ALT 380, INR 1.5. ¿Tercera bolsa NAC?',
  '["SÍ: LFT >3-5× ULN + INR >1.3 = hepatotoxicidad; tercera bolsa + monitorización", "NO: valores bajando", "Alta", "Solo observar"]',
  0,
  'Daño hepático establecido: continuar NAC tercera bolsa (100 mg/kg en 10-20h).',
  ARRAY['medico'],
  false,
  '["LFT>3-5× → tercera"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 4 LIMIT 1),
  '12h post-NAC: AST 450, ALT 520, INR 1.9, paracetamol no detectable. Conducta:',
  '["Ingreso UCI, tercera bolsa NAC (100 mg/kg 10-20h), LFT c/6-12h, trasplante si INR >3 + encef", "Alta", "Suspender NAC", "Observación 4h"]',
  0,
  'Hepatotoxicidad confirmada (>5× ULN): ingreso, NAC continuada, valoración trasplante si empeora.',
  ARRAY['medico'],
  false,
  '["Daño hepático → ingreso"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 4 LIMIT 1),
  'Criterios Kings College trasplante (paracetamol, fulminante):',
  '["INR >3.5 + encefalopatía grado III-IV (sin importar bilirrubina)", "INR >2", "AST >2000", "Alto ALT"]',
  0,
  'Kings College: INR >3.5 + encefalopatía (III-IV) = trasplante inmediato.',
  ARRAY['medico'],
  false,
  '["INR>3.5 + encefalopatía"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 4 LIMIT 1),
  'Lactato plasmático >3 mmol/L follow-up 24h. Significado:',
  '["Marcador gravedad = mitocondrial disfunción; prognóstico pobre; acelerador trasplante", "Sin importancia", "Buen pronóstico", "Signo recuperación"]',
  0,
  'Lactato >3 = mitocondrial injury severa; indicador peor outcome.',
  ARRAY['medico'],
  false,
  '["Lactato >3 = grave"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 4 LIMIT 1),
  'Educación familia ANTES alta: signos alarma regreso INMEDIATO:',
  '["Ictericia progresiva 24-48h + confusión/desorientación (encef I-II) + sangrados (nariz, vómito negro, heces negras) + RUQ severo + orina oscura; urgencia INMEDIATO", "Fiebre >38°C; paracetamol 500 mg; reposar", "Rash leve; astenia; esperar 1 semana", "Mal humor; ansiedad; descanso"]',
  0,
  'Signos fallo fulminante: ictericia progresiva + confusión (encef I-II) + coagulopatía + hepatalgia RUQ = urgencia INMEDIATO. Educación salva vidas.',
  ARRAY['enfermeria'],
  false,
  '["Ictericia + confusión","Sangrados"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 4 LIMIT 1),
  'Paciente asintomático 48h post-NAC, LFT normales. Preparación para alta:',
  '["Reposo relativo 72h; evitar ejercicio; dieta normal; LFT 72-96h; contacto urgencia si signos", "Actividad normal inmediata", "Dieta restringida", "No seguimiento"]',
  0,
  'Alta segura con convalecencia: reposo inicial, LFT follow-up confirma resolución.',
  ARRAY['enfermeria'],
  false,
  '["Reposo relativo 72h"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 4 LIMIT 1),
  'Paciente 48h post-NAC, leve ictericia, ALT 150 (elevada pero bajando). ¿Retención o alta?',
  '["Retención: ictericia + ALT persistente = riesgo progresión; LFT c/12h; traslado si empeora", "Alta inmediata", "Esperar 1 semana", "Alta con analgésicos"]',
  0,
  'Ictericia emergente + ALT persistente = vigilancia estricta; retención prudente.',
  ARRAY['enfermeria'],
  false,
  '["Ictericia+ALT = retención"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 4 LIMIT 1),
  'Conciliación medicación post-alta (tras NAC 12h). Educación farmacia:',
  '["EVITAR: Paracetamol OTC (jarabe 160 mg/5 mL → 10 mL = 320 mg); AINEs; alcohol ≥1 semana; paracetamol-codeína", "Ibuprofeno seguro preferible", "Alcohol social >24h OK", "Sin restricciones"]',
  0,
  'Educación reexposición: riesgo hepatotoxicidad. Paracetamol OTC (320 mg/toma) = acumulativo. Evitar ≥1 semana + alcohol.',
  ARRAY['farmacia'],
  false,
  '["EVITAR paracetamol OTC","Alcohol ≥1 semana"]',
  90,
  null
);

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES
(
  (SELECT id FROM steps WHERE scenario_id = 57 AND step_order = 4 LIMIT 1),
  'Intento autolítico: ingesta intencionada. ANTES alta:',
  '["Valoración psiquiátrica formal (ideación, planes, protectores, apoyo), plan seguridad (retiro tóxicos, contactos), derivación mental", "Alta con recomendación psicología", "Observación 24h sin psiquiatría", "Solo médico urgencias"]',
  0,
  'Obligación legal/ética: psiquiatría formal + plan seguridad ANTES alta intento autolítico.',
  ARRAY['medico'],
  true,
  '["Psiquiatría obligatoria"]',
  150,
  'Alta sin valoración = negligencia.'
);

-- ==============================================================================
-- PASO 4: CASE RESOURCES (opcional, si existen)
-- ==============================================================================

DELETE FROM case_resources WHERE scenario_id = 57;

-- Agregar recursos si los hay disponibles
-- INSERT INTO case_resources (scenario_id, resource_order, resource_type, title, url, description) VALUES ...

-- ==============================================================================
-- FIN EXTRACCIÓN ESCENARIO 57
-- ==============================================================================
-- Total: case_brief, 4 steps, 36 questions
-- Críticas: 4 (una por step, con timers >90s)
-- Roles: Médico 14, Enfermería 12, Farmacia 10
-- ==============================================================================
