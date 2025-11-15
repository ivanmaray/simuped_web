-- Migration: escenario presencial - metadatos y equipamiento
-- Nota: Ajustar RLS y policies según tu modelo de seguridad antes de producción.

-- Tabla de metadatos específicos para modo presencial (1:1 con scenarios)
CREATE TABLE IF NOT EXISTS public.scenario_presencial_meta (
  scenario_id int PRIMARY KEY REFERENCES public.scenarios(id) ON DELETE CASCADE,
  dual_mode boolean DEFAULT false,              -- Vistas separadas alumno/instructor
  instructor_brief text,                       -- Brief específico para instructor
  student_brief text,                          -- Brief específico para alumnos
  room_layout jsonb,                           -- Representación de estaciones / layout
  roles_required jsonb,                        -- [{role: 'medico', min:1, max:2, notes:'...'}]
  checklist_template jsonb,                    -- [{group: 'ABC', items:[{label:'...', type:'bool'|'score'|'text', weight:1}]}]
  triggers jsonb,                              -- Reglas de eventos [{event:'variable_change', variable:'sat', condition:'<90', action:'show_alert'}]
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Tabla de equipamiento físico asociado al escenario
CREATE TABLE IF NOT EXISTS public.scenario_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id int NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  name text NOT NULL,                 -- Nombre del recurso (p.ej. "Monitor multiparámetros")
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  location text,                      -- Estación / sala / carrito
  category text,                      -- Clasificación (monitorizacion, via aérea, farmacologia, etc.)
  required boolean DEFAULT true,      -- Indica si es imprescindible
  notes text,                         -- Notas operativas
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_equipment_scenario ON public.scenario_equipment(scenario_id);

-- Trigger para updated_at (equipamiento)
CREATE OR REPLACE FUNCTION public.touch_scenario_equipment_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_scenario_equipment ON public.scenario_equipment;
CREATE TRIGGER trg_touch_scenario_equipment
BEFORE UPDATE ON public.scenario_equipment
FOR EACH ROW EXECUTE FUNCTION public.touch_scenario_equipment_updated_at();

-- Trigger para updated_at (meta presencial)
CREATE OR REPLACE FUNCTION public.touch_scenario_presencial_meta_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_scenario_presencial_meta ON public.scenario_presencial_meta;
CREATE TRIGGER trg_touch_scenario_presencial_meta
BEFORE UPDATE ON public.scenario_presencial_meta
FOR EACH ROW EXECUTE FUNCTION public.touch_scenario_presencial_meta_updated_at();

-- (Opcional) Policies RLS: habilitarlas sólo si RLS está activo
-- ALTER TABLE public.scenario_presencial_meta ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.scenario_equipment ENABLE ROW LEVEL SECURITY;
-- Añadir luego policies adaptadas a roles admin/instructor.
