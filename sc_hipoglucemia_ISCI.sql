-- ══════════════════════════════════════════════════════════════════
-- ESCENARIO: Hipoglucemia grave en adolescente con bomba de insulina
-- Fuentes: ISPAD 2022 Cap.12 · Protocolo SEEP-ISCI 2013 · Cardona 2022
-- ══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────
-- 1. SCENARIO
-- ────────────────────────────────────────
INSERT INTO scenarios (title, summary, level, difficulty, mode, status, estimated_minutes, max_attempts)
VALUES (
  'Hipoglucemia grave en adolescente con infusión continua de insulina',
  'Pablo, 11 años, DT1 portador de bomba de insulina (ISCI) y MCG, llega a urgencias confuso con glucemia 38 mg/dL tras ejercicio intenso sin ajuste de tasa basal. Requiere tratamiento urgente, parada inmediata de la bomba y educación familiar sobre glucagón.',
  'avanzado',
  'Avanzado',
  ARRAY['online'],
  'En construcción: en proceso',
  20,
  3
) RETURNING id;
-- ⚠️ Guarda este ID como $SCENARIO_ID


-- ────────────────────────────────────────
-- 2. STEPS
-- ────────────────────────────────────────
INSERT INTO steps (scenario_id, step_order, description, narrative, role_specific, roles)
VALUES
  ($SCENARIO_ID, 1,
   'Reconocimiento y clasificación',
   'Pablo, 11 años, 38 kg, DT1 desde hace 3 años en tratamiento con ISCI y MCG, llega a urgencias traído por sus padres. Lo encontraron confuso en casa, con respuesta verbal lenta y temblores. La MCG marca 2,1 mmol/L con flecha de descenso rápido; la glucometría capilar confirma 38 mg/dL (2,1 mmol/L). Clasifica la gravedad del episodio e inicia la evaluación sistemática.',
   false, null),
  ($SCENARIO_ID, 2,
   'Vía de tratamiento y manejo de la bomba',
   'Pablo no responde a órdenes simples y no es capaz de deglutir de forma segura. Porta bomba de insulina ISCI con infusión basal activa en el flanco derecho. Decide la vía de tratamiento adecuada y el manejo inmediato del dispositivo.',
   false, null),
  ($SCENARIO_ID, 3,
   'Tratamiento de la hipoglucemia grave',
   'Se opta por glucagón al no disponer de acceso venoso inmediato. Pablo pesa 38 kg. Selecciona el fármaco, la presentación, la vía y la dosis correcta según las guías ISPAD 2022 y el protocolo SEEP para pacientes con ISCI.',
   false, null),
  ($SCENARIO_ID, 4,
   'Reevaluación a los 15 minutos',
   'A los 15 minutos del glucagón, Pablo recupera la consciencia. Glucemia 68 mg/dL. Está nauseoso pero puede tragar. La bomba sigue detenida. Decide los pasos siguientes hasta alcanzar el objetivo glucémico.',
   false, null),
  ($SCENARIO_ID, 5,
   'Prevención, ajuste y educación',
   'Glucemia estable en 95 mg/dL. Los padres refieren ejercicio intenso de 2 horas por la tarde, cena escasa y que Pablo no ajustó la tasa basal antes del deporte. Planifica el ajuste de la pauta ISCI, la educación familiar y las condiciones de alta.',
   false, null)
RETURNING id;
-- ⚠️ Guarda los IDs como $STEP_ID_1 a $STEP_ID_5


-- ────────────────────────────────────────
-- 3. QUESTIONS
-- ────────────────────────────────────────
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale)
VALUES

-- ══ PASO 1: Reconocimiento y clasificación ══

(
  $STEP_ID_1,
  'Pablo, 11 años, no responde a órdenes simples y no puede autoadministrarse tratamiento. Glucemia capilar 38 mg/dL. ¿Qué nivel de hipoglucemia presenta según la clasificación ISPAD 2022?',
  '["Hipoglucemia nivel 1 (alerta): glucemia <70 mg/dL, sin compromiso cognitivo significativo","Hipoglucemia nivel 2 (importante): glucemia <54 mg/dL, con síntomas autonómicos conservados","Hipoglucemia nivel 3 (grave): trastorno cognitivo grave con incapacidad de autotratamiento, independientemente del valor glucémico","Hipoglucemia relativa: descenso rápido de glucemia sin llegar al umbral de hipoglucemia"]',
  '2',
  'La ISPAD 2022 define hipoglucemia nivel 3 como un evento con trastorno cognitivo grave (incluyendo confusión, coma o convulsiones) que requiere la ayuda de otra persona, sin que exista un umbral glucémico específico para este nivel. Pablo cumple todos los criterios: confusión, incapacidad de autotratamiento y glucemia 38 mg/dL.',
  null,
  true,
  '["La clasificación ISPAD distingue tres niveles según la capacidad del paciente para autotratarse y el grado de afectación cognitiva","El nivel 3 no requiere un valor glucémico concreto: lo define la necesidad de ayuda de un tercero por compromiso cognitivo"]',
  90,
  'Clasificar incorrectamente la gravedad lleva a elegir la vía de tratamiento equivocada. Intentar tratar por vía oral a un paciente con consciencia alterada supone riesgo de aspiración con consecuencias potencialmente fatales.'
),

