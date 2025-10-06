import json
from pathlib import Path

questions = []

counter = 1

def add_question(categoria, subcategoria, dificultad, pregunta, opciones, respuesta_correcta, explicacion):
    global counter
    question = {
        "id": f"onco-{counter:03d}",
        "categoria": categoria,
        "subcategoria": subcategoria,
        "dificultad": dificultad,
        "pregunta": pregunta,
        "opciones": opciones,
        "respuestaCorrecta": respuesta_correcta,
        "explicacion": explicacion,
    }
    questions.append(question)
    counter += 1


# Tumores sólidos - Mama
add_question(
    "Tumores sólidos",
    "Mama",
    "Básico",
    "¿Qué receptor hormonal define el subtipo luminal A de cáncer de mama?",
    [
        "Receptor de estrógeno positivo y HER2 negativo",
        "Receptor de progesterona negativo",
        "HER2 positivo y Ki-67 alto",
        "Triple negativo",
    ],
    0,
    "El subtipo luminal A se caracteriza por receptores hormonales positivos (principalmente estrógeno) y ausencia de sobreexpresión de HER2, con baja proliferación.",
)

add_question(
    "Tumores sólidos",
    "Mama",
    "Básico",
    "¿Qué prueba de imagen es la base del cribado poblacional del cáncer de mama?",
    [
        "Mamografía",
        "Resonancia magnética",
        "Ecografía",
        "Tomosíntesis contrastada",
    ],
    0,
    "La mamografía es la técnica estándar de cribado en población general femenina, al detectar microcalcificaciones y lesiones sospechosas en fases precoces.",
)

add_question(
    "Tumores sólidos",
    "Mama",
    "Intermedio",
    "¿Qué fármaco anti-HER2 se asocia a cardiotoxicidad reversible y requiere monitorización de fracción de eyección?",
    [
        "Trastuzumab",
        "Pertuzumab",
        "Lapatinib",
        "Tucatinib",
    ],
    0,
    "El trastuzumab puede inducir disfunción ventricular reversible; por ello se monitoriza la fracción de eyección periódicamente durante el tratamiento.",
)

add_question(
    "Tumores sólidos",
    "Mama",
    "Intermedio",
    "En cáncer de mama estadio inicial con receptores hormonales positivos, ¿qué tratamiento adyuvante disminuye el riesgo de recaída?",
    [
        "Terapia endocrina",
        "Quimioterapia con antraciclinas",
        "Inhibidores de PARP",
        "Inmunoterapia con anti-PD-1",
    ],
    0,
    "En tumores con receptores hormonales positivos, la terapia endocrina (tamoxifeno o inhibidores de aromatasa) es clave para reducir recurrencias tras la cirugía.",
)

add_question(
    "Tumores sólidos",
    "Mama",
    "Intermedio",
    "¿Cuál es la indicación principal de la prueba multigénica (Oncotype DX u otras) en cáncer de mama?",
    [
        "Determinar el beneficio de quimioterapia adyuvante en tumores luminales",
        "Seleccionar candidatas a terapia anti-HER2",
        "Definir respuesta a radiofrecuencia",
        "Detectar mutaciones germinales de BRCA",
    ],
    0,
    "Las firmas genómicas ayudan a estimar riesgo de recaída en tumores luminales y decidir si la paciente se beneficia de añadir quimioterapia a la endocrina.",
)

add_question(
    "Tumores sólidos",
    "Mama",
    "Avanzado",
    "En cáncer de mama metastásico triple negativo con expresión de PD-L1, ¿qué combinación ha mostrado beneficio en supervivencia global?",
    [
        "Atezolizumab + nab-paclitaxel",
        "Trastuzumab + paclitaxel",
        "Capecitabina + bevacizumab",
        "Talazoparib en monoterapia",
    ],
    0,
    "En tumores triple negativos PD-L1 positivos, la combinación de atezolizumab con nab-paclitaxel demostró mejora en supervivencia global frente a quimioterapia sola.",
)

add_question(
    "Tumores sólidos",
    "Mama",
    "Avanzado",
    "¿Cuál es la principal toxicidad limitante del uso de inhibidores de CDK4/6 como palbociclib?",
    [
        "Neutropenia",
        "Cardiotoxicidad",
        "Retraso del crecimiento óseo",
        "Neurotoxicidad periférica",
    ],
    0,
    "Los inhibidores de CDK4/6 producen neutropenia reversible como efecto adverso más frecuente, por lo que se monitoriza hemograma regularmente.",
)

add_question(
    "Tumores sólidos",
    "Mama",
    "Avanzado",
    "¿Qué mutación germinal condiciona el uso de inhibidores de PARP en cáncer de mama metastásico?",
    [
        "BRCA1 o BRCA2",
        "PIK3CA",
        "ESR1",
        "HER2",
    ],
    0,
    "Los pacientes con mutaciones germinales en BRCA1/2 se benefician de inhibidores de PARP como olaparib o talazoparib en enfermedad metastásica.",
)

add_question(
    "Tumores sólidos",
    "Mama",
    "Básico",
    "¿Cuál es el margen quirúrgico considerado adecuado tras una tumorectomía con radioterapia adyuvante?",
    [
        "Margen negativo (no tinta en el tumor)",
        "Al menos 1 cm de margen",
        "Margen negativo y 5 mm libres",
        "Margen positivo aceptado si se aplica boost",
    ],
    0,
    "En cirugía conservadora de mama, la recomendación es no tinta en el tumor; márgenes negativos microscópicos son suficientes junto con radioterapia.",
)

add_question(
    "Tumores sólidos",
    "Mama",
    "Intermedio",
    "¿Qué hallazgo clínico obliga a descartar enfermedad inflamatoria de mama?",
    [
        "Eritema difuso y edema cutáneo en piel de naranja",
        "Nódulo móvil de 1 cm",
        "Secreción serosa intermitente",
        "Dolor cíclico",
    ],
    0,
    "El cáncer de mama inflamatorio se caracteriza por eritema difuso, calor y edema en piel de naranja; requiere diagnóstico y tratamiento sistémico urgente.",
)

# Tumores sólidos - Pulmón
add_question(
    "Tumores sólidos",
    "Pulmón",
    "Básico",
    "En el cribado de cáncer de pulmón en alto riesgo, ¿qué prueba se recomienda?",
    [
        "Tomografía computarizada de baja dosis",
        "Radiografía de tórax anual",
        "PET-TC",
        "Resonancia magnética",
    ],
    0,
    "Los programas de cribado en fumadores de alto riesgo utilizan TAC de baja dosis anual, que reduce mortalidad por cáncer de pulmón.",
)

add_question(
    "Tumores sólidos",
    "Pulmón",
    "Básico",
    "¿Qué mutación driver es más frecuente en adenocarcinoma de pulmón en no fumadores?",
    [
        "Mutaciones activadoras de EGFR",
        "Reordenamientos de ALK",
        "Mutaciones de KRAS G12C",
        "Amplificaciones de MET",
    ],
    0,
    "Las mutaciones activadoras de EGFR son comunes en adenocarcinoma en no fumadores y permiten terapia dirigida con inhibidores de EGFR.",
)

add_question(
    "Tumores sólidos",
    "Pulmón",
    "Intermedio",
    "En cáncer de pulmón no microcítico estadio IIIA irresecable, ¿cuál es el tratamiento estándar inicial?",
    [
        "Quimiorradioterapia concurrente",
        "Quimioterapia seguida de cirugía",
        "Resección quirúrgica primaria",
        "Inmunoterapia neoadyuvante",
    ],
    0,
    "La quimiorradioterapia concurrente es la estrategia estándar para enfermedad localmente avanzada irresecable, buscando control locorregional.",
)

add_question(
    "Tumores sólidos",
    "Pulmón",
    "Intermedio",
    "¿Qué biomarcador define la indicación de pembrolizumab en monoterapia en primera línea de cáncer de pulmón no microcítico avanzado?",
    [
        "PD-L1 ≥50%",
        "Mutación EGFR",
        "Reordenamiento ALK",
        "Amplificación ERBB2",
    ],
    0,
    "Pembrolizumab puede emplearse en monoterapia si la expresión de PD-L1 mediante TPS es ≥50% y no hay dianas accionables.",
)

add_question(
    "Tumores sólidos",
    "Pulmón",
    "Avanzado",
    "En pacientes con mutación EGFR y progresión tras osimertinib, ¿qué opción terapéutica exploratoria gana relevancia?",
    [
        "Combinaciones con amivantamab + lazertinib",
        "Quimioterapia con cisplatino-vinorelbina",
        "Radioterapia holocraneal profiláctica",
        "Ipilimumab en monoterapia",
    ],
    0,
    "Tras progresión a osimertinib, se investigan combinaciones como amivantamab (anti-EGFR/MET) con lazertinib para abordar mecanismos de resistencia.",
)

add_question(
    "Tumores sólidos",
    "Pulmón",
    "Básico",
    "¿Qué síndrome paraneoplásico se asocia con más frecuencia al carcinoma microcítico de pulmón?",
    [
        "Secreción ectópica de ACTH",
        "Hipercalcemia",
        "Hipoglucemia",
        "Síndrome de Trousseau",
    ],
    0,
    "El carcinoma microcítico produce frecuentemente secreción ectópica de ACTH, generando síndrome de Cushing paraneoplásico.",
)

add_question(
    "Tumores sólidos",
    "Pulmón",
    "Intermedio",
    "¿Cuál es la recomendación tras completar quimiorradioterapia en estadio III irresecable con PD-L1 ≥1%?",
    [
        "Consolidación con durvalumab por 12 meses",
        "Quimioterapia adicional con cisplatino",
        "Cirugía de rescate",
        "Radiofrecuencia pulmonar",
    ],
    0,
    "Durvalumab durante un año tras quimiorradioterapia mejora supervivencia libre de progresión y global en pacientes con PD-L1 ≥1%.",
)

add_question(
    "Tumores sólidos",
    "Pulmón",
    "Avanzado",
    "En enfermedad oligometastásica inicial, ¿qué beneficio aporta la radioterapia estereotáxica sobre todas las lesiones?",
    [
        "Mejora la supervivencia libre de progresión en combinación con tratamiento sistémico",
        "Sustituye la enucleación metastásica",
        "Permite suspender la terapia sistémica",
        "No ofrece beneficio demostrado",
    ],
    0,
    "En estudios fase II, la radioterapia estereotáxica sobre todas las lesiones oligometastásicas junto a tratamiento sistémico prolonga la supervivencia libre de progresión.",
)

add_question(
    "Tumores sólidos",
    "Pulmón",
    "Avanzado",
    "¿Qué toxicidad obliga a suspender inmunoterapia anti-PD-1/PD-L1 en cáncer de pulmón si aparece grado 3?",
    [
        "Neumonitis",
        "Hipotiroidismo",
        "Rash cutáneo leve",
        "Artralgias",
    ],
    0,
    "La neumonitis inmune grado 3 requiere suspensión de la inmunoterapia y tratamiento inmediato con corticoides a altas dosis.",
)

add_question(
    "Tumores sólidos",
    "Pulmón",
    "Intermedio",
    "¿Cuál es la principal causa de resistencia primaria a inhibidores de ALK?",
    [
        "Mutaciones de activación de EGFR",
        "MET amplificado",
        "Expresión de PD-L1",
        "Inactivación de STK11",
    ],
    0,
    "La activación de vías alternativas como EGFR puede conferir resistencia primaria a inhibidores de ALK; se estudian combinaciones para superarla.",
)

# Tumores sólidos - Digestivo
add_question(
    "Tumores sólidos",
    "Digestivo",
    "Básico",
    "¿Qué prueba de cribado reduce la mortalidad por cáncer colorrectal y permite resección de pólipos?",
    [
        "Colonoscopia",
        "TC abdominal",
        "Ecografía endoscópica",
        "Tránsito intestinal",
    ],
    0,
    "La colonoscopia permite detectar lesiones precursoras y extirpar pólipos, disminuyendo mortalidad por cáncer colorrectal.",
)

add_question(
    "Tumores sólidos",
    "Digestivo",
    "Básico",
    "¿Qué marcador orienta al seguimiento en carcinoma hepatocelular?",
    [
        "Alfa-fetoproteína",
        "CEA",
        "CA 19-9",
        "Calcitonina",
    ],
    0,
    "La alfa-fetoproteína se utiliza junto a la imagen para diagnóstico y seguimiento de hepatocarcinoma, aunque no es exclusiva.",
)

add_question(
    "Tumores sólidos",
    "Digestivo",
    "Intermedio",
    "En cáncer colorrectal metastásico RAS wild-type, ¿qué factor contraindica anti-EGFR como cetuximab?",
    [
        "Tumor primario en colon derecho",
        "Metástasis hepática",
        "Elevado CEA",
        "Cirrosis compensada",
    ],
    0,
    "Los tumores del colon derecho responden peor a anti-EGFR en primera línea, por lo que se prefieren combinaciones con bevacizumab.",
)

add_question(
    "Tumores sólidos",
    "Digestivo",
    "Intermedio",
    "¿Qué esquema perioperatorio es estándar en adenocarcinoma gástrico resecable localmente avanzado?",
    [
        "FLOT (5-FU, leucovorina, oxaliplatino, docetaxel)",
        "Capecitabina adyuvante",
        "FOLFOX neoadyuvante",
        "Radioquimioterapia con cisplatino",
    ],
    0,
    "El esquema FLOT perioperatorio ha demostrado mejorar supervivencia frente a regímenes anteriores en adenocarcinoma gástrico resecable.",
)

add_question(
    "Tumores sólidos",
    "Digestivo",
    "Avanzado",
    "En carcinoma hepatocelular avanzado, ¿qué combinación sistémica es estándar de primera línea?",
    [
        "Atezolizumab + bevacizumab",
        "Sorafenib",
        "Regorafenib",
        "Nivolumab",
    ],
    0,
    "Atezolizumab más bevacizumab mostró superioridad frente a sorafenib en supervivencia global y libre de progresión.",
)

add_question(
    "Tumores sólidos",
    "Digestivo",
    "Básico",
    "¿Qué enfermedad inflamatoria intestinal incrementa el riesgo de cáncer colorrectal tras 8-10 años de evolución?",
    [
        "Colitis ulcerosa extensa",
        "Enfermedad celíaca",
        "Colitis microscópica",
        "Diverticulitis",
    ],
    0,
    "La colitis ulcerosa extensa aumenta riesgo de cáncer colorrectal tras años de actividad, requiriendo colonoscopias de vigilancia.",
)

