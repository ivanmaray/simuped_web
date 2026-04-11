-- ========================================
-- PATCH SQL: Escenario 100 - Parada Cardiorrespiratoria
-- SimuPed - Actualización de preguntas críticas, explicaciones y recursos
-- Fecha: 2026-04-11
-- ========================================

-- ========================================
-- PARTE 1: UPDATE SCENARIO
-- ========================================
UPDATE scenarios SET
  status = 'En construcción: en proceso',
  estimated_minutes = 30
WHERE id = 100;

-- ========================================
-- PARTE 2: PREGUNTAS CRÍTICAS - STEP 1 (step_id=113)
-- ========================================

-- q325: Lucas inconsciente - confirmar PCR
UPDATE questions SET
  critical_rationale = 'Retrasar el diagnóstico de PCR retrasa el inicio de compresiones. Cada minuto sin RCP reduce la supervivencia neurológicamente intacta un 10%. La confirmación debe ser inequívoca pero rápida: ausencia de respiración + ausencia de pulso en <10 segundos según ERC 2025.',
  time_limit = 90
WHERE id = 325;

-- q326: Primera acción reanimador solitario
UPDATE questions SET
  critical_rationale = 'Si el reanimador está solo, solicitar ayuda (gritar o activar código) antes de iniciar RCP es crucial: sin un segundo reanimador, no es posible la desfibrilación ni mantener la calidad de la RCP prolongada. El colapso sin recursos adicionales empeora exponencialmente el pronóstico.',
  time_limit = 90
WHERE id = 326;

-- q812: [FARMACIA] Dilución adrenalina 1:1.000 → 1:10.000
UPDATE questions SET
  critical_rationale = 'Administrar adrenalina 1:1.000 sin diluir por vía IV/IO equivale a 10 veces la dosis estándar. Causa hipertensión sistémica grave, vasoconstricción coronaria refractaria y arritmias letales. La dilución a 1:10.000 (0.1 mg/mL) es obligatoria según protocolos ERC/AHA 2025.',
  time_limit = 90
WHERE id = 812;

-- ========================================
-- PARTE 2: PREGUNTAS CRÍTICAS - STEP 2 (step_id=114)
-- ========================================

-- q328: Profundidad compresiones - no romper costillas
UPDATE questions SET
  critical_rationale = 'Compresiones de menos de 1/3 del diámetro anteroposterior del tórax no generan presión de perfusión coronaria suficiente. La profundidad adecuada (≥4 cm en niños >1 año, ≥5 cm en adolescentes) es el principal determinante de eficacia de la RCP según ERC 2025.',
  time_limit = 90
WHERE id = 328;

-- q329: Ratio compresiones:ventilaciones con 2 reanimadores
UPDATE questions SET
  critical_rationale = 'Usar ratio 30:2 (para adultos) en niños con 2 reanimadores infravalora las necesidades pediátricas. El 15:2 con 2 reanimadores en niños maximiza el tiempo de compresión efectiva en paradas de origen respiratorio (que representan >80% en pediatría según ERC 2025).',
  time_limit = 90
WHERE id = 329;

-- q332: Tiempo máximo de interrupción compresiones
UPDATE questions SET
  critical_rationale = 'Cada 10 segundos de interrupción en compresiones reduce la presión de perfusión coronaria casi a cero. La fracción de compresiones (CCF) debe ser >80%. Interrupciones >10 segundos para análisis de ritmo o procedimientos disminuyen significativamente la supervivencia neurológica según ILCOR 2025.',
  time_limit = 90
WHERE id = 332;

-- ========================================
-- PARTE 2: PREGUNTAS CRÍTICAS - STEP 3 (step_id=115)
-- ========================================

-- q334: FV - desfibrilación como acción prioritaria
UPDATE questions SET
  critical_rationale = 'En Fibrilación Ventricular/Taquicardia Ventricular Sin Pulso, cada minuto de retraso en la descarga reduce la probabilidad de Retorno de Circulación Espontánea un 10% y la supervivencia neurológica un 7-10%. La desfibrilación precoz es el único tratamiento definitivo del ritmo desfibrilable.',
  time_limit = 90
WHERE id = 334;

-- q335: Energía primera descarga - 4 J/kg
UPDATE questions SET
  critical_rationale = 'Una energía insuficiente no termina la FV; una energía excesiva causa daño miocárdico irreversible. La dosis estándar ERC/AHA 2025 es 4 J/kg con desfibrilador bifásico. Para Lucas (16 kg): 64 J. Las descargas sucesivas pueden aumentarse hasta 4 J/kg o el máximo del dispositivo (360 J).',
  time_limit = 90
WHERE id = 335;