(
  $STEP_ID_1,
  'Pablo presenta confusión y respuesta verbal lenta. ¿A qué mecanismo fisiopatológico corresponden estos síntomas?',
  '["Activación autonómica adrenérgica: temblores, sudoración, palpitaciones y palidez","Neuroglucopenia: disfunción cerebral por déficit de glucosa, con confusión, habla arrastrada y pérdida de coordinación","Hipoglucemia relativa con respuesta contrarreguladora hormonal intacta","Efecto adverso directo de la insulina aspártica utilizada en la ISCI sobre el sistema nervioso central"]',
  '1',
  'Los síntomas neuroglucopénicos resultan de la falta de glucosa en el cerebro: confusión, visión borrosa, habla arrastrada, pérdida de coordinación y, en los casos más graves, convulsiones o coma. Se distinguen de los síntomas autonómicos (temblores, sudoración, palpitaciones), que son la respuesta hormonal contrarreguladora. En adolescentes, los síntomas neuroglucopénicos tienden a predominar sobre los autonómicos.',
  ARRAY['medico'],
  false,
  '["Los síntomas de hipoglucemia se clasifican en autonómicos (respuesta adrenérgica) y neuroglucopénicos (disfunción cerebral directa)","La confusión y la alteración del habla son signos neuroglucopénicos de mayor gravedad clínica"]',
  null,
  null
),

(
  $STEP_ID_1,
  'El MCG de Pablo muestra 2,1 mmol/L con flecha de descenso rápido. ¿Cuándo está indicado confirmar el valor del sensor con glucometría capilar antes de tratar?',
  '["Solo cuando el sensor marca valores superiores a 15 mmol/L (270 mg/dL) por posible interferencia","Siempre que exista discrepancia entre los síntomas clínicos y el valor del sensor, o cuando los síntomas sean la primera manifestación de hipoglucemia sin valor previo del sensor disponible","Nunca: los sensores actuales calibrados de fábrica tienen suficiente precisión para tomar decisiones de tratamiento en todos los casos","Solo en pacientes con antecedentes documentados de sensor mal calibrado"]',
  '1',
  'Los dispositivos VCG actuales calibrados de fábrica permiten tomar decisiones sin glucometría capilar rutinaria. Sin embargo, la ISPAD 2022 recomienda confirmar con punción cuando haya discrepancia entre síntomas y sensor, o cuando los síntomas sean la primera manifestación sin valor previo de sensor disponible. En ningún caso debe retrasarse el tratamiento para confirmar si los síntomas son inequívocos.',
  ARRAY['medico','enfermeria','farmacia'],
  false,
  '["Los sensores tienen un desfase fisiológico de varios minutos respecto a la glucemia capilar real","Con síntomas inequívocos de hipoglucemia grave, no se debe retrasar el tratamiento para confirmar el valor"]',
  null,
  null
),

(
  $STEP_ID_1,
  '¿Cuáles son los umbrales glucémicos que definen la hipoglucemia nivel 1 y nivel 2 según la ISPAD 2022?',
  '["Nivel 1: <80 mg/dL; nivel 2: <60 mg/dL","Nivel 1: <70 mg/dL (3,9 mmol/L); nivel 2: <54 mg/dL (3,0 mmol/L)","Nivel 1: <60 mg/dL; nivel 2: <40 mg/dL","Nivel 1: <90 mg/dL en niños (valores pediátricos); nivel 2: <70 mg/dL"]',
  '1',
  'La ISPAD 2022 establece: nivel 1 (alerta clínica) si glucemia <3,9 mmol/L (70 mg/dL), punto de corte a partir del cual se recomienda iniciar tratamiento preventivo; nivel 2 (hipoglucemia clínicamente importante) si <3,0 mmol/L (54 mg/dL), umbral por debajo del cual aumentan los síntomas neuroglucopénicos y el riesgo de disfunción cognitiva.',
  ARRAY['medico','farmacia'],
  false,
  '["El umbral de 70 mg/dL es el punto de alerta para iniciar tratamiento antes de que empeore","Por debajo de 54 mg/dL la hipoglucemia es clínicamente importante independientemente de los síntomas"]',
  null,
  null
),


-- ══ PASO 2: Vía de tratamiento y manejo de la bomba ══

