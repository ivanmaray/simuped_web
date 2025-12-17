-- Hacer que todas las preguntas del escenario 101 sean visibles para todos (roles = null)
UPDATE questions SET roles = null WHERE step_id IN (108,109,110,111,112);
