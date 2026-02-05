-- Añadir la información del triángulo ABC al caso 101 para que el briefing se considere completo

BEGIN;
UPDATE case_briefs
SET triangle = jsonb_build_object(
  'appearance', 'Niño inconsciente, movimientos tónico-clónicos generalizados, sialorrea y cianosis peribucal leve tras 35 minutos de crisis persistente',
  'breathing', 'Respira con esfuerzo, SatO2 90% con oxígeno a 15 L/min por mascarilla reservorio; se prefiere oxígeno de alto flujo para mantener >94%',
  'circulation', 'FC 135 lpm, TA 105/65 mmHg, pulsos periféricos palpables, sin hipotensión franca pero riesgo de colapso tras el cese de la crisis'
)
WHERE scenario_id = 101;
COMMIT;
