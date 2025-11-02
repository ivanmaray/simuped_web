const CATEGORY_TYPES = {
  UNIT: "unit",
  SPECIALTY: "specialty",
  ALL: "all"
};

export const interactiveTabs = [
  { id: CATEGORY_TYPES.UNIT, label: "Por unidad" },
  { id: CATEGORY_TYPES.SPECIALTY, label: "Por especialidad" },
  { id: CATEGORY_TYPES.ALL, label: "Todos los casos" }
];

export const interactiveCategories = [
  {
    id: "ed_peds",
    label: "Urgencias pediatricas",
    shortLabel: "URG",
    description: "Recepcion y estabilizacion inicial de pacientes pediatrico.",
    type: CATEGORY_TYPES.UNIT,
    state: "free",
    featuredCaseId: "trauma-neuro-guard"
  },
  {
    id: "icu_peds",
    label: "UCI pediatrica",
    shortLabel: "UCIP",
    description: "Soporte organico avanzado para ninos criticos y postoperatorios complejos.",
    type: CATEGORY_TYPES.UNIT,
    state: "locked",
    featuredCaseId: "sepsis-quirofano"
  },
  {
    id: "nicu",
    label: "UCI neonatal",
    shortLabel: "UCIN",
    description: "Cuidados intensivos para recien nacidos de alto riesgo.",
    type: CATEGORY_TYPES.UNIT,
    state: "locked"
  },
  {
    id: "ward_peds",
    label: "Hospitalizacion pediatrica",
    shortLabel: "HOSP",
    description: "Continuidad de cuidados en salas de internacion pediatrica.",
    type: CATEGORY_TYPES.UNIT,
    state: "locked"
  },
  {
    id: "primary_care",
    label: "Atencion primaria",
    shortLabel: "CONS",
    description: "Consulta externa, seguimiento y coordinacion comunitaria.",
    type: CATEGORY_TYPES.UNIT,
    state: "free",
    featuredCaseId: "asma-agudo-sala"
  },
  {
    id: "samu",
    label: "SAMU/UVI movil",
    shortLabel: "SAMU",
    description: "Respuesta extrahospitalaria y traslado medicalizado pediatrico.",
    type: CATEGORY_TYPES.UNIT,
    state: "locked"
  },
  {
    id: "trauma",
    label: "Trauma pediatrico",
    shortLabel: "TR",
    description: "Trauma mayor, analgesia y toma de decisiones rapida.",
    type: CATEGORY_TYPES.SPECIALTY,
    state: "free",
    featuredCaseId: "trauma-neuro-guard"
  },
  {
    id: "infectious",
    label: "Infecciones pediatrico",
    shortLabel: "ID",
    description: "Sepsis, focos ocultos y optimizacion de antimicrobianos.",
    type: CATEGORY_TYPES.SPECIALTY,
    state: "locked",
    featuredCaseId: "sepsis-quirofano"
  },
  {
    id: "resp",
    label: "Respiratorio pediatrico",
    shortLabel: "RS",
    description: "Asma, ventilacion y soporte respiratorio escalonado.",
    type: CATEGORY_TYPES.SPECIALTY,
    state: "free",
    featuredCaseId: "asma-agudo-sala"
  },
  {
    id: "cardio",
    label: "Cardio pediatrico",
    shortLabel: "CD",
    description: "Arritmias y soporte hemodinamico pediatrico.",
    type: CATEGORY_TYPES.SPECIALTY,
    state: "locked"
  },
  {
    id: "neuro",
    label: "Neurologia pediatrica",
    shortLabel: "NR",
    description: "Convulsiones, trauma y eventos neurocriticos en ninos.",
    type: CATEGORY_TYPES.SPECIALTY,
    state: "locked"
  }
];

const INVESTIGATION_TYPE_LABEL = {
  bedside: "Cabecera",
  lab: "Laboratorio",
  imaging: "Imagen",
  monitoring: "Monitoreo"
};

