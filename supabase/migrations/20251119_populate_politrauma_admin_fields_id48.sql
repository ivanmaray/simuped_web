-- Migration: Poblar campos administrativos para escenario id=48 (Politrauma)
-- Fecha: 2025-11-19
-- Idempotente: usa el id explícito 48 para entornos donde el título difiera

DO $$
DECLARE
  v_scenario_id INT := 48; -- id explícito proporcionado por el usuario
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.scenarios WHERE id = v_scenario_id) THEN
    RAISE NOTICE 'Escenario id=% no existe; saliendo.', v_scenario_id;
    RETURN;
  END IF;

  IF to_regclass('public.scenario_presencial_meta') IS NOT NULL THEN
    INSERT INTO public.scenario_presencial_meta (
      scenario_id,
      student_brief,
      instructor_brief,
      room_layout,
      checklist_template,
      roles_required,
      triggers
    )
    VALUES (
      v_scenario_id,
      $student$Paciente pediátrico de 8 años con politrauma tras mecanismo de alta energía. Presenta contusión craneal, hematoma subcostal izquierdo, disminución del nivel de conciencia (GCS 11), posible anisocoria, taquipnea y taquicardia. Priorizar ABCDE: proteger vía aérea si empeora el nivel de conciencia, asegurar acceso vascular y estabilizar hemodinámica; activar protocolo de protección infantil ante lesiones en distintas etapas y documentar de forma objetiva.$student$,
      $instructor$Puntos clave para instructores:
- Evaluación primaria enfocada en protección de vía aérea y soporte ventilatorio: valorar intubación si GCS ≤ 8 o compromiso ventilatorio progresivo.
- Mantener presión de perfusión cerebral: evitar hipotensión (bolo de cristaloides 20 ml/kg en pediatría) y preparar vasopresores si no responde.
- Manejo de HTIC: elevar cabecera, mantener normotermia, considerar osmoterapia (suero hipertónico o manitol) según protocolo y monitorizar sodio y diuresis.
- Documentación forense y protección infantil: fotografiar lesiones con timestamp, registrar hallazgos objetivos y notificar a trabajo social/protección infantil.
- Comunicación y coordinación: preparar traslado a UCI/neurocirugía si indica, coordinar sangre y equipo quirúrgico cuando exista lesión operable.$instructor$,
      $room$
      {
        "patient": { "age_years": 8, "age_months": 96, "sex": "M", "weight_kg": 26, "presenting_complaint": "Politrauma tras mecanismo contuso; sospecha de maltrato" },
        "vitals": { "gcs": 11, "fc": 160, "fr": 30, "sat": 94, "temp": 36.2, "ta": { "systolic": 95, "diastolic": 50 } },
        "physical_exam": ["Contusión craneal","Hematoma subcostal izquierdo","Taquipnea ligera: FR 30 rpm","Pálido, relleno capilar 2s","Obnubilado; Glasgow 11","Dudosa anisocoria; pupilas reactivas"],
        "quick_labs": [{"name":"Glucemia capilar","value":"142 mg/dL"},{"name":"Lactato","value":"3.8 mmol/L"}],
        "imaging_monitoring": [{"name":"Radiografía de tórax","note":"No indicada de urgencia"},{"name":"ECG continuo","note":"Monitorizado"}],
        "tags": ["politrauma","pediatria","TCE","maltrato"],
        "competencies": [{"name":"Manejo inicial del politrauma pediátrico","level":"avanzado"},{"name":"Protección infantil y documentación forense","level":"intermedio"},{"name":"Soporte hemodinámico en shock pediátrico","level":"avanzado"}],
        "objectives": { "general": "Reconocer y manejar de forma inicial HTIC en politrauma pediátrico: protección de vía aérea, mantenimiento de perfusión cerebral, medidas neuroprotectoras y activación de protección infantil.", "roles": { "medico": ["Priorizar protección de vía aérea y valorar indicación de intubación/RSI","Mantener presión de perfusión cerebral y tratar la hipotensión","Decidir uso de osmoterapia y coordinar neurocirugía si procede"], "enfermeria": ["Realizar monitorización neurológica y signos vitales continuos","Asegurar accesos IV/IO y preparar material para reanimación","Documentar lesiones objetivamente y colaborar con notificación forense"], "farmacia": ["Preparar dosis pediátricas de emergencia (vasopresores, benzodiacepinas, anticonvulsivantes)","Validar y asegurar disponibilidad de soluciones hipertónicas y sangre","Garantizar trazabilidad en la entrega de medicamentos en contexto forense"] } }
      }
      $room$::jsonb,
      $checklist$
      [ { "group": "Acciones críticas", "items": [ { "label": "Proteger vía aérea si GCS ≤ 8 o signos de compromiso ventilatorio", "correct": true }, { "label": "Administrar bolo cristaloides 20 ml/kg ante hipotensión pediátrica", "correct": true }, { "label": "Activar protección infantil y documentar lesiones (fotografías timestamped)", "correct": true }, { "label": "Solicitar TC craneal urgente si hay sospecha de lesión intracraneal", "correct": true }, { "label": "Iniciar osmoterapia según protocolo si hay HTIC evidente", "correct": true } ] } ]
      $checklist$::jsonb,
      $roles_json$
      [ { "role": "medico", "min": 1, "max": 2 }, { "role": "enfermeria", "min": 1, "max": 2 }, { "role": "farmacia", "min": 0, "max": 1 }, { "role": "anestesia", "min": 0, "max": 1 } ]
      $roles_json$::jsonb,
      $triggers_json$
      [ { "event": "vital_threshold", "variable": "ta_systolic", "condition": "<age_adjusted_hypotension", "action": "flag_hemodynamic_instability" }, { "event": "neurologic_deterioration", "variable": "gcs", "condition": "<=8", "action": "flag_airway_and_neurosurgery" } ]
      $triggers_json$::jsonb
    )
    ON CONFLICT (scenario_id) DO UPDATE
    SET
      student_brief = EXCLUDED.student_brief,
      instructor_brief = EXCLUDED.instructor_brief,
      room_layout = EXCLUDED.room_layout,
      checklist_template = EXCLUDED.checklist_template,
      roles_required = EXCLUDED.roles_required,
      triggers = EXCLUDED.triggers;
  ELSE
    RAISE NOTICE 'Tabla public.scenario_presencial_meta no encontrada; omitiendo poblado.';
  END IF;
END $$;

-- FIN (idempotente para scenario id=48)
