-- Asignar roles correctos basados en el JSON original

-- Reset all to null first
UPDATE questions SET roles = null WHERE step_id IN (108,109,110,111,112);

-- Assign specific roles based on JSON
-- Médico y enfermería
UPDATE questions SET roles = '["medico", "enfermeria"]'::jsonb WHERE id IN (39,40,41,158,159,160,161);

-- Solo médico
UPDATE questions SET roles = '["medico"]'::jsonb WHERE id IN (42,43,305,306,307,308,309,310,311,312,313,314);

-- Solo enfermería  
UPDATE questions SET roles = '["enfermeria"]'::jsonb WHERE id IN (53,54,108,109,110,111,112,113,114,115);

-- Solo farmacia
UPDATE questions SET roles = '["farmacia"]'::jsonb WHERE id IN (56,82,83,84,85,86,87,88,89,91);

-- Médico, enfermería y anestesia
UPDATE questions SET roles = '["medico", "enfermeria", "anestesia"]'::jsonb WHERE id IN (96,97,98,99,100,101,102,103,104,105,106,107,111,127);

-- Médico y farmacia
UPDATE questions SET roles = '["medico", "farmacia"]'::jsonb WHERE id IN (44,57,90);

-- Enfermería y farmacia
UPDATE questions SET roles = '["enfermeria", "farmacia"]'::jsonb WHERE id IN (47,58,59);

-- Médico, enfermería y farmacia
UPDATE questions SET roles = '["medico", "enfermeria", "farmacia"]'::jsonb WHERE id IN (48,49);

-- Solo anestesia
UPDATE questions SET roles = '["anestesia"]'::jsonb WHERE id IN (116,117,118,119,123,132,133,134,135,138,139);

-- Anestesia y farmacia
UPDATE questions SET roles = '["anestesia", "farmacia"]'::jsonb WHERE id IN (120,136);

-- Keep null for common questions (already set above)
