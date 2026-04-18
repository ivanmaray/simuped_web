// src/features/admin/pages/Admin_QualityReview.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";
import AdminNav from "../components/AdminNav.jsx";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const SEVERITY_CONFIG = {
  critical: {
    icon: ExclamationCircleIcon,
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-700",
    label: "Crítico",
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    label: "Aviso",
  },
  info: {
    icon: InformationCircleIcon,
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    badge: "bg-sky-100 text-sky-700",
    label: "Info",
  },
};

const CATEGORY_LABELS = {
  url_rota: "URL rota",
  brief_incompleto: "Brief incompleto",
  tep_incoherente: "TEP incoherente",
  vitals_incoherentes: "Vitals incoherentes",
  dosis_incorrecta: "Dosis incorrecta",
  pregunta_mal_formada: "Pregunta mal formada",
  sin_preguntas_criticas: "Sin preguntas críticas",
  roles_incompletos: "Roles incompletos",
  recurso_obsoleto: "Recurso obsoleto",
  campo_vacio: "Campo vacío",
  otro: "Otro",
};

function ScoreBar({ score }) {
  const color =
    score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 w-32 rounded-full bg-slate-100">
        <div
          className={`h-2.5 rounded-full ${color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-sm font-semibold tabular-nums">{score}/100</span>
    </div>
  );
}

export default function Admin_QualityReview() {
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterScenario, setFilterScenario] = useState("all");

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      const { data } = await supabase
        .from("quality_reports")
        .select("id, created_at, summary, total_scenarios_reviewed, findings, scores")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        setHistory(data);
        // Auto-load the most recent report
        loadHistoryReport(data[0]);
      }
      setLoading(false);
    }
    loadHistory();
  }, []);

  function loadHistoryReport(h) {
    setReport({
      id: h.id,
      created_at: h.created_at,
      summary: h.summary,
      total_scenarios_reviewed: h.total_scenarios_reviewed,
      findings: h.findings || [],
      scores: h.scores || [],
    });
    setFilterSeverity("all");
    setFilterScenario("all");
  }

  const findings = report?.findings || [];
  const scores = report?.scores || [];

  const filteredFindings = findings.filter((f) => {
    if (filterSeverity !== "all" && f.severity !== filterSeverity) return false;
    if (filterScenario !== "all" && String(f.scenario_id) !== filterScenario) return false;
    return true;
  });

  const scenarioIds = [...new Set(findings.map((f) => f.scenario_id))].sort((a, b) => a - b);

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + (s.score || 0), 0) / scores.length)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AdminNav />

        {/* Header */}
        <div className="mt-6 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">Revisor de calidad</h1>
          <p className="mt-1 text-sm text-slate-500">
            Informes de auditoría generados por el agente IA desde Cowork. Para ejecutar una nueva
            auditoría, escribe <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">"revisa la calidad de los escenarios"</span> en Cowork.
          </p>
        </div>

        {loading && (
          <div className="mt-6 text-center text-sm text-slate-400">Cargando informes…</div>
        )}

        {!loading && history.length === 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200/60 bg-white p-8 text-center shadow-sm">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              Aún no hay informes de calidad. Pídele a Cowork que revise los escenarios para generar
              el primer informe.
            </p>
          </div>
        )}

        {/* Report selector */}
        {history.length > 1 && (
          <div className="mt-4 flex items-center gap-3">
            <label className="text-xs uppercase tracking-wide text-slate-400">Informe:</label>
            <select
              value={report?.id || ""}
              onChange={(e) => {
                const h = history.find((h) => h.id === e.target.value);
                if (h) loadHistoryReport(h);
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
            >
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {new Date(h.created_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  — {h.total_scenarios_reviewed} escenarios
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Report results */}
        {report && (
          <>
            {/* Summary cards */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-400">Escenarios</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">
                  {report.total_scenarios_reviewed}
                </p>
              </div>
              <div className="rounded-xl border border-rose-200/60 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-rose-400">Críticos</p>
                <p className="mt-1 text-2xl font-bold text-rose-600">{criticalCount}</p>
              </div>
              <div className="rounded-xl border border-amber-200/60 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-amber-400">Avisos</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{warningCount}</p>
              </div>
              <div className="rounded-xl border border-sky-200/60 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-sky-400">Info</p>
                <p className="mt-1 text-2xl font-bold text-sky-600">{infoCount}</p>
              </div>
              <div className="rounded-xl border border-emerald-200/60 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-emerald-400">Nota media</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {avgScore != null ? avgScore : "—"}
                </p>
              </div>
            </div>

            {/* Summary text */}
            {report.summary && (
              <div className="mt-4 rounded-xl border border-slate-200/60 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
                {report.summary}
              </div>
            )}

            {/* Scores table */}
            {scores.length > 0 && (
              <div className="mt-6 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Puntuación por escenario
                </h2>
                <div className="mt-3 divide-y divide-slate-100">
                  {[...scores]
                    .sort((a, b) => (a.score || 0) - (b.score || 0))
                    .map((s) => (
                      <div key={s.scenario_id} className="flex items-center justify-between py-2.5">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-slate-700">
                            #{s.scenario_id}{" "}
                          </span>
                          <span className="text-sm text-slate-500">{s.scenario_title}</span>
                        </div>
                        <ScoreBar score={s.score || 0} />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Findings */}
            <div className="mt-6 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Hallazgos ({filteredFindings.length})
                </h2>
                <div className="flex gap-2">
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                  >
                    <option value="all">Todas las severidades</option>
                    <option value="critical">Críticos</option>
                    <option value="warning">Avisos</option>
                    <option value="info">Info</option>
                  </select>
                  <select
                    value={filterScenario}
                    onChange={(e) => setFilterScenario(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                  >
                    <option value="all">Todos los escenarios</option>
                    {scenarioIds.map((id) => (
                      <option key={id} value={String(id)}>
                        #{id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {filteredFindings.length === 0 ? (
                  <p className="text-sm italic text-slate-400">
                    No hay hallazgos con estos filtros.
                  </p>
                ) : (
                  filteredFindings.map((f, i) => {
                    const sev = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.info;
                    const SevIcon = sev.icon;
                    return (
                      <div key={i} className={`rounded-xl border ${sev.border} ${sev.bg} px-4 py-3`}>
                        <div className="flex items-start gap-3">
                          <SevIcon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${sev.text}`} />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${sev.badge}`}
                              >
                                {sev.label}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {CATEGORY_LABELS[f.category] || f.category}
                              </span>
                              <span className="text-xs text-slate-500">
                                #{f.scenario_id} — {f.scenario_title}
                              </span>
                            </div>
                            <p className={`mt-1.5 text-sm ${sev.text}`}>{f.description}</p>
                            {f.suggested_fix && (
                              <p className="mt-1 text-xs text-slate-500">
                                <span className="font-medium">Sugerencia:</span> {f.suggested_fix}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
