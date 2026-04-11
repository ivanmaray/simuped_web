-- ══════════════════════════════════════════════════════════════════════════
-- ESCENARIO: Hiperpotasemia aguda con alteraciones ECG
-- scenario_id = 111 (placeholder ya existente)
-- Nivel: medio | Público: médico, enfermería, farmacia
-- Paciente: niño 9 años, 30 kg, ERC estadio 3 + enalapril → K+ 7,2 mEq/L + ECG alterado
-- Preguntas: MED=16, NUR=14, PHARM=13 | Críticas=6 | Pasos=5
-- Bibliografía principal: Protocolo HUCA + RCH Melbourne 2024 + ERC 2025
-- ══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. ACTUALIZAR SCENARIO (ya existe id=111)
-- ─────────────────────────────────────────────
UPDATE scenarios
SET
  title             = 'Hiperpotasemia aguda con alteraciones ECG',
  summary           = 'Niño de 9 años con enfermedad renal crónica y enalapril que presenta debilidad muscular progresiva y palpitaciones con K+ 7,2 mEq/L y alteraciones ECG (ondas T picudas + QRS ensanchado). El caso entrena el reconocimiento, la estabilización cardíaca urgente y la secuencia de tratamiento escalonado.',
  level             = 'medio',
  difficulty        = 'Intermedio',
  mode              = ARRAY['online'],
  status            = 'En construcción: en proceso',
  estimated_minutes = 25,
  max_attempts      = 3
WHERE id = 111;

-- ─────────────────────────────────────────────
-- 2. STEPS (scenario_id = 111)
-- ─────────────────────────────────────────────
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  (111, 1,
   'Reconocimiento y valoración inicial',
   'Recibid en urgencias a un niño de 9 años (30 kg) con antecedentes de enfermedad renal crónica estadio 3 en tratamiento con enalapril, que lleva 3 días con gastroenteritis. Refiere debilidad muscular progresiva en extremidades inferiores y palpitaciones desde hace 4 horas. Aplicad el TEP e iniciad la evaluación clínica.',
   false, null),

  (111, 2,
   'Diagnóstico y clasificación de gravedad',
   'La gasometría venosa urgente muestra K+ 7,2 mEq/L, pH 7,25 y bicarbonato 15 mEq/L. El ECG de monitores presenta ondas T picudas y QRS ensanchado (110 ms). Clasificad la hiperpotasemia, interpretad las alteraciones ECG y estableced el plan de actuación inmediato.',
   false, null),

  (111, 3,
   'Estabilización cardíaca: gluconato cálcico',
   'Ante la hiperpotasemia grave con alteraciones ECG, iniciad el tratamiento de estabilización de la membrana miocárdica. Preparad y administrad gluconato cálcico con las precauciones correctas y monitorizad la respuesta en el ECG.',
   false, null),

  (111, 4,
   'Desplazamiento intracelular del potasio',
   'Con la membrana estabilizada, iniciad simultáneamente el tratamiento de desplazamiento intracelular del potasio: insulina rápida con glucosa y salbutamol nebulizado. Estableced la monitorización de seguridad durante estos tratamientos.',
   false, null),

  (111, 5,
   'Eliminación de potasio y monitorización',
   'Con el paciente hemodinámicamente estable, iniciad las medidas de eliminación del potasio corporal. Estableced el plan de controles analíticos y decidid cuándo escalar a última línea terapéutica.',
   false, null)
RETURNING id;
-- ⚠️ Guarda los IDs como:
--   $STEP_ID_1 → paso 1 (Reconocimiento)
--   $STEP_ID_2 → paso 2 (Diagnóstico)
--   $STEP_ID_3 → paso 3 (Gluconato cálcico)
--   $STEP_ID_4 → paso 4 (Desplazamiento intracelular)
--   $STEP_ID_5 → paso 5 (Eliminación)


-- ─────────────────────────────────────────────
-- 3. QUESTIONS
-- ─────────────────────────────────────────────

-- ══════════════════════════════
-- PASO 1 — Reconocimiento y valoración inicial
-- ══════════════════════════════

-- Q1 | MED+NUR | CRÍTICA
-- TEP: componente alterado en hiperpotasemia con letargia
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'Al aplicar el TEP, el niño está letárgico pero responde a estímulos verbales. No tiene trabajo respiratorio. Presenta taquicardia (FC 118 lpm) y relleno capilar de 3 segundos. ¿Cómo se clasifica el TEP?',
  '["Alteración de la apariencia únicamente","Alteración de apariencia y circulación (shock compensado con afectación neurológica)","Alteración de la circulación únicamente","TEP estable: todos los componentes normales"]',
  '1',
  'El TEP presenta dos componentes alterados: la Apariencia (letargia, respuesta reducida = alteración del SNC, en este caso por hiperpotasemia grave afectando la excitabilidad neuronal) y la Circulación (taquicardia + RC 3 s = shock compensado). Esta combinación indica una situación de alta urgencia que requiere actuación simultánea en ambos componentes.',
  ARRAY['medico','enfermeria'],
  true,
  '["El TEP valora A (apariencia), B (breathing) y C (circulation)","La hiperpotasemia grave afecta tanto al músculo cardíaco como al sistema neuromuscular"]',
  60,
  'No identificar la alteración de la apariencia puede llevar a subestimar la afectación neurológica de la hiperpotasemia grave y retrasar el tratamiento cardioprotector urgente.'
);

-- Q2 | MED
-- Síntomas clínicos de hiperpotasemia: cardíacos + neuromusculares
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  '¿Cuál es la combinación de síntomas más característica de la hiperpotasemia grave?',
  '["Hipertensión, cefalea y edema periférico","Debilidad muscular ascendente, palpitaciones y arritmias","Poliuria, polidipsia y deshidratación","Hiperreflexia, espasmos musculares y tetania"]',
  '1',
  'La hiperpotasemia grave produce dos tipos de manifestaciones clínicas: neuromusculares (debilidad muscular ascendente, parestesias, arreflexia, parálisis flácida) y cardíacas (palpitaciones, bradicardia, bloqueos, fibrilación ventricular). Las manifestaciones gastrointestinales (náuseas, vómitos, diarrea) son inespecíficas. La tetania e hiperreflexia son características de la hipocalcemia, no de la hiperpotasemia.',
  ARRAY['medico'],
  false,
  '["La hiperpotasemia despolariza las membranas excitables de músculo esquelético y miocardio","Los síntomas más peligrosos son los cardíacos, que pueden aparecer de forma brusca"]',
  null,
  null
);

