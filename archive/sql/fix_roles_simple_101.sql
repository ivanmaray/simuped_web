-- Asignar roles correctos según el JSON original

-- Primero resetear todos a null
UPDATE questions SET roles = null WHERE step_id IN (108,109,110,111,112);

-- Luego asignar roles específicos según el JSON
UPDATE questions SET roles = '["medico", "enfermeria"]'::jsonb WHERE id IN (39,40,41,55,158,159,160,161);
UPDATE questions SET roles = '["medico"]'::jsonb WHERE id IN (42,43,61,62,63,64,65,66,67,68,69,70,71,96,97,98,99,100,101,102,103,104,105,305,306,307,308,309,310,311,312,313,314);
UPDATE questions SET roles = '["enfermeria"]'::jsonb WHERE id IN (53,54,72,73,74,75,76,77,78,79,80,81,108,109,110,111,112,113,114,115);
UPDATE questions SET roles = '["farmacia"]'::jsonb WHERE id IN (56,82,83,84,85,86,87,88,89,91);
UPDATE questions SET roles = '["medico", "enfermeria", "anestesia"]'::jsonb WHERE id IN (96,97,98,99,100,101,102,103,104,105,106,107,111,127);
UPDATE questions SET roles = '["medico", "farmacia"]'::jsonb WHERE id IN (44,57,90);
UPDATE questions SET roles = '["enfermeria", "farmacia"]'::jsonb WHERE id IN (47,58,59);
UPDATE questions SET roles = '["medico", "enfermeria", "farmacia"]'::jsonb WHERE id IN (48,49);
UPDATE questions SET roles = '["anestesia"]'::jsonb WHERE id IN (116,117,118,119,120,123,132,133,134,135,136,138,139);
UPDATE questions SET roles = '["anestesia", "farmacia"]'::jsonb WHERE id IN (120,136);
UPDATE questions SET roles = null WHERE id IN (38,45,46,50,51,52,60,116,117,118,119,121,122,123,124,125,126,128,129,130,131,132,133,134,135,137,138,139);
