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
    'Urgencias 21:15h. Niño de 7 años (24 kg) con antecedente de epilepsia focal ocasional controlada con levetiracetam 500 mg/12h. Los padres refieren que olvidó la dosis de la tarde. Convulsión tónico-clónica generalizada iniciada hace 8 minutos. FC 142 lpm, FR 28 irregular con pausas, SatO2 91% con cánula nasal 2L, TA 108/68, temp axilar 37.2°C, glucemia capilar 68 mg/dL. Enfermería administró midazolam intranasal 5 mg (0.2 mg/kg) hace 4 min: movimientos clónicos persisten aunque algo menos intensos. Pupilas medias reactivas, secreciones orales espumosas moderadas. Acceso IV difícil (obesidad, venas colapsadas por hipovolemia relativa). ¿Decisión prioritaria considerando tiempo transcurrido y dificultad de acceso?',
    0,
    false
  ) RETURNING id INTO v_inicio_node;

  -- Nodo post segunda benzodiacepina
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'decision',
    'T+12 min. Acceso IV obtenido (antebraquial izq tras 3 intentos). Lorazepam 0.1 mg/kg IV (2.4 mg) administrado hace 3 min. Persiste actividad convulsiva (sacudidas hemicuerpo derecho, desviación oculocefálica izq). Parámetros: FC 155, TA 96/62 (PAM 73), SatO2 94% con reservorio 10L, secreciones abundantes, tono muscular fluctuante. Última glucemia 62 mg/dL hace 6 min (no se repitió aún). Familiar refiere que el niño "no comió bien hoy". Antecedente adicional detectado: inició cuadro catarral hace 3 días con escasa ingesta. ¿Cuál es la prioridad terapéutica antes de escalar a segunda línea considerando contexto metabólico?',
    1,
    false,
    '{"phase":"post_benzo"}'::jsonb
  ) RETURNING id INTO v_post_benzo_node;

  -- Nodo segunda línea escogida correctamente
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+15 min. Glucosa corregida (dextrosa IV 0.5 g/kg). Convulsión persiste (ahora generalizada bilateral). Glucemia control 98 mg/dL. El equipo debate segunda línea: niño en monoterapia previa con levetiracetam, sin alergias conocidas, función renal/hepática presumiblemente normal (labs basales pendientes), ecocardiograma previo normal hace 6 meses. TA estable 104/66. ¿Qué fármaco de segunda línea optimiza velocidad de acción, seguridad hemodinámica y probabilidad de sinergia con su tratamiento basal?',
    2,
    false
  ) RETURNING id INTO v_segunda_linea_node;

  -- Nodo reevaluación a los 10 min tras segunda línea
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+28 min. Infusión de segunda línea completada hace 8 min. Clínicamente persiste actividad motora sutil hemicuerpo derecho (¿convulsión focal con generalización secundaria vs pseudoestatus?). Respiración irregular, SatO2 93% con reservorio, secreciones crecientes. TA 92/58 (PAM 69, límite inferior para edad). FC 158. Gasometría disponible: pH 7.29, pCO2 52, HCO3 22, lactato 3.8 mmol/L, Na 134, K 3.9, Ca iónico 1.08. Labs previos del niño (hace 3 meses): Na 138, función tiroidea normal, niveles de levetiracetam subterapéuticos crónicos (familia admite olvidos frecuentes). Riesgo de progresión a status refractario vs oportunidad de observación breve con carga adicional. ¿Estrategia más razonada?',
    3,
    false
  ) RETURNING id INTO v_revaluacion_10_node;

  -- Nodo pre-intubación en refractario
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+33 min. Convulsión focal persistente evolucionando a clonías generalizadas intermitentes. SatO2 oscila 89-92% pese a O2 alto flujo, CO2 en aumento (EtCO2 58 mmHg), acidosis respiratoria-metabólica mixta, secreciones que no se manejan adecuadamente con aspiración. TA 88/54 (PAM 65). Se confirma status epiléptico refractario. El equipo discute: ¿fenobarbital 20 mg/kg IV lento previo a intubación para intentar evitarla (riesgo apnea/hipotensión pero posible cese) vs intubar de inmediato e iniciar anestésicos (midazolam/propofol) con control de vía aérea segura pero asumiendo sedación prolongada? Considerar hemodinamia borderline, riesgo de colapso con inductores, disponibilidad de soporte vasopresor y experiencia del equipo.',
    4,
    false
  ) RETURNING id INTO v_refractario_pre_intub_node;

  -- Nodo intubación realizada correctamente
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal, metadata) VALUES (
    v_case_id,
    'info',
    'Se realiza intubación con protección cervical ligera y preoxigenación. Inducción: MIDAZOLAM 0.2 mg/kg + FENTANILO 1 mcg/kg + ROCURONIO 1.2 mg/kg. Se coloca capnografía, se inicia ventilación controlada y monitoreo continuo. EEG continuo en preparación.',
    5,
    false,
    '{"airway":"secured"}'::jsonb
  ) RETURNING id INTO v_intubacion_node;

  -- Nodo inicio infusión de midazolam
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'decision',
    'T+42 min. Post-intubación. Ventilación controlada: VC 180 mL, FR 24, PEEP 6, FiO2 0.6 → SatO2 98%, EtCO2 42. Midazolam: bolo 0.15 mg/kg (evitando hipotensión), infusión iniciada 0.1 mg/kg/h. TA post-intubación 76/48 (PAM 57) → SSN 10 mL/kg rápido → PAM recupera a 62. Movimientos clónicos sutiles persisten (difícil valorar bajo relajante residual). Se solicita EEG continuo (llegará en 15 min). Labs recientes: Na 132 (¿hiponatremia dilucional por SIADH incipiente?), lactato 4.2, glucemia 110. Opciones: 1) titular midazolam agresivamente a 0.3-0.4 mg/kg/h empíricamente vs 2) añadir ketamina (efecto sinérgico, neuroprotector, menos hipotensor) vs 3) esperar EEG para guiar (posible retraso en control). ¿Estrategia farmacológica más equilibrada considerando tiempo neuronal crítico, estabilidad hemodinámica límite y ausencia de monitorización eléctrica inmediata?',
    6,
    false
  ) RETURNING id INTO v_midazolam_inf_node;

  -- Nodo EEG continuo y monitorización correcta
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'info',
    'EEG continuo instalado. Se observa patrón evolutivo hacia supresión intermitente tras titulación de midazolam. Lactato 2.1 mmol/L, glucemia 86 mg/dL, Na 136 mEq/L.',
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

  -- Nodo ketamina añadido en refractario
  INSERT INTO public.micro_case_nodes (case_id, kind, body_md, order_index, is_terminal) VALUES (
    v_case_id,
    'info',
    'Añadida KETAMINA: bolo 1.5 mg/kg seguido de 2 mg/kg/h complementando midazolam. EEG mejora hacia patrón de supresión mayor. Se evita hipotensión significativa.',
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
    (v_inicio_node,'Priorizar acceso IV inmediato (intraóseo si falla tras 90 seg) y benzodiacepina IV estándar',v_post_benzo_node,'Razonamiento sólido: el tiempo ya es crítico (8 min), acceso intraóseo garantiza vía en <2 min si periférica falla. Lorazepam IV tiene mejor biodisponibilidad que repetir intranasal.',3,true,ARRAY['medico']),
    (v_inicio_node,'Repetir midazolam bucal 0.3 mg/kg mientras se intenta acceso (doble vía)',v_post_benzo_node,'Aceptable si acceso IV muy difícil: vía bucal/intranasal repetida puede sumar efecto, pero retrasa escalada a segunda línea. Considera IO precoz.',1,false,ARRAY['medico']),
    (v_inicio_node,'Solicitar glucemia urgente y corregir antes de benzodiacepina (glucosa puede ser la causa)',v_hipoglucemia_node,'Error de priorización: glucemia 68 mg/dL es baja pero raramente causa única de status >8 min en epiléptico conocido. Benzodiacepina IV no debe retrasarse; glucosa puede darse simultánea.',−2,false,ARRAY['medico']),
    (v_inicio_node,'Iniciar directamente segunda línea (levetiracetam IV) tras única dosis intranasal sin benzodiacepina IV',v_riesgo_neuronal_node,'Saltar benzodiacepina IV pierde oportunidad de cese rápido. Guías recomiendan completar protocolo benzodiacepinas antes de segunda línea.',−3,false,ARRAY['medico']),
    (v_inicio_node,'Enfermería: preparar acceso intraóseo (humeral proximal), capnografía, aspiración continua y dextrosa 10% lista',v_post_benzo_node,'Excelente anticipación: acceso IO rápido si falla venoso, monitoreo respiratorio crítico, glucosa lista para corrección simultánea.',3,false,ARRAY['enfermeria']),
    (v_inicio_node,'Enfermería: registrar tiempos y esperar órdenes antes de adelantar material adicional',v_complicacion_aspiracion_node,'Actitud pasiva retrasa soporte. En emergencia neurológica, enfermería debe anticipar necesidades (IO, aspiración, capnografía).',−2,false,ARRAY['enfermeria']),
    (v_inicio_node,'Farmacia: calcular y preparar lorazepam IV, levetiracetam carga (considerar que ya toma crónicamente) y fosfenitoína alternativa',v_segunda_linea_node,'Proactivo e inteligente: anticipa fallo de benzodiacepinas y considera que dosis carga de levetiracetam puede necesitar ajuste (ya en tratamiento crónico subterapéutico).',3,false,ARRAY['farmacia']),
    (v_inicio_node,'Farmacia: esperar confirmación de labs (función renal/hepática) antes de preparar cargas',v_riesgo_neuronal_node,'Retraso innecesario: función renal/hepática se asume normal en niño previamente sano. Labs pueden hacerse paralelas.',−2,false,ARRAY['farmacia']);

  -----------------------------------------------------------------
  -- Opciones Nodo post benzodiacepina
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_post_benzo_node,'Corregir glucemia AHORA (dextrosa 0.5 g/kg IV), luego reevaluar y decidir segunda línea',v_segunda_linea_node,'Decisión crítica correcta: glucemia 62 mg/dL en contexto de ayuno/infección puede perpetuar crisis. Corrección rápida puede evitar segunda línea innecesaria o mejorar respuesta. Tiempo de corrección <2 min.',4,true,ARRAY['medico']),
    (v_post_benzo_node,'Proceder directamente a segunda línea sin corregir glucosa (ya está en rango aceptable >60)',v_hipoglucemia_node,'Error de razonamiento: 62 mg/dL es hipoglucemia significativa en niño convulsionando (consumo cerebral aumentado). Puede ser factor perpetuador tratable en <2 min.',−3,false,ARRAY['medico']),
    (v_post_benzo_node,'Solicitar panel metabólico completo (ionograma, calcio, magnesio) antes de siguiente paso',v_riesgo_neuronal_node,'Razonable pero mal timing: labs importantes pero no deben retrasar glucosa IV inmediata ni segunda línea. Hacer en paralelo.',−2,false,ARRAY['medico']),
    (v_post_benzo_node,'Enfermería: administrar dextrosa 10% 12 mL (0.5 g/kg) por acceso actual y preparar segundo acceso',v_segunda_linea_node,'Perfecto: corrección glucémica rápida sin esperar orden explícita (protocolo de hipoglucemia) y anticipa necesidad de doble vía para infusiones.',3,false,ARRAY['enfermeria']),
    (v_post_benzo_node,'Enfermería: esperar confirmación de laboratorio antes de administrar dextrosa',v_hipoglucemia_node,'Error: glucemia capilar 62 mg/dL es suficiente para actuar. Confirmar con venosa puede hacerse después.',−2,false,ARRAY['enfermeria']),
    (v_post_benzo_node,'Farmacia: alertar sobre probable necesidad de tiamina previa a dextrosa (riesgo Wernicke)',v_segunda_linea_node,'Pensamiento crítico excelente pero no aplicable: tiamina prioritaria en desnutrición/alcoholismo crónico, no en niño de 7 años previamente sano. En este caso, dextrosa directa es segura.',1,false,ARRAY['farmacia']);

  -----------------------------------------------------------------
  -- Opciones Nodo segunda línea (elección de fármaco)
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_segunda_linea_node,'LEVETIRACETAM carga adicional 40 mg/kg (960 mg, total 1460 mg con dosis basal) en 10 min',v_revaluacion_10_node,'Razonamiento óptimo: paciente ya toma levetiracetam 500 mg/12h pero con adherencia mala (niveles crónicamente bajos). Carga adicional rápida y segura, alcanza nivel terapéutico sin interacciones. Alternativa más conservadora pero racional dado antecedente.',3,true,ARRAY['medico']),
    (v_segunda_linea_node,'FOSFENITOÍNA 20 mg PE/kg (480 mg PE) IV en 10 min con monitoreo ECG',v_revaluacion_10_node,'Opción válida: fosfenitoína es efectiva, niño sin cardiopatía conocida, permite carga rápida. Requiere vigilancia TA/ritmo pero con TA actual estable (104/66) es segura. Mecanismo distinto a levetiracetam (bloqueador sodio vs modulador SV2A).',3,true,ARRAY['medico']),
    (v_segunda_linea_node,'VALPROATO 40 mg/kg (960 mg) IV en 5 min sin labs hepáticos previos',v_complicacion_sobredosis_node,'Riesgo: valproato efectivo pero hepatotoxicidad potencial (especialmente <2 años o politerapia). Sin labs previos y ya en levetiracetam, fosfenitoína o carga adicional levetiracetam son más seguras. Además puede causar hiperamonemia.',−2,false,ARRAY['medico']),
    (v_segunda_linea_node,'FENOBARBITAL 20 mg/kg (480 mg) IV lento 20 min como segunda línea directa',v_complicacion_sobredosis_node,'Error de protocolo: fenobarbital es tercera línea (tras fallo de 2ª). Usarlo ahora aumenta riesgo sedación excesiva y apnea sin vía aérea asegurada. Reservar para refractario post-intubación.',−3,false,ARRAY['medico']),
    (v_segunda_linea_node,'Enfermería: monitorizar TA y FC cada 2 min durante infusión, ECG continuo si fosfenitoína',v_revaluacion_10_node,'Vigilancia esencial: fosfenitoína puede causar arritmias/hipotensión si muy rápida; levetiracetam es más seguro pero monitoreo continuo siempre necesario.',2,false,ARRAY['enfermeria']),
    (v_segunda_linea_node,'Farmacia: verificar compatibilidad levetiracetam + dextrosa 5% en misma vía (evitar precipitación)',v_revaluacion_10_node,'Detalle crítico: levetiracetam es compatible con cristaloides pero algunos preparados precipitan con dextrosa concentrada. Usar vías separadas o SSN si duda.',2,false,ARRAY['farmacia']);

  -----------------------------------------------------------------
  -- Opciones Nodo reevaluación 10 min segunda línea
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_revaluacion_10_node,'Observación monitorizada 5 min más: actividad puede ser postictal, PAM límite, acidosis leve compatible con ejercicio muscular',v_riesgo_neuronal_node,'Razonamiento incorrecto: T+28 min con actividad motora persistente, acidosis metabólica (lactato 3.8) y respiratoria mixta sugiere status activo, no fenómeno postictal. Diferir intubación aumenta riesgo lesión neuronal.',−3,false,ARRAY['medico']),
    (v_revaluacion_10_node,'Intubación urgente + anestésicos (midazolam/propofol): status refractario establecido, riesgo respiratorio y neuronal crítico',v_refractario_pre_intub_node,'Decisión correcta: >25 min con 2 líneas fallidas define refractariedad. Acidosis mixta, hipoxemia relativa y PAM descendente indican descompensación inminente. Vía aérea asegura ventilación y permite sedación profunda.',4,true,ARRAY['medico']),
    (v_revaluacion_10_node,'Carga adicional de levetiracetam (30 mg/kg más) antes de intubar: puede responder a dosis acumulativa',v_complicacion_hipotension_node,'Razonamiento parcialmente válido pero arriesgado: dosis adicional levetiracetam es opción en algunos protocolos, pero demora control definitivo. En T+28 min con deterioro clínico, vía aérea + anestésicos es más seguro.',−1,false,ARRAY['medico']),
    (v_revaluacion_10_node,'Corregir hiponatremia límite (Na 132) con SS hipertónica antes de intubar',v_hiponatremia_node,'Error de priorización: Na 132 es leve, poco probable causa principal de refractariedad. Corrección aguda puede causar mielinólisis. Priorizar vía aérea y control de crisis, corregir Na gradualmente después.',−2,false,ARRAY['medico']),
    (v_revaluacion_10_node,'Enfermería: kit intubación listo, capnografía calibrada, acceso central femoral preparado, bomba de infusión continua verificada',v_refractario_pre_intub_node,'Anticipación excelente: acceso central permite vasopresores si hipotensión post-intubación, bomba lista para midazolam continuo inmediato.',3,false,ARRAY['enfermeria']),
    (v_revaluacion_10_node,'Farmacia: preparar fenobarbital 20 mg/kg (tercera línea alternativa) para administrar previo a intubación',v_complicacion_sobredosis_node,'Opción existente pero riesgosa en este contexto: fenobarbital pre-intubación tiene riesgo alto de apnea/hipotensión con PAM ya límite (69). Mejor asegurar vía aérea primero.',−2,false,ARRAY['farmacia']);

  -----------------------------------------------------------------
  -- Opciones Nodo pre-intubación refractario
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_refractario_pre_intub_node,'Intubación secuencia rápida modificada: ketamina 1.5 mg/kg (inductor + anticonvulsivo) + rocuronio, luego midazolam infusión',v_intubacion_node,'Decisión óptima: ketamina ofrece inducción con menor caída hemodinámica que propofol (PAM ya 65), efecto antiepiléptico directo (antagonista NMDA), menos depresión respiratoria que benzodiacepinas adicionales. Rocuronio asegura relajación sin histamina. Midazolam post-intubación como mantenimiento es estándar.',4,true,ARRAY['medico']),
    (v_refractario_pre_intub_node,'Propofol 2 mg/kg para inducción rápida, luego midazolam infusión',v_complicacion_hipotension_node,'Error crítico: propofol es depresor cardiovascular potente, con PAM 65 puede causar colapso (PAM <50). En status con hemodinamia límite, ketamina o etomidato son más seguros.',−3,false,ARRAY['medico']),
    (v_refractario_pre_intub_node,'Fenobarbital 20 mg/kg IV lento (15 min) intentando evitar intubación',v_complicacion_sobredosis_node,'Decisión arriesgada: fenobarbital puede controlar crisis pero con SatO2 89-92%, CO2 58 y acidosis mixta, riesgo de apnea profunda sin vía aérea es inaceptable. Puede intentarse POST-intubación si midazolam falla.',−3,false,ARRAY['medico']),
    (v_refractario_pre_intub_node,'Midazolam bolo adicional 0.2 mg/kg previo a intubación para control previo',v_complicacion_sobredosis_node,'Razonamiento incorrecto: sumar benzodiacepinas sin asegurar vía aérea aumenta riesgo apnea. Ya recibió intranasal + IV, añadir más sin ventilación controlada es peligroso.',−2,false,ARRAY['medico']);

  -----------------------------------------------------------------
  -- Opciones Nodo intubación / inicio infusión
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_intubacion_node,'Bolo midazolam 0.2 mg/kg + iniciar 0.1 mg/kg/h y titulación EEG',v_midazolam_inf_node,'Estandar: titulación por EEG reduce actividad eléctrica residual.',3,true,ARRAY['medico']),
    (v_intubacion_node,'Añadir inmediatamente ketamina sin valorar respuesta inicial a midazolam',v_refractario_ketamina_node,'Puede ser útil pero se recomienda valorar efecto inicial del midazolam; aun así opción aceptable en refractario severo.',1,false,ARRAY['medico']),
    (v_intubacion_node,'Iniciar propofol a dosis alta >6 mg/kg/h prolongada',v_propofol_error_node,'Riesgo síndrome de infusión si dosis alta prolongada sin vigilancia.',-3,false,ARRAY['medico']);

  -----------------------------------------------------------------
  -- Opciones Nodo infusión midazolam
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_midazolam_inf_node,'Añadir KETAMINA bolo 1 mg/kg + infusión 2 mg/kg/h complementando midazolam, sin esperar EEG',v_refractario_ketamina_node,'Decisión muy razonada: status >40 min, hemodinamia límite (PAM 62 post-fluidos), movimientos sutiles persistentes, hiponatremia límite, EEG no inmediato. Ketamina aporta: mecanismo distinto (NMDA vs GABA), neuroprotección, soporte hemodinámico, efecto rápido. Esperar 15 min EEG puede perder ventana terapéutica. Sinergia midazolam-ketamina documentada en refractarios.',4,true,ARRAY['medico']),
    (v_midazolam_inf_node,'Escalar midazolam empíricamente a 0.3 mg/kg/h y esperar EEG para guiar siguientes ajustes',v_eeg_continuo_node,'Opción conservadora aceptable: titular midazolam puede controlar, EEG guiará ajuste fino. Riesgo: retraso 15 min en control eléctrico si dosis insuficiente. Válido si hemodinamia muy inestable y se evita añadir fármacos.',2,false,ARRAY['medico']),
    (v_midazolam_inf_node,'Mantener midazolam 0.1 mg/kg/h y esperar EEG antes de cualquier cambio',v_riesgo_neuronal_node,'Error: dosis inicial conservadora con convulsión clínica persistente a T+42 min. Esperar EEG pasivamente prolonga status eléctrico (lesión neuronal continua). Debe escalarse empíricamente o añadir segundo agente.',−2,false,ARRAY['medico']),
    (v_midazolam_inf_node,'Iniciar propofol 2-4 mg/kg/h como alternativa a midazolam (cambiar)',v_propofol_error_node,'Razonamiento cuestionable: propofol efectivo pero con PAM 62 es arriesgado (hipotensión frecuente). Además, cambiar de midazolam a propofol pierde tiempo; mejor añadir ketamina manteniendo midazolam.',−2,false,ARRAY['medico']),
    (v_midazolam_inf_node,'Enfermería: monitorizar PAM continua (línea arterial si posible), glucemia horaria, balance estricto, temperatura, preparar vasopresores',v_refractario_ketamina_node,'Anticipación sobresaliente: sedación profunda requiere monitoreo invasivo, hiponatremia sugiere SIADH (restricción hídrica), hipotermia puede ocurrir, vasopresores probables con anestésicos.',3,false,ARRAY['enfermeria']);

  -----------------------------------------------------------------
  -- Opciones Nodo EEG continuo
  -----------------------------------------------------------------
  INSERT INTO public.micro_case_options (node_id,label,next_node_id,feedback_md,score_delta,is_critical,target_roles) VALUES
    (v_eeg_continuo_node,'Mantener sedación titulada a burst-suppression, corregir Na gradualmente (objetivo 135 en 24h), glucosa >80, plan destete tras 24h sin crisis eléctricas',v_control_final_node,'Manejo excelente: objetivo EEG adecuado (burst-suppression evita exceso sedación vs supresión total), corrección Na lenta previene mielinólisis, glucemia segura, destete protocolizado. Equilibra control neurológico con seguridad sistémica.',4,true,ARRAY['medico']),
    (v_eeg_continuo_node,'Escalar a supresión eléctrica total (flat EEG) para máxima neuroprotección',v_complicacion_hipotension_node,'Error de concepto: supresión total requiere dosis muy altas (hipotensión, despertar prolongado) sin demostrar mejor pronóstico vs burst-suppression. Riesgo > beneficio.',−3,false,ARRAY['medico']),
    (v_eeg_continuo_node,'Omitir control de sodio (132 es "casi normal"), priorizar solo sedación',v_hiponatremia_node,'Negligencia: hiponatremia leve pero en contexto de status puede empeorar (SIADH por secreción ADH). Debe monitorizarse y corregirse gradualmente (riesgo perpetuación crisis).',−3,false,ARRAY['medico']),
    (v_eeg_continuo_node,'Iniciar destete agresivo de midazolam a las 12h si no hay crisis clínicas visibles',v_riesgo_neuronal_node,'Error: crisis eléctricas pueden persistir sin manifestaciones motoras (relajantes, sedación profunda). Destete debe guiarse por EEG, no solo clínica. Mínimo 24h.',−2,false,ARRAY['medico']),
    (v_eeg_continuo_node,'Enfermería: balance hídrico estricto (restricción 50-70% mantenimiento si SIADH), Na cada 6h, ajustar infusiones según protocolo sedación',v_control_final_node,'Anticipación sobresaliente: SIADH probable (hiponatremia dilucional), restricción hídrica es manejo inicial, monitoreo frecuente Na crítico, protocolos de sedación previenen errores.',3,false,ARRAY['enfermeria']),
    (v_eeg_continuo_node,'Farmacia: preparar SS hipertónica 3% (0.5-1 mEq/L/h de incremento Na) si Na <130 o sintomático',v_control_final_node,'Preparación adecuada: corrección aguda solo si Na <125 o sintomático (no es el caso aún). Tener listo permite respuesta rápida si empeora. Incremento gradual evita mielinólisis.',2,false,ARRAY['farmacia']);

END $$;