-- Q3 | NUR
-- Primera medida de enfermería: monitorización ECG continua
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  'Ante la sospecha de hiperpotasemia moderada-grave en urgencias, ¿cuál es la primera medida prioritaria de enfermería?',
  '["Canalizar vía venosa periférica y extraer analítica urgente","Iniciar monitorización electrocardiográfica continua e informar al médico de guardia","Administrar gluconato cálcico según protocolo sin esperar confirmación analítica","Pesar al paciente y registrar las constantes vitales completas antes de cualquier otra acción"]',
  '1',
  'La monitorización ECG continua es la primera prioridad porque las arritmias letales pueden aparecer antes de recibir el resultado analítico. La canalización de vía y la analítica son inmediatamente posteriores, pero el ECG en tiempo real es la herramienta más urgente para detectar deterioro cardíaco y guiar la velocidad de actuación.',
  ARRAY['enfermeria'],
  false,
  '["Las arritmias por hiperpotasemia pueden aparecer sin previo aviso","El ECG continuo permite detectar cambios en tiempo real y dirigir la urgencia de cada intervención"]',
  null,
  null
);

-- Q4 | MED+NUR
-- Descartar pseudohiperpotasemia antes de tratar en situaciones no urgentes
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_1,
  '¿En qué situación debe sospecharse pseudohiperpotasemia antes de iniciar tratamiento?',
  '["Cuando el K+ es mayor de 6,5 mEq/L con alteraciones en el ECG","Cuando el resultado de potasio llega en muestra hemolizada, con trombocitosis marcada o leucocitosis extrema, y el paciente está asintomático","Cuando el niño está en tratamiento con enalapril o diuréticos ahorradores de K+","Cuando la hiperpotasemia aparece de forma súbita sin causa subyacente clara"]',
  '1',
  'La pseudohiperpotasemia se produce por liberación de K+ de los eritrocitos en la muestra (hemólisis), plaquetas (plaquetosis >1000 × 10⁹/L) o leucocitos (leucocitosis >70 × 10⁹/L). Hay que sospecharla cuando el paciente está asintomático, el ECG es normal y la muestra puede estar comprometida. En presencia de síntomas o alteraciones ECG, como en este caso, se actúa como si fuera real sin esperar confirmación.',
  ARRAY['medico','enfermeria'],
  false,
  '["La pseudohiperpotasemia no requiere tratamiento porque el K+ sérico real es normal","Una muestra hemolizada puede elevar falsamente el K+ varios mEq/L"]',
  null,
  null
);


-- ══════════════════════════════
-- PASO 2 — Diagnóstico y clasificación de gravedad
-- ══════════════════════════════

-- Q5 | MED+NUR+PHARM | CRÍTICA
-- Clasificación: K+ 7,2 + QRS ancho = hiperpotasemia GRAVE
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  'El resultado de gasometría venosa muestra K+ 7,2 mEq/L. El ECG presenta ondas T picudas y QRS ensanchado a 110 ms. ¿Cómo se clasifica y qué implicación terapéutica tiene?',
  '["Hiperpotasemia moderada (6,0-7,0 mEq/L): iniciar desplazamiento intracelular, sin urgencia cardíaca inmediata","Hiperpotasemia grave con alteraciones ECG: emergencia vital, inicio inmediato de estabilización cardíaca","Hiperpotasemia grave sin repercusión clínica: ajustar tratamiento crónico y control analítico en 2 horas","Hiperpotasemia moderada-grave: esperar nuevo control analítico antes de tratar"]',
  '1',
  'La presencia de K+ ≥6,5 mEq/L Y alteraciones ECG define hiperpotasemia grave, independientemente del valor exacto. Las alteraciones ECG (T picudas + QRS ensanchado) indican afectación cardíaca activa y constituyen una emergencia vital. El tratamiento debe iniciarse de inmediato sin esperar nuevas confirmaciones analíticas.',
  ARRAY['medico','enfermeria','farmacia'],
  true,
  '["La clasificación de gravedad se basa en el nivel de K+ Y la presencia de alteraciones ECG","La presencia de cualquier cambio ECG eleva automáticamente la categoría a grave"]',
  60,
  'Clasificar incorrectamente como moderada sin urgencia cardíaca retrasa la administración de gluconato cálcico, dejando el miocardio expuesto a fibrilación ventricular.'
);

-- Q6 | MED
-- Secuencia de cambios ECG en hiperpotasemia
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  '¿Cuál es la secuencia cronológica de los cambios electrocardiográficos en la hiperpotasemia progresiva?',
  '["Bloqueo AV → ondas T picudas → QRS ancho → fibrilación ventricular","Ondas T picudas → PR largo/P plana → QRS ensanchado → patrón sinusoidal → fibrilación ventricular/asistolia","Fibrilación auricular → bloqueo de rama → torsades de pointes → asistolia","PR corto → delta wave → QRS ancho → fibrilación ventricular"]',
  '1',
  'La secuencia ECG de la hiperpotasemia progresiva sigue el orden: (1) ondas T picudas y simétricas (precoz, K+ 5,5-6,5 mEq/L); (2) alargamiento del PR e inicio de aplanamiento de la onda P (K+ 6,5-7,0); (3) ensanchamiento del QRS y pérdida de onda P (K+ >7,0); (4) patrón sinusoidal por fusión QRS-T (K+ >8,0-9,0); (5) FV/asistolia. Conocer la secuencia permite anticipar la urgencia.',
  ARRAY['medico'],
  false,
  '["La onda T picuda es el signo más precoz y se origina por aceleración de la repolarización ventricular","El ensanchamiento del QRS indica que la hiperpotasemia está afectando la conducción intraventricular"]',
  null,
  null
);

