-- Habilitar RLS
ALTER TABLE public.scenario_change_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir insertar logs a usuarios autenticados (para loggear cambios)
CREATE POLICY "Allow authenticated users to insert change logs" ON public.scenario_change_logs
FOR INSERT TO authenticated
WITH CHECK (true);

-- Política para permitir leer logs a usuarios autenticados (pueden ver sus propios cambios)
CREATE POLICY "Allow authenticated users to view change logs" ON public.scenario_change_logs
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
));

-- Si hay otros roles o necesidades específicas, ajustar las políticas según corresponda
