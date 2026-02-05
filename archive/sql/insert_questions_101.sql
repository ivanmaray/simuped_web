-- Insertar preguntas de ejemplo para el escenario 101 (Status Epiléptico)

-- Step 1: Valoración Inicial y Estabilización ABC
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit) VALUES
(108, '¿Cuál es tu prioridad inmediata en la valoración ABC?', '["Asegurar vía aérea", "Administrar anticonvulsivantes", "Obtener historia clínica", "Realizar ECG"]', 0, 'En crisis convulsiva, la prioridad es asegurar ABC: vía aérea, respiración, circulación.', '["medico"]', true, '["Recuerda ABC: Airway, Breathing, Circulation"]', 30);

-- Step 2: Tratamiento de Primera Línea: Benzodiacepinas IV
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit) VALUES
(109, '¿Qué dosis de midazolam IV administras para crisis convulsiva? (Peso 22 kg)', '["2.2 mg (0.1 mg/kg)", "4.4 mg (0.2 mg/kg)", "6.6 mg (0.3 mg/kg)", "8.8 mg (0.4 mg/kg)"]', 1, 'Dosis recomendada: 0.2 mg/kg IV para midazolam en status epiléptico.', '["medico"]', true, '["Dosis: 0.2 mg/kg IV bolo"]', 30);

-- Step 3: Tratamiento de Segunda Línea: Fenitoína o Valproato
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit) VALUES
(110, '¿Qué fármaco eliges para segunda línea? (Antecedente de valproato oral)', '["Fenitoína IV", "Ácido valproico IV", "Levetiracetam IV", "No administrar, esperar"]', 1, 'Dado el antecedente de valproato oral, continuar con valproato IV es apropiado.', '["medico"]', true, '["Considerar antecedentes y vía de administración"]', 30);

-- Step 4: Status Epiléptico Refractario: Anestésicos
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit) VALUES
(111, '¿Qué anestésico inicias para status refractario?', '["Midazolam IV", "Propofol IV", "Tiopental IV", "Ketamina IV"]', 0, 'Midazolam es una opción común para sedación en status refractario.', '["medico"]', true, '["Midazolam o propofol son opciones estándar"]', 30);

-- Step 5: Cese de Crisis y Cuidados Post-Status
INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit) VALUES
(112, '¿Qué cuidados post-ictus realizas?', '["Monitorización continua", "Inicio de anticonvulsivantes orales", "Traslado a UCIP", "Todas las anteriores"]', 3, 'Después del cese, monitorizar, iniciar mantenimiento y trasladar a UCI.', '["medico"]', false, '["Monitorización, tratamiento y traslado"]', 30);
