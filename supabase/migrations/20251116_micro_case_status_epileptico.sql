-- Seed: Microcaso complejo de status epiléptico pediátrico refractario
-- Fecha: 2025-11-16
-- Objetivo: Entrenar manejo escalonado rápido del status epiléptico, dosificación por peso, monitoreo y prevención de complicaciones.
-- Características: múltiple toma de decisiones por rol (médico, enfermería, farmacia), incluye manejo de vía aérea, benzodiacepinas, segunda/tercera línea y estado refractario.
-- Idempotente: ON CONFLICT por slug actualiza metadatos sin duplicar nodos (se procesan nodos y opciones sólo si no existen por cuerpo y orden/label).

DO $$
DECLARE
  v_case_id uuid;
  -- Nodos principales (decision/info/outcome)
  v_inicio_node uuid;
  v_post_benzo_node uuid;
  v_segunda_linea_node uuid;
  v_revaluacion_10_node uuid;
  v_refractario_pre_intub_node uuid;
  v_intubacion_node uuid;
  v_midazolam_inf_node uuid;
  v_eeg_continuo_node uuid;
  v_hipoglucemia_node uuid;
  v_hiponatremia_node uuid;
  v_complicacion_aspiracion_node uuid;
  v_complicacion_sobredosis_node uuid;
  v_complicacion_hipotension_node uuid;
  v_control_final_node uuid;
  v_refractario_ketamina_node uuid;
  v_propofol_error_node uuid;
  v_riesgo_neuronal_node uuid;
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
    'status-epileptico-pediatrico-refractario',
    'Status epiléptico pediátrico refractario',
    'Niño de 7 años (24 kg) con convulsión tónico-clónica generalizada >5 min que no cede tras primera benzodiacepina. Requiere escalada rápida, protección neurológica y prevención de complicaciones sistémicas.',
    12,
    'avanzado',
    ARRAY['Pediatria','Urgencias','Neurologia'],
    ARRAY['Emergencias','UCI Pediatrica'],
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

  -- Nodo inicial
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'Urgencias 21:15h. Niño de 7 años (24 kg) con antecedente de epilepsia focal ocasional controlada con levetiracetam. Los padres refieren que olvidó la dosis de la tarde. Convulsión tónico-clónica generalizada iniciada hace 5 minutos. FC 138 lpm, FR 26 irregular, SatO2 92% aire ambiente, TA 106/66, temp axilar 37.1°C, glucemia capilar 78 mg/dL. Movimientos tónico-clónicos generalizados persistentes, hipersalivación moderada, cianosis perioral leve. Pupilas medias reactivas. Acceso IV difícil (obesidad, venas poco visibles). Protocolo SECIP: primera benzodiacepina intranasal/bucal ya disponible. ¿Acción inmediata según algoritmo?',
    0,
    false
  ) RETURNING id INTO v_inicio_node;

  -- Nodo post segunda benzodiacepina (T+10 min según SECIP)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'decision',
    'T+10 min. Midazolam intranasal 0.2 mg/kg administrado a T+0. A T+5 min sin respuesta: midazolam IV 0.15 mg/kg (3.6 mg) administrado (acceso IV obtenido). Ahora T+10 min total: persiste actividad convulsiva generalizada. FC 148, TA 102/64, SatO2 94% con O2 mascarilla 10L, secreciones moderadas. Glucemia 76 mg/dL. Según protocolo SECIP: tras 2 benzodiacepinas sin respuesta en 10 min → iniciar SEGUNDA LÍNEA. Opciones: fenitoína/fosfenitoína 20 mg PE/kg, valproato 40 mg/kg, o levetiracetam 60 mg/kg. ¿Qué fármaco de segunda línea seleccionas considerando perfil del paciente (epiléptico conocido en LEV crónico, sin cardiopatía)?',
    1,
    false,
    '{"phase":"segunda_linea","benzos_completadas":2}'::jsonb
  ) RETURNING id INTO v_post_benzo_node;

  -- Nodo reevaluación post segunda línea (T+25-30 min)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+25 min. Segunda línea completada hace 10 min (infusión en 15 min según protocolo). Persiste actividad convulsiva, ahora con clonías hemicuerpo derecho intermitentes. FC 152, TA 98/60 (PAM 73), SatO2 92% con reservorio, secreciones abundantes. Gasometría: pH 7.32, pCO2 48, lactato 2.8, glucemia 82 mg/dL. Según SECIP: status refractario establecido si no responde tras segunda línea completa (>20-30 min total). Opciones: tercera línea (fenobarbital 20 mg/kg, valproato si no usado, o segundo antiepiléptico) vs preparar intubación + anestésicos. ¿Decisión considerando tiempo neuronal crítico y deterioro respiratorio?',
    2,
    false
  ) RETURNING id INTO v_segunda_linea_node;

  -- Nodo tercera línea / status refractario (T+30-40 min)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+35 min. STATUS EPILÉPTICO REFRACTARIO confirmado (>30 min, 2 benzodiacepinas + segunda línea sin respuesta). Convulsión persiste. SatO2 90% con reservorio, CO2 elevado (EtCO2 54 mmHg), secreciones abundantes, trabajo respiratorio aumentado. TA 94/56 (PAM 69). Protocolo SECIP tercera línea: FENOBARBITAL 20 mg/kg IV lento (20 min) O intubación + anestésicos (midazolam/propofol/tiopental). Riesgo fenobarbital sin vía aérea: apnea, hipotensión. Considerar: ¿fenobarbital pre-intubación con preparación para IOT inmediata vs asegurar vía aérea primero y anestésicos?',
    3,
    false
  ) RETURNING id INTO v_revaluacion_10_node;

  -- Nodo preparación intubación status refractario
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+40 min. Decisión: INTUBACIÓN para status refractario. SatO2 88%, CO2 56 mmHg, TA 92/58 (PAM 69). SECIP recomienda: inducción secuencia rápida adaptada, evitar propofol si inestabilidad hemodinámica. Opciones inductores: 1) TIOPENTAL 4-5 mg/kg (antiepiléptico potente, riesgo hipotensión moderado), 2) MIDAZOLAM 0.2-0.3 mg/kg (seguro, menos hipotensor), 3) PROPOFOL 2-3 mg/kg (evitar si PAM límite). Relajante: rocuronio 1 mg/kg + fentanilo 1 mcg/kg. ¿Qué inductor seleccionas considerando PAM 69 y objetivo antiepiléptico?',
    4,
    false
  ) RETURNING id INTO v_refractario_pre_intub_node;

  -- Nodo intubación realizada correctamente
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'info',
    'Se realiza intubación con protección cervical ligera y preoxigenación. Inducción según inductor seleccionado + FENTANILO 1 mcg/kg + ROCURONIO 1.2 mg/kg. Laringoscopia directa, tubo 6.0 mm con balón, confirmación capnografía (curva normal), auscultación bilateral simétrica. Se inicia ventilación controlada: VC 180 mL (7.5 mL/kg), FR 20, PEEP 5, FiO2 0.6. Monitoreo continuo. EEG continuo en preparación.',
    5,
    false,
    '{"airway":"secured"}'::jsonb
  ) RETURNING id INTO v_intubacion_node;

  -- Nodo infusión anestésicos status superrefractario
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+50 min. Post-intubación. Ventilación controlada estable: SatO2 98%, EtCO2 38. Infusión continua iniciada. Persiste actividad convulsiva (difícil valorar clínicamente bajo relajante). EEG continuo solicitado (llegará en 20 min). Protocolo SECIP status super-refractario: MIDAZOLAM 0.1-0.4 mg/kg/h (titular a burst-suppression en EEG) O TIOPENTAL 3-5 mg/kg/h O PROPOFOL 1-5 mg/kg/h (precaución PRIS en pediátricos). Alternativa: añadir KETAMINA 0.5-3 mg/kg/h (efecto NMDA, menos depresión hemodinámica). TA actual 88/54 (PAM 65, límite). ¿Estrategia de sedación considerando que EEG no está aún disponible?',
    6,
    false
  ) RETURNING id INTO v_midazolam_inf_node;

  -- Nodo EEG continuo y monitorización correcta (decision para estrategia destete)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'EEG continuo instalado. Se observa patrón evolutivo hacia supresión intermitente (burst-suppression) tras titulación de midazolam. Lactato 2.1 mmol/L, glucemia 86 mg/dL, Na 136 mEq/L. Paciente sedado profundamente, sin crisis clínicas aparentes. Ahora requiere estrategia de mantenimiento y destete: ¿Cómo manejas los próximos 24-48h para consolidar control sin recurrencia?',
    7,
    false
  ) RETURNING id INTO v_eeg_continuo_node;

  -- Nodo hipoglucemia detectada
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Demora en control glucémico: glucemia cae a 48 mg/dL sin corrección. Se agrava actividad epiléptica y riesgo de lesión neuronal difusa.',
    8,
    true,
    '{"is_correct":false,"complication":"hipoglucemia"}'::jsonb
  ) RETURNING id INTO v_hipoglucemia_node;

  -- Nodo hiponatremia sintomática
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Error en laboratorio: Na real 118 mEq/L no tratado. Convulsión persiste; se pierde oportunidad de corrección con SS hipertónica (3 mL/kg). Empeora edema cerebral.',
    9,
    true,
    '{"is_correct":false,"complication":"hiponatremia"}'::jsonb
  ) RETURNING id INTO v_hiponatremia_node;

  -- Nodo complicación aspiración
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'No se protegió vía aérea pese a secreciones y benzodiacepinas repetidas. Paciente aspiró contenido gástrico, desarrolla neumonía química y hipoxemia sostenida.',
    10,
    true,
    '{"is_correct":false,"complication":"aspiracion"}'::jsonb
  ) RETURNING id INTO v_complicacion_aspiracion_node;

  -- Nodo sobredosis (benzodiacepinas + fenobarbital rápido)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Administración acumulativa excesiva: múltiples benzodiacepinas seguidas de FENOBARBITAL 30 mg/kg rápido. Apnea profunda, hipotensión y necesidad de soporte vasopresor. Control de crisis tardío.',
    11,
    true,
    '{"is_correct":false,"complication":"sobredosis"}'::jsonb
  ) RETURNING id INTO v_complicacion_sobredosis_node;

  -- Nodo hipotensión por escalada sin monitorizar
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Escalada rápida a propofol y fenitoína sin monitoreo hemodinámico continuo provoca hipotensión sostenida (PAM 42 mmHg) y perfusión cerebral comprometida.',
    12,
    true,
    '{"is_correct":false,"complication":"hipotension"}'::jsonb
  ) RETURNING id INTO v_complicacion_hipotension_node;

  -- Nodo control final exitoso
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Status controlado en <45 min: benzodiacepinas adecuadas, segunda línea LEVETIRACETAM 60 mg/kg (máx 4.5 g) en infusión de 10 min, intubación oportuna, midazolam titulado a supresión eléctrica parcial, correcciones metabólicas vigiladas. Sin complicaciones mayores.',
    13,
    true,
    '{"is_correct":true}'::jsonb
  ) RETURNING id INTO v_control_final_node;

  -- Nodo ketamina añadido en refractario (info que conecta a EEG continuo)
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'info',
    'Añadida KETAMINA: bolo 1.5 mg/kg seguido de 2 mg/kg/h complementando midazolam. A los 10 min: movimientos sutiles disminuyen, PAM estable 68 mmHg (mejor que con midazolam solo), FC 136. EEG continuo llega y muestra patrón evolutivo hacia supresión mayor. Estrategia combinada GABA+NMDA permite control sin colapso hemodinámico.',
    14,
    false
  ) RETURNING id INTO v_refractario_ketamina_node;

  -- Nodo error propofol en infusión prolongada
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Propofol usado >24 h a dosis altas sin vigilancia metabólica: acidosis láctica progresiva y riesgo de síndrome de infusión de propofol (PRIS).',
    15,
    true,
    '{"is_correct":false,"complication":"propofol_pris"}'::jsonb
  ) RETURNING id INTO v_propofol_error_node;

  -- Nodo riesgo neuronal por demora en segunda línea
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'outcome',
    'Demora >20 min en iniciar segunda línea tras fracasar benzodiacepinas. Mayor riesgo de lesión cortical difusa y discapacidad cognitiva futura.',
    16,
    true,
    '{"is_correct":false,"complication":"demora_segunda_linea"}'::jsonb
  ) RETURNING id INTO v_riesgo_neuronal_node;

  -----------------------------------------------------------------
  -- Opciones Nodo inicial
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_inicio_node,'Priorizar acceso IV inmediato (intraóseo si falla tras 90 seg) y benzodiacepina IV estándar',v_post_benzo_node,'Razonamiento sólido: el tiempo ya es crítico (5 min), acceso intraóseo garantiza vía en <2 min si periférica falla. Midazolam IV 0.15 mg/kg tiene mejor biodisponibilidad que repetir intranasal.',3,true,ARRAY['medico']),
    (v_inicio_node,'Repetir midazolam bucal 0.3 mg/kg mientras se intenta acceso (doble vía)',v_post_benzo_node,'Aceptable si acceso IV muy difícil: vía bucal/intranasal repetida puede sumar efecto, pero retrasa escalada a segunda línea. Considera IO precoz.',1,false,ARRAY['medico']),
    (v_inicio_node,'Solicitar glucemia urgente y corregir antes de benzodiacepina (glucosa puede ser la causa)',v_hipoglucemia_node,'Error de priorización: glucemia 68 mg/dL es baja pero raramente causa única de status >8 min en epiléptico conocido. Benzodiacepina IV no debe retrasarse; glucosa puede darse simultánea.',-2,false,ARRAY['medico']),
    (v_inicio_node,'Iniciar directamente segunda línea (levetiracetam IV) tras única dosis intranasal sin benzodiacepina IV',v_riesgo_neuronal_node,'Saltar benzodiacepina IV pierde oportunidad de cese rápido. Guías recomiendan completar protocolo benzodiacepinas antes de segunda línea.',-3,false,ARRAY['medico']),
    (v_inicio_node,'Enfermería: preparar acceso intraóseo (humeral proximal), capnografía, aspiración continua y dextrosa 10% lista',v_post_benzo_node,'Excelente anticipación: acceso IO rápido si falla venoso, monitoreo respiratorio crítico, glucosa lista para corrección simultánea.',3,false,ARRAY['enfermeria']),
    (v_inicio_node,'Enfermería: registrar tiempos y esperar órdenes antes de adelantar material adicional',v_complicacion_aspiracion_node,'Actitud pasiva retrasa soporte. En emergencia neurológica, enfermería debe anticipar necesidades (IO, aspiración, capnografía).',-2,false,ARRAY['enfermeria']),
    (v_inicio_node,'Farmacia: calcular y preparar midazolam IV 0.15 mg/kg, levetiracetam carga 60 mg/kg y fosfenitoína 20 PE/kg como alternativas',v_segunda_linea_node,'Proactivo e inteligente: anticipa fallo de benzodiacepinas y prepara segunda línea. Considera que paciente ya toma LEV crónico (puede necesitar dosis estándar completa).',3,false,ARRAY['farmacia']),
    (v_inicio_node,'Farmacia: esperar confirmación de labs (función renal/hepática) antes de preparar cargas',v_riesgo_neuronal_node,'Retraso innecesario: función renal/hepática se asume normal en niño previamente sano. Labs pueden hacerse paralelas.',-2,false,ARRAY['farmacia']);

  -----------------------------------------------------------------
  -- Opciones post benzodiacepinas (T+10 min: elegir segunda línea)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_post_benzo_node,'LEVETIRACETAM 60 mg/kg (1440 mg, máx 4500 mg) IV en 15 min',v_segunda_linea_node,'Excelente elección: paciente ya en LEV crónico (baja adherencia), carga de 60 mg/kg es segura y rápida. Perfil seguro: sin efecto hemodinámico, sin monitoreo ECG. SECIP lo incluye como segunda línea válida.',4,true,ARRAY['medico']),
    (v_post_benzo_node,'FOSFENITOÍNA 20 mg PE/kg (480 mg PE) IV en 15 min con monitoreo ECG continuo',v_segunda_linea_node,'Opción válida según SECIP: fenitoína es segunda línea clásica, efectiva. Requiere ECG (arritmias) y TA (hipotensión si rápido). Con TA estable 102/64 es segura. Mecanismo distinto a LEV.',3,true,ARRAY['medico']),
    (v_post_benzo_node,'VALPROATO 40 mg/kg (960 mg) IV en 5 min',v_segunda_linea_node,'Opción aceptable SECIP: valproato es segunda línea efectiva, infusión rápida tolerada. Precaución: hepatotoxicidad (<2 años o politerapia), hiperamoniemia. En este caso (7 años, monoterapia) es razonablemente seguro.',2,false,ARRAY['medico']),
    (v_post_benzo_node,'FENOBARBITAL 20 mg/kg (480 mg) IV lento en 20 min como segunda línea',v_complicacion_sobredosis_node,'Error de protocolo SECIP: fenobarbital es TERCERA línea (status refractario tras fallo de 2ª). Usarlo ahora sin vía aérea tiene alto riesgo de apnea/hipotensión.',-3,false,ARRAY['medico']),
    (v_post_benzo_node,'Repetir dosis de midazolam 0.15 mg/kg IV antes de segunda línea',v_complicacion_sobredosis_node,'Error: ya se administraron 2 benzodiacepinas (intranasal + IV). SECIP establece máximo 2 dosis antes de segunda línea. Más benzos aumenta riesgo sedación/apnea sin mejorar control.',-2,false,ARRAY['medico']),
    (v_post_benzo_node,'Enfermería: monitorizar TA/FC cada 2 min durante infusión, ECG continuo si fenitoína, segundo acceso IV',v_segunda_linea_node,'Esencial: segunda línea requiere monitoreo estrecho (fenitoína: arritmias/hipotensión; valproato: tolerancia). Segundo acceso permite infusiones paralelas.',3,false,ARRAY['enfermeria']),
    (v_post_benzo_node,'Farmacia: verificar compatibilidad fenitoína (solo SSN, no dextrosa), calcular velocidad máxima infusión',v_segunda_linea_node,'Crítico: fenitoína precipita con dextrosa, requiere SSN. Velocidad máxima: 1-3 mg PE/kg/min para evitar hipotensión/arritmia. LEV y valproato son más flexibles.',2,false,ARRAY['farmacia']);

  -----------------------------------------------------------------
  -- Opciones post segunda línea (T+25-30 min: tercera línea o refractario)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_segunda_linea_node,'FENOBARBITAL 20 mg/kg (480 mg) IV lento 20 min con preparación simultánea para intubación urgente si apnea',v_revaluacion_10_node,'Opción SECIP válida: fenobarbital es tercera línea recomendada. Con SatO2 92% y secreciones, tiene riesgo de apnea pero puede evitar intubación si funciona. Clave: equipo IOT listo, infusión lenta (20 min).',3,true,ARRAY['medico']),
    (v_segunda_linea_node,'Segunda línea alternativa: valproato 40 mg/kg si no se usó, o fenitoína si se usó LEV',v_revaluacion_10_node,'Razonable: algunas guías sugieren probar segundo fármaco de 2ª línea antes de fenobarbital. Pero con deterioro respiratorio (SatO2 92%, secreciones), puede retrasar control definitivo.',1,false,ARRAY['medico']),
    (v_segunda_linea_node,'Progresión directa a intubación + anestésicos (status refractario): deterioro respiratorio es indicación',v_revaluacion_10_node,'Decisión defensiva aceptable: con SatO2 92%, pCO2 48 y secreciones abundantes, asegurar vía aérea es razonable. Permite sedación profunda sin riesgo respiratorio. Válido según criterio clínico.',3,true,ARRAY['medico']),
    (v_segunda_linea_node,'Observación 10 min más: segunda línea puede hacer efecto tardío',v_riesgo_neuronal_node,'Error: T+25 min ya es tiempo suficiente para valorar respuesta (infusión completada hace 10 min). Esperar más prolonga daño neuronal sin justificación. Protocolo SECIP: actuar ahora.',-3,false,ARRAY['medico']),
    (v_segunda_linea_node,'Carga adicional de levetiracetam (30 mg/kg más)',v_complicacion_hipotension_node,'No recomendado: dosis total >90 mg/kg no mejora eficacia y puede causar efectos adversos. SECIP: tras fallo de 2ª línea → 3ª línea o anestésicos, no recargar.',-2,false,ARRAY['medico']),
    (v_segunda_linea_node,'Enfermería: kit IOT completo, capnografía, acceso central femoral, vasopresores preparados, bomba infusión',v_revaluacion_10_node,'Anticipación excelente: alta probabilidad de necesitar intubación (fenobarbital puede causar apnea, o fallo de 3ª línea). Acceso central para vasopresores, bomba para anestésicos.',4,false,ARRAY['enfermeria']),
    (v_segunda_linea_node,'Farmacia: preparar midazolam, tiopental y ketamina en infusión continua para status refractario',v_revaluacion_10_node,'Proactivo: anticipa posible fallo de fenobarbital y necesidad de anestésicos IV. Tener preparadas las 3 opciones SECIP permite inicio inmediato.',3,false,ARRAY['farmacia']);
  (v_segunda_linea_node,'Farmacia: preparar midazolam, pentobarbital y ketamina en infusión continua para status refractario',v_revaluacion_10_node,'Proactivo: anticipa posible fallo de fenobarbital y necesidad de anestésicos IV. Tener preparadas las opciones internacionales (midazolam, pentobarbital, ketamina) permite inicio inmediato. Tiopental no recomendado por evidencia actual.',3,false,ARRAY['farmacia']);
  -- Se elimina pentobarbital, se deja midazolam y ketamina como principales, tiopental solo como última línea en infusión continua

  -----------------------------------------------------------------
  -- Opciones tercera línea / status refractario (T+35 min)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_revaluacion_10_node,'FENOBARBITAL 20 mg/kg IV lento (20 min) con equipo IOT listo para intubar si apnea',v_refractario_pre_intub_node,'Opción válida SECIP: fenobarbital es tercera línea estándar. Con SatO2 90% ya hay riesgo, pero si equipo IOT preparado puede intentarse. Infusión lenta reduce riesgo hipotensión/apnea.',2,false,ARRAY['medico']),
    (v_revaluacion_10_node,'Intubación INMEDIATA + anestésicos: deterioro respiratorio (SatO2 90%, CO2 54) es indicación absoluta',v_refractario_pre_intub_node,'Decisión correcta: SECIP establece que deterioro respiratorio significativo es indicación de IOT independientemente del algoritmo. SatO2 90% con reservorio + CO2 54 + secreciones = vía aérea insegura.',4,true,ARRAY['medico']),
    (v_revaluacion_10_node,'Probar segunda dosis de fenitoína o valproato antes de fenobarbital',v_complicacion_hipotension_node,'No recomendado: duplicar dosis de 2ª línea no está en protocolo SECIP y puede causar toxicidad (fenitoína: arritmias; valproato: hiperamoniemia) sin beneficio demostrado.',-2,false,ARRAY['medico']),
    (v_revaluacion_10_node,'Observación otros 10 min: puede haber respuesta tardía a segunda línea',v_riesgo_neuronal_node,'Error grave: T+35 min con deterioro respiratorio progresivo. Esperar más aumenta riesgo de paro respiratorio y daño neuronal irreversible. Actuar AHORA.',-4,false,ARRAY['medico']),
    (v_revaluacion_10_node,'Enfermería: preoxigenación con bolsa-mascarilla FiO2 1.0, aspiración previa, posición olfateo',v_refractario_pre_intub_node,'Excelente: preparación correcta pre-IOT. Preoxigenación crítica (ya hipoxémico), aspiración reduce riesgo aspiración, posición optimiza laringoscopia.',4,false,ARRAY['enfermeria']),
    (v_revaluacion_10_node,'Farmacia: calcular fenobarbital 20 mg/kg (480 mg) en 100 mL SSN, velocidad 5 mL/min (20 min)',v_refractario_pre_intub_node,'Preciso: cálculo correcto de dosis y velocidad. Infusión lenta (20 min) reduce riesgo de hipotensión y apnea bruscas.',2,false,ARRAY['farmacia']);

  -----------------------------------------------------------------
  -- Opciones preparación intubación (T+40 min: elección inductor)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_refractario_pre_intub_node,'MIDAZOLAM 0.2-0.3 mg/kg (5-7 mg) + fentanilo 1 mcg/kg + rocuronio 1 mg/kg',v_intubacion_node,'Opción segura y recomendada: midazolam es menos hipotensor, antiepiléptico eficaz, permite continuar infusión post-IOT. Ideal si inestabilidad hemodinámica. PAM 69 tolera bien. Evidencia internacional lo prioriza sobre tiopental.',4,true,ARRAY['medico']),
    (v_refractario_pre_intub_node,'PROPOFOL 2-3 mg/kg (48-72 mg) + fentanilo 1 mcg/kg + rocuronio 1 mg/kg',v_complicacion_hipotension_node,'Propofol solo si PAM >75 mmHg y con vigilancia estricta: riesgo de hipotensión y PRIS en pediátricos. No usar si inestabilidad hemodinámica. Midazolam es más seguro.',-3,false,ARRAY['medico']),
    (v_refractario_pre_intub_node,'MIDAZOLAM 0.2-0.3 mg/kg (5-7 mg) + fentanilo 1 mcg/kg + rocuronio 1 mg/kg',v_intubacion_node,'Opción segura SECIP: midazolam menos hipotensor que tiopental/propofol, efecto antiepiléptico GABA, permite continuar infusión post-IOT. Ideal si inestabilidad hemodinámica. PAM 69 tolera bien.',4,true,ARRAY['medico']),
    (v_refractario_pre_intub_node,'PROPOFOL 2-3 mg/kg (48-72 mg) + fentanilo 1 mcg/kg + rocuronio 1 mg/kg',v_complicacion_hipotension_node,'Error: SECIP desaconseja propofol si PAM límite (<75-80 mmHg pediátrico). Con PAM 69 puede causar colapso cardiovascular (PAM <50). Tiopental/midazolam son más seguros.',-3,false,ARRAY['medico']),
    (v_refractario_pre_intub_node,'Enfermería: preoxigenación FiO2 1.0, aspiración, atropina 0.02 mg/kg IV lista, vasopresores conectados',v_intubacion_node,'Excelente: preoxigenación crítica (SatO2 88%), atropina previene bradicardia vagal, vasopresores listos para hipotensión post-inducción (probable con tiopental).',4,false,ARRAY['enfermeria']);
  (v_refractario_pre_intub_node,'Enfermería: preoxigenación FiO2 1.0, aspiración, atropina 0.02 mg/kg IV lista, vasopresores conectados',v_intubacion_node,'Excelente: preoxigenación crítica (SatO2 88%), atropina previene bradicardia vagal, vasopresores listos para hipotensión post-inducción (probable con propofol/pentobarbital).',4,false,ARRAY['enfermeria']);

  -----------------------------------------------------------------
  -- Opciones Nodo intubación / inicio infusión
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_intubacion_node,'Bolo midazolam 0.2 mg/kg + iniciar 0.1 mg/kg/h y titulación EEG',v_midazolam_inf_node,'Estandar internacional: titulación por EEG reduce actividad eléctrica residual. Midazolam es primera opción en infusión continua.',3,true,ARRAY['medico']),
    (v_intubacion_node,'Añadir inmediatamente ketamina sin valorar respuesta inicial a midazolam',v_refractario_ketamina_node,'Puede ser útil pero se recomienda valorar efecto inicial del midazolam; aun así opción aceptable en refractario severo.',1,false,ARRAY['medico']),
    (v_intubacion_node,'Iniciar propofol a dosis alta >6 mg/kg/h prolongada',v_propofol_error_node,'Riesgo síndrome de infusión si dosis alta prolongada sin vigilancia.',-3,false,ARRAY['medico']);
  (v_intubacion_node,'Iniciar propofol a dosis alta >6 mg/kg/h prolongada',v_propofol_error_node,'Riesgo síndrome de infusión si dosis alta prolongada sin vigilancia. Propofol solo si no hay alternativas y con vigilancia estricta.',-3,false,ARRAY['medico']);

  -----------------------------------------------------------------
  -- Opciones desde nodo ketamina (conectar a EEG continuo)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_refractario_ketamina_node,'Continuar con estrategia combinada midazolam-ketamina, monitoreo EEG continuo',v_eeg_continuo_node,'Decisión muy razonada: status >40 min, hemodinamia límite (PAM 62 post-fluidos), movimientos sutiles persistentes. Ketamina aporta: mecanismo distinto (NMDA vs GABA), neuroprotección, soporte hemodinámico, efecto rápido. Sinergia midazolam-ketamina documentada en refractarios.',4,true,ARRAY['medico']);

  -----------------------------------------------------------------
  -- Opciones infusión anestésicos (T+50 min: status superrefractario)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_midazolam_inf_node,'MIDAZOLAM iniciar 0.1 mg/kg/h, titular cada 5-10 min hasta objetivo EEG (burst-suppression) máx 0.4 mg/kg/h',v_eeg_continuo_node,'Opción estándar internacional: midazolam es primera línea en status superrefractario, titulación guiada por EEG (burst-suppression es objetivo), perfil seguro. Inicio conservador permite valorar respuesta antes de escalar.',4,true,ARRAY['medico']),
    (v_midazolam_inf_node,'TIOPENTAL 3-5 mg/kg/h infusión continua, titular a burst-suppression en EEG (última línea)',v_eeg_continuo_node,'Tiopental puede considerarse como última línea en status superrefractario si midazolam y propofol fallan o están contraindicados. Requiere monitoreo hemodinámico invasivo, riesgo alto de hipotensión y depresión miocárdica. Uso restringido y solo en UCI.',2,false,ARRAY['medico']),
    (v_midazolam_inf_node,'PROPOFOL 1-3 mg/kg/h infusión continua (evitar >4 mg/kg/h >48h por riesgo PRIS)',v_eeg_continuo_node,'Opción con precaución: propofol efectivo pero SECIP advierte riesgo PRIS en pediátricos (acidosis láctica, rabdomiólisis, fallo cardíaco) si dosis altas >48h. Limitar dosis/tiempo, monitoreo lactato estricto. PAM 65 es contraindicación relativa.',1,false,ARRAY['medico']),
      (v_midazolam_inf_node,'PROPOFOL 1-3 mg/kg/h infusión continua (evitar >4 mg/kg/h >48h por riesgo PRIS)',v_eeg_continuo_node,'Opción con precaución: propofol efectivo pero riesgo PRIS en pediátricos (acidosis láctica, rabdomiólisis, fallo cardíaco) si dosis altas >48h. Limitar dosis/tiempo, monitoreo lactato estricto. PAM 65 es contraindicación relativa.',1,false,ARRAY['medico']),
    (v_midazolam_inf_node,'MIDAZOLAM 0.1 mg/kg/h + KETAMINA 1-2 mg/kg/h (terapia combinada sin esperar EEG)',v_refractario_ketamina_node,'Estrategia combinada válida: mecanismos distintos (GABA + NMDA), ketamina aporta estabilidad hemodinámica y neuroprotección. Sin EEG aún, combinación empírica razonable. SECIP menciona ketamina como adyuvante.',3,false,ARRAY['medico']),
      (v_midazolam_inf_node,'MIDAZOLAM 0.1 mg/kg/h + KETAMINA 1-2 mg/kg/h (terapia combinada sin esperar EEG)',v_refractario_ketamina_node,'Estrategia combinada válida: mecanismos distintos (GABA + NMDA), ketamina aporta estabilidad hemodinámica y neuroprotección. Sin EEG aún, combinación empírica razonable. Evidencia internacional menciona ketamina como adyuvante.',3,false,ARRAY['medico']);
    (v_midazolam_inf_node,'Esperar EEG (20 min) antes de iniciar cualquier infusión, solo bolos de rescate',v_riesgo_neuronal_node,'Error: T+50 min, cada minuto adicional de status aumenta daño neuronal. Iniciar infusión empírica es prioritario, EEG guiará titulación después. No esperar pasivamente.',-3,false,ARRAY['medico']),
    (v_midazolam_inf_node,'Enfermería: línea arterial, PVC, monitoreo continuo PAM/lactato/temp, EEG cada hora si continuo no disponible',v_refractario_ketamina_node,'Anticipación sobresaliente: sedación profunda requiere PAM continua (línea arterial), PVC guía fluidos/vasopresores, lactato detecta PRIS, temperatura (hipotermia con anestésicos). EEG es esencial.',4,false,ARRAY['enfermeria']);

  -----------------------------------------------------------------
  -- Opciones EEG continuo y manejo prolongado
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_eeg_continuo_node,'Titular sedación a BURST-SUPPRESSION (no supresión total), mantener 24-48h, destete gradual guiado por EEG',v_control_final_node,'Manejo excelente según SECIP: burst-suppression es objetivo (balance control/sedación), mantener 24-48h tras última crisis eléctrica, destete gradual 10-20%/12h vigilando recurrencia. Evita sobredosis y despertar prolongado.',4,true,ARRAY['medico']),
    (v_eeg_continuo_node,'Escalar a SUPRESIÓN ELÉCTRICA TOTAL (flat EEG) para máxima neuroprotección',v_complicacion_hipotension_node,'Error de concepto: supresión total no mejora pronóstico vs burst-suppression según evidencia, requiere dosis muy altas (hipotensión severa, vasopresores altos, despertar prolongado). SECIP recomienda burst-suppression.',-3,false,ARRAY['medico']),
    (v_eeg_continuo_node,'Destete precoz a las 12h si no hay crisis clínicas visibles (EEG como guía secundaria)',v_riesgo_neuronal_node,'Error grave: crisis eléctricas pueden persistir sin manifestación clínica (relajantes, sedación). SECIP exige mantener sedación 24-48h y destetear solo si EEG sin crisis. Destete precoz = recurrencia frecuente.',-4,false,ARRAY['medico']),
    (v_eeg_continuo_node,'Mantener sedación + iniciar antiepilépticos mantenimiento (LEV + valproato o fenitoína) para prevenir recurrencia',v_control_final_node,'Estratégica razonable: iniciar/optimizar antiepilépticos de mantenimiento mientras sedado reduce riesgo recurrencia al despertar. Politerapia justificada en status refractario.',2,false,ARRAY['medico']),
    (v_eeg_continuo_node,'Enfermería: monitoreo continuo EEG, glucemia/electrolitos cada 6h, balance restricción hídrica si SIADH, prevención úlceras/TVP',v_control_final_node,'Cuidados integrales: EEG continuo detecta crisis subclínicas, SIADH frecuente en status (restricción 50-70% mantenimiento), sedación prolongada requiere profilaxis úlceras/TVP.',3,false,ARRAY['enfermeria']),
    (v_eeg_continuo_node,'Farmacia: protocolo destete gradual anestésicos (reducir 10-20%/12h), ajustar antiepilépticos según niveles plasmáticos',v_control_final_node,'Plan estructurado: destete muy lento previene recurrencia, niveles plasmáticos guían optimización de mantenimiento (LEV, fenitoína, valproato).',2,false,ARRAY['farmacia']);

END $$;

