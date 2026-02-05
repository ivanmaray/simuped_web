-- Actualizar roles en steps del escenario 101 para que sean visibles para TODOS los roles (null = visible para todos)

UPDATE steps 
SET roles = null
WHERE scenario_id = 101 AND roles IS NULL;