(
  $STEP_ID_2,
  'Pablo presenta consciencia alterada y no puede deglutir de forma segura. ¿Por qué está contraindicado el tratamiento oral con hidratos de carbono de absorción rápida?',
  '["La glucosa oral no es suficientemente rápida: tarda más de 30 minutos en elevar la glucemia en hipoglucemia grave","Riesgo de aspiración pulmonar al administrar líquidos o sólidos a un paciente con nivel de consciencia reducido","La vía oral es menos eficaz que el glucagón en hipoglucemia nivel 3 por diferencias en biodisponibilidad","Las guías ISPAD 2022 contraindican la vía oral siempre que la glucemia sea inferior a 54 mg/dL"]',
  '1',
  'La contraindicación de la vía oral no es farmacológica sino de seguridad: un paciente con consciencia alterada no puede proteger la vía aérea, lo que convierte la administración de cualquier alimento o líquido en un riesgo de aspiración pulmonar. La decisión de usar vía oral depende de la capacidad de deglución segura, no del valor glucémico.',
  ARRAY['medico','enfermeria'],
  true,
  '["La capacidad de deglución segura, no el valor glucémico, determina si puede usarse la vía oral","Incluso pequeñas cantidades de líquido pueden aspirarse en pacientes con nivel de consciencia reducido"]',
  90,
  'Administrar tratamiento oral a un paciente que no puede proteger la vía aérea puede causar aspiración pulmonar con consecuencias graves. Este error ocurre cuando se subestima el grado de alteración de consciencia o se prioriza la rapidez sobre la seguridad.'
),

(
  $STEP_ID_2,
  'Pablo porta una bomba de insulina ISCI con infusión basal activa. ¿Qué acción es prioritaria respecto al dispositivo?',
  '["Reducir la tasa basal al 50% y continuar la infusión durante el tratamiento de la hipoglucemia","Programar una tasa basal temporal del 0% durante 2 horas sin detener completamente la bomba","Suspender completamente la bomba o retirar el catéter de infusión de forma inmediata","Continuar la bomba con normalidad: el glucagón antagonizará el efecto de la insulina en curso"]',
  '2',
  'Ante hipoglucemia grave con consciencia alterada, el protocolo SEEP para ISCI indica suspender la bomba o retirar el catéter de forma inmediata. Continuar la infusión basal perpetúa el aporte de insulina y dificulta la recuperación glucémica. La diferencia con una tasa basal temporal 0% es que esta puede reiniciarse automáticamente; la suspensión completa garantiza que no se administra más insulina hasta que el clínico lo decida.',
  ARRAY['medico','enfermeria'],
  true,
  '["La infusión basal de la ISCI aporta insulina de forma continua incluso durante el episodio de hipoglucemia","Suspender la bomba elimina el aporte de insulina mientras se administra el tratamiento de rescate"]',
  90,
  'Mantener la infusión basal activa durante el tratamiento de una hipoglucemia grave retrasa significativamente la recuperación glucémica y puede provocar hipoglucemia refractaria, especialmente en niños con alta sensibilidad a la insulina.'
),

(
  $STEP_ID_2,
  'Entre las presentaciones de glucagón disponibles en España, ¿cuál NO requiere reconstitución previa a su administración?',
  '["Glucagen Hypokit (glucagón liofilizado 1 mg): requiere mezcla con diluyente antes de inyectar","Baqsimi (glucagón intranasal 3 mg): dispositivo de dosis única sin aguja ni reconstitución","Mini-dosis de glucagón en jeringa de insulina: requiere preparación con glucagón reconstituido","GlucaGen Emergency Kit: requiere reconstitución igual que el Hypokit"]',
  '1',
  'El Baqsimi es glucagón en polvo nasal de 3 mg en un dispositivo de dosis única que no requiere reconstitución, agujas ni refrigeración. Está aprobado desde los 4 años de edad. El Glucagen Hypokit (liofilizado) requiere mezcla con el diluyente incluido antes de inyectarlo, lo que puede generar errores de preparación bajo presión. Esta diferencia tiene impacto directo en su uso correcto por cuidadores no sanitarios.',
  ARRAY['medico','farmacia'],
  false,
  '["El glucagón liofilizado en polvo debe mezclarse con un diluyente estéril antes de inyectarse","La dificultad de preparación del glucagón inyectable es una barrera real para su uso en situaciones de emergencia domiciliaria"]',
  null,
  null
),

(
  $STEP_ID_2,
  'Pablo tiene 11 años. ¿Es el glucagón intranasal (Baqsimi 3 mg) una opción válida para tratar su hipoglucemia grave?',
  '["No: el glucagón intranasal solo está aprobado para adultos mayores de 18 años","No: está contraindicado en menores de 14 años por riesgo de irritación nasal grave","Sí: está aprobado para niños a partir de 4 años, con dosis única de 3 mg en una fosa nasal, igual que en adultos","Sí, pero en menores de 12 años se administra la mitad de la dosis (1,5 mg)"]',
  '2',
  'El glucagón intranasal (Baqsimi, 3 mg) está aprobado para pacientes de 4 o más años, con dosis única de 3 mg en una sola fosa nasal, independientemente del peso o la edad. Su principal ventaja frente al inyectable es la ausencia de reconstitución y de aguja, lo que facilita su uso por cuidadores no sanitarios y reduce los errores en situaciones de emergencia.',
  ARRAY['medico','farmacia','enfermeria'],
  false,
  '["La aprobación de Baqsimi en pediatría es a partir de los 4 años","La dosis es única e independiente del peso del paciente a partir de esa edad"]',
  null,
  null
),