-- Q7 | NUR+PHARM
-- Laboratorio urgente en hiperpotasemia
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  '¿Qué determinaciones analíticas urgentes deben solicitarse ante una hiperpotasemia grave?',
  '["Solo K+ sérico y función renal (creatinina, urea)","Gasometría venosa (K+, pH, glucemia), iones séricos (Na+, Cl-, Ca2+, Mg2+), creatinina, urea y CK si se sospecha rabdomiólisis","Hemograma, coagulación y PCR como analítica estándar de urgencias","K+ urinario y osmolalidad plasmática para cálculo del TTKG"]',
  '1',
  'La evaluación analítica urgente incluye: gasometría venosa (K+, pH y glucemia de forma rápida), iones séricos completos (especialmente Ca²⁺ y Mg²⁺ por sus implicaciones en la arritmogénesis), función renal (creatinina y urea para identificar la causa) y CK si se sospecha rabdomiólisis como mecanismo. La gasometría venosa proporciona el K+ más rápido que el ionograma estándar.',
  ARRAY['enfermeria','farmacia'],
  false,
  '["La gasometría venosa da K+, pH y glucemia en pocos minutos, más rápido que la bioquímica estándar","Conocer el Ca2+ y Mg2+ es relevante para el manejo de las arritmias"]',
  null,
  null
);

-- Q8 | PHARM+MED
-- Suspender fármacos hiperpotasemiantes
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_2,
  '¿Cuáles son los fármacos que deben suspenderse de forma urgente en este niño con hiperpotasemia grave?',
  '["Solo diuréticos ahorradores de potasio y suplementos de K+ oral","Enalapril (IECA), diuréticos ahorradores de K+, AINEs, cotrimoxazol, tacrolimus y cualquier suero con K+","Únicamente los fármacos con riesgo de alargamiento del QT","Antihipertensivos en general y diuréticos de asa"]',
  '1',
  'Deben suspenderse todos los fármacos que reducen la excreción renal de K+ o aumentan su liberación celular: IECAs (enalapril), ARA-II, diuréticos ahorradores de K+ (espironolactona), AINEs, cotrimoxazol, inhibidores de calcineurina (tacrolimus, ciclosporina), anfotericina B. También suprimir cualquier suero IV que contenga potasio (incluido Plasmalyte®). Los diuréticos de asa (furosemida) no se suspenden: son parte del tratamiento.',
  ARRAY['farmacia','medico'],
  false,
  '["El enalapril (IECA) bloquea la aldosterona y reduce la excreción renal de K+: es una de las causas más frecuentes de hiperpotasemia iatrogénica","Los sueros con K+ deben cambiarse inmediatamente por soluciones sin K+"]',
  null,
  null
);


-- ══════════════════════════════
-- PASO 3 — Estabilización cardíaca: gluconato cálcico
-- ══════════════════════════════

-- Q9 | MED+PHARM+NUR | CRÍTICA
-- Gluconato cálcico: primera medida con ECG alterado
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿Cuál es la primera medida terapéutica que debe administrarse en este niño con K+ 7,2 mEq/L y alteraciones ECG?',
  '["Insulina rápida + glucosa 10% IV, ya que son el tratamiento de mayor eficacia para reducir el K+","Gluconato cálcico 10% IV, para estabilizar la membrana miocárdica antes de cualquier otra medida","Bicarbonato sódico 1 M IV, dado que el pH es 7,25","Salbutamol nebulizado 0,15 mg/kg, como primera medida de redistribución rápida"]',
  '1',
  'Ante hiperpotasemia grave con alteraciones ECG, la primera medida es siempre el gluconato cálcico 10% IV. No reduce el K+ sérico, pero estabiliza la membrana miocárdica en 2-3 minutos y reduce el riesgo de fibrilación ventricular, dando tiempo para que actúen las medidas de redistribución y eliminación. La insulina + glucosa y el salbutamol son el siguiente paso, pero tardan 10-30 minutos en ejercer efecto.',
  ARRAY['medico','farmacia','enfermeria'],
  true,
  '["El gluconato cálcico no baja el K+ pero protege el corazón de forma inmediata","Con ECG alterado, los minutos cuentan: la protección cardíaca es siempre el primer paso"]',
  60,
  'Empezar con insulina+glucosa antes del gluconato cálcico deja el miocardio sin protección durante los 10-20 minutos que tardan en hacer efecto, con riesgo de fibrilación ventricular en ese intervalo.'
);

-- Q10 | PHARM | CRÍTICA
-- Dosis exacta de gluconato cálcico
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  'Para este niño de 30 kg, ¿cuál es la dosis correcta de gluconato cálcico 10%, la preparación y el tiempo de administración?',
  '["1 mL/kg sin diluir en bolo IV en 2 minutos","0,5 mL/kg (máximo 20 mL), diluido en igual volumen de SSF 0,9%, en 5-10 minutos con monitorización ECG","0,5 mL/kg (máximo 10 mL) sin diluir en bolo IV en 30 segundos","1 mL/kg (máximo 20 mL) diluido en 100 mL de SG 5% en 30 minutos"]',
  '1',
  'La dosis es 0,5 mL/kg de gluconato cálcico 10% IV (para 30 kg = 15 mL; máximo 20 mL = 2 g). Se prepara diluyendo en igual volumen de SSF 0,9% (15 mL de gluconato + 15 mL de SSF = 30 mL totales) y se perfunde en 5-10 minutos bajo monitorización ECG continua. El gluconato 10% contiene 4,6 mEq de calcio por cada 10 mL. Si el ECG no mejora a los 10 minutos, puede repetirse la dosis.',
  ARRAY['farmacia'],
  true,
  '["La dosis de gluconato cálcico en pediatría es 0,5 mL/kg (no 1 mL/kg)","La dilución 1:1 con SSF reduce el riesgo de extravasación y bradicardia"]',
  90,
  'Una dosis incorrecta (exceso de velocidad sin dilución o dosis doble sin indicación) puede causar bradicardia grave, parada cardíaca o necrosis tisular por extravasación.'
);

