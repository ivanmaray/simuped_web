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
    is_terminal
  ) VALUES (
    v_case_id,
    'outcome',
    'El retraso terapeutico prolongado lleva a choque refractario y falla multiorganica. El paciente requiere perfusion extracorporea emergente con pronostico reservado.',
    6,
    true
  ) RETURNING id INTO v_multiorgan_failure_node;

  -- Nodo 8: traslado sin estabilizacion
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'outcome',
    'El traslado sin estabilizacion provoca paro cardiorespiratorio en la ambulancia. Se documenta brecha critica por no iniciar soporte en el sitio.',
    7,
    true
  ) RETURNING id INTO v_transfer_failure_node;

  -- Nodo 9: progresion a falla renal aguda
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'outcome',
    'La persistencia de perfusion renal deficiente desencadena falla renal aguda e indica necesidad de terapia de reemplazo. Pronostico funcional comprometido.',
    8,
    true
  ) RETURNING id INTO v_renal_failure_node;

  -- Nodo 10: edema pulmonar por sobrecarga
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'outcome',
    'La sobrecarga brusca de fluidos produce edema pulmonar severo, empeora la oxigenacion y obliga a estrategias ventilatorias agresivas.',
    9,
    true
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
    is_terminal
  ) VALUES (
    v_case_id,
    'outcome',
    'Tras drenaje quirurgico oportuno, soporte vasoactivo escalonado y esteroides de stress, el lactante estabiliza signos vitales, normaliza lactato y progresa a cuidados intensivos con buen pronostico.',
    13,
    true
  ) RETURNING id INTO v_recovery_node;

  -- Nodo 15: shock refractario por adrenal crisis
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'outcome',
    'Se omite el soporte esteroideo y el choque se vuelve catecolamina refractario, con hipoglucemia recurrente y riesgo de paro cardiaco inminente.',
    14,
    true
  ) RETURNING id INTO v_adrenal_crisis_node;

  -- Nodo 16: foco no controlado
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'outcome',
    'Retrasar el control quirurgico permite progresion a peritonitis difusa, empeora la perfusion y obliga a soporte multiorganico prolongado.',
    15,
    true
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
      'Administrar bolo de 20 ml/kg de cristaloides isotonicos y reevaluar la perfusion.',
      v_fluid_response_node,
      'Correcto. La resucitacion con fluidos es prioritaria para restaurar la perfusion. Reevaluar tras cada bolo y preparar antibioticos tempranos.',
      2,
      false,
      ARRAY['medico','enfermeria']::text[]
    ),
    (
      v_start_node,
      'Esperar resultados de laboratorio antes de iniciar reanimacion agresiva.',
      v_delay_node,
      'El retraso agrava el choque. Debes iniciar fluidos y antibioticos de inmediato para recuperar terreno perdido.',
      -2,
      true,
      ARRAY['medico']::text[]
    ),
    (
      v_start_node,
      'Iniciar soporte vasopresor sin fluidos iniciales.',
      v_delay_node,
      'Los vasopresores sin resucitacion previa limitan la respuesta. Prioriza la correccion de hipovolemia y luego escala.',
      -2,
      true,
      ARRAY['medico']::text[]
    ),
    (
      v_start_node,
      'Verificar peso y calcular dosis de ceftriaxona + vancomicina para mezclado inmediato mientras se mantiene la reanimacion.',
      v_fluid_response_node,
      'Excelente. La farmacia agiliza la preparacion sin retrasar los bolos; comunica al equipo cuando las dosis estan listas para administrar.',
      2,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_start_node,
      'Postergar mezcla de antibioticos hasta recibir todos los cultivos y ajustes definitivos.',
      v_delay_node,
      'Esperar la confirmacion microbiologica retrasa la terapia empirica y perpetua el choque. Debes liberar la mezcla inmediatamente.',
      -2,
      true,
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
      'Administrar antibioticos de amplio espectro en los primeros 15 minutos.',
      v_antibiotics_node,
      'Clave. La administracion temprana de antibioticos reduce mortalidad en sepsis. Continua con cultivos y soporte hemodinamico.',
      2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_fluid_response_node,
      'Solicitar TAC abdominal urgente antes de iniciar antibioticos.',
      v_delay_node,
      'La imagen puede esperar. Reanuda reanimacion y antibioticos ahora; la TAC vendra al estabilizar.',
      -2,
      true,
      ARRAY['medico']::text[]
    ),
    (
      v_fluid_response_node,
      'Suspender fluidos y mantener solo mantenimiento estandar.',
      v_observation_node,
      'Suspender la reanimacion perpetua la hipoperfusion. Deberas decidir pronto si escalas o el paciente se deteriorara.',
      -1,
      true,
      ARRAY['medico','enfermeria']::text[]
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
      'Administrar un segundo bolo de 20 ml/kg y preparar inicio de soporte vasoactivo.',
      v_inotrope_node,
      'Adecuado: continua reanimacion guiada y prepara soporte vasoactivo si la hipotension persiste.',
      1,
      false,
      ARRAY['medico','enfermeria']::text[]
    ),
    (
      v_antibiotics_node,
      'Esperar evolucion sin mas bolos porque ya mejoro la TA inicial.',
      v_observation_node,
      'Detenerte demasiado pronto mantiene la perfusion comprometida. Debes reevaluar indicadores y decidir escalada.',
      -1,
      true,
      ARRAY['medico','enfermeria']::text[]
    ),
    (
      v_antibiotics_node,
      'Ajustar dosis segun funcion renal y confirmar estabilidad de la infusion antibiotica.',
      v_inotrope_node,
      'Gran aporte desde farmacia: garantizas dosis seguras mientras se escalan soportes.',
      1,
      false,
      ARRAY['farmacia']::text[]
    ),
    (
      v_antibiotics_node,
      'Retrasar la liberacion de antibioticos hasta contar con cultivos definitivos.',
      v_delay_node,
      'Demorar la terapia dirigida permite progresion del choque. Debes sostener la cobertura empirica.',
      -2,
      true,
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
      -1,
      true,
      ARRAY['medico','enfermeria']::text[]
    ),
    (
      v_delay_node,
      'Mantener observacion y esperar laboratoriales completos.',
      v_multiorgan_failure_node,
      'No actuar profundiza el choque y precipita falla multiorganica. La demora es letal.',
      -4,
      true,
      ARRAY['medico','enfermeria']::text[]
    ),
    (
      v_delay_node,
      'Trasladar a otro hospital sin estabilizar previamente.',
      v_transfer_failure_node,
      'Un traslado sin soporte reproduce eventos catastroficos. Debes estabilizar antes de derivar.',
      -4,
      true,
      ARRAY['medico']::text[]
    ),
    (
      v_delay_node,
      'Activar alerta sepsis y coordinar liberacion inmediata de los antibioticos preparados.',
      v_fluid_response_node,
      'Excelente practica farmaceutica: reactivas la terapia en tiempo y comunicas urgencia al equipo.',
      1,
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
      'Escalar a adrenalina en perfusion continua y monitorizar respuesta minuto a minuto.',
      v_inotrope_node,
      'Escalar a catecolaminas adecuadas alivia el choque distributivo. Ajusta segun respuesta y lactato.',
      -1,
      true,
      ARRAY['medico','enfermeria']::text[]
    ),
    (
      v_observation_node,
      'Continuar solo con mantenimiento y esperar diuresis.',
      v_renal_failure_node,
      'No escalar mantiene hipoperfusion renal y precipita falla aguda. Debiste intensificar el soporte.',
      -3,
      true,
      ARRAY['medico','enfermeria']::text[]
    ),
    (
      v_observation_node,
      'Administrar bolo adicional grande sin monitorizar balance ni presion.',
      v_pulmonary_edema_node,
      'Sobrecargar sin control deriva en edema pulmonar y deterioro respiratorio severo.',
      -3,
      true,
      ARRAY['medico','enfermeria']::text[]
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
      ARRAY['medico','enfermeria']::text[]
    ),
    (
      v_inotrope_node,
      'Iniciar dopamina a dosis bajas solo para proteger la funcion renal.',
      v_renal_failure_node,
      'La dopamina a dosis bajas no corrige la hipotension y retrasa el soporte efectivo. Selecciona catecolaminas apropiadas.',
      -2,
      true,
      ARRAY['medico']::text[]
    ),
    (
      v_inotrope_node,
      'Realizar bolos ilimitados de cristaloides sin monitorizar presion ni balance.',
      v_pulmonary_edema_node,
      'El exceso de fluidos precipita edema pulmonar y empeora oxigenacion. Ajusta fluidos segun respuesta.',
      -2,
      true,
      ARRAY['medico','enfermeria']::text[]
    ),
    (
      v_inotrope_node,
      'Verificar la dilucion y compatibilidad de adrenalina con las soluciones en curso y apoyar la titulacion segura.',
      v_hemodynamic_reassessment_node,
      'Gran aporte farmaceutico: minimizas riesgos de precipitacion y aseguras ajustes segun estabilidad.',
      1,
      false,
      ARRAY['farmacia']::text[]
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
      -3,
      true,
      ARRAY['medico']::text[]
    ),
    (
      v_hemodynamic_reassessment_node,
      'Aumentar de nuevo bolos rapidos de cristaloides sin guia hemodinamica.',
      v_pulmonary_edema_node,
      'Sobrecargar al paciente en esta fase aumenta edema pulmonar y dificulta la ventilacion sin mejorar perfusion.',
      -2,
      true,
      ARRAY['medico','enfermeria']::text[]
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
      true,
      ARRAY['medico']::text[]
    ),
    (
      v_steroid_info_node,
      'Suspender vasopresores ahora que la PAM mejoro a 55 mmHg.',
      v_multiorgan_failure_node,
      'Retirar soporte demasiado pronto precipita nueva caida hemodinamica y riesgo de paro circulatorio.',
      -3,
      true,
      ARRAY['medico','enfermeria']::text[]
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
      true,
      ARRAY['medico']::text[]
    ),
    (
      v_source_control_node,
      'Trasladar al paciente a otro centro sin estabilizacion hemodinamica completa.',
      v_transfer_failure_node,
      'El traslado en choque sin control del foco y sin soporte completo incrementa mortalidad y complica la resucitacion.',
      -3,
      true,
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
    );

  -- Asegurar que el microcaso apunte al nodo inicial
  UPDATE public.micro_cases
    SET start_node_id = v_start_node
  WHERE id = v_case_id;
END;
$$;