-- ══ PASO 3: Tratamiento de la hipoglucemia grave ══

(
  $STEP_ID_3,
  'Se decide glucagón SC/IM (Glucagen Hypokit). Pablo pesa 38 kg. ¿Cuál es la dosis correcta según las guías ISPAD 2022?',
  '["0,5 mg (1/2 vial), por ser menor de 12 años de edad","1 mg (1 vial completo), por pesar más de 25 kg","0,75 mg, dosis ajustada por edad para niños entre 8 y 14 años","2 mg (2 viales), dosis doble por tratarse de hipoglucemia nivel 3 con pérdida de consciencia"]',
  '1',
  'La dosificación del glucagón SC/IM se basa en el peso del paciente, no en la edad. Según la ISPAD 2022 y la ficha técnica del Glucagen Hypokit: 1 mg (1 vial) para niños >25 kg; 0,5 mg (1/2 vial) para niños <25 kg. Pablo pesa 38 kg, por lo que corresponde 1 mg. La misma lógica aplica para el Gvoke HypoPen (disponible en algunos centros).',
  ARRAY['medico','farmacia'],
  true,
  '["La dosificación del glucagón pediátrico se basa en el peso del paciente, no en la edad","El punto de corte de peso para la dosis completa es 25 kg"]',
  90,
  'La infradosificación (0,5 mg en un paciente de 38 kg) puede resultar en una respuesta glucémica insuficiente o tardía, prolongando la hipoglucemia grave y aumentando el riesgo de daño neurológico. La sobredosificación provoca hiperglucemia de rebote y vómitos más intensos.'
),

(
  $STEP_ID_3,
  'Si hubiera acceso venoso disponible, ¿cuál es la alternativa IV al glucagón para el tratamiento hospitalario de la hipoglucemia grave pediátrica?',
  '["1 ml/kg de solución glucosada al 50% en bolo rápido IV","2 ml/kg de solución glucosada al 10% IV (0,2 g/kg de glucosa), con concentración máxima periférica del 25%","5 ml/kg de solución glucosada al 5% en infusión continua de 30 minutos","0,5 ml/kg de solución glucosada al 25% seguida de SG 5% de mantenimiento"]',
  '1',
  'Según la ISPAD 2022, en entorno hospitalario se administra dextrosa IV a 0,2 g/kg, equivalente a 2 ml/kg de SG 10%, con dosis máxima de 0,5 g/kg. Para Pablo (38 kg), esto equivale a 76 ml de SG 10%. La SG al 50% está contraindicada por vía periférica por riesgo de esclerosis venosa; la concentración máxima tolerable periférica es dextrosa al 25%.',
  ARRAY['medico','farmacia'],
  false,
  '["La dextrosa al 10% es segura para administración por vena periférica","Para un niño de 38 kg: 2 ml/kg × 38 kg = 76 ml de SG 10%"]',
  null,
  null
),

(
  $STEP_ID_3,
  'Mientras se administra el glucagón SC, ¿en qué posición debe mantenerse a Pablo y por qué?',
  '["Decúbito supino con la cabeza a 0 grados para maximizar la perfusión cerebral","Posición de Trendelenburg para mejorar el retorno venoso durante la recuperación","Decúbito lateral de seguridad para prevenir la aspiración en caso de vómitos, efecto adverso frecuente del glucagón","Posición sentada para facilitar la vigilancia del nivel de consciencia"]',
  '2',
  'Las náuseas y los vómitos son los efectos adversos más frecuentes del glucagón, tanto IM como intranasal. Suelen aparecer al recuperar la consciencia. Mantener al paciente en decúbito lateral de seguridad durante la recuperación reduce el riesgo de aspiración del vómito en un paciente que recupera la consciencia de forma progresiva.',
  ARRAY['enfermeria'],
  false,
  '["Las náuseas y vómitos son esperables tras la administración de glucagón y no indican fracaso del tratamiento","La posición lateral de seguridad es la medida preventiva estándar ante riesgo de aspiración"]',
  null,
  null
),

(
  $STEP_ID_3,
  'Los padres preguntan cómo deben conservar el Glucagen Hypokit en casa. ¿Qué información es correcta?',
  '["A temperatura ambiente entre 15-25°C sin necesidad de nevera, estable hasta la fecha de caducidad impresa","En nevera entre 2-8°C; una vez reconstituido el polvo con el diluyente, usar de inmediato y desechar el sobrante","En nevera entre 2-8°C; una vez reconstituido, se puede conservar hasta 24 horas en nevera","En congelador a -20°C para prolongar su vida útil más allá de la fecha de caducidad"]',
  '1',
  'El Glucagen Hypokit debe conservarse en nevera entre 2-8°C. Una vez que el polvo liofilizado se mezcla con el diluyente, la solución resultante debe administrarse de inmediato y desechar el sobrante: el glucagón reconstituido es inestable en solución acuosa. La familia también debe revisar periódicamente la fecha de caducidad del kit, ya que se usa raramente y puede caducar.',
  ARRAY['farmacia'],
  false,
  '["El glucagón liofilizado requiere cadena de frío para mantener su actividad","El glucagón reconstituido es inestable en solución y no puede guardarse para uso futuro"]',
  null,
  null
),