-- Q11 | NUR | CRÍTICA
-- Monitorización durante la infusión de gluconato cálcico
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿Qué vigilancia debe mantener enfermería durante la infusión de gluconato cálcico 10%?',
  '["Monitorización de tensión arterial cada 5 minutos y glucemia capilar","ECG continuo con atención a aparición de bradicardia, comprobación visual del punto de punción (riesgo extravasación) y preparación para suspender la perfusión si FC desciende significativamente","Saturación de O2 continua y FR, para detectar broncoespasmo como efecto adverso","Diuresis horaria y monitorización de la temperatura central"]',
  '1',
  'Durante la infusión de gluconato cálcico son obligatorios: ECG continuo para detectar bradicardia (indicación de suspender inmediatamente la perfusión), vigilancia estrecha del punto de punción IV por riesgo de extravasación necrotizante, y disposición para suspender si FC cae de forma significativa. El gluconato no tiene efecto broncodilatador/broncoconstrictor relevante. El cloruro cálcico (más irritante que el gluconato) requiere vía central preferiblemente.',
  ARRAY['enfermeria'],
  true,
  '["La bradicardia durante la perfusión de calcio es una señal de parada: suspender inmediatamente","La extravasación de gluconato cálcico puede causar necrosis tisular aunque sea menos irritante que el cloruro"]',
  60,
  'No detectar bradicardia a tiempo durante la infusión de gluconato puede resultar en parada cardíaca. No vigilar la vía puede provocar necrosis por extravasación.'
);

-- Q12 | MED+PHARM
-- Contraindicaciones del gluconato cálcico
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿En cuál de las siguientes situaciones está contraindicado el gluconato cálcico o debe administrarse con máxima precaución?',
  '["Insuficiencia renal crónica o hiperpotasemia de causa desconocida","Toxicidad por digoxina, parada cardíaca en curso o administración simultánea con bicarbonato sódico","Acidosis metabólica con pH inferior a 7,20","Hiperpotasemia con natremia inferior a 130 mEq/L"]',
  '1',
  'El gluconato cálcico está contraindicado en: (1) toxicidad por digoxina (el calcio potencia la toxicidad digitálica sobre el miocardio); (2) parada cardíaca en curso (en este contexto se usa calcio cloruro IV); (3) administración simultánea con bicarbonato sódico (precipitan formando carbonato cálcico insoluble que puede ocluir la vía). La insuficiencia renal no es contraindicación; al contrario, es uno de los contextos más frecuentes donde se usa.',
  ARRAY['medico','farmacia'],
  false,
  '["El calcio en pacientes digitalizados puede desencadenar arritmias fatales por efecto aditivo sobre el miocardio","El gluconato y el bicarbonato nunca deben pasar por la misma vía ni simultáneamente"]',
  null,
  null
);

-- Q13 | MED
-- El gluconato cálcico NO reduce el K+ sérico
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_3,
  '¿Cuál es el mecanismo de acción del gluconato cálcico en la hiperpotasemia y cuánto tiempo dura su efecto?',
  '["Desplaza el K+ al espacio intracelular, reduciendo el K+ sérico durante 2-4 horas","Estabiliza la membrana miocárdica antagonizando el efecto del K+ extracelular sin modificar el K+ sérico; efecto durante 30-60 minutos","Favorece la eliminación renal de K+ al actuar como diurético osmótico en el túbulo distal","Inhibe la liberación de K+ desde los hepatocitos al activar los receptores adrenérgicos beta"]',
  '1',
  'El calcio no modifica el K+ sérico: actúa elevando el potencial umbral de acción de las células miocárdicas, restaurando el gradiente normal entre el potencial de membrana en reposo y el umbral de acción, y reduciendo así la excitabilidad y el riesgo de arritmias. El efecto dura 30-60 minutos. Si el K+ persiste elevado, el efecto cardioprotector se agota y pueden reaparecer las arritmias, por ello debe iniciarse el tratamiento de redistribución de inmediato.',
  ARRAY['medico'],
  false,
  '["Si el gluconato cálcico bajara el K+, seguiría siendo eficaz indefinidamente; el hecho de que su efecto sea transitorio indica que actúa sobre la membrana, no sobre el K+","El desplazamiento intracelular de K+ es la función de insulina + salbutamol"]',
  null,
  null
);


-- ══════════════════════════════
-- PASO 4 — Desplazamiento intracelular del potasio
-- ══════════════════════════════

-- Q14 | MED+PHARM | CRÍTICA
-- Insulina + glucosa: dosis y preparación exactas
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'Para este niño de 30 kg, ¿cuál es la dosis correcta de insulina rápida y glucosa 10% para el desplazamiento intracelular de potasio?',
  '["Insulina 0,1 U/kg/h en infusión continua + glucosa 5% a mantenimiento","Insulina rápida 0,1 U/kg IV (máximo 10 U) = 3 U + glucosa 10% 5 mL/kg IV = 150 mL, ambas en perfusión de 30 minutos","Insulina rápida 0,05 U/kg SC + glucosa oral 10 g","Insulina rápida 0,2 U/kg IV (máximo 20 U) en bolo rápido + glucosa 20% 2 mL/kg"]',
  '1',
  'La dosis para hiperpotasemia grave es: insulina rápida (Actrapid®) 0,1 U/kg IV = 3 U (máximo 10 U) + glucosa 10% 5 mL/kg IV = 150 mL (máximo 250 mL), ambas en perfusión simultánea de 30 minutos. Inicio del efecto a los 10-20 minutos; pico a los 30-60 minutos; duración 2-4 horas. La glucosa previene la hipoglucemia. Las guías ERC 2025 recomiendan monitorizar glucosa y K+ cada 15 minutos durante las primeras 4 horas.',
  ARRAY['medico','farmacia'],
  true,
  '["La insulina desplaza el K+ al interior celular activando la Na/K-ATPasa","La glucosa acompañante previene la hipoglucemia; la dosis no es para tratar hiperglucemia sino para proteger"]',
  90,
  'Una dosis doble de insulina sin glucosa adecuada puede provocar hipoglucemia grave en un niño. Una dosis insuficiente deja el K+ elevado con riesgo de arritmia recurrente.'
);

