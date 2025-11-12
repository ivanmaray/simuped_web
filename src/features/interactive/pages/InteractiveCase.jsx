import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/Navbar.jsx";
import SimulationStage from "../components/SimulationStage.jsx";
import { formatLevel } from "../../../utils/formatUtils.js";
import {
  findInteractiveCase,
  interactiveCategories,
  getInvestigationTypeLabel
} from "../../../utils/interactiveTrainingData.js";

const stageTabs = [
  { id: "exam", label: "Examen", helper: "Secuencia inicial y hallazgos clave" },
  { id: "stabilize", label: "Estabilizar", helper: "Acciones inmediatas con proposito" },
  { id: "hypotheses", label: "Hipotesis", helper: "Escenarios que debes considerar" }
];

const infoTabs = [
  { id: "investigations", label: "Investigaciones" },
  { id: "interventions", label: "Intervenciones" },
  { id: "evaluation", label: "Evaluacion" },
  { id: "communications", label: "Comunicacion" },
  { id: "handoff", label: "Traspaso" }
];

const LEVEL_TONE = {
  basico: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medio: "border-amber-200 bg-amber-50 text-amber-700",
  intermedio: "border-amber-200 bg-amber-50 text-amber-700",
  avanzado: "border-rose-200 bg-rose-50 text-rose-700",
  experto: "border-purple-200 bg-purple-50 text-purple-700",
};

const VITAL_LABELS = {
  temperatura: "Temperatura",
  frecuenciaCardiaca: "Frecuencia cardiaca",
  presionArterial: "Presion arterial",
  frecuenciaRespiratoria: "Frecuencia respiratoria",
  saturacion: "Saturacion"
};

