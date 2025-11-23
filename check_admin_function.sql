-- Verificar si existe la función is_admin
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'is_admin';

-- Ver el código de la función is_admin si existe
SELECT 
  pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'is_admin';

-- Verificar si el usuario actual es admin
SELECT 
  auth.uid() as current_user_id,
  is_admin(auth.uid()) as is_user_admin;
