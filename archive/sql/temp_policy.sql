-- Crear política temporal para testing (menos restrictiva)
-- Esta política permite INSERT a usuarios autenticados sin requerir is_admin
DROP POLICY IF EXISTS case_resources_temp_write ON public.case_resources;
CREATE POLICY case_resources_temp_write ON public.case_resources
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Para verificar que funciona
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'case_resources' AND policyname = 'case_resources_temp_write';