add_question(
    "Tumores sólidos",
    "Digestivo",
    "Intermedio",
    "En tumores neuroendocrinos pancreáticos G2, ¿qué fármaco dirigido bloquea mTOR?",
    [
        "Everolimus",
        "Sunitinib",
        "Lenvatinib",
        "Pazopanib",
    ],
    0,
    "Everolimus inhibe mTOR y controla el crecimiento de tumores neuroendocrinos bien diferenciados pancreáticos.",
)

add_question(
    "Tumores sólidos",
    "Digestivo",
    "Avanzado",
    "¿Qué alteración justifica el uso de pembrolizumab en cáncer colorrectal metastásico refractario?",
    [
        "Inestabilidad de microsatélites alta (MSI-H)",
        "Mutación KRAS",
        "Sobreexpresión HER2",
        "Amplificación FGFR2",
    ],
    0,
    "Los tumores MSI-H o dMMR responden a inmunoterapia con pembrolizumab o nivolumab incluso tras líneas previas.",
)

add_question(
    "Tumores sólidos",
    "Digestivo",
    "Intermedio",
    "¿Qué técnica complementa la ecoendoscopia para estadificar cáncer de páncreas?",
    [
        "Tomografía con contraste trifásico",
        "PET-TC",
        "Resonancia cerebral",
        "Gammagrafía ósea",
    ],
    0,
    "La TAC con contraste arterial y portal permite valorar resecabilidad vascular en cáncer de páncreas.",
)

add_question(
    "Tumores sólidos",
    "Digestivo",
    "Avanzado",
    "En carcinoma colorrectal metastásico con mutación BRAF V600E, ¿qué combinación dirigida mejora la supervivencia?",
    [
        "Encorafenib + cetuximab",
        "Trametinib + bevacizumab",
        "Cobimetinib + pembrolizumab",
        "Vemurafenib + panitumumab + irinotecán",
    ],
    0,
    "La combinación encorafenib + cetuximab demostró beneficio en supervivencia tras progresión a quimioterapia.",
)

# Tumores sólidos - Ginecológico
add_question(
    "Tumores sólidos",
    "Ginecológico",
    "Básico",
    "¿Cuál es la principal prueba de cribado para cáncer de cérvix?",
    [
        "Test de VPH y citología",
        "Resonancia magnética",
        "Ecografía transvaginal",
        "CA-125 sérico",
    ],
    0,
    "El cribado se basa en test de VPH de alto riesgo y/o citología para detectar lesiones precancerosas cervicales.",
)

add_question(
    "Tumores sólidos",
    "Ginecológico",
    "Básico",
    "¿Cuál es el tratamiento estándar para cáncer de endometrio estadio inicial de bajo riesgo?",
    [
        "Histerectomía total con salpingooforectomía bilateral",
        "Quimioterapia con carboplatino",
        "Radioterapia externa",
        "Inmunoterapia",
    ],
    0,
    "La cirugía, generalmente por vía mínimamente invasiva, es curativa en estadios iniciales de bajo riesgo.",
)

add_question(
    "Tumores sólidos",
    "Ginecológico",
    "Intermedio",
    "En cáncer de ovario epitelial avanzado, ¿qué terapia de mantenimiento se recomienda tras respuesta a platinos en pacientes BRCA mutadas?",
    [
        "Olaparib",
        "Bevacizumab",
        "Paclitaxel semanal",
        "Pembrolizumab",
    ],
    0,
    "Olaparib en mantenimiento prolonga la supervivencia libre de progresión en pacientes con mutación BRCA tras respuesta a platinos.",
)

add_question(
    "Tumores sólidos",
    "Ginecológico",
    "Intermedio",
    "¿Qué estadio FIGO de cáncer de cérvix se trata con radioquimioterapia definitiva?",
    [
        "IIB",
        "IA1",
        "IB1",
        "IIA1",
    ],
    0,
    "La afectación parametrial (estadio IIB) impide la cirugía radical primaria y se maneja con radioquimioterapia concurrente.",
)

add_question(
    "Tumores sólidos",
    "Ginecológico",
    "Avanzado",
    "¿Qué terapia dirigida se emplea en cáncer de endometrio avanzado con inestabilidad de microsatélites?",
    [
        "Pembrolizumab",
        "Bevacizumab",
        "Rucaparib",
        "Pazopanib",
    ],
    0,
    "Los tumores MSI-H responden a inhibidores de PD-1 como pembrolizumab tras quimioterapia.",
)

add_question(
    "Tumores sólidos",
    "Ginecológico",
    "Básico",
    "¿Qué factor incrementa el riesgo de cáncer de endometrio tipo I?",
    [
        "Obesidad y anovulación crónica",
        "Uso prolongado de anticonceptivos combinados",
        "Historia de embarazos múltiples",
        "Tabaquismo",
    ],
    0,
    "La exposición prolongada a estrógenos sin oposición (como en obesidad o síndrome de ovario poliquístico) eleva el riesgo de cáncer endometrioide.",
)

add_question(
    "Tumores sólidos",
    "Ginecológico",
    "Intermedio",
    "¿Qué rol tiene la cirugía de citorreducción secundaria en cáncer de ovario sensible a platinos?",
    [
        "Mejora la supervivencia si se logra resección completa",
        "Solo palia síntomas",
        "Se contraindica en recaída",
        "Sustituye a la quimioterapia",
    ],
    0,
    "En pacientes seleccionadas con recaída platino-sensible, la citorreducción secundaria completa mejora supervivencia global.",
)

add_question(
    "Tumores sólidos",
    "Ginecológico",
    "Avanzado",
    "¿Qué combinación se usa en cáncer de ovario platino-resistente con sobreexpresión de FRα?",
    [
        "Mirvetuximab soravtansine + bevacizumab",
        "Trabectedina + doxorrubicina",
        "Pazopanib + gemcitabina",
        "Ipilimumab + nivolumab",
    ],
    0,
    "Mirvetuximab, un conjugado anti-FRα, combinado con bevacizumab mejora respuestas en tumores con alta expresión del receptor folato α.",
)

add_question(
    "Tumores sólidos",
    "Ginecológico",
    "Avanzado",
    "En cáncer de cuello uterino metastásico PD-L1 positivo, ¿qué añade pembrolizumab al tratamiento estándar?",
    [
        "Incrementa supervivencia global combinado con quimioterapia ± bevacizumab",
        "Sustituye totalmente la quimioterapia",
        "Solo reduce toxicidad",
        "Evita la radioterapia",
    ],
    0,
    "El estudio KEYNOTE-826 mostró beneficio en supervivencia global al añadir pembrolizumab a quimioterapia con o sin bevacizumab.",
)

add_question(
    "Tumores sólidos",
    "Ginecológico",
    "Intermedio",
    "¿Qué prueba genética se recomienda en cáncer de ovario epitelial de alto grado?",
    [
        "Estudio germinal y somático de BRCA1/2",
        "Panel de genes cardiacos",
        "Estudio de RET",
        "Análisis KRAS",
    ],
    0,
    "Se aconseja realizar estudio germinal y somático de BRCA porque condiciona terapia con inhibidores de PARP y asesoramiento familiar.",
)

# Tumores sólidos - Urológico
add_question(
    "Tumores sólidos",
    "Urológico",
    "Básico",
    "¿Qué marcador tumoral es útil para seguimiento de cáncer de próstata?",
    [
        "PSA",
        "CA 19-9",
        "Calcitonina",
        "CA 125",
    ],
    0,
    "El PSA se emplea en cribado, diagnóstico y seguimiento del cáncer de próstata, aunque no es específico.",
)

add_question(
    "Tumores sólidos",
    "Urológico",
    "Básico",
    "En cáncer de vejiga músculo invasivo, ¿cuál es el tratamiento estándar?",
    [
        "Cistectomía radical con quimioterapia neoadyuvante",
        "Cistoscopia cada 3 meses",
        "Radioterapia exclusiva",
        "Inmunoterapia en monoterapia",
    ],
    0,
    "La cistectomía radical precedida de quimioterapia basada en platinos es el tratamiento estándar para enfermedad músculo invasiva.",
)

add_question(
    "Tumores sólidos",
    "Urológico",
    "Intermedio",
    "¿Qué terapia sistémica se recomienda en carcinoma renal metastásico de riesgo intermedio/alto?",
    [
        "Combinaciones de inmunoterapia (nivolumab + ipilimumab)",
        "Interferón alfa",
        "Quimioterapia con gemcitabina",
        "Hormonoterapia",
    ],
    0,
    "Las combinaciones de inmunoterapia (nivolumab + ipilimumab) son estándar en riesgo intermedio/alto según IMDC.",
)

add_question(
    "Tumores sólidos",
    "Urológico",
    "Intermedio",
    "¿Qué tipo histológico de testículo requiere bleomicina-etopósido-cisplatino (BEP) como estándar?",
    [
        "Tumores de células germinales",
        "Tumores de Sertoli",
        "Carcinoma epidermoide",
        "Sarcoma paratesticular",
    ],
    0,
    "Los tumores germinales testiculares metastásicos se tratan con esquemas BEP, logrando altas tasas de curación.",
)

add_question(
    "Tumores sólidos",
    "Urológico",
    "Avanzado",
    "En cáncer de próstata resistente a castración con metástasis óseas, ¿qué agente radiofármaco mejora supervivencia?",
    [
        "Radium-223",
        "Estroncio-89",
        "Ytrio-90",
        "Iodo-131",
    ],
    0,
    "El radio-223 prolonga supervivencia y reduce eventos óseos en pacientes con metástasis óseas sintomáticas sin enfermedad visceral extensa.",
)

add_question(
    "Tumores sólidos",
    "Urológico",
    "Básico",
    "¿Qué factor de riesgo se asocia al carcinoma urotelial?",
    [
        "Tabaquismo",
        "Consumo moderado de alcohol",
        "Dieta rica en fibra",
        "Osteoporosis",
    ],
    0,
    "El tabaquismo es el principal factor de riesgo modificable para cáncer urotelial de vejiga.",
)

add_question(
    "Tumores sólidos",
    "Urológico",
    "Intermedio",
    "¿Cuál es la indicación de tratamiento focal con terapia focal (HIFU, cryo) en próstata?",
    [
        "En tumores localizados de bajo riesgo seleccionados",
        "En enfermedad metastásica",
        "En recidiva bioquímica",
        "En tumores de alto riesgo",
    ],
    0,
    "Las terapias focales se reservan para pacientes muy seleccionados con enfermedad localizada de bajo riesgo dentro de protocolos.",
)

add_question(
    "Tumores sólidos",
    "Urológico",
    "Avanzado",
    "¿Qué marcador molecular define tratamiento con inhibidores de PARP en cáncer de próstata metastásico?",
    [
        "Alteraciones en genes de reparación como BRCA1/2",
        "PTEN positivo",
        "Amplificación de EGFR",
        "Mutación ESR1",
    ],
    0,
    "Las alteraciones en genes de recombinación homóloga (BRCA1/2, ATM) identifican candidatos a inhibidores de PARP.",
)

add_question(
    "Tumores sólidos",
    "Urológico",
    "Intermedio",
    "¿Qué esquema neoadyuvante se emplea en cistectomía radical?",
    [
        "Cisplatino + gemcitabina",
        "Paclitaxel + carboplatino",
        "FOLFOX",
        "Docetaxel + prednisona",
    ],
    0,
    "Los regímenes basados en cisplatino (MVAC o cisplatino-gemcitabina) mejoran supervivencia en cistectomía radical.",
)

add_question(
    "Tumores sólidos",
    "Urológico",
    "Avanzado",
    "¿Qué acción tiene el lutecio-177-PSMA en cáncer de próstata metastásico?",
    [
        "Entrega radiación dirigida a células PSMA positivas",
        "Inhibe AR directamente",
        "Bloquea VEGF",
        "Estimula linfocitos T",
    ],
    0,
    "El radiofármaco lutecio-177-PSMA se une a PSMA en células tumorales y emite radiación beta para destruirlas.",
)

# Tumores sólidos - Cabeza y cuello
add_question(
    "Tumores sólidos",
    "Cabeza y cuello",
    "Básico",
    "¿Qué virus se asocia a carcinomas orofaríngeos positivos para p16?",
    [
        "Virus del papiloma humano",
        "Virus de Epstein-Barr",
        "Virus de la hepatitis B",
        "Citomegalovirus",
    ],
    0,
    "Los carcinomas orofaríngeos relacionados con VPH suelen ser p16 positivos y tienen mejor pronóstico.",
)

add_question(
    "Tumores sólidos",
    "Cabeza y cuello",
    "Básico",
    "¿Cuál es el tratamiento estándar del carcinoma glótico temprano T1-T2?",
    [
        "Radioterapia o cirugía conservadora",
        "Quimioterapia exclusiva",
        "Laringectomía total",
        "Inmunoterapia",
    ],
    0,
    "En estadios tempranos, radioterapia o microcirugía endoscópica ofrecen tasas de curación elevadas preservando la función laríngea.",
)

add_question(
    "Tumores sólidos",
    "Cabeza y cuello",
    "Intermedio",
    "¿Qué terapia sistémica se añade a la radioterapia en carcinoma de nasofaringe localmente avanzado?",
    [
        "Quimioterapia basada en platinos",
        "Cetuximab",
        "Imatinib",
        "Bevacizumab",
    ],
    0,
    "La radioquimioterapia con platinos es estándar en nasofaringe localmente avanzado debido a radiosensibilidad tumoral.",
)

add_question(
    "Tumores sólidos",
    "Cabeza y cuello",
    "Intermedio",
    "En carcinoma de cavidad oral T3-T4 resecable, ¿qué estrategia es preferente?",
    [
        "Cirugía seguida de radio o radioquimioterapia adyuvante",
        "Radioterapia definitiva",
        "Quimioterapia neoadyuvante exclusiva",
        "Quimio-inmunoterapia",
    ],
    0,
    "La cirugía con márgenes adecuados seguida de terapia adyuvante según factores de riesgo es el estándar en tumores resecables avanzados.",
)

add_question(
    "Tumores sólidos",
    "Cabeza y cuello",
    "Avanzado",
    "¿Qué combinación inmunoterápica se usa en recaída/metástasis tras platino?",
    [
        "Nivolumab o pembrolizumab",
        "Durvalumab + tremelimumab",
        "Ipilimumab + nivolumab",
        "Atezolizumab + bevacizumab",
    ],
    0,
    "Nivolumab o pembrolizumab están aprobados tras progresión a platino al mejorar supervivencia global.",
)

add_question(
    "Tumores sólidos",
    "Cabeza y cuello",
    "Básico",
    "¿Qué hábito es el principal factor de riesgo para cáncer de cavidad oral?",
    [
        "Tabaquismo y consumo de alcohol",
        "Dieta rica en frutas",
        "Ejercicio regular",
        "Uso de protectores bucales",
    ],
    0,
    "La combinación de tabaco y alcohol multiplica el riesgo de carcinomas escamosos en cavidad oral.",
)