-- Q15 | PHARM+NUR
-- Salbutamol nebulizado: dosis, técnica y efecto
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿Cuál es la dosis de salbutamol nebulizado para el desplazamiento intracelular de potasio y qué efectos adversos debe vigilarse?',
  '["0,03 mg/kg nebulizado, solo útil en pacientes con broncoespasmo previo","0,15 mg/kg nebulizado (para 30 kg = 4,5 mg), repetible cada 15-30 min; vigilar taquicardia y temblor","0,15 mg/kg IM en cara anterolateral del muslo; inicio más rápido que por vía inhalatoria","2,5 mg fijo independientemente del peso, ya que la dosis por kg no aporta beneficio adicional"]',
  '1',
  'La dosis de salbutamol nebulizado es 0,15 mg/kg (para 30 kg = 4,5 mg; presentación 2,5 mg/ampolla → usar 2 ampollas). Inicio del efecto 5-30 minutos, pico a los 60 minutos, duración 2-5 horas. Puede repetirse cada 15-30 minutos; dosis máxima diaria 20 mg. Los efectos adversos a vigilar son taquicardia y temblor fino. Se administra simultáneamente con la insulina+glucosa para efecto aditivo (mecanismos complementarios: beta2-agonismo activa la Na/K-ATPasa por vía distinta a la insulina).',
  ARRAY['farmacia','enfermeria'],
  false,
  '["El salbutamol actúa sobre los receptores beta2, activando la Na/K-ATPasa por una vía diferente a la insulina: tienen efecto aditivo","La dosis para hiperpotasemia es mayor que la dosis broncodilatadora estándar"]',
  null,
  null
);

-- Q16 | NUR+PHARM | CRÍTICA
-- Monitorización de glucemia durante el tratamiento con insulina
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿Con qué frecuencia y durante cuánto tiempo deben monitorizarse la glucemia y el potasio durante el tratamiento con insulina + glucosa?',
  '["Solo al inicio y al finalizar la perfusión de insulina","Glucemia y K+ cada 15 minutos durante las primeras 4 horas (recomendación ERC 2025)","Glucemia cada hora y K+ a las 2 horas del inicio","Una vez finalizada la perfusión de insulina, control a las 4-6 horas"]',
  '1',
  'Las guías ERC 2025 recomiendan monitorizar glucemia y potasio mediante gasometría cada 15 minutos durante las primeras 4 horas tras iniciar insulina+glucosa. La hipoglucemia es el efecto adverso más frecuente y peligroso: puede aparecer desde los 15 minutos hasta las 4-6 horas post-perfusión. La monitorización estrecha permite detectar tanto la hipoglucemia como la respuesta del K+ al tratamiento.',
  ARRAY['enfermeria','farmacia'],
  true,
  '["La hipoglucemia post-insulina en hiperpotasemia es un efecto adverso frecuente que puede aparecer horas después de finalizar la perfusión","Las guías ERC 2025 son específicas sobre la frecuencia de monitorización: c/15 min durante 4 horas"]',
  60,
  'No monitorizar glucemia de forma frecuente puede resultar en hipoglucemia desapercibida, complicando aún más la situación hemodinámica de un paciente ya crítico.'
);

-- Q17 | MED+PHARM
-- Bicarbonato: solo si acidosis metabólica, no sistemático (ERC 2025)
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  'En este paciente con K+ 7,2 mEq/L y pH 7,25 (acidosis metabólica), ¿cuándo está indicado el bicarbonato sódico?',
  '["Siempre en hiperpotasemia grave como medida de desplazamiento intracelular de K+","Solo cuando coexiste acidosis metabólica, con dosis de 1 mEq/kg IV en 10-15 minutos; las guías ERC 2025 no recomiendan su uso sistemático","Siempre como primera medida antes del gluconato cálcico","No está indicado en hiperpotasemia pediátrica en ninguna circunstancia"]',
  '1',
  'El bicarbonato sódico 8,4% (1 mEq/mL) puede considerarse en presencia de acidosis metabólica, a dosis de 1 mEq/kg IV (máximo 50 mEq) en 10-15 minutos. Sin embargo, las guías ERC 2025 no recomiendan su uso sistemático en hiperpotasemia porque su efecto sobre el K+ es limitado e inconsistente. En este paciente, dada la acidosis (pH 7,25), podría administrarse como medida adyuvante, pero siempre sin simultanear con el gluconato cálcico (precipitan).',
  ARRAY['medico','farmacia'],
  false,
  '["El bicarbonato hace que el K+ entre a la célula en intercambio por H+ solo cuando hay acidosis metabólica real","ERC 2025 cambió la recomendación: el bicarbonato ya no es estándar en hiperpotasemia, solo si hay acidosis"]',
  null,
  null
);

-- Q18 | NUR+MED
-- No administrar gluconato cálcico y bicarbonato simultáneamente ni por la misma vía
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿Qué interacción farmacológica crítica debe conocerse al planificar la administración de gluconato cálcico y bicarbonato sódico en el mismo paciente?',
  '["No hay interacción: pueden administrarse por la misma vía simultáneamente","No deben administrarse simultáneamente ni por la misma vía: forman precipitado de carbonato cálcico insoluble","El gluconato cálcico potencia el efecto del bicarbonato y puede producir hipercalcemia","El bicarbonato neutraliza el calcio sórico y anula el efecto cardioprotector"]',
  '1',
  'Gluconato cálcico y bicarbonato sódico son incompatibles físico-químicamente: si se mezclan o se administran por la misma vía forman carbonato cálcico insoluble (precipitado blanco) que puede ocluir el catéter y potencialmente embolizar. Si se requieren ambos, deben administrarse secuencialmente y con lavado de vía intermedio con SSF entre ambas perfusiones, o por vías distintas.',
  ARRAY['enfermeria','medico'],
  false,
  '["La incompatibilidad gluconato-bicarbonato es una de las interacciones IV más clásicas y peligrosas en pediatría","Si hay que dar ambos, usar vías distintas o lavar la vía con SSF entre ellos"]',
  null,
  null
);