-- q336: Continuar RCP inmediatamente tras descarga
UPDATE questions SET
  critical_rationale = 'Detenerse a analizar el ritmo inmediatamente tras la descarga prolonga la pausa sin compresiones, reduciendo la perfusión coronaria y cerebral. Las guías ERC 2025 establecen reanudar compresiones de inmediato sin verificar pulso ni ritmo — el análisis se realiza solo al cabo de 2 minutos de RCP.',
  time_limit = 90
WHERE id = 336;

-- q816: [FARMACIA] Antiarrítmico en FV refractaria - Amiodarona
UPDATE questions SET
  critical_rationale = 'En FV refractaria tras 3 descargas, la amiodarona es el antiarrítmico de elección según ERC 2025 (5 mg/kg IV/IO antes de la 4ª descarga). Administrar lidocaína en su lugar, a dosis incorrecta o retrasada reduce la probabilidad de RCE y puede empeorar la función miocárdica post-RCE.',
  time_limit = 90
WHERE id = 816;

-- ========================================
-- PARTE 2: PREGUNTAS CRÍTICAS - STEP 4 (step_id=116)
-- ========================================

-- q339: Adrenalina en ritmo desfibrilable - cuándo y dosis
UPDATE questions SET
  critical_rationale = 'En ritmo desfibrilable, la adrenalina se administra después de la 3ª descarga (no al inicio) para no interferir con las descargas iniciales de alta eficacia. La dosis pediátrica es 0.01 mg/kg IV/IO (máx 1 mg). Retrasar o no administrar adrenalina reduce probabilidad de RCE en FV refractaria.',
  time_limit = 120
WHERE id = 339;

-- q341: RCP post-intubación - técnica modificada
UPDATE questions SET
  critical_rationale = 'Mantener el ratio 15:2 una vez asegurada la vía aérea avanzada interrumpe las compresiones innecesariamente. Con tubo endotraqueal se pasa a compresiones continuas a 100-120/min + ventilaciones asíncronas a 10/min, maximizando la fracción de compresiones y la perfusión según ERC 2025.',
  time_limit = 90
WHERE id = 341;

-- q818: [FARMACIA] Adrenalina IO - cálculo y dilución
UPDATE questions SET
  critical_rationale = 'Administrar adrenalina 1:1.000 sin diluir por vía IO resulta en sobredosis 10× con vasoconstricción extrema, arritmias refractarias y daño miocárdico irreversible. Para Lucas (16 kg): 0.01 mg/kg = 0.16 mg = 1.6 mL de 1:10.000 (diluir 1 mL de 1:1.000 + 9 mL SSN).',
  time_limit = 90
WHERE id = 818;

-- ========================================
-- PARTE 2: PREGUNTAS CRÍTICAS - STEP 5 (step_id=117)
-- ========================================

-- q343: Hipoglucemia post-RCE - conducta según ERC 2025
UPDATE questions SET
  critical_rationale = 'La hipoglucemia post-RCE (glucemia <47 mg/dL) potencia dramáticamente el daño neurológico isquémico-reperfusión. Debe corregirse inmediatamente. El objetivo post-RCE es glucemia 80-180 mg/dL (guías ERC/AHA 2025). Tanto hipoglucemia como hiperglucemia empeoran pronóstico neurológico.',
  time_limit = 90
WHERE id = 343;

-- q820: [FARMACIA] Glucosa post-RCE - cálculo de bolo
UPDATE questions SET
  critical_rationale = 'Administrar glucosa 50% directamente en niños pequeños causa hiperosmolaridad, daño endotelial venoso y dificultad en cálculo de dosis. En pediatría: glucosa 10% a 2 mL/kg (para Lucas 16 kg × 2 = 32 mL de 10%) o diluir glucosa 25%. NUNCA glucosa 50% sin diluir en <12 años según AHA/AAP 2025.',
  time_limit = 90
WHERE id = 820;

-- ========================================
-- PARTE 3: MEJORA DE EXPLICACIONES CORTAS
-- ========================================

-- q325: Explicación actual = 430 chars (mejorar)
UPDATE questions SET
  explanation = 'Confirmación en <10 segundos: ausencia de respiración (ausencia de movimiento torácico, sin gasping) + ausencia de pulso central (arteria carótida en niños >1 año, braquial <1 año, femoral alternativa). No retrasar compresiones por búsqueda exhaustiva de pulso. La hipoxia durante PCR se agrava exponencialmente sin perfusión.'
WHERE id = 325;

-- q329: Explicación actual = 376 chars (mejorar)
UPDATE questions SET
  explanation = 'Ratio 15:2 con 2 reanimadores pediátricos maximiza fracción compresiones (>80% objetivo) en paradas respiratorias. En niños: 15 compresiones a 100-120/min, luego 2 ventilaciones. Evita interrupciones excesivas. El ratio 30:2 es para adultos o reanimador solitario en niño (según ERC 2025).'
