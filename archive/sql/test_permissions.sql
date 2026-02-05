-- Probar permisos de INSERT en case_resources
-- Esto debería funcionar si tienes permisos
INSERT INTO public.case_resources (
  scenario_id, 
  title, 
  url, 
  source, 
  type, 
  year, 
  free_access, 
  weight
) VALUES (
  1, 
  'Test Resource', 
  'https://example.com', 
  'Test Source', 
  'Protocolo', 
  2024, 
  true, 
  50
);

-- Si funciona, borra el registro de prueba
DELETE FROM public.case_resources WHERE title = 'Test Resource';