add_question(
    "Tumores sólidos",
    "Cabeza y cuello",
    "Intermedio",
    "¿Qué complicación tardía es frecuente tras radioterapia de cabeza y cuello?",
    [
        "Xerostomía",
        "Hipertensión",
        "Retinopatía",
        "Polineuropatía",
    ],
    0,
    "La radioterapia sobre glándulas salivales produce xerostomía, que deteriora calidad de vida y favorece caries.",
)

add_question(
    "Tumores sólidos",
    "Cabeza y cuello",
    "Avanzado",
    "En carcinoma orofaríngeo VPH positivo con buena respuesta inicial, ¿qué estrategia se investiga para reducir toxicidad?",
    [
        "De-escalada de tratamiento (dosis menores o menos quimioterapia)",
        "Aumentar dosis de radioterapia",
        "Suspender la cirugía",
        "Añadir quimioterapia intensiva",
    ],
    0,
    "Se exploran esquemas de de-escalada para reducir secuelas manteniendo control tumoral en pacientes con pronóstico favorable.",
)

add_question(
    "Tumores sólidos",
    "Cabeza y cuello",
    "Intermedio",
    "¿Cuál es el estándar para carcinoma de laringe avanzado no resecable buscando preservación de órgano?",
    [
        "Quimiorradioterapia concurrente",
        "Laringectomía total",
        "Radioterapia exclusiva",
        "Quimioterapia adyuvante",
    ],
    0,
    "La quimiorradioterapia concurrente logra control tumoral y puede preservar la laringe en enfermedad avanzada no resecable.",
)

add_question(
    "Tumores sólidos",
    "Cabeza y cuello",
    "Avanzado",
    "¿Qué síntoma obliga a descartar osteorradionecrosis mandibular postradioterapia?",
    [
        "Exposición ósea dolorosa persistente",
        "Rinitis",
        "Disfonía transitoria",
        "Hipo",
    ],
    0,
    "La exposición ósea mandibular con dolor tras radioterapia sugiere osteorradionecrosis y requiere manejo multidisciplinar.",
)

# Tumores sólidos - Melanoma
add_question(
    "Tumores sólidos",
    "Melanoma",
    "Básico",
    "¿Qué mutación driver es más frecuente en melanoma cutáneo?",
    [
        "BRAF V600",
        "EGFR",
        "ALK",
        "RET",
    ],
    0,
    "Aproximadamente la mitad de los melanomas cutáneos presentan mutación BRAF V600, útil para terapia dirigida con BRAF/MEK.",
)

add_question(
    "Tumores sólidos",
    "Melanoma",
    "Básico",
    "¿Cuál es el factor pronóstico más relevante en melanoma localizado?",
    [
        "Espesor de Breslow",
        "Color de la lesión",
        "Localización",
        "Edad del paciente",
    ],
    0,
    "El espesor de Breslow determina el riesgo de metástasis y la indicación de biopsia del ganglio centinela.",
)

add_question(
    "Tumores sólidos",
    "Melanoma",
    "Intermedio",
    "¿Qué tratamiento adyuvante se recomienda en melanoma estadio III BRAF mutado tras cirugía?",
    [
        "Dabrafenib + trametinib",
        "Interferón alfa",
        "Quimioterapia con dacarbazina",
        "Imiquimod tópico",
    ],
    0,
    "La combinación de inhibidores BRAF/MEK reduce recaídas en pacientes con mutación BRAF y alto riesgo.",
)

add_question(
    "Tumores sólidos",
    "Melanoma",
    "Intermedio",
    "¿Qué combinación inmunoterápica se usa en melanoma metastásico de alto volumen tumoral?",
    [
        "Nivolumab + ipilimumab",
        "Pembrolizumab + bevacizumab",
        "Atezolizumab + cetuximab",
        "Durvalumab + trastuzumab",
    ],
    0,
    "Nivolumab más ipilimumab aumenta la tasa de respuesta profunda en enfermedad de alto volumen, aunque con mayor toxicidad.",
)

add_question(
    "Tumores sólidos",
    "Melanoma",
    "Avanzado",
    "En pacientes con metástasis cerebrales asintomáticas y mutación BRAF, ¿qué estrategia obtiene respuestas rápidas?",
    [
        "Inhibidores BRAF/MEK",
        "Radioterapia holocraneal",
        "Quimioterapia con temozolomida",
        "Interferón intratecal",
    ],
    0,
    "Los inhibidores BRAF/MEK proporcionan respuestas rápidas intracraneales en metastásis cerebrales de melanoma BRAF mutado.",
)

add_question(
    "Tumores sólidos",
    "Melanoma",
    "Básico",
    "¿Qué técnica diagnóstica se utiliza para evaluar ganglio centinela en melanoma?",
    [
        "Biopsia ganglionar selectiva con linfogammagrafía previa",
        "Punción aspirativa",
        "PET-TC",
        "Ecografía Doppler",
    ],
    0,
    "La biopsia del ganglio centinela guiada por linfogammagrafía y colorante identifica micrometástasis ganglionares.",
)

add_question(
    "Tumores sólidos",
    "Melanoma",
    "Intermedio",
    "¿Qué efecto adverso inmunomediado es frecuente con anti-PD-1?",
    [
        "Hipotiroidismo",
        "Anemia hemolítica",
        "Neuropatía desmielinizante",
        "Ceguera súbita",
    ],
    0,
    "El hipotiroidismo por tiroiditis autoinmune es frecuente con inhibidores de PD-1 y suele manejarse con levotiroxina.",
)

add_question(
    "Tumores sólidos",
    "Melanoma",
    "Avanzado",
    "¿Qué factor predice respuesta a terapia dirigida con BRAF/MEK?",
    [
        "Mutación BRAF V600",
        "Expresión PD-L1",
        "Alteración KIT",
        "Amplificación HER2",
    ],
    0,
    "La presencia de mutación BRAF V600 es requisito para usar inhibidores de BRAF y MEK.",
)

add_question(
    "Tumores sólidos",
    "Melanoma",
    "Básico",
    "¿Cuál es la recomendación para lesiones melanocíticas sospechosas?",
    [
        "Escisión completa con márgenes estrechos",
        "Biopsia incisional",
        "Crioterapia",
        "Láser CO2",
    ],
    0,
    "La excisión completa permite evaluar espesor y márgenes; se evita biopsia parcial para no subestimar.",
)

add_question(
    "Tumores sólidos",
    "Melanoma",
    "Avanzado",
    "¿Qué estrategia se evalúa tras respuesta completa mantenida con inmunoterapia?",
    [
        "Suspender tratamiento tras 2 años",
        "Continuar indefinidamente",
        "Cambiar a terapia dirigida",
        "Añadir radioterapia profiláctica",
    ],
    0,
    "Muchos ensayos permiten suspender inmunoterapia tras 2 años de respuesta mantenida, vigilando recaídas.",
)

# Tumores sólidos - Sarcomas
add_question(
    "Tumores sólidos",
    "Sarcomas",
    "Básico",
    "¿Cuál es el tratamiento principal del sarcoma de partes blandas localizado de extremidades?",
    [
        "Cirugía con márgenes amplios",
        "Quimioterapia exclusiva",
        "Radioterapia exclusiva",
        "Embolización",
    ],
    0,
    "La cirugía con márgenes adecuados es fundamental para el control local en sarcomas de extremidades.",
)

add_question(
    "Tumores sólidos",
    "Sarcomas",
    "Básico",
    "¿Qué prueba de imagen es esencial para estadificar sarcomas profundos de extremidad?",
    [
        "Resonancia magnética",
        "Ecografía",
        "Radiografía simple",
        "PET de cuerpo completo",
    ],
    0,
    "La resonancia magnética define extensión local y relación con estructuras neurovasculares.",
)

add_question(
    "Tumores sólidos",
    "Sarcomas",
    "Intermedio",
    "¿Qué fármaco es estándar en primera línea de sarcoma avanzado?",
    [
        "Doxorrubicina",
        "Imatinib",
        "Pazopanib",
        "Gemcitabina",
    ],
    0,
    "La doxorrubicina en monoterapia o combinada es el estándar inicial para la mayoría de sarcomas avanzados.",
)

add_question(
    "Tumores sólidos",
    "Sarcomas",
    "Intermedio",
    "¿Qué terapia dirigida es clave en tumores GIST con mutación KIT?",
    [
        "Imatinib",
        "Sorafenib",
        "Sunitinib",
        "Cediranib",
    ],
    0,
    "Imatinib bloquea KIT y es estándar en GIST avanzado o en adyuvancia en tumores de alto riesgo con mutación sensible.",
)

add_question(
    "Tumores sólidos",
    "Sarcomas",
    "Avanzado",
    "En GIST resistente a imatinib y sunitinib, ¿qué opción continúa la secuencia?",
    [
        "Regorafenib",
        "Pazopanib",
        "Lenvatinib",
        "Everolimus",
    ],
    0,
    "Regorafenib es el inhibidor multiquinasa aprobado tras fracaso de imatinib y sunitinib en GIST.",
)

add_question(
    "Tumores sólidos",
    "Sarcomas",
    "Básico",
    "¿Qué subtipo de sarcoma es radiosensible y se beneficia de radioterapia adyuvante?",
    [
        "Sarcoma mixoide de tejidos blandos",
        "Liposarcoma bien diferenciado",
        "Sarcoma epitelioide",
        "Fibrosarcoma",
    ],
    0,
    "El sarcoma mixoide responde bien a radioterapia, utilizada junto a cirugía para mejorar control local.",
)

add_question(
    "Tumores sólidos",
    "Sarcomas",
    "Intermedio",
    "En sarcoma sinovial, ¿qué fusión génica característica puede detectarse?",
    [
        "SS18-SSX",
        "EWSR1-FLI1",
        "ETV6-NTRK3",
        "ALK-EML4",
    ],
    0,
    "La fusión SS18-SSX es patognomónica de sarcoma sinovial y apoya el diagnóstico.",
)

add_question(
    "Tumores sólidos",
    "Sarcomas",
    "Avanzado",
    "¿Qué agente se emplea en liposarcoma mixoide metastásico tras antraciclinas?",
    [
        "Trabectedina",
        "Gemcitabina",
        "Temozolomida",
        "Capecitabina",
    ],
    0,
    "Trabectedina muestra actividad notable en liposarcoma mixoide y leiomiosarcoma tras antraciclinas.",
)

add_question(
    "Tumores sólidos",
    "Sarcomas",
    "Intermedio",
    "¿Qué síndrome familiar se asocia a leiomiosarcomas uterinos?",
    [
        "Síndrome de Lynch",
        "Neurofibromatosis tipo 1",
        "Von Hippel-Lindau",
        "MEN2",
    ],
    0,
    "El síndrome de Lynch incrementa riesgo de cánceres uterinos incluyendo leiomiosarcomas.",
)

add_question(
    "Tumores sólidos",
    "Sarcomas",
    "Avanzado",
    "¿Cuál es la principal vía de metástasis de osteosarcoma?",
    [
        "Pulmones",
        "Hígado",
        "Cerebro",
        "Huesos largos contralaterales",
    ],
    0,
    "El osteosarcoma metastatiza principalmente al pulmón, lo que condiciona el seguimiento con TAC torácico.",
)

# Hemato-oncología - Leucemias
add_question(
    "Hemato-oncología",
    "Leucemias",
    "Básico",
    "¿Qué alteración genética define la leucemia mieloide crónica?",
    [
        "Traslocación t(9;22) BCR-ABL",
        "Mutación JAK2 V617F",
        "Deleción 13q",
        "FLT3-ITD",
    ],
    0,
    "La presencia del cromosoma Filadelfia y la proteína de fusión BCR-ABL caracterizan la LMC.",
)

add_question(
    "Hemato-oncología",
    "Leucemias",
    "Básico",
    "¿Qué tratamiento inicial se utiliza en leucemia linfática crónica sintomática con del17p?",
    [
        "Inhibidores de BTK (ibrutinib) o venetoclax",
        "Quimioinmunoterapia FCR",
        "Clorambucilo",
        "Interferón alfa",
    ],
    0,
    "Las deleciones 17p confieren resistencia a quimioterapia; se prefieren terapias dirigidas como ibrutinib o venetoclax.",
)

add_question(
    "Hemato-oncología",
    "Leucemias",
    "Intermedio",
    "En leucemia aguda promielocítica, ¿qué combinación se emplea en primera línea?",
    [
        "Ácido transretinoico (ATRA) + trióxido de arsénico",
        "Antraciclinas + citarabina",
        "Imatinib",
        "Metotrexato",
    ],
    0,
    "ATRA junto con trióxido de arsénico ha reemplazado la quimioterapia intensiva en formas de riesgo bajo-intermedio.",
)

add_question(
    "Hemato-oncología",
    "Leucemias",
    "Intermedio",
    "¿Qué mutación implica mal pronóstico en leucemia mieloide aguda normal cariotipo?",
    [
        "FLT3-ITD",
        "NPM1",
        "CEBPA bialélica",
        "IDH1",
    ],
    0,
    "La mutación FLT3-ITD confiere alto riesgo de recaída y se asocia a uso de inhibidores FLT3 y trasplante alogénico.",
)

add_question(
    "Hemato-oncología",
    "Leucemias",
    "Avanzado",
    "¿Cuál es la indicación del trasplante alogénico en leucemia linfoblástica aguda del adulto?",
    [
        "Alto riesgo citogenético o respuesta subóptima",
        "Todos los pacientes en primera remisión",
        "Solo recaídas tardías",
        "Nunca se indica",
    ],
    0,
    "Los adultos con alto riesgo biológico o enfermedad residual mínima positiva suelen beneficiarse de trasplante alogénico en primera remisión.",
)

add_question(
    "Hemato-oncología",
    "Leucemias",
    "Básico",
    "¿Qué signo clínico clásico sugiere leucemia aguda?",
    [
        "Pancitopenia con síndrome constitucional",
        "Hiperglucemia",
        "Hipertensión",
        "Aumento de ferritina",
    ],
    0,
    "La leucemia aguda suele debutar con pancitopenia, fiebre, infecciones y hemorragias por fallo de médula ósea.",
)

add_question(
    "Hemato-oncología",
    "Leucemias",
    "Intermedio",
    "¿Qué terapia dirigida se usa en LMC resistente a imatinib con mutación T315I?",
    [
        "Ponatinib",
        "Nilotinib",
        "Dasatinib",
        "Bosutinib",
    ],
    0,
    "Ponatinib es activo frente a la mutación T315I, responsable de resistencia a otros ITK.",
)