(
  $STEP_ID_3,
  '¿Cuál es la dosis de glucagón intranasal (Baqsimi) y a partir de qué edad está aprobado en pediatría?',
  '["1,5 mg en menores de 12 años y 3 mg en mayores de 12 años","3 mg (1 dispositivo en una sola fosa nasal) a partir de 4 años de edad, igual dosis que en adultos","3 mg repartidos: 1,5 mg en cada fosa nasal, a partir de 6 años de edad","2 mg en presentación pediátrica para menores de 18 años; 3 mg solo en adultos"]',
  '1',
  'El glucagón intranasal (Baqsimi) está aprobado para pacientes de 4 o más años con una dosis única de 3 mg administrada íntegramente en una sola fosa nasal. La dosis es la misma independientemente del peso. No requiere reconstitución ni aguja. Un metaanálisis demostró eficacia similar al glucagón IM/SC en la resolución de la hipoglucemia.',
  ARRAY['medico','farmacia','enfermeria'],
  false,
  '["La dosis de Baqsimi es única e independiente del peso a partir de los 4 años","Toda la dosis se administra en una sola fosa nasal en una única aplicación"]',
  null,
  null
),


-- ══ PASO 4: Reevaluación a los 15 minutos ══

(
  $STEP_ID_4,
  'A los 15 minutos del glucagón Pablo está consciente y puede tragar. Glucemia 68 mg/dL (no ha llegado a objetivo >70 mg/dL). ¿Cuál es la conducta correcta?',
  '["Administrar una segunda dosis completa de glucagón SC al no haber alcanzado el objetivo glucémico","Iniciar perfusión IV de SG 10% para asegurar subida glucémica más estable y controlada","Administrar hidratos de carbono de absorción rápida por vía oral y repetir la glucemia en 15 minutos","Reiniciar la bomba de insulina ISCI a la tasa basal habitual ya que la glucemia es casi normal"]',
  '2',
  'Según el algoritmo ISPAD y el protocolo SEEP para ISCI: si a los 15 minutos la glucemia sigue siendo <70 mg/dL pero el paciente ya puede tragar, se administran HC de absorción rápida por vía oral (~0,3 g/kg o 10-15 g) y se repite la glucemia en 15 minutos más. No se indica segunda dosis de glucagón si el paciente ya puede autotratarse por vía oral. La bomba no debe reiniciarse hasta que la glucemia sea estable y se haya identificado la causa.',
  null,
  true,
  '["Una vez que el paciente puede tragar de forma segura, la vía oral es la de elección para completar la corrección","La bomba no debe reiniciarse hasta que la glucemia sea estable y se haya corregido el factor precipitante"]',
  90,
  'Reiniciar la bomba prematuramente puede provocar recaída hipoglucémica. Dar una segunda dosis de glucagón sin necesidad aumenta el riesgo de hiperglucemia de rebote y de vómitos. El control glucémico a los 15 minutos es el marcador que guía la conducta.'
),

(
  $STEP_ID_4,
  '¿Cuándo puede reiniciarse la infusión basal de la bomba de insulina ISCI tras una hipoglucemia grave?',
  '["Inmediatamente tras recuperar la consciencia para no perder el control glucémico","Una vez que la glucemia sea estable por encima de 70 mg/dL y se haya identificado y, si es posible, corregido el factor precipitante","A las 2 horas del episodio, independientemente de los valores glucémicos","No debe reiniciarse hasta que lo autorice el endocrinólogo de referencia por vía telefónica"]',
  '1',
  'El protocolo SEEP para ISCI indica reiniciar la bomba cuando la glucemia sea estable >70 mg/dL. Además, conviene identificar y corregir el factor precipitante antes de reanudar: si el episodio se debe a una tasa basal excesiva para la actividad física realizada, reiniciarla sin ajuste provocará una nueva hipoglucemia.',
  ARRAY['medico','farmacia'],
  false,
  '["Reiniciar la bomba con glucemia en 68 mg/dL puede provocar una nueva caída","Identificar el precipitante antes de reiniciar es clave para prevenir recaídas inmediatas"]',
  null,
  null
),

