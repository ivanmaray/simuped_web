-- Verificar los step_ids reales para scenario 101
SELECT id, step_order, description, scenario_id FROM steps WHERE scenario_id = 101 ORDER BY step_order;
