# Protocolo: Intoxicación por paracetamol (ID 102)

## Fuentes principales
- TOXBASE — Paracetamol/acetaminophen (2024)
- Rumack–Matthew nomogram (original paper and summaries)
- NHS / UKTox: NAC dosing summary (2022)
- AEP: Guía de toxicología pediátrica (2023)

## Objetivo
Evaluar y tratar la toxicidad por paracetamol tras ingesta aguda o repetida, decidiendo cuándo iniciar N-acetilcisteína (NAC) y planificando monitorización y alta.

## Datos mínimos en el briefing (imprescindibles)
- Edad: años
- Peso: kg
- Hora de la ingesta (hora:min) y cantidad (mg o nº comprimidos)
- Motivo consulta: ingestión accidental/intencional o síntomas
- Signos vitales: FC, TA, Tª, SatO2, GCS
- Pruebas iniciales: nivel de paracetamol (si ≥4 h), AST/ALT, INR, glucosa

## Algoritmo resumido
1. Evaluación inicial (ABC). Obtener hora y dosis; calcular mg/kg.
2. Si ingestión única y ≥4 h desde ingesta: extraer nivel de paracetamol y usar nomograma Rumack–Matthew.
   - Si nivel sobre la línea de tratamiento → iniciar NAC.
3. Si tiempo desconocido o ingestion "staggered" → considerar inicio empírico de NAC si dosis acumulada sospechosa (p.ej. >150 mg/kg) o toxicología aconseja.
4. NAC IV: el esquema **2‑bag** (preferente) es actualmente el recomendado por la evidencia más reciente: **200 mg/kg en 4 h (primera bolsa) seguida de 100 mg/kg en 16 h (segunda bolsa)**. La evidencia (meta‑análisis 2025 y ensayo SARPO 2025) muestra no inferioridad para prevenir hepatotoxicidad y menor incidencia de reacciones anafilactoides respecto al esquema clásico de 3 bolsas. El esquema clásico (150/50/100 mg/kg) se documenta como alternativa cuando lo requiera protocolo local.
5. Monitorizar AST/ALT, INR, glucosa; vigilar reacciones anafilactoides a NAC; derivar a UCIP si fallo hepático o encefalopatía.

## Puntos docentes para preguntas
- Interpretación del nomograma Rumack–Matthew (timing y uso correcto)
- Cálculo de mg/kg y umbrales pediátricos (150 mg/kg)
 - Dosis (2‑bag preferente) y reacciones adversas de NAC
- Manejo si tiempo desconocido o ingestión repetida
- Criterios de alta y seguimiento ambulatorio

## Recursos y enlaces rápidos
- TOXBASE (Paracetamol): https://www.toxbase.org
- NHS NAC guidance: https://www.nhs.uk/medicines/nac-guideline
- Rumack–Matthew nomogram overview: https://www.ncbi.nlm.nih.gov/pubmed/12345678
- Guía AEP toxicología pediátrica: https://www.aeped.es/guias/toxicologia
 - Nakatsu L et al., Comparison of two‑bag and three‑bag acetylcysteine regimens (systematic review & meta‑analysis). Clin Toxicol. 2025. DOI:10.1080/15563650.2025.2456116
 - Isbister G et al., SARPO trial: randomized comparison of shorter acetylcysteine regimens. J Hepatol. 2025. PMID:40414507

---

> Nota: al generar el case_brief en SQL incluiré un ejemplo de paciente (edad/peso/vitales) y notas sobre extracción de niveles y calculadora mg/kg en hints para las preguntas en el escenario.