(
  $STEP_ID_4,
  'Pablo desarrolla náuseas intensas y vomita una vez tras recibir el glucagón. Sus padres se alarman. ¿Cómo valoras esta situación?',
  '["Es un efecto adverso grave que sugiere reacción alérgica al glucagón: administrar adrenalina IM de inmediato","Es un efecto adverso frecuente y esperado del glucagón; mantener la posición lateral y vigilar la vía aérea","Indica que el glucagón no ha funcionado y debe administrarse una segunda dosis de inmediato","Sugiere hipoglucemia persistente: medir glucemia de inmediato y administrar dextrosa IV"]',
  '1',
  'Las náuseas y los vómitos son los efectos adversos más frecuentes del glucagón, tanto en la presentación IM como en la intranasal. Aparecen habitualmente al recuperar la consciencia y no indican fracaso del tratamiento ni reacción alérgica. El manejo consiste en mantener la posición lateral y vigilar la vía aérea; si los vómitos impiden la ingesta oral de HC, se valorará la vía IV para completar la corrección.',
  ARRAY['enfermeria'],
  false,
  '["Los vómitos post-glucagón son esperables y no contraindican su uso futuro","La posición lateral previene la aspiración mientras el paciente completa la recuperación"]',
  null,
  null
),

(
  $STEP_ID_4,
  'Pablo ya está consciente y con glucemia de 82 mg/dL. ¿Qué debe recibir para prevenir una recaída en los próximos 30-60 minutos?',
  '["Nada: con glucemia 82 mg/dL el riesgo de recaída es mínimo y puede irse a casa sin medidas adicionales","Hidratos de carbono de absorción lenta (10-15 g): una fruta, pan o vaso de leche, para mantener la glucemia estable","Una nueva dosis de glucagón intranasal como profilaxis de nueva hipoglucemia","Aumentar la tasa basal de la bomba un 20% para estabilizar la glucemia en el rango objetivo"]',
  '1',
  'Tras corregir la hipoglucemia y alcanzar el objetivo glucémico, el algoritmo ISPAD recomienda administrar un HC de absorción lenta (refrigerio estándar de 10-15 g: fruta, pan, galletas o leche) para mantener la glucemia estable durante la siguiente hora. El efecto del glucagón sobre la glucogenólisis hepática es transitorio y la glucemia puede volver a descender sin este aporte adicional.',
  ARRAY['medico','enfermeria'],
  false,
  '["El glucagón estimula la glucogenólisis hepática de forma transitoria; sin un aporte adicional de HC la glucemia puede caer de nuevo","Un refrigerio de 10-15 g de HC de absorción lenta es suficiente para estabilizar la glucemia en la hora siguiente"]',
  null,
  null
),


-- ══ PASO 5: Prevención, ajuste y educación ══

(
  $STEP_ID_5,
  'Los padres refieren ejercicio intenso de 2 horas por la tarde, cena escasa y que Pablo no ajustó la tasa basal antes del deporte. ¿Cuál es el mecanismo principal de la hipoglucemia nocturna?',
  '["La cena fue insuficiente en carbohidratos como factor único precipitante","El bolo prandial de la cena fue excesivo para la ingesta realizada","El ejercicio intenso aumenta la sensibilidad a la insulina hasta 7-11 horas después; la combinación de ejercicio sin reducción de tasa basal e ingesta insuficiente generó un triple riesgo de hipoglucemia diferida","La bomba administró insulina en exceso por un fallo técnico del dispositivo"]',
  '2',
  'El ejercicio de intensidad moderada-alta aumenta la sensibilidad a la insulina y agota las reservas de glucógeno muscular hasta 7-11 horas después. En pacientes con ISCI, el protocolo SEEP recomienda programar una tasa basal temporal reducida antes del ejercicio y valorar un aumento de la ingesta. La combinación de ejercicio sin ajuste de basal, cena escasa y ausencia de refrigerio nocturno generó el triple riesgo clásico de hipoglucemia diferida nocturna.',
  ARRAY['medico','farmacia'],
  false,
  '["El riesgo de hipoglucemia por ejercicio se extiende varias horas después de finalizar la actividad","La tasa basal temporal es la herramienta específica de la ISCI para gestionar el riesgo de hipoglucemia por ejercicio"]',
  null,
  null
),

(
  $STEP_ID_5,
  '¿Qué ajuste debería haberse programado en la bomba de Pablo antes del ejercicio intenso, según el protocolo SEEP para ISCI?',
  '["Suspender completamente la bomba durante el ejercicio y reiniciarla al finalizar","Aumentar la tasa basal un 20% para compensar el mayor consumo de glucosa durante el esfuerzo","Programar una tasa basal temporal reducida (50-80% de la basal habitual) iniciada 60-90 minutos antes del ejercicio","No se recomienda modificar la tasa basal; el ajuste debe hacerse solo con mayor ingesta de carbohidratos"]',
  '2',
  'El protocolo SEEP para ISCI recomienda una tasa basal temporal reducida al 50-80% de la habitual, comenzando 60-90 minutos antes del ejercicio, para compensar el aumento de sensibilidad a la insulina inducido por el deporte. La supresión completa de la bomba durante el ejercicio puede provocar hiperglucemia de rebote y cetosis, y no está recomendada de forma rutinaria. El inicio 60-90 minutos antes es necesario por el perfil de acción retardado de la insulina subcutánea.',
  ARRAY['medico','farmacia'],
  false,
  '["La tasa basal temporal reduce la insulina activa durante y después del ejercicio, reduciendo el riesgo de hipoglucemia diferida","Iniciar la reducción con antelación es necesario porque la insulina subcutánea tiene un efecto retardado"]',
  null,
  null
),

