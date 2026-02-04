import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";
import Spinner from "../../../components/Spinner.jsx";
import AdminNav from "../components/AdminNav.jsx";
import { formatRole } from "../../../utils/formatUtils.js";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const statusOptions = [
  { value: "Disponible", label: "Disponible" },
  { value: "En construcción: en proceso", label: "En construcción: en proceso" },
  { value: "En construcción: sin iniciar", label: "En construcción: sin iniciar" },
  { value: "Borrador", label: "Borrador" },
  { value: "Archivado", label: "Archivado" },
  { value: "Publicado", label: "Publicado" },
];

const levelOptions = [
  { value: "basico", label: "Nivel básico" },
  { value: "medio", label: "Nivel medio" },
  { value: "avanzado", label: "Nivel avanzado" },
];

const baseModeOptions = [
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
];

function normalizeLevelValue(raw) {
  const defaultLevel = "basico";
  if (raw == null) return defaultLevel;
  const key = String(raw).trim().toLowerCase();
  if (!key) return defaultLevel;
  const synonyms = {
    medio: "medio",
    medium: "medio",
    basico: "basico",
    básico: "basico",
    basic: "basico",
    intro: "basico",
    avanzado: "avanzado",
    advanced: "avanzado",
    experto: "experto",
    expert: "experto",
  };
  if (synonyms[key]) return synonyms[key];
  if (["basico", "medio", "avanzado", "experto"].includes(key)) {
    return key;
  }
  return defaultLevel;
}

function normalizeMode(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  const normalized = new Set();
  raw.forEach((item) => {
    const entry = (item == null ? "" : String(item)).trim().toLowerCase();
    if (!entry) return;
    if (entry === "dual") {
      normalized.add("online");
      normalized.add("presencial");
      return;
    }
    normalized.add(entry);
  });
  return Array.from(normalized);
}

function serializeModeSelection(selected) {
  if (!Array.isArray(selected)) return [];
  const cleaned = Array.from(
    new Set(
      selected
        .map((value) => (value == null ? "" : String(value)).trim().toLowerCase())
        .filter(Boolean)
    )
  );
  // Persist explicit modes only. If both selected, store both; never store 'dual'.
  // Filter out legacy 'dual' token if present in the incoming selection.
  const allowed = ["online", "presencial"]; 
  const explicit = cleaned.filter((v) => allowed.includes(v));
  return explicit;
}

const TRIANGLE_VALUES = ["green", "amber", "red"];

const COMPETENCY_CATALOG = [
  { key: "initial_assessment", label: "Valoración inicial" },
  { key: "airway_breathing", label: "Vía aérea y respiración" },
  { key: "circulation_shock", label: "Circulación y shock" },
  { key: "sepsis_recognition", label: "Reconocimiento de sepsis" },
  { key: "meds_weight_dosing", label: "Fármacos y dosis por peso" },
  { key: "diagnostic_reasoning", label: "Razonamiento diagnóstico" },
  { key: "prioritization", label: "Priorización y toma de decisiones" },
  { key: "team_communication", label: "Comunicación en equipo (SBAR)" },
  { key: "family_communication", label: "Comunicación con familia" },
  { key: "patient_safety", label: "Seguridad del paciente" },
];
const COMPETENCY_LEVELS = ["Emergente", "Competente", "Avanzado"];

function createEmptyBriefForm() {
  return {
    id: null,
    title: "",
    context: "",
    chips: [],
    demographics: { age: "", weightKg: "", sex: "", location: "" },
    chiefComplaint: "",
    historyRaw: "",
    vitals: { fc: "", fr: "", sat: "", temp: "", notesText: "", taSystolic: "", taDiastolic: "" },
    examText: "",
    quickLabsText: "",
    imagingText: "",
    triangle: { appearance: "", breathing: "", circulation: "" },
    redFlags: [],
    criticalActions: [],
    competencies: [],
    learningObjective: "",
    objectivesByRole: {},
    estimatedMinutes: "",
  };
}

function safeJsonValue(value) {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

// Compute a shallow-to-moderate diff between two objects for logging changes.
function computeDiff(oldObj = {}, newObj = {}) {
  const changes = {};
  const keys = new Set([...(oldObj && typeof oldObj === 'object' ? Object.keys(oldObj) : []), ...(newObj && typeof newObj === 'object' ? Object.keys(newObj) : [])]);
  for (const key of keys) {
    const a = oldObj ? oldObj[key] : undefined;
    const b = newObj ? newObj[key] : undefined;
    if (a === undefined && b === undefined) continue;
    if (typeof a === 'object' && typeof b === 'object' && a != null && b != null && !Array.isArray(a) && !Array.isArray(b)) {
      const sub = computeDiff(a, b);
      if (Object.keys(sub).length > 0) changes[key] = sub;
    } else if (Array.isArray(a) || Array.isArray(b)) {
      const sa = JSON.stringify(a || []);
      const sb = JSON.stringify(b || []);
      if (sa !== sb) changes[key] = { before: a, after: b };
    } else {
      if (a !== b) changes[key] = { before: a, after: b };
    }
  }
  return changes;
}

function listToTextarea(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (item == null ? "" : String(item)))
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .join("\n");
  }
  if (typeof value === "string") return value;
  return "";
}

function formatHistoryTextarea(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("\n");
  }
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, raw]) => {
        if (raw == null) return key;
        if (Array.isArray(raw)) {
          return `${key}: ${raw.map((item) => String(item).trim()).filter(Boolean).join(" | ")}`;
        }
        return `${key}: ${String(raw)}`;
      })
      .join("\n");
  }
  return "";
}

function formatVitalsForForm(value) {
  const next = { fc: "", fr: "", sat: "", temp: "", notesText: "", taSystolic: "", taDiastolic: "" };
  if (!value || typeof value !== "object") return next;
  if (value.fc != null) next.fc = String(value.fc);
  if (value.fr != null) next.fr = String(value.fr);
  if (value.sat != null) next.sat = String(value.sat);
  if (value.temp != null) next.temp = String(value.temp);
  if (Array.isArray(value.notes)) {
    next.notesText = value.notes.map((item) => String(item)).join("\n");
  } else if (typeof value.notes === "string") {
    next.notesText = value.notes;
  }
  // Support TA as object {systolic, diastolic}
  if (value.ta && typeof value.ta === 'object') {
    if (value.ta.systolic != null) next.taSystolic = String(value.ta.systolic);
    if (value.ta.diastolic != null) next.taDiastolic = String(value.ta.diastolic);
  }
  return next;
}

function formatQuickLabsTextarea(list) {
  if (!Array.isArray(list)) return "";
  return list
    .map((item) => {
      const name = item?.name ? String(item.name).trim() : "";
      const value = item?.value ? String(item.value).trim() : "";
      if (!name && !value) return null;
      if (!value) return name;
      return `${name} | ${value}`;
    })
    .filter(Boolean)
    .join("\n");
}

function formatImagingTextarea(list) {
  if (!Array.isArray(list)) return "";
  return list
    .map((item) => {
      const name = item?.name ? String(item.name).trim() : "";
      const status = item?.status ? String(item.status).trim() : "";
      if (!name && !status) return null;
      if (!status) return name;
      return `${name} | ${status}`;
    })
    .filter(Boolean)
    .join("\n");
}

