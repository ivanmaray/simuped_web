-- Migration: Upsert trauma-neuro-guard roles and roleScoring
-- Fecha: 2025-11-15

BEGIN;

-- 1) Upsert the micro_case row (create or update by slug)
WITH upsert_case AS (
  INSERT INTO public.micro_cases
    (slug, title, summary, estimated_minutes, difficulty, recommended_roles, is_published, created_at, updated_at)
  VALUES
    ('trauma-neuro-guard',
     'Impacto craneal con signos neurologicos',
     'Paciente somnoliento con anisocoria progresiva. Prioriza la proteccion neurologica, el control hemodinamico y la seleccion de imagenes clave.',
     20,
     'intermedio',
     ARRAY['medico','enfermeria','farmacia']::text[],
     true,
     now(), now())
  ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        estimated_minutes = EXCLUDED.estimated_minutes,
        difficulty = EXCLUDED.difficulty,
        recommended_roles = EXCLUDED.recommended_roles,
        is_published = EXCLUDED.is_published,
        updated_at = now()
  RETURNING id
),

-- 2) Remove any previous roles-info node created by this migration (idempotency)
deleted AS (
  DELETE FROM public.micro_case_nodes
  WHERE case_id = (SELECT id FROM upsert_case)
    AND (metadata->>'roles_source') = 'interactiveTrainingData_v1'
),