add_question(
    "Hemato-oncología",
    "Leucemias",
    "Avanzado",
    "¿Qué estrategia reduce síndrome de lisis tumoral al iniciar venetoclax?",
    [
        "Escalado gradual de dosis y profilaxis intensiva",
        "Inicio a dosis alta",
        "Suspender hidratación",
        "Añadir interleucina-2",
    ],
    0,
    "El escalado paulatino con hidratación y alopurinol previene síndrome de lisis tumoral con venetoclax.",
)

add_question(
    "Hemato-oncología",
    "Leucemias",
    "Intermedio",
    "¿Qué marcador de enfermedad residual mínima se usa en LLA B?",
    [
        "Citometría de flujo multiparamétrica",
        "PCR de BCR-ABL",
        "Electroforesis de proteínas",
        "Test de Coombs",
    ],
    0,
    "La evaluación de enfermedad residual minima mediante citometría o PCR específica orienta el pronóstico y tratamiento en LLA.",
)

add_question(
    "Hemato-oncología",
    "Leucemias",
    "Avanzado",
    "¿Qué terapia celular se recomienda en LLA B refractaria?",
    [
        "CAR-T anti-CD19",
        "Trasplante autólogo",
        "Lenalidomida",
        "Bortezomib",
    ],
    0,
    "Las terapias CAR-T contra CD19 logran respuestas profundas en LLA B refractaria o en recaída.",
)

# Hemato-oncología - Linfomas
add_question(
    "Hemato-oncología",
    "Linfomas",
    "Básico",
    "¿Cuál es el esquema estándar de primera línea en linfoma difuso de células B grandes?",
    [
        "R-CHOP",
        "ABVD",
        "Bendamustina-rituximab",
        "HyperCVAD",
    ],
    0,
    "R-CHOP (rituximab, ciclofosfamida, doxorrubicina, vincristina y prednisona) es el tratamiento estándar inicial.",
)

add_question(
    "Hemato-oncología",
    "Linfomas",
    "Básico",
    "¿Qué terapia se utiliza en linfoma de Hodgkin clásico en estadios avanzados?",
    [
        "ABVD",
        "BEACOPP",
        "CHOP",
        "ICE",
    ],
    0,
    "El esquema ABVD es estándar en estadios avanzados de linfoma de Hodgkin, con posible escalado según respuesta.",
)

add_question(
    "Hemato-oncología",
    "Linfomas",
    "Intermedio",
    "¿Qué anticuerpo biespecífico se usa en linfoma B replanteado tras múltiples líneas?",
    [
        "Glofitamab",
        "Alemtuzumab",
        "Belantamab",
        "Daratumumab",
    ],
    0,
    "Glofitamab es un anticuerpo biespecífico CD20xCD3 aprobado para linfoma B en recaída refractaria.",
)

add_question(
    "Hemato-oncología",
    "Linfomas",
    "Intermedio",
    "En linfoma folicular grado 1-2 sintomático, ¿qué combinación se emplea en primera línea?",
    [
        "Rituximab + bendamustina",
        "Lenalidomida",
        "Fludarabina",
        "Cladribina",
    ],
    0,
    "Rituximab con bendamustina ofrece altas tasas de respuesta y buena tolerancia en linfoma folicular.",
)

add_question(
    "Hemato-oncología",
    "Linfomas",
    "Avanzado",
    "¿Qué papel tiene CAR-T en linfoma difuso B en segunda línea?",
    [
        "Indicado en recaída temprana tras R-CHOP",
        "Solo tercera línea",
        "Contraindicado",
        "Solo en recaídas tardías",
    ],
    0,
    "Tras recaída temprana o refractariedad a R-CHOP, CAR-T dirigidos a CD19 han demostrado superioridad frente a quimio-rescate.",
)

add_question(
    "Hemato-oncología",
    "Linfomas",
    "Básico",
    "¿Qué marcador de proliferación se usa para diferenciar linfoma indolente de agresivo?",
    [
        "Ki-67",
        "CD30",
        "CD23",
        "Cyclin D1",
    ],
    0,
    "El índice Ki-67 elevado sugiere comportamiento agresivo y ayuda a categorizar linfomas.",
)

add_question(
    "Hemato-oncología",
    "Linfomas",
    "Intermedio",
    "¿Qué factor pronóstico se incluye en el IPI?",
    [
        "Edad >60 años",
        "Nivel normal de LDH",
        "Sexo",
        "Antecedente familiar",
    ],
    0,
    "El International Prognostic Index valora edad, LDH, ECOG, estadio y número de sitios extranodales.",
)

add_question(
    "Hemato-oncología",
    "Linfomas",
    "Avanzado",
    "En linfoma de Hodgkin refractario, ¿qué nuevo anticuerpo-drug conjugate se usa?",
    [
        "Brentuximab vedotina",
        "Trastuzumab deruxtecan",
        "Sacituzumab govitecan",
        "Belantamab mafodotin",
    ],
    0,
    "Brentuximab vedotina dirigido a CD30 es eficaz tras recaída post-trasplante autólogo o en segunda línea.",
)

add_question(
    "Hemato-oncología",
    "Linfomas",
    "Intermedio",
    "¿Qué patología viral está ligada a linfoma de Burkitt endémico?",
    [
        "Virus de Epstein-Barr",
        "Virus de la hepatitis C",
        "HTLV-1",
        "VPH",
    ],
    0,
    "El linfoma de Burkitt endémico se asocia estrechamente con infección por EBV.",
)

add_question(
    "Hemato-oncología",
    "Linfomas",
    "Avanzado",
    "¿Qué terapia se considera en linfoma T periférico recaído?",
    [
        "Trasplante autólogo o alogénico",
        "Imatinib",
        "Lenalidomida",
        "Bevacizumab",
    ],
    0,
    "Los linfomas T periféricos tienen mal pronóstico y se candidatan a trasplante tras respuesta.",
)

# Hemato-oncología - Mieloma
add_question(
    "Hemato-oncología",
    "Mieloma",
    "Básico",
    "¿Qué criterio define mieloma múltiple sintomático?",
    [
        "Lesiones CRAB o biomarcadores específicos",
        "Proteinuria de Bence Jones aislada",
        "Presencia de MGUS",
        "Osteopenia leve",
    ],
    0,
    "El mieloma sintomático requiere daño orgánico (hipercalcemia, insuficiencia renal, anemia, lesiones óseas) o biomarcadores como ≥60% plasmocitos medulares.",
)

add_question(
    "Hemato-oncología",
    "Mieloma",
    "Básico",
    "¿Cuál es el tratamiento de inducción estándar en pacientes candidatos a trasplante autólogo?",
    [
        "Bortezomib + lenalidomida + dexametasona (VRd)",
        "Melphalan oral",
        "Lenalidomida en monoterapia",
        "Clorambucilo",
    ],
    0,
    "VRd es la combinación más utilizada previa a la aféresis para trasplante autólogo.",
)

add_question(
    "Hemato-oncología",
    "Mieloma",
    "Intermedio",
    "¿Qué estudio se realiza para evaluar citogenética de alto riesgo en mieloma?",
    [
        "FISH para t(4;14), t(14;16), del17p",
        "Cariotipo convencional",
        "Secuenciación de panel de exoma",
        "PCR cuantitativa",
    ],
    0,
    "Las alteraciones de alto riesgo se identifican mediante FISH en plasmocitos enriquecidos.",
)

add_question(
    "Hemato-oncología",
    "Mieloma",
    "Intermedio",
    "¿Qué agente anti-CD38 se añade a regímenes de primera línea en pacientes no candidatos a trasplante?",
    [
        "Daratumumab",
        "Elotuzumab",
        "Belantamab",
        "Inotuzumab",
    ],
    0,
    "Daratumumab combinado con lenalidomida-dexametasona o VMP mejora la supervivencia en pacientes ineligibles a trasplante.",
)

add_question(
    "Hemato-oncología",
    "Mieloma",
    "Avanzado",
    "¿Qué terapia celular emergente se usa en mieloma refractario triple clase?",
    [
        "CAR-T anti-BCMA",
        "Trasplante autólogo repetido",
        "Interferón",
        "Lenalidomida",
    ],
    0,
    "Las terapias CAR-T dirigidas a BCMA han mostrado respuestas profundas en mieloma refractario a múltiples líneas.",
)

add_question(
    "Hemato-oncología",
    "Mieloma",
    "Básico",
    "¿Qué prueba de imagen se recomienda inicial para detectar lesiones óseas?",
    [
        "Tomografía de cuerpo entero de baja dosis",
        "Radiografía simple",
        "PET-FDG",
        "Gammagrafía ósea",
    ],
    0,
    "Las guías recomiendan TAC de cuerpo entero de baja dosis o PET-TC para detectar lesiones líticas con mayor sensibilidad.",
)

add_question(
    "Hemato-oncología",
    "Mieloma",
    "Intermedio",
    "¿Qué profilaxis se debe administrar en pacientes tratados con lenalidomida?",
    [
        "Tromboprofilaxis (aspirina o anticoagulación)",
        "Vacuna antineumocócica",
        "Calcio y vitamina D",
        "Fluconazol",
    ],
    0,
    "Lenalidomida aumenta riesgo trombótico; se requiere profilaxis según factores de riesgo.",
)

add_question(
    "Hemato-oncología",
    "Mieloma",
    "Avanzado",
    "¿Qué combina teclistamab en mieloma refractario?",
    [
        "Anticuerpo biespecífico BCMAxCD3",
        "Inhibidor de proteasoma",
        "Agente alquilante",
        "Radiofármaco",
    ],
    0,
    "Teclistamab es un anticuerpo biespecífico que acerca linfocitos T a células plasmáticas expresando BCMA.",
)

add_question(
    "Hemato-oncología",
    "Mieloma",
    "Intermedio",
    "¿Qué define la respuesta completa estricta según IMWG?",
    [
        "Inmunofijación negativa y <5% plasmocitos",
        "Desaparición de síntomas",
        "Reducción de M-proteína 50%",
        "Hemoglobina normal",
    ],
    0,
    "La respuesta completa estricta exige inmunofijación negativa en suero/orina, <5% plasmocitos y cadenas ligeras libres normalizadas.",
)

add_question(
    "Hemato-oncología",
    "Mieloma",
    "Avanzado",
    "¿Qué agente reduce riesgo de eventos óseos en mieloma?",
    [
        "Ácido zoledrónico",
        "Prednisona",
        "Carfilzomib",
        "G-CSF",
    ],
    0,
    "Los bisfosfonatos como ácido zoledrónico disminuyen eventos óseos y dolor en mieloma.",
)

# Cuidados de soporte - Antiemesis
add_question(
    "Cuidados de soporte",
    "Antiemesis",
    "Básico",
    "¿Qué esquema se recomienda en quimioterapia altamente emetógena como cisplatino?",
    [
        "Antagonista 5-HT3 + dexametasona + antagonista NK1",
        "Metoclopramida",
        "Ondansetrón solo",
        "Lorazepam en monoterapia",
    ],
    0,
    "Las pautas de alto riesgo requieren triple terapia combinando antagonista 5-HT3, dexametasona y antagonista NK1.",
)

add_question(
    "Cuidados de soporte",
    "Antiemesis",
    "Básico",
    "¿Qué antiemético se añade para prevenir náuseas anticipatorias?",
    [
        "Benzodiacepinas",
        "Haloperidol",
        "Octreótido",
        "Escopolamina",
    ],
    0,
    "Las benzodiacepinas como lorazepam ayudan a reducir las náuseas anticipatorias asociadas a quimioterapia.",
)

add_question(
    "Cuidados de soporte",
    "Antiemesis",
    "Intermedio",
    "¿Qué fármaco se incluye para prevenir emesis tardía en cisplatino?",
    [
        "Antagonista NK1",
        "Metoclopramida",
        "Dimenhidrinato",
        "Difenhidramina",
    ],
    0,
    "Los antagonistas de NK1 (aprepitant, fosaprepitant) reducen náuseas tardías inducidas por quimioterapia altamente emetógena.",
)

add_question(
    "Cuidados de soporte",
    "Antiemesis",
    "Intermedio",
    "¿Qué diferencia existe entre ondasetrón y palonosetrón?",
    [
        "Palonosetrón tiene vida media más larga y cubre fase tardía",
        "Ondasetrón cruza mejor barrera hematoencefálica",
        "Palonosetrón solo bloquea NK1",
        "No hay diferencias",
    ],
    0,
    "Palonosetrón presenta mayor afinidad y vida media prolongada, útil para fase aguda y tardía de emesis.",
)

add_question(
    "Cuidados de soporte",
    "Antiemesis",
    "Avanzado",
    "En pacientes con doble profilaxis estándar que siguen con náuseas, ¿qué fármaco puede añadirse?",
    [
        "Olanzapina",
        "Hioscina",
        "Domperidona",
        "Naproxeno",
    ],
    0,
    "Olanzapina se asocia a reducción adicional de náuseas refractarias cuando se añade a esquemas estándar.",
)

add_question(
    "Cuidados de soporte",
    "Antiemesis",
    "Básico",
    "¿Qué profilaxis se usa en quimioterapia de bajo riesgo emético?",
    [
        "Dexametasona u ondansetrón según sea necesario",
        "Triple terapia",
        "Aprepitant",
        "Ningún tratamiento",
    ],
    0,
    "En bajo riesgo se emplea un solo agente, generalmente dexametasona o un antagonista 5-HT3 previo.",
)

add_question(
    "Cuidados de soporte",
    "Antiemesis",
    "Intermedio",
    "¿Qué antiemesis se recomienda en quimioterapia oral moderadamente emetógena?",
    [
        "Profilaxis diaria con antagonista 5-HT3",
        "Ondasetrón IV",
        "Metoclopramida cada 8 horas",
        "No precisa profilaxis",
    ],
    0,
    "Las guías sugieren antagonista 5-HT3 oral diario durante el período de administración para quimioterapia oral emetógena moderada.",
)

add_question(
    "Cuidados de soporte",
    "Antiemesis",
    "Avanzado",
    "¿Qué estrategia se utiliza en pacientes con retraso de la motilidad gástrica?",
    [
        "Añadir proquinéticos como metoclopramida",
        "Suspender antieméticos",
        "Utilizar corticoides en solitario",
        "Administrar antiácidos",
    ],
    0,
    "Los proquinéticos mejoran el vaciamiento gástrico y se combinan con antieméticos estándar en pacientes con gastroparesia.",
)