-- Q19 | PHARM
-- Salbutamol IV como alternativa si no posible nebulización
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_4,
  '¿En qué situación se usa salbutamol IV en lugar de nebulizado para la hiperpotasemia y cuál es la dosis?',
  '["Siempre que el K+ sea mayor de 7 mEq/L, independientemente de la situación clínica","Cuando la nebulización no es posible (ej. parada cardiorrespiratoria o intubación): 5 mcg/kg IV en 5 minutos, máximo acumulado 15 mcg/kg","Como primera línea en hiperpotasemia grave porque tiene inicio de efecto más rápido que el nebulizado","Cuando el paciente tiene asma o EPOC como antecedente para garantizar la absorción"]',
  '1',
  'El salbutamol IV se reserva para cuando la nebulización no es viable (parada cardiorrespiratoria, ventilación mecánica invasiva, imposibilidad de cooperación). La dosis es 5 mcg/kg IV en 5 minutos, diluido en SSF/SG5% para concentración de 10 mcg/mL. Puede repetirse cada 15 minutos; dosis máxima acumulada 15 mcg/kg. El inicio de efecto es similar al nebulizado (5-30 min). Precaución en taquiarritmias preexistentes.',
  ARRAY['farmacia'],
  false,
  '["El salbutamol nebulizado es preferible cuando es posible porque evita los efectos sistémicos","El salbutamol IV en pediatría requiere cálculo cuidadoso: la concentración de la ampolla es de 500 mcg/mL"]',
  null,
  null
);


-- ══════════════════════════════
-- PASO 5 — Eliminación de potasio y monitorización
-- ══════════════════════════════

-- Q20 | MED+PHARM
-- Furosemida: indicación, dosis y condición previa
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Cuándo está indicada la furosemida IV para eliminar potasio y cuál es la dosis en este paciente de 30 kg?',
  '["Siempre como primera medida de eliminación en hiperpotasemia grave, independientemente de la función renal","Solo si existe función renal conservada y volemia adecuada: 1 mg/kg IV (= 30 mg), máximo 40 mg en función renal normal, 80 mg en insuficiencia renal","Solo si hay oliguria franca (diuresis <0,5 mL/kg/h) con creatinina normal","Como alternativa al poliestireno sulfonato cuando hay íleo paralítico"]',
  '1',
  'La furosemida 1 mg/kg IV (30 mg para este niño; máximo 40 mg con función renal normal, hasta 80 mg en insuficiencia renal) es una medida eficaz de eliminación renal de K+, pero SOLO si: (1) la función renal está conservada (no anuria/oliguría refractaria) y (2) la volemia es adecuada o se corrige antes. Iniciar furosemida con depleción de volumen empeoraría la función renal. En caso de función renal gravemente comprometida, la última línea es la hemodiálisis.',
  ARRAY['medico','farmacia'],
  false,
  '["La furosemida funciona favoreciendo la excreción renal de K+: si hay anuria, no hay efecto","Corregir la volemia antes de la furosemida es fundamental para que tenga efecto y no empeorar la función renal"]',
  null,
  null
);

-- Q21 | PHARM+NUR
-- Poliestireno sulfonato cálcico: dosis, vía y contraindicaciones
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Cuál es la dosis de poliestireno sulfonato cálcico (kayexalate) y en qué situaciones está contraindicado?',
  '["5 g/kg/día en dosis única VO; contraindicado en insuficiencia renal","1 g/kg/día VO o SNG dividido en 4 dosis (máximo 30 g/día); contraindicado en neonatos, íleo paralítico y postoperatorio reciente","2 g/kg/día rectal en dosis única; no tiene contraindicaciones en pediatría","0,5 g/kg/dosis IV en bolo; requiere función renal conservada"]',
  '1',
  'El poliestireno sulfonato cálcico se administra 1 g/kg/día VO o SNG (máximo 30 g/día) dividido en 4 dosis. Es una resina de intercambio catiónico que liga K+ en el tracto gastrointestinal. Inicio del efecto 1-2 horas; pico 4-6 horas. Contraindicaciones: neonatos (riesgo de necrosis intestinal), íleo paralítico, obstrucción intestinal y postoperatorio reciente. Puede también administrarse en enema rectal. Es una medida complementaria, no de primera línea en la emergencia.',
  ARRAY['farmacia','enfermeria'],
  false,
  '["El kayexalate actúa en el intestino intercambiando K+ por Ca2+ o Na+: su efecto es lento (horas) y solo sirve para eliminación, no para estabilización aguda","En neonatos está contraindicado por riesgo de necrosis intestinal"]',
  null,
  null
);

-- Q22 | NUR+MED
-- Plan de controles analíticos post-tratamiento
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Con qué frecuencia debe reevaluarse el potasio sérico tras instaurar el tratamiento de la hiperpotasemia grave?',
  '["Solo al cabo de 6-8 horas, cuando las medidas de eliminación han tenido tiempo de actuar","A la 1-2 horas del inicio del tratamiento, ajustando la frecuencia de controles según la evolución clínica y analítica","Una vez cada 24 horas hasta normalización del K+","Solo si el ECG muestra nuevas alteraciones"]',
  '1',
  'La reevaluación del K+ debe realizarse a la 1-2 horas del inicio del tratamiento. Si la respuesta es adecuada y el paciente está estable, los controles pueden espaciarse. Si el K+ no desciende o el ECG empeora, los controles deben ser más frecuentes. La glucemia con la insulina requiere medición cada 15 minutos las primeras 4 horas (ERC 2025). El ECG continuo complementa los controles analíticos.',
  ARRAY['enfermeria','medico'],
  false,
  '["La reevaluación a la 1-2 horas indica si el tratamiento está funcionando o si hay que escalar","El ECG continuo y la glucemia frecuente son controles paralelos que no sustituyen al control de K+"]',
  null,
  null
);

-- Q23 | MED
-- Última línea: hemodiálisis si K+ persistente > 6,5 con anuria
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Cuándo está indicada la hemodiálisis o TRRC como tratamiento de última línea en la hiperpotasemia pediátrica?',
  '["Siempre que el K+ sea mayor de 7 mEq/L, independientemente de la respuesta al tratamiento médico","K+ persistentemente elevado >6,5 mEq/L con anuria refractaria o cuando todas las medidas médicas han fracasado","Cuando la furosemida no produce diuresis suficiente en las primeras 2 horas","En todos los pacientes con enfermedad renal crónica estadio 3 o superior"]',
  '1',
  'La hemodiálisis o terapia de reemplazo renal continuo (TRRC) está indicada como última línea cuando: K+ >6,5 mEq/L persistente a pesar del tratamiento médico completo, anuria refractaria que impide la eliminación renal de K+, o cuando la combinación de todas las medidas farmacológicas no consigue descender el K+ a niveles seguros. Es la medida más efectiva para eliminar K+ pero requiere acceso venoso central y coordinación con nefrología pediátrica.',
  ARRAY['medico'],
  false,
  '["La hemodiálisis es la medida más eficaz para eliminar K+, pero no puede aplicarse de inmediato: requiere preparación y acceso central","El objetivo del tratamiento médico inicial es ganar tiempo hasta que el K+ baje espontáneamente o hasta que la diálisis esté disponible"]',
  null,
  null
);

