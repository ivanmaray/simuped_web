-- Diagnosticar preguntas y briefing del escenario Intoxicación por paracetamol
SELECT s.id, s.title, cb.title as brief_title, cb.objectives, cb.critical_actions, cb.red_flags, cb.vitals
FROM scenarios s
LEFT JOIN case_briefs cb ON cb.scenario_id = s.id
WHERE s.title ILIKE '%paracetamol%';

-- Mostrar pasos y preguntas
SELECT st.id as step_id, st.step_order, st.narrative, q.id as question_id, q.question_text, q.options, q.correct_option
FROM steps st
LEFT JOIN questions q ON q.step_id = st.id
WHERE st.scenario_id = (SELECT id FROM scenarios WHERE title ILIKE '%paracetamol%' LIMIT 1)
ORDER BY st.step_order, q.id;