add_question(
    "Cuidados de soporte",
    "Antiemesis",
    "Intermedio",
    "¿Qué diferencia hay entre emesis aguda y tardía?",
    [
        "La aguda ocurre <24h y la tardía >24h postquimioterapia",
        "La aguda ocurre a los 3 días",
        "La tardía es previa al tratamiento",
        "No existe diferencia",
    ],
    0,
    "La emesis aguda se presenta dentro de las primeras 24 horas, mientras que la tardía aparece posteriormente.",
)

add_question(
    "Cuidados de soporte",
    "Antiemesis",
    "Avanzado",
    "¿Cómo se manejan las náuseas en quimioterapia multiday altamente emetógena?",
    [
        "Antagonista 5-HT3 diario + dexametasona + NK1",
        "Ondasetrón único el día 1",
        "Metoclopramida eventual",
        "Solo benzodiacepinas",
    ],
    0,
    "Se extrapolan esquemas de alto riesgo ajustando dosis diarias de antagonista 5-HT3 y dexametasona con NK1 durante el ciclo.",
)

# Cuidados de soporte - Infecciones
add_question(
    "Cuidados de soporte",
    "Infecciones",
    "Básico",
    "¿Qué profilaxis antimicrobiana se recomienda en neutropenia febril de alto riesgo?",
    [
        "Antibióticos de amplio espectro empíricos",
        "Penicilina oral",
        "Antivirales",
        "Ninguna",
    ],
    0,
    "La neutropenia febril de alto riesgo requiere iniciar antibióticos de amplio espectro dentro de la primera hora.",
)

add_question(
    "Cuidados de soporte",
    "Infecciones",
    "Básico",
    "¿Qué medida previene neumonía por Pneumocystis jirovecii en tumores sólidos con altas dosis de corticoides?",
    [
        "Profilaxis con trimetoprim-sulfametoxazol",
        "Profilaxis con azitromicina",
        "Vacuna antigripal",
        "Uso de probióticos",
    ],
    0,
    "La profilaxis con cotrimoxazol previene neumonía por Pneumocystis en pacientes inmunosuprimidos.",
)

add_question(
    "Cuidados de soporte",
    "Infecciones",
    "Intermedio",
    "¿Cuándo administrar G-CSF profiláctico primario?",
    [
        "Cuando el riesgo de neutropenia febril es ≥20%",
        "En todo ciclo",
        "Solo en neutropenia crónica",
        "Nunca en tumores sólidos",
    ],
    0,
    "Las guías recomiendan G-CSF primario si la quimioterapia conlleva riesgo ≥20% o hay factores adicionales.",
)

add_question(
    "Cuidados de soporte",
    "Infecciones",
    "Intermedio",
    "¿Qué vacunación anual se aconseja en pacientes oncológicos?",
    [
        "Vacuna antigripal inactivada",
        "BCG",
        "Varicela viva",
        "Fiebre amarilla",
    ],
    0,
    "Se recomienda vacunación antigripal con preparado inactivado cada temporada para reducir complicaciones.",
)

add_question(
    "Cuidados de soporte",
    "Infecciones",
    "Avanzado",
    "¿Qué pauta antiviral se utiliza en trasplante autólogo para prevenir reactivación de herpes?",
    [
        "Aciclovir",
        "Oseltamivir",
        "Ribavirina",
        "Remdesivir",
    ],
    0,
    "La profilaxis con aciclovir o valaciclovir previene reactivaciones herpéticas tras trasplante autólogo.",
)

add_question(
    "Cuidados de soporte",
    "Infecciones",
    "Básico",
    "¿Qué definición describe la sepsis en neutropenia febril?",
    [
        "Disfunción orgánica con infección probable",
        "Temperatura >39ºC",
        "Bacteriemia",
        "Neutrófilos >500",
    ],
    0,
    "La sepsis implica infección sospechada con disfunción orgánica; requiere manejo urgente siguiendo criterios SOFA/qSOFA.",
)

add_question(
    "Cuidados de soporte",
    "Infecciones",
    "Intermedio",
    "¿Qué prueba se realiza ante fiebre persistente en neutropenia pese a antibióticos?",
    [
        "TAC de tórax y senos paranasales",
        "Radiografía simple",
        "Colonoscopia",
        "Eco abdominal",
    ],
    0,
    "Un TAC de tórax y senos ayuda a detectar infecciones fúngicas o sinusales ocultas en neutropenia prolongada.",
)

add_question(
    "Cuidados de soporte",
    "Infecciones",
    "Avanzado",
    "¿Qué marcador orienta a infección fúngica invasora en neutropenia prolongada?",
    [
        "Galactomanano sérico",
        "Procalcitonina",
        "Ferritina",
        "Lactato",
    ],
    0,
    "El galactomanano es útil para detectar aspergilosis invasora, especialmente en pacientes con neutropenia prolongada.",
)

add_question(
    "Cuidados de soporte",
    "Infecciones",
    "Intermedio",
    "¿Qué medida reduce el riesgo de infección en pacientes con catéter venoso central?",
    [
        "Curar con técnica estéril y cambiar apósitos regularmente",
        "Uso rutinario de antibióticos",
        "Lavado con agua",
        "No tocar el catéter",
    ],
    0,
    "La asepsia estricta y el cuidado adecuado del catéter disminuyen la incidencia de infecciones relacionadas.",
)

add_question(
    "Cuidados de soporte",
    "Infecciones",
    "Avanzado",
    "¿Cuándo suspender profilaxis con fluoroquinolonas en neutropenia?",
    [
        "Tras recuperación de neutrófilos >500/µL sostenida",
        "Al cuarta dosis",
        "Si la fiebre persiste",
        "Nunca",
    ],
    0,
    "La profilaxis se mantiene hasta recuperar neutrófilos >500/µL de forma sostenida o finalizar el episodio de riesgo.",
)

# Cuidados paliativos - Dolor
add_question(
    "Cuidados paliativos",
    "Control del dolor",
    "Básico",
    "Según la escalera analgésica de la OMS, ¿qué se recomienda tras fracaso de opioides débiles?",
    [
        "Escalar a opioides mayores",
        "Añadir benzodiacepinas",
        "Suspender analgesia",
        "Usar AINE exclusivamente",
    ],
    0,
    "La escalera analgésica propone escalar a opioides potentes cuando los débiles no controlan el dolor moderado-severo.",
)

add_question(
    "Cuidados paliativos",
    "Control del dolor",
    "Básico",
    "¿Qué adyuvante es útil en dolor neuropático oncológico?",
    [
        "Gabapentinoides",
        "Ibuprofeno",
        "Clorpromazina",
        "Antibióticos",
    ],
    0,
    "Los gabapentinoides (gabapentina, pregabalina) son eficaces en dolor neuropático como adyuvantes de opioides.",
)

add_question(
    "Cuidados paliativos",
    "Control del dolor",
    "Intermedio",
    "¿Qué opioide es preferente en insuficiencia renal avanzada?",
    [
        "Fentanilo transdérmico",
        "Morfina",
        "Codeína",
        "Tramadol",
    ],
    0,
    "Fentanilo y buprenorfina tienen menos metabolitos activos renales y son preferibles en insuficiencia renal.",
)

add_question(
    "Cuidados paliativos",
    "Control del dolor",
    "Intermedio",
    "¿Qué recomendación se hace al iniciar opioides de liberación prolongada?",
    [
        "Mantener rescates con opioide de acción rápida",
        "Suspender laxantes",
        "Evitar rescates",
        "Administrar solo por la noche",
    ],
    0,
    "Se deben mantener rescates para dolor irruptivo y ajustar la dosis diaria según consumo adicional.",
)

add_question(
    "Cuidados paliativos",
    "Control del dolor",
    "Avanzado",
    "¿Qué técnica intervencionista se usa en dolor refractario por cáncer pancreático?",
    [
        "Bloqueo del plexo celíaco",
        "Radiofrecuencia facetaria",
        "Infiltración subacromial",
        "Electroestimulación medular",
    ],
    0,
    "El bloqueo del plexo celíaco con alcohol o fenol reduce el dolor visceral del cáncer pancreático avanzado.",
)

add_question(
    "Cuidados paliativos",
    "Control del dolor",
    "Básico",
    "¿Qué efecto adverso es frecuente con opioides y precisa profilaxis?",
    [
        "Estreñimiento",
        "Hipertensión",
        "Dermatitis",
        "Hiperglucemia",
    ],
    0,
    "El estreñimiento es común y debe prevenirse con laxantes estimulantes/osmóticos desde el inicio.",
)

add_question(
    "Cuidados paliativos",
    "Control del dolor",
    "Intermedio",
    "¿Cómo se calcula la dosis de rescate de opioide?",
    [
        "10-15% de la dosis total diaria",
        "50% de la dosis diaria",
        "Igual a dosis basal",
        "No se calcula",
    ],
    0,
    "Se recomienda rescate equivalente al 10-15% de la dosis diaria total de opioides.",
)

add_question(
    "Cuidados paliativos",
    "Control del dolor",
    "Avanzado",
    "¿Qué manejo se recomienda ante hiperalgesia inducida por opioides?",
    [
        "Rotación de opioides y reducción de dosis",
        "Aumentar la dosis",
        "Suspender analgésicos",
        "Añadir benzodiacepinas",
    ],
    0,
    "La rotación hacia un opioide distinto y ajustar dosis ayuda a revertir la hiperalgesia inducida.",
)

add_question(
    "Cuidados paliativos",
    "Control del dolor",
    "Intermedio",
    "¿Qué escala evalúa dolor irruptivo?",
    [
        "Escala BPI (Brief Pain Inventory)",
        "ECOG",
        "NPI",
        "Charlson",
    ],
    0,
    "El Brief Pain Inventory permite valorar intensidad, duración y repercusión del dolor irruptivo.",
)

add_question(
    "Cuidados paliativos",
    "Control del dolor",
    "Avanzado",
    "¿Qué tratamiento se usa en dolor óseo metastásico focal?",
    [
        "Radioterapia paliativa",
        "Quimioterapia",
        "Gabapentina",
        "Hipnosis",
    ],
    0,
    "La radioterapia paliativa proporciona alivio rápido y duradero del dolor óseo localizado.",
)

# Cuidados paliativos - Síntomas respiratorios
add_question(
    "Cuidados paliativos",
    "Síntomas respiratorios",
    "Básico",
    "¿Cuál es el fármaco de elección para disnea refractaria en cáncer avanzado?",
    [
        "Morfina",
        "Bromuro de ipratropio",
        "Diazepam",
        "Prednisona",
    ],
    0,
    "Los opioides sistémicos como morfina reducen la sensación de disnea en situaciones refractarias.",
)

add_question(
    "Cuidados paliativos",
    "Síntomas respiratorios",
    "Básico",
    "¿Qué medida ambiental ayuda a aliviar disnea?",
    [
        "Ventilador dirigido al rostro",
        "Habitación caliente",
        "Silencio absoluto",
        "Luz intensa",
    ],
    0,
    "El flujo de aire en la cara mediante ventilador produce sensación de alivio en algunos pacientes.",
)

add_question(
    "Cuidados paliativos",
    "Síntomas respiratorios",
    "Intermedio",
    "¿Qué manejo se recomienda en congestión bronquial terminal?",
    [
        "Anticolinérgicos como butilbromuro de hioscina",
        "Antibióticos IV",
        "Broncodilatadores",
        "Heparina",
    ],
    0,
    "Los anticolinérgicos reducen secreciones y el ruido respiratorio terminal.",
)

add_question(
    "Cuidados paliativos",
    "Síntomas respiratorios",
    "Intermedio",
    "¿Qué intervención no farmacológica mejora ansiedad asociada a disnea?",
    [
        "Técnicas de respiración y relajación",
        "Restricción hídrica",
        "Sedación inmediata",
        "Aumento de oxígeno al máximo",
    ],
    0,
    "Entrenar respiración diafragmática, relajación y apoyo psicológico reduce la ansiedad ligada a disnea.",
)

add_question(
    "Cuidados paliativos",
    "Síntomas respiratorios",
    "Avanzado",
    "¿Cuándo está indicada la sedación paliativa por disnea?",
    [
        "Cuando persiste disnea refractaria pese a tratamientos óptimos",
        "Al inicio del síntoma",
        "Solo con hipoxemia",
        "Nunca",
    ],
    0,
    "La sedación paliativa se considera en disnea refractaria que no responde a intervenciones farmacológicas y no farmacológicas.",
)

add_question(
    "Cuidados paliativos",
    "Síntomas respiratorios",
    "Básico",
    "¿Qué papel tiene el oxígeno en disnea sin hipoxemia?",
    [
        "Beneficio limitado; se reserva para hipoxemia documentada",
        "Es imprescindible",
        "Está contraindicado",
        "Sustituye a opioides",
    ],
    0,
    "El oxígeno solo se recomienda cuando hay hipoxemia; en normoxemia puede no aportar mejora.",
)

add_question(
    "Cuidados paliativos",
    "Síntomas respiratorios",
    "Intermedio",
    "¿Qué combinación farmacológica se usa en crisis de disnea con ansiedad intensa?",
    [
        "Opioide + benzodiacepina",
        "Corticoide + antibiótico",
        "Diurético + betabloqueante",
        "Anticolinérgico + heparina",
    ],
    0,
    "La asociación de opioide para disnea y benzodiacepina para ansiedad es eficaz en crisis agudas.",
)

add_question(
    "Cuidados paliativos",
    "Síntomas respiratorios",
    "Avanzado",
    "¿Qué considerar en derrame pleural masivo sintomático en paciente paliativo?",
    [
        "Drenaje paliativo o pleurodesis",
        "Suspender opioides",
        "Solo diuréticos",
        "Reposo absoluto",
    ],
    0,
    "El drenaje mediante toracocentesis o catéter de túnel alivia disnea por derrame pleural maligno.",
)

add_question(
    "Cuidados paliativos",
    "Síntomas respiratorios",
    "Intermedio",
    "¿Qué define disnea refractaria?",
    [
        "Persistencia del síntoma pese a terapia óptima",
        "Disnea nocturna",
        "Disnea al esfuerzo leve",
        "Sensación subjetiva de falta de aire",
    ],
    0,
    "Se considera refractaria cuando no responde a tratamientos dirigidos causa y medidas sintomáticas aceptables.",
)

add_question(
    "Cuidados paliativos",
    "Síntomas respiratorios",
    "Avanzado",
    "¿Qué evaluación se utiliza para monitorizar disnea?",
    [
        "Escala numérica 0-10",
        "Escala de Karnofsky",
        "Mini-Mental",
        "APGAR",
    ],
    0,
    "Las escalas numéricas permiten cuantificar intensidad y evaluar respuesta terapéutica en disnea.",
)

