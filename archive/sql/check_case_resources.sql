-- Verificar si existe la tabla case_resources y sus permisos
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename = 'case_resources';

-- Ver permisos en la tabla
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'case_resources';

-- Ver estructura de la tabla si existe
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'case_resources' 
ORDER BY ordinal_position;
