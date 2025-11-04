-- Migration: Reset trauma-neuro-guard microcase with full scenario flow
-- Fecha: 2025-11-16

DO $$
DECLARE
  v_case_id UUID;
  v_intro_node UUID;
  v_airway_decision UUID;
  v_airway_info UUID;
  v_airway_failure_outcome UUID;
  v_sedation_only_outcome UUID;
  v_hemo_decision UUID;
  v_hemo_info UUID;
  v_vaso_fail_outcome UUID;
  v_osmo_fail_outcome UUID;
  v_imaging_decision UUID;
  v_success_outcome UUID;
  v_delay_outcome UUID;
  v_wrong_diagnosis_outcome UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.micro_cases WHERE slug = 'trauma-neuro-guard') THEN
    DELETE FROM public.micro_cases WHERE slug = 'trauma-neuro-guard';
  END IF;

  INSERT INTO public.micro_cases (
    slug,
    title,
    summary,
    estimated_minutes,
    difficulty,
    recommended_roles,
    recommended_units,
    is_published,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    'trauma-neuro-guard',
    'Trauma craneal con signos neurológicos',
    'Paciente pediátrico con TCE grave, anisocoria súbita y riesgo de herniación. Coordina manejo de vía aérea, hemodinamia y derivación neuroquirúrgica.',
    15,
    'intermedio',
    ARRAY['Medicina', 'Enfermería', 'Farmacia'],
    ARRAY['Urgencias', 'UCI Pediátrica'],
    true,
    NULL,
    now(),
    now()
  )
  RETURNING id INTO v_case_id;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata,
    auto_advance_to
  ) VALUES (
    v_case_id,
    'info',
    $_INTRO$
### Ingreso a urgencias
Paciente masculino de 9 años que cae desde 3 metros. Llega con collar cervical, ventilación con bolsa-válvula-mascarilla y Glasgow 9. Se evidencia anisocoria izquierda en aumento, TA 90/55 mmHg, FC 136 lpm y SatO2 92 % con FiO2 0.6.

Se activa equipo de trauma: medicina coordina decisiones, enfermería prepara línea arterial y accesos, farmacia dispone osmoterapia y sedación RSI.
$_INTRO$,
    0,
    false,
    '{"roles_source": "reset_v2"}'::jsonb,
    NULL
  )
  RETURNING id INTO v_intro_node;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    $_AIRWAY_DECISION$
La saturación cae a 88 % pese a bolsa asistida. Pupila izquierda fija 6 mm. No hay ventilación controlada ni vía aérea definitiva.

¿Cuál es tu prioridad inmediata antes de trasladar a TAC?
$_AIRWAY_DECISION$,
    1,
    false
  )
  RETURNING id INTO v_airway_decision;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata,
    auto_advance_to
  ) VALUES (
    v_case_id,
    'info',
    $_AIRWAY_INFO$
Se coordina intubación en secuencia rápida con neuroprotección: preoxigenación, fentanilo + ketamina, rocuronio y control hemodinámico. Enfermería instala línea arterial radial y mantiene alineación cervical.

Farmacia etiqueta perfusiones de noradrenalina y prepara manitol 20 % y NaCl 3 % según peso (28 kg).
$_AIRWAY_INFO$,
    2,
    false,
    '{"roles_source": "reset_v2", "focus": "airway"}'::jsonb,
    NULL
  )
  RETURNING id INTO v_airway_info;

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
    $_AIRWAY_FAIL$
### Deterioro: traslado sin vía aérea definitiva
Durante el traslado a TAC el paciente presenta broncoaspiración y paro hipoxémico. La herniación se acelera por hipoxia.
$_AIRWAY_FAIL$,
    99,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_airway_failure_outcome;

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
    $_SEDATION_FAIL$
### Deterioro: sedación sin intubación
La sedación parcial provoca pérdida de reflejo protector sin control de vía aérea. Se agrava la hipoxia y aumenta la presión intracraneal.
$_SEDATION_FAIL$,
    100,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_sedation_only_outcome;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    $_HEMO_DECISION$
Tras intubación, PAM 55 mmHg pese a bolo de 20 mL/kg, hay tendencia a bradicardia. Pupila izquierda sin cambios.

    - Enfermería prepara bolsa presurizada, bomba de infusión y set para monitorización invasiva continua.

Define tu intervención hemodinámica y de control de presión intracraneal.
$_HEMO_DECISION$,
    3,
    false
  )
  RETURNING id INTO v_hemo_decision;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal,
    metadata,
    auto_advance_to
  ) VALUES (
    v_case_id,
    'info',
    $_HEMO_INFO$
Se inicia perfusión de noradrenalina titulada a PAM ≥ 65 mmHg, se administra manitol 1 g/kg en 15 minutos y se monitoriza osmolaridad. Enfermería vigila diuresis y presión arterial invasiva.

    Farmacia verifica interacciones entre sedación, vasopresores y osmoterapia antes de liberar las mezclas.

Pupilas isocóricas 4 mm, TA 110/65 mmHg. Equipo listo para TAC craneal con neurocirugía en línea.
$_HEMO_INFO$,
    4,
    false,
    '{"roles_source": "reset_v2", "focus": "hemodynamics"}'::jsonb,
    NULL
  )
  RETURNING id INTO v_hemo_info;

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
    $_VASO_FAIL$
### Deterioro: retraso vasopresor
La PAM se mantiene < 55 mmHg y reaparece anisocoria. La perfusión cerebral cae, aumentando el riesgo de herniación irreversible.
$_VASO_FAIL$,
    101,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_vaso_fail_outcome;

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
    $_OSMO_FAIL$
