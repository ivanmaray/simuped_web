-- Migration: Microcasos clínicos interactivos
-- Fecha: 2025-11-01

-- 1) Tabla principal de microcasos
CREATE TABLE IF NOT EXISTS public.micro_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  title text NOT NULL,
  summary text,
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 1 AND 60),
  difficulty text CHECK (difficulty IN ('facil', 'intermedio', 'avanzado')),
  recommended_roles text[] DEFAULT '{}',
  recommended_units text[] DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  start_node_id uuid
);

COMMENT ON TABLE public.micro_cases IS 'Casos clínicos cortos con decisiones ramificadas.';
COMMENT ON COLUMN public.micro_cases.slug IS 'Identificador legible para URLs.';
COMMENT ON COLUMN public.micro_cases.estimated_minutes IS 'Duración estimada del microcaso.';
COMMENT ON COLUMN public.micro_cases.difficulty IS 'Nivel de dificultad percibida.';
COMMENT ON COLUMN public.micro_cases.start_node_id IS 'Nodo inicial del microcaso.';

-- 2) Nodos del árbol de decisiones
CREATE TABLE IF NOT EXISTS public.micro_case_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.micro_cases(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'decision' CHECK (kind IN ('decision', 'info', 'outcome')),
  body_md text NOT NULL,
  media_url text,
  order_index integer DEFAULT 0,
  is_terminal boolean NOT NULL DEFAULT false,
  auto_advance_to uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.micro_case_nodes IS 'Pasos individuales dentro del microcaso.';
COMMENT ON COLUMN public.micro_case_nodes.kind IS 'Tipo de paso: decision, info o outcome.';
COMMENT ON COLUMN public.micro_case_nodes.body_md IS 'Contenido en markdown para mostrar en pantalla.';
COMMENT ON COLUMN public.micro_case_nodes.auto_advance_to IS 'Nodo al que se salta automáticamente (informativo).' ;

-- 3) Opciones por nodo
CREATE TABLE IF NOT EXISTS public.micro_case_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.micro_case_nodes(id) ON DELETE CASCADE,
  label text NOT NULL,
  next_node_id uuid,
  feedback_md text,
  score_delta integer DEFAULT 0,
  is_critical boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.micro_case_options IS 'Opciones de decisión disponibles para cada nodo.';
COMMENT ON COLUMN public.micro_case_options.score_delta IS 'Puntos ganados o perdidos al seleccionar la opción.';

-- 4) Intentos de usuarios
CREATE TABLE IF NOT EXISTS public.micro_case_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.micro_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  score_total integer DEFAULT 0,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  UNIQUE(case_id, user_id, started_at)
);

COMMENT ON TABLE public.micro_case_attempts IS 'Historial de intentos de usuarios sobre microcasos.';

-- 5) Pasos dentro de cada intento
CREATE TABLE IF NOT EXISTS public.micro_case_attempt_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.micro_case_attempts(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.micro_case_nodes(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.micro_case_options(id) ON DELETE SET NULL,
  outcome_label text,
  score_delta integer DEFAULT 0,
  elapsed_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.micro_case_attempt_steps IS 'Detalle de decisiones tomadas en cada intento.';

-- 6) Índices para acelerar consultas
CREATE INDEX IF NOT EXISTS micro_cases_published_idx ON public.micro_cases (is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS micro_case_nodes_case_idx ON public.micro_case_nodes (case_id);
CREATE INDEX IF NOT EXISTS micro_case_options_node_idx ON public.micro_case_options (node_id);
CREATE INDEX IF NOT EXISTS micro_case_attempts_user_idx ON public.micro_case_attempts (user_id, case_id);
CREATE INDEX IF NOT EXISTS micro_case_attempt_steps_attempt_idx ON public.micro_case_attempt_steps (attempt_id);

-- 7) Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_micro_case_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_micro_cases_updated_at
  BEFORE UPDATE ON public.micro_cases
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_micro_case_updated_at();

-- 8) Row Level Security
ALTER TABLE public.micro_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_case_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_case_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_case_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_case_attempt_steps ENABLE ROW LEVEL SECURITY;

-- Reglas básicas para lectura de microcasos publicados
CREATE POLICY micro_cases_select_published
  ON public.micro_cases
  FOR SELECT
  USING (is_published = true);

-- Autores e instructores pueden gestionar sus propios casos
CREATE POLICY micro_cases_manage_own
  ON public.micro_cases
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Nodos y opciones heredan permisos del caso
CREATE POLICY micro_case_nodes_select
  ON public.micro_case_nodes
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.micro_cases c
    WHERE c.id = micro_case_nodes.case_id
      AND (c.is_published = true OR c.created_by = auth.uid())
  ));

CREATE POLICY micro_case_options_select
  ON public.micro_case_options
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.micro_case_nodes n
    JOIN public.micro_cases c ON c.id = n.case_id
    WHERE n.id = micro_case_options.node_id
      AND (c.is_published = true OR c.created_by = auth.uid())
  ));

-- Los usuarios autenticados pueden crear sus intentos
CREATE POLICY micro_case_attempts_user_insert
  ON public.micro_case_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY micro_case_attempts_user_select
  ON public.micro_case_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY micro_case_attempt_steps_user_manage
  ON public.micro_case_attempt_steps
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.micro_case_attempts a
    WHERE a.id = micro_case_attempt_steps.attempt_id
      AND a.user_id = auth.uid()
  ));

-- Permisos para roles de servicio
GRANT ALL ON public.micro_cases TO service_role;
GRANT ALL ON public.micro_case_nodes TO service_role;
GRANT ALL ON public.micro_case_options TO service_role;
GRANT ALL ON public.micro_case_attempts TO service_role;
GRANT ALL ON public.micro_case_attempt_steps TO service_role;

GRANT SELECT ON public.micro_cases TO authenticated;
GRANT SELECT ON public.micro_case_nodes TO authenticated;
GRANT SELECT ON public.micro_case_options TO authenticated;
GRANT SELECT, INSERT ON public.micro_case_attempts TO authenticated;
GRANT SELECT, INSERT ON public.micro_case_attempt_steps TO authenticated;

-- 9) Vista rápida para listados (opcional)
CREATE OR REPLACE VIEW public.micro_cases_overview AS
SELECT
  c.id,
  c.slug,
  c.title,
  c.summary,
  c.estimated_minutes,
  c.difficulty,
  c.recommended_roles,
  c.recommended_units,
  c.is_published,
  c.updated_at,
  COALESCE(node_counts.total_nodes, 0) AS node_count
FROM public.micro_cases c
LEFT JOIN (
  SELECT case_id, COUNT(*) AS total_nodes
  FROM public.micro_case_nodes
  GROUP BY case_id
) AS node_counts ON node_counts.case_id = c.id;

COMMENT ON VIEW public.micro_cases_overview IS 'Resumen de microcasos con conteo de nodos.';
