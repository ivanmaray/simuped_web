# Escenarios Clínicos Online - SimuPed

Este directorio contiene los scripts SQL para crear/actualizar los escenarios clínicos online.

## Escenarios Completados

1. **01_sepsis_grave_lactante_UPDATE.sql** - Sepsis grave en lactante de 6 meses (ID 13)
   - Componentes: 1 case_brief, 4 steps, 18 questions, 4 resources
   - Estado: UPDATE de escenario existente

2. **02_parada_cardiorrespiratoria.sql** - Parada cardiorrespiratoria pediátrica (ID 100)
   - Componentes: 1 case_brief, 5 steps, 22 questions, 4 resources
   - Estado: INSERT nuevo escenario

3. **03_status_epileptico.sql** - Status epiléptico refractario (ID 101)
   - Componentes: 1 case_brief, 5 steps, 20 questions, 4 resources
   - Estado: INSERT nuevo escenario

## Escenarios Pendientes

Los siguientes escenarios necesitan desarrollo completo:

- **ID 102**: Intoxicación por paracetamol
- **ID 103**: Neumonía complicada con empiema
- **ID 104**: Cetoacidosis diabética
- **ID 105**: Hiponatremia sintomática
- **ID 106**: Meningitis bacteriana con alergia a betalactámicos
- **ID 107**: Neutropenia febril en paciente oncológico

## Instrucciones de Ejecución

1. Revisar el contenido de cada archivo SQL
2. Ejecutar en Supabase SQL Editor en el orden numérico
3. Verificar con la query de validación al final de cada script

## Estructura de Cada Escenario

- **case_brief**: Contexto clínico completo, historia, exploración, constantes, objetivos
- **steps**: 4-5 pasos secuenciales que narran la evolución del caso
- **questions**: 16-22 preguntas distribuidas por steps (evaluación formativa)
- **case_resources**: 4+ recursos bibliográficos (guías clínicas, protocolos, artículos)