-- Q24 | MED+NUR
-- Cuándo repetir dosis de gluconato cálcico
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  '¿Cuándo debe repetirse la dosis de gluconato cálcico en un paciente con hiperpotasemia grave?',
  '["Cada hora de forma sistemática mientras persista el K+ elevado","Si a los 10 minutos de finalizar la primera dosis el ECG no ha normalizado o persisten alteraciones significativas","Solo si aparecen arritmias ventriculares documentadas","No debe repetirse: la segunda dosis aumenta el riesgo de hipercalcemia"]',
  '1',
  'La dosis de gluconato cálcico puede repetirse a los 10 minutos de la primera dosis si persisten alteraciones significativas en el ECG. El efecto cardioprotector dura 30-60 minutos, por lo que puede requerir dosis adicionales mientras el K+ no ha descendido lo suficiente con las medidas de redistribución y eliminación. No hay un límite estricto de dosis en el contexto agudo, aunque se debe monitorizar la aparición de hipercalcemia con dosis repetidas.',
  ARRAY['medico','enfermeria'],
  false,
  '["El gluconato cálcico tiene una ventana de efecto de 30-60 minutos: si el K+ no ha bajado, puede repetirse","La decisión se basa en el ECG, no solo en el nivel sérico de K+"]',
  null,
  null
);

-- Q25 | NUR
-- Educación al alta: restricción de K+, fármacos a evitar, seguimiento
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES (
  $STEP_ID_5,
  'Al alta, ¿qué elementos clave debe incluir la educación a la familia de un niño con enfermedad renal crónica que ha tenido una hiperpotasemia grave?',
  '["Solo indicar que evite frutas y verduras durante 1 semana","Restricción dietética de K+ (evitar alimentos ricos: plátano, naranja, legumbres, frutos secos, patata), revisión de medicación con el nefrólogo (enalapril), signos de alarma (debilidad muscular, palpitaciones) y plan de seguimiento urgente","Suspender toda la medicación crónica hasta nueva valoración y dieta libre","Instrucciones para medir K+ capilar en domicilio diariamente"]',
  '1',
  'La educación al alta debe incluir: (1) restricción de alimentos ricos en K+ (plátano, naranja, kiwi, frutos secos, legumbres, patata, chocolate); (2) revisión urgente con nefrología del tratamiento con enalapril (puede requerir sustitución o reducción de dosis); (3) signos de alarma que obligan a consultar urgencias (debilidad muscular nueva, palpitaciones, mareos); (4) plan de control analítico ambulatorio próximo. El K+ capilar domiciliario no es fiable; no se recomienda.',
  ARRAY['enfermeria'],
  false,
  '["Los alimentos altos en K+ son los más inesperados para las familias: frutas tropicales, legumbres, patata con piel, frutos secos","El enalapril puede haberse reintroducido inadecuadamente: la revisión con nefrología es urgente"]',
  null,
  null
);


