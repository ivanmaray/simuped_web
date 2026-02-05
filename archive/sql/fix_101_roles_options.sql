-- Arreglar roles y options para escenario 101

-- 1. Hacer todas las preguntas visibles para todos (roles = null)
UPDATE questions SET roles = null WHERE step_id IN (108,109,110,111,112);

-- 2. Convertir options de objetos a strings simples y ajustar correct_option
-- Función para extraer texto de options y mapear correct_option
UPDATE questions SET 
    options = jsonb_build_array(
        options->0->>'text',
        options->1->>'text',
        options->2->>'text',
        options->3->>'text'
    ),
    correct_option = CASE 
        WHEN options->0->>'value' = correct_option THEN '0'
        WHEN options->1->>'value' = correct_option THEN '1'
        WHEN options->2->>'value' = correct_option THEN '2'
        WHEN options->3->>'value' = correct_option THEN '3'
        ELSE correct_option
    END
WHERE step_id IN (108,109,110,111,112);