# Oncología radioterápica - Planeación
add_question(
    "Oncología radioterápica",
    "Planeación",
    "Básico",
    "¿Qué significa IMRT en radioterapia moderna?",
    [
        "Radioterapia de intensidad modulada",
        "Radioterapia intraoperatoria",
        "Radioterapia metabólica",
        "Radioterapia microfocal",
    ],
    0,
    "IMRT permite modular la intensidad de los haces para conformar la dosis al volumen tumoral y reducir toxicidad.",
)

add_question(
    "Oncología radioterápica",
    "Planeación",
    "Básico",
    "¿Qué prueba de imagen es esencial para la planificación de radioterapia externa?",
    [
        "Tomografía computarizada de simulación",
        "Radiografía de tórax",
        "Resonancia cardíaca",
        "Ecografía",
    ],
    0,
    "La TAC de simulación permite definir contornos anatómicos y asignar densidades electrónicas para la planificación.",
)

add_question(
    "Oncología radioterápica",
    "Planeación",
    "Intermedio",
    "¿Qué volumen incluye márgenes para el movimiento del tumor causado por la respiración?",
    [
        "ITV (Internal Target Volume)",
        "GTV",
        "CTV",
        "PTV",
    ],
    0,
    "El ITV incorpora el movimiento interno del tumor, especialmente en órganos móviles como pulmón o hígado.",
)

add_question(
    "Oncología radioterápica",
    "Planeación",
    "Intermedio",
    "¿Qué técnica reduce el volumen pulmonar irradiado en cáncer de mama izquierdo?",
    [
        "Inspiración profunda mantenida",
        "Prono",
        "Aumento de energía",
        "Uso de bolus",
    ],
    0,
    "La inspiración profunda mantenida separa corazón y pulmón del campo y reduce dosis en mama izquierda.",
)

add_question(
    "Oncología radioterápica",
    "Planeación",
    "Avanzado",
    "¿Qué tecnología permite administrar dosis ablativas en lesiones pequeñas?",
    [
        "Radioterapia estereotáxica (SBRT/SRS)",
        "Radioterapia 2D",
        "Brachiterapia",
        "Radioterapia de haz de electrones",
    ],
    0,
    "La radioterapia estereotáxica entrega altas dosis con gran precisión en pocos fraccionamientos.",
)

add_question(
    "Oncología radioterápica",
    "Planeación",
    "Básico",
    "¿Qué parámetro dosimétrico se usa para evaluar cobertura del PTV?",
    [
        "D95 (dosis al 95% del volumen)",
        "SUV",
        "LDH",
        "PSA",
    ],
    0,
    "D95 indica la dosis recibida por el 95% del PTV, asegurando cobertura suficiente.",
)

add_question(
    "Oncología radioterápica",
    "Planeación",
    "Intermedio",
    "¿Qué herramienta se usa para verificación diaria de posición?",
    [
        "Imagen guiada (IGRT) con cone-beam CT",
        "Tomografía PET",
        "Gammagrafía",
        "Fluoroscopia digestiva",
    ],
    0,
    "La IGRT mediante cone-beam CT permite ajustar la posición del paciente antes de cada sesión.",
)

add_question(
    "Oncología radioterápica",
    "Planeación",
    "Avanzado",
    "¿Qué concepto describe la dosis media restringida en órganos de riesgo?",
    [
        "Constraint dosimétrico",
        "Boost",
        "Fraccionamiento",
        "Bolus",
    ],
    0,
    "Los constraints dosimétricos fijan límites de dosis en órganos críticos para evitar toxicidades.",
)

add_question(
    "Oncología radioterápica",
    "Planeación",
    "Intermedio",
    "¿Qué ventaja aporta la protonterapia?",
    [
        "Depósito de dosis con pico de Bragg y menor salida",
        "Mayor dispersión",
        "Menor coste",
        "No requiere planificación",
    ],
    0,
    "La protonterapia aprovecha el pico de Bragg para reducir dosis a tejidos distales, útil en pediatría y tumores cercanos a órganos críticos.",
)

add_question(
    "Oncología radioterápica",
    "Planeación",
    "Avanzado",
    "¿Qué algoritmo de planificación es preferible en SBRT pulmonar?",
    [
        "Acuñamiento anisotrópico (AAA) o Monte Carlo",
        "Pencil beam sencillo",
        "Algoritmo 2D",
        "Ray tracing básico",
    ],
    0,
    "Algoritmos avanzados como Monte Carlo modelan heterogeneidades pulmonares con precisión en SBRT.",
)

# Oncología radioterápica - Toxicidades
add_question(
    "Oncología radioterápica",
    "Toxicidades",
    "Básico",
    "¿Qué toxicidad aguda es típica en radioterapia de cabeza y cuello?",
    [
        "Mucositis",
        "Nefrotoxicidad",
        "Cardiotoxicidad",
        "Neuropatía óptica",
    ],
    0,
    "La mucositis orofaríngea es una toxicidad aguda frecuente y se maneja con cuidados de soporte intensivos.",
)

add_question(
    "Oncología radioterápica",
    "Toxicidades",
    "Básico",
    "¿Qué órgano limita la radioterapia en cáncer de pulmón?",
    [
        "Pulmón sano (neumonitis rádica)",
        "Riñón",
        "Bazo",
        "Tiroides",
    ],
    0,
    "La neumonitis por radiación es un riesgo clave, se limita la dosis pulmonar media y V20.",
)

add_question(
    "Oncología radioterápica",
    "Toxicidades",
    "Intermedio",
    "¿Qué medida previene xerostomía en radioterapia de cabeza y cuello?",
    [
        "Parotid sparing con IMRT",
        "Aumentar la dosis",
        "Usar electrones",
        "Deshidratar",
    ],
    0,
    "La IMRT permite limitar la dosis a las glándulas parótidas, reduciendo la xerostomía crónica.",
)

add_question(
    "Oncología radioterápica",
    "Toxicidades",
    "Intermedio",
    "¿Qué toxicidad tardía preocupa en radioterapia mamaria izquierda?",
    [
        "Cardiotoxicidad",
        "Hipotiroidismo",
        "Neuropatía periférica",
        "Retinopatía",
    ],
    0,
    "La dosis al corazón se relaciona con riesgo de eventos cardiovasculares a largo plazo.",
)

add_question(
    "Oncología radioterápica",
    "Toxicidades",
    "Avanzado",
    "¿Qué toxicidad se monitoriza tras irradiación hepática?",
    [
        "Enfermedad venooclusiva (síndrome de Budd-Chiari rádico)",
        "Osteorradionecrosis",
        "Mielosupresión severa",
        "Hipercalcemia",
    ],
    0,
    "La enfermedad venooclusiva hepática es una complicación potencial tras altas dosis al hígado.",
)

add_question(
    "Oncología radioterápica",
    "Toxicidades",
    "Básico",
    "¿Qué grado de toxicidad cutánea corresponde a eritema leve?",
    [
        "Grado 1",
        "Grado 2",
        "Grado 3",
        "Grado 4",
    ],
    0,
    "El eritema leve sin descamación corresponde a toxicidad cutánea grado 1.",
)

add_question(
    "Oncología radioterápica",
    "Toxicidades",
    "Intermedio",
    "¿Qué fármaco protege contra cistitis rádica en próstata?",
    [
        "Amifostina (uso limitado)",
        "Mesna",
        "Ondansetrón",
        "Dexametasona",
    ],
    0,
    "La amifostina se ha estudiado como radioprotector, aunque su uso es limitado por efectos secundarios.",
)

add_question(
    "Oncología radioterápica",
    "Toxicidades",
    "Avanzado",
    "¿Qué complicación tardía aparece tras irradiación medular?",
    [
        "Mielopatía rádica",
        "Neuropatía óptica",
        "Síndrome nefrótico",
        "Hipertiroidismo",
    ],
    0,
    "Dosis elevadas a la médula espinal pueden producir mielopatía rádica irreversible; se limita la dosis máxima.",
)

add_question(
    "Oncología radioterápica",
    "Toxicidades",
    "Intermedio",
    "¿Qué parámetros se controlan para evitar toxicidad intestinal en irradiación pélvica?",
    [
        "Volumen intestinal (V45/V50)",
        "Dosis al corazón",
        "SUV",
        "LDH",
    ],
    0,
    "Se limitan los volúmenes intestinales que reciben dosis >45-50 Gy para reducir enteritis crónica.",
)

add_question(
    "Oncología radioterápica",
    "Toxicidades",
    "Avanzado",
    "¿Qué tratamiento se emplea para osteorradionecrosis mandibular?",
    [
        "Oxígeno hiperbárico y cirugía",
        "Quimioterapia",
        "Anticoagulación",
        "Vitamina C",
    ],
    0,
    "El manejo combina medidas conservadoras, antibióticos, oxígeno hiperbárico y, si es necesario, resección quirúrgica.",
)

# Genética y biología tumoral - Biomarcadores
add_question(
    "Genética y biología tumoral",
    "Biomarcadores",
    "Básico",
    "¿Qué biomarcador se evalúa para indicar trastuzumab en cáncer de mama?",
    [
        "HER2 por inmunohistoquímica o FISH",
        "PD-L1",
        "EGFR",
        "KRAS",
    ],
    0,
    "La sobreexpresión o amplificación de HER2 determina la indicación de terapias anti-HER2.",
)

add_question(
    "Genética y biología tumoral",
    "Biomarcadores",
    "Básico",
    "¿Qué biomarcador orienta el uso de inhibidores de PARP en ovario?",
    [
        "Mutaciones BRCA1/2",
        "KRAS",
        "ALK",
        "ROS1",
    ],
    0,
    "Las mutaciones BRCA y otras alteraciones de recombinación homóloga identifican candidatas a PARP.",
)

add_question(
    "Genética y biología tumoral",
    "Biomarcadores",
    "Intermedio",
    "¿Qué prueba detecta inestabilidad de microsatélites?",
    [
        "PCR/MSI o inmunohistoquímica de MMR",
        "Secuenciación germinal",
        "Citometría",
        "FISH",
    ],
    0,
    "La MSI se evalúa mediante PCR de microsatélites o pérdida de expresión de proteínas MMR por inmunohistoquímica.",
)

add_question(
    "Genética y biología tumoral",
    "Biomarcadores",
    "Intermedio",
    "¿Qué biomarcador define sensibilidad a EGFR-TKIs en cáncer de pulmón?",
    [
        "Mutaciones activadoras de EGFR",
        "Amplificación de MET",
        "PD-L1",
        "HER2",
    ],
    0,
    "Las mutaciones en exones 19 y 21 de EGFR predicen respuesta a inhibidores tirosina cinasa.",
)

add_question(
    "Genética y biología tumoral",
    "Biomarcadores",
    "Avanzado",
    "¿Qué biomarcador tumoral se emplea para terapia tisotumab vedotina en cérvix?",
    [
        "Tissue factor",
        "HER2",
        "NTRK",
        "RET",
    ],
    0,
    "Tisotumab vedotina se dirige al factor tisular expresado en cáncer de cérvix recurrente.",
)

add_question(
    "Genética y biología tumoral",
    "Biomarcadores",
    "Básico",
    "¿Qué determina candidatas a inmunoterapia en cáncer endometrial?",
    [
        "MSI-H/dMMR",
        "CA-125 elevado",
        "CEA",
        "PSA",
    ],
    0,
    "La inestabilidad de microsatélites o deficiencia MMR predicen respuesta a inhibidores de PD-1 en endometrio.",
)

add_question(
    "Genética y biología tumoral",
    "Biomarcadores",
    "Intermedio",
    "¿Qué biomarcador indica terapia con entrectinib?",
    [
        "Fusiones NTRK",
        "KRAS G12C",
        "BRAF V600",
        "PD-L1",
    ],
    0,
    "Entrectinib está aprobado para tumores con fusiones NTRK independientemente del origen.",
)

add_question(
    "Genética y biología tumoral",
    "Biomarcadores",
    "Avanzado",
    "¿Qué biomarcador se usa para seleccionar sotorasib?",
    [
        "KRAS G12C",
        "NRAS",
        "ALK",
        "PIK3CA",
    ],
    0,
    "Sotorasib bloquea KRAS G12C y está indicado en cáncer de pulmón con esta mutación.",
)

add_question(
    "Genética y biología tumoral",
    "Biomarcadores",
    "Intermedio",
    "¿Qué análisis se emplea para alteraciones complejas (TMB, firmas)?",
    [
        "Secuenciación de nueva generación",
        "PCR convencional",
        "Sanger",
        "Citometría",
    ],
    0,
    "La NGS permite evaluar múltiples genes, carga mutacional tumoral (TMB) y firmas genómicas.",
)

add_question(
    "Genética y biología tumoral",
    "Biomarcadores",
    "Avanzado",
    "¿Qué biomarcador emergente predice respuesta a inmunoterapia en melanoma?",
    [
        "TMB elevada",
        "HER2",
        "IDH1",
        "VEGFA",
    ],
    0,
    "Una carga mutacional elevada se asocia a mayor probabilidad de respuesta a inhibidores de checkpoint.",
)

# Genética y biología tumoral - Terapias dirigidas
add_question(
    "Genética y biología tumoral",
    "Terapias dirigidas",
    "Básico",
    "¿Qué mecanismo de acción tiene imatinib en GIST?",
    [
        "Inhibidor de tirosina cinasa KIT/PDGFRA",
        "Anticuerpo anti-HER2",
        "Inhibidor de MEK",
        "Antagonista NK1",
    ],
    0,
    "Imatinib bloquea la activación de KIT y PDGFRA, controlando la proliferación en GIST con mutaciones sensibles.",
)

add_question(
    "Genética y biología tumoral",
    "Terapias dirigidas",
    "Básico",
    "¿Qué terapia dirigida se usa en cáncer renal metastásico?",
    [
        "Inhibidores de VEGFR (sunitinib, pazopanib)",
        "Inhibidores EGFR",
        "Anti-CD20",
        "Aromatasa",
    ],
    0,
    "Los inhibidores de VEGFR bloquean angiogénesis y son estándar en carcinoma renal avanzado.",
)

add_question(
    "Genética y biología tumoral",
    "Terapias dirigidas",
    "Intermedio",
    "¿Qué combinación se usa en cáncer colorrectal BRAF V600E?",
    [
        "Encorafenib + cetuximab",
        "Trametinib + pembrolizumab",
        "Osimertinib",
        "Lenvatinib + everolimus",
    ],
    0,
    "La combinación de inhibidores BRAF con anti-EGFR mejora supervivencia en CCR BRAF mutado.",
)

