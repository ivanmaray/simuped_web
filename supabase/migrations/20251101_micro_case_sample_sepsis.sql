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

  -- Nodo 2: respuesta tras bolo
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
    'Tras un bolo rapido de 20 ml/kg de cristaloides, la frecuencia cardiaca desciende a 185 lpm, la TA sube a 72/40 mmHg y empieza a perfundirse mejor, pero persiste taquipnea y se sospecha foco abdominal. Que haces a continuacion?',
    1,
    false,
  '{"monitoring": "Continuar monitorizacion estrecha de signos de perfusion."}'::jsonb
  ) RETURNING id INTO v_fluid_response_node;

  -- Nodo 3: retraso peligroso
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'outcome',
    'Se demora la reanimacion. El lactante progresa rapidamente a choque refractario, requiere intubacion urgente y soporte vasopresor. Tiempo critico perdido para controlar la infeccion.',
    2,
    true
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
    'Se administran antibioticos de amplio espectro (ceftriaxona + vancomicina) en los primeros 15 minutos. Se toman hemocultivos y se inicia protocolo de sepsis.',
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
    'Tras el segundo bolo (total 40 ml/kg) persiste hipotension (68/38 mmHg), acidosis metabolica y signos de mala perfusion. El lactante esta intubado. Como escalas el manejo hemodinamico?',
    4,
    false
  ) RETURNING id INTO v_inotrope_node;

  -- Nodo 6: observacion insuficiente
  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'outcome',
    'La falta de escalada terapeutica mantiene al paciente en choque compensado prolongado. Se razv retraso en el control de la perfusion renal y aparecen signos de falla organica.',
    5,
    true
  ) RETURNING id INTO v_observation_node;

  -- Opciones del nodo inicial
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical
  ) VALUES
    (
      v_start_node,
      'Administrar bolo de 20 ml/kg de cristaloides isotonicos y reevaluar la perfusion.',
      v_fluid_response_node,
      'Correcto. La resucitacion con fluidos es prioritaria para restaurar la perfusion. Reevaluar tras cada bolo y preparar antibioticos tempranos.',
      2,
      false
    ),
    (
      v_start_node,
      'Esperar resultados de laboratorio antes de iniciar reanimacion agresiva.',
      v_delay_node,
      'Retrasar la reanimacion en un lactante en choque septico aumenta el riesgo de falla multiorganica. Inicia fluidos y antibioticos sin esperar estudios.',
      -3,
      true
    ),
    (
      v_start_node,
      'Iniciar inmediatamente soporte vasopresor sin fluidos iniciales.',
      v_delay_node,
      'La hipovolemia debe corregirse antes de iniciar vasopresores. Comienza con bolos de cristaloides y reevalua la respuesta.',
      -2,
      true
    );

  -- Opciones tras la primera respuesta a fluidos
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical
  ) VALUES
    (
      v_fluid_response_node,
      'Administrar antibioticos de amplio espectro en los primeros 15 minutos.',
      v_antibiotics_node,
      'Clave. La administracion temprana de antibioticos reduce mortalidad en sepsis. Continua con cultivos y soporte hemodinamico.',
      2,
      false
    ),
    (
      v_fluid_response_node,
      'Solicitar TAC abdominal urgente antes de iniciar antibioticos.',
      v_delay_node,
      'La imagen puede esperar si el paciente esta inestable. Prioriza antibioticos y reanimacion; la TAC se realiza una vez estabilizado.',
      -2,
      true
    ),
    (
      v_fluid_response_node,
      'Suspender fluidos y mantener solo mantenimiento estandar.',
      v_observation_node,
      'La reanimacion debe ser guiada por perfusion y signos hemodinamicos. Mantener mantenimiento sin bolos adicionales perpetua el choque.',
      -1,
      true
    );

  -- Opciones tras iniciar antibioticos (nodo info)
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical
  ) VALUES
    (
      v_antibiotics_node,
      'Administrar un segundo bolo de 20 ml/kg y preparar inicio de soporte vasoactivo.',
      v_inotrope_node,
      'Adecuado: fluidos adicionales guiados por respuesta y preparacion para soporte vasoactivo si la hipotension persiste.',
      1,
      false
    ),
    (
      v_antibiotics_node,
      'Esperar evolucion sin mas bolos porque ya mejoro la TA inicial.',
      v_observation_node,
      'En choque septico el objetivo es restaurar perfusion optima. Suspendes la reanimacion demasiado pronto y perpetuas hipoperfusion.',
      -1,
      true
    );

  -- Opciones de escalada vasoactiva
  INSERT INTO public.micro_case_options (
    node_id,
    label,
    next_node_id,
    feedback_md,
    score_delta,
    is_critical
  ) VALUES
    (
      v_inotrope_node,
      'Iniciar infusion de adrenalina en dosis de choque (0.05-0.1 mcg/kg/min) y monitorizar respuesta.',
      NULL,
      'Escalada apropiada a catecolaminas tras fluidos agresivos. Continua vigilando lactato, diuresis y perfusion periferica.',
      3,
      false
    ),
    (
      v_inotrope_node,
      'Iniciar dopamina a dosis bajas solo para proteger la funcion renal.',
      v_observation_node,
      'La dopamina a dosis bajas no corrige la hipotension y puede retrasar el soporte adecuado. Utiliza catecolaminas efectivas para choque septico.',
      -2,
      true
    ),
    (
      v_inotrope_node,
      'Realizar bolo adicional ilimitado de cristaloides sin monitorizacion.',
      v_delay_node,
      'El exceso de fluidos sin monitorizacion puede precipitar edema pulmonar. Escala a vasopresores cuando la perfusion no mejora tras 40-60 ml/kg.',
      -2,
      true
    );

  -- Asegurar que el microcaso apunte al nodo inicial
  UPDATE public.micro_cases
    SET start_node_id = v_start_node
  WHERE id = v_case_id;
END;
$$;