-- 3) Insert new info node that stores the roles content and scoring in metadata
inserted_node AS (
  INSERT INTO public.micro_case_nodes
    (case_id, kind, body_md, metadata, order_index, is_terminal)
  SELECT
    (SELECT id FROM upsert_case),
    'info',
    'Roles y orientaciones para el equipo: farmacia y enfermería. Incluye responsabilidades, lista de fármacos clave, checks y criterios de scoring.',
    '{"roles_source":"interactiveTrainingData_v1", "roles": {
        "pharmacy": {
          "responsibilities": [
            "Verificar alergias y antecedentes farmacologicos antes de dispensar",
            "Calcular dosis peso-dependientes y preparar concentraciones seguras",
            "Coordinar disponibilidad de agentes osmoticos y sangre irradiada si es necesario",
            "Asesorar sobre interacciones farmacologicas y ajuste renal/hepatico"
          ],
          "medicationList": [
            {
              "id": "manitol",
              "label": "Manitol 20%",
              "concentration": "20% w/v (200 g/L)",
              "concentration_g_per_100ml": 20,
              "dosing_g_per_kg": "0.5-1 g/kg IV bolo",
              "volume_calculation_note": "1 g = 5 mL of 20% solution. Volume_ml = dose_g * 5",
              "example_20kg": "Dose 0.5-1 g/kg -> 10-20 g = 50-100 mL of 20% solution",
              "administration": "IV bolus over 10-20 minutes (use infusion pump when available)",
              "monitoring": [
                "Controlar osmolaridad serica: mantener <320 mOsm/kg (detener si >320)",
                "Control Na serico cada 2-6 horas durante tratamiento y ajustar segun cambio plasmatico",
                "Vigilar diuresis: objetivo >0.5 mL/kg/h y monitorizar creatinina",
                "Vigilar signos de sobrecarga volemica / edema pulmonar"
              ],
              "contraindications": [
                "Anuria o insuficiencia renal grave",
                "Hipovolemia grave no corregida",
                "Edema pulmonar / insuficiencia cardiaca descompensada"
              ],
              "preparation": [
                "Confirmar peso y calcular dosis en gramos y volumen en mL (usar formula)",
                "Usar jeringa o bolsa con etiquetado claro (nombre, dosis g, volumen mL, hora)",
                "Administrar por bomba si disponible; si bolo, controlar tiempo de infusión (10-20 min)"
              ],
              "notes": "Revisar indicación con neurocirugía; evitar repetidos bolos si oliguria o creatinina en ascenso"
            },
            {
              "id": "hipertonica",
              "label": "Suero hipertonico 3%",
              "concentration": "3% NaCl",
              "dosing": "2 mL/kg IV en 10-15 min (ej. 20 kg -> 40 mL)",
              "administration_note": "Administrar por jeringa/bolo controlado; usar bomba si se requiere infusion",
              "monitoring": [
                "Control Na serico cada 1-4 horas durante correccion aguda",
                "Limitar incremento de Na a <10-12 mEq/L en 24 horas para evitar desmielinizacion"
              ],
              "warnings": [
                "Monitorizar presion arterial y signos de sobrecarga volume",
                "Evitar en hiponatremia cronica sin control especializado"
              ]
            },
            {"id":"rocuronio","label":"Rocuronio","dosing":"1 mg/kg IV (RSI)","notes":"Preparar reversores y bomba infusora"},
            {"id":"fentanilo","label":"Fentanilo","dosing":"1 mcg/kg IV bolo (analgesia)","notes":"Registrar hora y vigilar depresion respiratoria"},
            {"id":"noradrenalina","label":"Noradrenalina","dosing":"0.05-0.2 mcg/kg/min","notes":"Configurar bomba con concentracion estandar y guiar titulacion"}
          ],
          "checks": [
            "Confirmar peso reciente y unidad de medida (kg)",
            "Verificar alergias documentadas en la historia y en el formulario de ingreso",
            "Revisar interacciones (ej. anticoagulantes, antihipertensivos) antes de administrar bolos/vasopresores",
            "Asegurar que el material de administración (bombas, cateteres) esté disponible y compatible"
          ],
          "preparation": [
            "Preparar bolsas y jeringas con etiquetado claro (nombre, dosis mg/ml, hora)",
            "Establecer concentraciones estandar para infusiones vasoactivas segun protocolo pediatrico",
            "Priorizar entrega de medicamentos criticos (RSI, osmoterapia) con comunicacion directa al equipo"
          ]
        },
        "nursing": {
          "responsibilities": [
            "Mantener alineacion cervical y vigilancia continua de via aerea",
            "Monitorizar signos neurologicos (pupilas, GCS) cada 5-15 minutos según estabilizacion",
            "Ejecutar protocolos de intubacion y asistente en RSI",
            "Administrar medicacion segun prescripcion y validar dosis con farmacia"
          ],
          "monitoring": [
            "Registrar PA, PAM, FC, FR y SpO2 cada 5 minutos en fase critica",
            "Registrar volumen diuresis por hora si hay sospecha de TBI y uso de osmoterapia",
            "Monitorizar osmolaridad serica si se administra manitol/hipertonico",
            "Vigilar sedacion y ajustar perfusion segun ordenes medicas y objetivo de sedacion"
          ],
          "tasks": [
            "Preparar y asistir en traslado seguro a TAC con equipo y oxigeno",
            "Colocar y asegurar acceso venoso central si es necesario para vasopresores",
            "Asegurar monitorizacion continua y documentar cambios neurologicos inmediatamente",
            "Comunicar de forma estructurada (SBAR) a neurocirugia y anestesia"
          ],
          "documentation": [
            "Registrar hora de investigacion clave (ingreso a TAC, inicio de manitol, inicio de vasopresor)",
            "Detalle de medicacion (dosis, via, lote si aplica) y respuesta clinica",
            "Nota de transferencia detallada si se traslada al quirófano o UCI"
          ]
        }
      },
      "roleScoring": {
        "pharmacy": {
          "weightCalculation": 10,
          "allergyCheck": 10,
          "dosingAccuracy": 40,
          "preparationTimeliness": 20,
          "communication": 20
        },
        "nursing": {
          "airwayManagement": 25,
          "neuroMonitoring": 25,
          "vitalsDocumentation": 15,
          "sedationTitration": 20,
          "escalation": 15
        }
      }
    }'::jsonb,
    0,
    false
  RETURNING id
)

-- 4) Set the case start_node_id to the inserted info node
UPDATE public.micro_cases
SET start_node_id = (SELECT id FROM inserted_node)
WHERE id = (SELECT id FROM upsert_case);

COMMIT;