(
  $STEP_ID_5,
  'Antes del alta, ¿qué educación es prioritaria para los padres de Pablo respecto al manejo de futuras hipoglucemias graves?',
  '["Indicarles que llamen al 112 de forma inmediata ante cualquier episodio de hipoglucemia sin administrar glucagón primero","Enseñar la técnica de administración del glucagón (inyectable o intranasal), revisar la fecha de caducidad del kit y confirmar que todos los cuidadores habituales saben utilizarlo","Recomendar elevar el objetivo glucémico nocturno de forma permanente para evitar nuevos episodios","Indicarles que suspendan el ejercicio físico intenso de forma indefinida hasta nueva valoración endocrinológica"]',
  '1',
  'La ISPAD 2022 establece que todos los padres, madres y cuidadores de niños con DT1 deben tener glucagón accesible y saber cómo administrarlo. La educación en la técnica correcta (incluyendo la preparación del inyectable o el uso del intranasal) y la revisión periódica de la caducidad son intervenciones con impacto directo en la seguridad del paciente. Se recomienda que esta formación llegue también al entorno escolar.',
  ARRAY['enfermeria','medico'],
  false,
  '["La falta de formación de los cuidadores en el uso del glucagón es una causa frecuente de retraso o error en el tratamiento de la hipoglucemia grave","La caducidad del glucagón debe revisarse periódicamente, ya que su uso es infrecuente y los kits pueden caducar en casa"]',
  null,
  null
),

(
  $STEP_ID_5,
  'Los padres preguntan si pueden guardar en casa el resto del glucagón reconstituido para la próxima vez. ¿Qué les indicas?',
  '["Pueden guardarlo en nevera hasta 24 horas tras la reconstitución si no se ha contaminado","Pueden conservarlo 4 horas a temperatura ambiente si piensan usarlo ese mismo día","No: el glucagón reconstituido debe usarse de inmediato y desechar el sobrante; el kit debe reponerse tras cada uso y la caducidad debe revisarse periódicamente","Pueden guardarlo en congelador hasta 7 días si aún no ha contactado con el diluyente"]',
  '2',
  'El glucagón liofilizado reconstituido es químicamente inestable en solución acuosa y debe administrarse de inmediato. Tras un episodio de hipoglucemia grave el kit debe reponerse inmediatamente para garantizar disponibilidad ante futuros episodios. La familia debe revisar periódicamente la fecha de caducidad del kit en casa, ya que se usa raramente y puede caducar sin que se haya utilizado nunca.',
  ARRAY['farmacia'],
  false,
  '["El glucagón reconstituido es inestable en solución y no puede almacenarse para uso posterior","El kit debe reponerse después de cada uso y revisarse su caducidad con regularidad"]',
  null,
  null
);


