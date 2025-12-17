-- Asignar roles correctos según el JSON original (no todos null)

-- Preguntas comunes (roles = null)
UPDATE questions SET roles = null WHERE id IN (39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,90,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,158,159,160,161);

-- Preguntas específicas para médico
UPDATE questions SET roles = '["medico"]'::jsonb WHERE id IN (305,306,307,308,309,310,311,312,313,314);

-- Preguntas específicas para médico y enfermería
UPDATE questions SET roles = '["medico", "enfermeria"]'::jsonb WHERE id IN (158,159,160,161);

-- Preguntas específicas para farmacia
UPDATE questions SET roles = '["farmacia"]'::jsonb WHERE id IN (82,83,84,85,86,87,88,89,91);

-- Preguntas específicas para enfermería
UPDATE questions SET roles = '["enfermeria"]'::jsonb WHERE id IN (73,74,75,76,77,78,79,80,81,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139);

-- Preguntas específicas para anestesia
UPDATE questions SET roles = '["anestesia"]'::jsonb WHERE id IN (116,117,118,119,120,123,132,133,134,135,136,138,139);

-- Preguntas específicas para médico, enfermería y anestesia
UPDATE questions SET roles = '["medico", "enfermeria", "anestesia"]'::jsonb WHERE id IN (96,97,98,99,100,101,102,103,104,105,106,107,111,127);

-- Preguntas específicas para médico y farmacia
UPDATE questions SET roles = '["medico", "farmacia"]'::jsonb WHERE id IN (44,57,90);

-- Preguntas específicas para enfermería y farmacia
UPDATE questions SET roles = '["enfermeria", "farmacia"]'::jsonb WHERE id IN (47,58,59);

-- Preguntas específicas para médico, enfermería y farmacia
UPDATE questions SET roles = '["medico", "enfermeria", "farmacia"]'::jsonb WHERE id IN (48,49,58);

-- Preguntas específicas para anestesia y farmacia
UPDATE questions SET roles = '["anestesia", "farmacia"]'::jsonb WHERE id IN (120,136);
