-- Forzar visibilidad absoluta para escenario 101 (último recurso)
UPDATE questions SET roles = '[]'::jsonb WHERE step_id IN (108,109,110,111,112) AND roles IS NOT NULL;
