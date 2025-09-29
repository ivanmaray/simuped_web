// /src/pages/PresencialInstructor.jsx
// Ruta esperada: /presencial/instructor/:id/:sessionId  (id = escenario)
// También soporta: /presencial/instructor
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "../../../../supabaseClient";
import Navbar from "../../../../components/Navbar.jsx";
import { reportWarning } from "../../../../utils/reporting.js";
import { chestXrayLibraryByCategory } from "../../../../utils/chestXrayLibrary.js";


const CHECK_STATUSES = [
  { key: 'ok', label: 'Bien', icon: '✔️' },
  { key: 'wrong', label: 'Mal', icon: '✖️' },
  { key: 'missed', label: 'No hecho', icon: '⬜' },
  { key: 'na', label: 'N/A', icon: '∅' },
];

function parseChestXrayValue(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.kind === 'image' && parsed.src) {
      return {
        ...parsed,
        alt: parsed.alt || parsed.label || 'Radiografía de tórax'
      };
    }
  } catch {}
  return null;
}

function parsePatientDemographics(overview) {
  const info = { chips: [], weightKg: null };
  if (!overview || typeof overview !== 'string') return info;
  let rest = overview.trim();

  const pushChip = (key, label) => {
    if (!label) return;
    info.chips.push({ key, label: String(label) });
  };

  try {
    const m = rest.match(/^\s*\{[\s\S]*?\}\s*(?:\n+|$)/);
    if (m && m[0]) {
      const jsonTxt = m[0].trim().replace(/,+\s*$/, '');
      const demo = JSON.parse(jsonTxt);
      const age = demo.age || demo.edad;
      const sex = demo.sex || demo.sexo;
      const weight = demo.weightKg ?? demo.weight_kg ?? demo.peso ?? demo.weight;
      if (age) pushChip('age', age);
      if (sex) pushChip('sex', sex);
      if (weight) {
        const numeric = Number(String(weight).toString().replace(',', '.'));
        if (Number.isFinite(numeric) && numeric > 0) info.weightKg = Number(numeric.toFixed(2));
        pushChip('weight', info.weightKg ? `${info.weightKg} kg` : `${weight}`);
      }
      rest = rest.slice(m[0].length).trim();
    }
  } catch (error) {
    reportWarning('PresencialInstructor.parseDemographics', error);
  }

  if (info.weightKg == null) {
    const weightPattern = /(?:peso|weight)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i;
    const mm = rest.match(weightPattern);
    if (mm && mm[1]) {
      const numeric = Number(mm[1].replace(',', '.'));
      if (Number.isFinite(numeric) && numeric > 0) {
        info.weightKg = Number(numeric.toFixed(2));
        pushChip('weight', `${info.weightKg} kg`);
      }
    }
  }

  return info;
}