function parseListInput(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseChipsInput(text) {
  return String(text || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function sanitizeDemographicsInput(demo) {
  if (!demo || typeof demo !== "object") return null;
  const age = demo.age ? String(demo.age).trim() : "";
  const weight = demo.weightKg ? String(demo.weightKg).trim() : "";
  const sex = demo.sex ? String(demo.sex).trim() : "";
  const location = demo.location ? String(demo.location).trim() : "";
  const next = {};
  if (age) next.age = age;
  if (weight) {
    const parsed = Number(weight);
    next.weightKg = Number.isFinite(parsed) ? parsed : weight;
  }
  if (sex) next.sex = sex;
  if (location) next.context = location;
  return Object.keys(next).length > 0 ? next : null;
}

function parseHistoryInput(text) {
  const lines = parseListInput(text);
  if (lines.length === 0) return null;
  const obj = {};
  const free = [];
  let hasKey = false;
  lines.forEach((line) => {
    const idx = line.indexOf(":");
    if (idx > -1) {
      const key = line.slice(0, idx).trim();
      const valueRaw = line.slice(idx + 1).trim();
      if (!key) {
        if (valueRaw) free.push(valueRaw);
        return;
      }
      const segments = valueRaw
        ? valueRaw
            .split(/\|/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : [];
      if (segments.length > 1) {
        obj[key] = segments;
      } else if (segments.length === 1) {
        obj[key] = segments[0];
      } else {
        obj[key] = "";
      }
      hasKey = true;
    } else {
      free.push(line);
    }
  });
  if (hasKey) {
    if (free.length > 0) obj.general = free;
    return obj;
  }
  return free.length > 0 ? free : null;
}

function parseNumberField(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function sanitizeVitalsInput(vitals) {
  if (!vitals || typeof vitals !== "object") return null;
  const fc = parseNumberField(vitals.fc);
  const fr = parseNumberField(vitals.fr);
  const sat = parseNumberField(vitals.sat);
  const temp = parseNumberField(vitals.temp);
  const notes = parseListInput(vitals.notesText);
  const taSys = parseNumberField(vitals.taSystolic);
  const taDia = parseNumberField(vitals.taDiastolic);
  const next = {};
  if (fc != null) next.fc = fc;
  if (fr != null) next.fr = fr;
  if (sat != null) next.sat = sat;
  if (temp != null) next.temp = temp;
  if (notes.length > 0) next.notes = notes;
  if (taSys != null || taDia != null) {
    next.ta = {};
    if (taSys != null) next.ta.systolic = taSys;
    if (taDia != null) next.ta.diastolic = taDia;
  }
  return Object.keys(next).length > 0 ? next : null;
}

function parseQuickLabsInput(text) {
  const lines = parseListInput(text);
  if (lines.length === 0) return [];
  return lines.map((line) => {
    const segments = line.split("|");
    const name = segments.shift()?.trim() || "";
    const value = segments.join("|").trim();
    return {
      name: name || (value ? value : ""),
      value: value || null,
    };
  });
}

function parseImagingInput(text) {
  const lines = parseListInput(text);
  if (lines.length === 0) return [];
  return lines.map((line) => {
    const segments = line.split("|");
    const name = segments.shift()?.trim() || "";
    const status = segments.join("|").trim();
    return {
      name: name || (status ? status : ""),
      status: status || null,
    };
  });
}

function sanitizeTriangleInput(triangle) {
  if (!triangle || typeof triangle !== "object") return null;
  const next = {};
  ["appearance", "breathing", "circulation"].forEach((key) => {
    const raw = triangle[key] ? String(triangle[key]).trim().toLowerCase() : "";
    if (TRIANGLE_VALUES.includes(raw)) {
      next[key] = raw;
    }
  });
  return Object.keys(next).length > 0 ? next : null;
}

function sanitizeRedFlagsInput(text) {
  return parseListInput(text);
}

function sanitizeCriticalActionsInput(text) {
  return parseListInput(text);
}

function hydrateBriefForm(row, roles = ["MED", "NUR", "PHARM"]) {
  const base = createEmptyBriefForm();
  const data = row ? { ...row } : {};
  base.id = data.id ?? null;
  base.title = data.title ? String(data.title) : "";
  base.context = data.context ? String(data.context) : "";
  base.chiefComplaint = data.chief_complaint ? String(data.chief_complaint) : "";
  const chipsSource = Array.isArray(data.chips) ? data.chips : safeJsonValue(data.chips);
  base.chips = Array.isArray(chipsSource)
    ? chipsSource.map(chip => String(chip).trim()).filter(Boolean)
    : [];
  const demographicsSource = safeJsonValue(data.demographics);
  if (demographicsSource && typeof demographicsSource === "object") {
    base.demographics = {
      age: demographicsSource.age ? String(demographicsSource.age) : "",
      weightKg: demographicsSource.weightKg != null ? String(demographicsSource.weightKg) : "",
      sex: demographicsSource.sex ? String(demographicsSource.sex) : "",
      location: demographicsSource.context ? String(demographicsSource.context) : "",
    };
  }
  base.historyRaw = formatHistoryTextarea(safeJsonValue(data.history));
  base.vitals = formatVitalsForForm(safeJsonValue(data.vitals));
  base.examText = listToTextarea(safeJsonValue(data.exam));
  base.quickLabsText = formatQuickLabsTextarea(safeJsonValue(data.quick_labs));
  base.imagingText = formatImagingTextarea(safeJsonValue(data.imaging));
  const triangleSource = safeJsonValue(data.triangle);
  if (triangleSource && typeof triangleSource === "object") {
    base.triangle = {
      appearance: triangleSource.appearance ? String(triangleSource.appearance).toLowerCase() : "",
      breathing: triangleSource.breathing ? String(triangleSource.breathing).toLowerCase() : "",
      circulation: triangleSource.circulation ? String(triangleSource.circulation).toLowerCase() : "",
    };
  }
  const redFlagsSource = safeJsonValue(data.red_flags);
  if (Array.isArray(redFlagsSource)) {
    base.redFlags = redFlagsSource
      .map((item) => {
        if (item == null) return null;
        if (typeof item === "string") {
          const t = item.trim();
          return t ? { text: t, correct: true } : null;
        }
        if (typeof item === "object") {
          const t = String(item.text ?? "").trim();
          const c = Boolean(item.correct);
          return t ? { text: t, correct: c } : null;
        }
        return null;
      })
      .filter(Boolean);
  } else {
    base.redFlags = [];
  }
  const criticalActionsSource = safeJsonValue(data.critical_actions);
  base.criticalActions = Array.isArray(criticalActionsSource) 
    ? criticalActionsSource.map(action => String(action).trim()).filter(Boolean)
    : [];
  const competenciesSource = safeJsonValue(data.competencies);
  base.competencies = Array.isArray(competenciesSource)
    ? competenciesSource
        .map((c) => {
          if (!c || typeof c !== "object") return null;
          const key = c.key ? String(c.key).trim() : "";
          const label = c.label ? String(c.label).trim() : "";
          const expected = c.expected ? String(c.expected).trim() : "";
          const notes = c.notes ? String(c.notes).trim() : "";
          const weight = typeof c.weight === "number" ? c.weight : null;
          const item = { key: key || undefined, label, expected, notes };
          if (weight != null) item.weight = weight;
          return label ? item : null;
        })
        .filter(Boolean)
    : [];
  base.learningObjective = data.learning_objective ? String(data.learning_objective) : "";
  const objectivesSource = data.objectives && typeof data.objectives === "object" ? data.objectives : {};
  const objectivesByRole = {};
  roles.forEach((role) => {
    const raw = objectivesSource?.[role];
    if (Array.isArray(raw)) {
      objectivesByRole[role] = raw.map((item) => String(item)).join("\n");
    } else if (typeof raw === "string") {
      objectivesByRole[role] = raw;
    } else {
      objectivesByRole[role] = "";
    }
  });
  base.objectivesByRole = objectivesByRole;
  if (data.estimated_minutes != null) {
    base.estimatedMinutes = String(data.estimated_minutes);
  }
  // NOTE: time_limit_minutes is deprecated and no longer used.
  if (data.level) {
    base.level = String(data.level);
  }
  return base;
}

export default function Admin_ScenarioEditor() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scenario, setScenario] = useState(null);
  const [form, setForm] = useState(null);
  const [briefSupportsCompetencies, setBriefSupportsCompetencies] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [initialCategories, setInitialCategories] = useState([]);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [categorySuccess, setCategorySuccess] = useState("");
  const [briefForm, setBriefForm] = useState(() => createEmptyBriefForm());
  const [initialBriefForm, setInitialBriefForm] = useState(() => createEmptyBriefForm());
  const [briefRoles, setBriefRoles] = useState(["MED", "NUR", "PHARM"]);
  const [newRole, setNewRole] = useState("");
  const [briefSaving, setBriefSaving] = useState(false);
  const [briefError, setBriefError] = useState("");
  const [briefSuccess, setBriefSuccess] = useState("");
  const [resources, setResources] = useState([]);
  const [initialResources, setInitialResources] = useState([]);
  const [resourcesSaving, setResourcesSaving] = useState(false);
  const [resourcesError, setResourcesError] = useState("");
  const [resourcesSuccess, setResourcesSuccess] = useState("");
  const [steps, setSteps] = useState([]);
  const [initialSteps, setInitialSteps] = useState([]);
  const [stepsSaving, setStepsSaving] = useState(false);
  const [stepsError, setStepsError] = useState("");
  const [stepsSuccess, setStepsSuccess] = useState("");
  const [questionsByStep, setQuestionsByStep] = useState({});
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
  const [questionsSuccess, setQuestionsSuccess] = useState("");
  const [questionOperationState, setQuestionOperationState] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({
    metadata: false,
    taxonomy: false,
    brief: false,
    resources: false,
    attempts: false,
    steps: false,
    history: false,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [changeLogs, setChangeLogs] = useState([]);
  const [changeLogsLoading, setChangeLogsLoading] = useState(false);
  const [changeLogsError, setChangeLogsError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deletingScenario, setDeletingScenario] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const scenarioNumericId = Number.parseInt(scenarioId, 10);
  const roleDisplay = {
    MED: "Medicina",
    NUR: "Enfermería",
    PHARM: "Farmacia",
  };

  function resolveRoleLabel(role) {
    if (!role) return "";
    const key = String(role).trim();
    if (!key) return "";
    const upper = key.toUpperCase();
    if (roleDisplay[upper]) return roleDisplay[upper];
    return formatRole(key);
  }

  function normalizeRoleCode(raw) {
    if (raw == null) return "";
    if (typeof raw === "object") {
      const candidate = raw.value ?? raw.code ?? raw.key ?? raw.id ?? raw.rol ?? raw.role ?? raw.name;
      if (candidate != null) {
        return normalizeRoleCode(candidate);
      }
      return "";
    }
    const key = String(raw).trim().toUpperCase();
    if (!key) return "";
    if (["MED", "MEDICO", "MEDICINA", "MEDIC"].includes(key)) return "MED";
    if (["NUR", "NURSE", "ENFERMERIA", "ENFERMERÍA", "ENFER", "ENF"].includes(key)) return "NUR";
    if (["PHARM", "FARMACIA", "FARM", "PHARMACY", "FAR"].includes(key)) return "PHARM";
    return key;
  }
  const stepRoleOptions = [
    { value: "medico", label: "Medicina" },
    { value: "enfermeria", label: "Enfermería" },
    { value: "farmacia", label: "Farmacia" },
  ];
  const questionRoleOptions = [
    { value: "MED", label: "Medicina" },
    { value: "NUR", label: "Enfermería" },
    { value: "PHARM", label: "Farmacia" },
  ];
  const changeTypeLabels = {
    metadata: "Metadatos",
    categorias: "Categorías",
    brief: "Brief del paciente",
    recursos: "Recursos",
    pasos: "Pasos",
    preguntas: "Preguntas",
  };

  function toggleSection(sectionKey) {
    if (!sectionKey) return;
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev?.[sectionKey],
    }));
  }

  const getResolvedScenarioId = (explicitId) => {
    if (typeof explicitId === "number" && Number.isFinite(explicitId)) {
      return explicitId;
    }
    if (explicitId != null) {
      const parsed = Number.parseInt(explicitId, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (Number.isFinite(scenarioNumericId)) {
      return scenarioNumericId;
    }
    if (scenario?.id != null) {
      if (typeof scenario.id === "number" && Number.isFinite(scenario.id)) {
        return scenario.id;
      }
      if (typeof scenario.id === "string") {
        const parsedScenario = Number.parseInt(scenario.id, 10);
        if (Number.isFinite(parsedScenario)) return parsedScenario;
      }
    }
    return null;
  };

  async function loadQuestionsForStepIds(stepIds) {
    if (!Array.isArray(stepIds) || stepIds.length === 0) {
      setQuestionsByStep({});
      setQuestionsError("");
      setQuestionsLoading(false);
      return;
    }
    setQuestionsLoading(true);
    setQuestionsError("");
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("id,step_id,question_text,options,correct_option,explanation,roles,is_critical,hints,time_limit,critical_rationale")
        .in("step_id", stepIds)
        .order("step_id", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      const byStep = {};
      (data || []).forEach((row) => {
        if (!row?.step_id) return;
        const stepId = row.step_id;
        const parseJsonArray = (value) => {
          if (!value) return [];
          if (Array.isArray(value)) return value.filter(Boolean);
          if (typeof value === "string") {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) return parsed.filter((item) => item !== null && item !== undefined && item !== "");
              return parsed ? [parsed].filter(Boolean) : [];
            } catch (err) {
              return [value].filter(Boolean);
            }
          }
          return [];
        };
        const rolesArray = (() => {
          const collected = new Set();
          if (Array.isArray(row.roles)) {
            row.roles.forEach((role) => {
              const normalized = normalizeRoleCode(role);
              if (normalized) collected.add(normalized);
            });
          } else if (typeof row.roles === "string" && row.roles.trim()) {
            const normalized = normalizeRoleCode(row.roles);
            if (normalized) collected.add(normalized);
          }
          return Array.from(collected);
        })();
        const optionsArray = parseJsonArray(row.options).map((item) => {
          if (item == null) return "";
          if (typeof item === "string") return item;
          try {
            return JSON.stringify(item);
          } catch (err) {
            return String(item);
          }
        });
        const hintsArray = parseJsonArray(row.hints).map((item) => {
          if (item == null) return "";
          if (typeof item === "string") return item;
          return String(item);
        });
        const correctIndex = (() => {
          if (typeof row.correct_option === "number") return row.correct_option;
          if (typeof row.correct_option === "string") {
            const parsed = Number.parseInt(row.correct_option, 10);
            if (Number.isFinite(parsed)) return parsed;
          }
          return null;
        })();
        const question = {
          id: row.id,
          stepId,
          text: row.question_text || "",
          options: optionsArray,
          correctIndex,
          explanation: row.explanation || "",
          roles: rolesArray,
          isCritical: Boolean(row.is_critical),
          hints: hintsArray,
          timeLimit: row.time_limit != null ? Number(row.time_limit) : null,
          timeLimitInput: row.time_limit != null ? String(row.time_limit) : "",
          criticalRationale: row.critical_rationale || "",
          localId: `step-${stepId}-question-${row.id}`,
          dirty: false,
          isNew: false,
        };
        if (!byStep[stepId]) {
          byStep[stepId] = [];
        }
        byStep[stepId].push(question);
      });
      Object.keys(byStep).forEach((stepKey) => {
        byStep[stepKey].sort((a, b) => {
          const idA = typeof a.id === "number" ? a.id : Number.parseInt(a.id, 10) || 0;
          const idB = typeof b.id === "number" ? b.id : Number.parseInt(b.id, 10) || 0;
          return idA - idB;
        });
      });
      setQuestionsByStep((prev) => {
        const next = { ...(prev || {}) };
        stepIds.forEach((id) => {
          const key = Number(id);
          if (Number.isFinite(key)) {
            next[key] = byStep[key] ? [...byStep[key]] : [];
          } else if (byStep[id]) {
            next[id] = [...byStep[id]];
          } else {
            next[id] = [];
          }
        });
        return next;
      });
      setQuestionOperationState({});
    } catch (err) {
      console.error("[Admin_ScenarioEditor] loadQuestions", err);
      setQuestionsError(err?.message || "No se pudieron cargar las preguntas");
      setQuestionsByStep({});
    } finally {
      setQuestionsLoading(false);
    }
  }

  async function fetchChangeLogs(explicitId) {
    const resolvedId = getResolvedScenarioId(explicitId);
    if (!resolvedId) return;
    setChangeLogsLoading(true);
    setChangeLogsError("");
    try {
      const { data, error } = await supabase
        .from("scenario_change_logs")
        .select("id,scenario_id,change_type,description,meta,created_at,user_id,user_name")
        .eq("scenario_id", resolvedId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      setChangeLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[Admin_ScenarioEditor] fetchChangeLogs", err);
      setChangeLogsError(err?.message || "No se pudo cargar el historial");
    } finally {
      setChangeLogsLoading(false);
    }
  }

  async function registerChange(changeType, description, meta = {}) {
    const resolvedId = getResolvedScenarioId();
    if (!resolvedId || !changeType) return;
    const payload = {
      scenario_id: resolvedId,
      change_type: changeType,
      description: description || null,
    };
    if (currentUser?.id) {
      payload.user_id = currentUser.id;
    }
    if (currentUser?.name) {
      payload.user_name = currentUser.name;
    }
    if (meta && typeof meta === "object" && Object.keys(meta).length > 0) {
      payload.meta = meta;
    }
    try {
      // Get access token from localStorage
      const authKey = `sb-${import.meta.env.VITE_SUPABASE_URL.split('https://')[1].split('.')[0]}-auth-token`;
      const authData = JSON.parse(localStorage.getItem(authKey) || '{}');
      const accessToken = authData?.access_token;
      if (!accessToken) {
        console.error("[DEBUG] registerChange: No access token");
        return;
      }
      // Timebox the insert to avoid UI hangs if network stalls
      const controller = new AbortController();
      const timeoutMs = 5000;
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
      let insertResponse;
      try {
        insertResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/scenario_change_logs`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        console.error("[DEBUG] registerChange: Insert failed", insertResponse.status, errorText);
        throw new Error(`Insert change log failed: ${insertResponse.status}`);
      }
      // Refresh logs non-critically; ignore errors and do not time out UI
      try {
        await fetchChangeLogs(resolvedId);
      } catch (e) {
        console.warn('[DEBUG] registerChange: fetchChangeLogs warning', e);
      }
    } catch (err) {
      console.error("[Admin_ScenarioEditor] registerChange", err);
    }
  }

  // Non-blocking wrapper to avoid UI hangs on slow networks or RLS stalls
  async function registerChangeNonBlocking(changeType, description, meta = {}, maxWaitMs = 3000) {
    try {
      const regPromise = registerChange(changeType, description, meta).catch((e) => {
        console.warn('[DEBUG] registerChangeNonBlocking warning', e);
      });
      await Promise.race([
        regPromise,
        new Promise((resolve) => setTimeout(resolve, maxWaitMs)),
      ]);
    } catch (e) {
      console.warn('[DEBUG] registerChangeNonBlocking error', e);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setSuccess("");
      setCategoryError("");
      setCategorySuccess("");
      setBriefError("");
      setBriefSuccess("");
      setResourcesError("");
      setResourcesSuccess("");
      try {
        const { data, error: fetchErr } = await supabase
          .from("scenarios")
          .select("id,title,summary,status,mode,level,difficulty,estimated_minutes,max_attempts,created_at")
          .eq("id", scenarioId)
          .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!active) return;
        if (!data) {
          setError("Escenario no encontrado");
          setScenario(null);
          setForm(null);
          setSelectedCategories([]);
          setInitialCategories([]);
          setAllCategories([]);
          setBriefForm(createEmptyBriefForm());
          setBriefRoles(["MED", "NUR", "PHARM"]);
          setResources([]);
          setInitialResources([]);
          setSteps([]);
          setInitialSteps([]);
          setQuestionsByStep({});
          setQuestionsError("");
          setQuestionsLoading(false);
          setQuestionsSuccess("");
          setQuestionOperationState({});
          setChangeLogs([]);
          setChangeLogsError("");
          setChangeLogsLoading(false);
          return;
        }
        const [stepsRes, categoryLinkRes, briefRes, resourcesRes, logsRes] = await Promise.all([
          supabase
            .from("steps")
            .select("id,step_order,description,role_specific,roles,narrative")
            .eq("scenario_id", data.id)
            .order("step_order", { ascending: true }),
          supabase
            .from("scenario_categories")
            .select("category_id")
            .eq("scenario_id", data.id),
          supabase
            .from("case_briefs")
            .select(
              "id,title,context,chips,demographics,chief_complaint,history,vitals,exam,quick_labs,imaging,triangle,red_flags,critical_actions,learning_objective,objectives,estimated_minutes,level"
            )
            .eq("scenario_id", data.id)
            .maybeSingle(),
          supabase
            .from("case_resources")
            .select("id,title,url,source,type,year,free_access")
            .eq("scenario_id", data.id)
            .order("title", { ascending: true }),
          supabase
            .from("scenario_change_logs")
            .select("id,change_type,description,meta,created_at,user_id,user_name")
            .eq("scenario_id", data.id)
            .order("created_at", { ascending: false })
            .limit(25),
        ]);

        if (stepsRes.error) throw stepsRes.error;
        if (categoryLinkRes.error) throw categoryLinkRes.error;
        if (briefRes.error) throw briefRes.error;
        if (resourcesRes.error) throw resourcesRes.error;
        if (logsRes.error) throw logsRes.error;
        if (!active) return;

        setScenario(data);
        setForm({
          title: data.title || "",
          summary: data.summary || "",
          status: data.status || "Disponible",
          mode: normalizeMode(data.mode),
          level: normalizeLevelValue(data.level),
          estimated_minutes: data.estimated_minutes ?? 10,
          max_attempts: data.max_attempts ?? 3,
        });

        const currentCategories = (categoryLinkRes.data || []).map((row) => row.category_id);
        setSelectedCategories(currentCategories);
        setInitialCategories(currentCategories);

        setCategoryError("");
        setCategorySuccess("");
        try {
          const response = await fetch("/api/admin?action=list_scenario_categories");
          const payload = await response.json().catch(() => null);
          if (!response.ok || payload?.ok === false) {
            throw new Error(payload?.error || payload?.message || "No se pudieron cargar las categorías");
          }
          const categoriesList = Array.isArray(payload?.categories)
            ? payload.categories.map((item) => ({
                id: item?.id,
                name: item?.name || "(sin nombre)",
              }))
            : [];
          setAllCategories(categoriesList);
        } catch (catErr) {
          console.error("[Admin_ScenarioEditor] categories fetch", catErr);
          setAllCategories([]);
          setCategoryError(catErr?.message || "No se pudieron cargar las categorías");
        }

        let briefData = briefRes?.data ?? null;
        // Intentar cargar competencias si la columna existe (fallback silencioso si no existe)
        try {
          const { data: compRow, error: compErr } = await supabase
            .from("case_briefs")
            .select("competencies")
            .eq("scenario_id", data.id)
            .maybeSingle();
          if (!compErr) {
            setBriefSupportsCompetencies(true);
            if (briefData) briefData = { ...briefData, competencies: compRow?.competencies ?? null };
          } else {
            setBriefSupportsCompetencies(false);
          }
        } catch (_) {
          setBriefSupportsCompetencies(false);
        }
        const roleSet = new Set(["MED", "NUR", "PHARM"]);
        const incomingObjectives = briefData?.objectives && typeof briefData.objectives === "object"
          ? briefData.objectives
          : {};
        Object.keys(incomingObjectives).forEach((key) => {
          if (key) roleSet.add(key);
        });
        const roleList = Array.from(roleSet);
        const hydratedBrief = hydrateBriefForm(briefData, roleList);
        if (!hydratedBrief.estimatedMinutes && data?.estimated_minutes != null) {
          hydratedBrief.estimatedMinutes = String(data.estimated_minutes);
        }
        setBriefForm(hydratedBrief);
        setInitialBriefForm(hydratedBrief);
        setBriefRoles(roleList);

        const resourceRows = (resourcesRes.data || []).map((row) => ({ ...row }));
        setResources(resourceRows);
        setInitialResources(resourceRows);

        const logRows = Array.isArray(logsRes.data) ? logsRes.data : [];
        setChangeLogs(logRows);
        setChangeLogsError("");
        setChangeLogsLoading(false);

        const stepRows = (stepsRes.data || []).map((row, idx) => ({
          id: row.id,
          step_order: row.step_order ?? idx + 1,
          description: row.description || "",
          role_specific: Boolean(row.role_specific),
          roles: Array.isArray(row.roles)
            ? row.roles.filter(Boolean).map((role) => String(role).toLowerCase())
            : [],
          narrative: row.narrative || "",
        }));
        setSteps(stepRows);
        setInitialSteps(stepRows);
        setQuestionsSuccess("");
        setQuestionOperationState({});
        if (!active) return;
        await loadQuestionsForStepIds(stepRows.map((row) => row.id).filter(Boolean));
        if (!active) return;
      } catch (err) {
        console.error("[Admin_ScenarioEditor] load", err);
        if (!active) return;
        setError(err?.message || "No se pudo cargar el escenario");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [scenarioId]);

  useEffect(() => {
    setSuccess("");
  }, [form]);

  useEffect(() => {
    let active = true;
    async function loadCurrentUser() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!active) return;
        const user = sessionData?.session?.user;
        if (!user) {
          setCurrentUser(null);
          return;
        }
        let displayName = (user.user_metadata?.full_name || "").trim();
        if (!displayName) {
          const alternative = [user.user_metadata?.nombre, user.user_metadata?.apellidos]
            .filter(Boolean)
            .join(" ")
            .trim();
          if (alternative) displayName = alternative;
        }
        if (!displayName) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("nombre, apellidos")
            .eq("id", user.id)
            .maybeSingle();
          if (!active) return;
          if (profileRow) {
            displayName = [profileRow.nombre, profileRow.apellidos].filter(Boolean).join(" ").trim();
          }
        }
        if (!displayName) {
          displayName = user.email || "Usuario";
        }
        if (!active) return;
        setCurrentUser({ id: user.id, name: displayName });
      } catch (err) {
        console.error("[Admin_ScenarioEditor] currentUser", err);
        if (active) setCurrentUser(null);
      }
    }
    loadCurrentUser();
    return () => {
      active = false;
    };
  }, []);

  const modeOptions = useMemo(() => {
    const current = form?.mode || [];
    const extras = current
      .filter((value) => !baseModeOptions.some((option) => option.value === value))
      .map((value) => ({ value, label: value }));
    const merged = [...baseModeOptions];
    extras.forEach((option) => {
      if (!merged.some((item) => item.value === option.value)) {
        merged.push(option);
      }
    });
    return merged;
  }, [form?.mode]);

  function handleFieldChange(field, value) {
    let nextValue = value;
    if (field === "level" && typeof value === "string") {
      nextValue = value.trim().toLowerCase();
    }
    setForm((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  }

  function toggleMode(value) {
    setForm((prev) => {
      const current = new Set(prev?.mode || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return {
        ...prev,
        mode: Array.from(current),
      };
    });
  }

  function toggleCategorySelection(categoryId) {
    setCategorySuccess("");
    setCategoryError("");
    setSelectedCategories((prev) => {
      const next = new Set(prev || []);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return Array.from(next);
    });
  }

  async function handleSaveCategories() {
    if (!scenarioNumericId) return;
    setCategoryError("");
    setCategorySuccess("");
    setCategorySaving(true);
    try {
      const response = await fetch("/api/admin?action=set_scenario_categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: scenarioNumericId,
          category_ids: selectedCategories,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) {
        const code = payload?.error || "unknown";
        const detail = payload?.details;
        let message = payload?.message || payload?.error || "No se pudieron actualizar las categorías";
        if (code === "server_not_configured") {
          message = "Servidor sin credenciales de servicio. Informa al administrador.";
        } else if (code === "invalid_scenario_id") {
          message = "Identificador de escenario no válido";
        } else if (detail) {
          message = `${message}. Detalle: ${detail}`;
        }
        throw new Error(message);
      }

      const added = (selectedCategories || []).filter((id) => !(initialCategories || []).includes(id));
      const removed = (initialCategories || []).filter((id) => !(selectedCategories || []).includes(id));
      setInitialCategories(selectedCategories);
      const selectedLabels = allCategories
        .filter((category) => selectedCategories.includes(category.id))
        .map((category) => category.name);
      console.log("[DEBUG] handleSaveCategories: Registering change (non-blocking)");
      await registerChangeNonBlocking("categorias", "Actualizó las categorías del escenario", {
        category_ids: selectedCategories,
        category_labels: selectedLabels,
        added,
        removed,
      });
      console.log("[DEBUG] handleSaveCategories: Proceeding after registerChange race");
      setCategorySuccess("Categorías actualizadas");
    } catch (err) {
      // Defensive: some environments may throw non-Error values (null, string, DOMException without message)
      const fallbackMsg = "No se pudieron actualizar las categorías";
      let msg = fallbackMsg;
      if (err) {
        if (typeof err === "string") msg = err;
        else if (typeof err.message === "string" && err.message) msg = err.message;
      }
      console.error("[Admin_ScenarioEditor] categories", err);
      setCategoryError(msg);
    } finally {
      setCategorySaving(false);
    }
  }

  function handleBriefObjectiveChange(role, value) {
    setBriefSuccess("");
    setBriefError("");
    setBriefForm((prev) => ({
      ...prev,
      objectivesByRole: {
        ...(prev?.objectivesByRole || {}),
        [role]: value,
      },
    }));
  }

  function handleBriefLearningObjectiveChange(value) {
    setBriefSuccess("");
    setBriefError("");
    setBriefForm((prev) => ({
      ...prev,
      learningObjective: value,
    }));
  }

  function handleAddRole() {
    const raw = newRole.trim();
    if (!raw) return;
    const key = raw.toUpperCase();
    if (briefRoles.includes(key)) {
      setNewRole("");
      return;
    }
    setBriefRoles((prev) => [...prev, key]);
    setBriefForm((prev) => ({
      ...prev,
      objectivesByRole: {
        ...(prev?.objectivesByRole || {}),
        [key]: "",
      },
    }));
    setNewRole("");
  }

  function handleRemoveRole(role) {
    if (role === "MED" || role === "NUR" || role === "PHARM") return;
    setBriefSuccess("");
    setBriefError("");
    setBriefRoles((prev) => prev.filter((item) => item !== role));
    setBriefForm((prev) => {
      const nextObjectives = { ...(prev?.objectivesByRole || {}) };
      delete nextObjectives[role];
      return {
        ...prev,
        objectivesByRole: nextObjectives,
      };
    });
  }

  async function handleSaveBrief() {
    if (!scenarioNumericId) return;
    setBriefError("");
    setBriefSuccess("");
    setBriefSaving(true);
    try {
      const objectivesPayload = {};
      briefRoles.forEach((role) => {
        const text = briefForm?.objectivesByRole?.[role] || "";
        const items = text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (items.length > 0) {
          objectivesPayload[role] = items;
        }
      });
      const learningObjective = briefForm?.learningObjective?.trim() || null;
      const title = briefForm?.title?.trim() || scenario?.title || "Escenario sin titulo";
      const context = briefForm?.context?.trim() || null;
      const chipsList = (briefForm?.chips || []).map(c => String(c).trim()).filter(Boolean);
      const demographicsPayload = sanitizeDemographicsInput(briefForm?.demographics);
      const chiefComplaint = briefForm?.chiefComplaint?.trim() || null;
      const historyPayload = parseHistoryInput(briefForm?.historyRaw);
      const vitalsPayload = sanitizeVitalsInput(briefForm?.vitals);
      const examList = parseListInput(briefForm?.examText);
      const quickLabsList = parseQuickLabsInput(briefForm?.quickLabsText);
      const imagingList = parseImagingInput(briefForm?.imagingText);
      const trianglePayload = sanitizeTriangleInput(briefForm?.triangle);
      const redFlagsPayload = (briefForm?.redFlags || [])
        .map((it) => ({ text: String(it.text || "").trim(), correct: Boolean(it.correct) }))
        .filter((it) => it.text.length > 0);
      const criticalActionsList = (briefForm?.criticalActions || []).map(a => String(a).trim()).filter(Boolean);
      const competenciesPayload = (briefForm?.competencies || [])
        .map((c) => ({
          key: c.key ? String(c.key).trim() : undefined,
          label: String(c.label || "").trim(),
          expected: String(c.expected || "").trim(),
          notes: String(c.notes || "").trim() || undefined,
          weight: typeof c.weight === "number" ? c.weight : undefined,
        }))
        .filter((c) => c.label.length > 0);
      const explicitMinutes = parseNumberField(briefForm?.estimatedMinutes);
      const scenarioMinutes = parseNumberField(scenario?.estimated_minutes);
      const finalMinutes = explicitMinutes ?? scenarioMinutes ?? 10;
      const levelValue = normalizeLevelValue(scenario?.level);
      const basePayload = {
        title,
        context,
        chips: chipsList.length > 0 ? chipsList : null,
        demographics: demographicsPayload,
        chief_complaint: chiefComplaint,
        history: historyPayload,
        vitals: vitalsPayload,
        exam: examList.length > 0 ? examList : null,
        quick_labs: quickLabsList.length > 0 ? quickLabsList : null,
        imaging: imagingList.length > 0 ? imagingList : null,
        triangle: trianglePayload,
        red_flags: redFlagsPayload.length > 0 ? redFlagsPayload : null,
        critical_actions: criticalActionsList.length > 0 ? criticalActionsList : null,
        learning_objective: learningObjective,
        objectives: objectivesPayload,
        estimated_minutes: finalMinutes,
        level: levelValue,
      };
      if (briefSupportsCompetencies && competenciesPayload.length > 0) {
        basePayload.competencies = competenciesPayload;
      }
      let hydrated;
      if (briefForm?.id) {
        const { data, error: updateErr } = await supabase
          .from("case_briefs")
          .update(basePayload)
          .eq("id", briefForm.id)
          .select()
          .maybeSingle();
        if (updateErr) throw updateErr;
        const updatedRoles = new Set(briefRoles);
        Object.keys(data?.objectives || {}).forEach((roleKey) => {
          if (roleKey) updatedRoles.add(roleKey);
        });
        hydrated = hydrateBriefForm(data, Array.from(updatedRoles));
        setBriefForm(hydrated);
        setBriefRoles(Array.from(updatedRoles));
      } else {
        const insertPayload = {
          scenario_id: scenarioNumericId,
          ...basePayload,
        };
        const { data, error: insertErr } = await supabase
          .from("case_briefs")
          .insert(insertPayload)
          .select()
          .maybeSingle();
        if (insertErr) throw insertErr;
        const updatedRoles = new Set(briefRoles);
        Object.keys(data?.objectives || {}).forEach((roleKey) => {
          if (roleKey) updatedRoles.add(roleKey);
        });
        hydrated = hydrateBriefForm(data, Array.from(updatedRoles));
        setBriefForm(hydrated);
        setBriefRoles(Array.from(updatedRoles));
      }
      const oldBrief = initialBriefForm || {};
      const diff = computeDiff(oldBrief, basePayload);
      console.log("[DEBUG] handleSaveBrief: Registering change (non-blocking)");
      await registerChangeNonBlocking("brief", "Actualizó el brief y los objetivos del caso", {
        diff,
        fields: Object.keys(diff || {}),
      });
      console.log("[DEBUG] handleSaveBrief: Proceeding after registerChange race)");
      if (hydrated) setInitialBriefForm(hydrated);
      setBriefSuccess("Brief actualizado");
    } catch (err) {
      console.error("[Admin_ScenarioEditor] brief", err);
      setBriefError(err?.message || "No se pudo actualizar el brief");
    } finally {
      setBriefSaving(false);
    }
  }

  function handleResourceChange(index, field, value) {
    setResourcesSuccess("");
    setResourcesError("");
    setResources((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  }

  function toggleResourceFreeAccess(index) {
    setResourcesSuccess("");
    setResourcesError("");
    setResources((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        free_access: !next[index]?.free_access,
      };
      return next;
    });
  }

  function addResource() {
    setResourcesSuccess("");
    setResourcesError("");
    setResources((prev) => {
      return [
        ...prev,
        {
          id: null,
          title: "",
          url: "",
          source: "",
          type: "",
          year: "",
          free_access: true,
        },
      ];
    });
  }

  function removeResource(index) {
    setResourcesSuccess("");
    setResourcesError("");
    setResources((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSaveResources() {
    console.log("[DEBUG] handleSaveResources: Starting save");
    
    // Test with direct fetch to Supabase REST API
    console.log("[DEBUG] handleSaveResources: Testing direct fetch to Supabase...");
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log("[DEBUG] handleSaveResources: URL:", supabaseUrl, "Key present:", !!supabaseKey);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/scenarios?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log("[DEBUG] handleSaveResources: Direct fetch response status:", response.status);
      
      if (!response.ok) {
        console.error("[DEBUG] handleSaveResources: Direct fetch failed with status", response.status);
        setResourcesError(`Error HTTP ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log("[DEBUG] handleSaveResources: Direct fetch successful, data:", data);
      
    } catch (fetchErr) {
      console.error("[DEBUG] handleSaveResources: Direct fetch exception", fetchErr);
      setResourcesError("Error de conexión directa: " + fetchErr.message);
      return;
    }
    
    console.log("[DEBUG] handleSaveResources: Direct connectivity OK, proceeding...");
    
    if (!scenarioNumericId) {
      console.log("[DEBUG] handleSaveResources: No scenario ID, returning");
      return;
    }
    setResourcesError("");
    setResourcesSuccess("");
    const sanitized = resources.map((item) => ({
      ...item,
      title: item?.title?.trim() || "",
      url: item?.url?.trim() || "",
      source: item?.source?.trim() || "",
      type: item?.type?.trim() || "",
      year: item?.year ? Number.parseInt(item.year, 10) : null,
      free_access: Boolean(item?.free_access),
      weight: Number.isFinite(Number(item?.weight)) ? Number(item.weight) : 0,
    }));
    console.log("[DEBUG] handleSaveResources: Sanitized resources", sanitized);
    if (sanitized.some((item) => !item.title || !item.url)) {
      console.log("[DEBUG] handleSaveResources: Validation failed");
      setResourcesError("Cada recurso necesita título y URL");
      return;
    }
    // Get session token from localStorage to avoid hanging Supabase client
    const authKey = `sb-${import.meta.env.VITE_SUPABASE_URL.split('https://')[1].split('.')[0]}-auth-token`;
    const authData = JSON.parse(localStorage.getItem(authKey) || '{}');
    const accessToken = authData?.access_token;
    if (!accessToken) {
      console.error("[DEBUG] handleSaveResources: No access token in localStorage");
      setResourcesError("Sesión expirada, por favor recarga la página");
      return;
    }
    console.log("[DEBUG] handleSaveResources: Access token obtained from localStorage");
    setResourcesSaving(true);
    console.log("[DEBUG] handleSaveResources: Set saving to true");
    try {
      const toDelete = initialResources.filter((item) => item.id && !sanitized.some((current) => current.id === item.id));
      console.log("[DEBUG] handleSaveResources: To delete", toDelete);
      if (toDelete.length > 0) {
        console.log("[DEBUG] handleSaveResources: Deleting resources");
        const deleteIds = toDelete.map((item) => item.id).join(',');
        const deleteResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/case_resources?id=in.(${deleteIds})`, {
          method: 'DELETE',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        console.log("[DEBUG] handleSaveResources: Delete response status:", deleteResponse.status);
        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error("[DEBUG] handleSaveResources: Delete failed", deleteResponse.status, errorText);
          throw new Error(`Delete failed: ${deleteResponse.status} ${errorText}`);
        }
        console.log("[DEBUG] handleSaveResources: Delete completed");
      }
      const toUpdate = sanitized.filter((item) => item.id);
      console.log("[DEBUG] handleSaveResources: To update", toUpdate);
      if (toUpdate.length > 0) {
        console.log("[DEBUG] handleSaveResources: Updating resources");
        await Promise.all(
          toUpdate.map(async (item) => {
            console.log("[DEBUG] handleSaveResources: Updating item", item.id);
            const updatePayload = {
              title: item.title,
              url: item.url,
              source: item.source || null,
              type: item.type || null,
              year: item.year,
              free_access: item.free_access,
            };
            const updateResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/case_resources?id=eq.${item.id}`, {
              method: 'PATCH',
              headers: {
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify(updatePayload),
            });
            console.log("[DEBUG] handleSaveResources: Update response status for", item.id, ":", updateResponse.status);
            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              console.error("[DEBUG] handleSaveResources: Update failed for", item.id, updateResponse.status, errorText);
              throw new Error(`Update failed for ${item.id}: ${updateResponse.status} ${errorText}`);
            }
            console.log("[DEBUG] handleSaveResources: Update completed for", item.id);
          })
        );
        console.log("[DEBUG] handleSaveResources: All updates completed");
      }
      const toInsert = sanitized.filter((item) => !item.id);
      console.log("[DEBUG] handleSaveResources: To insert", toInsert);
      if (toInsert.length > 0) {
        console.log("[DEBUG] handleSaveResources: Inserting resources");
        const insertPayload = toInsert.map((item) => ({
          scenario_id: scenarioNumericId,
          title: item.title,
          url: item.url,
          source: item.source || null,
          type: item.type || null,
          year: item.year,
          free_access: item.free_access,
        }));
        console.log("[DEBUG] handleSaveResources: Insert payload", insertPayload);
        console.log("[DEBUG] handleSaveResources: About to call direct fetch insert");
        const insertResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/case_resources`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(insertPayload),
        });
        console.log("[DEBUG] handleSaveResources: Direct insert response status:", insertResponse.status);
        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          console.error("[DEBUG] handleSaveResources: Direct insert failed", insertResponse.status, errorText);
          throw new Error(`Insert failed: ${insertResponse.status} ${errorText}`);
        }
        const insertData = await insertResponse.json();
        console.log("[DEBUG] handleSaveResources: Insert result - data:", insertData);
        console.log("[DEBUG] handleSaveResources: Insert completed successfully");
      }
      console.log("[DEBUG] handleSaveResources: Refreshing data");
      const refreshResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/case_resources?scenario_id=eq.${scenarioNumericId}&select=id,title,url,source,type,year,free_access&order=title.asc`, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      console.log("[DEBUG] handleSaveResources: Refresh response status:", refreshResponse.status);
      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error("[DEBUG] handleSaveResources: Refresh failed", refreshResponse.status, errorText);
        throw new Error(`Refresh failed: ${refreshResponse.status} ${errorText}`);
      }
      const refreshed = await refreshResponse.json();
      console.log("[DEBUG] handleSaveResources: Refresh completed, data:", refreshed);
      const next = (refreshed || []).map((row) => ({ ...row }));
      setResources(next);
      setInitialResources(next);
      console.log("[DEBUG] handleSaveResources: State updated");
      // Compute detailed change summary for resources
      const deletedResources = (initialResources || [])
        .filter((item) => item.id && !sanitized.some((current) => current.id === item.id))
        .map((r) => ({ id: r.id, title: r.title }));
      const insertedResources = (toInsert || []).map((r) => ({ title: r.title }));
      const updatedResources = (toUpdate || [])
        .map((item) => {
          const before = (initialResources || []).find((ir) => ir.id === item.id) || null;
          const diff = before ? computeDiff(before, item) : {};
          return Object.keys(diff).length > 0 ? { id: item.id, title: item.title, diff } : null;
        })
        .filter(Boolean);
      console.log("[DEBUG] handleSaveResources: Registering change (non-blocking)");
      // Fire-and-forget change log registration, but timebox our wait so UI never hangs
      const MAX_REGISTER_WAIT_MS = 3000;
      const regPromise = registerChange("recursos", "Actualizó las lecturas y materiales del caso", {
        total_resources: next.length,
        inserted: insertedResources,
        deleted: deletedResources,
        updated: updatedResources,
      }).catch((e) => {
        console.warn("[DEBUG] handleSaveResources: registerChange warning", e);
      });
      await Promise.race([
        regPromise,
        new Promise((resolve) => setTimeout(resolve, MAX_REGISTER_WAIT_MS)),
      ]);
      console.log("[DEBUG] handleSaveResources: Proceeding after registerChange race");
      setResourcesSuccess("Lecturas actualizadas");
      console.log("[DEBUG] handleSaveResources: Success set");
    } catch (err) {
      console.error("[Admin_ScenarioEditor] save resources", err);
      const errorMessage = (err && typeof err === 'object' && err.message) ? err.message : (typeof err === 'string' ? err : "No se pudieron guardar las lecturas");
      setResourcesError(errorMessage);
      console.log("[DEBUG] handleSaveResources: Error caught", err);
    } finally {
      setResourcesSaving(false);
      console.log("[DEBUG] handleSaveResources: Finally block executed");
    }
  }

  function addStep() {
    setStepsSuccess("");
    setStepsError("");
    setSteps((prev) => [
      ...prev,
      {
        id: null,
        description: "",
        step_order: prev.length + 1,
        role_specific: false,
        roles: [],
        narrative: "",
      },
    ]);
  }

  function updateStep(index, field, value) {
    setStepsSuccess("");
    setStepsError("");
    setSteps((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  }

  function toggleStepRoleSpecific(index) {
    setStepsSuccess("");
    setStepsError("");
    setSteps((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        role_specific: !next[index]?.role_specific,
        roles: !next[index]?.role_specific ? [] : next[index].roles,
      };
      return next;
    });
  }

  function removeStep(index) {
    setStepsSuccess("");
    setStepsError("");
    setSteps((prev) => prev.filter((_, idx) => idx !== index));
  }

  function moveStep(index, direction) {
    setStepsSuccess("");
    setStepsError("");
    setSteps((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[targetIndex];
      next[targetIndex] = next[index];
      next[index] = temp;
      return next.map((step, idx) => ({
        ...step,
        step_order: idx + 1,
      }));
    });
  }

  function generateTempQuestionId(stepId) {
    const base = Number.isFinite(Number(stepId)) ? Number(stepId) : String(stepId || "step");
    return `step-${base}-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function setQuestionOperation(localId, state) {
    if (!localId) return;
    setQuestionOperationState((prev) => {
      const next = { ...(prev || {}) };
      if (!state) {
        delete next[localId];
      } else {
        next[localId] = state;
      }
      return next;
    });
  }

  function updateQuestion(stepId, questionIndex, updater) {
    setQuestionsSuccess("");
    setQuestionsError("");
    const stepKey = Number.isFinite(Number(stepId)) ? Number(stepId) : stepId;
    setQuestionsByStep((prev) => {
      const source = prev?.[stepKey] ? [...prev[stepKey]] : [];
      if (!source[questionIndex]) return prev;
      const current = source[questionIndex];
      const updates = typeof updater === "function" ? updater(current) : updater;
      if (updates == null) return prev;
      const nextQuestion = {
        ...current,
        ...updates,
        dirty: true,
      };
      if (!nextQuestion.localId) {
        nextQuestion.localId = current.localId || generateTempQuestionId(stepKey);
      }
      source[questionIndex] = nextQuestion;
      return {
        ...(prev || {}),
        [stepKey]: source,
      };
    });
  }

  function handleAddQuestion(stepId) {
    if (!stepId) return;
    setQuestionsError("");
    setQuestionsSuccess("");
    const stepKey = Number.isFinite(Number(stepId)) ? Number(stepId) : stepId;
    const newQuestion = {
      id: null,
      stepId: stepKey,
      localId: generateTempQuestionId(stepKey),
      text: "",
      options: ["", ""],
      correctIndex: null,
      explanation: "",
      roles: [],
      rolesText: "",
      isCritical: false,
      hints: [],
      timeLimit: null,
      timeLimitInput: "",
      criticalRationale: "",
      dirty: true,
      isNew: true,
    };
    setQuestionsByStep((prev) => {
      const source = prev?.[stepKey] ? [...prev[stepKey]] : [];
      return {
        ...(prev || {}),
        [stepKey]: [...source, newQuestion],
      };
    });
  }

  function handleQuestionTextChange(stepId, questionIndex, value) {
    updateQuestion(stepId, questionIndex, { text: value });
  }

  function handleQuestionOptionChange(stepId, questionIndex, optionIndex, value) {
    updateQuestion(stepId, questionIndex, (current) => {
      const nextOptions = [...(current.options || [])];
      nextOptions[optionIndex] = value;
      return { options: nextOptions };
    });
  }

  function handleAddQuestionOption(stepId, questionIndex) {
    updateQuestion(stepId, questionIndex, (current) => ({
      options: [...(current.options || []), ""],
    }));
  }

  function handleRemoveQuestionOption(stepId, questionIndex, optionIndex) {
    updateQuestion(stepId, questionIndex, (current) => {
      const nextOptions = (current.options || []).filter((_, idx) => idx !== optionIndex);
      let nextCorrect = current.correctIndex;
      if (nextCorrect === optionIndex) {
        nextCorrect = null;
      } else if (nextCorrect != null && optionIndex < nextCorrect) {
        nextCorrect = nextCorrect - 1;
      }
      return {
        options: nextOptions,
        correctIndex: nextCorrect,
      };
    });
  }

  function handleSetQuestionCorrectOption(stepId, questionIndex, optionIndex) {
    updateQuestion(stepId, questionIndex, { correctIndex: optionIndex });
  }

  function handleAddQuestionHint(stepId, questionIndex) {
    updateQuestion(stepId, questionIndex, (current) => ({
      hints: [...(current.hints || []), ""],
    }));
  }

  function handleQuestionHintChange(stepId, questionIndex, hintIndex, value) {
    updateQuestion(stepId, questionIndex, (current) => {
      const nextHints = [...(current.hints || [])];
      nextHints[hintIndex] = value;
      return { hints: nextHints };
    });
  }

  function handleRemoveQuestionHint(stepId, questionIndex, hintIndex) {
    updateQuestion(stepId, questionIndex, (current) => ({
      hints: (current.hints || []).filter((_, idx) => idx !== hintIndex),
    }));
  }

  function handleToggleQuestionRole(stepId, questionIndex, role) {
    if (!role) return;
    const normalized = normalizeRoleCode(role);
    if (!normalized) return;
    updateQuestion(stepId, questionIndex, (current) => {
      const currentRoles = new Set((current.roles || []).map((item) => normalizeRoleCode(item)).filter(Boolean));
      if (currentRoles.size === 0) {
        questionRoleOptions.forEach((option) => currentRoles.add(option.value));
      }
      if (currentRoles.has(normalized)) {
        currentRoles.delete(normalized);
      } else {
        currentRoles.add(normalized);
      }
      const allSelected = questionRoleOptions.every((option) => currentRoles.has(option.value));
      const nextRoles = allSelected || currentRoles.size === 0 ? [] : Array.from(currentRoles);
      return {
        roles: nextRoles,
      };
    });
  }

  function handleQuestionCriticalToggle(stepId, questionIndex) {
    updateQuestion(stepId, questionIndex, (current) => ({
      isCritical: !current.isCritical,
    }));
  }

  function handleQuestionExplanationChange(stepId, questionIndex, value) {
    updateQuestion(stepId, questionIndex, { explanation: value });
  }

  function handleQuestionCriticalRationaleChange(stepId, questionIndex, value) {
    updateQuestion(stepId, questionIndex, { criticalRationale: value });
  }

  function handleQuestionTimeLimitChange(stepId, questionIndex, value) {
    const sanitized = value.replace(/[^0-9]/g, "");
    const parsed = sanitized ? Number.parseInt(sanitized, 10) : null;
    updateQuestion(stepId, questionIndex, {
      timeLimitInput: sanitized,
      timeLimit: Number.isFinite(parsed) ? parsed : null,
    });
  }

  async function handleSaveQuestion(stepId, questionIndex) {
    console.log("[DEBUG] handleSaveQuestion: Starting save for step", stepId, "question", questionIndex);
    if (!stepId && stepId !== 0) return;
    const stepKey = Number.isFinite(Number(stepId)) ? Number(stepId) : stepId;
    const stepQuestions = questionsByStep?.[stepKey] || [];
    const question = stepQuestions[questionIndex];
    if (!question) return;
    setQuestionsError("");
    setQuestionsSuccess("");

    const localId = question.localId || generateTempQuestionId(stepKey);
    const text = question.text?.trim() || "";
    if (!text) {
      setQuestionsError("La pregunta necesita un enunciado");
      return;
    }
    const rawOptions = Array.isArray(question.options) ? question.options : [];
    if (rawOptions.length < 2) {
      setQuestionsError("Añade al menos dos opciones de respuesta");
      return;
    }
    const sanitizedOptions = rawOptions.map((option) => (option == null ? "" : String(option).trim()));
    if (sanitizedOptions.some((option) => !option)) {
      setQuestionsError("Ninguna opción puede quedar vacía");
      return;
    }
    const correctIndex = question.correctIndex;
    if (correctIndex == null || correctIndex < 0 || correctIndex >= sanitizedOptions.length) {
      setQuestionsError("Selecciona la opción correcta");
      return;
    }
    const rolesList = Array.isArray(question.roles)
      ? question.roles
        .map((role) => normalizeRoleCode(role))
        .filter(Boolean)
      : [];
    const hintsList = Array.isArray(question.hints)
      ? question.hints.map((hint) => (hint == null ? "" : String(hint).trim())).filter(Boolean)
      : [];
    const explanation = question.explanation?.trim() || null;
    const criticalRationale = question.criticalRationale?.trim() || null;
    const timeLimitValue = question.timeLimitInput ? Number.parseInt(question.timeLimitInput, 10) : null;
    if (question.timeLimitInput && (!Number.isFinite(timeLimitValue) || timeLimitValue < 0)) {
      setQuestionsError("El tiempo límite debe ser un número entero positivo");
      return;
    }

    const operationKey = question.id || localId;
    setQuestionOperation(operationKey, "saving");
    try {
      // Get access token once for both update and insert paths
      const authKey = `sb-${import.meta.env.VITE_SUPABASE_URL.split('https://')[1].split('.')[0]}-auth-token`;
      const authData = JSON.parse(localStorage.getItem(authKey) || '{}');
      const accessToken = authData?.access_token;
      console.log("[DEBUG] handleSaveQuestion: Auth key", authKey, "Auth data keys", Object.keys(authData || {}), "Access token present", !!accessToken);
      if (!accessToken) {
        console.error("[DEBUG] handleSaveQuestion: No access token");
        throw new Error("Sesión expirada, por favor recarga la página");
      }

      const payload = {
        question_text: text,
        options: sanitizedOptions,
        correct_option: correctIndex,
        explanation,
        roles: rolesList,
        is_critical: Boolean(question.isCritical),
        hints: hintsList,
        time_limit: Number.isFinite(timeLimitValue) ? timeLimitValue : null,
        critical_rationale: criticalRationale,
      };

      let savedId = question.id;
      let oldQuestion = null;
      if (question.id) {
        // Fetch existing persisted row to compute diff
        const { data: existingQ, error: existingQErr } = await supabase
          .from("questions")
          .select("id,question_text,options,correct_option,explanation,roles,is_critical,hints,time_limit,critical_rationale")
          .eq("id", question.id)
          .maybeSingle();
        if (!existingQErr) oldQuestion = existingQ;
        // Use returning select to obtain the updated row and detect if update actually persisted
        // Direct fetch update
        console.log("[DEBUG] handleSaveQuestion: About to update question", question.id, "payload", payload);
        const updateResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/questions?id=eq.${question.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(payload),
        });
        console.log("[DEBUG] handleSaveQuestion: Update response status", updateResponse.status);
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error("[DEBUG] handleSaveQuestion: Update failed", errorText);
          throw new Error(`Update question failed: ${updateResponse.status} ${errorText}`);
        }
        // Since return=representation may not work, fetch the updated row
        const fetchResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/questions?id=eq.${question.id}&select=*`, {
          method: 'GET',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        console.log("[DEBUG] handleSaveQuestion: Fetch response status", fetchResponse.status);
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error("[DEBUG] handleSaveQuestion: Fetch failed", errorText);
          throw new Error(`Fetch question failed: ${fetchResponse.status} ${errorText}`);
        }
        const fetchedData = await fetchResponse.json();
        console.log("[DEBUG] handleSaveQuestion: Fetched data", fetchedData);
        let updatedRowObj = null;
        if (Array.isArray(fetchedData) && fetchedData.length > 0) {
          updatedRowObj = fetchedData[0];
          savedId = updatedRowObj.id;
        }

      if (question.id && updatedRowObj) {
        console.log("[DEBUG] handleSaveQuestion: Updating local state with updatedRowObj", updatedRowObj);
        setQuestionsByStep((prev) => {
          const stepQuestions = prev?.[stepKey] || [];
          const index = stepQuestions.findIndex((q) => q.id === question.id);
          if (index >= 0) {
            const parseJsonArray = (value) => {
              if (!value) return [];
              if (Array.isArray(value)) return value.filter(Boolean);
              if (typeof value === "string") {
                try {
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed)) return parsed.filter((item) => item !== null && item !== undefined && item !== "");
                  return parsed ? [parsed].filter(Boolean) : [];
                } catch (err) {
                  return [value].filter(Boolean);
                }
              }
              return [];
            };
            const optionsArray = parseJsonArray(updatedRowObj.options).map((item) => {
              if (item == null) return "";
              if (typeof item === "string") return item;
              return String(item);
            });
            const rolesArray = (() => {
              const collected = new Set();
              if (Array.isArray(updatedRowObj.roles)) {
                updatedRowObj.roles.forEach((role) => {
                  const normalized = normalizeRoleCode(role);
                  if (normalized) collected.add(normalized);
                });
              } else if (typeof updatedRowObj.roles === "string" && updatedRowObj.roles.trim()) {
                const normalized = normalizeRoleCode(updatedRowObj.roles);
                if (normalized) collected.add(normalized);
              }
              return Array.from(collected);
            })();
            const hintsArray = parseJsonArray(updatedRowObj.hints).map((item) => {
              if (item == null) return "";
              if (typeof item === "string") return item;
              return String(item);
            });
            const correctIndex = (() => {
              if (typeof updatedRowObj.correct_option === "number") return updatedRowObj.correct_option;
              if (typeof updatedRowObj.correct_option === "string") {
                const parsed = Number.parseInt(updatedRowObj.correct_option, 10);
                if (Number.isFinite(parsed)) return parsed;
              }
              return 0;
            })();
            const updatedQ = {
              ...stepQuestions[index],
              text: updatedRowObj.question_text || "",
              options: optionsArray,
              correctIndex,
              explanation: updatedRowObj.explanation || "",
              roles: rolesArray,
              isCritical: Boolean(updatedRowObj.is_critical),
              hints: hintsArray,
              timeLimit: updatedRowObj.time_limit != null ? Number(updatedRowObj.time_limit) : null,
              timeLimitInput: updatedRowObj.time_limit != null ? String(updatedRowObj.time_limit) : "",

criticalRationale: updatedRowObj.critical_rationale || "",
            };
            console.log("[DEBUG] handleSaveQuestion: Updating local state with correctIndex", correctIndex, "for question", question.id);
            const newStepQuestions = [...stepQuestions];
            newStepQuestions[index] = updatedQ;
            return {
              ...prev,
              [stepKey]: newStepQuestions,
            };
          }
          return prev;
        });
      }
      } else {
        const insertPayload = {
          ...payload,
          step_id: stepKey,
        };
        const insertResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/questions`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(insertPayload),
        });
        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          throw new Error(`Insert question failed: ${insertResponse.status} ${errorText}`);
        }
        const inserted = await insertResponse.json();
        if (Array.isArray(inserted) && inserted.length > 0) {
          savedId = inserted[0].id;
        }
      }

      const meta = { step_id: stepKey, question_id: savedId || question.id || null };
      if (oldQuestion) {
        const diff = computeDiff(oldQuestion, payload);
        meta.diff = diff;
        meta.fields = Object.keys(diff || {});
      } else if (!question.id) {
        meta.new = payload;
      }
      console.log("[DEBUG] handleSaveQuestion: Registering change (non-blocking)");
      await registerChangeNonBlocking(
        "preguntas",
        question.id ? "Actualizó una pregunta" : "Añadió una nueva pregunta",
        meta
      );
      console.log("[DEBUG] handleSaveQuestion: Proceeding after registerChange race");

      await loadQuestionsForStepIds([stepKey]);
      setQuestionsSuccess(question.id ? "Pregunta actualizada" : "Pregunta creada");
    } catch (err) {
      console.error("[Admin_ScenarioEditor] save question", err);
      const errorMessage = (err && typeof err === 'object' && err.message) ? err.message : (typeof err === 'string' ? err : "No se pudo guardar la pregunta");
      setQuestionsError(errorMessage);
    } finally {
      setQuestionOperation(operationKey, null);
    }
  }

  async function handleDeleteQuestion(stepId, questionIndex) {
    if (!stepId && stepId !== 0) return;
    const stepKey = Number.isFinite(Number(stepId)) ? Number(stepId) : stepId;
    const stepQuestions = questionsByStep?.[stepKey] || [];
    const question = stepQuestions[questionIndex];
    if (!question) return;
    setQuestionsError("");
    setQuestionsSuccess("");
    const localId = question.localId || generateTempQuestionId(stepKey);
    const operationKey = question.id || localId;

    if (!question.id) {
      setQuestionsByStep((prev) => {
        const source = prev?.[stepKey] ? [...prev[stepKey]] : [];
        source.splice(questionIndex, 1);
        return {
          ...(prev || {}),
          [stepKey]: source,
        };
      });
      return;
    }

    setQuestionOperation(operationKey, "deleting");
    try {
      const { error } = await supabase.from("questions").delete().eq("id", question.id);
      if (error) throw error;
      console.log("[DEBUG] handleDeleteQuestion: Registering change (non-blocking)");
      await registerChangeNonBlocking("preguntas", "Eliminó una pregunta", {
        step_id: stepKey,
        question_id: question.id,
        before: { id: question.id, text: question.text, options: question.options },
      });
      console.log("[DEBUG] handleDeleteQuestion: Proceeding after registerChange race");
      await loadQuestionsForStepIds([stepKey]);
      setQuestionsSuccess("Pregunta eliminada");
    } catch (err) {
      console.error("[Admin_ScenarioEditor] delete question", err);
      setQuestionsError(err?.message || "No se pudo eliminar la pregunta");
    } finally {
      setQuestionOperation(operationKey, null);
    }
  }

  async function handleSaveSteps() {
    if (!scenarioNumericId) return;
    setStepsError("");
    setStepsSuccess("");
    const sanitized = steps.map((step, idx) => ({
      ...step,
      description: step?.description ? step.description.trim() : "",
      step_order: idx + 1,
      role_specific: Boolean(step?.role_specific),
      roles: Array.isArray(step?.roles)
        ? step.roles.filter(Boolean).map((role) => String(role).toLowerCase())
        : [],
      narrative: step?.narrative ? step.narrative.trim() : "",
    }));
    if (sanitized.length === 0) {
      setStepsError("Añade al menos un paso para el escenario");
      return;
    }
    if (sanitized.some((step) => !step.description)) {
      setStepsError("Cada paso necesita un título");
      return;
    }
    setStepsSaving(true);
    try {
      const response = await fetch("/api/admin?action=sync_scenario_steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: scenarioNumericId,
          steps: sanitized,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) {
        const base = payload?.error || payload?.message || "No se pudieron actualizar los pasos";
        const message = payload?.details ? `${base}. Detalle: ${payload.details}` : base;
        throw new Error(message);
      }

      const normalized = Array.isArray(payload?.steps)
        ? payload.steps.map((row, index) => ({
            id: row.id,
            step_order: row.step_order ?? index + 1,
            description: row.description || "",
            role_specific: Boolean(row.role_specific),
            roles: Array.isArray(row.roles)
              ? row.roles.filter(Boolean).map((role) => String(role).toLowerCase())
              : [],
            narrative: row.narrative || "",
          }))
        : [];

      const oldSteps = initialSteps || [];
      const deletedSteps = oldSteps.filter((s) => s.id && !normalized.some((n) => n.id === s.id)).map(s => ({ id: s.id, description: s.description }));
      const insertedSteps = normalized.filter((s) => !s.id).map(s => ({ description: s.description, step_order: s.step_order }));
      const updatedSteps = normalized
        .filter((s) => s.id)
        .map((s) => {
          const before = oldSteps.find((o) => o.id === s.id);
          const diff = before ? computeDiff(before, s) : {};
          return Object.keys(diff).length > 0 ? { id: s.id, diff } : null;
        })
        .filter(Boolean);
      setSteps(normalized);
      setInitialSteps(normalized);
      await loadQuestionsForStepIds(normalized.map((row) => row.id).filter(Boolean));
      console.log("[DEBUG] handleSaveSteps: Registering change (non-blocking)");
      await registerChangeNonBlocking("pasos", "Actualizó la secuencia de pasos del escenario", {
        total_steps: normalized.length,
        inserted: insertedSteps,
        deleted: deletedSteps,
        updated: updatedSteps,
      });
      console.log("[DEBUG] handleSaveSteps: Proceeding after registerChange race");
      setStepsSuccess("Pasos actualizados");
    } catch (err) {
      console.error("[Admin_ScenarioEditor] steps", err);
      setStepsError(err?.message || "No se pudieron actualizar los pasos");
    } finally {
      setStepsSaving(false);
    }
  }

  async function handleSave() {
    if (!form) return;
    setError("");
    setSuccess("");
    if (!form.title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    if (!form.mode || form.mode.length === 0) {
      setError("Selecciona al menos un modo");
      return;
    }
    setSaving(true);
    try {
      const oldScenarioState = scenario ? { title: scenario.title, summary: scenario.summary, status: scenario.status, mode: scenario.mode, level: scenario.level, estimated_minutes: scenario.estimated_minutes, max_attempts: scenario.max_attempts } : {};
      const estimated = Number.parseInt(form.estimated_minutes, 10);
      const attempts = Number.parseInt(form.max_attempts, 10);
      // time_limit_minutes no longer used; use estimated_minutes only
      // const tl = Number.parseInt(form.time_limit_minutes, 10);
      const levelValue = normalizeLevelValue(form.level || "basico");
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        status: form.status || null,
        mode: serializeModeSelection(form.mode),
        level: levelValue || null,
        estimated_minutes: Number.isFinite(estimated) ? estimated : 10,
        max_attempts: Number.isFinite(attempts) ? attempts : 3,
        // time_limit_minutes: Number.isFinite(tl) ? tl : null,
      };
      // If saving as published and scenario includes online, require brief triangle and alarm signs
      if (Array.isArray(payload.mode) && payload.mode.includes('online') && (payload.status === 'Publicado' || payload.status === 'Disponible')) {
        const tri = briefForm?.triangle || {};
        const hasTri = tri.appearance && tri.breathing && tri.circulation;
        const hasAlarm = (briefForm?.redFlags && briefForm.redFlags.length > 0) || (briefForm?.criticalActions && briefForm.criticalActions.length > 0);
        if (!hasTri || !hasAlarm) {
          setError('No se puede publicar el escenario online: completa el Triángulo (Apariencia/Respiración/Circulación) y al menos un signo de alarma / acciones críticas en el Brief.');
          setSaving(false);
          return;
        }
      }
      const attemptUpdate = async (pl) => {
        return await supabase
          .from("scenarios")
          .update(pl)
          .eq("id", scenarioId)
          .select()
          .maybeSingle();
      };
      let { data, error: updateErr } = await attemptUpdate(payload);
      if (updateErr && String(updateErr.message).includes("scenarios_status_check")) {
        // Fallback si constraint aún no permite el status elegido
        if (payload.status && !["Disponible","En construcción: en proceso","En construcción: sin iniciar"].includes(payload.status)) {
          const fallbackPayload = { ...payload, status: "En construcción: en proceso" };
          ({ data, error: updateErr } = await attemptUpdate(fallbackPayload));
          if (!updateErr) {
            payload.status = fallbackPayload.status;
          }
        }
      }
      // If the DB lacks the new column, retry update without `time_limit_minutes`.
      if (updateErr && (String(updateErr.message).toLowerCase().includes("time_limit_minutes") || String(updateErr.message).toLowerCase().includes("column"))) {
        // No fallback needed since we don't send time_limit_minutes anymore
        const payloadNoTL = { ...payload };
        delete payloadNoTL.time_limit_minutes; // no-op if not present
        ({ data, error: updateErr } = await attemptUpdate(payloadNoTL));
      }
      if (updateErr) throw updateErr;
      if (data) {
        const nextScenario = { ...data, level: normalizeLevelValue(data.level) };
        setScenario(nextScenario);
        setForm((prev) => (prev ? { ...prev, level: nextScenario.level, status: nextScenario.status, title: nextScenario.title } : prev));
      }
      const diff = computeDiff(oldScenarioState, payload);
      console.log("[DEBUG] handleSaveScenario: Registering change (non-blocking)");
      await registerChangeNonBlocking("metadata", "Actualizó la información general del escenario", {
        diff,
        fields: Object.keys(diff || {}),
      });
      console.log("[DEBUG] handleSaveScenario: Proceeding after registerChange race");
      setSuccess("Escenario actualizado correctamente");
    } catch (err) {
      console.error("[Admin_ScenarioEditor] save", err);
      setError(err?.message || "No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto flex h-[60vh] max-w-4xl items-center justify-center px-4">
          <Spinner centered />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-12">
          <AdminNav />
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Volver
          </button>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-rose-700">
            {error || "No se encontró el escenario solicitado."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 pb-14 pt-6 space-y-6">
        <AdminNav />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Volver a la lista
        </button>

        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Editor de escenario</p>
              <h1 className="text-2xl font-semibold text-slate-900">{form.title || "Escenario sin título"}</h1>
              <p className="text-sm text-slate-500">ID {scenario?.id} · creado {scenario?.created_at ? new Date(scenario.created_at).toLocaleString() : "—"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setSaving(true);
                  supabase
                    .from("scenarios")
                    .select("id,title,summary,status,mode,level,difficulty,estimated_minutes,max_attempts,created_at")
                    .eq("id", scenarioId)
                    .maybeSingle()
                    .then(({ data, error: fetchErr }) => {
                      if (fetchErr) throw fetchErr;
                      if (data) {
                        setScenario(data);
                        setForm({
                          title: data.title || "",
                          summary: data.summary || "",
                          status: data.status || "Disponible",
                          mode: normalizeMode(data.mode),
                          level: data.level ? String(data.level).trim().toLowerCase() : "basico",
                          estimated_minutes: data.estimated_minutes ?? 10,
                          max_attempts: data.max_attempts ?? 3,
                        });
                      }
                    })
                    .catch((err) => {
                      console.error("[Admin_ScenarioEditor] refresh", err);
                      setError(err?.message || "No se pudo recargar el escenario");
                    })
                    .finally(() => setSaving(false));
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                disabled={saving}
              >
                <ArrowPathIcon className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} /> Recargar
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteError("");
                  setDeleteInput("");
                  setShowDeleteModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
              >
                Eliminar escenario
              </button>
            </div>
          </div>
          {success ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircleIcon className="h-4 w-4" /> {success}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <ExclamationCircleIcon className="h-4 w-4" /> {error}
            </div>
          ) : null}
        </header>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Información general</h2>
                <p className="text-sm text-slate-600">Datos básicos y estado del escenario.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection("metadata")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsedSections.metadata ? "-rotate-90" : "rotate-0"}`} />
                  <span className="sr-only">{collapsedSections.metadata ? "Expandir sección" : "Contraer sección"}</span>
                </button>
              </div>
            </div>
            {success ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircleIcon className="h-4 w-4" /> {success}
              </div>
            ) : null}
            {error ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <ExclamationCircleIcon className="h-4 w-4" /> {error}
              </div>
            ) : null}
            {!collapsedSections.metadata ? (
              <div className="mt-4 grid gap-4">
                <label className="block text-sm text-slate-600">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Título</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => handleFieldChange("title", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Título del escenario"
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Resumen / briefing</span>
                  <textarea
                    rows={4}
                    value={form.summary}
                    onChange={(event) => handleFieldChange("summary", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Descripción corta que verán los alumnos"
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Estado</span>
                    <select
                      value={form.status}
                      onChange={(event) => handleFieldChange("status", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Nivel</span>
                    <select
                      value={form.level || ""}
                      onChange={(event) => handleFieldChange("level", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      {levelOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Modo</p>
                  <div className="flex flex-wrap gap-3">
                    {modeOptions.map((option) => {
                      const checked = form.mode?.includes(option.value);
                      return (
                        <label key={option.value} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMode(option.value)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>


          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Categorías</h2>
                <p className="text-sm text-slate-600">Activa o desactiva las categorías disponibles.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCategories}
                  disabled={categorySaving}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {categorySaving ? "Guardando…" : "Guardar categorías"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection("taxonomy")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsedSections.taxonomy ? "-rotate-90" : "rotate-0"}`} />
                  <span className="sr-only">{collapsedSections.taxonomy ? "Expandir sección" : "Contraer sección"}</span>
                </button>
              </div>
            </div>
            {!collapsedSections.taxonomy ? (
              <>
                {categoryError ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{categoryError}</div>
                ) : null}
                {categorySuccess ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{categorySuccess}</div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {allCategories.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay categorías configuradas todavía.</p>
                  ) : (
                    allCategories.map((category) => {
                      const active = selectedCategories.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => toggleCategorySelection(category.id)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            active
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {category.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Parámetros de intento: mover justo después de Categorías */}
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Parámetros de intento</h2>
                <p className="text-sm text-slate-600">Configura límites básicos para el escenario.</p>
              </div>
              <button
                type="button"
                onClick={() => toggleSection("attempts")}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsedSections.attempts ? "-rotate-90" : "rotate-0"}`} />
                <span className="sr-only">{collapsedSections.attempts ? "Expandir sección" : "Contraer sección"}</span>
              </button>
            </div>
            {!collapsedSections.attempts ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Duración del intento (minutos)</span>
                  <input
                    type="number"
                    min="1"
                    value={form.estimated_minutes}
                    onChange={(event) => handleFieldChange("estimated_minutes", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">Limita el temporizador global del intento.</span>
                </label>
                {/* time_limit_minutes deprecated: field removed */}
                <label className="block text-sm text-slate-600">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Intentos máximos</span>
                  <input
                    type="number"
                    min="1"
                    value={form.max_attempts}
                    onChange={(event) => handleFieldChange("max_attempts", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Objetivos de aprendizaje</h2>
                <p className="text-sm text-slate-600">Define el objetivo general, metas por rol y acciones críticas.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveBrief}
                  disabled={briefSaving}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {briefSaving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection("objectives")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsedSections.objectives ? "-rotate-90" : "rotate-0"}`} />
                  <span className="sr-only">{collapsedSections.objectives ? "Expandir sección" : "Contraer sección"}</span>
                </button>
              </div>
            </div>
            {!collapsedSections.objectives ? (
              <>
                {briefError ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{briefError}</div>
                ) : null}
                {briefSuccess ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{briefSuccess}</div>
                ) : null}
                <div className="mt-4 space-y-4">
                  <label className="block text-sm text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Objetivo general</span>
                    <textarea
                      rows={3}
                      value={briefForm.learningObjective}
                      onChange={(event) => handleBriefLearningObjectiveChange(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="Describe el objetivo principal del escenario"
                    />
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-700">Objetivos por rol</p>
                      <p className="text-xs text-slate-500 mt-1">Roles disponibles: Médico, Enfermería, Farmacia</p>
                    </div>
                    <div className="mt-4 space-y-4">
                      {briefRoles.map((role) => (
                        <div key={role} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">{roleDisplay[role] || role}</span>
                            {role !== "MED" && role !== "NUR" && role !== "PHARM" ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveRole(role)}
                                className="text-xs text-rose-500 hover:text-rose-600"
                              >
                                Quitar
                              </button>
                            ) : null}
                          </div>
                          <textarea
                            rows={3}
                            value={briefForm.objectivesByRole?.[role] || ""}
                            onChange={(event) =>
                              setBriefForm((prev) => ({
                                ...prev,
                                objectivesByRole: {
                                  ...prev.objectivesByRole,
                                  [role]: event.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                            placeholder={`Objetivo específico para ${roleDisplay[role] || role}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Acciones críticas del caso</span>
                      <button
                        type="button"
                        onClick={() => setBriefForm(prev => ({ ...prev, criticalActions: [...(prev.criticalActions || []), ''] }))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        + Añadir acción
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Se mostrarán en el resumen final tras completar las preguntas. Son conceptos clave que no se pueden pasar por alto y que el alumno debe aprender del caso.
                    </p>
                    <div className="space-y-2">
                      {(briefForm.criticalActions || []).length === 0 ? (
                        <p className="text-sm text-slate-500 italic py-2">No hay acciones críticas. Haz clic en "+ Añadir acción" para crear una.</p>
                      ) : (
                        (briefForm.criticalActions || []).map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <input
                              type="text"
                              value={action}
                              onChange={(e) => {
                                const updated = [...(briefForm.criticalActions || [])];
                                updated[idx] = e.target.value;
                                setBriefForm(prev => ({ ...prev, criticalActions: updated }));
                              }}
                              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                              placeholder="Ej: Administrar adrenalina IM 0.01 mg/kg inmediatamente"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (briefForm.criticalActions || []).filter((_, i) => i !== idx);
                                setBriefForm(prev => ({ ...prev, criticalActions: updated }));
                              }}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 hover:bg-rose-100"
                            >
                              Eliminar
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Competencias del escenario</span>
                      <div className="flex items-center gap-2">
                        <select
                          onChange={(e) => {
                            const key = e.target.value;
                            if (!key) return;
                            const found = COMPETENCY_CATALOG.find((c) => c.key === key);
                            if (!found) return;
                            setBriefForm((prev) => ({
                              ...prev,
                              competencies: [
                                ...(prev.competencies || []),
                                { key: found.key, label: found.label, expected: "Competente" },
                              ],
                            }));
                            e.target.value = "";
                          }}
                          defaultValue=""
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
                        >
                          <option value="">+ Añadir desde catálogo…</option>
                          {COMPETENCY_CATALOG.map((c) => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setBriefForm((prev) => ({
                            ...prev,
                            competencies: [...(prev.competencies || []), { label: "", expected: "Emergente" }],
                          }))}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          + Añadir personalizada
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Selecciona 3–6 competencias clave que evalúa este caso y define el nivel esperado.
                    </p>
                    <div className="space-y-3">
                      {(briefForm.competencies || []).length === 0 ? (
                        <p className="text-sm text-slate-500 italic py-2">No hay competencias añadidas.</p>
                      ) : (
                        (briefForm.competencies || []).map((c, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-200 p-3 flex flex-col gap-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <input
                                type="text"
                                value={c.label || ""}
                                onChange={(e) => {
                                  const updated = [...(briefForm.competencies || [])];
                                  updated[idx] = { ...(updated[idx] || {}), label: e.target.value };
                                  setBriefForm((prev) => ({ ...prev, competencies: updated }));
                                }}
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                placeholder="Ej: Razonamiento diagnóstico"
                              />
                              <select
                                value={c.expected || "Emergente"}
                                onChange={(e) => {
                                  const updated = [...(briefForm.competencies || [])];
                                  updated[idx] = { ...(updated[idx] || {}), expected: e.target.value };
                                  setBriefForm((prev) => ({ ...prev, competencies: updated }));
                                }}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              >
                                {COMPETENCY_LEVELS.map((lvl) => (
                                  <option key={lvl} value={lvl}>{lvl}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (briefForm.competencies || []).filter((_, i) => i !== idx);
                                  setBriefForm((prev) => ({ ...prev, competencies: updated }));
                                }}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 hover:bg-rose-100"
                              >
                                Eliminar
                              </button>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                              <input
                                type="text"
                                value={c.notes || ""}
                                onChange={(e) => {
                                  const updated = [...(briefForm.competencies || [])];
                                  updated[idx] = { ...(updated[idx] || {}), notes: e.target.value };
                                  setBriefForm((prev) => ({ ...prev, competencies: updated }));
                                }}
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                placeholder="Notas o criterios de evaluación (opcional)"
                              />
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                value={typeof c.weight === 'number' ? c.weight : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                                  const updated = [...(briefForm.competencies || [])];
                                  updated[idx] = { ...(updated[idx] || {}), weight: Number.isFinite(val) ? val : undefined };
                                  setBriefForm((prev) => ({ ...prev, competencies: updated }));
                                }}
                                className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                placeholder="Peso"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {!briefSupportsCompetencies && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                        Nota: estas competencias se guardarán cuando se active la columna en base de datos.
                      </div>
                    )}
                  </div>
                  {/* Duración estimada se gestiona en Parámetros de intento */}
                </div>
              </>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Briefing / Introducción al caso</h2>
                <p className="text-sm text-slate-600">Datos del paciente, contexto clínico y presentación inicial.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveBrief}
                  disabled={briefSaving}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {briefSaving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection("brief")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsedSections.brief ? "-rotate-90" : "rotate-0"}`} />
                  <span className="sr-only">{collapsedSections.brief ? "Expandir sección" : "Contraer sección"}</span>
                </button>
              </div>
            </div>
            {!collapsedSections.brief ? (
              <>
                {briefError ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{briefError}</div>
                ) : null}
                {briefSuccess ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{briefSuccess}</div>
                ) : null}
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm text-slate-600">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Título del briefing</span>
                      <input
                        type="text"
                        value={briefForm.title}
                        onChange={(event) => setBriefForm((prev) => ({ ...prev, title: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        placeholder="Nombre visible en el briefing"
                      />
                    </label>
                    <label className="block text-sm text-slate-600">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Contexto / introducción</span>
                      <textarea
                        rows={3}
                        value={briefForm.context}
                        onChange={(event) => setBriefForm((prev) => ({ ...prev, context: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        placeholder="Resumen corto que aparecera en la cabecera"
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Etiquetas (chips)</span>
                      <button
                        type="button"
                        onClick={() => setBriefForm(prev => ({ ...prev, chips: [...(prev.chips || []), ''] }))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        + Añadir etiqueta
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Palabras clave que resumen el caso. Aparecen como badges en la confirmación y briefing del escenario.
                    </p>
                    <div className="space-y-2">
                      {(briefForm.chips || []).length === 0 ? (
                        <p className="text-sm text-slate-500 italic py-2">No hay etiquetas. Haz clic en "+ Añadir etiqueta" para crear una.</p>
                      ) : (
                        (briefForm.chips || []).map((chip, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <input
                              type="text"
                              value={chip}
                              onChange={(e) => {
                                const updated = [...(briefForm.chips || [])];
                                updated[idx] = e.target.value;
                                setBriefForm(prev => ({ ...prev, chips: updated }));
                              }}
                              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                              placeholder="Ej: Anafilaxia, Shock, Emergencia farmacológica"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (briefForm.chips || []).filter((_, i) => i !== idx);
                                setBriefForm(prev => ({ ...prev, chips: updated }));
                              }}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 hover:bg-rose-100"
                            >
                              Eliminar
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm font-medium text-slate-700">Datos del paciente</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        Edad
                        <input
                          type="text"
                          value={briefForm.demographics.age}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              demographics: {
                                ...prev.demographics,
                                age: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          placeholder="8 años"
                        />
                      </label>
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        Peso (kg)
                        <input
                          type="text"
                          value={briefForm.demographics.weightKg}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              demographics: {
                                ...prev.demographics,
                                weightKg: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          placeholder="26"
                        />
                      </label>
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        Sexo
                        <input
                          type="text"
                          value={briefForm.demographics.sex}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              demographics: {
                                ...prev.demographics,
                                sex: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          placeholder="Femenino"
                        />
                      </label>
                    </div>
                    <label className="mt-3 block text-sm text-slate-600">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Motivo de consulta</span>
                      <textarea
                        rows={2}
                        value={briefForm.chiefComplaint}
                        onChange={(event) => setBriefForm((prev) => ({ ...prev, chiefComplaint: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                        placeholder="Disnea brusca, urticaria generalizada tras antibiotico"
                      />
                    </label>
                  </div>
                  <label className="block text-sm text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Historia clinica / antecedentes</span>
                    <textarea
                      rows={4}
                      value={briefForm.historyRaw}
                      onChange={(event) => setBriefForm((prev) => ({ ...prev, historyRaw: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder={'Antecedentes: Asma leve\nEvento actual: Reaccion tras ceftriaxona'}
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">Formato sugerido: clave: valor. Usa "|" para separar ítems dentro de la misma clave.</span>
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm font-medium text-slate-700">Constantes y observaciones</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-6">
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        FC
                        <input
                          type="text"
                          value={briefForm.vitals.fc}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              vitals: {
                                ...prev.vitals,
                                fc: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          placeholder="156"
                        />
                      </label>
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        FR
                        <input
                          type="text"
                          value={briefForm.vitals.fr}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              vitals: {
                                ...prev.vitals,
                                fr: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          placeholder="34"
                        />
                      </label>
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        SatO2 (%)
                        <input
                          type="text"
                          value={briefForm.vitals.sat}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              vitals: {
                                ...prev.vitals,
                                sat: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          placeholder="86"
                        />
                      </label>
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        Temperatura (ºC)
                        <input
                          type="text"
                          value={briefForm.vitals.temp}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              vitals: {
                                ...prev.vitals,
                                temp: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          placeholder="36.2"
                        />
                      </label>
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        TA sistólica (mmHg)
                        <input
                          type="text"
                          value={briefForm.vitals.taSystolic}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              vitals: {
                                ...prev.vitals,
                                taSystolic: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          placeholder="78"
                        />
                      </label>
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        TA diastólica (mmHg)
                        <input
                          type="text"
                          value={briefForm.vitals.taDiastolic}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              vitals: {
                                ...prev.vitals,
                                taDiastolic: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          placeholder="42"
                        />
                      </label>
                    </div>
                    <label className="mt-3 block text-xs uppercase tracking-wide text-slate-400">
                      Notas
                      <textarea
                        rows={3}
                        value={briefForm.vitals.notesText}
                        onChange={(event) =>
                          setBriefForm((prev) => ({
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              notesText: event.target.value,
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                        placeholder="TA 78/42 mmHg"
                      />
                    </label>
                  </div>
                  <label className="block text-sm text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Exploración física (una línea por hallazgo)</span>
                    <textarea
                      rows={3}
                      value={briefForm.examText}
                      onChange={(event) => setBriefForm((prev) => ({ ...prev, examText: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="Edema facial marcado"
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm text-slate-600">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Analítica rápida (nombre | valor)</span>
                      <textarea
                        rows={3}
                        value={briefForm.quickLabsText}
                        onChange={(event) => setBriefForm((prev) => ({ ...prev, quickLabsText: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        placeholder={'Glucemia capilar | 142 mg/dL\nLactato | 3.8 mmol/L'}
                      />
                    </label>
                    <label className="block text-sm text-slate-600">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Pruebas de imagen / monitorizacion (nombre | estado)</span>
                      <textarea
                        rows={3}
                        value={briefForm.imagingText}
                        onChange={(event) => setBriefForm((prev) => ({ ...prev, imagingText: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        placeholder={'Radiografia de torax | No indicada inmediata\nECG continuo | Monitorizado'}
                      />
                    </label>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm font-medium text-slate-700">Triangulo de evaluacion pediatrica</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        Apariencia
                        <select
                          value={briefForm.triangle.appearance}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              triangle: {
                                ...prev.triangle,
                                appearance: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                        >
                          <option value="">Sin definir</option>
                          <option value="green">Normal</option>
                          <option value="amber">Sospechoso</option>
                          <option value="red">Alterado</option>
                        </select>
                      </label>
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        Respiracion
                        <select
                          value={briefForm.triangle.breathing}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              triangle: {
                                ...prev.triangle,
                                breathing: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                        >
                          <option value="">Sin definir</option>
                          <option value="green">Normal</option>
                          <option value="amber">Sospechoso</option>
                          <option value="red">Alterado</option>
                        </select>
                      </label>
                      <label className="block text-xs uppercase tracking-wide text-slate-400">
                        Circulacion cutanea
                        <select
                          value={briefForm.triangle.circulation}
                          onChange={(event) =>
                            setBriefForm((prev) => ({
                              ...prev,
                              triangle: {
                                ...prev.triangle,
                                circulation: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                        >
                          <option value="">Sin definir</option>
                          <option value="green">Normal</option>
                          <option value="amber">Sospechoso</option>
                          <option value="red">Alterado</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Signos de alarma</span>
                      <button
                        type="button"
                        onClick={() => setBriefForm(prev => ({ ...prev, redFlags: [...(prev.redFlags || []), { text: "", correct: true }] }))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        + Añadir signo
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Los alumnos tendrán que escoger los que procedan. Añade algunos correctos y otros distractores, y marca "Correcto" solo en los que realmente sugieren gravedad.
                    </p>
                    <div className="space-y-2">
                      {(briefForm.redFlags || []).length === 0 ? (
                        <p className="text-sm text-slate-500 italic py-2">No hay signos añadidos. Haz clic en "+ Añadir signo" para crear uno.</p>
                      ) : (
                        (briefForm.redFlags || []).map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                            <input
                              type="text"
                              value={item?.text || ""}
                              onChange={(e) => {
                                const updated = [...(briefForm.redFlags || [])];
                                updated[idx] = { ...(updated[idx] || {}), text: e.target.value };
                                setBriefForm(prev => ({ ...prev, redFlags: updated }));
                              }}
                              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                              placeholder="Ej: Estridor con compromiso de vía aérea"
                            />
                            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                className="accent-[#1E6ACB]"
                                checked={Boolean(item?.correct)}
                                onChange={(e) => {
                                  const updated = [...(briefForm.redFlags || [])];
                                  updated[idx] = { ...(updated[idx] || {}), correct: e.target.checked };
                                  setBriefForm(prev => ({ ...prev, redFlags: updated }));
                                }}
                              />
                              Correcto
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (briefForm.redFlags || []).filter((_, i) => i !== idx);
                                setBriefForm(prev => ({ ...prev, redFlags: updated }));
                              }}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 hover:bg-rose-100"
                            >
                              Eliminar
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Lecturas y recursos movido entre Objetivos y Briefing */}
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Lecturas y recursos</h2>
                <p className="text-sm text-slate-600">Documentación de apoyo visible para el escenario.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addResource}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Añadir recurso
                </button>
                <button
                  type="button"
                  onClick={handleSaveResources}
                  disabled={resourcesSaving}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {resourcesSaving ? "Guardando…" : "Guardar lecturas"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection("resources")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsedSections.resources ? "-rotate-90" : "rotate-0"}`} />
                  <span className="sr-only">{collapsedSections.resources ? "Expandir sección" : "Contraer sección"}</span>
                </button>
              </div>
            </div>
            {!collapsedSections.resources ? (
              <>
                {resourcesError ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{resourcesError}</div>
                ) : null}
                {resourcesSuccess ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{resourcesSuccess}</div>
                ) : null}
                <div className="mt-4 space-y-4">
                  {resources.length === 0 ? (
                    <p className="text-sm text-slate-500">Todavía no hay lecturas añadidas.</p>
                  ) : (
                    resources.map((resource, index) => (
                      <div key={resource.id ?? `temp-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block text-sm text-slate-600">
                            <span className="text-xs uppercase tracking-wide text-slate-400">Título</span>
                            <input
                              type="text"
                              value={resource.title || ""}
                              onChange={(event) => handleResourceChange(index, "title", event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                            />
                          </label>
                          <label className="block text-sm text-slate-600">
                            <span className="text-xs uppercase tracking-wide text-slate-400">URL</span>
                            <input
                              type="url"
                              value={resource.url || ""}
                              onChange={(event) => handleResourceChange(index, "url", event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                              placeholder="https://"
                            />
                          </label>
                          <label className="block text-sm text-slate-600">
                            <span className="text-xs uppercase tracking-wide text-slate-400">Fuente</span>
                            <input
                              type="text"
                              value={resource.source || ""}
                              onChange={(event) => handleResourceChange(index, "source", event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                              placeholder="Organización o autor"
                            />
                          </label>
                          <label className="block text-sm text-slate-600">
                            <span className="text-xs uppercase tracking-wide text-slate-400">Tipo</span>
                            <input
                              type="text"
                              value={resource.type || ""}
                              onChange={(event) => handleResourceChange(index, "type", event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                              placeholder="Artículo, guía, vídeo…"
                            />
                          </label>
                          <label className="block text-sm text-slate-600">
                            <span className="text-xs uppercase tracking-wide text-slate-400">Año</span>
                            <input
                              type="number"
                              value={resource.year || ""}
                              onChange={(event) => handleResourceChange(index, "year", event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                              placeholder="2024"
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={Boolean(resource.free_access)}
                              onChange={(event) => handleResourceChange(index, "free_access", event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                            />
                            Acceso libre
                          </label>
                          <button
                            type="button"
                            onClick={() => removeResource(index)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 hover:bg-rose-100"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Sección de Parámetros movida hacia arriba */}

          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Pasos del escenario</h2>
                <p className="text-sm text-slate-600">Organiza la narrativa cronológica que vivirán los alumnos.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addStep}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Añadir paso
                </button>
                <button
                  type="button"
                  onClick={handleSaveSteps}
                  disabled={stepsSaving}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {stepsSaving ? "Guardando…" : "Guardar pasos"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection("steps")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsedSections.steps ? "-rotate-90" : "rotate-0"}`} />
                  <span className="sr-only">{collapsedSections.steps ? "Expandir sección" : "Contraer sección"}</span>
                </button>
              </div>
            </div>
            {!collapsedSections.steps ? (
              <>
                {stepsError ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{stepsError}</div>
                ) : null}
                {stepsSuccess ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{stepsSuccess}</div>
                ) : null}
                {questionsError ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{questionsError}</div>
                ) : null}
                {questionsSuccess ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{questionsSuccess}</div>
                ) : null}
                {questionsLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <Spinner size={18} label="" />
                    <span>Cargando preguntas…</span>
                  </div>
                ) : null}
                <div className="mt-4 space-y-4">
                  {steps.length === 0 ? (
                    <p className="text-sm text-slate-500">Todavía no hay pasos configurados.</p>
                  ) : (
                    steps.map((step, index) => {
                  const stepId = step.id;
                  const stepQuestions = stepId ? questionsByStep[stepId] || [] : [];
                  return (
                    <div key={stepId ?? `temp-step-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="sm:w-3/4">
                            <p className="text-xs uppercase tracking-wide text-slate-400">Paso {index + 1}</p>
                            <input
                              type="text"
                              value={step.description || ""}
                              onChange={(event) => updateStep(index, "description", event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                              placeholder="Ej. Triaje inicial"
                            />
                          </div>
                          <div className="flex gap-2 sm:w-1/4 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => moveStep(index, -1)}
                              disabled={index === 0}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
                            >
                              Subir
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStep(index, 1)}
                              disabled={index === steps.length - 1}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
                            >
                              Bajar
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStep(index)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 hover:bg-rose-100"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        <label className="block text-sm text-slate-600">
                          <span className="text-xs uppercase tracking-wide text-slate-400">Narrativa / guion</span>
                          <textarea
                            rows={4}
                            value={step.narrative || ""}
                            onChange={(event) => updateStep(index, "narrative", event.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                            placeholder="Describe qué ocurre en este punto del caso"
                          />
                        </label>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(step.role_specific)}
                              onChange={() => toggleStepRoleSpecific(index)}
                              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                            />
                            Objetivos o acciones específicas por rol
                          </label>
                          {step.role_specific ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {stepRoleOptions.map((option) => {
                                const active = step.roles?.includes(option.value);
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      const current = new Set(step.roles || []);
                                      if (current.has(option.value)) {
                                        current.delete(option.value);
                                      } else {
                                        current.add(option.value);
                                      }
                                      updateStep(index, "roles", Array.from(current));
                                    }}
                                    className={`rounded-full border px-3 py-1 text-xs transition ${
                                      active
                                        ? "border-slate-900 bg-slate-900 text-white"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-400">Preguntas vinculadas a este paso</p>
                              <p className="text-xs text-slate-500">Gestiona las decisiones que se mostrarán en este bloque.</p>
                            </div>
                            {stepId ? (
                              <button
                                type="button"
                                onClick={() => handleAddQuestion(stepId)}
                                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                              >
                                Añadir pregunta
                              </button>
                            ) : null}
                          </div>
                          {stepId ? (
                            stepQuestions.length === 0 ? (
                              <p className="mt-3 text-sm text-slate-500">No hay preguntas asociadas. Usa “Añadir pregunta” para crear la primera.</p>
                            ) : (
                              <div className="mt-3 space-y-3">
                                {stepQuestions.map((question, questionIndex) => {
                                  const displayIndex = questionIndex + 1;
                                  const questionKey = question.id || question.localId;
                                  const operation = questionOperationState?.[questionKey];
                                  const isSaving = operation === "saving";
                                  const isDeleting = operation === "deleting";
                                  const optionsList = Array.isArray(question.options) ? question.options : [];
                                  const hintsList = Array.isArray(question.hints) ? question.hints : [];
                                  const isDirty = Boolean(question.dirty);
                                  const selectedRoleLabels = Array.isArray(question.roles) && question.roles.length > 0
                                    ? question.roles
                                        .map((role) => resolveRoleLabel(normalizeRoleCode(role)))
                                        .filter(Boolean)
                                    : [];
                                  const normalizedRoleSet = new Set(
                                    (question.roles || [])
                                      .map((role) => normalizeRoleCode(role))
                                      .filter(Boolean)
                                  );
                                  const allDefaultRolesSelected = normalizedRoleSet.size === 0
                                    || questionRoleOptions.every((option) => normalizedRoleSet.has(option.value));
                                  return (
                                    <div key={questionKey} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900">Pregunta {displayIndex}</p>
                                          {!question.id ? (
                                            <p className="text-xs text-amber-600">Pendiente de guardar</p>
                                          ) : null}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          {isDirty ? (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Sin guardar</span>
                                          ) : null}
                                          {isSaving ? <span className="text-xs text-slate-500">Guardando…</span> : null}
                                          {isDeleting ? <span className="text-xs text-slate-500">Eliminando…</span> : null}
                                        </div>
                                      </div>
                                      {selectedRoleLabels.length === 0 || allDefaultRolesSelected ? (
                                        <p className="mt-2 text-xs text-slate-500">Visible para todos los roles.</p>
                                      ) : (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {selectedRoleLabels.map((label, idx) => (
                                            <span
                                              key={`${questionKey}-role-label-${idx}`}
                                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                                            >
                                              Rol · {label}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      <label className="mt-3 block text-sm text-slate-600">
                                        <span className="text-xs uppercase tracking-wide text-slate-400">Enunciado</span>
                                        <textarea
                                          rows={3}
                                          value={question.text || ""}
                                          onChange={(event) => handleQuestionTextChange(stepId, questionIndex, event.target.value)}
                                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                          placeholder="Redacta la pregunta que verá el alumno"
                                        />
                                      </label>
                                      <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <p className="text-xs uppercase tracking-wide text-slate-400">Opciones de respuesta</p>
                                          <button
                                            type="button"
                                            onClick={() => handleAddQuestionOption(stepId, questionIndex)}
                                            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                                          >
                                            Añadir opción
                                          </button>
                                        </div>
                                        {optionsList.map((option, optionIdx) => {
                                          const optionLabel = `correct-${stepId}-${questionKey}`;
                                          const isCorrect = question.correctIndex === optionIdx;
                                          return (
                                            <div
                                              key={`${questionKey}-option-${optionIdx}`}
                                              className={`rounded-lg border px-3 py-2 text-sm ${
                                                isCorrect ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                                              }`}
                                            >
                                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                <div className="flex w-full items-center gap-2">
                                                  <input
                                                    type="radio"
                                                    name={optionLabel}
                                                    checked={isCorrect}
                                                    onChange={() => handleSetQuestionCorrectOption(stepId, questionIndex, optionIdx)}
                                                    className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-400"
                                                  />
                                                  <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(event) => handleQuestionOptionChange(stepId, questionIndex, optionIdx, event.target.value)}
                                                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
                                                    placeholder={`Opción ${String.fromCharCode(65 + optionIdx)}`}
                                                  />
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveQuestionOption(stepId, questionIndex, optionIdx)}
                                                  disabled={optionsList.length <= 2}
                                                  className="self-start rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
                                                >
                                                  Eliminar
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="mt-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-400">Roles visibles</p>
                                        <p className="text-xs text-slate-500">Selecciona qué roles verán esta pregunta.</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {questionRoleOptions.map((roleOption) => {
                                            const active = normalizedRoleSet.size === 0 || normalizedRoleSet.has(roleOption.value);
                                            return (
                                              <button
                                                key={roleOption.value}
                                                type="button"
                                                onClick={() => handleToggleQuestionRole(stepId, questionIndex, roleOption.value)}
                                                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                                  active
                                                    ? "border-slate-900 bg-slate-900 text-white"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                }`}
                                              >
                                                {roleOption.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <label className="block text-sm text-slate-600">
                                          <span className="text-xs uppercase tracking-wide text-slate-400">Tiempo límite (segundos)</span>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={question.timeLimitInput ?? ""}
                                            onChange={(event) => handleQuestionTimeLimitChange(stepId, questionIndex, event.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                            placeholder="Opcional"
                                          />
                                        </label>
                                        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(question.isCritical)}
                                            onChange={() => handleQuestionCriticalToggle(stepId, questionIndex)}
                                            className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
                                          />
                                          Marca como crítica
                                        </label>
                                      </div>
                                      <label className="mt-3 block text-sm text-slate-600">
                                        <span className="text-xs uppercase tracking-wide text-slate-400">Explicación</span>
                                        <textarea
                                          rows={3}
                                          value={question.explanation || ""}
                                          onChange={(event) => handleQuestionExplanationChange(stepId, questionIndex, event.target.value)}
                                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                          placeholder="Describe la retroalimentación que verá el alumno"
                                        />
                                      </label>
                                      {question.isCritical ? (
                                        <label className="mt-3 block text-sm text-slate-600">
                                          <span className="text-xs uppercase tracking-wide text-slate-400">Razonamiento crítico</span>
                                          <textarea
                                            rows={3}
                                            value={question.criticalRationale || ""}
                                            onChange={(event) => handleQuestionCriticalRationaleChange(stepId, questionIndex, event.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                            placeholder="Explica por qué esta respuesta es crítica para el caso"
                                          />
                                        </label>
                                      ) : null}
                                      <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <p className="text-xs uppercase tracking-wide text-slate-400">Pistas</p>
                                          <button
                                            type="button"
                                            onClick={() => handleAddQuestionHint(stepId, questionIndex)}
                                            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                                          >
                                            Añadir pista
                                          </button>
                                        </div>
                                        {hintsList.length === 0 ? (
                                          <p className="text-xs italic text-slate-500">Sin pistas configuradas.</p>
                                        ) : (
                                          hintsList.map((hint, hintIndex) => (
                                            <div key={`${questionKey}-hint-${hintIndex}`} className="flex items-start gap-2">
                                              <input
                                                type="text"
                                                value={hint}
                                                onChange={(event) => handleQuestionHintChange(stepId, questionIndex, hintIndex, event.target.value)}
                                                className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
                                                placeholder="Texto de la pista"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveQuestionHint(stepId, questionIndex, hintIndex)}
                                                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                                              >
                                                Quitar
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                      <div className="mt-4 flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveQuestion(stepId, questionIndex)}
                                          disabled={isSaving || isDeleting}
                                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
                                        >
                                          {isSaving ? "Guardando…" : question.id ? "Guardar cambios" : "Crear pregunta"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteQuestion(stepId, questionIndex)}
                                          disabled={isSaving || isDeleting}
                                          className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-50"
                                        >
                                          {isDeleting ? "Eliminando…" : question.id ? "Eliminar" : "Descartar"}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          ) : (
                            <p className="mt-3 text-xs italic text-slate-500">Guarda el paso para vincular preguntas existentes.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
                </div>
              </>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Historial de cambios</h2>
                <p className="text-sm text-slate-600">Los últimos movimientos quedan registrados con usuario, fecha y detalle.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchChangeLogs()}
                  disabled={changeLogsLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {changeLogsLoading ? "Actualizando…" : "Actualizar"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection("history")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsedSections.history ? "-rotate-90" : "rotate-0"}`} />
                  <span className="sr-only">{collapsedSections.history ? "Expandir sección" : "Contraer sección"}</span>
                </button>
              </div>
            </div>
            {!collapsedSections.history ? (
              <>
                {changeLogsError ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{changeLogsError}</div>
                ) : null}
                {changeLogsLoading ? (
                  <div className="mt-4 flex justify-center"><Spinner size={24} label="Cargando historial" /></div>
                ) : null}
                <div className="mt-4 space-y-3">
                  {changeLogs.length === 0 ? (
                    <p className="text-sm text-slate-500">Aún no hay registros en el historial.</p>
                  ) : (
                    changeLogs.map((log) => {
                      const createdAt = log?.created_at ? new Date(log.created_at) : null;
                      const createdLabel = createdAt && !Number.isNaN(createdAt.valueOf())
                        ? createdAt.toLocaleString()
                        : "Fecha desconocida";
                      const changeLabel = changeTypeLabels[log?.change_type] || log?.change_type || "Actualización";
                      function renderMeta(meta) {
                        if (!meta) return null;
                        if (meta.diff && typeof meta.diff === 'object' && Object.keys(meta.diff).length > 0) {
                          return (
                            <div className="mt-2">
                              <h5 className="text-xs text-slate-500 mb-1">Cambios</h5>
                              <ul className="text-xs text-slate-700 list-disc pl-5">
                                {Object.entries(meta.diff).map(([k, v]) => {
                                  if (v && v.before !== undefined && v.after !== undefined) {
                                    return <li key={k}>{k}: <span className="font-mono">{String(v.before)}</span> → <span className="font-mono">{String(v.after)}</span></li>;
                                  }
                                  // nested diff
                                  if (v && typeof v === 'object') {
                                    return (
                                      <li key={k}>{k}:
                                        <ul className="list-decimal pl-5">
                                          {Object.entries(v).map(([k2, v2]) => (
                                            <li key={k2}>{k2}: {v2 && v2.before !== undefined ? (<><span className="font-mono">{String(v2.before)}</span> → <span className="font-mono">{String(v2.after)}</span></>) : JSON.stringify(v2)}</li>
                                          ))}
                                        </ul>
                                      </li>
                                    );
                                  }
                                  return <li key={k}>{k}: {String(v)}</li>;
                                })}
                              </ul>
                            </div>
                          );
                        }
                        // general meta object fallback
                        return (
                          <div className="mt-2 text-xs text-slate-700">
                            <pre className="whitespace-pre-wrap text-[11px] bg-slate-50 border border-slate-100 p-2 rounded">{JSON.stringify(meta, null, 2)}</pre>
                          </div>
                        );
                      }

                      return (
                        <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">{log?.user_name || "Sistema"}</span>
                              <span>•</span>
                              <time dateTime={log?.created_at || undefined}>{createdLabel}</time>
                              {changeLabel ? (
                                <>
                                  <span>•</span>
                                  <span>{changeLabel}</span>
                                </>
                              ) : null}
                            </div>
                            {log?.description ? <p className="text-sm text-slate-700">{log.description}</p> : null}
                            {log?.meta ? renderMeta(log.meta) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-100 px-6 py-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Próximos pasos</p>
            <p className="mt-2">
              Desde este panel puedes gestionar metadatos, categorías, objetivos, recursos, pasos y preguntas del escenario online. Los
              próximos lanzamientos se centrarán en plantillas reutilizables, analíticas de desempeño y duplicado rápido de casos. Si
              necesitas priorizar alguna mejora, avísanos.
            </p>
          </div>
        </section>
      </div>
      {showDeleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-300 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-rose-700">Confirmar eliminación</h2>
            <p className="mt-2 text-sm text-slate-600">Esta acción borrará el escenario y su contenido asociado. Escribe <span className="font-semibold text-rose-600">eliminar</span> para continuar.</p>
            {deleteError ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{deleteError}</div>
            ) : null}
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
              placeholder="escribe 'eliminar'"
              autoFocus
            />
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (deletingScenario) return;
                  setShowDeleteModal(false);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                disabled={deletingScenario}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (deleteInput.trim().toLowerCase() !== "eliminar") {
                    setDeleteError("Introduce 'eliminar' para confirmar");
                    return;
                  }
                  setDeleteError("");
                  setDeletingScenario(true);
                  try {
                    const resolvedId = getResolvedScenarioId();
                    if (!resolvedId) throw new Error("ID no válido");
                    const { error: delErr } = await supabase.from("scenarios").delete().eq("id", resolvedId);
                    if (delErr) throw delErr;
                    navigate(-1);
                  } catch (err) {
                    console.error("[Admin_ScenarioEditor] delete scenario", err);
                    setDeleteError(err?.message || "No se pudo eliminar");
                  } finally {
                    setDeletingScenario(false);
                  }
                }}
                disabled={deletingScenario || deleteInput.trim().toLowerCase() !== "eliminar"}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-400 bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deletingScenario ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-rose-600">Acción irreversible. Comprueba que no necesitas conservar intentos o historial.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
