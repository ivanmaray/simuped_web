-- Migration: RLS policies para tablas de simulación presencial
-- Fecha: 2025-11-15
-- Objetivo: Habilitar Row Level Security y políticas básicas para acceso
-- Modelo de roles: profiles.is_admin (boolean) determina privilegios de escritura.
-- Ajusta / amplía estas políticas según la lógica de asignación de instructores.

-- Habilitar RLS
ALTER TABLE public.scenario_presencial_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_equipment ENABLE ROW LEVEL SECURITY;

-- Políticas SELECT (cualquier usuario autenticado puede leer)
DROP POLICY IF EXISTS presencial_meta_select_auth ON public.scenario_presencial_meta;
CREATE POLICY presencial_meta_select_auth ON public.scenario_presencial_meta
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS presencial_equipment_select_auth ON public.scenario_equipment;
CREATE POLICY presencial_equipment_select_auth ON public.scenario_equipment
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Políticas de modificación (solo admins)
DROP POLICY IF EXISTS presencial_meta_admin_mod ON public.scenario_presencial_meta;
CREATE POLICY presencial_meta_admin_mod ON public.scenario_presencial_meta
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin
    )
  );

DROP POLICY IF EXISTS presencial_equipment_admin_mod ON public.scenario_equipment;
CREATE POLICY presencial_equipment_admin_mod ON public.scenario_equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin
    )
  );

-- Nota: El rol 'service_role' ignora RLS, mantén llaves seguras.
-- Para ampliar a instructores específicos crea tabla de relación y ajusta USING.
