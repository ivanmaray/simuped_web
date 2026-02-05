-- Verificar distribución de roles en escenario 101
SELECT 
    CASE 
        WHEN q.roles IS NULL THEN 'Comunes (todos)'
        WHEN q.roles = '["medico"]'::jsonb THEN 'Solo médico'
        WHEN q.roles = '["enfermeria"]'::jsonb THEN 'Solo enfermería'
        WHEN q.roles = '["farmacia"]'::jsonb THEN 'Solo farmacia'
        WHEN q.roles = '["anestesia"]'::jsonb THEN 'Solo anestesia'
        WHEN q.roles = '["medico", "enfermeria"]'::jsonb THEN 'Médico + Enfermería'
        WHEN q.roles = '["medico", "farmacia"]'::jsonb THEN 'Médico + Farmacia'
        WHEN q.roles = '["enfermeria", "farmacia"]'::jsonb THEN 'Enfermería + Farmacia'
        WHEN q.roles = '["medico", "enfermeria", "farmacia"]'::jsonb THEN 'Médico + Enfermería + Farmacia'
        WHEN q.roles = '["medico", "enfermeria", "anestesia"]'::jsonb THEN 'Médico + Enfermería + Anestesia'
        WHEN q.roles = '["anestesia", "farmacia"]'::jsonb THEN 'Anestesia + Farmacia'
        ELSE 'Otro'
    END as tipo_rol,
    COUNT(*) as cantidad
FROM questions q
JOIN steps s ON s.id = q.step_id
WHERE s.scenario_id = 101
GROUP BY q.roles
ORDER BY cantidad DESC;