add_question(
    "Genética y biología tumoral",
    "Terapias dirigidas",
    "Intermedio",
    "¿Qué terapia dirigida se usa en cáncer de mama con mutación PIK3CA?",
    [
        "Alpelisib + fulvestrant",
        "Everolimus",
        "Trastuzumab",
        "Tucatinib",
    ],
    0,
    "Alpelisib combinado con fulvestrant mejora resultados en tumores HR+ con mutación PIK3CA.",
)

add_question(
    "Genética y biología tumoral",
    "Terapias dirigidas",
    "Avanzado",
    "¿Qué fármaco bloquea mutaciones RET en cáncer de tiroides y pulmón?",
    [
        "Selpercatinib",
        "Trastuzumab",
        "Larotrectinib",
        "Crizotinib",
    ],
    0,
    "Selpercatinib es un inhibidor altamente selectivo de RET aprobado en tumores con fusiones o mutaciones RET.",
)

add_question(
    "Genética y biología tumoral",
    "Terapias dirigidas",
    "Básico",
    "¿Qué define la resistencia secundaria a EGFR-TKIs de primera generación?",
    [
        "Mutación T790M",
        "Amplificación HER2",
        "Pérdida de PTEN",
        "Mutación ALK",
    ],
    0,
    "La mutación T790M confiere resistencia a gefitinib/erlotinib y se trata con osimertinib.",
)

add_question(
    "Genética y biología tumoral",
    "Terapias dirigidas",
    "Intermedio",
    "¿Qué terapia se usa en leucemia mieloide crónica resistente con T315I?",
    [
        "Ponatinib",
        "Nilotinib",
        "Bosutinib",
        "Dasatinib",
    ],
    0,
    "Ponatinib mantiene actividad frente a la mutación T315I y se emplea en LMC resistente.",
)

add_question(
    "Genética y biología tumoral",
    "Terapias dirigidas",
    "Avanzado",
    "¿Qué terapia dirigida se usa en tumores con fusiones ROS1?",
    [
        "Crizotinib",
        "Lorlatinib",
        "Osimertinib",
        "Selpercatinib",
    ],
    0,
    "Crizotinib y otros inhibidores de ROS1 son eficaces en CPNM con esta fusión.",
)

add_question(
    "Genética y biología tumoral",
    "Terapias dirigidas",
    "Intermedio",
    "¿Qué estrategia combate resistencia mediada por MET tras EGFR-TKI?",
    [
        "Combinar amivantamab con lazertinib",
        "Aumentar la dosis",
        "Cambiar a inmunoterapia",
        "Suspender tratamiento",
    ],
    0,
    "La combinación de anticuerpos biespecíficos anti-EGFR/MET con TKIs aborda mecanismos de resistencia MET-dpendientes.",
)

add_question(
    "Genética y biología tumoral",
    "Terapias dirigidas",
    "Avanzado",
    "¿Qué fármaco inhibe IDH1 mutado en leucemia?",
    [
        "Ivosidenib",
        "Enasidenib",
        "Midostaurina",
        "Venetoclax",
    ],
    0,
    "Ivosidenib se dirige a IDH1 mutado, mientras enasidenib actúa sobre IDH2.",
)

# Investigación clínica - Ensayos
add_question(
    "Investigación clínica",
    "Diseño de ensayos",
    "Básico",
    "¿Qué fase de ensayo evalúa seguridad y dosis máxima tolerada?",
    [
        "Fase I",
        "Fase II",
        "Fase III",
        "Fase IV",
    ],
    0,
    "Los ensayos fase I se centran en seguridad, farmacocinética y determinación de dosis recomendada.",
)

add_question(
    "Investigación clínica",
    "Diseño de ensayos",
    "Básico",
    "¿Qué característica define un ensayo fase II?",
    [
        "Evalúa eficacia preliminar",
        "Compara con estándar en grandes poblaciones",
        "Se realiza tras la comercialización",
        "Incluye solo voluntarios sanos",
    ],
    0,
    "Los fase II exploran eficacia y amplían datos de seguridad en pacientes con la enfermedad objetivo.",
)

add_question(
    "Investigación clínica",
    "Diseño de ensayos",
    "Intermedio",
    "¿Qué paradigma sigue un ensayo controlado aleatorizado?",
    [
        "Comparación entre tratamiento nuevo y control asignado al azar",
        "Observación retrospectiva",
        "Serie de casos",
        "Estudio cruzado sin control",
    ],
    0,
    "Los ensayos aleatorizados minimizan sesgos asignando tratamientos al azar y comparando con un control.",
)

add_question(
    "Investigación clínica",
    "Diseño de ensayos",
    "Intermedio",
    "¿Qué es una variable primaria?",
    [
        "Resultado principal que determina el éxito del estudio",
        "Cualquier dato exploratorio",
        "Variable secundaria",
        "Un efecto adverso",
    ],
    0,
    "La variable primaria es el endpoint crítico sobre el cual se calcula el tamaño muestral y se evalúa la hipótesis principal.",
)

add_question(
    "Investigación clínica",
    "Diseño de ensayos",
    "Avanzado",
    "¿Qué ventaja tienen los ensayos adaptativos?",
    [
        "Permiten modificar aspectos del estudio basados en análisis interinos",
        "Eliminan el azar",
        "No requieren consentimiento",
        "No necesitan análisis estadístico",
    ],
    0,
    "Los diseños adaptativos introducen ajustes predefinidos (ej. tamaño muestral, brazos) según resultados interinos.",
)

add_question(
    "Investigación clínica",
    "Diseño de ensayos",
    "Básico",
    "¿Qué es un ensayo doble ciego?",
    [
        "Ni participantes ni investigadores conocen la asignación",
        "Solo el paciente desconoce el tratamiento",
        "Solo el investigador desconoce",
        "No existe control",
    ],
    0,
    "El doble ciego reduce sesgos de observador y placebo al ocultar la asignación a ambos.",
)

add_question(
    "Investigación clínica",
    "Diseño de ensayos",
    "Intermedio",
    "¿Qué finalidad tiene un análisis interino de seguridad?",
    [
        "Detectar toxicidades graves tempranas",
        "Cambiar la hipótesis",
        "Reducir el tamaño muestral",
        "Evitar el seguimiento",
    ],
    0,
    "Los Comités de Monitorización realizan análisis interinos para detectar señales de toxicidad y proteger a los participantes.",
)

add_question(
    "Investigación clínica",
    "Diseño de ensayos",
    "Avanzado",
    "¿Qué es un endpoint compuesto?",
    [
        "Combinación de varios eventos clínicos relevantes",
        "Un evento único",
        "Variable secundaria",
        "Medida exploratoria",
    ],
    0,
    "Los endpoints compuestos agrupan eventos (p. ej., progresión o muerte) para aumentar potencia estadística.",
)

add_question(
    "Investigación clínica",
    "Diseño de ensayos",
    "Intermedio",
    "¿Qué caracteriza un estudio crossover?",
    [
        "Cada participante recibe secuencialmente ambos tratamientos",
        "Los grupos se comparan simultáneamente",
        "Se realiza en paralelo",
        "No requiere lavado",
    ],
    0,
    "En los estudios cruzados los participantes actúan como su propio control, requiriendo período de lavado.",
)

add_question(
    "Investigación clínica",
    "Diseño de ensayos",
    "Avanzado",
    "¿Qué objetivo tiene un ensayo de no inferioridad?",
    [
        "Demostrar que el nuevo tratamiento no es peor que el control dentro de un margen predefinido",
        "Mostrar superioridad",
        "Confirmar equivalencia exacta",
        "Determinar toxicidad",
    ],
    0,
    "Los ensayos de no inferioridad buscan mantener eficacia comparable con potenciales ventajas en seguridad u otros aspectos.",
)

# Farmacología oncológica - Terapias avanzadas
add_question(
    "Farmacología oncológica",
    "Anticuerpos conjugados",
    "Avanzado",
    "¿Cuál es el mecanismo de acción principal de trastuzumab deruxtecán (T-DXd) en cáncer de mama HER2+?",
    [
        "Entrega un inhibidor de topoisomerasa I tras internalización mediada por HER2",
        "Bloquea el dominio extracelular HER2 impidiendo dimerización",
        "Inhibe la tirosina cinasa citoplasmática de HER2",
        "Activa linfocitos T mediante CD3",
    ],
    0,
    "Trastuzumab deruxtecán es un anticuerpo conjugado que internaliza y libera deruxtecán, inhibidor de topoisomerasa I, tras unirse a HER2.",
)

add_question(
    "Farmacología oncológica",
    "Anticuerpos conjugados",
    "Avanzado",
    "¿Qué toxicidad limitante obliga a monitorizar la función pulmonar con T-DXd?",
    [
        "Enfermedad pulmonar intersticial/neumonitis",
        "Hipertensión pulmonar",
        "Fibrosis pleural",
        "Hemorragia alveolar",
    ],
    0,
    "T-DXd se asocia a enfermedad pulmonar intersticial; la ficha técnica exige detectar síntomas tempranos para suspender el fármaco.",
)

add_question(
    "Farmacología oncológica",
    "Anticuerpos conjugados",
    "Avanzado",
    "¿Qué diana reconoce sacituzumab govitecán y qué citotóxico libera?",
    [
        "Trop-2 y SN-38",
        "FRα y DM4",
        "HER2 y MMAE",
        "CD30 y auristatina",
    ],
    0,
    "Sacituzumab govitecán se une a Trop-2 y libera SN-38, metabolito activo de irinotecán.",
)

add_question(
    "Farmacología oncológica",
    "Anticuerpos conjugados",
    "Avanzado",
    "¿Cuál es el efecto adverso ocular característico de belantamab mafodotin?",
    [
        "Queratepatía epitelial microcística",
        "Retinopatía serosa",
        "Atrofia óptica",
        "Glaucoma agudo",
    ],
    0,
    "Belantamab mafodotin induce queratepatía epitelial; requiere exploraciones oftalmológicas periódicas.",
)

add_question(
    "Farmacología oncológica",
    "Anticuerpos conjugados",
    "Avanzado",
    "¿Qué recomendación recoge la ficha técnica de enfortumab vedotina respecto a la microangiopatía trombótica (MAT)?",
    [
        "Suspender definitivamente ante MAT confirmada",
        "Reducir dosis y continuar",
        "Añadir anticoagulación profiláctica",
        "Administrar plasma fresco congelado",
    ],
    0,
    "La aparición de microangiopatía trombótica obliga a suspender definitivamente enfortumab vedotina.",
)

add_question(
    "Farmacología oncológica",
    "Inmunoterapia",
    "Avanzado",
    "¿Qué biomarcador condiciona la dosis de tarlatamab (anti-DLL3) en CP microcítico según ficha técnica?",
    [
        "No requiere biomarcador; se pauta escalado 10→100 mg",
        "Expresión DLL3 >50%",
        "PD-L1 ≥10%",
        "Mutación RB1",
    ],
    0,
    "Tarlatamab se administra con escalado inicial fijo sin biomarcador obligatorio; DLL3 se expresa en la mayoría de células del CPMC.",
)

add_question(
    "Farmacología oncológica",
    "Inmunoterapia",
    "Avanzado",
    "¿Cuál es el manejo recomendado para la hepatotoxicidad grado 3 inducida por ipilimumab según ficha técnica?",
    [
        "Suspender ipilimumab y administrar corticoides IV",
        "Reducir a la mitad la dosis",
        "Añadir infliximab",
        "Esperar resolución espontánea",
    ],
    0,
    "Toxicidad hepática grado ≥3 requiere suspensión y corticoides sistémicos de alta dosis según las guías y ficha técnica.",
)

add_question(
    "Farmacología oncológica",
    "Inmunoterapia",
    "Avanzado",
    "¿Qué toxicidad cardiaca obliga a monitorizar ECG y troponinas durante el inicio de pembrolizumab + lenvatinib?",
    [
        "Síndrome de QT prolongado",
        "Miocarditis hiperaguda",
        "Tamponade",
        "Bloqueo AV completo",
    ],
    0,
    "La combinación incrementa riesgo de prolongación QT; se aconseja monitorización electrocardiográfica y electrolitos.",
)

add_question(
    "Farmacología oncológica",
    "Inmunoterapia",
    "Avanzado",
    "¿Qué profilaxis recomienda la ficha técnica de teclistamab para el síndrome de liberación de citocinas (SLC)?",
    [
        "Premedicación con dexametasona, antihistamínico y antipirético",
        "Infusión continua de tocilizumab",
        "Plasmaféresis preventiva",
        "Profilaxis con anakinra",
    ],
    0,
    "La ficha técnica de teclistamab exige premedicar con dexametasona, H1 y antipirético para reducir el riesgo de SLC.",
)

add_question(
    "Farmacología oncológica",
    "Inmunoterapia",
    "Avanzado",
    "¿Qué tratamiento recoge la ficha técnica para hipogammaglobulinemia sintomática inducida por teclistamab?",
    [
        "Administrar inmunoglobulina intravenosa",
        "Suspender el fármaco permanentemente",
        "Añadir rituximab",
        "Iniciar filgastrim",
    ],
    0,
    "Teclistamab puede causar hipogammaglobulinemia; se recomienda reposición con inmunoglobulina IV según necesidad clínica.",
)

add_question(
    "Farmacología oncológica",
    "Inmunoterapia",
    "Avanzado",
    "¿Qué pauta de premedicación describe la ficha técnica de glofitamab (CD20xCD3) para prevenir SLC?",
    [
        "Dexametasona, antihistamínico y antipirético antes de cada dosis",
        "Rituximab 375 mg/m² semanal previo",
        "Metilprednisolona en perfusión continua",
        "Infliximab a dosis fija",
    ],
    0,
    "Antes de glofitamab se administra premedicación estándar (corticoide, antihistamínico y antipirético); además se usa dosis única de obinutuzumab para depleción B, contemplada en la ficha técnica.",
)

add_question(
    "Farmacología oncológica",
    "Inhibidores de tirosina cinasa",
    "Avanzado",
    "¿Qué tratamiento requiere ajustar la dosis de osimertinib ante prolongación QTc >500 ms?",
    [
        "Suspender temporalmente hasta QTc <481 ms y reanudar a 80→40 mg",
        "Reducir a 20 mg diarios",
        "Añadir beta-bloqueante",
        "Continuar igual y monitorizar semanalmente",
    ],
    0,
    "La ficha técnica indica suspender osimertinib hasta normalización y considerar reanudar a 40 mg si QTc >500 ms.",
)

add_question(
    "Farmacología oncológica",
    "Inhibidores de tirosina cinasa",
    "Avanzado",
    "¿Cuál es la principal interacción de gilteritinib (FLT3) mencionada en ficha técnica?",
    [
        "Inhibidores potentes de CYP3A4 elevan su exposición",
        "Inductores de UGT1A1 elevan el AUC",
        "Anticoagulantes directos reducen eficacia",
        "Metformina aumenta niveles",
    ],
    0,
    "Inhibidores potentes de CYP3A4 (ej. azoles) incrementan los niveles de gilteritinib; se recomienda evitar o monitorizar.",
)