WHERE id = 329;

-- q335: Explicación actual = 387 chars (mejorar)
UPDATE questions SET
  explanation = 'Dosis 4 J/kg bifásico según ERC/AHA 2025: Lucas 16 kg = 64 J (primera descarga). Mecanismo: energía termina despolarización simultánea miocárdica en FV. Dosis insuficiente (<2 J/kg) deja fibrilación persistente; dosis excesiva (>5 J/kg) causa miocardiopatía post-RCE. Segunda descarga: 64 J; tercera: hasta 360 J o 4 J/kg.'
WHERE id = 335;

-- q812: Explicación actual = 389 chars (mejorar)
UPDATE questions SET
  explanation = 'Dilución obligatoria IV/IO en pediatría: adrenalina 1:1.000 (1 mg/mL) sin diluir = sobredosis 10×. Causa: vasoconstricción coronaria, hipertensión sistémica, arritmias letales. Técnica correcta: 1 mL adrenalina 1:1.000 + 9 mL SSN = 10 mL solución 1:10.000 (0.1 mg/mL). Dosis: 0.01 mg/kg = 0.16 mg para Lucas.'
WHERE id = 812;

-- q814: Explicación actual = 342 chars (NO crítica pero corta - mejorar)
UPDATE questions SET
  explanation = 'Verificación rápida de pulso central (<10 segundos): carótida (>1 año) o braquial (<1 año). No retrasar RCP si hay duda. Ausencia de pulso = inicio inmediato compresiones 100-120/min. La demora en confirmación empeora pronóstico neurológico (cada minuto sin perfusión = pérdida 10% supervivencia neurológica intacta).'
WHERE id = 814;

-- q815: Explicación actual = 353 chars (NO crítica pero corta - mejorar)
UPDATE questions SET
  explanation = 'Primera acción en solitario: GRITAR pidiendo ayuda / activar código de paradas (si acceso a teléfono). Esto activa personal (segundo reanimador, desfibrilador automático externo, servicios de emergencia). Sin apoyo: RCP solitaria tiene pronóstico muy inferior. Maximizar ayuda antes de iniciar RCP mejora supervivencia exponencialmente.'
WHERE id = 815;

-- q817: Explicación actual = 340 chars (NO crítica pero corta - mejorar)
UPDATE questions SET
  explanation = 'El DAE/DEA mediante electrodos detecta ritmo automáticamente (FV/TVSP o ritmo no desfibrilable). No detiene RCP si ritmo no desfibrilable. Uso: colocar electrodos, seguir instrucciones de voz, reiniciar RCP tras descarga. Disponible en espacios públicos. La desfibrilación precoz en FV es tratamiento único definitivo; empieza RCP mientras llega DAE.'
WHERE id = 817;

-- ========================================
-- PARTE 4: DELETE Y INSERT case_resources
-- ========================================

-- Eliminar recursos antiguos
DELETE FROM case_resources WHERE scenario_id = 100;

-- Insertar recursos actualizados (ERC 2025 y AHA 2025)
INSERT INTO case_resources (id, scenario_id, title, url, source, type, year, free_access, created_at)
VALUES
  (gen_random_uuid(), 100, 'European Resuscitation Council Guidelines 2025 - Paediatric Life Support', 'https://www.resuscitationjournal.com/article/S0300-9572(25)00279-5/fulltext', 'ERC / Resuscitation Journal', 'guía', 2025, false, now()),
  (gen_random_uuid(), 100, 'AHA/AAP 2025 Part 8: Pediatric Advanced Life Support', 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001368', 'AHA / Circulation', 'guía', 2025, false, now()),
  (gen_random_uuid(), 100, 'SEUP Protocolo Soporte Vital - 4ª edición 2024', 'https://seup.org/wp-content/uploads/2024/04/3_Soporte_vital_4ed.pdf', 'SEUP', 'protocolo', 2024, true, now()),
  (gen_random_uuid(), 100, 'ILCOR 2025 COSTR - Pediatric Life Support', 'https://ilcor.org/uploads/PLS-2025-COSTR-Full-Chapter.pdf', 'ILCOR', 'guía', 2025, true, now()),
  (gen_random_uuid(), 100, 'AHA/AAP 2025 Part 6: Pediatric Basic Life Support', 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001370', 'AHA / Circulation', 'guía', 2025, false, now());

-- ========================================
-- FIN DEL PATCH
-- ========================================
-- Verificar actualización
SELECT
  id,
  title,
  is_critical,
  critical_rationale,
  time_limit
FROM questions
WHERE scenario_id = 100 AND is_critical = true
ORDER BY step_id, id;