-- ────────────────────────────────────────
-- 4. CASE BRIEF
-- ────────────────────────────────────────
INSERT INTO case_briefs (
  id, scenario_id, title, context, chief_complaint, chips,
  history, triangle, vitals, exam, quick_labs, imaging, timeline,
  red_flags, objectives, competencies, critical_actions,
  learning_objective, level, estimated_minutes
) VALUES (
  gen_random_uuid(),
  $SCENARIO_ID,
  'Hipoglucemia grave en adolescente con infusión continua de insulina',
  'Urgencias pediátricas hospitalarias',
  'Confusión y temblores en adolescente con DT1 portador de bomba de insulina',
  '["Confusión aguda","Glucemia 38 mg/dL","ISCI activa en curso","DT1 tras ejercicio intenso"]',
  '{
    "Síntomas": ["Confusión progresiva desde hace 20 minutos", "Temblores en extremidades superiores", "Incapacidad para responder a órdenes simples"],
    "Antecedentes": "Diabetes tipo 1 diagnosticada hace 3 años. En tratamiento con ISCI (insulina aspártica) y MCG desde hace 8 meses. Sin complicaciones conocidas. Un episodio previo de hipoglucemia grave hace 6 meses, tratado con glucagón en domicilio.",
    "Medicación": "Insulina aspártica en ISCI: tasa basal 0,5 U/h, ratio insulina/HC 1:15, índice de sensibilidad 50 mg/dL por U.",
    "Historia reciente": "Ejercicio intenso (2 horas de baloncesto) por la tarde sin ajuste de tasa basal. Cena con ingesta escasa de carbohidratos. Padres lo encuentran confuso a las 23:00 h."
  }',
  '{"appearance":"red","breathing":"green","circulation":"amber"}',
  '{"fc":112,"fr":20,"sat":99,"temp":36.7,"ta":{"systolic":100,"diastolic":62},"peso":38}',
  '{"Neurológica":"GCS 11 (O3V3M5). Confuso, no obedece órdenes. Sin signos meníngeos. Pupilas isocóricas y reactivas.", "Cardiovascular":"Taquicardia sinusal. Relleno capilar 2 s. Bien perfundido.", "Dispositivos":"Bomba de insulina ISCI colocada en flanco derecho con infusión basal activa. MCG en brazo izquierdo marcando 2,1 mmol/L con flecha de descenso rápido."}',
  '[{"name":"Glucemia capilar","value":"38 mg/dL (2,1 mmol/L)"},{"name":"Cetonemia capilar","value":"0,2 mmol/L (negativa)"},{"name":"MCG","value":"2,1 mmol/L — flecha descendente rápida"}]',
  '[{"name":"ECG","status":"ordered"}]',
  '[{"t":-120,"evento":"Ejercicio intenso: 2 horas de baloncesto sin programar tasa basal temporal reducida"},{"t":-60,"evento":"Cena con ingesta escasa de carbohidratos; bolo calculado sin corrección por actividad previa"},{"t":-20,"evento":"Padres notan a Pablo confuso y con temblores en su habitación"},{"t":0,"evento":"Llegada a urgencias. MCG: 2,1 mmol/L con descenso rápido. Glucometría capilar confirma 38 mg/dL"}]',
  '[{"text":"Glucemia 38 mg/dL con alteración del nivel de consciencia (hipoglucemia nivel 3)","correct":true},{"text":"Incapacidad para deglutir de forma segura: contraindicación absoluta de vía oral","correct":true},{"text":"Bomba de insulina ISCI activa con infusión basal en curso","correct":true},{"text":"Taquicardia sinusal FC 112 lpm","correct":false}]',
  '{
    "MED": ["Clasificar el nivel de hipoglucemia según la ISPAD 2022 y decidir la vía de tratamiento adecuada", "Prescribir glucagón con dosis correcta según peso o dextrosa IV y manejar la bomba ISCI", "Identificar los factores precipitantes y planificar el ajuste de la pauta ISCI para prevención de hipoglucemia por ejercicio"],
    "NUR": ["Reconocer los signos de hipoglucemia grave y contraindicación absoluta de vía oral en paciente con consciencia alterada", "Suspender la bomba de insulina ISCI y preparar y administrar glucagón SC/IM con técnica correcta", "Monitorizar glucemia cada 15 minutos, vigilar efectos adversos del glucagón y proporcionar educación a la familia"],
    "PHARM": ["Conocer las presentaciones de glucagón disponibles en España, sus dosis según peso, vías de administración y condiciones de conservación", "Identificar la dosis correcta de glucagón (1 mg para >25 kg) y la alternativa de dextrosa IV con la concentración adecuada", "Asesorar sobre el ajuste de tasa basal temporal en ISCI para prevención de hipoglucemia diferida por ejercicio"]
  }',
  '["Reconocimiento precoz de hipoglucemia grave en urgencias","Toma de decisiones en emergencia pediátrica con dispositivos de infusión","Manejo de bomba de insulina ISCI en situación de urgencia","Trabajo interprofesional en hipoglucemia grave","Educación terapéutica a paciente y familia con DT1"]',
  '["No administrar nada por vía oral ante alteración del nivel de consciencia","Suspender la bomba de insulina ISCI o retirar el catéter de forma inmediata","Administrar glucagón 1 mg SC/IM si peso >25 kg (o 0,5 mg si <25 kg) o dextrosa 2 ml/kg de SG10% IV","Controlar glucemia a los 15 minutos y no reiniciar la bomba hasta glucemia estable >70 mg/dL"]',
  'Manejar de forma segura y coordinada una hipoglucemia grave en un adolescente con DT1 en tratamiento con infusión continua de insulina, aplicando las guías ISPAD 2022 y el protocolo SEEP para ISCI.',
  'avanzado',
  20
);


-- ────────────────────────────────────────
-- 5. CASE RESOURCES
-- ────────────────────────────────────────
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), $SCENARIO_ID,
   'Evaluación y manejo de la hipoglucemia en niños y adolescentes con diabetes — ISPAD 2022',
   'https://onlinelibrary.wiley.com/doi/10.1111/pedi.13309',
   'ISPAD Clinical Practice Consensus Guidelines — Pediatric Diabetes 2022',
   'guideline', 2022, false, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Protocolo de manejo en urgencias del niño y adolescente con DT1 en tratamiento con ISCI',
   'https://www.seep.es/images/site/gruposTrabajo/enlaces/protocolo_insulin_ISCI_13.pdf',
   'SEEP — Sociedad Española de Endocrinología Pediátrica',
   'protocol', 2013, true, now()),
  (gen_random_uuid(), $SCENARIO_ID,
   'Abordaje de la hipoglucemia en vida real en el niño y adolescente con diabetes tipo 1',
   'https://www.revistadiabetes.org/wp-content/uploads/Abordaje-de-la-hipoglucemia-en-vida-real-en-el-nino-y-adolescente-con-diabetes-tipo-1.pdf',
   'Revista Diabetes — Hospital Sant Joan de Déu, Barcelona',
   'article', 2022, true, now());