add_question(
    "Farmacología oncológica",
    "Inhibidores de tirosina cinasa",
    "Avanzado",
    "¿Qué ajuste recomienda la ficha técnica de selpercatinib ante hipertensión arterial grado 3?",
    [
        "Interrumpir hasta control y reanudar con reducción de dosis",
        "Continuar con antihipertensivos",
        "Suspender definitivamente",
        "Administrar diurético IV",
    ],
    0,
    "Ante hipertensión grado 3 se interrumpe selpercatinib y se reanuda con una reducción si se controla.",
)

add_question(
    "Farmacología oncológica",
    "Inhibidores de tirosina cinasa",
    "Avanzado",
    "¿Qué pauta alimentaria indica la ficha técnica de tucatinib?",
    [
        "Puede administrarse con o sin alimentos",
        "Debe tomarse en ayunas",
        "Requiere comida rica en grasa",
        "Evitar fibra 4 h previas",
    ],
    0,
    "Tucatinib se administra independientemente de las comidas, simplificando su pauta.",
)

add_question(
    "Farmacología oncológica",
    "Inhibidores de tirosina cinasa",
    "Avanzado",
    "¿Cuál es el manejo recomendado para toxicidad cutánea grado 3 con encorafenib + binimetinib?",
    [
        "Suspender ambos y reanudar con reducción escalonada",
        "Reducir solo binimetinib",
        "Añadir antihistamínicos y continuar",
        "Suspender definitivamente",
    ],
    0,
    "Las reacciones cutáneas de alto grado requieren suspender temporalmente ambos fármacos y reintroducir con reducción.",
)

add_question(
    "Farmacología oncológica",
    "Inhibidores de tirosina cinasa",
    "Avanzado",
    "¿Qué riesgo cardiovascular obliga a monitorizar lipasas con alpelisib?",
    [
        "Pancreatitis",
        "Cardiomiopatía dilatada",
        "Pericarditis constrictiva",
        "Arritmias ventriculares",
    ],
    0,
    "Alpelisib puede provocar pancreatitis; se recomienda monitorizar lipasa/amilasa y suspender si elevadas.",
)

add_question(
    "Farmacología oncológica",
    "Terapias dirigidas",
    "Avanzado",
    "¿Cuál es la toxicidad característica que obliga a monitorizar fósforo con infigratinib (FGFR2)?",
    [
        "Hiperfosfatemia",
        "Hipofosfatemia",
        "Hiponatremia",
        "Hipercalcemia",
    ],
    0,
    "Los FGFR inhibidores elevan fosfato; la ficha técnica recomienda restrictor dietético y quelantes si necesario.",
)

add_question(
    "Farmacología oncológica",
    "Terapias dirigidas",
    "Avanzado",
    "¿Qué combinación requiere profilaxis antiemética triple en la primera línea de cáncer gástrico HER2 negativo según ficha de zolbetuximab?",
    [
        "Zolbetuximab + mFOLFOX6",
        "Zolbetuximab + FLOT",
        "Zolbetuximab + paclitaxel",
        "Zolbetuximab en monoterapia",
    ],
    0,
    "Zolbetuximab se combina con mFOLFOX6, que requiere profilaxis antiemética estándar de alto riesgo.",
)

add_question(
    "Farmacología oncológica",
    "Terapias dirigidas",
    "Avanzado",
    "¿Qué mutación confiere resistencia primaria a larotrectinib según datos de ficha técnica?",
    [
        "Fusiones NTRK con mutaciones G623R",
        "KRAS G12C",
        "BRAF V600E",
        "METex14",
    ],
    0,
    "Mutaciones en el dominio quinasa de NTRK (ej. G623R) generan resistencia al larotrectinib.",
)

add_question(
    "Farmacología oncológica",
    "Terapias dirigidas",
    "Avanzado",
    "¿Qué precaución existe con abemaciclib respecto a la función hepática?",
    [
        "Obligatoria monitorización de transaminasas cada 2 semanas al inicio",
        "Contraindicado si AST/ALT >2x LSN",
        "No requiere control",
        "Solo si hay metástasis hepáticas",
    ],
    0,
    "Abemaciclib puede elevar transaminasas; se controla cada 2 semanas los dos primeros meses.",
)

add_question(
    "Farmacología oncológica",
    "Quimioterapia clásica",
    "Avanzado",
    "Según la ficha técnica de la doxorrubicina liposomal, ¿cuál es la medida inicial recomendada ante extravasación?",
    [
        "Interrumpir la perfusión y aplicar compresas frías intermitentes sobre la zona",
        "Administrar dexrazoxano en las primeras 6 horas",
        "Aplicar calor local continuo",
        "Inyectar dimetilsulfóxido tópicamente",
    ],
    0,
    "Para la formulación liposomal, la ficha técnica indica detener la infusión, mantener la extremidad inmóvil y aplicar compresas frías intermitentes; no recomienda antídotos específicos como dexrazoxano.",
)

add_question(
    "Farmacología oncológica",
    "Quimioterapia clásica",
    "Avanzado",
    "¿Qué soporte es obligatorio con altas dosis de methotrexato (>1 g/m²)?",
    [
        "Rescate con leucovorina y alcalinización urinaria",
        "Filgrastim desde el día 1",
        "Suplemento de ácido fólico",
        "Suero hipertónico",
    ],
    0,
    "Las dosis altas de MTX requieren rescate con leucovorina y alcalinización para prevenir nefrotoxicidad.",
)

add_question(
    "Farmacología oncológica",
    "Quimioterapia clásica",
    "Avanzado",
    "¿Qué medida reduce el riesgo de neurotoxicidad aguda con oxaliplatino?",
    [
        "Evitar exposición al frío durante 48 h",
        "Administrar calcio-magnesio al inicio",
        "Mantener ayuno",
        "Hidratar con suero hipertónico",
    ],
    0,
    "La neuropatía aguda se exacerba con frío; se aconseja evitar bebidas frías y exposición a bajas temperaturas.",
)

add_question(
    "Farmacología oncológica",
    "Quimioterapia clásica",
    "Avanzado",
    "¿Qué antiemesis refleja la ficha técnica de cisplatino a dosis >70 mg/m²?",
    [
        "Triple profilaxis (5-HT3, NK1, dexametasona)",
        "Ondansetrón monoterapia",
        "Metoclopramida continua",
        "Palonosetrón semanal",
    ],
    0,
    "Cisplatino es altamente emetógeno; se requiere triple terapia con antagonista 5-HT3, NK1 y dexametasona.",
)

add_question(
    "Farmacología oncológica",
    "Quimioterapia clásica",
    "Avanzado",
    "¿Qué monitorización hematológica es obligatoria con temozolomida concurrente a radioterapia?",
    [
        "Hemograma semanal",
        "Biopsia medular mensual",
        "Ferritina semanal",
        "Dímero D",
    ],
    0,
    "La temozolomida debe acompañarse de hemograma semanal por riesgo de neutropenia y trombocitopenia.",
)

add_question(
    "Farmacología oncológica",
    "Quimioterapia clásica",
    "Avanzado",
    "¿Qué condición obliga a usar factor estimulante de colonias primario con dosetaxel + carboplatino + trastuzumab + pertuzumab?",
    [
        "Riesgo de neutropenia febril ≥20%",
        "Edad <35 años",
        "Nivel de albúmina bajo",
        "ECOG 0",
    ],
    0,
    "Los regímenes con doble anti-HER2 y taxano se asocian a riesgo de neutropenia febril >20%, justificando G-CSF primario.",
)

add_question(
    "Farmacología oncológica",
    "Quimioterapia clásica",
    "Avanzado",
    "¿Qué suplemento debe evitarse con capecitabina según ficha técnica por interacción farmacocinética?",
    [
        "Folínico",
        "Vitamina C",
        "Hierro oral",
        "Vitamina D",
    ],
    0,
    "El ácido folínico potencia la toxicidad de capecitabina y se evita su uso concomitante fuera de protocolos definidos.",
)

add_question(
    "Farmacología oncológica",
    "Quimioterapia clásica",
    "Avanzado",
    "¿Qué síndrome obliga a suspender definitivamente irinotecán?",
    [
        "Colitis neutropénica (typhlitis)",
        "Hepatitis",
        "Hipertensión",
        "Alopecia",
    ],
    0,
    "La colitis neutropénica es una complicación grave descrita que requiere suspensión definitiva del fármaco.",
)

add_question(
    "Farmacología oncológica",
    "Soporte y hormonoterapia",
    "Avanzado",
    "¿Qué precaución destaca la ficha técnica de degarelix respecto al síndrome de QT prolongado?",
    [
        "Vigilar ECG en pacientes con factores de riesgo o fármacos que prolonguen QT",
        "Administrar betabloqueantes",
        "Suplementar magnesio",
        "Nada, no prolonga QT",
    ],
    0,
    "Degarelix puede prolongar el QT; se debe evaluar ECG en pacientes con factores predisponentes o fármacos concomitantes.",
)

add_question(
    "Farmacología oncológica",
    "Soporte y hormonoterapia",
    "Avanzado",
    "¿Qué antídoto revierte las hemorragias por sobredosis de cabazitaxel?",
    [
        "No existe antídoto específico; se brinda soporte intensivo",
        "Vitamina K",
        "Ácido tranexámico",
        "Protamina",
    ],
    0,
    "Cabazitaxel no tiene antídoto; el manejo de sobredosis es soporte intensivo y G-CSF.",
)

add_question(
    "Farmacología oncológica",
    "Soporte y hormonoterapia",
    "Avanzado",
    "¿Qué efecto adverso grave obliga a monitorizar peso y presión arterial con abiraterona + prednisona?",
    [
        "Retención de líquidos y hipertensión",
        "Hiperglucemia",
        "Depresión",
        "Insuficiencia renal aguda",
    ],
    0,
    "La inhibición de CYP17 causa hiperaldosteronismo secundario con retención de líquidos e hipertensión.",
)

add_question(
    "Farmacología oncológica",
    "Soporte y hormonoterapia",
    "Avanzado",
    "¿Qué medicamento debe suspenderse 7 días antes de lenalidomida según ficha técnica en pacientes de riesgo trombótico?",
    [
        "Eritropoyetina",
        "Ácido acetilsalicílico",
        "Clopidogrel",
        "Metformina",
    ],
    0,
    "La lenalidomida aumenta el riesgo trombótico; la ficha técnica recomienda valorar suspender estimuladores eritropoyéticos 7 días antes en pacientes de riesgo.",
)

add_question(
    "Farmacología oncológica",
    "Soporte y hormonoterapia",
    "Avanzado",
    "¿Qué limitación renal impone la ficha técnica de zoledrónico en metástasis óseas?",
    [
        "Contraindicado si aclaramiento <30 mL/min",
        "Reducir al 50% si aclaramiento <60",
        "Usar cada 12 semanas",
        "No tiene limitación",
    ],
    0,
    "Zoledronato está contraindicado cuando el aclaramiento de creatinina es <30 mL/min por riesgo de deterioro renal.",
)

add_question(
    "Farmacología oncológica",
    "Soporte y hormonoterapia",
    "Avanzado",
    "¿Cuál es la interacción relevante entre apalutamida y anticonvulsivantes?",
    [
        "Apalutamida induce CYP3A4 y puede reducir niveles de anticonvulsivantes",
        "Apalutamida inhibe CYP2C9 aumentando niveles",
        "No existe interacción",
        "Disminuye absorción de valproato",
    ],
    0,
    "Apalutamida induce CYP3A4, 2C19 y 2C9, reduciendo concentraciones de fármacos como fenitoína o carbamazepina.",
)

add_question(
    "Farmacología oncológica",
    "Radioprotección",
    "Avanzado",
    "¿Qué indicación recoge amifostina en ficha técnica para prevenir xerostomía?",
    [
        "Radioterapia de cabeza y cuello con glándulas parótidas dentro del campo",
        "Radioterapia corporal total",
        "Radioterapia cerebral",
        "Radioterapia pélvica",
    ],
    0,
    "Amifostina se usa en radioterapia de cabeza y cuello para reducir xerostomía al proteger glándulas salivales.",
)

add_question(
    "Farmacología oncológica",
    "Radioprotección",
    "Avanzado",
    "¿Qué ajuste precisa Pluvicto (Lu-177 PSMA) según función renal?",
    [
        "No recomendado si aclaramiento <40 mL/min",
        "Reducir al 50% si aclaramiento <70",
        "Aumentar ingesta proteica",
        "Realizar hemodiálisis tras cada dosis",
    ],
    0,
    "Lu-177 PSMA no se recomienda en aclaramiento de creatinina <40 mL/min por falta de datos y riesgo de toxicidad.",
)

add_question(
    "Farmacología oncológica",
    "Radioprotección",
    "Avanzado",
    "¿Qué profilaxis antiemética requiere Pluvicto según ficha técnica?",
    [
        "Antiemético oral previo a cada infusión",
        "Triple terapia",
        "No precisa profilaxis",
        "Metoclopramida IV",
    ],
    0,
    "Pluvicto puede causar náuseas leves; se recomienda antiemético oral (ej. ondansetrón) antes de cada administración.",
)

add_question(
    "Farmacología oncológica",
    "Terapias celulares",
    "Avanzado",
    "¿Qué premedicación estándar exige la infusión de idecabtagene vicleucel (abecma) para reducir SLC?",
    [
        "Acetaminofén y antihistamínico H1 30-60 minutos antes",
        "Dexametasona 20 mg IV",
        "Profilaxis con tocilizumab",
        "Inmunoglobulina IV",
    ],
    0,
    "La ficha técnica de idecabtagene vicleucel indica administrar paracetamol y antihistamínico H1 antes de cada infusión para mitigar el síndrome de liberación de citocinas.",
)

add_question(
    "Farmacología oncológica",
    "Terapias celulares",
    "Avanzado",
    "¿Qué efecto adverso neurológico obliga a monitorización estrecha tras talquetamab (GPRC5D)?",
    [
        "Disgeusia severa y neurotoxicidad ICANS",
        "Neuropatía motora periférica",
        "Ataxia cerebelosa",
        "Ceguera cortical",
    ],
    0,
    "Talquetamab produce disgeusia intensa y riesgo de síndrome neurotóxico (ICANS); la ficha técnica aconseja monitorización neurológica.",
)
























Path("src/data/questions.json").write_text(
    json.dumps(questions, ensure_ascii=False, indent=2)
)
print(f"Total preguntas: {len(questions)}")
