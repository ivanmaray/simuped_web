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
  { id: "communications", label: "Comunicacion" },
  { id: "evaluation", label: "Finalizar" }
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

function InvestigationCard({ data, isActive, onToggle, isExpanded, onExpand }) {
  return (
    <div
      className={`pb-3 border-b border-slate-100 last:border-0 transition`}
    >
      {/* Summary - always visible */}
      <button
        type="button"
        onClick={onExpand}
        className="w-full text-left space-y-1"
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {getInvestigationTypeLabel(data.type)}
            </p>
            <h4 className="text-sm font-semibold text-slate-900">{data.label}</h4>
          </div>
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 mt-0.5 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
        <div className="flex gap-3 text-xs text-slate-500">
          {typeof data.time === "number" && <span>{data.time}m</span>}
          {typeof data.cost === "number" && <span>L{data.cost}</span>}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-600 leading-relaxed">{data.description}</p>

          {isActive ? (
            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 -mx-2 px-2 py-2 rounded">
              <div>
                <p className="font-semibold text-slate-900 mb-1">Resultado:</p>
                <p className="text-slate-600">{data.result.summary}</p>
              </div>
              {data.result.highlights?.length ? (
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  {data.result.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            className={`w-full px-3 py-2 text-xs font-semibold rounded transition ${
              isActive
                ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
                : "bg-[#0A3D91] text-white hover:bg-[#0A3D91]/90"
            }`}
          >
            {isActive ? "Marcar pendiente" : "Solicitar"}
          </button>
        </div>
      )}
    </div>
  );
}

function InterventionCard({ data, isActive, onToggle, isExpanded, onExpand }) {
  return (
    <div
      className={`pb-3 border-b border-slate-100 last:border-0 transition`}
    >
      {/* Summary - always visible */}
      <button
        type="button"
        onClick={onExpand}
        className="w-full text-left"
      >
        <div className="flex justify-between items-center gap-2">
          <h4 className="text-sm font-semibold text-slate-900">{data.label}</h4>
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-3 pt-3 border-t border-slate-100">
          {data.rationale && (
            <p className="text-xs text-slate-600">{data.rationale}</p>
          )}

          {data.steps?.length ? (
            <ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
              {data.steps.map((step, idx) => (
                <li key={`${data.id}-step-${idx}`}>{step}</li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            className={`w-full px-3 py-2 text-xs font-semibold rounded transition ${
              isActive
                ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            }`}
          >
            {isActive ? "Marcar pendiente" : "Aplicar"}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-600">
      {message}
    </div>
  );
}

export default function InteractiveCase() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = useState(null);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedExamStep, setSelectedExamStep] = useState(null);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeInfoTab, setActiveInfoTab] = useState(null);
  const [expandedInvestigation, setExpandedInvestigation] = useState(null);
  const [expandedIntervention, setExpandedIntervention] = useState(null);
  const [investigationState, setInvestigationState] = useState({});
  const [interventionState, setInterventionState] = useState({});
  const [examState, setExamState] = useState({});
  const [stabilizationState, setStabilizationState] = useState({});
  const [hypothesisState, setHypothesisState] = useState({});
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [selectedDischarge, setSelectedDischarge] = useState(null);
  const [caseScore, setCaseScore] = useState(null);

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
    const step = examSteps.find(s => s.id === id);
    setSelectedExamStep(examState[id] ? null : step);
  };

  const toggleStabilization = (id) => {
    setStabilizationState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleHypothesis = (id) => {
    setHypothesisState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCompleteCase = () => {
    if (!scenario?.evaluation) return;
    setCaseScore(calculateScore());
  };

  const calculateScore = () => {
    if (!scenario?.evaluation) return null;
    
    const evaluation = scenario.evaluation;
    let score = 0;
    let maxScore = 0;
    const feedback = [];

    // Investigaciones obligatorias (30%)
    const mandatoryCount = evaluation.mandatoryInvestigations?.length || 0;
    const completedMandatory = (evaluation.mandatoryInvestigations || []).filter(id => investigationState[id]).length;
    maxScore += 30;
    score += (completedMandatory / mandatoryCount) * 30;
    if (completedMandatory === mandatoryCount) {
      feedback.push("✓ Todas las investigaciones obligatorias realizadas");
    } else {
      feedback.push(`✗ Faltaron ${mandatoryCount - completedMandatory} investigaciones obligatorias`);
    }

    // Intervenciones críticas (30%)
    const criticalCount = evaluation.criticalInterventions?.length || 0;
    const completedCritical = (evaluation.criticalInterventions || []).filter(id => interventionState[id]).length;
    maxScore += 30;
    score += (completedCritical / criticalCount) * 30;
    if (completedCritical === criticalCount) {
      feedback.push("✓ Todas las intervenciones críticas realizadas");
    } else {
      feedback.push(`✗ Faltaron ${criticalCount - completedCritical} intervenciones críticas`);
    }

    // Evitar intervenciones peligrosas (20%)
    const avoidCount = evaluation.avoidInterventions?.length || 0;
    const avoidedDangerous = (evaluation.avoidInterventions || []).filter(id => !interventionState[id]).length;
    maxScore += 20;
    score += (avoidedDangerous / avoidCount) * 20;
    if (avoidedDangerous === avoidCount) {
      feedback.push("✓ Evitaste intervenciones peligrosas");
    } else {
      feedback.push(`✗ Realizaste ${avoidCount - avoidedDangerous} intervenciones a evitar`);
    }

    // Diagnóstico correcto (10%)
    const diagnosisOption = evaluation.diagnosisOptions?.find(opt => opt.id === selectedDiagnosis);
    maxScore += 10;
    if (diagnosisOption?.correct) {
      score += 10;
      feedback.push("✓ Diagnóstico correcto");
    } else {
      feedback.push("✗ Diagnóstico incorrecto");
    }

    // Destino correcto (10%)
    const expectedDischarge = evaluation.correctDischarge;
    maxScore += 10;
    if (expectedDischarge === selectedDischarge) {
      score += 10;
      feedback.push("✓ Destino de alta adecuado");
    } else {
      feedback.push(`✗ Destino incorrecto (esperado: ${expectedDischarge})`);
    }

    return {
      score: Math.round(score),
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      feedback
    };
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
            className="rounded-lg bg-[#0A3D91] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#0A3D91]/90"
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
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Volver
            </button>
            <Link
              to="/entrenamiento-interactivo"
              className="rounded-lg bg-[#0A3D91] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#0A3D91]/90"
            >
              Ver biblioteca
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      <Navbar variant="private" />
      
      <main className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <div className="hidden lg:flex border-r border-slate-200 bg-white overflow-hidden">
          {/* Vertical tab bar - always visible */}
          <div className="w-12 border-r border-slate-200 flex flex-col">
            <button
              type="button"
              onClick={() => setActiveStage(activeStage === "exam" ? null : "exam")}
              className={`flex-1 py-4 px-2 flex items-center justify-center transition border-l-2 ${
                activeStage === "exam"
                  ? "border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              title="Examen"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Exam.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(activeStage === "stabilize" ? null : "stabilize")}
              className={`flex-1 py-4 px-2 flex items-center justify-center transition border-l-2 ${
                activeStage === "stabilize"
                  ? "border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              title="Estabilizar"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Estab.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(activeStage === "hypotheses" ? null : "hypotheses")}
              className={`flex-1 py-4 px-2 flex items-center justify-center transition border-l-2 ${
                activeStage === "hypotheses"
                  ? "border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              title="Hipótesis"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Hipot.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowPatientPanel(!showPatientPanel)}
              className={`flex-1 py-4 px-2 flex items-center justify-center transition border-l-2 ${
                showPatientPanel
                  ? "border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              title="Paciente"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Pac.
              </span>
            </button>
          </div>

          {/* Expandable panel - Stages */}
          {activeStage && (
            <div className="w-56 flex flex-col border-r border-slate-200 bg-white overflow-hidden animate-in fade-in slide-in-from-left-full duration-200">
              {/* Header */}
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  {activeStage === "exam" ? "Examen" : activeStage === "stabilize" ? "Estabilizar" : "Hipótesis"}
                </h2>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeStage === "exam" &&
                  (examSteps.length ? (
                    <div className="space-y-2">
                      {examSteps.map((step, idx) => {
                        const stepId = step.id || `exam-${idx}`;
                        const isSelected = Boolean(examState[stepId]);
                        return (
                          <div key={stepId} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => toggleExamStep(stepId)}
                              className={`block w-full text-left rounded px-3 py-2 text-xs font-medium transition border ${
                                isSelected
                                  ? "bg-[#0A3D91]/10 text-[#0A3D91] border-[#0A3D91] font-semibold"
                                  : "text-slate-700 border-slate-200 hover:border-[#0A3D91]"
                              }`}
                              title={step.label}
                            >
                              <div className="flex items-start gap-2">
                                {isSelected && (
                                  <svg className="h-4 w-4 text-[#0A3D91] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                <span>{step.label}</span>
                              </div>
                            </button>
                            {isSelected && step.notes && (
                              <div className="ml-2 px-2 py-1.5 bg-[#0A3D91]/5 rounded border border-[#0A3D91]/20 text-[11px] text-slate-700 leading-relaxed">
                                {step.notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">Sin pasos</p>
                  ))}

                {activeStage === "stabilize" &&
                  (stabilizationPlan.length ? (
                    <div className="space-y-1.5">
                      {stabilizationPlan.map((item, idx) => {
                        const actionId = item.id || `stabilize-${idx}`;
                        const isSelected = Boolean(stabilizationState[actionId]);
                        return (
                          <div key={actionId}>
                            <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded hover:bg-emerald-50 transition">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStabilization(actionId)}
                                className="w-4 h-4 mt-0.5 flex-shrink-0 accent-emerald-600"
                              />
                              <span className={`text-xs leading-snug flex-1 ${isSelected ? "font-semibold text-emerald-700" : "text-slate-700"}`}>
                                {item.action}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">Sin acciones</p>
                  ))}

                {activeStage === "hypotheses" &&
                  (hypotheses.length ? (
                    <div className="space-y-1.5">
                      {hypotheses.map((item, idx) => {
                        const hypId = item.id || `hypothesis-${idx}`;
                        const isSelected = Boolean(hypothesisState[hypId]);
                        return (
                          <div key={hypId}>
                            <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded hover:bg-indigo-50 transition">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleHypothesis(hypId)}
                                className="w-4 h-4 mt-0.5 flex-shrink-0 accent-indigo-600"
                              />
                              <span className={`text-xs leading-snug flex-1 ${isSelected ? "font-semibold text-indigo-700" : "text-slate-700"}`}>
                                {item.label}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">Sin hipótesis</p>
                  ))}
              </div>
            </div>
          )}

          {/* Expandable panel - Patient */}
          {showPatientPanel && (
            <div className="w-56 flex flex-col border-r border-slate-200 bg-white overflow-hidden animate-in fade-in slide-in-from-left-full duration-200">
              {/* Header */}
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Paciente</h2>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2">Datos Generales</p>
                  <div className="rounded border border-slate-200 bg-white p-3 space-y-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{scenario.patient.name}</p>
                      <p className="text-slate-600 text-[11px]">{scenario.patient.age}a · {scenario.patient.sex}</p>
                    </div>
                    <p className="text-slate-600 text-[11px]">{scenario.patient.arrivalMode}</p>
                  </div>
                </div>
                {scenario.patient.vitals && Object.keys(scenario.patient.vitals).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2">Vitales</p>
                    <div className="space-y-2">
                      {Object.entries(scenario.patient.vitals).map(([key, value]) => (
                        <div key={key} className="rounded border border-slate-200 bg-white px-3 py-2 flex justify-between items-center">
                          <p className="text-[11px] text-slate-600 font-medium">{formatVitalLabel(key)}</p>
                          <p className="text-[12px] font-semibold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CENTER - SCENE AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="border-b border-slate-200 bg-white px-4 sm:px-6 py-3 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <nav className="inline-flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ←
                  </button>
                  <span>/</span>
                  <span>Entrenamiento</span>
                </nav>
                <h1 className="text-lg font-semibold text-slate-900">{scenario.title}</h1>
                {scenario.duration && (
                  <p className="text-xs text-slate-500 mt-0.5">{scenario.duration}</p>
                )}
              </div>
              <div className="flex gap-2 lg:hidden">
              </div>
            </div>
          </header>

          {/* Scene Placeholder */}
          <div className="flex-1 flex items-center justify-center overflow-hidden p-4 sm:p-6">
            <div className="w-full max-w-2xl">
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-8 sm:p-12 text-center space-y-4">
                <div className="flex justify-center">
                  {selectedExamStep ? (
                    <div className="space-y-3 w-full">
                      <div className="inline-flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-[#0A3D91]/10">
                        <svg className="h-6 w-6 sm:h-8 sm:w-8 text-[#0A3D91]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900">{selectedExamStep.label}</h2>
                      <p className="text-sm text-slate-600">{selectedExamStep.sceneFocus}</p>
                    </div>
                  ) : (
                    <>
                      <svg className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </>
                  )}
                </div>
                {!selectedExamStep && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Escena 3D - Selecciona un examen</h2>
                    <p className="text-sm text-slate-600 mt-2">Abre el panel de examen a la izquierda y selecciona un paso para ver dónde se realiza.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - VERTICAL TABS */}
        <div className="hidden lg:flex border-l border-slate-200 bg-white overflow-hidden">
          {/* Vertical tab bar - always visible */}
          <div className="w-12 border-r border-slate-200 flex flex-col">
            <button
              type="button"
              onClick={() => setActiveInfoTab(activeInfoTab === "investigations" ? null : "investigations")}
              className={`flex-1 py-4 px-2 flex items-center justify-center transition border-l-2 ${
                activeInfoTab === "investigations"
                  ? "border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              title="Investigaciones"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Invest.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTab(activeInfoTab === "interventions" ? null : "interventions")}
              className={`flex-1 py-4 px-2 flex items-center justify-center transition border-l-2 ${
                activeInfoTab === "interventions"
                  ? "border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              title="Intervenciones"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Interv.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTab(activeInfoTab === "evaluation" ? null : "evaluation")}
              className={`flex-1 py-4 px-2 flex items-center justify-center transition border-l-2 ${
                activeInfoTab === "evaluation"
                  ? "border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              title="Evaluación"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Eval.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTab(activeInfoTab === "communications" ? null : "communications")}
              className={`flex-1 py-4 px-2 flex items-center justify-center transition border-l-2 ${
                activeInfoTab === "communications"
                  ? "border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              title="Comunicación"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Com.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTab(activeInfoTab === "evaluation" ? null : "evaluation")}
              className={`flex-1 py-4 px-2 flex items-center justify-center transition border-l-2 ${
                activeInfoTab === "evaluation"
                  ? "border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              title="Finalizar"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                Final.
              </span>
            </button>
          </div>

          {/* Expandable panel */}
          {activeInfoTab && (
            <div className="w-56 flex flex-col border-r border-slate-200 bg-white overflow-hidden animate-in fade-in slide-in-from-right-full duration-200">
              {/* Header */}
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
               <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  {activeInfoTab === "investigations" ? "Investigaciones" : activeInfoTab === "interventions" ? "Intervenciones" : activeInfoTab === "communications" ? "Comunicación" : "Finalizar Caso"}
                </h2>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-0">
                {activeInfoTab === "investigations" && (
                  investigations.length ? (
                    <div className="space-y-0">
                      {investigations.map((item) => (
                        <InvestigationCard
                          key={item.id}
                          data={item}
                          isActive={Boolean(investigationState[item.id])}
                          onToggle={() => toggleInvestigation(item.id)}
                          isExpanded={expandedInvestigation === item.id}
                          onExpand={() => setExpandedInvestigation(expandedInvestigation === item.id ? null : item.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="Sin investigaciones" />
                  )
                )}

                {activeInfoTab === "interventions" && (
                  interventions.length ? (
                    <div className="space-y-0">
                      {interventions.map((item) => (
                        <InterventionCard
                          key={item.id}
                          data={item}
                          isActive={Boolean(interventionState[item.id])}
                          onToggle={() => toggleIntervention(item.id)}
                          isExpanded={expandedIntervention === item.id}
                          onExpand={() => setExpandedIntervention(expandedIntervention === item.id ? null : item.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="Sin intervenciones" />
                  )
                )}

                {activeInfoTab === "evaluation" && evaluationStatus && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Diagnóstico</p>
                      {scenario?.evaluation?.diagnosisOptions ? (
                        <div className="space-y-1">
                          {scenario.evaluation.diagnosisOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setSelectedDiagnosis(option.id)}
                              className={`w-full text-left rounded px-3 py-2 text-xs font-medium transition border ${
                                selectedDiagnosis === option.id
                                  ? option.correct ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-red-100 text-red-700 border-red-300"
                                  : "text-slate-700 border-slate-200 hover:border-[#0A3D91]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {selectedDiagnosis === option.id && (
                                  <svg className={`h-4 w-4 flex-shrink-0 ${option.correct ? "text-emerald-600" : "text-red-600"}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                <span>{option.label}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Sin opciones de diagnóstico</p>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-2 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Destino de Alta</p>
                      <div className="space-y-1">
                        {["UCI", "Planta", "Alta a casa"].map((option) => (
                          <button
                            key={option}
                            onClick={() => setSelectedDischarge(option)}
                            className={`w-full text-left rounded px-2 py-1.5 text-xs font-medium transition border ${
                              selectedDischarge === option
                                ? "bg-[#0A3D91]/10 text-[#0A3D91] border-[#0A3D91] font-semibold"
                                : "text-slate-700 border-slate-200 hover:border-[#0A3D91]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {selectedDischarge === option && (
                                <svg className="h-4 w-4 text-[#0A3D91] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              <span>{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {!caseScore && (
                      <button
                        type="button"
                        onClick={handleCompleteCase}
                        disabled={!selectedDiagnosis || !selectedDischarge}
                        className="w-full mt-2 rounded px-3 py-2 text-xs font-semibold text-white bg-[#0A3D91] hover:bg-[#0A3D91]/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Completar Caso
                      </button>
                    )}

                    {caseScore && (
                      <div className="border-t border-slate-200 pt-2 space-y-2">
                        <div className={`rounded px-3 py-2 text-center ${caseScore.percentage >= 80 ? "bg-emerald-50" : caseScore.percentage >= 60 ? "bg-yellow-50" : "bg-red-50"}`}>
                          <p className={`text-lg font-bold ${caseScore.percentage >= 80 ? "text-emerald-700" : caseScore.percentage >= 60 ? "text-yellow-700" : "text-red-700"}`}>
                            {caseScore.percentage}%
                          </p>
                          <p className={`text-xs font-semibold ${caseScore.percentage >= 80 ? "text-emerald-600" : caseScore.percentage >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                            {caseScore.score}/{caseScore.maxScore} puntos
                          </p>
                        </div>
                        <div className="space-y-1">
                          {caseScore.feedback.map((item, idx) => (
                            <p key={idx} className="text-[10px] text-slate-600 bg-slate-50 rounded px-2 py-1">
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeInfoTab === "communications" && (
                  <div className="space-y-2">
                    {scenario?.communications?.length ? (
                      scenario.communications.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 rounded border border-slate-200 px-3 py-2">
                          <p className="text-[11px] font-semibold text-slate-900 mb-1">{item.label}</p>
                          <p className="text-[10px] text-slate-600">{item.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-4">Sin comunicaciones</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
