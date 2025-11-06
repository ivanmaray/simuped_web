-- Seed: Microcaso de sepsis en lactante con ramificaciones clinicas
-- Fecha: 2025-11-01

DO $$
DECLARE
  v_case_id uuid;
  v_start_node uuid;
  v_fluid_response_node uuid;
  v_delay_node uuid;
  v_antibiotics_node uuid;
  v_inotrope_node uuid;
  v_observation_node uuid;
  v_multiorgan_failure_node uuid;
  v_transfer_failure_node uuid;
  v_renal_failure_node uuid;
  v_pulmonary_edema_node uuid;
  v_hemodynamic_reassessment_node uuid;
  v_steroid_info_node uuid;
  v_source_control_node uuid;
  v_recovery_node uuid;
  v_adrenal_crisis_node uuid;
  v_uncontrolled_focus_node uuid;
BEGIN
  INSERT INTO public.micro_cases (
    slug,
    title,
    summary,
    estimated_minutes,
    difficulty,
    recommended_roles,
    recommended_units,
    is_published,
    created_by
  ) VALUES (
    'sepsis-lactante-choque-inicial',
    'Lactante con sospecha de sepsis en choque',
    'Evalua a un lactante febril con signos de choque septico. Prioriza intervenciones tempranas, interpreta la respuesta clinica y decide la escalada terapeutica.',
    8,
    'intermedio',
    ARRAY['Pediatria', 'Urgencias'],
    ARRAY['Emergencias', 'UCI Pediatrica'],
    true,
    auth.uid()
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    estimated_minutes = EXCLUDED.estimated_minutes,
    difficulty = EXCLUDED.difficulty,
    recommended_roles = EXCLUDED.recommended_roles,
    recommended_units = EXCLUDED.recommended_units,
    is_published = EXCLUDED.is_published
  RETURNING id INTO v_case_id;

  -- Nodo 1: valoracion inicial (inicio)
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'Lactante de 4 meses, 6.5 kg, fiebre de 39 C y taquicardia de 210 lpm. Extremidades frias, relleno capilar > 3 s, TA 65/35 mmHg. Venoclisis periferica recien colocada. Cual es el siguiente paso?',
    0,
    false
  ) RETURNING id INTO v_start_node;

  -- Nodo 2: reevaluacion tras el primer bolo
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'decision',
    'Tras un bolo rapido de 20 ml/kg de cristaloides, la frecuencia cardiaca desciende a 185 lpm y la TA sube a 72/40 mmHg, pero persisten taquipnea y signos de hipoperfusion. Se sospecha foco abdominal. Que haces a continuacion?',
    1,
    false,
    '{"monitoring": "Continuar monitorizacion estrecha de signos de perfusion."}'::jsonb
  ) RETURNING id INTO v_fluid_response_node;

  -- Nodo 3: deterioro por retraso terapeutico
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'Han pasado 10 minutos sin reanimacion efectiva. Lactato en ascenso, relleno capilar > 5 s y presion 60/32 mmHg. El equipo solicita direccion para revertir el choque. Cual es tu plan inmediato?',
    2,
    false
  ) RETURNING id INTO v_delay_node;

  -- Nodo 4: administracion precoz de antibioticos
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'info',
    'Se administran antibioticos de amplio espectro (ceftriaxona + vancomicina) dentro de los primeros 15 minutos. Se obtienen hemocultivos y se activa protocolo de sepsis.',
    3,
    false
  ) RETURNING id INTO v_antibiotics_node;

  -- Nodo 5: decision sobre soporte vasoactivo
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'Tras el segundo bolo (total 40 ml/kg) persiste hipotension (68/38 mmHg), acidosis metabolica y signos de hipoperfusion. El lactante esta intubado y con acceso central listo. Como escalas el manejo hemodinamico?',
    4,
    false
  ) RETURNING id INTO v_inotrope_node;

  -- Nodo 6: perfusion insuficiente pese a reanimacion limitada
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'Persisten signos de gasto cardiaco bajo, diuresis escasa y saturacion venosa central 55 por ciento. El equipo plantea mantener la estrategia conservadora o escalar. Que ordenas?',
    5,
    false
  ) RETURNING id INTO v_observation_node;

  -- Nodo 7: falla multiorganica
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'El retraso terapeutico prolongado lleva a choque refractario y falla multiorganica. El paciente requiere perfusion extracorporea emergente con pronostico reservado.',
    6,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_multiorgan_failure_node;

  -- Nodo 8: traslado sin estabilizacion
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'El traslado sin estabilizacion provoca paro cardiorespiratorio en la ambulancia. Se documenta brecha critica por no iniciar soporte en el sitio.',
    7,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_transfer_failure_node;

  -- Nodo 9: progresion a falla renal aguda
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'La persistencia de perfusion renal deficiente desencadena falla renal aguda e indica necesidad de terapia de reemplazo. Pronostico funcional comprometido.',
    8,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_renal_failure_node;

  -- Nodo 10: edema pulmonar por sobrecarga
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'La sobrecarga brusca de fluidos produce edema pulmonar severo, empeora la oxigenacion y obliga a estrategias ventilatorias agresivas.',
    9,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_pulmonary_edema_node;

  -- Nodo 11: reevaluacion hemodinamica tras vasopresor
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'Tras iniciar adrenalina a 0.08 mcg/kg/min la PAM sube a 55 mmHg y la perfusion mejora discretamente, pero el lactato sigue en 5.2 mmol/L, la piel esta marmorea y persiste diuresis escasa. Se sospecha insuficiencia suprarrenal relativa. Que conducta tomas?',
    10,
    false
  ) RETURNING id INTO v_hemodynamic_reassessment_node;

  -- Nodo 12: soporte hormonal
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'info',
    'Se administra hidrocortisona en bolo de 2 mg/kg seguido de infusion continua. Se documenta mejoria progresiva de la PAM, menor requerimiento de adrenalina y lactato en descenso.',
    11,
    false
  ) RETURNING id INTO v_steroid_info_node;

  -- Nodo 13: control del foco
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    'El ultrasonido abdominal revela coleccion purulenta perihepatica con asas distendidas. La presion arterial se mantiene borderline con adrenalina y esteroides. Como avanzas con el control del foco?',
    12,
    false
  ) RETURNING id INTO v_source_control_node;

  -- Nodo 14: desenlace favorable
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'Tras drenaje quirurgico oportuno, soporte vasoactivo escalonado y esteroides de stress, el lactante estabiliza signos vitales, normaliza lactato y progresa a cuidados intensivos con buen pronostico.',
    13,
    true,
    '{"is_correct": true}'::jsonb
  ) RETURNING id INTO v_recovery_node;

  -- Nodo 15: shock refractario por adrenal crisis
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'Se omite el soporte esteroideo y el choque se vuelve catecolamina refractario, con hipoglucemia recurrente y riesgo de paro cardiaco inminente.',
    14,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_adrenal_crisis_node;

  -- Nodo 16: foco no controlado
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata
  ) VALUES (
    v_case_id,
    'outcome',
    'Retrasar el control quirurgico permite progresion a peritonitis difusa, empeora la perfusion y obliga a soporte multiorganico prolongado.',
    15,
    true,
    '{"is_correct": false}'::jsonb
  ) RETURNING id INTO v_uncontrolled_focus_node;

  -- Opciones del nodo inicial
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_start_node,
      'Iniciar bolo de 20 ml/kg de cristaloides e indicar reevaluacion completa a los 5 minutos.',
      v_fluid_response_node,
      'Correcto. Completar el primer bolo y reevaluar rapidamente te permite medir la respuesta y planear la siguiente intervencion.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_start_node,
      'Comenzar norepinefrina en el acceso disponible mientras organizas mas volumen.',
      v_inotrope_node,
      'La catecolamina puede ayudar, pero iniciarla antes de completar la resucitacion con volumen limita la respuesta. Prioriza los bolos y ajusta despues.',
      -1,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_start_node,
      'Solicitar panel completo de laboratorio y aguardar los resultados antes de nuevos bolos.',
      v_delay_node,
      'Retrasar la resucitacion esperando examenes pierde tiempo valioso. Toma laboratorios en paralelo y continua con el soporte inicial.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_start_node,
      'Asegurar un segundo acceso periférico, monitorizar presion y saturacion continua y sostener el bolo indicado.',
      v_fluid_response_node,
      'Excelente. Enfermeria mantiene accesos redundantes y monitoreo estrecho para detectar cambios tempranos durante la resucitacion.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_start_node,
      'Priorizar la actualizacion de registros y esperar la siguiente valoracion medica antes de intervenir en la reanimacion.',
      v_delay_node,
      'La documentacion es clave, pero en choque debes centrarte en accesos, monitorizacion y apoyo al bolo para evitar retrasos.',
      -1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_start_node,
      'Verificar peso y calcular dosis de ceftriaxona y vancomicina para mezclarlas en cuanto confirmen la via.',
      v_fluid_response_node,
      'Perfecto. Farmacia adelanta la preparacion sin interferir con los bolos y acorta el tiempo a antibiotico.',
      2,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_start_node,
      'Esperar los hemocultivos para ajustar concentraciones antes de preparar la mezcla antibiotica.',
      v_delay_node,
      'Demorar la mezcla a la espera de cultivos retrasa la primera dosis. Prepara la cobertura empirica y ajusta despues.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones tras la primera respuesta a fluidos
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_fluid_response_node,
      'Indicar antibioticos de amplio espectro dentro de los primeros 15 minutos y documentar el tiempo de administracion.',
      v_antibiotics_node,
      'Clave. Iniciar antibioticos tempranos reduce mortalidad; deja indicadas las dosis y sigue con soporte hemodinamico.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_fluid_response_node,
      'Solicitar TAC abdominal urgente y posponer la dosis empirica hasta contar con imagen.',
      v_delay_node,
      'La imagen aporta informacion, pero diferir el antibiotico prolonga la bacteriemia. Coordina la TAC una vez administrada la terapia inicial.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_fluid_response_node,
      'Reducir los bolos a mantenimiento hasta ver evolucion ulterior sin reevaluacion estructurada.',
      v_observation_node,
      'Detenerte temprano puede dejar hipoperfusion persistente. Define objetivos claros y continua la reanimacion guiada.',
      -1,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_fluid_response_node,
      'Coordinar un segundo acceso, preparar bomba de infusion y anticipar requerimientos de vasopresor segun la respuesta.',
      v_antibiotics_node,
      'Excelente coordinacion de enfermeria: aseguras vias efectivas y rapidez cuando se escale a vasopresores.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_fluid_response_node,
      'Disminuir la velocidad del bolo actual por temor a sobrecarga sin revisar signos de perfusion en equipo.',
      v_observation_node,
      'Ajustar sin evaluacion compartida puede perpetuar la hipoperfusion. Usa criterios clinicos y comunica cambios antes de reducir la reanimacion.',
      -1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_fluid_response_node,
      'Liberar la mezcla antibiotica preparada y confirmar compatibilidades con las perfusiones activas.',
      v_antibiotics_node,
      'Gran aporte de farmacia: reduces retrasos y evitas incompatibilidades con soporte vasoactivo.',
      2,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_fluid_response_node,
      'Mantener los antibioticos reservados en la central hasta tener culturas para ajustar la dilucion.',
      v_delay_node,
      'Retener la dosis empirica a la espera de resultados prolonga el choque. Dispensa la terapia base y ajusta luego con los cultivos.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_fluid_response_node,
      'Coordinar acceso permeable y preparar bomba de infusion para iniciar antibioticos ya indicados.',
      v_antibiotics_node,
      'Clave en enfermeria: aseguras vias efectivas y aceleras la administracion sin retrasos adicionales.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_fluid_response_node,
      'Liberar la mezcla antibiotica y revisar interacciones con perfusiones activas antes de administrarla.',
      v_antibiotics_node,
      'Excelente. Aseguras compatibilidad y reduces riesgo de interrupciones en soporte vasopresor.',
      2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones tras iniciar antibioticos (nodo info)
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_antibiotics_node,
      'Indicar un segundo bolo de 20 ml/kg y dejar listo el inicio de adrenalina si persiste la hipotension.',
      v_inotrope_node,
      'Adecuado: continuar con reanimacion guiada y anticipar soporte vasoactivo evita nuevas caidas hemodinamicas.',
      1,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_antibiotics_node,
      'Reducir los bolos a 10 ml/kg y observar la tendencia de TA antes de decidir una escalada.',
      v_observation_node,
      'Quedarte corto con volumen puede mantener la hipoperfusion. Usa las guias de reanimacion completa antes de observar.',
      -1,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_antibiotics_node,
      'Verificar accesos, preparar bomba de perfusion y coordinar monitorizacion continua durante la administracion del segundo bolo.',
      v_inotrope_node,
      'Excelente soporte de enfermeria: aseguras vias seguras, bombas listas y datos hemodinamicos en tiempo real.',
      1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_antibiotics_node,
      'Esperar 20 minutos para revisar si la TA permanece estable antes de solicitar nuevo bolo.',
      v_observation_node,
      'La mejoria parcial puede revertirse. Reevaluar de inmediato y solicitar bolos adicionales segun guias es preferible a esperar sin accion.',
      -1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_antibiotics_node,
      'Ajustar dosis segun funcion renal estimada y confirmar compatibilidades de las mezclas con las lineas activas.',
      v_inotrope_node,
      'Gran aporte farmaceutico: garantizas dosis seguras y evitas interacciones mientras el equipo escalara soporte.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_antibiotics_node,
      'Reservar la segunda dosis hasta tener cultivos que orienten la cobertura definitiva.',
      v_delay_node,
      'Diferir la segunda dosis favorece recurrencias hemodinamicas. Mantén la cobertura empirica completa mientras llegan los resultados.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones tras el retraso terapeutico
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_delay_node,
      'Reiniciar reanimacion agresiva: bolos secuenciales y antibioticos inmediatos.',
      v_fluid_response_node,
      'Corregir el retraso abre la posibilidad de revertir el choque, pero has perdido tiempo valioso. Sigue reanimando.',
      1,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_delay_node,
      'Mantener observacion y esperar laboratoriales completos.',
      v_multiorgan_failure_node,
      'No actuar profundiza el choque y precipita falla multiorganica. La demora es letal.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_delay_node,
      'Trasladar a otro hospital sin estabilizar previamente.',
      v_transfer_failure_node,
      'Un traslado sin soporte reproduce eventos catastroficos. Debes estabilizar antes de derivar.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_delay_node,
      'Coordinar bolos escalonados, monitor continuo y avisar a farmacia para que libere antibioticos ya preparados.',
      v_fluid_response_node,
      'Excelente reaccion del equipo: sincronizas reanimacion, monitorizacion y antimicrobianos para recuperar terreno.',
      1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_delay_node,
      'Registrar signos cada 30 minutos mientras observas si la TA se recupera sin nuevas intervenciones.',
      v_multiorgan_failure_node,
      'La observacion pasiva en choque prolonga la hipoperfusion. Comunica la urgencia y participa de la reanimacion activa.',
      -2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_delay_node,
      'Activar alerta sepsis y liberar inmediatamente los antibioticos preparados para aplicar en cuanto haya acceso seguro.',
      v_fluid_response_node,
      'Excelente practica farmaceutica: reduces el tiempo a la primera dosis y comunicas la urgencia al equipo.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_delay_node,
      'Esperar confirmacion medica antes de reconfeccionar la mezcla, aun si eso retrasa unos minutos la administracion.',
      v_transfer_failure_node,
      'En esta fase cada minuto cuenta. Ajusta la mezcla si luego cambian el plan, pero no demores la dispensa inicial.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones en el escenario de perfusion insuficiente
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_observation_node,
      'Titular adrenalina a 0.08 mcg/kg/min, solicitar acceso arterial y ajustar segun respuesta cada pocos minutos.',
      v_inotrope_node,
      'Buena decision: combinas catecolaminas con monitorizacion avanzada para guiar el soporte en tiempo real.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_observation_node,
      'Mantener solo el aporte de mantenimiento y reevaluar cuando haya cambios en la diuresis.',
      v_renal_failure_node,
      'La diuresis tardará en reponerse si no corriges la hipoperfusion. Necesitas escalar soporte antes de esperar resultados urinarios.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_observation_node,
      'Indicar otro bolo completo de 20 ml/kg pese a signos de congestión venosa y sin guia hemodinamica adicional.',
      v_pulmonary_edema_node,
      'Aumentar volumen a ciegas con signos de congestión favorece edema pulmonar. Busca datos hemodinamicos antes de repetir bolos completos.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_observation_node,
      'Preparar la bomba de adrenalina, reforzar monitoreo continuo y reportar cambios de presion y perfusion cada 3 minutos.',
      v_inotrope_node,
      'Enfermeria sostiene la titulacion de catecolaminas y aporta datos constantes para ajustar el soporte.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_observation_node,
      'Reducir la frecuencia de controles a cada 30 minutos para evitar alarmas mientras se estabiliza el paciente.',
      v_renal_failure_node,
      'Disminuir la vigilancia en choque puede pasar por alto deterioros. Mantén controles estrechos y comunica cambios de inmediato.',
      -2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_observation_node,
      'Confirmar diluciones de adrenalina y proponer uso de bomba de jeringa para ajustes finos sin interrupciones.',
      v_inotrope_node,
      'Gran aporte farmaceutico: aseguras estabilidad de concentraciones y evitas errores al titular la catecolamina.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_observation_node,
      'Sugerir cambiar a coloides para ganar volumen sostenido en lugar de revisar la estrategia vasoactiva.',
      v_pulmonary_edema_node,
      'Agregar coloides sin reevaluar la perfusion ni la sobrecarga puede empeorar el cuadro respiratorio. Prioriza la optimizacion vasoactiva.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones de escalada vasoactiva
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_inotrope_node,
      'Iniciar infusion de adrenalina en dosis de choque (0.05-0.1 mcg/kg/min) y monitorizar respuesta.',
      v_hemodynamic_reassessment_node,
      'Escalada apropiada a catecolaminas tras fluidos agresivos. Reevalua parametros cada pocos minutos y considera soporte endocrino si persiste la inestabilidad.',
      3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_inotrope_node,
      'Iniciar dopamina a dosis bajas solo para proteger la funcion renal.',
      v_renal_failure_node,
      'La dopamina a dosis bajas no corrige la hipotension y retrasa el soporte efectivo. Selecciona catecolaminas apropiadas.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_inotrope_node,
      'Realizar bolos ilimitados de cristaloides sin monitorizar presion ni balance.',
      v_pulmonary_edema_node,
      'El exceso de fluidos precipita edema pulmonar y empeora oxigenacion. Ajusta fluidos segun respuesta.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_inotrope_node,
      'Ajustar la dilucion y compatibilidad de adrenalina con las soluciones en curso y apoyar la titulacion segura.',
      v_hemodynamic_reassessment_node,
      'Gran aporte farmaceutico: minimizas riesgos de precipitacion y respaldas la titulacion fina del vasopresor.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_inotrope_node,
      'Preparar bombas dedicadas para vasopresores, comunicar signos de extravasacion y acompañar la titulacion segun objetivos.',
      v_hemodynamic_reassessment_node,
      'Enfermeria garantiza administracion segura, monitorea complicaciones y documenta ajustes oportunamente.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_inotrope_node,
      'Mantener la adrenalina en dosis bajas de mantenimiento y enfocar el esfuerzo en nuevos bolos de cristaloides.',
      v_pulmonary_edema_node,
      'Sin ajustar la catecolamina ni monitor avanzado puedes terminar con sobrecarga y persistencia de hipoperfusion.',
      -1,
      false,
      ARRAY['enfermeria']::text[]
    );

  -- Opciones tras la reevaluacion hemodinamica
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_hemodynamic_reassessment_node,
      'Administrar hidrocortisona en dosis de stress y ajustar vasopresores segun respuesta.',
      v_steroid_info_node,
      'El soporte esteroideo restaura sensibilidad a catecolaminas y corrige la insuficiencia relativa. Controla glucosa y balance hidroelectrolitico.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Esperar resultados de laboratorio endocrino antes de añadir esteroides.',
      v_adrenal_crisis_node,
      'Retrasar el soporte hormonal permite progresion a choque refractario. Los esteroides deben iniciarse de inmediato en sepsis catecolamina resistente.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Aumentar de nuevo bolos rapidos de cristaloides sin guia hemodinamica.',
      v_pulmonary_edema_node,
      'Sobrecargar al paciente en esta fase aumenta edema pulmonar y dificulta la ventilacion sin mejorar perfusion.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Monitorizar glucosa y perfusion periferica mientras se inicia el soporte esteroideo indicado.',
      v_steroid_info_node,
      'Rol clave de enfermeria: detectas hipoglucemias y evalúas respuesta cutanea para ajustar rapidamente.',
      1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Validar compatibilidad de hidrocortisona con las soluciones activas y ajustar dilucion segun protocolos.',
      v_steroid_info_node,
      'Aporte farmaceutico decisivo: evitas interacciones y aseguras administracion segura del esteroide.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Limitar el monitoreo a controles cada media hora para dar tiempo a que actuen los vasopresores adicionales.',
      v_adrenal_crisis_node,
      'Reducir la frecuencia de controles puede pasar por alto deterioros; mantén vigilancia estrecha y comunica variaciones.',
      -1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Esperar confirmacion por escrito antes de liberar hidrocortisona aunque ya este indicada verbalmente.',
      v_adrenal_crisis_node,
      'Cuando el equipo ya la indico verbalmente en un choque refractario, demorar la dispensa prolonga la inestabilidad. Documenta despues pero libera el medicamento.',
      -2,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones tras soporte hormonal
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_steroid_info_node,
      'Coordinar imagen urgente y drenaje quirurgico del foco abdominal con el equipo de cirugia.',
      v_source_control_node,
      'El control del foco es pilar de la sepsis. Involucra a cirugia, prepara hemoderivados y planifica soporte perioperatorio.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_steroid_info_node,
      'Postergar intervencion hasta que el lactato normalice por completo.',
      v_uncontrolled_focus_node,
      'Esperar la normalizacion del lactato sin drenar el foco permite progresion de la infeccion y empeora el pronostico.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_steroid_info_node,
      'Suspender vasopresores ahora que la PAM mejoro a 55 mmHg.',
      v_multiorgan_failure_node,
      'Retirar soporte demasiado pronto precipita nueva caida hemodinamica y riesgo de paro circulatorio.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_steroid_info_node,
      'Mantener lineas permeables, controlar presion y glucosa cada 5 minutos tras el inicio de esteroides.',
      v_source_control_node,
      'Excelente coordinacion de enfermeria: detectas descompensaciones tempranas y sostienes el soporte ordenado.',
      1,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_steroid_info_node,
      'Monitorear interacciones medicamento-medicamento y ajustar plan antibiotico segun cultivos preliminares.',
      v_source_control_node,
      'Aporte farmaceutico clave: garantizas terapia adecuada antes del control del foco.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_steroid_info_node,
      'Suspender momentaneamente la bomba de adrenalina porque la PAM parece estable tras los esteroides.',
      v_multiorgan_failure_node,
      'Reducir vasopresores sin un periodo de estabilidad sostenida puede provocar recaida hemodinamica. Mantén ajustes graduales.',
      -2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_steroid_info_node,
      'Continuar con el plan antibiotico previo sin revisar sinergias o niveles ahora que se sospecha foco abdominal.',
      v_uncontrolled_focus_node,
      'Al no revisar cobertura y sinergias puedes dejar brechas contra patogenos abdominales. Revisa el esquema y ajusta con el equipo.',
      -1,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Opciones sobre el control del foco
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical,
    target_roles
  ) VALUES
    (
      v_source_control_node,
      'Coordinar laparotomia exploradora urgente con drenaje y continuar antibioticos de amplio espectro.',
      v_recovery_node,
      'La combinacion de control del foco, soporte hemodinamico y antibioticos oportunos permite revertir el choque y mejora el pronostico.',
      3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_source_control_node,
      'Continuar solo con vasopresores y reevaluar en 6 horas.',
      v_uncontrolled_focus_node,
      'Sin control del foco la infeccion persiste y se generaliza, anulando el beneficio de las catecolaminas.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_source_control_node,
      'Trasladar al paciente a otro centro sin estabilizacion hemodinamica completa.',
      v_transfer_failure_node,
      'El traslado en choque sin control del foco y sin soporte completo incrementa mortalidad y complica la resucitacion.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_source_control_node,
      'Preparar el traslado a quirofano asegurando soporte, bombas y reposicion rapida durante el procedimiento.',
      v_recovery_node,
      'Coordinacion de enfermeria impecable: mantienes la perfusion durante el control del foco.',
      2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_source_control_node,
      'Garantizar disponibilidad de antibioticos intraoperatorios y ajustar dosis en la hoja perioperatoria.',
      v_recovery_node,
      'Farmacia asegura continuidad antimicrobiana y reduce fallas de cobertura durante el control quirurgico.',
      2,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_source_control_node,
      'Retrasar la coordinacion quirurgica hasta que el lactato descienda por debajo de 2 mmol/L.',
      v_uncontrolled_focus_node,
      'Esperar marcadores perfectos antes de drenar el foco permite progresion de la infeccion. Coordina el control de foco en paralelo al soporte.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_source_control_node,
      'Reducir las bombas a modo mantenimiento durante el traslado para simplificar la logistica.',
      v_transfer_failure_node,
      'Disminuir el soporte para facilitar el traslado provoca recaidas hemodinamicas. Ajusta gradualmente y mantén equipos dedicados.',
      -2,
      false,
      ARRAY['enfermeria']::text[]
    ),
    (
      v_source_control_node,
      'Aplazar la reposicion de antibioticos porque se administraron hace menos de una hora.',
      v_uncontrolled_focus_node,
      'Sin redosificar intraoperatoriamente puedes quedar sin cobertura adecuada. Prepara dosis de refuerzo acorde a la duracion del procedimiento.',
      -1,
      false,
      ARRAY['farmacia']::text[]
    );

  -- Asegurar que el microcaso apunte al nodo inicial
  UPDATE public.micro_cases
    SET start_node_id = v_start_node
  WHERE id = v_case_id;
END;
$$;
