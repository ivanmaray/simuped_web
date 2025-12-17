-- Estandarizar options a array de strings simples para preguntas con formato objeto

-- Pregunta 158: Shock séptico lactante
UPDATE questions SET options = '["Solicitar radiografía de tórax y analítica completa antes de iniciar tratamiento", "Iniciar monitorización continua, canalizar vía periférica y administrar oxígeno", "Administrar paracetamol IV para bajar la fiebre y esperar evolución", "Realizar punción lumbar inmediata ante sospecha de meningitis"]'::jsonb WHERE id = 158;

-- Pregunta 159: Diagnóstico sindrómico
UPDATE questions SET options = '["Shock séptico (distributivo)", "Shock cardiogénico", "Deshidratación leve-moderada", "Bronquiolitis con trabajo respiratorio"]'::jsonb WHERE id = 159;

-- Pregunta 160: Parámetro hemodinámico sensible
UPDATE questions SET options = '["Hipotensión arterial (TAS <p5)", "Alteración de la perfusión periférica (relleno capilar >3 seg)", "Taquicardia aislada", "Saturación de oxígeno <95%"]'::jsonb WHERE id = 160;

-- Pregunta 161: Tipo de shock séptico frecuente
UPDATE questions SET options = '["Shock frío (vasoconstricción periférica, resistencias vasculares altas)", "Shock caliente (vasodilatación, resistencias vasculares bajas)", "Shock cardiogénico", "Shock obstructivo"]'::jsonb WHERE id = 161;