export const interactiveCases = [
  {
    id: "trauma-neuro-guard",
    title: "Impacto craneal con signos neurologicos",
    subtitle: "Atleta llega desorientado tras colision intensa",
    categoryIds: ["ed_peds", "trauma"],
    difficulty: "Intermedio",
    duration: "20 min",
    status: "free",
    tags: ["Via aerea", "Perfusion", "Coordinacion"],
    summary:
      "Paciente somnoliento con anisocoria progresiva. Prioriza la proteccion neurologica, el control hemodinamico y la seleccion de imagenes clave.",
    scene: {
      proceduralVariant: "trauma",
      description: "Box UCIP pediatrica en Oviedo",
      notes: "Modelo definitivo pendiente"
    },
    patient: {
      name: "Miguel R.",
      age: 14,
      sex: "masculino",
      arrivalMode: "Traslado extrahospitalario con collar rigido",
      narrative:
        "Presenta perdida transitoria de conciencia en un torneo escolar en Gijon. Llega orientado por momentos pero vuelve a confundirse durante triage en el HUCA.",
      vitals: {
        temperatura: "36.5 C",
        frecuenciaCardiaca: "88 lpm",
        presionArterial: "132/78 mmHg",
        frecuenciaRespiratoria: "20 rpm",
        saturacion: "96 % aire ambiente"
      }
    },
    exam: {
      steps: [
        {
          id: "general_status",
          label: "Estado general inicial",
          notes: "GCS 15 pediatrico. Orientado pero intermitente. Afebril, sin signos de distrés respiratorio agudo."
        },
        {
          id: "airway_screen",
          label: "AIRWAY – Alineacion y permeabilidad",
          notes: "Collar rigido en su lugar. Cavidad oral limpia, sin cuerpos extraños. Voz pastosa, sin estridor."
        },
        {
          id: "breathing_assessment",
          label: "BREATH – Patron ventilatorio",
          notes: "FR 20 rpm con excursion toracica simetrica. Auscultacion con murmullo vesicular conservado y sin crepitantes."
        },
        {
          id: "circulation_check",
          label: "CIRC – Perfusion periferica",
          notes: "Pulsos radiales +2, relleno capilar < 2 s, extremidades tibias. PA dentro de percentil para edad."
        },
        {
          id: "neuro_check",
          label: "NEURO – Pupilas y tono",
          notes: "Midriasis derecha 5 mm con respuesta lenta, izquierda 3 mm reactiva. Sin signos de lateralizacion motora."
        },
        {
          id: "head_neck",
          label: "HEENT / NECK",
          notes: "Equimosis temporal derecha, sensibilidad a la palpacion. Sin otorragia ni rinorraquia. Dolor cervical posterior sin crepitaciones."
        },
        {
          id: "thorax_survey",
          label: "TORAX – Contusiones y ruidos",
          notes: "Dolor costal leve en hemitórax derecho, sin inestabilidad. Auscultacion cardiopulmonar normal, oximetria 96 % en AA."
        },
        {
          id: "abdomen_pelvis",
          label: "ABD / PELVIS",
          notes: "Abdomen blando, depresible, sin defensa. Pelvis estable a la compresion. No hay equimosis de cinturón."
        },
        {
          id: "extremities_back",
          label: "EXTREMIDADES / ESPALDA",
          notes: "Movimientos conservados. Sin deformidades ni sangrado activo. Palpacion dorsal en bloque sin escalones vertebrales."
        },
        {
          id: "skin_psych",
          label: "PIEL / ESTADO EMOCIONAL",
          notes: "Piel rosada, sin diaforesis. Adolescente ansioso pero colaborador, solicita contactar a sus padres."
        }
      ]
    },
    stabilization: [
      {
        id: "head_position",
        action: "Elevar cabecera 30 grados y mantener alineacion cervical",
        rationale: "Favorece el retorno venoso y evita mayor compromiso medular."
      },
      {
        id: "rsi_preparation",
        action: "Preparar secuencia rapida de intubacion con induccion neuroprotectora",
        rationale: "Permite controlar la ventilacion si aparece deterioro del sensorio o vomitos."
      },
      {
        id: "osmotherapy_ready",
        action: "Tener agente osmotico disponible",
        rationale: "Permite manejar signos de hipertension intracraneal si progresan."
      }
    ],
    hypotheses: [
      {
        id: "hematoma_epidural",
        label: "Hematoma epidural agudo",
        rationale: "Trazo fracturario temporal y anisocoria progresiva orientan a lesion arterial focal."
      },
      {
        id: "hematoma_subdural",
        label: "Hematoma subdural agudo",
        rationale: "Mecanismo de aceleracion-desaceleracion puede generar desgarro venoso."
      },
      {
        id: "contusion_cortical",
        label: "Contusion cortico-subcortical",
        rationale: "Trauma frontal o temporal puede producir cambalaches focales sin coleccion biconvexa."
      },
      {
        id: "lesion_axonal_difusa",
        label: "Lesion axonal difusa",
        rationale: "Alteraciones del sensorio fluctuantes tras energia elevada deben considerarla."
      },
      {
        id: "inestabilidad_cervical",
        label: "Inestabilidad cervical oculta",
        rationale: "Dolor cervical y mecanismo de alta energia exigen valorar mediante imagen dirigida."
      },
      {
        id: "conmocion_leve",
        label: "Conmocion cerebral leve",
        rationale: "Siempre considerar opciones de buen pronostico cuando examenes iniciales sean normales."
      }
    ],
    investigations: [
      {
        id: "fast_scan",
        label: "EcoFAST extendido",
        type: "bedside",
        description: "Valora rapidamente cavidades toracoabdominales para descartar sangrado oculto.",
        time: 5,
        cost: 1,
        result: {
          summary: "Sin liquido libre en recesos abdominales ni pericardio.",
          highlights: [
            "Diafragma y pulmones con deslizamiento conservado",
            "No se identifican contusiones cardiacas"
          ],
          interpretation: "Bajo riesgo de hemorragia intraabdominal inestable en este momento."
        },
        isCritical: false
      },
      {
        id: "lab_bioquimica",
        label: "Bioquimica sanguinea",
        type: "lab",
        description: "Solicita panel metabolico con electrolitos y funcion renal.",
        time: 25,
        cost: 1,
        result: {
          summary: "Electrolitos dentro de parametros y funcion renal estable.",
          highlights: [
            "Sodio 140 mmol/L",
            "Potasio 4.1 mmol/L",
            "Creatinina 0.7 mg/dL"
          ]
        },
        isCritical: false
      },
      {
        id: "lab_hemograma",
        label: "Hemograma completo",
        type: "lab",
        description: "Valora globulos rojos, blancos y plaquetas para planificar intervenciones.",
        time: 20,
        cost: 1,
        result: {
          summary: "Conteo global sin anemia y plaquetas en rango seguro.",
          highlights: [
            "Hemoglobina 13.2 g/dL",
            "Leucocitos 9.8 x10^3/uL",
            "Plaquetas 210 x10^3/uL"
          ]
        },
        isCritical: false
      },
      {
        id: "lab_coagulacion",
        label: "Perfil de coagulacion",
        type: "lab",
        description: "Confirma tiempos de coagulacion y fibrinogeno antes de procedimientos invasivos.",
        time: 25,
        cost: 1,
        result: {
          summary: "Tiempo de protrombina y TTPa dentro de limites pediatricos.",
          highlights: [
            "TP 12.8 s",
            "INR 1.0",
            "TTPa 31 s"
          ]
        },
        isCritical: false
      },
      {
        id: "ct_head",
        label: "Tomografia craneal sin contraste",
        type: "imaging",
        description: "Define lesiones intracraneales agudas y desplazamientos.",
        time: 20,
        cost: 3,
        result: {
          summary: "Coleccion extraaxial biconvexa temporal derecha con desplazamiento de linea media 5 mm.",
          highlights: [
            "Fractura temporal asociada",
            "No se observa lesion intraventricular",
            "Ventriculos comprimidos"
          ],
          interpretation: "Lesion focal con efecto de masa que requiere valoracion neuroquirurgica urgente."
        },
        isCritical: true
      }
    ],
    interventions: [
      {
        id: "airway_rsi",
        label: "Secuencia rapida con agente hipnotico y relajante no despolarizante",
        steps: [
          "Preoxigenar con reservorio",
          "Inducir con agente que preserve perfusion cerebral",
          "Aplicar rocuronio y asegurar tubo con capnografia"
        ],
        rationale: "Controla la via aerea manteniendo objetivos hemodinamicos."
      },
      {
        id: "ventilation_settings",
        label: "Ventilacion protectora con control de CO2",
        steps: [
          "Volumen corriente 6-7 ml/kg",
          "Capnografia continua",
          "Ajustar FiO2 para saturacion 94-98 %"
        ],
        rationale: "Evita hipoxemia e hipercapnia que agravan el dano secundario."
      },
      {
        id: "procedures_bundle",
        label: "Procedimientos",
        steps: [
          "Descender cabecero a posicion neutra para optimizar retorno venoso cerebral.",
          "Liberar presion del collar rigido manteniendo alineacion en bloque.",
          "Realizar puncion lumbar diferida solo tras descartar efecto de masa en TAC.",
          "Canalizar acceso venoso central guiado por ecografia si se anticipa infusion continua."
        ],
        rationale: "Maniobras fisicas e invasivas activables inmediatamente en el box UCIP."
      },
      {
        id: "blood_bank_support",
        label: "Banco de sangre",
        steps: [
          "Solicitar tipificacion urgente ABO/Rh pediatrica.",
          "Reservar paquete globular irradiado ante posible neurocirugia.",
          "Programar plaquetas y plasma fresco si la coagulacion se altera.",
          "Alertar protocolo de sangrado masivo pediatrico si aparece hipotension refractaria."
        ],
        rationale: "Preparativos transfusionales coordinados para eventos neuroquirurgicos."
      },
      {
        id: "sedacion_fentanilo",
        label: "Sedacion – Fentanilo 1 mcg/kg IV",
        steps: ["Administrar en bolo lento y monitorizar depresion respiratoria."],
        rationale: "Analgesia rapida sin comprometer hemodinamia si se titula adecuadamente."
      },
      {
        id: "sedacion_ketamina",
        label: "Sedacion – Ketamina 0.5 mg/kg",
        steps: ["Usar en bolo disociativo breve antes de maniobras dolorosas."],
        rationale: "Mantiene reflejos de via aerea y estabilidad cardiovascular durante procedimientos." 
      },
      {
        id: "sedacion_midazolam",
        label: "Sedacion – Midazolam 0.05 mg/kg",
        steps: ["Iniciar perfusion continua ajustando segun escala de sedacion."],
        rationale: "Provee ansiolisis y amnesia en paciente ventilado." 
      },
      {
        id: "sedacion_propofol",
        label: "Sedacion – Propofol 80 mcg/kg/min",
        steps: ["Titulacion progresiva vigilando hipotension."],
        rationale: "Sedacion profunda cuando se requiere control neuroprotectivo estrecho." 
      },
      {
        id: "cardio_noradrenalina",
        label: "Cardiovascular – Noradrenalina 0.05-0.2 mcg/kg/min",
        steps: ["Iniciar en bomba con acceso central y ajustar segun PAM."],
        rationale: "Sostiene perfusion cerebral evitando hipotension secundaria." 
      },
      {
        id: "cardio_fenilefrina",
        label: "Cardiovascular – Fenilefrina 1 mcg/kg",
        steps: ["Aplicar bolos intermitentes cuando se precisa refuerzo rapido de PA."],
        rationale: "Aumenta presion sin taquicardia marcada en episodios transitorios." 
      },
      {
        id: "cardio_labetalol",
        label: "Cardiovascular – Labetalol 0.2 mg/kg",
        steps: ["Administrar lento para controlar HTA con taquicardia."],
        rationale: "Reduce presion sin comprometer flujo cerebral excesivamente." 
      },
      {
        id: "cardio_atropina",
        label: "Cardiovascular – Atropina 0.02 mg/kg",
        steps: ["Preparar para bradicardia vagal post intubacion."],
        rationale: "Previene pausas hemodinamicamente significativas tras maniobras." 
      },
      {
        id: "resp_salbutamol",
        label: "Respiratorio – Salbutamol nebulizado 2.5 mg",
        steps: ["Nebulizar con reservorio y repetir segun respuesta."],
        rationale: "Trata broncoespasmo concomitante que limite ventilacion." 
      },
      {
        id: "resp_ipratropio",
        label: "Respiratorio – Ipratropio 0.5 mg",
        steps: ["Agregar a la primera nebulizacion para efecto sinergico."],
        rationale: "Potencia broncodilatacion en crisis mixtas." 
      },
      {
        id: "resp_dexametasona",
        label: "Respiratorio – Dexametasona 0.6 mg/kg",
        steps: ["Administrar EV si sospechas edema laringeo."],
        rationale: "Reduce edema inflamatorio en via aerea superior." 
      },
      {
        id: "resp_heliox",
        label: "Respiratorio – Mezcla Heliox 70/30",
        steps: ["Configurar circuito cerrado en ventilacion asistida."],
        rationale: "Disminuye resistencia inspiratoria en pacientes con obstruccion." 
      },
      {
        id: "gastro_omeprazol",
        label: "Gastro – Omeprazol 1 mg/kg/dia EV",
        steps: ["Iniciar profilaxis temprana y reevaluar diariamente."],
        rationale: "Previene ulcera por estres en paciente critico." 
      },
      {
        id: "gastro_ondansetron",
        label: "Gastro – Ondansetron 0.1 mg/kg EV",
        steps: ["Aplicar si hay nauseas o vomito recurrente."],
        rationale: "Controla vomito que podria elevar presion intracraneal." 
      },
      {
        id: "gastro_metoclopramida",
        label: "Gastro – Metoclopramida 0.1 mg/kg",
        steps: ["Administrar si persiste vomito pese a ondansetron."],
        rationale: "Favorece vaciamiento gastrico y disminuye riesgo de aspiracion." 
      },
      {
        id: "gastro_npo",
        label: "Gastro – Plan NPO y soporte enteral diferido",
        steps: ["Mantener ayuno y coordinar nutricion con neurocirugia."],
        rationale: "Evita distension y aspiracion mientras se decide intervencion." 
      },
      {
        id: "abx_cefazolina",
        label: "Antibiotico – Cefazolina 30 mg/kg EV",
        steps: ["Administrar 30 minutos previo a eventual craniectomia."],
        rationale: "Profilaxis frente a flora cutanea habitual." 
      },
      {
        id: "abx_vancomicina",
        label: "Antibiotico – Vancomicina 15 mg/kg",
        steps: ["Ajustar por niveles si antecedente de MRSA."],
        rationale: "Amplia cobertura para Staphylococcus resistente." 
      },
      {
        id: "abx_metronidazol",
        label: "Antibiotico – Metronidazol 10 mg/kg",
        steps: ["Agregar si hay herida abierta contaminada."],
        rationale: "Cubre anaerobios en fracturas abiertas." 
      },
      {
        id: "obgyn_template",
        label: "OB/GYN – Sin indicacion en este caso",
        steps: ["Registrar ausencia de embarazo o patologias asociadas."],
        rationale: "Plantilla estandar para escenarios futuros." 
      },
      {
        id: "alergia_difenhidramina",
        label: "Alergia – Difenhidramina 1 mg/kg EV",
        steps: ["Administrar ante urticaria o prurito leve."],
        rationale: "Maneja reacciones leves a farmacos o contraste." 
      },
      {
        id: "alergia_metilpred",
        label: "Alergia – Metilprednisolona 2 mg/kg",
        steps: ["Aplicar si la reaccion progresa pese a antihistaminicos."],
        rationale: "Reduce respuesta inflamatoria sistemica." 
      },
      {
        id: "alergia_adrenalina",
        label: "Alergia – Adrenalina IM 0.01 mg/kg",
        steps: ["Inyectar en muslo medio ante signos de anafilaxia."],
        rationale: "Intervencion critica cuando hay compromiso de via aerea o perfusion." 
      },
      {
        id: "tox_naloxona",
        label: "Toxicologia – Naloxona 0.1 mg/kg EV",
        steps: ["Titular cada 2-3 minutos si persiste depresion respiratoria."],
        rationale: "Revierte rapidamente efectos de opioides." 
      },
      {
        id: "tox_flumazenil",
        label: "Toxicologia – Flumazenil 0.01 mg/kg",
        steps: ["Administrar solo si no hay antecedente convulsivo."],
        rationale: "Reversa benzodiacepinas en situaciones seleccionadas." 
      },
      {
        id: "tox_bicarbonato",
        label: "Toxicologia – Bicarbonato 1-2 mEq/kg",
        steps: ["Infundir si se observa QRS ancho por intoxicacion."],
        rationale: "Contrarresta toxicidad de farmacos tipo sodio-bloqueadores." 
      },
      {
        id: "tox_oxigeno",
        label: "Toxicologia – Oxigenoterapia al 100 %",
        steps: ["Iniciar de inmediato si se sospecha exposicion a monoxido."],
        rationale: "Desplaza CO de la hemoglobina y mejora transporte de oxigeno." 
      },
      {
        id: "psico_contencion",
        label: "Psicologico – Contencion verbal guiada",
        steps: ["Involucrar psicologia pediatrica y familia."],
        rationale: "Disminuye ansiedad y colabora en sedacion minima." 
      },
      {
        id: "psico_lorazepam",
        label: "Psicologico – Lorazepam 0.03 mg/kg",
        steps: ["Administrar ante agitacion post extubacion."],
        rationale: "Controla inquietud preservando hemodinamia." 
      },
      {
        id: "psico_quetiapina",
        label: "Psicologico – Quetiapina 12.5 mg nocturna",
        steps: ["Valorar si delirium hiperactivo persiste."],
        rationale: "Favorece reposo nocturno sin grandes efectos hemodinamicos." 
      },
      {
        id: "mis_manitol",
        label: "Adyuvante – Manitol 0.5-1 g/kg",
        steps: ["Administrar en bolo y monitorizar osmolaridad."],
        rationale: "Reduce presion intracraneal mediante efecto osmotico." 
      },
      {
        id: "mis_hipertonica",
        label: "Adyuvante – Suero hipertonico 3 % 2 ml/kg",
        steps: ["Infundir en 15 minutos con control de sodio."],
        rationale: "Alternativa para controlar hipertension intracraneal sostenida." 
      },
      {
        id: "mis_dexa",
        label: "Adyuvante – Dexametasona 0.15 mg/kg",
        steps: ["Utilizar si neuroimagen muestra edema vasogenico."],
        rationale: "Disminuye inflamacion perilesional." 
      },
      {
        id: "mis_paracetamol",
        label: "Adyuvante – Paracetamol 15 mg/kg EV",
        steps: ["Mantener cada 6 horas segun temperatura."],
        rationale: "Controla fiebre sin afectar plaquetas." 
      }
    ],
    communications: [
      "Avisar a neurocirugia con hallazgos pupilares y resultados de imagen",
      "Coordinar traslado seguro a tomografia y eventual quirofano",
      "Actualizar a anestesia sobre preparacion de RSI"
    ],
    handoffNotes: [
      "Paciente intubado, sedado y ventilado con ajustes neuroprotectores",
      "Presion arterial media 75 mmHg tras fluidos y vasopresor ligero",
      "Tomografia muestra lesion extraaxial con desplazamiento de linea media"
    ],
    evaluation: {
      mandatoryInvestigations: ["ct_head"],
  recommendedInvestigations: ["fast_scan", "lab_bioquimica", "lab_hemograma", "lab_coagulacion"],
      criticalInterventions: ["airway_rsi"],
      avoidInterventions: ["opioid_bolus"],
      diagnosisOptions: [
        { id: "hematoma_epidural", label: "Hematoma epidural agudo", correct: true },
        { id: "hematoma_subdural", label: "Hematoma subdural agudo", correct: false },
        { id: "lesion_axonal_difusa", label: "Lesion axonal difusa", correct: false },
        { id: "conmocion_leve", label: "Conmocion cerebral leve", correct: false }
      ],
      summaryTips: [
        "Confirma imagen con contraste si es seguro segun criterios neuroquirurgicos",
        "Mantiene presion arterial media mayor a 70 mmHg",
        "Reevalua pupilas cada 15 minutos"
      ]
    }
  },
  {
    id: "sepsis-quirofano",
    title: "Paciente hipotenso tras cirugia abdominal",
    subtitle: "Reingresada a sala de recuperacion con signos de hipoperfusion",
    categoryIds: ["icu_peds", "infectious"],
    difficulty: "Avanzado",
    duration: "25 min",
    status: "locked",
    tags: ["Reanimacion", "Antibioticos", "Seguimiento"],
    summary:
      "Paciente en edad escolar con fiebre y presion en descenso pocas horas despues de una cirugia abdominal. Ajusta reanimacion, identifica foco y organiza cobertura antimicrobiana.",
    patient: {
      name: "Lucia G.",
      age: 11,
      sex: "femenino",
      arrivalMode: "Traslado desde recuperacion postoperatoria",
      narrative:
        "Tras apendicectomia complicada mantiene drenaje seroso moderado. Presenta escalofrios y somnolencia leve en la ultima hora con tendencia a la hipotension.",
      vitals: {
        temperatura: "38.6 C",
        frecuenciaCardiaca: "132 lpm",
        presionArterial: "92/50 mmHg",
        frecuenciaRespiratoria: "26 rpm",
        saturacion: "94 % venturi 40 %"
      }
    },
    exam: {
      steps: [
        {
          id: "perfusion",
          label: "Evaluar perfusion periferica",
          notes: "Extremidades frias con relleno capilar 4 segundos."
        },
        {
          id: "abdomen",
          label: "Inspeccionar abdomen y drenajes",
          notes: "Dolor difuso, defensa leve. Drenaje seroso sin bilis ni sangre."
        },
        {
          id: "neurologico",
          label: "Nivel de conciencia",
          notes: "Somnolienta, abre ojos al llamado y obedece ordenes simples."
        }
      ]
    },
    stabilization: [
      {
        id: "fluid_bolus",
        action: "Administrar 30 ml/kg de cristaloide balanceado en bolos fraccionados",
        rationale: "Evalua respuesta hemodinamica temprana y relleno efectivo."
      },
      {
        id: "vasopressor",
        action: "Preparar noradrenalina si PAM persiste menor a 65 mmHg",
        rationale: "Mantiene perfusion critica cuando los fluidos no son suficientes."
      },
      {
        id: "monitor_invasive",
        action: "Solicitar acceso arterial y monitoreo frecuente",
        rationale: "Permite ajustes finos de vasopresores y control de tendencia."
      }
    ],
    hypotheses: [
      {
        id: "infeccion_abdominal",
        label: "Foco abdominal posoperatorio",
        rationale: "Relacion temporal con cirugia y fiebre creciente."
      },
      {
        id: "sangrado_oculto",
        label: "Sangrado oculto",
        rationale: "Debe descartarse ante hipotension y drenajes."
      },
      {
        id: "evento_trombotico",
        label: "Evento trombotico",
        rationale: "Taquicardia y disnea pueden asociarse a tromboembolismo."
      }
    ],
    investigations: [
      {
        id: "sepsis_labs",
        label: "Panel inicial de sepsis",
        type: "lab",
        description: "Incluye hemocultivos, lactato y procalcitonina.",
        time: 45,
        cost: 3,
        result: {
          summary: "Lactato 3.8 mmol/L, procalcitonina elevada. Hemocultivos pendientes.",
          highlights: [
            "Leucocitos 18k con neutrofilia",
            "Creatinina 0.9 mg/dL respecto a basal 0.5"
          ],
          interpretation: "Sugiere sepsis con hipoperfusion y disfuncion renal leve."
        },
        isCritical: true
      },
      {
        id: "gas_arterial",
        label: "Gasometria arterial",
        type: "monitoring",
        description: "Evalua estado acido base y oxigenacion",
        time: 10,
        cost: 1,
        result: {
          summary: "pH 7.31, PaCO2 32 mmHg, PaO2 85 mmHg con FiO2 0.4",
          highlights: [
            "Bicarbonato 18 mmol/L",
            "Lactato coincide con panel principal"
          ],
          interpretation: "Acidosis metabolica con componente respiratorio compensatorio."
        },
        isCritical: false
      },
      {
        id: "ct_abdomen",
        label: "Tomografia abdominopelvica con contraste",
        type: "imaging",
        description: "Explora colecciones y complicaciones de anastomosis.",
        time: 40,
        cost: 4,
        result: {
          summary: "Coleccion perianastomotica con burbujas de gas y realce de tejidos vecinos.",
          highlights: [
            "Liquido libre escaso",
            "Sin signos de sangrado activo"
          ],
          interpretation: "Sugiere foco abdominal que requiere valoracion quirurgica."
        },
        isCritical: true
      }
    ],
    interventions: [
      {
        id: "broad_antibiotics",
        label: "Antibioticos de amplio espectro",
        steps: [
          "Piperacilina tazobactam en dosis ajustada",
          "Agregar cobertura para gram positivos segun riesgo",
          "Revaluar segun cultivos"
        ],
        rationale: "Reduce carga bacteriana mientras se define control de foco."
      },
      {
        id: "guided_fluids",
        label: "Reanimacion guiada por objetivos",
        steps: [
          "Administrar bolos con reevaluacion de PAM y perfusion",
          "Monitorizar presion venosa central segun necesidad",
          "Revaluar lactato en 2 horas"
        ],
        rationale: "Optimiza perfusion y evita sobrecarga innecesaria."
      }
    ],
    communications: [
      "Contactar a cirugia general para evaluar reapertura",
      "Avisar a UCI para eventual traslado",
      "Informar a farmacia para ajustar dosis de antibioticos"
    ],
    handoffNotes: [
      "Bolus de 30 ml/kg completado con mejoria parcial de PAM",
      "Iniciada noradrenalina a 0.05 mcg/kg/min",
      "Tomografia en curso, se esperan resultados en 30 minutos"
    ],
    evaluation: {
      mandatoryInvestigations: ["sepsis_labs", "ct_abdomen"],
      recommendedInvestigations: ["gas_arterial"],
      criticalInterventions: ["broad_antibiotics", "guided_fluids"],
      avoidInterventions: ["suspender_antibioticos"],
      diagnosisOptions: [
        { id: "foco_abdominal", label: "Foco abdominal con compromiso sistemico", correct: true },
        { id: "atelectasia", label: "Complicacion pulmonar leve sin impacto sistemico", correct: false },
        { id: "reaccion_farmacologica", label: "Reaccion farmacologica aislada", correct: false }
      ],
      summaryTips: [
        "Revaluar lactato tras intervenciones",
        "Documentar balance de fluidos",
        "Registrar hora de inicio de antibioticos"
      ]
    }
  },
  {
    id: "asma-agudo-sala",
    title: "Crisis respiratoria en adolescente",
    subtitle: "Consulta por disnea intensa y uso de musculatura accesoria",
    categoryIds: ["primary_care", "resp"],
    difficulty: "Intermedio",
    duration: "18 min",
    status: "free",
    tags: ["Broncodilatadores", "Ventilacion", "Educacion"],
    summary:
      "Paciente escolar con historia de asma persistente que presenta descompensacion severa. Ajusta broncodilatadores, monitoriza respuesta y anticipa soporte ventilatorio.",
    patient: {
      name: "Carla F.",
      age: 13,
      sex: "femenino",
      arrivalMode: "Consulta espontanea",
      narrative:
        "Refiere desencadenante alergico reciente. Uso multiple del inhalador de rescate sin alivio.",
      vitals: {
        temperatura: "36.8 C",
        frecuenciaCardiaca: "134 lpm",
        presionArterial: "118/70 mmHg",
        frecuenciaRespiratoria: "32 rpm",
        saturacion: "89 % mascara reservorio"
      }
    },
    exam: {
      steps: [
        {
          id: "auscultacion",
          label: "Auscultar campos pulmonares",
          notes: "Sibilancias difusas con periodos de silencio apical."
        },
        {
          id: "habla",
          label: "Capacidad para hablar",
          notes: "Solo emite frases cortas antes de detenerse a tomar aire."
        },
        {
          id: "uso_musculos",
          label: "Uso de musculatura accesoria",
          notes: "Retracciones intercostales y supraclaviculares visibles."
        }
      ]
    },
    stabilization: [
      {
        id: "nebulizacion",
        action: "Nebulizar salbutamol e ipratropio en secuencias",
        rationale: "Mejora broncodilatacion inicial mientras se monitoriza respuesta."
      },
      {
        id: "corticoide",
        action: "Administrar corticoide sistemico temprano",
        rationale: "Reduce inflamacion y previene recaida."
      },
      {
        id: "magnesio",
        action: "Considerar sulfato de magnesio si respuesta parcial",
        rationale: "Apoya broncodilatacion en crisis severa."
      }
    ],
    hypotheses: [
      {
        id: "estado_asmatico",
        label: "Exacerbacion severa de asma",
        rationale: "Presentacion clinica clasica con respuesta limitada a beta agonistas."
      },
      {
        id: "embolia",
        label: "Evento tromboembolico",
        rationale: "Debe descartarse en pacientes con disnea subita y taquicardia."
      },
      {
        id: "anafilaxia",
        label: "Reaccion alergica sistemica",
        rationale: "Antecedente alergico reciente obliga a valorar edema de via aerea."
      }
    ],
    investigations: [
      {
        id: "peak_flow",
        label: "Peak flow seriado",
        type: "monitoring",
        description: "Cuantifica respuesta a broncodilatadores.",
        time: 5,
        cost: 1,
        result: {
          summary: "70 L/min al ingreso (30 % del personal mejor) y 120 L/min tras primera nebulizacion.",
          highlights: [
            "Mejora progresiva pero aun lejos del valor personal",
            "Se recomienda repetir tras segunda ronda"
          ],
          interpretation: "Respuesta parcial, continuar escalamiento terapeutico."
        },
        isCritical: true
      },
      {
        id: "gasometria",
        label: "Gasometria arterial",
        type: "lab",
        description: "Evalua ventilacion y fatiga",
        time: 15,
        cost: 2,
        result: {
          summary: "pH 7.32, PaCO2 48 mmHg, PaO2 75 mmHg con FiO2 0.6",
          highlights: [
            "Evidencia de retencion de CO2",
            "Gradiente alveolo arterial moderado"
          ],
          interpretation: "Sugiere fatiga y necesidad de soporte si no mejora rapido."
        },
        isCritical: true
      },
      {
        id: "rx_torax",
        label: "Radiografia de torax",
        type: "imaging",
        description: "Descarta complicaciones como neumotorax.",
        time: 25,
        cost: 2,
        result: {
          summary: "Hiperinsuflacion difusa, sin infiltrados ni neumotorax.",
          highlights: [
            "Diafragmas aplanados",
            "Campos pulmonares claros"
          ],
          interpretation: "Hallazgos compatibles con crisis asmatica."
        },
        isCritical: false
      }
    ],
    interventions: [
      {
        id: "vni_preparacion",
        label: "Preparar ventilacion no invasiva",
        steps: [
          "Configurar modo con soporte inspiratorio",
          "Iniciar cuando saturacion o trabajo respiratorio no mejoren",
          "Monitorear tolerancia"
        ],
        rationale: "Reduce el trabajo respiratorio si la respuesta a broncodilatadores es insuficiente."
      },
      {
        id: "educacion_plan",
        label: "Plan educativo previo al alta",
        steps: [
          "Revisar tecnica inhalatoria",
          "Entregar plan de accion por zonas",
          "Coordinar seguimiento precoz"
        ],
        rationale: "Disminuye recurrencias y mejora adherencia."
      }
    ],
    communications: [
      "Avisar a UCI para cama si requiere ventilacion no invasiva",
      "Coordinar consulta con alergologia y neumonologia",
      "Informar a familia sobre signos de alarma"
    ],
    handoffNotes: [
      "Tras segunda nebulizacion: Sat 93 %, FR 26 rpm",
      "Gasometria con retencion moderada de CO2",
      "Plan para VNI si no mejora en 10 minutos"
    ],
    evaluation: {
      mandatoryInvestigations: ["peak_flow", "gasometria"],
      recommendedInvestigations: ["rx_torax"],
      criticalInterventions: ["nebulizacion", "corticoide"],
      avoidInterventions: ["suspender_beta"],
      diagnosisOptions: [
        { id: "crisis_asmatica", label: "Crisis asmatica grave", correct: true },
        { id: "neumonia", label: "Neumonia bacteriana extensa", correct: false },
        { id: "coronario", label: "Sindrome coronario agudo", correct: false }
      ],
      summaryTips: [
        "Repetir peak flow y documentar respuesta",
        "Planificar seguimiento y educacion",
        "Registrar tiempos de cada nebulizacion"
      ]
    }
  }
];

export function getInvestigationTypeLabel(type) {
  return INVESTIGATION_TYPE_LABEL[type] || "Otros";
}

export function getInteractiveCasesByCategory(categoryId) {
  if (!categoryId) return interactiveCases;
  return interactiveCases.filter((scenario) => scenario.categoryIds.includes(categoryId));
}

export function findInteractiveCase(caseId) {
  if (!caseId) return null;
  return interactiveCases.find((scenario) => scenario.id === caseId) || null;
}

export function isCaseLocked(caseId) {
  const match = findInteractiveCase(caseId);
  return match?.status === "locked";
}

export { CATEGORY_TYPES };