-- ─────────────────────────────────────────────
-- 4. CASE BRIEF (scenario_id = 111)
-- ─────────────────────────────────────────────
INSERT INTO case_briefs (
  id, scenario_id, title, context, chief_complaint, chips,
  history, triangle, vitals, exam, quick_labs, imaging, timeline,
  red_flags, objectives, competencies, critical_actions,
  learning_objective, level, estimated_minutes
) VALUES (
  gen_random_uuid(),
  111,
  'Hiperpotasemia aguda con alteraciones ECG',
  'Urgencias pediátricas hospitalarias',
  'Niño de 9 años con ERC y enalapril que presenta debilidad muscular progresiva, palpitaciones y K+ 7,2 mEq/L con alteraciones ECG.',
  '["K+ 7,2 mEq/L","Ondas T picudas + QRS ancho","Debilidad muscular","Acidosis metabólica pH 7,25","ERC estadio 3 + enalapril"]',
  '{
    "Síntomas": ["Debilidad muscular progresiva en extremidades inferiores desde hace 6 horas", "Palpitaciones desde hace 4 horas", "Náuseas sin vómitos en los últimos 2 días"],
    "Antecedentes": "Enfermedad renal crónica estadio 3 secundaria a uropatía obstructiva. Hipertensión arterial secundaria en tratamiento con enalapril 5 mg/24h. Sin otros antecedentes de interés.",
    "Medicación previa": "Enalapril 5 mg/24h. Sin otros fármacos crónicos.",
    "Historia reciente": "Gastroenteritis aguda los últimos 3 días con reducción significativa de la ingesta hídrica. No ha tomado la furosemida los últimos 2 días.",
    "Datos adicionales relevantes": "Peso actual: 30 kg. Última analítica hace 3 semanas: K+ 5,8 mEq/L, creatinina 1,4 mg/dL. No ha tenido episodios previos de hiperpotasemia grave."
  }',
  '{"appearance":"amber","breathing":"green","circulation":"amber"}',
  '{"fc":118,"fr":22,"sat":98,"temp":36.8,"tas":135,"tad":85,"peso":30}',
  '{
    "Neurológico": "Letárgico, responde a estímulos verbales. Fuerza muscular disminuida en extremidades inferiores (grado 3/5). Reflejos osteotendinosos disminuidos.",
    "Cardiovascular": "Taquicardia rítmica. Sin soplos. Pulsos periféricos presentes pero débiles.",
    "Piel": "Relleno capilar 3 segundos. Piel fría en extremidades.",
    "Abdomen": "Blando, no doloroso. Diuresis conservada en las últimas 2 horas."
  }',
  '[{"name":"K+ gasometría venosa","value":"7,2 mEq/L"},{"name":"pH","value":"7,25 (acidosis metabólica)"},{"name":"HCO3","value":"15 mEq/L"},{"name":"Glucemia","value":"88 mg/dL"},{"name":"Creatinina","value":"2,1 mg/dL (elevada)"},{"name":"Na+","value":"138 mEq/L"},{"name":"Ca2+","value":"8,9 mg/dL (normal)"}]',
  '[{"name":"ECG monitorización continua","status":"activa"},{"name":"ECG 12 derivaciones","status":"realizado — ondas T picudas + QRS 110 ms"}]',
  '[{"t":0,"evento":"Inicio de debilidad muscular en piernas"},{"t":120,"evento":"Aumento progresivo de la debilidad, dificultad para caminar"},{"t":240,"evento":"Aparición de palpitaciones"},{"t":360,"evento":"Llegada a urgencias pediátricas"},{"t":375,"evento":"ECG: ondas T picudas + QRS ensanchado"},{"t":380,"evento":"K+ gasometría venosa: 7,2 mEq/L"}]',
  '[{"text":"K+ 7,2 mEq/L: hiperpotasemia grave con umbral de riesgo vital","correct":true},{"text":"QRS ensanchado (110 ms): afectación de la conducción intraventricular","correct":true},{"text":"Ondas T picudas: primer signo ECG de hiperpotasemia","correct":true},{"text":"Acidosis metabólica pH 7,25: contribuye al desplazamiento extracelular del K+","correct":true},{"text":"Debilidad muscular con arreflexia: parálisis flácida por despolarización mantenida","correct":true},{"text":"Enalapril activo + insuficiencia renal aguda sobre crónica: causa precipitante identificada","correct":true}]',
  '{
    "MED": [
      "Aplicar el TEP e identificar la alteración de apariencia y circulación",
      "Clasificar la hiperpotasemia como grave (K+ >6,5 + ECG alterado) y activar el protocolo de emergencia",
      "Indicar y secuenciar correctamente: gluconato cálcico → insulina+glucosa → salbutamol → furosemida",
      "Conocer contraindicaciones del gluconato cálcico (digoxina, simultáneo con bicarbonato)",
      "Interpretar la secuencia de cambios ECG en hiperpotasemia progresiva",
      "Decidir cuándo indicar hemodiálisis como última línea"
    ],
    "NUR": [
      "Iniciar monitorización ECG continua como primera medida urgente",
      "Preparar y administrar gluconato cálcico con las precauciones correctas (dilución, ritmo, vigilancia ECG)",
      "Monitorizar glucemia cada 15 minutos durante 4 horas tras insulina",
      "Conocer la incompatibilidad gluconato-bicarbonato y actuar en consecuencia",
      "Proporcionar educación al alta sobre restricción dietética, fármacos y signos de alarma"
    ],
    "PHARM": [
      "Calcular la dosis exacta de gluconato cálcico 10% para 30 kg (0,5 mL/kg = 15 mL, máx 20 mL)",
      "Calcular la dosis de insulina rápida (0,1 U/kg = 3 U) y glucosa 10% (5 mL/kg = 150 mL)",
      "Conocer la dosis de salbutamol nebulizado (0,15 mg/kg = 4,5 mg) y sus efectos adversos",
      "Identificar los fármacos hiperpotasemiantes a suspender (enalapril, AINEs, K+ IV)",
      "Conocer las contraindicaciones del poliestireno sulfonato (neonatos, íleo)"
    ]
  }',
  '["Reconocimiento de emergencia electrocardiográfica","Secuenciación correcta del tratamiento escalonado","Seguridad farmacológica: dosis, incompatibilidades y monitorización","Trabajo interprofesional en urgencia crítica","Comunicación con familia y educación al alta"]',
  '["Administrar gluconato cálcico ANTES que insulina+glucosa ante ECG alterado","Monitorizar ECG continuo desde el primer momento","No administrar gluconato cálcico y bicarbonato simultáneamente ni por la misma vía","Monitorizar glucemia cada 15 minutos durante las primeras 4 horas con insulina","Suspender enalapril y todos los fármacos hiperpotasemiantes de forma inmediata"]',
  'Manejar de forma estructurada y secuenciada la hiperpotasemia grave pediátrica con alteraciones ECG: estabilización cardíaca, desplazamiento intracelular y eliminación de potasio.',
  'medio',
  25
);


-- ─────────────────────────────────────────────
-- 5. CASE RESOURCES (scenario_id = 111)
-- ─────────────────────────────────────────────
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), 111,
   'Protocolo de Hiperpotasemia en la UCI Pediátrica — HUCA',
   'pendiente de publicación',
   'Hospital Universitario Central de Asturias (HUCA)',
   'protocolo',
   2026,
   false,
   now()),

  (gen_random_uuid(), 111,
   'Hyperkalaemia — Clinical Practice Guidelines',
   'https://www.rch.org.au/clinicalguide/guideline_index/hyperkalaemia/',
   'Royal Children''s Hospital Melbourne',
   'guía',
   2024,
   true,
   now()),

  (gen_random_uuid(), 111,
   'Hyperkalemia in children: Management',
   'https://www.uptodate.com/contents/hyperkalemia-in-children-management',
   'UpToDate',
   'revisión',
   2026,
   false,
   now()),

  (gen_random_uuid(), 111,
   'European Resuscitation Council Guidelines 2025 — Hyperkalemia Management',
   'https://www.resuscitationjournal.com/article/S0300-9572(25)00279-5/fulltext',
   'Resuscitation (ERC)',
   'guía',
   2025,
   false,
   now()),

  (gen_random_uuid(), 111,
   'Hyperkalaemia — Emergency Management, Paediatric Intensive Care Unit (Guideline No. 387)',
   'https://www.clinicalguidelines.scot.nhs.uk/ggc-paediatric-guidelines/ggc-paediatric-guidelines/intensive-and-critical-care/hyperkalaemia-emergency-management-paediatric-intensive-care-unit-387/',
   'NHS Greater Glasgow & Clyde',
   'guía',
   2016,
   true,
   now()),

  (gen_random_uuid(), 111,
   'Embrace Paediatric Hyperkalaemia Guideline',
   'https://www.sheffieldchildrens.nhs.uk/download/1020/fluid/63528/hyperkalaemia-guideline.pdf',
   'Sheffield Children''s NHS Foundation Trust',
   'guía',
   2025,
   true,
   now());