// --- Checklist categorías ABCDE/Patología/Medicación/Otros ---
const CATEGORY_ORDER = ['A', 'B', 'C', 'D', 'E', 'Diagnóstico', 'Tratamiento', 'Otros'];
const ROLE_ORDER = ['Todos', 'Medicina', 'Enfermería', 'Farmacia', 'Común'];
function normalizeRole(role) {
  const r = String(role || '').trim();
  if (/^enfer/i.test(r)) return 'Enfermería';
  if (/^farma/i.test(r)) return 'Farmacia';
  if (/^med/i.test(r)) return 'Medicina';
  if (/^com[uú]n$/i.test(r)) return 'Común';
  if (!r) return 'Medicina'; // por compatibilidad: si no tiene rol lo tratamos como Medicina
  return r;
}
const ROLE_COLORS = {
  Medicina: 'bg-blue-50 text-blue-700 ring-blue-200',
  'Enfermería': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Farmacia: 'bg-violet-50 text-violet-700 ring-violet-200',
  'Común': 'bg-slate-100 text-slate-700 ring-slate-300',
};
const WEIGHT_BADGE = {
  3: { label: 'Crítico', cls: 'bg-red-50 text-red-700 ring-red-200' },
  2: { label: 'Importante', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  1: { label: 'Deseable', cls: 'bg-slate-100 text-slate-700 ring-slate-300' },
};
const DEMO_CHIP_ICONS = { age: '🧒', sex: '⚧', weight: '⚖️' };
const VARIABLE_GROUP_CONFIG = {
  vital: {
    title: 'Constantes',
    description: 'Modifica signos vitales y publícalos cuando proceda.',
    grid: 'grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    maxHeight: 'max-h-[22rem]'
  },
  lab: {
    title: 'Analíticas',
    description: 'Resultados de laboratorio disponibles para el caso.',
    grid: 'grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    maxHeight: 'max-h-[22rem]'
  },
  imagen: {
    title: 'Imágenes',
    description: 'Selecciona radiografías o imágenes para el alumnado.',
    grid: 'grid gap-3 text-sm sm:grid-cols-2',
    maxHeight: 'max-h-[20rem]'
  },
  texto: {
    title: 'Notas',
    description: 'Observaciones y textos breves para contextualizar.',
    grid: 'grid gap-3 text-sm',
    maxHeight: 'max-h-[18rem]'
  },
  otros: {
    title: 'Otros datos',
    description: 'Cualquier dato adicional compartido con los alumnos.',
    grid: 'grid gap-3 text-sm sm:grid-cols-2',
    maxHeight: 'max-h-[18rem]'
  }
};
function normalizeCategory(category) {
  if (!category) return 'Otros';
  const c = String(category).trim();
  if (/^a$/i.test(c)) return 'A';
  if (/^b$/i.test(c)) return 'B';
  if (/^c$/i.test(c)) return 'C';
  if (/^d$/i.test(c)) return 'D';
  if (/^e$/i.test(c)) return 'E';
  if (/diagnos/i.test(c)) return 'Diagnóstico';
  if (/(trat|tx)/i.test(c)) return 'Tratamiento';
  if (CATEGORY_ORDER.includes(c)) return c;

  // Heurística por palabras clave (ES) para items sin prefijo
  const KEYWORDS = {
    A: [/v[íi]a\s*a[ée]rea/i, /c[áa]nula|orofaring(ea|ea)|airway|intub/i],
    B: [/respir|ventila|satur|SpO2|oxigen/i, /auscult/i],
    C: [/circul|frecuencia\s*card(i|í)a|pulso/i, /tensi[óo]n\s*arterial|\bTA\b/i, /capilar/i, /v[íi]a\s*venosa|acceso\s*vascular|fluidoterapia/i, /monitoriz/i],
    D: [/neurol|glasgow|AVPU/i, /conscien|pupila/i, /glucem/i],
    E: [/expos|temperat|lesion|herid|hipoterm/i],
    'Patología': [/patolog|diagn[óo]stico|\bdx\b/i, /pruebas\s*complement/i],
    'Medicación': [/medic|f[áa]rmac|farmac|dosis|posolog/i],
  };

  for (const cat of ['A','B','C','D','E','Patología','Medicación']) {
    const rules = KEYWORDS[cat] || [];
    if (rules.some((rx) => rx.test(c))) return cat;
  }
  return 'Otros';
}

console.debug('[Instructor] componente v2 cargado');

const colors = {
  primary: "#0A3D91",
  primaryLight: "#4FA3E3",
  accent: "#1E6ACB",
};

const LS_KEY = 'presencial:last_session';

// --- Audio helpers (beeps/alerts) ---
const audioCtxRef = { ctx: null };
function ensureCtx() {
  if (!audioCtxRef.ctx) {
    try { audioCtxRef.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  const ctx = audioCtxRef.ctx;
  if (ctx && ctx.state === 'suspended') {
    try { ctx.resume(); } catch {}
  }
  return ctx;
}

function playBeep({ freq = 880, ms = 180, gain = 0.12 } = {}) {
  const ctx = ensureCtx(); if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g); g.connect(comp); comp.connect(ctx.destination);
  const t0 = ctx.currentTime; const t1 = t0 + ms / 1000;
  osc.start(t0); osc.stop(t1);
}

function playAlarm() {
  const ctx = ensureCtx(); if (!ctx) return;
  playBeep({ freq: 700, ms: 220, gain: 0.18 });
  setTimeout(() => playBeep({ freq: 920, ms: 220, gain: 0.18 }), 260);
  setTimeout(() => playBeep({ freq: 1150, ms: 260, gain: 0.18 }), 520);
}



// Texto-guion por defecto (se puede editar en UI)
const DEFAULT_SCRIPT = [
  'Llegada a urgencias: lactante de 12 meses con fiebre alta y decaimiento. Se inicia triage.',
  'Empeora clínicamente: cianosis periférica y relleno capilar lento. Sospecha de hipotensión: preparar fluidoterapia.',
  'Desaturación progresiva: valorar ventilación no invasiva y monitorización continua.'
];

const DEFAULT_VENT_FORM = {
  mode: 'VC',
  parameters: {
    tidalVolume: 70, // ml/kg aproximados
    rate: 24,       // rpm
    peep: 5,
    fio2: 0.4,
    inspiratoryTime: 0.6,
    pressureControl: 18,
    pressureSupport: 12
  },
  patient: {
    compliance: 0.7,  // 0-1 (1 = buena)
    resistance: 0.5,  // 0-1 (1 = alta resistencia)
    shunt: 0.15,
    deadspace: 0.18
  }
};

const VENTILATION_TEMPLATES = [
  {
    key: 'vc-estable',
    name: 'Soporte básico',
    description: 'Paciente estable con control por volumen.',
    mode: 'VC',
    tidalVolumePerKg: 7,
    parameters: {
      rate: 24,
      peep: 5,
      fio2: 0.4,
      inspiratoryTime: 0.6,
      pressureControl: 18,
      pressureSupport: 12
    },
    patient: {
      compliance: 0.7,
      resistance: 0.4,
      shunt: 0.12,
      deadspace: 0.18
    }
  },
  {
    key: 'vc-distrés',
    name: 'Distrés moderado',
    description: 'Volumen bajo, PEEP más alta y FiO₂ intermedia.',
    mode: 'VC',
    tidalVolumePerKg: 6,
    parameters: {
      rate: 28,
      peep: 7,
      fio2: 0.5,
      inspiratoryTime: 0.55,
      pressureControl: 20,
      pressureSupport: 14
    },
    patient: {
      compliance: 0.45,
      resistance: 0.5,
      shunt: 0.2,
      deadspace: 0.22
    }
  },
  {
    key: 'pc-bronco',
    name: 'Broncoespasmo severo',
    description: 'Control por presión con resistencia elevada.',
    mode: 'PC',
    tidalVolumePerKg: 7,
    parameters: {
      rate: 26,
      peep: 6,
      fio2: 0.45,
      inspiratoryTime: 0.5,
      pressureControl: 22,
      pressureSupport: 16
    },
    patient: {
      compliance: 0.55,
      resistance: 0.85,
      shunt: 0.16,
      deadspace: 0.24
    }
  },
  {
    key: 'vc-neumonia',
    name: 'Neumonía hipoxémica',
    description: 'Control por volumen con PEEP alta y FiO₂ moderada-alta.',
    mode: 'VC',
    tidalVolumePerKg: 6,
    parameters: {
      rate: 26,
      peep: 8,
      fio2: 0.6,
      inspiratoryTime: 0.65,
      pressureControl: 22,
      pressureSupport: 14
    },
    patient: {
      compliance: 0.42,
      resistance: 0.45,
      shunt: 0.26,
      deadspace: 0.2
    }
  },
  {
    key: 'vc-sepsis-protect',
    name: 'Sepsis ventilación protectora',
    description: 'Volumen bajo y frecuencia alta para estrategia protectora.',
    mode: 'VC',
    tidalVolumePerKg: 5,
    parameters: {
      rate: 30,
      peep: 7,
      fio2: 0.5,
      inspiratoryTime: 0.7,
      pressureControl: 20,
      pressureSupport: 13
    },
    patient: {
      compliance: 0.5,
      resistance: 0.5,
      shunt: 0.2,
      deadspace: 0.25
    }
  },
  {
    key: 'psv-destete',
    name: 'Weaning / soporte ligero',
    description: 'Presión soporte baja para transición a extubación.',
    mode: 'PSV',
    tidalVolumePerKg: 7,
    parameters: {
      rate: 22,
      peep: 5,
      fio2: 0.35,
      inspiratoryTime: 0.6,
      pressureControl: 18,
      pressureSupport: 10
    },
    patient: {
      compliance: 0.75,
      resistance: 0.35,
      shunt: 0.1,
      deadspace: 0.16
    }
  },
  {
    key: 'pc-asmatico',
    name: 'Crisis asmática',
    description: 'Control por presión con resistencia muy elevada y Ti corto.',
    mode: 'PC',
    tidalVolumePerKg: 7,
    parameters: {
      rate: 20,
      peep: 4,
      fio2: 0.45,
      inspiratoryTime: 0.45,
      pressureControl: 24,
      pressureSupport: 18
    },
    patient: {
      compliance: 0.6,
      resistance: 0.95,
      shunt: 0.14,
      deadspace: 0.3
    }
  },
  {
    key: 'vc-sdra-grave',
    name: 'SDRA grave',
    description: 'Estrategia muy protectora con volumen muy bajo y PEEP alta.',
    mode: 'VC',
    tidalVolumePerKg: 4.5,
    parameters: {
      rate: 28,
      peep: 10,
      fio2: 0.8,
      inspiratoryTime: 0.65,
      pressureControl: 24,
      pressureSupport: 16
    },
    patient: {
      compliance: 0.32,
      resistance: 0.55,
      shunt: 0.32,
      deadspace: 0.22
    }
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildFormFromTemplate(template, weightKg) {
  if (!template) return DEFAULT_VENT_FORM;
  const base = {
    mode: template.mode || DEFAULT_VENT_FORM.mode,
    parameters: { ...DEFAULT_VENT_FORM.parameters, ...template.parameters },
    patient: { ...DEFAULT_VENT_FORM.patient, ...template.patient }
  };
  if (weightKg && template.tidalVolumePerKg) {
    const vt = clamp(Math.round(weightKg * template.tidalVolumePerKg), 10, 200);
    base.parameters.tidalVolume = vt;
  }
  base.parameters = { ...base.parameters };
  base.patient = { ...base.patient };
  return base;
}

function buildCycleWaveforms({ mode, parameters, patient }) {
  const samples = 60;
  const vtLiters = clamp(parameters.tidalVolume, 10, 200) / 1000; // 0.01-0.2 L
  const rate = clamp(parameters.rate, 8, 40);
  const cycle = 60 / rate;
  const inspTime = clamp(parameters.inspiratoryTime, 0.3, cycle * 0.75);
  const expTime = cycle - inspTime;

  const compliance = 0.02 + clamp(patient.compliance, 0.1, 1) * 0.08; // L/cmH2O
  const resistance = 5 + clamp(patient.resistance, 0, 1) * 25; // cmH2O/L/s

  const time = Array.from({ length: samples }, (_, i) => (i / (samples - 1)) * cycle);
  const pressure = [];
  const volume = [];
  const flow = [];

  const peep = clamp(parameters.peep, 0, 12);
  const targetPressure = mode === 'PC'
    ? peep + clamp(parameters.pressureControl, 10, 35)
    : peep + vtLiters / compliance;

  const inspFlow = mode === 'VC'
    ? vtLiters / inspTime
    : (targetPressure - peep) / Math.max(1, resistance);

  time.forEach((t) => {
    if (t <= inspTime) {
      const inspRatio = t / inspTime;
      const vol = vtLiters * (mode === 'PSV' ? Math.pow(inspRatio, 0.7) : inspRatio);
      const pres = mode === 'PC'
        ? peep + (targetPressure - peep) * (0.6 + 0.4 * inspRatio)
        : peep + vol / compliance + patient.resistance * 4 * inspRatio;
      pressure.push(pres);
      volume.push(vol);
      flow.push(mode === 'PC' ? inspFlow * (1 - 0.3 * (1 - inspRatio)) : inspFlow);
    } else {
      const expRatio = (t - inspTime) / Math.max(expTime, 0.1);
      const decay = Math.exp(-expRatio * (2 + resistance / 20));
      const vol = vtLiters * decay;
      const pres = peep + (targetPressure - peep) * 0.3 * decay;
      pressure.push(pres);
      volume.push(vol);
      flow.push(-Math.max(0, vtLiters / expTime) * decay);
    }
  });

  return { time, pressure, volume, flow };
}

function buildVentilationState(form, context = {}) {
  const { mode, parameters, patient } = form;
  const rawWeight = context?.weightKg;
  const weightKg = typeof rawWeight === 'number' && Number.isFinite(rawWeight) && rawWeight > 0
    ? Number(rawWeight)
    : null;
  const waveforms = buildCycleWaveforms(form);
  const compliance = 0.02 + clamp(patient.compliance, 0.1, 1) * 0.08;
  const vtMl = clamp(parameters.tidalVolume, 10, 200);
  const vtLiters = vtMl / 1000;
  const plateau = parameters.peep + vtLiters / compliance;
  const peak = plateau + clamp(patient.resistance, 0, 1) * 4;
  const fio2 = clamp(parameters.fio2, 0.21, 1);
  const shunt = clamp(patient.shunt, 0, 0.4);
  const deadspace = clamp(patient.deadspace, 0.05, 0.4);
  const complianceIndex = clamp(patient.compliance, 0, 1);

  const spo2 = clamp(0.91 + (fio2 - 0.21) * 0.12 - shunt * 0.25, 0.75, 0.99);
  const etco2 = clamp(38 + (deadspace - 0.2) * 60 + (0.5 - complianceIndex) * 12, 25, 70);
  const driving = plateau - parameters.peep;
  const tidalPerKg = weightKg ? vtMl / weightKg : null;
  const recommended = weightKg
    ? {
        minMl: Number((weightKg * 6).toFixed(0)),
        maxMl: Number((weightKg * 8).toFixed(0)),
        minMlPerKg: 6,
        maxMlPerKg: 8
      }
    : null;
  const meta = {};
  if (weightKg) meta.weightKg = Number(weightKg.toFixed(1));
  if (tidalPerKg) meta.tidalPerKg = Number(tidalPerKg.toFixed(2));
  if (recommended) meta.recommendedTidal = recommended;
  if (context.template && context.template.name) meta.template = context.template;

  return {
    active: true,
    mode,
    parameters,
    patient,
    generated: {
      metrics: {
        plateauPressure: Number(plateau.toFixed(1)),
        peakPressure: Number(peak.toFixed(1)),
        drivingPressure: Number(driving.toFixed(1)),
        etco2: Number(etco2.toFixed(1)),
        spo2: Number((spo2 * 100).toFixed(1))
      },
      waveforms
    },
    meta: Object.keys(meta).length > 0 ? meta : undefined,
    timestamp: new Date().toISOString()
  };
}

// --- Persistencia local del guion por sesión/escenario ---
function makeScriptKey(sessionId, scenarioId){
  return `presencial:script:${sessionId||'no-session'}:${scenarioId||'no-id'}`;
}
function saveScriptLocal(sessionId, scenarioId, texts, index){
  try { localStorage.setItem(makeScriptKey(sessionId, scenarioId), JSON.stringify({ texts, index })); } catch {}
}
function loadScriptLocal(sessionId, scenarioId){
  try {
    const raw = localStorage.getItem(makeScriptKey(sessionId, scenarioId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.texts)) return null;
    return { texts: parsed.texts, index: typeof parsed.index === 'number' ? parsed.index : 0 };
  } catch { return null; }
}
function clearScriptLocal(sessionId, scenarioId){
  try { localStorage.removeItem(makeScriptKey(sessionId, scenarioId)); } catch {}
}

export default function Presencial_Instructor() {
  const { id, sessionId } = useParams();
  const navigate = useNavigate();

  // Event logger tied to current sessionId
  const logEvent = async (kind, payload = {}) => {
    if (!sessionId) return;
    const at = new Date().toISOString();
    try {
      await supabase.from('session_events').insert({
        session_id: sessionId,
        at,
        kind,
        payload
      });
    } catch (e) {
      console.debug('[Instructor] logEvent skipped:', kind, e);
    }
  };

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [scenario, setScenario] = useState(null); // {id,title,summary}
  const [steps, setSteps] = useState([]); // scenario_steps
  const [variables, setVariables] = useState([]); // scenario_variables

  const [session, setSession] = useState(null); // presencial_sessions row
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef(null);
  const scriptRef = useRef(null);
  const bannerRef = useRef(null);
  const variablesRef = useRef(null);
  const phasesRef = useRef(null);
  const checklistRef = useRef(null);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const xrayLibraryCategories = useMemo(() => Object.entries(chestXrayLibraryByCategory || {}), []);

  // Control de desbloqueo manual y cronómetro locales (solo al pulsar Iniciar)
  const [uiUnlocked, setUiUnlocked] = useState(false);
  const [, setTimerActive] = useState(false);
  const [timerStartAt, setTimerStartAt] = useState(null);

  const isRunning = uiUnlocked; // sombreado/control habilitado solo tras Iniciar

  // NUEVO: estado UI -> fase y banner
  const [currentStepId, setCurrentStepId] = useState(null);
  const [bannerText, setBannerText] = useState("");

  // Valores actuales de variables de la sesión y edición rápida
  const [sessionVarValues, setSessionVarValues] = useState({}); // {variable_id: value}
  const [pendingValues, setPendingValues] = useState({}); // inputs locales
  const [xrayCategorySelection, setXrayCategorySelection] = useState({});
  const [xrayAssignedByCategory, setXrayAssignedByCategory] = useState({});
  const initialTemplate = VENTILATION_TEMPLATES[0] || null;
  const [ventModalOpen, setVentModalOpen] = useState(false);
  const ventModalRef = useRef(null);
  const [ventForm, setVentForm] = useState(initialTemplate ? buildFormFromTemplate(initialTemplate, null) : DEFAULT_VENT_FORM);
  const [ventState, setVentState] = useState(null);
  const [isPublishingVent, setIsPublishingVent] = useState(false);
  const [patientInfo, setPatientInfo] = useState({ chips: [], weightKg: null });
  const weightKg = patientInfo.weightKg;
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(initialTemplate?.key || null);
  const recommendedTidalRange = useMemo(() => {
    if (!weightKg) return null;
    return {
      minMl: Math.round(weightKg * 6),
      maxMl: Math.round(weightKg * 8),
      minMlPerKg: 6,
      maxMlPerKg: 8
    };
  }, [weightKg]);
  const tidalPerKg = useMemo(() => {
    if (!weightKg) return null;
    const tv = Number(ventForm.parameters.tidalVolume);
    if (!Number.isFinite(tv) || tv <= 0) return null;
    return Number((tv / weightKg).toFixed(2));
  }, [ventForm.parameters.tidalVolume, weightKg]);
  const ventAudienceSummary = useMemo(() => {
    if (!ventState) return null;
    switch (ventState.active) {
      case true:
        return {
          text: 'El alumnado ve los parámetros publicados.',
          tone: 'border-emerald-200 bg-emerald-50 text-emerald-700'
        };
      case 'pending':
        return {
          text: 'El alumnado ve la tarjeta de ventilación en estado "Pendiente".',
          tone: 'border-amber-200 bg-amber-50 text-amber-700'
        };
      case 'hidden':
        return {
          text: 'La tarjeta de ventilación está oculta en la pantalla del alumno.',
          tone: 'border-slate-300 bg-slate-100 text-slate-700'
        };
      case false:
        return {
          text: 'El alumnado ve el mensaje de ventilación detenida.',
          tone: 'border-red-200 bg-red-50 text-red-700'
        };
      default:
        return null;
    }
  }, [ventState]);
  const tidalVolumeOutOfRange = useMemo(() => {
    if (!recommendedTidalRange || tidalPerKg == null) return false;
    return tidalPerKg < recommendedTidalRange.minMlPerKg || tidalPerKg > recommendedTidalRange.maxMlPerKg;
  }, [recommendedTidalRange, tidalPerKg]);

  const variablesGrouped = useMemo(() => {
    const groups = {
      vital: [],
      lab: [],
      imagen: [],
      texto: [],
      otros: [],
    };
    for (const item of variables) {
      const type = item?.type;
      if (type === 'vital') groups.vital.push(item);
      else if (type === 'lab') groups.lab.push(item);
      else if (type === 'imagen') groups.imagen.push(item);
      else if (type === 'texto') groups.texto.push(item);
      else groups.otros.push(item);
    }
    return groups;
  }, [variables]);

  const renderVariableCard = (v) => {
    const isOn = revealed.has(v.id);
    const current = sessionVarValues[v.id];
    const label = String(v.label || '');
    const keyName = String(v.key || '');
    const isChestXray = /rx|radiograf[ií]a|t[óo]rax|torax/i.test(label) || /rx|radiograf[ií]a|thorax|torax/i.test(keyName);
    const pendingRaw = pendingValues[v.id];
    const hasPendingOverride = Object.prototype.hasOwnProperty.call(pendingValues, v.id);
    const xrayPending = isChestXray ? parseChestXrayValue(pendingRaw) : null;
    const xrayCurrent = isChestXray ? parseChestXrayValue(current) : null;
    const xrayValue = hasPendingOverride ? xrayPending : (xrayPending || xrayCurrent || null);
    const currentDisplay = isChestXray
      ? (xrayCurrent && xrayCurrent.src ? xrayCurrent.label : (typeof current === 'string' ? current : ''))
      : current;

    const categories = xrayLibraryCategories;
    const hasLibrary = isChestXray && categories.length > 0;
    const defaultCategory = hasLibrary ? categories[0][0] : null;
    const selectedCategory = hasLibrary ? (xrayCategorySelection[v.id] || defaultCategory) : null;

    const applyEntry = (entry, { publish = false, categoryKey = selectedCategory } = {}) => {
      if (!entry) return;
      const payloadObj = {
        kind: 'image',
        src: entry.src,
        label: entry.label,
        alt: entry.alt || entry.label,
      };
      const payload = JSON.stringify(payloadObj);
      setPending(v.id, payload);
      setXrayAssignedByCategory((prev) => ({
        ...prev,
        [categoryKey || 'default']: entry,
      }));
      if (publish) publishValue(v.id, payload);
    };

    const handleSelectCategory = (categoryName) => {
      setXrayCategorySelection((prev) => ({ ...prev, [v.id]: categoryName }));
      const assigned = xrayAssignedByCategory[categoryName];
      if (assigned) {
        applyEntry(assigned, { publish: true, categoryKey: categoryName });
        return;
      }
      const entries = categories.find(([name]) => name === categoryName)?.[1] || [];
      if (entries.length > 0) {
        const chosen = entries[Math.floor(Math.random() * entries.length)];
        applyEntry(chosen, { publish: true, categoryKey: categoryName });
      }
    };

    return (
      <div
        key={v.id}
        className={`rounded-2xl border px-4 py-3 transition ${
          isOn ? 'border-[#1E6ACB] bg-[#1E6ACB]/5 shadow-sm' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{v.type}</span>
          {isOn && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1E6ACB]/10 px-2 py-0.5 text-[11px] text-[#0A3D91]">
              ● visible
            </span>
          )}
        </div>
        <div className="mt-1 text-sm font-medium text-slate-800">{v.label}</div>
        {typeof sessionVarValues[v.id] !== 'undefined' && sessionVarValues[v.id] !== null ? (
          <div className="text-xs text-slate-500">
            Actual: <span className="font-medium text-slate-700">{currentDisplay}</span>
          </div>
        ) : null}
        <div className="mt-3">
          {isChestXray ? (
            <div className="space-y-3">
              {hasLibrary ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(([name]) => {
                      const active = name === selectedCategory;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleSelectCategory(name)}
                          className={`rounded-full px-3 py-1 text-xs transition ${
                            active
                              ? 'bg-[#1E6ACB]/10 text-[#0A3D91] border border-[#1E6ACB]'
                              : 'border border-slate-200 text-slate-600 hover:border-[#1E6ACB] hover:text-[#0A3D91]'
                          }`}
                          title={`Publicar Rx de ${name}`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {xrayValue?.label ? (
                      <>Mostrando: <span className="font-medium text-slate-700">{xrayValue.label}</span></>
                    ) : (
                      <>Selecciona una categoría para enviar la Rx al alumnado.</>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => publishValue(v.id)}
                      className={`h-9 rounded-full px-3 text-sm transition ${
                        isOn ? 'bg-[#1E6ACB]/10 text-[#0A3D91]' : 'bg-[#1E6ACB] text-white hover:opacity-90'
                      }`}
                      title="Volver a publicar la Rx seleccionada"
                    >
                      Re-publicar
                    </button>
                    <button
                      onClick={() => hideVariable(v.id)}
                      className="h-9 rounded-full border border-slate-200 px-3 text-sm text-slate-600 transition hover:border-slate-400"
                      title="Ocultar la radiografía al alumnado"
                    >
                      Ocultar
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                  Añade radiografías en <code>/public/simuped_cxr_jpg_por_clase</code> para usarlas aquí.
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex h-9 items-stretch overflow-hidden rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-[#1E6ACB]">
                <input
                  value={pendingValues[v.id] ?? ''}
                  onChange={(e) => setPending(v.id, e.target.value)}
                  placeholder={current ? `Actual: ${current}` : v.initial_value ?? ''}
                  className="h-full flex-1 px-3 text-sm outline-none"
                />
                {v.unit && (
                  <span className="grid h-full min-w-[3rem] place-items-center border-l border-slate-200 bg-slate-50 px-2 text-xs text-slate-500">
                    {v.unit}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => publishValue(v.id)}
                  className={`h-9 rounded-full px-3 text-sm transition ${
                    isOn ? 'bg-[#1E6ACB]/10 text-[#0A3D91]' : 'border border-slate-200 text-slate-600 hover:border-[#1E6ACB] hover:text-[#0A3D91]'
                  }`}
                  title="Publicar ahora al alumnado"
                >
                  Mostrar
                </button>
                <button
                  onClick={() => hideVariable(v.id)}
                  className="h-9 rounded-full border border-slate-200 px-3 text-sm text-slate-600 transition hover:border-slate-400"
                  title="Ocultar al alumnado"
                >
                  Ocultar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const clearTemplateMeta = useCallback(() => {
    setSelectedTemplateKey(null);
    setVentState((prev) => {
      if (!prev?.meta?.template) return prev;
      if (prev.active === true) return prev;
      const nextMeta = { ...(prev.meta || {}) };
      delete nextMeta.template;
      const next = { ...prev };
      if (Object.keys(nextMeta).length > 0) next.meta = nextMeta;
      else delete next.meta;
      return next;
    });
  }, []);

  const handleSelectTemplate = useCallback((templateKey) => {
    const tpl = VENTILATION_TEMPLATES.find(t => t.key === templateKey);
    if (!tpl) return;
    const nextForm = buildFormFromTemplate(tpl, weightKg);
    setSelectedTemplateKey(templateKey);
    setVentForm(nextForm);
    setVentState(prev => {
      if (!prev) return prev;
      const nextMeta = { ...(prev.meta || {}), template: { key: tpl.key, name: tpl.name } };
      const nextState = { ...prev, meta: nextMeta };
      if (prev.active === 'pending') {
        nextState.mode = nextForm.mode;
        nextState.draft = {
          mode: nextForm.mode,
          parameters: { ...nextForm.parameters },
          patient: { ...nextForm.patient }
        };
      }
      return nextState;
    });
  }, [weightKg]);

  // Guion del caso (intro narrativa por pasos que se publica como banner)
  const [scriptTexts, setScriptTexts] = useState(DEFAULT_SCRIPT);
  const [scriptIndex, setScriptIndex] = useState(0);

  // Cargar guion guardado localmente si existe
  const refreshRevealed = useCallback(async (sid) => {
    const theId = sid || sessionId;
    if (!theId) return;
    try {
      const { data, error } = await supabase
        .from('session_variables')
        .select('variable_id, value, is_revealed')
        .eq('session_id', theId);
      if (!error) {
        const onSet = new Set();
        const values = {};
        (data || []).forEach(r => {
          if (r.is_revealed) onSet.add(r.variable_id);
          if (r.value !== undefined && r.value !== null) values[r.variable_id] = r.value;
        });
        setRevealed(onSet);
        setSessionVarValues(values);
      }
    } catch (error) {
      reportWarning('PresencialInstructor.refreshRevealed', error, { sessionId: theId });
    }
  }, [sessionId]);

  useEffect(() => {
    if (!id) return;
    const saved = loadScriptLocal(sessionId, id);
    if (saved && Array.isArray(saved.texts)) {
      setScriptTexts(saved.texts);
      if (typeof saved.index === 'number') {
        const idx = Math.max(0, Math.min(saved.index, Math.max(0, saved.texts.length - 1)));
        setScriptIndex(idx);
      }
    }
  }, [id, sessionId]);

  // Guardar automáticamente el guion e índice activo
  useEffect(() => {
    if (!id) return;
    saveScriptLocal(sessionId, id, scriptTexts, scriptIndex);
  }, [scriptTexts, scriptIndex, id, sessionId]);

  useEffect(() => {
    if (scenario?.patient_overview) {
      setPatientInfo(parsePatientDemographics(scenario.patient_overview));
    } else {
      setPatientInfo({ chips: [], weightKg: null });
    }
  }, [scenario?.patient_overview]);

  // Variables reveladas (para marcar botones activos)
  const [revealed, setRevealed] = useState(new Set());
  // Checklist
  const [checklist, setChecklist] = useState([]); // scenario_checklist
  const [checkStatus, setCheckStatus] = useState({}); // {item_id: 'ok'|'wrong'|'missed'|'na'}
  const [checkNotes, setCheckNotes] = useState({}); // {item_id: string}

  // Agrupación por categoría (ABCDE / Patología / Medicación / Otros)
  const [activeCategory, setActiveCategory] = useState('A');
  const [activeRole, setActiveRole] = useState('Todos');
  const groupedChecklist = useMemo(() => {
    const buckets = CATEGORY_ORDER.reduce((acc, k) => { acc[k] = []; return acc; }, {});
    (checklist || []).forEach(item => {
      const cat = normalizeCategory(item.category);
      if (!buckets[cat]) buckets[cat] = [];
      buckets[cat].push(item);
    });
    return buckets;
  }, [checklist]);


  // Listado para creación de sesión si faltan params
  const [scenarios, setScenarios] = useState([]);
  const [creating, setCreating] = useState(false);
  const [creatingFor, setCreatingFor] = useState(null);
  const [listError, setListError] = useState("");

  const publicCode = session?.public_code || '';
  const publicPath = useMemo(() => {
    if (!publicCode) return null;
    return `/presencial-alumno/${publicCode}`;
  }, [publicCode]);

  const publicUrl = useMemo(() => {
    if (!publicPath) return null;
    return `${window.location.origin}${publicPath}`;
  }, [publicPath]);

  const prettyPublicCode = useMemo(() => {
    if (!publicCode) return '';
    const raw = String(publicCode).trim();
    if (!raw) return '';
    if (/[\s-]/.test(raw)) return raw.toUpperCase();
    if (raw.length <= 4) return raw.toUpperCase();
    const segments = raw.match(/.{1,3}/g);
    return (segments || [raw]).join(' ').toUpperCase();
  }, [publicCode]);

  const copyPublicCode = useCallback(() => {
    if (!publicCode) return;
    try { navigator.clipboard.writeText(publicCode); } catch {}
  }, [publicCode]);

  const copyPublicUrl = useCallback(() => {
    if (!publicUrl) return;
    try { navigator.clipboard.writeText(publicUrl); } catch {}
  }, [publicUrl]);

  const scrollToSection = useCallback((ref) => {
    if (!ref || !ref.current) return;
    try {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    } catch {
      ref.current.scrollIntoView();
    }
  }, []);

  useEffect(() => {
    setXrayCategorySelection({});
    setXrayAssignedByCategory({});
    setVentState(null);
    setVentForm(DEFAULT_VENT_FORM);
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Intento de reanudar última sesión abierta (persistencia local)
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            const last = JSON.parse(raw);
            if (last && last.id && last.scenario_id) {
              // Comprobar si sigue abierta (o si no hay columna ended_at, al menos que exista)
              const { data: s0 } = await supabase
                .from('presencial_sessions')
                .select('id, scenario_id, ended_at')
                .eq('id', last.id)
                .maybeSingle();
              if (s0 && (!Object.prototype.hasOwnProperty.call(s0, 'ended_at') || !s0.ended_at)) {
                navigate(`/presencial/instructor/${s0.scenario_id}/${s0.id}`, { replace: true });
                return; // detenemos aquí para no cargar el selector
              } else {
                // Si está cerrada, limpia el registro local
                localStorage.removeItem(LS_KEY);
              }
            }
          }
        } catch (error) {
          reportWarning('PresencialInstructor.restoreSession', error);
        }
        // Si faltan parámetros, mostrar selector de escenarios
        if (!id || !sessionId) {
          setLoading(true);
          setScenario(null);
          setSession(null);
          setSteps([]);
          setVariables([]);
          setErrorMsg("");
          const { data: scs, error: scsErr } = await supabase
            .from("scenarios")
            .select("id,title,summary,estimated_minutes,level")
            .order("created_at", { ascending: false })
            .limit(20);
          if (scsErr) throw scsErr;
          if (mounted) setScenarios(scs || []);
          setLoading(false);
          return;
        }

        // Con params presentes, activamos loading hasta terminar la carga
        setLoading(true);
        // 1) Escenario
        const { data: sc, error: scErr } = await supabase
          .from("scenarios")
          .select("id,title,summary")
          .eq("id", id)
          .maybeSingle();
        if (scErr) throw scErr;

        // Obtener overview desde la función (la columna ya no existe)
        let overview = "";
        try {
          const pid = Number(id) || Number(sc?.id);
          if (!Number.isNaN(pid)) {
            const { data: ov } = await supabase.rpc('get_patient_overview', { p_scenario_id: pid });
            if (typeof ov === 'string') overview = ov;
          }
        } catch (error) {
          reportWarning('PresencialInstructor.patientOverview', error, { scenarioId: id });
        }

        if (mounted) setScenario(sc ? { ...sc, patient_overview: overview || "" } : null);

        // 2) Sesión (ahora también banner_text y current_step_id)
        const loadSessionWithRetry = async () => {
          let attempt = 0;
          let lastError = null;
          while (attempt < 3) {
            const { data: sessionRow, error: sessionError } = await supabase
              .from("presencial_sessions")
              .select("*")
              .eq("id", sessionId)
              .maybeSingle();
            if (!sessionError && sessionRow) {
              return sessionRow;
            }
            lastError = sessionError;
            attempt += 1;
            await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
          }
          if (lastError) throw lastError;
          throw new Error('No se encontró la sesión');
        };

        const s = await loadSessionWithRetry();

        if (mounted && s) {
          setSession(s);
          setBannerText(s.banner_text || "");
          setCurrentStepId(s.current_step_id || null);

          const startedAtDb = s.started_at ? new Date(s.started_at) : null;
          const createdAtDb = s.created_at ? new Date(s.created_at) : null;
          const endedAtDb = s.ended_at ? new Date(s.ended_at) : null;
          const startedDiffMs = startedAtDb && createdAtDb ? Math.abs(startedAtDb.getTime() - createdAtDb.getTime()) : null;
          const considerStarted = Boolean(startedAtDb && !endedAtDb && (startedDiffMs == null || startedDiffMs > 5000));

          setStartedAt(considerStarted || endedAtDb ? s.started_at : null);
          setEndedAt(s.ended_at || null);

          if (endedAtDb) {
            try {
              const t0 = startedAtDb ? startedAtDb.getTime() : createdAtDb ? createdAtDb.getTime() : Date.now();
              const t1 = endedAtDb.getTime();
              setElapsedSec(Math.max(0, Math.floor((t1 - t0) / 1000)));
            } catch (error) {
              reportWarning('PresencialInstructor.elapsedSecInit', error);
            }
          } else if (considerStarted) {
            try {
              const t0 = startedAtDb.getTime();
              const t1 = Date.now();
              setElapsedSec(Math.max(0, Math.floor((t1 - t0) / 1000)));
            } catch (error) {
              reportWarning('PresencialInstructor.elapsedSecInit', error);
            }
          } else {
            setElapsedSec(0);
          }

          const shouldUnlock = considerStarted && !endedAtDb;
          setUiUnlocked(shouldUnlock);
          setTimerActive(shouldUnlock);
          setTimerStartAt(shouldUnlock ? s.started_at : null);

          try {
            if (!s.ended_at) {
              localStorage.setItem(LS_KEY, JSON.stringify({ id: s.id, scenario_id: s.scenario_id }));
            } else {
              localStorage.removeItem(LS_KEY);
            }
          } catch (error) {
            reportWarning('PresencialInstructor.persistSession', error);
          }
        }

        // 3) Pasos
        const { data: st, error: stErr } = await supabase
          .from("scenario_steps")
          .select("id, name, order_index")
          .eq("scenario_id", id)
          .order("order_index", { ascending: true });
        if (stErr) throw stErr;
        if (mounted) {
          setSteps(st || []);
          if (!s?.current_step_id && st && st.length > 0) {
            // si no hay paso en sesión aún, preseleccionar el primero solo en UI
            setCurrentStepId((prev) => prev ?? st[0].id);
          }
        }

        // 4) Variables
        const { data: vars, error: vErr } = await supabase
          .from("scenario_variables")
          .select("id, key, label, unit, type, initial_value")
          .eq("scenario_id", id)
          .order("id", { ascending: true });
        if (vErr) throw vErr;
        if (mounted) setVariables(vars || []);
        // 4b) Cargar variables reveladas actuales para marcar UI
        if (s && s.id) {
          await refreshRevealed(s.id);
        }
        // 5) Checklist (tolerante: si no existen tablas/vistas, se ignora)
        try {
          const { data: items } = await supabase
            .from('scenario_checklist')
            .select('id,label,category,order_index,weight,role')
            .eq('scenario_id', id)
            .order('order_index', { ascending: true });
          if (items && items.length) {
            setChecklist(items);
            const { data: sessMarks } = await supabase
              .from('session_checklist')
              .select('item_id,status,note')
              .eq('session_id', sessionId);
            if (sessMarks) {
              const st = {};
              const nt = {};
              for (const r of sessMarks) { st[r.item_id] = r.status; if (r.note) nt[r.item_id] = r.note; }
              setCheckStatus(st);
              setCheckNotes(nt);
            }
          }
        } catch {
          console.debug('[Instructor] checklist no disponible (ok)');
        }
      } catch (e) {
        console.error("[Instructor] init error:", e);
        setErrorMsg(e?.message || "No se pudo cargar la sesión (reintentar)");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, sessionId, navigate, refreshRevealed]);

  // Refrescar variables reveladas desde BD
  // Suscripción realtime a session_variables para marcar/desmarcar en UI
  useEffect(() => {
    if (!sessionId) return;
    // carga inicial por si refrescamos ruta
    refreshRevealed(sessionId);
    const ch = supabase
      .channel(`instr-svars:${sessionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session_variables', filter: `session_id=eq.${sessionId}` },
        () => refreshRevealed(sessionId)
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [sessionId, refreshRevealed]);

  // Crear sesión
  async function createSessionForScenario(scenarioId) {
    setCreating(true);
    setCreatingFor(scenarioId);
    setListError("");
    try {
      // Derivamos al flujo de confirmación (modo dual) que crea la sesión y redirige correctamente
      navigate(`/presencial/${scenarioId}/confirm?flow=dual`, { replace: true });
    } catch (e) {
      setListError(e?.message || "No se pudo crear la sesión");
    } finally {
      setCreating(false);
      setCreatingFor(null);
    }
  }

  // Cronómetro de pantalla
  // - Si el instructor pulsa "Iniciar", usamos `timerStartAt` (inicio local)
  // - Si ya existe una sesión empezada (started_at en BD), mostramos el tiempo directamente
  //   aunque la UI siga bloqueada (sin necesidad de pulsar "Iniciar").
  useEffect(() => {
    // Limpia posibles intervals previos para evitar dobles actualizaciones
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Preferimos el inicio local si existe; si no, el inicio persistido de la sesión
    const baseStartISO = timerStartAt || startedAt;
    if (!baseStartISO) {
      // No hay referencia temporal aún; no correr cronómetro
      return;
    }

    const t0 = new Date(baseStartISO).getTime();

    const compute = () => {
      const endMs = endedAt ? new Date(endedAt).getTime() : Date.now();
      const diff = Math.max(0, Math.floor((endMs - t0) / 1000));
      setElapsedSec(diff);
    };

    // Cálculo inmediato al montar/cambiar dependencias
    compute();

    // Si ya hay ended_at, no hace falta interval; dejamos el valor fijo
    if (endedAt) return;

    // Interval de 1s para sesiones en curso
    timerRef.current = setInterval(compute, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerStartAt, startedAt, endedAt]);

  function fmtDuration(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const p2 = (n) => String(n).padStart(2, "0");
    return hh > 0 ? `${hh}:${p2(mm)}:${p2(ss)}` : `${p2(mm)}:${p2(ss)}`;
  }

  // Controles inicio/fin (persistentes y tolerantes a columnas faltantes)
  async function startSession() {
    if (!sessionId) return;

    // 1) Lee el estado actual para saber si ya estaba iniciada/finalizada
    const { data: s0 } = await supabase
      .from('presencial_sessions')
      .select('started_at, ended_at')
      .eq('id', sessionId)
      .maybeSingle();

    let effectiveStarted = s0?.started_at || null;
    let effectiveEnded = s0?.ended_at || null;

    // 2) Si NO estaba iniciada, intenta iniciarla (idempotente: solo si started_at IS NULL)
    if (!effectiveStarted) {
      const nowIso = new Date().toISOString();
      const { data: upd } = await supabase
        .from('presencial_sessions')
        .update({ started_at: nowIso, ended_at: null })
        .eq('id', sessionId)
        .is('started_at', null) // <-- clave: no reiniciar si ya existe
        .select('started_at, ended_at')
        .maybeSingle();

      if (upd && upd.started_at) {
        effectiveStarted = upd.started_at;
        effectiveEnded = upd.ended_at || null;
        try { logEvent('session.start', { started_at: effectiveStarted }); } catch {}
      } else {
        // Carrera: otro cliente pudo iniciarla. Relee el estado actual.
        const { data: s1 } = await supabase
          .from('presencial_sessions')
          .select('started_at, ended_at')
          .eq('id', sessionId)
          .maybeSingle();
        effectiveStarted = s1?.started_at || nowIso;
        effectiveEnded = s1?.ended_at || null;
      }
    }

    // 3) Ajusta estado local (sin reiniciar crono si ya existía)
    setStartedAt(effectiveStarted || null);
    setEndedAt(effectiveEnded || null);

    // Desbloquea UI y arranca crono local desde started_at efectivo
    setUiUnlocked(true);
    setTimerActive(true);
    setTimerStartAt(effectiveStarted || new Date().toISOString());

    // Calcula tiempo ya transcurrido (si procede)
    try {
      if (effectiveStarted) {
        const t0 = new Date(effectiveStarted).getTime();
        const t1 = effectiveEnded ? new Date(effectiveEnded).getTime() : Date.now();
        setElapsedSec(Math.max(0, Math.floor((t1 - t0) / 1000)));
      }
    } catch {}

    // Persistir como "última sesión" solo si no está finalizada
    try {
      if (!effectiveEnded && sessionId && scenario?.id) {
        localStorage.setItem(LS_KEY, JSON.stringify({ id: sessionId, scenario_id: scenario.id }));
      }
    } catch {}
  }

  async function endSession() {
    if (!sessionId) return;
    const now = new Date().toISOString();
    // Parar cronómetro y volver a bloquear UI
    setTimerActive(false);
    setUiUnlocked(false);
    setEndedAt(now);
    setSession(prev => (prev ? { ...prev, ended_at: now } : prev));
    try {
      const t0 = startedAt ? new Date(startedAt).getTime() : Date.now();
      const t1 = new Date(now).getTime();
      setElapsedSec(Math.max(0, Math.floor((t1 - t0) / 1000)));
    } catch {}
    // Persistir fin de sesión si la columna existe; si falla, usa banner como fallback
    try {
      await supabase
        .from("presencial_sessions")
        .update({ ended_at: now })
        .eq("id", sessionId);
      try { localStorage.removeItem(LS_KEY); } catch {}
      // Log
      try { logEvent('session.end', { ended_at: now, duration_sec: elapsedSec }); } catch {}
      // Navegar al informe tras finalizar correctamente
      try {
        navigate(`/presencial/${id}/informe?session=${sessionId}`, { replace: true });
      } catch {}
    } catch (e) {
      console.warn("[Instructor] endSession: no se pudo guardar ended_at; usando banner como fallback", e);
      try {
        await supabase
          .from("presencial_sessions")
          .update({ banner_text: "Sesión finalizada" })
          .eq("id", sessionId);
        setBannerText("Sesión finalizada");
        try { localStorage.removeItem(LS_KEY); } catch {}
      } catch (e2) {
        console.error("[Instructor] endSession fallback error:", e2);
      }
    }
  }

  // Helpers para edición rápida de constantes
  function setPending(variableId, value) {
    setPendingValues(prev => ({ ...prev, [variableId]: value }));
  }

  async function publishValue(variableId) {
    if (!sessionId) return;
    playBeep({ freq: 900 });
    const v = variables.find(x => x.id === variableId);
    const val = (pendingValues[variableId] ?? sessionVarValues[variableId] ?? v?.initial_value ?? null);
    try {
      await supabase
        .from('session_variables')
        .upsert({ session_id: sessionId, variable_id: variableId, value: val, is_revealed: true, updated_at: new Date().toISOString() }, { onConflict: 'session_id,variable_id' });
      // Broadcast acción variable.update
      try {
        await supabase.from('session_actions').insert({
          session_id: sessionId,
          step_id: currentStepId || null,
          action_key: 'variable.update',
          payload: { variable_id: variableId, value: val }
        });
      } catch {}
      setSessionVarValues(prev => ({ ...prev, [variableId]: val }));
      setRevealed(prev => { const s = new Set(prev); s.add(variableId); return s; });
      // Log
      try { logEvent('variable.update', { variable_id: variableId, label: v?.label, value: val, unit: v?.unit }); } catch {}
      playBeep({ freq: 900 });
    } catch (e) {
      console.error('[Instructor] publishValue error', e);
      setErrorMsg('No se pudo guardar el valor.');
    }
  }

  // Helper para ocultar variable y limpiar input
  async function hideVariable(variableId) {
    if (!sessionId) return;
    const v = variables.find(x => x.id === variableId);
    setRevealed(prev => { const s = new Set(prev); s.delete(variableId); return s; });
    setPendingValues(prev => ({ ...prev, [variableId]: '' }));
    try {
      await supabase
        .from('session_variables')
        .upsert({ session_id: sessionId, variable_id: variableId, value: sessionVarValues[variableId] ?? v?.initial_value ?? null, is_revealed: false, updated_at: new Date().toISOString() }, { onConflict: 'session_id,variable_id' });
      // Broadcast acción variable.hide
      try {
        await supabase.from('session_actions').insert({
          session_id: sessionId,
          step_id: currentStepId || null,
          action_key: 'variable.hide',
          payload: { variable_id: variableId }
        });
      } catch {}
      // Log
      try { logEvent('variable.hide', { variable_id: variableId, label: v?.label }); } catch {}
      playBeep({ freq: 620 });
    } catch(e) {
      console.error('[Instructor] hideVariable error', e);
      setErrorMsg('No se pudo ocultar la variable.');
    }
  }

  // Emitir alarma a alumnos (ping)
  async function triggerAlarm() {
    ensureCtx();
    if (!sessionId) return;
    const now = new Date().toISOString();

    // Broadcast acción de alarma para clientes conectados (alumnos/instructor)
    try {
      await supabase.from('session_actions').insert({
        session_id: sessionId,
        step_id: currentStepId || null,
        action_key: 'alarm',
        payload: { at: now }
      });
    } catch {}

    // Log (no bloqueante)
    try { logEvent('alarm', {}); } catch {}

    // Sonido local en el panel del instructor
    playAlarm();
  }

  // Forzar refresco manual en pantallas conectadas
  async function forceRefresh() {
    ensureCtx();
    if (!sessionId) return;
    const now = new Date().toISOString();
    try {
      await supabase.from('session_actions').insert({
        session_id: sessionId,
        step_id: currentStepId || null,
        action_key: 'refresh',
        payload: { at: now }
      });
    } catch {}
    try { logEvent('session.refresh', { at: now }); } catch {}
    playBeep({ freq: 980, ms: 160, gain: 0.16 });
  }

  // Helpers para el guion/narrativa
  async function publishScript(index = scriptIndex) {
    if (!steps || steps.length === 0) return;
    ensureCtx();
    const raw = scriptTexts[index];
    const txt = (typeof raw === 'string' ? raw : '').trim();
    if (!txt) return; // no publiques vacío
    // 1) Publica el texto (incluye beep y update de banner_text + updated_at)
    await saveBanner(txt);

    // Registrar acción de guion para clientes que escuchen session_actions
    try {
      await supabase
        .from('session_actions')
        .insert({
          session_id: sessionId,
          step_id: steps[index]?.id || null,
          action_key: 'script.publish',
          payload: { index, text: txt }
        });
    } catch (eAct) {
      console.debug('[Instructor] session_actions script.publish omitido', eAct?.message);
    }

    // 2) Marca el paso actual en la sesión (ping explícito de updated_at por si hay clientes sin realtime en banner)
    const stepId = steps[index]?.id || null;
    if (sessionId && stepId) {
      try {
        await supabase
          .from('presencial_sessions')
          .update({
            current_step_id: stepId
          })
          .eq('id', sessionId);
        setCurrentStepId(stepId);
      } catch (e) {
        console.debug('[Instructor] publishScript: step update skipped', e);
      }
    }

    try { logEvent('script.publish', { index, text: txt }); } catch {}
  }

  function nextScript() {
    if (scriptIndex < scriptTexts.length - 1) {
      const i = scriptIndex + 1;
      setScriptIndex(i);
      ensureCtx();
      publishScript(i);
    }
  }
  function prevScript() {
    if (scriptIndex > 0) {
      const i = scriptIndex - 1;
      setScriptIndex(i);
      ensureCtx();
      publishScript(i);
    }
  }
  function addScriptLine() {
    setScriptTexts(arr => [...arr, '']);
    const i = scriptTexts.length; // nuevo índice al final
    setScriptIndex(i);
    // no se publica automáticamente porque aún no hay texto
  }
  function resetScript() {
    const i = 0;
    setScriptTexts(DEFAULT_SCRIPT);
    setScriptIndex(i);
    clearScriptLocal(sessionId, id);
    ensureCtx();
    publishScript(i);
  }

  // NUEVO: guardar banner (con confirmación sonora)
  async function saveBanner(nextText) {
    if (!sessionId) return;
    const textToSave = String(typeof nextText === "string" ? nextText : bannerText || "").trim();
    try {
      await supabase
        .from("presencial_sessions")
        .update({ banner_text: textToSave })
        .eq("id", sessionId);
      // Además: registra acción explícita para que pantallas que escuchen session_actions lo reciban
      try {
        await supabase
          .from('session_actions')
          .insert({
            session_id: sessionId,
            step_id: currentStepId || null,
            action_key: 'banner.publish',
            payload: { text: textToSave }
          });
      } catch (eAct) {
        console.debug('[Instructor] session_actions banner.publish omitido', eAct?.message);
      }
      console.debug('[Instructor] Banner actualizado en sesión', sessionId);
      // Estado local coherente si se llamó con argumento
      if (typeof nextText === "string") setBannerText(nextText);
      try { logEvent('banner.update', { text: textToSave }); } catch {}

      // 🔊 Confirmación sonora (resume AudioContext y beep distinto si se limpia)
      try { ensureCtx(); } catch {}
      if (textToSave && String(textToSave).trim().length > 0) {
        // Publicación de texto
        playBeep({ freq: 900, ms: 200, gain: 0.16 });
      } else {
        // Limpieza del banner
        playBeep({ freq: 620, ms: 180, gain: 0.14 });
      }
    } catch (e) {
      console.error("[Instructor] saveBanner error:", e);
      setErrorMsg("No se pudo guardar el texto en pantalla.");
    }
  }

  // NUEVO: cambiar fase (paso)
  async function updateStep(stepId) {
    if (!sessionId) return;
    setCurrentStepId(stepId);
    try {
      // 1) Persistir en la fila de la sesión (compatibilidad con clientes que solo leen la tabla)
      await supabase
        .from("presencial_sessions")
        .update({ current_step_id: stepId })
        .eq("id", sessionId);

      // 2) Emitir acción realtime para clientes que escuchan session_actions
      try {
        const name = steps.find((s) => s.id === stepId)?.name || null;
        await supabase
          .from('session_actions')
          .insert({
            session_id: sessionId,
            step_id: stepId,
            action_key: 'step.set',
            payload: { step_id: stepId, text: name }
          });
        // Log interno
        try { logEvent('step.change', { step_id: stepId, name }); } catch {}
      } catch (eAct) {
        console.debug('[Instructor] session_actions step.set omitido', eAct?.message);
      }

      // 2b) Publicar guion vinculado al paso (si existe texto en ese índice)
      try {
        const idx = steps.findIndex((s) => s.id === stepId);
        if (idx >= 0) {
          const raw = Array.isArray(scriptTexts) ? scriptTexts[idx] : null;
          const txt = (typeof raw === 'string' ? raw : '').trim();
          if (txt) {
            // Guardar en banner_text (persistente)
            await supabase
              .from('presencial_sessions')
              .update({ banner_text: txt })
              .eq('id', sessionId);
            // Acción para alumnos que escuchan session_actions
            try {
              await supabase.from('session_actions').insert({
                session_id: sessionId,
                step_id: stepId,
                action_key: 'script.publish',
                payload: { index: idx, text: txt }
              });
            } catch {}
            // Estado local coherente
            setBannerText(txt);
            try { logEvent('script.publish', { index: idx, text: txt }); } catch {}
          }
        }
      } catch (eScript) {
        console.debug('[Instructor] updateStep: script.publish omitido', eScript?.message);
      }

      // 2c) Efectos del paso: ejemplo de Circulación → bajar TA sistólica a 60 y mostrar
      try {
        const stepName = steps.find((s) => s.id === stepId)?.name || '';
        if (/circulaci[óo]n/i.test(stepName)) {
          // Buscar variable de tensión arterial (por etiqueta o clave)
          const candidate = (variables || []).find(v => {
            const lbl = (v.label || '').toString();
            const key = (v.key || '').toString();
            return /(tensi[óo]n|TA|presi[óo]n\s*arterial)/i.test(lbl) || /(ta|bp|blood_pressure)/i.test(key);
          });
          if (candidate) {
            const variableId = candidate.id;
            const val = '60';
            // Persistir valor y revelar al alumnado
            await supabase
              .from('session_variables')
              .upsert({ session_id: sessionId, variable_id: variableId, value: val, is_revealed: true, updated_at: new Date().toISOString() }, { onConflict: 'session_id,variable_id' });
            // Broadcast de actualización
            try {
              await supabase.from('session_actions').insert({
                session_id: sessionId,
                step_id: stepId,
                action_key: 'variable.update',
                payload: { variable_id: variableId, value: val }
              });
            } catch {}
            // Estado local
            setSessionVarValues(prev => ({ ...prev, [variableId]: val }));
            setRevealed(prev => { const s = new Set(prev); s.add(variableId); return s; });
            try { logEvent('variable.update', { variable_id: variableId, label: candidate.label, value: val }); } catch {}
          }
        }
      } catch (eFx) {
        console.debug('[Instructor] efectos de paso omitidos', eFx?.message);
      }

      console.debug('[Instructor] Fase actualizada', { sessionId, stepId });
    } catch (e) {
      console.error("[Instructor] updateStep error:", e);
      setErrorMsg("No se pudo cambiar la fase del caso.");
    }
  }

  // NUEVO: ocultar todas las variables
  async function clearAllVariables() {
    if (!sessionId) return;
    try {
      await supabase
        .from('session_variables')
        .update({ is_revealed: false, updated_at: new Date().toISOString() })
        .eq('session_id', sessionId);
      setRevealed(new Set());
      // Ping para notificar a los alumnos la limpieza total
      try { logEvent('variable.clear_all', {}); } catch {}
    } catch (e) {
      console.error("[Instructor] clearAllVariables error:", e);
      setErrorMsg("No se pudieron ocultar las variables.");
    }
  }

  const handleVentFieldChange = useCallback((section, key, value) => {
    clearTemplateMeta();
    setVentForm(prev => {
      const nextSection = { ...prev[section], [key]: value };
      const nextForm = { ...prev, [section]: nextSection };
      setVentState(prevState => {
        if (!prevState || prevState.active !== 'pending') return prevState;
        const nextDraft = {
          mode: nextForm.mode,
          parameters: { ...nextForm.parameters },
          patient: { ...nextForm.patient }
        };
        const next = { ...prevState, draft: nextDraft, mode: nextForm.mode };
        return next;
      });
      return nextForm;
    });
  }, [clearTemplateMeta]);

  const publishVentilationUpdate = useCallback(async (payload) => {
    if (!sessionId) return;
    try {
      await supabase.from('session_actions').insert({
        session_id: sessionId,
        step_id: currentStepId || null,
        action_key: 'ventilation.update',
        payload
      });
      try { logEvent('ventilation.update', payload); } catch {}
    } catch (error) {
      console.error('[Instructor] ventilation.update error', error);
      setErrorMsg('No se pudo publicar el estado del ventilador.');
    }
  }, [sessionId, currentStepId, logEvent]);

  const handleVentApply = useCallback(async () => {
    if (!sessionId) return;
    setIsPublishingVent(true);
    try {
      const tpl = VENTILATION_TEMPLATES.find(t => t.key === selectedTemplateKey) || null;
      const context = {
        weightKg: patientInfo.weightKg,
        template: tpl ? { key: tpl.key, name: tpl.name } : undefined
      };
      const nextState = buildVentilationState(ventForm, context);
      setVentState(nextState);
      await publishVentilationUpdate(nextState);
      setVentModalOpen(false);
    } finally {
      setIsPublishingVent(false);
    }
  }, [sessionId, ventForm, publishVentilationUpdate, patientInfo.weightKg, selectedTemplateKey]);

  const buildMetaPayload = useCallback(() => {
    const meta = {};
    if (patientInfo.weightKg) meta.weightKg = patientInfo.weightKg;
    const tpl = VENTILATION_TEMPLATES.find((t) => t.key === selectedTemplateKey) || null;
    if (tpl) meta.template = { key: tpl.key, name: tpl.name };
    return meta;
  }, [patientInfo.weightKg, selectedTemplateKey]);

  const handleVentStop = useCallback(async () => {
    if (!sessionId) return;
    const basePayload = { active: false, timestamp: new Date().toISOString() };
    const meta = buildMetaPayload();
    const payload = Object.keys(meta).length > 0
      ? { ...basePayload, meta }
      : basePayload;
    setVentState(null);
    setVentForm(DEFAULT_VENT_FORM);
    await publishVentilationUpdate(payload);
  }, [sessionId, publishVentilationUpdate, buildMetaPayload]);

  const handleVentHide = useCallback(async () => {
    if (!sessionId) return;
    const basePayload = { active: 'hidden', timestamp: new Date().toISOString() };
    const meta = buildMetaPayload();
    const payload = Object.keys(meta).length > 0
      ? { ...basePayload, meta }
      : basePayload;
    setVentState(null);
    await publishVentilationUpdate(payload);
  }, [sessionId, publishVentilationUpdate, buildMetaPayload]);

  const broadcastVentPending = useCallback(async () => {
    if (!sessionId) return;
    const timestamp = new Date().toISOString();
    const tpl = VENTILATION_TEMPLATES.find(t => t.key === selectedTemplateKey) || null;
    const meta = buildMetaPayload();
    const metaPayload = Object.keys(meta).length > 0 ? meta : undefined;
    const draft = {
      mode: ventForm.mode,
      parameters: { ...ventForm.parameters },
      patient: { ...ventForm.patient }
    };
    const pendingPayload = metaPayload
      ? { active: 'pending', timestamp, meta: metaPayload, mode: draft.mode, draft }
      : { active: 'pending', timestamp, mode: draft.mode, draft };
    setVentState(metaPayload
      ? { active: 'pending', timestamp, meta: metaPayload, mode: draft.mode, draft }
      : { active: 'pending', timestamp, mode: draft.mode, draft });
    try {
      await publishVentilationUpdate(pendingPayload);
    } catch (error) {
      console.error('[Instructor] ventilation.pending error', error);
    }
  }, [sessionId, publishVentilationUpdate, patientInfo.weightKg, selectedTemplateKey, ventForm]);

  const handleOpenVentModal = useCallback(() => {
    setVentModalOpen(true);
    if (!ventState) {
      void broadcastVentPending();
    }
  }, [ventState, broadcastVentPending]);

  const handleVentModalKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setVentModalOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!ventModalOpen) return undefined;
    const prevOverflow = document?.body?.style?.overflow;
    if (document?.body) {
      document.body.style.overflow = 'hidden';
    }
    const timer = setTimeout(() => {
      const node = ventModalRef.current;
      if (node && typeof node.focus === 'function') {
        node.focus({ preventScroll: true });
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if (document?.body) {
        document.body.style.overflow = prevOverflow || '';
      }
    };
  }, [ventModalOpen]);

  async function upsertChecklist(itemId, status) {
    if (!sessionId) return;
    try {
      await supabase
        .from('session_checklist')
        .upsert({ session_id: sessionId, item_id: itemId, status, updated_at: new Date().toISOString() }, { onConflict: 'session_id,item_id' });
      setCheckStatus(prev => ({ ...prev, [itemId]: status }));
      try {
        const label = (checklist.find(i => i.id === itemId) || {}).label;
        logEvent('check.update', { item_id: itemId, status, label });
      } catch {}
    } catch (e) {
      console.error('[Instructor] upsertChecklist', e);
      setErrorMsg('No se pudo actualizar el checklist.');
    }
  }

  async function saveChecklistNote(itemId, note) {
    if (!sessionId) return;
    setCheckNotes(prev => ({ ...prev, [itemId]: note }));
    try {
      await supabase
        .from('session_checklist')
        .upsert({ session_id: sessionId, item_id: itemId, status: checkStatus[itemId] || 'na', note, updated_at: new Date().toISOString() }, { onConflict: 'session_id,item_id' });
      try {
        const label = (checklist.find(i => i.id === itemId) || {}).label;
        logEvent('check.note', { item_id: itemId, note, label });
      } catch {}
    } catch (e) {
      console.error('[Instructor] saveChecklistNote', e);
    }
  }
  useEffect(() => {
    if (!sessionId || checklist.length === 0) return;
    const ch = supabase
      .channel(`instr-scheck:${sessionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session_checklist', filter: `session_id=eq.${sessionId}` },
        async () => {
          try {
            const { data: sessMarks } = await supabase
              .from('session_checklist')
              .select('item_id,status,note')
              .eq('session_id', sessionId);
            if (sessMarks) {
              const st = {}; const nt = {};
              for (const r of sessMarks) { st[r.item_id] = r.status; if (r.note) nt[r.item_id] = r.note; }
              setCheckStatus(st); setCheckNotes(nt);
            }
          } catch {}
        }
      )
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [sessionId, checklist.length]);

  // Mantener sincronizada la fila de la sesión (banner, fase, inicio/fin) si cambia en otro cliente
  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase
      .channel(`instr-sess:${sessionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'presencial_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const next = payload?.new;
          if (!next) return;
          setSession(prev => ({ ...(prev || {}), ...(next || {}) }));
          if (Object.prototype.hasOwnProperty.call(next, 'banner_text')) {
            setBannerText(next.banner_text || '');
          }
          if (Object.prototype.hasOwnProperty.call(next, 'current_step_id')) {
            setCurrentStepId(next.current_step_id || null);
          }
          if (Object.prototype.hasOwnProperty.call(next, 'started_at')) {
            setStartedAt(next.started_at || null);
          }
          if (Object.prototype.hasOwnProperty.call(next, 'ended_at')) {
            setEndedAt(next.ended_at || null);
          }
        }
      )
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [sessionId]);

  // Si faltan parámetros, selector de escenario
  if (!id || !sessionId) {
    if (loading) {
      return (
        <div className="min-h-screen grid place-items-center text-slate-600">
          Cargando…
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <section className="max-w-3xl mx-auto px-5 py-12">
          <h1 className="text-3xl font-bold mb-1">Instructor · Nueva sesión</h1>
          <p className="mb-6 text-lg text-slate-700">
            Selecciona un escenario para crear una nueva sesión presencial.
          </p>
          {listError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2">
              {listError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {scenarios.length === 0 && (
              <div className="col-span-2 text-slate-500">
                No hay escenarios disponibles.
              </div>
            )}
            {scenarios.map((sc) => (
              <div
                key={sc.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col"
              >
                <div className="font-semibold text-lg mb-1">{sc.title}</div>
                {sc.summary && (
                  <div className="text-slate-600 mb-2">{sc.summary}</div>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
                  {sc.estimated_minutes && <span>⏱️ {sc.estimated_minutes} min</span>}
                  {sc.level && <span>Nivel: {sc.level}</span>}
                </div>
                <button
                  className={`mt-auto px-4 py-2 rounded-lg font-semibold text-white ${
                    creatingFor === sc.id
                      ? "bg-slate-400 cursor-wait"
                      : "bg-[#1E6ACB] hover:bg-[#0A3D91]"
                  }`}
                  disabled={creating || creatingFor === sc.id}
                  onClick={() => createSessionForScenario(sc.id)}
                >
                  {creatingFor === sc.id ? "Creando…" : "Crear sesión"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Con params presentes, mientras carga, muestra spinner para evitar el flash de error
  if (id && sessionId && loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando…
      </div>
    );
  }

  // Con params pero algo falló (solo si ya no está cargando)
  if (!loading && (!scenario || !session)) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const last = JSON.parse(raw);
        if (last && last.id === sessionId) localStorage.removeItem(LS_KEY);
      }
    } catch {}
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="mb-3">No se pudo cargar la sesión.</p>
          <Link to="/simulacion-presencial" className="text-[#0A3D91] underline">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {!fullscreenMode && <Navbar />}

      {/* Hero / encabezado */}
      {fullscreenMode ? (
        <section className="sticky top-0 z-30 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-[12rem]">
              <p className="text-xs uppercase tracking-wide opacity-80">Sesión {sessionId}</p>
              <h1 className="text-lg font-semibold leading-snug">{scenario.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
              {publicCode && (
                <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-xs tracking-[0.2em] ring-1 ring-white/30 md:text-sm">
                  Código: {prettyPublicCode}
                </span>
              )}
              {!startedAt && <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/30">● No iniciada</span>}
              {startedAt && !endedAt && <span className="rounded-full bg-green-500/20 px-2.5 py-1 ring-1 ring-green-300/40">● En curso</span>}
              {startedAt && endedAt && <span className="rounded-full bg-slate-200/30 px-2.5 py-1 ring-1 ring-white/30">● Finalizada</span>}
              {startedAt && (
                <span className="rounded-full px-3.5 py-1.5 text-sm md:text-base bg-white/15 ring-1 ring-white/30">
                  Tiempo: {fmtDuration(elapsedSec)}
                </span>
              )}
              {currentStepId && steps.length > 0 && (
                <span
                  className="rounded-full px-4 py-2 text-base md:text-lg font-semibold bg-white/20 ring-2 ring-white/40 shadow-sm tracking-tight"
                  title="Fase actual"
                >
                  {steps.find((s) => s.id === currentStepId)?.name || '—'}
                </span>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white">
          <div className="mx-auto max-w-6xl px-5 py-8 xl:max-w-7xl">
            <p className="opacity-95">Instructor · Sesión {sessionId}</p>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">
              {scenario.title}
            </h1>
            {scenario.summary && <p className="opacity-90 mt-1">{scenario.summary}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {publicCode && (
                <span className="px-3 py-1 rounded-full bg-white/15 font-mono tracking-[0.25em] ring-1 ring-white/30">
                  Código: {prettyPublicCode}
                </span>
              )}
              {!startedAt && (
                <span className="px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/30">
                  ● No iniciada
                </span>
              )}
              {startedAt && !endedAt && (
                <span className="px-2.5 py-1 rounded-full bg-green-500/20 ring-1 ring-green-300/40">
                  ● En curso
                </span>
              )}
              {startedAt && endedAt && (
                <span className="px-2.5 py-1 rounded-full bg-slate-200/30 ring-1 ring-white/30">
                  ● Finalizada
                </span>
              )}
              {startedAt && (
                <span className="px-3.5 py-1.5 rounded-full bg-white/15 ring-1 ring-white/30 text-sm md:text-base">
                  Tiempo: {fmtDuration(elapsedSec)}
                </span>
              )}
              {currentStepId && steps.length > 0 ? (
                <span
                  className="px-4 py-2 rounded-full bg-white/20 ring-2 ring-white/40 shadow-sm text-base md:text-lg font-semibold tracking-tight"
                  title="Fase actual"
                >
                  {steps.find((s) => s.id === currentStepId)?.name || "—"}
                </span>
              ) : null}
              {startedAt && (
                <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
                  Iniciada: {new Date(startedAt).toLocaleString()}
                </span>
              )}
              {endedAt && (
                <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
                  Finalizada: {new Date(endedAt).toLocaleString()}
                </span>
              )}
              {publicUrl && (
                <button
                  onClick={copyPublicUrl}
                  className="ml-2 px-3 py-1.5 rounded-lg bg-white/15 ring-1 ring-white/30 hover:bg-white/20"
                >
                  Copiar enlace de alumnos
                </button>
              )}
              {sessionId && !startedAt && !endedAt && (
                <Link
                  to={`/presencial/confirm/${id}/${sessionId}`}
                  className="ml-2 px-3 py-1.5 rounded-lg bg-white/15 ring-1 ring-white/30 hover:bg-white/20"
                  title="Pasar lista / confirmar alumnos"
                >
                  Confirmar alumnos
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {scenario?.patient_overview && (
        <section className="bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Ficha inicial del paciente</h3>
            {patientInfo.chips.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 text-xs">
                {patientInfo.chips.map((chip) => (
                  <span
                    key={`${chip.key}-${chip.label}`}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200"
                  >
                    <span aria-hidden>{DEMO_CHIP_ICONS[chip.key] || '•'}</span>
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
            <div className="text-sm text-slate-700 leading-relaxed">
              {scenario.patient_overview.split(/\n+/).map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1 text-slate-400">•</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <main
        className={`${fullscreenMode ? 'max-w-7xl xl:max-w-[96rem]' : 'max-w-6xl xl:max-w-7xl'} mx-auto px-5 py-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)] gap-7`}
      >
        {errorMsg && (
          <div className="lg:col-span-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2">
            {errorMsg}
          </div>
        )}

        <div className="xl:col-span-2">
          <nav className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-slate-200/60">
            <span className="text-sm font-semibold text-slate-700">Accesos rápidos</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => scrollToSection(scriptRef)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]"
              >
                📝 Guion
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(bannerRef)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]"
              >
                📢 Banner
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(variablesRef)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]"
              >
                📊 Constantes
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(phasesRef)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]"
              >
                🔁 Fases
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(checklistRef)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]"
              >
                ✅ Checklist
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFullscreenMode((prev) => !prev)}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]"
            >
              {fullscreenMode ? '↙ Salir de pantalla completa' : '⤢ Pantalla completa'}
            </button>
          </nav>
        </div>

        {/* Panel de control */}
        <section className="p-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Sticky header bar for quick actions */}
          <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/95 border-b border-slate-200">
            <div className="px-6 py-4 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold mr-auto">Control de la sesión</h2>
              {!isRunning && (
                <span className="inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-full bg-amber-100 px-2.5 py-1 text-sm text-amber-800 ring-1 ring-amber-200 sm:flex-none" role="status" aria-live="polite">
                  ⚠️ Pulsa <span className="font-semibold">Iniciar</span> para activar los controles
                </span>
              )}
              {/* Cronómetro compact */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">Duración</span>
                <span className="font-mono tabular-nums px-2 py-1 rounded bg-slate-100">{fmtDuration(elapsedSec)}</span>
              </div>
              <button
                onClick={startSession}
                disabled={isRunning || !!endedAt}
                className={`inline-flex flex-1 min-w-[150px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition shadow-sm sm:flex-none sm:text-base ${
                  isRunning || !!endedAt
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'text-white hover:opacity-95 animate-pulse ring-2 ring-offset-2 ring-[#1E6ACB] shadow-md'
                }`}
                style={{ background: !isRunning && !endedAt ? colors.primary : undefined }}
                title={!startedAt ? (endedAt ? 'Sesión finalizada' : 'Iniciar sesión') : 'Ya iniciada'}
              >
                <span>▶</span> Iniciar
              </button>
              <button
                onClick={endSession}
                disabled={!startedAt || !!endedAt}
                className={`inline-flex flex-1 min-w-[150px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition shadow-sm sm:flex-none sm:text-base ${
                  !startedAt || endedAt
                    ? "border-slate-200 text-slate-400 cursor-not-allowed"
                    : "border-red-300 text-red-700 hover:bg-red-50"
                }`}
                title={!startedAt ? "Aún no iniciada" : endedAt ? "Ya finalizada" : "Finalizar sesión"}
              >
                <span>■</span> Finalizar
              </button>
              <button
                onClick={triggerAlarm}
                className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 shadow-sm sm:flex-none sm:text-base"
                title="Emitir una alarma sonora en las pantallas conectadas"
              >
                🔔 Alarma
              </button>
              <button
                onClick={forceRefresh}
                className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 shadow-sm sm:flex-none sm:text-base"
                title="Forzar un refresco inmediato en las pantallas conectadas"
              >
                ⚡ Refrescar pantallas
              </button>
              <button
                onClick={handleOpenVentModal}
                className="inline-flex flex-1 min-w-[180px] items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 shadow-sm sm:flex-none sm:text-base"
                title="Configurar ventilación mecánica"
              >
                🫁 Ventilación mecánica
              </button>
              <button
                onClick={handleVentHide}
                disabled={!ventState}
                className={`inline-flex flex-1 min-w-[180px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition shadow-sm sm:flex-none sm:text-base ${
                  ventState
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Ocultar la ventilación en la vista del alumno"
              >
                ⛔ Ocultar ventilación
              </button>
              {ventState?.active === true && (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700" aria-live="polite">
                  ● Ventilación activa ({ventState.mode})
                  {ventState?.meta?.template?.name ? (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      ⚙️ {ventState.meta.template.name}
                    </span>
                  ) : null}
                </span>
              )}
              {ventAudienceSummary ? (
                <span className={`inline-flex flex-1 min-w-[220px] items-center justify-center rounded-full border px-3 py-1 text-[11px] font-medium sm:flex-none ${ventAudienceSummary.tone}`} aria-live="polite">
                  {ventAudienceSummary.text}
                </span>
              ) : null}
              {endedAt && (
                <Link
                  to={`/presencial/${id}/informe?session=${sessionId}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 shadow-sm"
                  title="Ver informe de la sesión"
                >
                  📄 Informe
                </Link>
              )}
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 shadow-sm"
              >
                ← Volver
              </button>
            </div>
          </div>
          <div className={`p-6 ${!isRunning ? 'opacity-50 pointer-events-none select-none' : ''}`}>
            <div className="space-y-8">
              <section
                ref={scriptRef}
                className="rounded-2xl border border-slate-100 bg-white/95 px-6 py-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900">Guion del caso</h3>
                    <p className="text-sm text-slate-600 max-w-xl">Define la narración que verán los alumnos durante la sesión. Puedes preparar tantos hitos como necesites y publicarlos de forma secuencial.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={addScriptLine} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]">+ Añadir</button>
                    <button onClick={prevScript} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]">← Anterior</button>
                    <button onClick={nextScript} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]">Siguiente →</button>
                    <button onClick={() => { ensureCtx(); publishScript(); }} className="rounded-full px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: colors.primary }}>Publicar actual</button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {scriptTexts.map((t, idx) => (
                    <div
                      key={idx}
                      className={`rounded-2xl border px-4 py-3 transition ${
                        idx === scriptIndex
                          ? 'border-[#1E6ACB] bg-[#1E6ACB]/5 shadow-sm'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paso {idx + 1}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => { setScriptIndex(idx); publishScript(idx); }}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              scriptIndex === idx ? 'border-[#1E6ACB] text-[#0A3D91]' : 'border-slate-200 text-slate-600 hover:border-[#1E6ACB] hover:text-[#0A3D91]'
                            }`}
                            title="Seleccionar y publicar este paso"
                          >
                            Publicar ahora
                          </button>
                          <button
                            onClick={() => setScriptIndex(idx)}
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              scriptIndex === idx ? 'border-slate-300 text-slate-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                            title="Marcar este paso como actual"
                          >
                            Marcar
                          </button>
                        </div>
                      </div>
                      <input
                        value={t}
                        onChange={(e) => setScriptTexts((arr) => arr.map((x, i) => (i === idx ? e.target.value : x)))}
                        placeholder={idx === 0 ? 'Llegada a urgencias...' : 'Texto del evento...'}
                        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
                  <button onClick={resetScript} className="rounded-full border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]">Reiniciar guion</button>
                  <button onClick={() => saveScriptLocal(sessionId, id, scriptTexts, scriptIndex)} className="rounded-full border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:border-slate-400" title="Guardar una copia local del guion">Guardar (local)</button>
                  <button onClick={() => { clearScriptLocal(sessionId, id); }} className="rounded-full border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:border-slate-400" title="Eliminar la copia local del guion">Borrar guardado</button>
                </div>
              </section>

              <section
                ref={variablesRef}
                className="rounded-2xl border border-slate-100 bg-white/95 px-6 py-5 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900">Constantes (edición rápida)</h3>
                <p className="mt-1 text-sm text-slate-600 max-w-2xl">Introduce un valor provisional y, cuando toque mostrarlo, pulsa <span className="font-medium text-slate-800">Mostrar</span>. Si necesitas retirarlo, usa <span className="font-medium text-slate-800">Ocultar</span>.</p>
                {variables.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No hay constantes configuradas para este escenario.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {Object.entries(VARIABLE_GROUP_CONFIG).map(([key, cfg]) => {
                      const items = variablesGrouped[key] || [];
                      if (!items.length) return null;
                      return (
                        <section key={key} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-800">{cfg.title}</h4>
                            <span className="text-xs text-slate-500">{items.length}</span>
                          </div>
                          {cfg.description ? (
                            <p className="mt-1 text-xs text-slate-500">{cfg.description}</p>
                          ) : null}
                          <div className={`mt-3 overflow-y-auto pr-1 ${cfg.maxHeight || ''}`}>
                            <div className={cfg.grid}>{items.map(renderVariableCard)}</div>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <section
                  ref={bannerRef}
                  className="rounded-2xl border border-slate-100 bg-white/95 px-6 py-5 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900">Texto en pantalla (banner)</h3>
                  <p className="mt-1 text-sm text-slate-600">Publica mensajes puntuales en la pantalla del alumnado. Al guardar, se enviará un aviso visual y sonoro.</p>
                  <textarea
                    rows={4}
                    className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                    placeholder="Introduce el texto que verán los alumnos (introducción, instrucciones, etc.)"
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => saveBanner()}
                      className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                      style={{ background: colors.primary }}
                      title="Publicar/actualizar el texto en la pantalla del alumno"
                    >
                      Publicar en pantalla
                    </button>
                    <button
                      onClick={() => saveBanner("")}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-400"
                      title="Vaciar el banner en la pantalla del alumno"
                    >
                      Limpiar banner
                    </button>
                  </div>
                </section>

                <section
                  ref={phasesRef}
                  className="rounded-2xl border border-slate-100 bg-white/95 px-6 py-5 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900">Fase del caso</h3>
                  <p className="mt-1 text-sm text-slate-600">Selecciona la fase activa para sincronizar la vista de los alumnos.</p>
                  {steps && steps.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {steps.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => updateStep(st.id)}
                          className={`rounded-full px-3 py-1.5 text-sm transition ${
                            currentStepId === st.id
                              ? 'bg-[#1E6ACB]/10 text-[#0A3D91]'
                              : 'border border-slate-200 text-slate-700 hover:border-[#1E6ACB] hover:text-[#0A3D91]'
                          }`}
                          title="Cambiar fase (se reflejará en la pantalla de alumnos)"
                        >
                          {st.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-500">Este escenario no tiene fases definidas.</div>
                  )}
                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Acciones rápidas</h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={clearAllVariables}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]"
                        title="Oculta todas las variables reveladas en la pantalla del alumno"
                      >
                        Ocultar constantes
                      </button>
                      <button
                        onClick={triggerAlarm}
                        className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 transition hover:bg-red-50"
                        title="Emitir una alarma sonora en las pantallas conectadas"
                      >
                        🔔 Alarma
                      </button>
                      <button
                        onClick={forceRefresh}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]"
                        title="Forzar un refresco inmediato en las pantallas conectadas"
                      >
                        ⚡ Refrescar pantallas
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>


        {/* Ayuda y enlace público */}
        <aside
          ref={checklistRef}
          className={`p-6 rounded-2xl bg-white/95 shadow-sm ring-1 ring-slate-200/60 lg:sticky lg:top-24 ${!isRunning ? 'opacity-90' : ''} flex flex-col gap-4`}
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">Pantalla del alumno <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">pública</span></h3>
          {publicUrl ? (
            <div className="mt-3 space-y-4 text-sm">
              <div>
                <p className="text-slate-700">Código para la pantalla de alumnos:</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-lg tracking-[0.3em] text-slate-900 shadow-inner">
                    {prettyPublicCode}
                  </span>
                  <button
                    onClick={copyPublicCode}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]"
                    title="Copiar código"
                  >
                    Copiar código
                  </button>
                </div>
              </div>
              <div>
                <p className="text-slate-700">Enlace directo (por si prefieres compartirlo):</p>
                <div className="mt-2 space-y-1">
                  {publicPath && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200">{publicPath}</span>
                      <span className="text-slate-400">(ruta corta)</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-[#0A3D91] underline"
                    >
                      {publicUrl}
                    </a>
                    <button
                      onClick={copyPublicUrl}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-200"
                      title="Copiar enlace"
                    >
                      Copiar enlace
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              La sesión no tiene public_code todavía.
            </p>
          )}

          <details className="mt-6">
            <summary className="font-semibold cursor-pointer select-none">Cómo funciona</summary>
            <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1 mt-2">
              <li>Pulsa <span className="font-medium">Iniciar</span> cuando comience la simulación.</li>
              <li>Usa el <span className="font-medium">guion</span> para publicar la narración del caso.</li>
              <li>Publica <span className="font-medium">constantes</span> o muéstralas/ocúltalas cuando proceda.</li>
              <li>Cambia la <span className="font-medium">fase</span> según el progreso.</li>
              <li>Al terminar, pulsa <span className="font-medium">Finalizar</span> para cerrar la sesión.</li>
            </ol>
          </details>

          {(
            <section className="mt-6 flex flex-col gap-4 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Checklist (ABCDE / Patología / Medicación)</h3>
                {checklist?.length ? (
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{checklist.length} ítems</span>
                ) : null}
              </div>

              {!isRunning && (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
                  ⚠️ Inicia la sesión para editar el checklist
                </div>
              )}

              <div className={`${!isRunning ? 'opacity-50 pointer-events-none select-none' : ''} flex-1 flex flex-col`}>
                {(!checklist || checklist.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
                    <p>No hay ítems de checklist para este escenario.</p>
                    <p className="mt-1">Crea los ítems en Supabase en <code>scenario_checklist</code> con columnas <code>label</code>, <code>category</code> (A, B, C, D, E, Diagnóstico, Tratamiento) y <code>order_index</code>.</p>
                    <div className="mt-3">
                      <Link
                        to={`/presencial/${id}/confirm?flow=dual`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-[#1E6ACB] hover:text-[#0A3D91]"
                      >
                        Ir a confirmar alumnos
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white/90 p-4 shadow-sm flex-1">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_ORDER.map(cat => {
                          const items = groupedChecklist[cat] || [];
                          if (items.length === 0) return null;
                          const active = activeCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setActiveCategory(cat)}
                              className={`rounded-full px-3 py-1.5 text-sm transition ${
                                active
                                  ? 'bg-[#1E6ACB]/10 text-[#0A3D91] ring-1 ring-[#1E6ACB]'
                                  : 'border border-slate-200 text-slate-700 hover:border-[#1E6ACB] hover:text-[#0A3D91]'
                              }`}
                              title={`Ver items de ${cat}`}
                            >
                              {cat}
                              <span className="ml-1 text-xs text-slate-500">({items.length})</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {ROLE_ORDER.map(r => {
                          const totalCat = (groupedChecklist[activeCategory] || []).length;
                          const active = activeRole === r;
                          if (r === 'Todos') {
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setActiveRole('Todos')}
                                className={`rounded-full px-3 py-1.5 text-sm transition ${active ? 'bg-slate-200 text-slate-800' : 'border border-slate-200 text-slate-600 hover:border-slate-400'}`}
                                title="Ver todos los roles"
                              >
                                Todos <span className="ml-1 text-xs text-slate-500">({totalCat})</span>
                              </button>
                            );
                          }
                          const roleCount = (groupedChecklist[activeCategory] || []).filter(it => normalizeRole(it.role) === r).length;
                          if (roleCount === 0) return null;
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setActiveRole(r)}
                              className={`rounded-full px-3 py-1.5 text-sm transition ${active ? 'bg-slate-200 text-slate-800' : 'border border-slate-200 text-slate-600 hover:border-slate-400'}`}
                              title={`Filtrar por rol: ${r}`}
                            >
                              {r} <span className="ml-1 text-xs text-slate-500">({roleCount})</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold uppercase tracking-wide">Estados</span>
                        {CHECK_STATUSES.map(s => (
                          <span key={s.key} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5">
                            <span>{s.icon}</span>
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                      {(groupedChecklist[activeCategory] || [])
                        .filter(item => activeRole === 'Todos' ? true : normalizeRole(item.role) === activeRole)
                        .map(item => {
                          const role = normalizeRole(item.role);
                          const roleCls = ROLE_COLORS[role] || ROLE_COLORS['Común'];
                          const wb = WEIGHT_BADGE[item.weight] || null;
                          const status = checkStatus[item.id];
                          return (
                            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="max-w-full text-sm font-medium text-slate-900">{item.label}</div>
                                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ${roleCls}`} title={`Rol: ${role}`}>
                                    {role}
                                  </span>
                                  {wb && (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ${wb.cls}`} title={`Peso ${item.weight}`}>
                                      {wb.label}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {CHECK_STATUSES.map(s => (
                                  <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => upsertChecklist(item.id, s.key)}
                                    className={`rounded-full px-3 py-1.5 text-sm transition ${status === s.key ? 'bg-[#1E6ACB]/10 text-[#0A3D91] ring-1 ring-[#1E6ACB]' : 'border border-slate-200 text-slate-600 hover:border-[#1E6ACB] hover:text-[#0A3D91]'}`}
                                    title={s.label}
                                  >
                                    <span className="mr-1">{s.icon}</span>
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                              <label className="mt-3 block">
                                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Nota</span>
                                <input
                                  type="text"
                                  placeholder="Añade un comentario breve (opcional)"
                                  value={checkNotes[item.id] || ''}
                                  onChange={(e) => saveChecklistNote(item.id, e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                                />
                              </label>
                            </article>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </aside>
      </main>

      {ventModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-sm px-4 py-8">
          <div
            ref={ventModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vent-modal-title"
            aria-describedby="vent-modal-desc"
            tabIndex={-1}
            onKeyDown={handleVentModalKeyDown}
            className="flex w-full max-w-6xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6ACB]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 id="vent-modal-title" className="text-lg font-semibold text-slate-900">Ventilación mecánica</h3>
                <p id="vent-modal-desc" className="text-sm text-slate-600">Configura el modo y los parámetros que verán los alumnos.</p>
              </div>
              <button
                onClick={() => setVentModalOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] items-start">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">
                      Modo: <span className="text-slate-800">{ventState?.mode || ventForm.mode}</span>
                    </span>
                    {ventState?.meta?.template?.name || selectedTemplateKey ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 font-semibold text-slate-700 ring-1 ring-slate-200">
                        ⚙️ {ventState?.meta?.template?.name || VENTILATION_TEMPLATES.find(t => t.key === selectedTemplateKey)?.name}
                      </span>
                    ) : null}
                    {patientInfo.weightKg ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 font-semibold text-slate-700 ring-1 ring-slate-200">
                        ⚖️ {patientInfo.weightKg} kg
                      </span>
                    ) : null}
                    <span className="text-slate-500">
                      {ventState?.timestamp
                        ? `Última actualización ${new Date(ventState.timestamp).toLocaleTimeString()}`
                        : 'Sin publicar todavía'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    onClick={handleVentApply}
                    disabled={isPublishingVent}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1E6ACB] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPublishingVent ? 'Publicando…' : 'Aplicar parámetros'}
                  </button>
                  <button
                    onClick={handleVentStop}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Detener ventilación
                  </button>
                  <button
                    onClick={() => setVentModalOpen(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Salir sin cambios
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-sm font-semibold text-slate-700">Plantillas rápidas</h4>
                <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {VENTILATION_TEMPLATES.map((tpl) => {
                    const activeTpl = selectedTemplateKey === tpl.key;
                    return (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => handleSelectTemplate(tpl.key)}
                        title={tpl.description}
                        className={`rounded-xl border px-2 py-2 text-left text-sm transition flex flex-col gap-1 h-full ${
                          activeTpl
                            ? 'border-[#1E6ACB] bg-[#1E6ACB]/5 text-[#0A3D91] shadow-sm'
                            : 'border-slate-200 hover:border-[#1E6ACB] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide">
                          <span className="font-semibold text-slate-600">{tpl.name}</span>
                          {activeTpl ? <span className="text-[#0A3D91] font-semibold">Seleccionada</span> : null}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">{tpl.mode}</span> · {tpl.tidalVolumePerKg ?? 7} ml/kg
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">Pasa el cursor sobre cada tarjeta para ver la descripción completa.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Modo</label>
                    <select
                      value={ventForm.mode}
                      onChange={(e) => {
                        const nextMode = e.target.value;
                        clearTemplateMeta();
                        setVentForm((prev) => {
                          const nextForm = { ...prev, mode: nextMode };
                          setVentState((prevState) => {
                            if (!prevState || prevState.active !== 'pending') return prevState;
                            const nextDraft = {
                              mode: nextMode,
                              parameters: { ...nextForm.parameters },
                              patient: { ...nextForm.patient },
                            };
                            return { ...prevState, draft: nextDraft, mode: nextMode };
                          });
                          return nextForm;
                        });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                    >
                      <option value="VC">Volumen control (VC)</option>
                      <option value="PC">Presión control (PC)</option>
                      <option value="PSV">Presión soporte (PSV)</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">Parámetros del ventilador</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 text-sm">
                    <label className="flex flex-col gap-1">
                      <span className="text-slate-600">Volumen tidal (mL)</span>
                      <input
                        type="number"
                        min={10}
                        max={200}
                        step={5}
                        value={ventForm.parameters.tidalVolume}
                        onChange={(e) => handleVentFieldChange('parameters', 'tidalVolume', Number(e.target.value))}
                        className={`rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 ${
                          tidalVolumeOutOfRange
                            ? 'border-amber-400 focus:ring-amber-400 bg-amber-50/40'
                            : 'border-slate-300 focus:ring-[#1E6ACB]'
                        }`}
                      />
                      {tidalPerKg != null ? (
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${
                            tidalVolumeOutOfRange
                              ? 'bg-amber-100/70 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span className="font-semibold text-slate-700">Actual {tidalPerKg} ml/kg</span>
                          {recommendedTidalRange ? (
                            <span className="text-slate-500">
                              (6–8 ml/kg → {recommendedTidalRange.minMl}-{recommendedTidalRange.maxMl} mL)
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-slate-600">Frecuencia (rpm)</span>
                      <input
                        type="number"
                        min={8}
                        max={40}
                        value={ventForm.parameters.rate}
                        onChange={(e) => handleVentFieldChange('parameters', 'rate', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-slate-600">PEEP (cmH₂O)</span>
                      <input
                        type="number"
                        min={0}
                        max={18}
                        value={ventForm.parameters.peep}
                        onChange={(e) => handleVentFieldChange('parameters', 'peep', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-slate-600">FiO₂</span>
                      <input
                        type="number"
                        min={0.21}
                        max={1}
                        step={0.01}
                        value={ventForm.parameters.fio2}
                        onChange={(e) => handleVentFieldChange('parameters', 'fio2', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-slate-600">Ti (s)</span>
                      <input
                        type="number"
                        min={0.3}
                        max={2}
                        step={0.05}
                        value={ventForm.parameters.inspiratoryTime}
                        onChange={(e) => handleVentFieldChange('parameters', 'inspiratoryTime', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </label>
                    {ventForm.mode === 'PC' && (
                      <label className="flex flex-col gap-1">
                        <span className="text-slate-600">Presión control (cmH₂O)</span>
                        <input
                          type="number"
                          min={10}
                          max={35}
                          value={ventForm.parameters.pressureControl}
                          onChange={(e) => handleVentFieldChange('parameters', 'pressureControl', Number(e.target.value))}
                          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                        />
                      </label>
                    )}
                    {ventForm.mode === 'PSV' && (
                      <label className="flex flex-col gap-1">
                        <span className="text-slate-600">Presión soporte (cmH₂O)</span>
                        <input
                          type="number"
                          min={8}
                          max={25}
                          value={ventForm.parameters.pressureSupport}
                          onChange={(e) => handleVentFieldChange('parameters', 'pressureSupport', Number(e.target.value))}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                        />
                      </label>
                    )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Estado del paciente</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                    <label className="flex flex-col gap-1">
                      <span className="text-slate-600">Compliance</span>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={ventForm.patient.compliance}
                        onChange={(e) => handleVentFieldChange('patient', 'compliance', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-slate-600">Resistencia</span>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={ventForm.patient.resistance}
                        onChange={(e) => handleVentFieldChange('patient', 'resistance', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-slate-600">Shunt alveolar</span>
                      <input
                        type="number"
                        min={0}
                        max={0.4}
                        step={0.01}
                        value={ventForm.patient.shunt}
                        onChange={(e) => handleVentFieldChange('patient', 'shunt', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-slate-600">Espacio muerto</span>
                      <input
                        type="number"
                        min={0.05}
                        max={0.4}
                        step={0.01}
                        value={ventForm.patient.deadspace}
                        onChange={(e) => handleVentFieldChange('patient', 'deadspace', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </label>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