function formatVitalLabel(key) {
  if (VITAL_LABELS[key]) return VITAL_LABELS[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function Badge({ tone, children }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      {children}
    </span>
  );
}

function ListCard({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {title ? <h4 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">{title}</h4> : null}
      <ul className="space-y-2 text-sm text-slate-600">
        {items.map((item, idx) => (
          <li key={`${title || "item"}-${idx}`} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0A3D91]"></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function StatPill({ label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
      {label}
    </span>
  );
}

function InvestigationCard({ data, isActive, onToggle }) {
  return (
    <article
      className={`rounded-3xl border bg-white p-5 shadow-sm transition ${
        isActive ? "border-[#0A3D91] ring-2 ring-[#0A3D91]/20" : "border-slate-200"
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            {getInvestigationTypeLabel(data.type)}
          </p>
          <h4 className="text-base font-semibold text-slate-900">{data.label}</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {typeof data.time === "number" ? <StatPill label={`Tiempo ${data.time} min`} /> : null}
          {typeof data.cost === "number" ? <StatPill label={`Nivel ${data.cost}`} /> : null}
          <StatPill label={isActive ? "Solicitado" : "Pendiente"} />
        </div>
      </header>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">{data.description}</p>

      {isActive ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-[#0A3D91]/20 bg-[#0A3D91]/5 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0A3D91]">Resumen</p>
            <p className="mt-1 text-sm text-slate-700">{data.result.summary}</p>
          </div>
          {data.result.highlights?.length ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0A3D91]">Destacados</p>
              <ul className="space-y-1 text-sm text-slate-700">
                {data.result.highlights.map((highlight, idx) => (
                  <li key={`${data.id}-highlight-${idx}`} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#0A3D91]" aria-hidden="true"></span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.result?.interpretation ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0A3D91]">Interpretacion</p>
              <p className="mt-1 text-sm text-slate-700">{data.result.interpretation}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
            isActive
              ? "bg-slate-900 text-white hover:bg-slate-700"
              : "bg-[#0A3D91] text-white hover:bg-[#0A3D91]/90"
          }`}
        >
          {isActive ? "Marcar como pendiente" : "Solicitar estudio"}
        </button>
        {data.isCritical ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Critico
          </span>
        ) : null}
      </div>
    </article>
  );
}

function InterventionCard({ data, isActive, onToggle }) {
  return (
    <article
      className={`rounded-3xl border bg-white p-5 shadow-sm transition ${
        isActive ? "border-emerald-300 ring-2 ring-emerald-200" : "border-slate-200"
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-slate-900">{data.label}</h4>
          {isActive ? (
            <p className="text-sm text-slate-600 leading-relaxed">{data.rationale}</p>
          ) : (
            <p className="text-xs text-slate-400">Decide si necesitas esta intervencion antes de ver los detalles.</p>
          )}
        </div>
        <StatPill label={isActive ? "Ejecutada" : "Pendiente"} />
      </header>
      {isActive && data.steps?.length ? (
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {data.steps.map((step, idx) => (
            <li key={`${data.id}-step-${idx}`} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        className={`mt-5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
          isActive ? "bg-slate-900 text-white hover:bg-slate-700" : "bg-emerald-500 text-white hover:bg-emerald-600"
        }`}
      >
        {isActive ? "Marcar como pendiente" : "Aplicar esta intervencion"}
      </button>
    </article>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-600">
      {message}
    </div>
  );
}

export default function InteractiveCase() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = useState(null);
  const [activeInfoTab, setActiveInfoTab] = useState(null);
  const [investigationState, setInvestigationState] = useState({});
  const [interventionState, setInterventionState] = useState({});
  const [examState, setExamState] = useState({});
  const [stabilizationState, setStabilizationState] = useState({});
  const [hypothesisState, setHypothesisState] = useState({});
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [evaluationTriggered, setEvaluationTriggered] = useState(false);

  const scenario = useMemo(() => findInteractiveCase(caseId), [caseId]);
  const levelKey = scenario?.level ? String(scenario.level).trim().toLowerCase() : null;
  const levelLabel = levelKey ? formatLevel(levelKey) : "";
  const levelTone = levelKey ? LEVEL_TONE[levelKey] || "border-slate-200 bg-slate-100 text-slate-600" : "border-slate-200 bg-slate-100 text-slate-600";

  const examSteps = scenario?.exam?.steps || [];
  const stabilizationPlan = scenario?.stabilization || [];
  const hypotheses = scenario?.hypotheses || [];
  const investigations = scenario?.investigations || [];
  const interventions = scenario?.interventions || [];
  const communications = scenario?.communications || [];
  const handoffNotes = scenario?.handoffNotes || [];

  const sceneConfig = scenario?.scene || {};
  const hasCustomModel = Boolean(sceneConfig.modelPath);
  const sceneCaption = sceneConfig.caption || "Sala de simulacion";
  const sceneDescription =
    sceneConfig.description ||
    "Este espacio mostrara la escena en 3D o una representacion multimedia del paciente. Mientras tanto puedes centrarte en el flujo clinico.";

  const investigationMap = useMemo(() => {
    const map = new Map();
    investigations.forEach((inv) => map.set(inv.id, inv.label));
    return map;
  }, [investigations]);

  const interventionMap = useMemo(() => {
    const map = new Map();
    interventions.forEach((item) => map.set(item.id, item.label));
    return map;
  }, [interventions]);

  const activeInvestigations = useMemo(() => {
    return investigations.filter((inv) => investigationState[inv.id]);
  }, [investigations, investigationState]);

  const activeInterventions = useMemo(() => {
    return interventions.filter((item) => interventionState[item.id]);
  }, [interventions, interventionState]);

  const activeHypotheses = useMemo(() => {
    return hypotheses.filter((item) => hypothesisState[item.id]);
  }, [hypotheses, hypothesisState]);

  const timeBudget = useMemo(() => {
    return activeInvestigations.reduce((acc, inv) => acc + (inv.time || 0), 0);
  }, [activeInvestigations]);

  const complexityScore = useMemo(() => {
    return activeInvestigations.reduce((acc, inv) => acc + (inv.cost || 0), 0);
  }, [activeInvestigations]);

  const evaluationStatus = useMemo(() => {
    if (!scenario?.evaluation) return null;

    const { evaluation } = scenario;

    const missingMandatoryInvestigations = (evaluation.mandatoryInvestigations || []).filter(
      (id) => !investigationState[id]
    );

    const pendingRecommendedInvestigations = (evaluation.recommendedInvestigations || []).filter(
      (id) => !investigationState[id]
    );

    const missingCriticalInterventions = (evaluation.criticalInterventions || []).filter(
      (id) => !interventionState[id]
    );

    const avoidTriggered = (evaluation.avoidInterventions || []).filter((id) => interventionState[id]);

    const diagnosisOption = evaluation.diagnosisOptions?.find((option) => option.id === selectedDiagnosis);

    const isDiagnosisCorrect = diagnosisOption ? Boolean(diagnosisOption.correct) : false;

    return {
      missingMandatoryInvestigations,
      pendingRecommendedInvestigations,
      missingCriticalInterventions,
      avoidTriggered,
      isDiagnosisCorrect,
      diagnosisOption,
      summaryTips: evaluation.summaryTips || []
    };
  }, [scenario, investigationState, interventionState, selectedDiagnosis]);

  const categoryLabels = useMemo(() => {
    if (!scenario) return [];
    return scenario.categoryIds
      .map((id) => interactiveCategories.find((cat) => cat.id === id))
      .filter(Boolean)
      .map((cat) => cat.label);
  }, [scenario]);

  const toggleInvestigation = (id) => {
    setInvestigationState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleIntervention = (id) => {
    setInterventionState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExamStep = (id) => {
    setExamState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStabilization = (id) => {
    setStabilizationState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleHypothesis = (id) => {
    setHypothesisState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEvaluate = () => {
    setEvaluationTriggered(true);
  };

  if (!scenario) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar variant="private" />
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 px-5 py-24 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Entrenamiento interactivo</p>
          <h1 className="text-2xl font-semibold text-slate-900">Caso no encontrado</h1>
          <p className="text-sm text-slate-600">Verifica el enlace o regresa a la biblioteca para elegir otro escenario.</p>
          <Link
            to="/entrenamiento-interactivo"
            className="rounded-full bg-[#0A3D91] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#0A3D91]/90"
          >
            Volver a la biblioteca
          </Link>
        </div>
      </div>
    );
  }

  if (scenario.status === "locked") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar variant="private" />
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 px-5 py-24 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Entrenamiento interactivo</p>
          <h1 className="text-2xl font-semibold text-slate-900">Contenido para suscriptores</h1>
          <p className="text-sm text-slate-600">
            Este escenario forma parte de la coleccion premium. Actualiza tu acceso o elige un caso libre.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Volver
            </button>
            <Link
              to="/entrenamiento-interactivo"
              className="rounded-full bg-[#0A3D91] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#0A3D91]/90"
            >
              Ver biblioteca
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="private" />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <nav className="inline-flex items-center gap-2 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Volver
              </button>
              <span>/</span>
              <span>Entrenamiento interactivo</span>
            </nav>
            <h1 className="text-3xl font-semibold text-slate-900">{scenario.title}</h1>
            <p className="max-w-2xl text-sm text-slate-600">{scenario.summary}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="border-emerald-200 bg-emerald-50 text-emerald-700">Disponible</Badge>
              {scenario.duration ? (
                <Badge tone="border-slate-200 bg-slate-100 text-slate-600">{scenario.duration}</Badge>
              ) : null}
              {levelLabel ? (
                <Badge tone={levelTone}>Nivel {levelLabel}</Badge>
              ) : null}
              {categoryLabels.map((label) => (
                <Badge key={label} tone="border-slate-200 bg-slate-100 text-slate-600">{label}</Badge>
              ))}
            </div>
            {scenario.tags?.length ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                {scenario.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100 px-6 py-4 text-sm text-slate-700">
            <p className="font-semibold uppercase tracking-[0.35em] text-slate-500">Paciente</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{scenario.patient.name}</p>
            <p className="text-sm text-slate-600">
              {scenario.patient.age} anos · {scenario.patient.sex}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-500">Llegada</p>
            <p className="text-sm text-slate-700 leading-relaxed">{scenario.patient.arrivalMode}</p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr_1fr]">
          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Paciente</p>
              <button
                type="button"
                onClick={() => setActiveInfoTab((prev) => (prev === "patient" ? null : "patient"))}
                className={`mt-3 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  activeInfoTab === "patient" ? "border-[#0A3D91] text-[#0A3D91]" : "border-slate-200 text-slate-700 hover:text-[#0A3D91]"
                }`}
              >
                Datos del paciente
                <svg
                  className={`h-4 w-4 transition-transform ${activeInfoTab === "patient" ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {activeInfoTab === "patient" ? (
                <div className="mt-3 space-y-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Contexto</h3>
                    <p className="mt-2 leading-relaxed">{scenario.patient.narrative}</p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Signos vitales</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {Object.entries(scenario.patient.vitals || {}).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <p className="text-xs font-semibold text-slate-500">{formatVitalLabel(key)}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Etapas del caso</p>
              <div className="mt-4 space-y-3">
                {stageTabs.map((tab) => {
                  const isOpen = activeStage === tab.id;
                  return (
                    <article key={tab.id} className="rounded-2xl border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setActiveStage((prev) => (prev === tab.id ? null : tab.id))}
                        className={`flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                          isOpen ? "text-[#0A3D91]" : "text-slate-700 hover:text-[#0A3D91]"
                        }`}
                      >
                        <span>
                          {tab.label}
                          <span className="block text-xs font-normal text-slate-500">{tab.helper}</span>
                        </span>
                        <svg
                          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {isOpen ? (
                        <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                          {tab.id === "exam" ? (
                            examSteps.length ? (
                              <div className="space-y-3">
                                {examSteps.map((step, index) => {
                                  const stepId = step.id || `exam-${index}`;
                                  const isSelected = Boolean(examState[stepId]);
                                  return (
                                  <div
                                    key={stepId}
                                    className={`rounded-xl border bg-white p-3 shadow-sm transition ${
                                      isSelected ? "border-[#0A3D91] ring-2 ring-[#0A3D91]/20" : "border-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{step.label}</h4>
                                        {isSelected ? (
                                          <p className="mt-1 text-sm text-slate-600">{step.notes}</p>
                                        ) : (
                                          <p className="mt-1 text-xs text-slate-400">Selecciona el paso para ver los hallazgos.</p>
                                        )}
                                      </div>
                                      <div className="flex flex-col items-end gap-2">
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                                          Paso {index + 1}
                                        </span>
                                        <span
                                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                            isSelected
                                              ? "bg-emerald-100 text-emerald-700"
                                              : "bg-slate-100 text-slate-500"
                                          }`}
                                        >
                                          {isSelected ? "Seleccionado" : "Pendiente"}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleExamStep(stepId)}
                                      className={`mt-3 w-full rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                                        isSelected
                                          ? "bg-slate-900 text-white hover:bg-slate-700"
                                          : "bg-[#0A3D91] text-white hover:bg-[#0A3D91]/90"
                                      }`}
                                    >
                                      {isSelected ? "Ocultar hallazgos" : "Examinar este paso"}
                                    </button>
                                  </div>
                                );})}
                              </div>
                            ) : (
                              <EmptyState message="Agrega los pasos de examen cuando cargues casos reales." />
                            )
                          ) : null}

                          {tab.id === "stabilize" ? (
                            stabilizationPlan.length ? (
                              <div className="space-y-3">
                                {stabilizationPlan.map((item, index) => {
                                  const actionId = item.id || `stabilize-${index}`;
                                  const isSelected = Boolean(stabilizationState[actionId]);
                                  return (
                                  <article
                                    key={actionId}
                                    className={`rounded-xl border bg-white p-3 shadow-sm transition ${
                                      isSelected ? "border-emerald-300 ring-2 ring-emerald-200" : "border-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{item.action}</h4>
                                        {isSelected ? (
                                          <p className="mt-1 text-sm text-slate-600">{item.rationale}</p>
                                        ) : (
                                          <p className="mt-1 text-xs text-slate-400">Decide si aplicaras esta medida en el escenario.</p>
                                        )}
                                      </div>
                                      <span
                                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                          isSelected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                        }`}
                                      >
                                        {isSelected ? "Seleccionada" : "Pendiente"}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleStabilization(actionId)}
                                      className={`mt-3 w-full rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                                        isSelected
                                          ? "bg-slate-900 text-white hover:bg-slate-700"
                                          : "bg-emerald-500 text-white hover:bg-emerald-600"
                                      }`}
                                    >
                                      {isSelected ? "Retirar medida" : "Aplicar esta medida"}
                                    </button>
                                  </article>
                                );})}
                              </div>
                            ) : (
                              <EmptyState message="Completa este apartado cuando definas medidas iniciales." />
                            )
                          ) : null}

                          {tab.id === "hypotheses" ? (
                            hypotheses.length ? (
                              <div className="space-y-3">
                                {hypotheses.map((item, index) => {
                                  const hypId = item.id || `hypothesis-${index}`;
                                  const isSelected = Boolean(hypothesisState[hypId]);
                                  return (
                                  <article
                                    key={hypId}
                                    className={`rounded-xl border bg-white p-3 shadow-sm transition ${
                                      isSelected ? "border-indigo-300 ring-2 ring-indigo-200" : "border-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-800">{item.label}</h4>
                                        {isSelected ? (
                                          <p className="mt-1 text-sm text-slate-600">{item.rationale}</p>
                                        ) : (
                                          <p className="mt-1 text-xs text-slate-400">Activa este diagnostico provisional para revisar datos de apoyo.</p>
                                        )}
                                      </div>
                                      <span
                                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                          isSelected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                                        }`}
                                      >
                                        {isSelected ? "Analizado" : "Pendiente"}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleHypothesis(hypId)}
                                      className={`mt-3 w-full rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                                        isSelected
                                          ? "bg-slate-900 text-white hover:bg-slate-700"
                                          : "bg-indigo-500 text-white hover:bg-indigo-600"
                                      }`}
                                    >
                                      {isSelected ? "Ocultar detalles" : "Considerar diagnostico"}
                                    </button>
                                  </article>
                                );})}
                              </div>
                            ) : (
                              <EmptyState message="Agrega las hipotesis principales para guiar el caso." />
                            )
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          </aside>

          <section className="space-y-5">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-[320px] bg-slate-900/30">
                <SimulationStage
                  modelPath={sceneConfig.modelPath}
                  modelScale={sceneConfig.modelScale}
                  cameraPosition={sceneConfig.cameraPosition}
                  autoRotate={sceneConfig.autoRotate ?? !hasCustomModel}
                  proceduralVariant={sceneConfig.proceduralVariant}
                />
                <span className="pointer-events-none absolute left-6 top-6 rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-600">
                  {sceneCaption}
                </span>
              </div>
              <div className="border-t border-slate-200 bg-slate-900 px-6 py-6 text-white">
                <h2 className="text-xl font-semibold">Box UCIP</h2>
                <p className="mt-2 text-sm text-white/80">{sceneDescription}</p>
                {!hasCustomModel && sceneConfig.notes ? (
                  <p className="mt-3 text-xs text-white/60">{sceneConfig.notes}</p>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Modulos del caso</p>
              <div className="mt-4 space-y-3">
                {infoTabs.map((tab) => {
                  const isOpen = activeInfoTab === tab.id;
                  return (
                    <article key={tab.id} className="rounded-2xl border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setActiveInfoTab((prev) => (prev === tab.id ? null : tab.id))}
                        className={`flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-2 text-left text-sm font-semibold transition ${
                          isOpen ? "text-[#0A3D91]" : "text-slate-600 hover:text-[#0A3D91]"
                        }`}
                      >
                        {tab.label}
                        <svg
                          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {isOpen ? (
                        <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                          {tab.id === "investigations" ? (
                            investigations.length ? (
                              <div className="space-y-4">
                                {investigations.map((item) => (
                                  <InvestigationCard
                                    key={item.id}
                                    data={item}
                                    isActive={Boolean(investigationState[item.id])}
                                    onToggle={() => toggleInvestigation(item.id)}
                                  />
                                ))}
                              </div>
                            ) : (
                              <EmptyState message="Define las investigaciones disponibles para este caso." />
                            )
                          ) : null}

                          {tab.id === "interventions" ? (
                            interventions.length ? (
                              <div className="space-y-4">
                                {interventions.map((item) => (
                                  <InterventionCard
                                    key={item.id}
                                    data={item}
                                    isActive={Boolean(interventionState[item.id])}
                                    onToggle={() => toggleIntervention(item.id)}
                                  />
                                ))}
                              </div>
                            ) : (
                              <EmptyState message="Agrega intervenciones accionables para este escenario." />
                            )
                          ) : null}

                          {tab.id === "evaluation" ? (
                            scenario?.evaluation ? (
                              <div className="space-y-4">
                                <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <header className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Estado del caso</p>
                          <h4 className="text-lg font-semibold text-slate-900">Tu seleccion hasta ahora</h4>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
                          <span>{activeInvestigations.length} investigaciones solicitadas</span>
                          <span>{activeInterventions.length} intervenciones aplicadas</span>
                          <span>{activeHypotheses.length} hipotesis analizadas</span>
                        </div>
                      </header>
                      <dl className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
                        <div className="flex items-center justify-between">
                          <dt className="font-medium text-slate-500">Tiempo estimado</dt>
                          <dd className="font-semibold text-slate-900">{timeBudget} min</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="font-medium text-slate-500">Complejidad acumulada</dt>
                          <dd className="font-semibold text-slate-900">Nivel {complexityScore}</dd>
                        </div>
                      </dl>
                      <div className="mt-5 space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Selecciona la hipotesis final</p>
                          <div className="mt-3 space-y-2">
                            {scenario.evaluation.diagnosisOptions?.map((option) => (
                              <label
                                key={option.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition ${
                                  selectedDiagnosis === option.id
                                    ? "border-[#0A3D91] bg-[#0A3D91]/10 text-[#0A3D91]"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-[#0A3D91]/40"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="diagnosis"
                                  value={option.id}
                                  checked={selectedDiagnosis === option.id}
                                  onChange={(event) => {
                                    setSelectedDiagnosis(event.target.value);
                                    setEvaluationTriggered(false);
                                  }}
                                  className="h-4 w-4"
                                />
                                <span className="font-semibold">{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleEvaluate}
                          className="w-full rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700"
                        >
                          Revisar decision
                        </button>
                      </div>
                    </article>
                                {evaluationTriggered ? (
                                  <article className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <header>
                                      <h4 className="text-lg font-semibold text-slate-900">Retroalimentacion</h4>
                                      {!selectedDiagnosis ? (
                                        <p className="mt-1 text-sm text-amber-600">
                                          Primero selecciona una hipotesis final para evaluar el caso.
                                        </p>
                                      ) : null}
                                    </header>

                                    {selectedDiagnosis && evaluationStatus ? (
                                      <div className="space-y-4 text-sm text-slate-600">
                                        {evaluationStatus.missingMandatoryInvestigations.length ? (
                                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                                            <p className="text-sm font-semibold text-amber-800">Aun faltan estudios fundamentales:</p>
                                            <ul className="mt-2 space-y-1 text-amber-800">
                                              {evaluationStatus.missingMandatoryInvestigations.map((id) => (
                                                <li key={`mandatory-${id}`}>- {investigationMap.get(id) || id}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        ) : (
                                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                                            Estudios esenciales completados.
                                          </div>
                                        )}

                                        {evaluationStatus.missingCriticalInterventions.length ? (
                                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                                            <p className="text-sm font-semibold text-rose-700">Intervenciones criticas sin ejecutar:</p>
                                            <ul className="mt-2 space-y-1 text-rose-700">
                                              {evaluationStatus.missingCriticalInterventions.map((id) => (
                                                <li key={`critical-${id}`}>- {interventionMap.get(id) || id}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        ) : (
                                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                                            Intervenciones clave aplicadas.
                                          </div>
                                        )}

                                        {evaluationStatus.pendingRecommendedInvestigations.length ? (
                                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <p className="text-sm font-semibold text-slate-700">Considera sumar:</p>
                                            <ul className="mt-2 space-y-1 text-slate-600">
                                              {evaluationStatus.pendingRecommendedInvestigations.map((id) => (
                                                <li key={`recommended-${id}`}>- {investigationMap.get(id) || id}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        ) : null}

                                        {evaluationStatus.avoidTriggered.length ? (
                                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                                            Evita realizar: {evaluationStatus.avoidTriggered
                                              .map((id) => interventionMap.get(id) || id)
                                              .join(", ")}
                                          </div>
                                        ) : null}

                                        <div
                                          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                                            evaluationStatus.isDiagnosisCorrect
                                              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                                              : "border border-rose-200 bg-rose-50 text-rose-700"
                                          }`}
                                        >
                                          {evaluationStatus.diagnosisOption
                                            ? evaluationStatus.isDiagnosisCorrect
                                              ? "Hipotesis final adecuada."
                                              : "Revisa la seleccion final: la evidencia apunta a otra causa."
                                            : "Selecciona una hipotesis para recibir retroalimentacion."}
                                        </div>

                                        {evaluationStatus.summaryTips.length ? (
                                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Siguientes pasos</p>
                                            <ul className="mt-2 space-y-1 text-slate-600">
                                              {evaluationStatus.summaryTips.map((tip, idx) => (
                                                <li key={`tip-${idx}`}>- {tip}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </article>
                                ) : null}
                              </div>
                            ) : (
                              <EmptyState message="Configura las reglas de evaluacion en el dataset para activar esta vista." />
                            )
                          ) : null}

                          {tab.id === "communications" ? <ListCard title="Canales Clave" items={communications} /> : null}
                          {tab.id === "handoff" ? <ListCard title="Notas de traspaso" items={handoffNotes} /> : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
