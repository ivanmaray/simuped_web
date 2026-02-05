-- Si el usuario no tiene rol asignado, asignarle 'medico' temporalmente para testing
-- UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{rol}', '"medico"') WHERE id = 'USER_ID_AQUI';

-- O alternativamente, hacer que todas las preguntas sean visibles sin importar el rol del usuario
-- Esto ya se hizo con roles = null