### Deterioro: sin osmoterapia
Se omite manitol/hipertónica esperando neurocirugía. La PIC se eleva, aparece bradicardia y el TAC muestra herniación incipiente.
$_OSMO_FAIL$,
    102,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_osmo_fail_outcome;

  INSERT INTO public.micro_case_nodes (
    case_id,
    kind,
    body_md,
    order_index,
    is_terminal
  ) VALUES (
    v_case_id,
    'decision',
    $_IMAGING_DECISION$
Con el paciente estabilizado, TAC disponible en 10 minutos y neurocirugía esperando decisión.

¿Qué plan defines mientras trasladas a imagen?
$_IMAGING_DECISION$,
    5,
    false
  )
  RETURNING id INTO v_imaging_decision;

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
    $_SUCCESS$
### Caso resuelto: hematoma epidural evacuado
TAC confirma hematoma epidural temporal con desplazamiento de línea media. Se realiza evacuación urgente con preparación anestésica completa. Paciente ingresa a UCI con pupilas reactivas y soporte vasopresor mínimo.

Excelente coordinación interdisciplinaria: vía aérea segura, perfusión adecuada y control intracraneal oportuno.
$_SUCCESS$,
    6,
    true,
    '{"is_correct": true}'::jsonb
  )
  RETURNING id INTO v_success_outcome;

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
    $_DELAY$
### Retraso crítico
Se pospone la intervención neuroquirúrgica esperando TAC sin coordinar quirófano ni perfusión estable. El paciente se descompensa durante el traslado y requiere reanimación prolongada.
$_DELAY$,
    103,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_delay_outcome;

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
    $_WRONG_DX$
### Diagnóstico incorrecto
Se interpreta la imagen como lesión axonal difusa y se descarta intervención quirúrgica inmediata. La TAC seriada muestra aumento de la colección epidural y colapso neurológico.
$_WRONG_DX$,
    104,
    true,
    '{"is_correct": false}'::jsonb
  )
  RETURNING id INTO v_wrong_diagnosis_outcome;

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
      v_airway_decision,
      'Preparar intubación controlada con estrategia neuroprotectora y asegurar línea arterial antes de TAC',
      v_airway_info,
      'Correcto. Asegura vía aérea, ventilación y monitoreo antes del traslado.',
      3,
      true,
      ARRAY['medico', 'enfermeria']::text[]
    ),
    (
      v_airway_decision,
      'Trasladar de inmediato a TAC para ganar tiempo y ventilar dentro del scanner',
      v_airway_failure_outcome,
      'Riesgoso: sin vía aérea definitiva aumentas hipoxia y empeoras la herniación.',
      -3,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_airway_decision,
      'Administrar sedación ligera y continuar con bolsa sin intubar para evaluar respuesta pupilar',
      v_sedation_only_outcome,
      'Sedación parcial sin protección provoca pérdida de reflejos y broncoaspiración.',
      -2,
      false,
      ARRAY['medico', 'enfermeria']::text[]
    );

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
      v_hemo_decision,
      'Iniciar noradrenalina titulada a PAM ≥ 65 mmHg y administrar manitol 1 g/kg con monitoreo de osmolaridad',
      v_hemo_info,
      'Excelente. Perfusión adecuada y osmoterapia temprana disminuyen el riesgo de herniación.',
      3,
      true,
      ARRAY['medico', 'farmacia', 'enfermeria']::text[]
    ),
    (
      v_hemo_decision,
      'Esperar respuesta al volumen inicial antes de iniciar vasopresores para evitar hipertensión',
      v_vaso_fail_outcome,
      'La espera prolongada perpetúa PAM baja y reduce el flujo cerebral.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_hemo_decision,
      'Postergar manitol porque neurocirugía decidirá en quirófano la osmoterapia',
      v_osmo_fail_outcome,
      'Omitir osmoterapia agrava la PIC y precipita herniación.',
      -2,
      false,
      ARRAY['medico', 'farmacia']::text[]
    );

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
      v_imaging_decision,
      'Coordinar TAC inmediata con neurocirugía y quirófano listos para evacuación tras imagen',
      v_success_outcome,
      'Correcto. Aceleras diagnóstico y tienes equipo listo para evacuar el hematoma.',
      4,
      true,
      ARRAY['medico', 'enfermeria']::text[]
    ),
    (
      v_imaging_decision,
      'Esperar TAC para decidir si requiere cirugía, sin avisar a quirófano hasta tener informe',
      v_delay_outcome,
      'El retraso en coordinar cirugía expone al paciente a nueva descompensación.',
      -2,
      false,
      ARRAY['medico']::text[]
    ),
    (
      v_imaging_decision,
      'Interpretar la lesión como axonal difusa y enfocar tratamiento conservador en UCI',
      v_wrong_diagnosis_outcome,
      'La morfología biconvexa corresponde a hematoma epidural: requiere evacuación urgente.',
      -3,
      false,
      ARRAY['medico']::text[]
    );

  UPDATE public.micro_case_nodes SET auto_advance_to = v_airway_decision WHERE id = v_intro_node;
  UPDATE public.micro_case_nodes SET auto_advance_to = v_hemo_decision WHERE id = v_airway_info;
  UPDATE public.micro_case_nodes SET auto_advance_to = v_imaging_decision WHERE id = v_hemo_info;
  UPDATE public.micro_cases SET start_node_id = v_intro_node, updated_at = now() WHERE id = v_case_id;
END $$;
