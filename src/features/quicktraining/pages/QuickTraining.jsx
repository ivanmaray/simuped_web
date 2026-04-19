import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth";
import Navbar from "../../../components/Navbar.jsx";
import Spinner from "../../../components/Spinner.jsx";

const EMPTY_STATE = [];
const ROLE_LABELS = {
  medico: "Medicina",
  enfermeria: "Enfermería",
  farmacia: "Farmacia"
};
const API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_MICROCASE_API_BASE_URL) || "/api";

const DIFFICULTY_META = {
  facil:      { label: "Fácil",      color: "bg-emerald-50 text-emerald-700 border-emerald-200",  dot: "bg-emerald-400", icon: "🟢" },
  intermedio: { label: "Intermedio", color: "bg-amber-50 text-amber-700 border-amber-200",        dot: "bg-amber-400",   icon: "🟡" },
  avanzado:   { label: "Avanzado",   color: "bg-red-50 text-red-700 border-red-200",              dot: "bg-red-400",     icon: "🔴" },
};

const FILTER_TABS = [
  { key: "all",       label: "Todos" },
  { key: "facil",     label: "Fácil" },
  { key: "intermedio",label: "Intermedio" },
  { key: "avanzado",  label: "Avanzado" },
];

async function parseJsonResponse(response, fallbackErrorMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  try {
    const text = await response.text();
    return JSON.parse(text);
  } catch (err) {
    console.warn("[QuickTraining] No JSON body", err);
    throw new Error(fallbackErrorMessage);
  }
}

function formatDuration(minutes) {
  if (!minutes || Number.isNaN(Number(minutes))) return "Sin estimación";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} h ${remaining} min` : `${hours} h`;
}

/* ─── CaseCard ─────────────────────────────────────────────── */
function CaseCard({ microCase, onSelect, bestScore }) {
  const isPublished = microCase.is_published !== false;
  const diffKey     = String(microCase.difficulty || "").toLowerCase();
  const diffMeta    = DIFFICULTY_META[diffKey];
  const isCompleted = bestScore !== undefined && bestScore !== null;

  return (
    <article
      className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition
        ${isPublished
          ? "hover:-translate-y-1 hover:shadow-md hover:border-[#0A3D91]/30 cursor-pointer"
          : "opacity-60"}`}
      style={{ borderColor: isCompleted ? "rgba(16,185,129,0.3)" : "rgba(0,0,0,0.08)" }}
      onClick={isPublished ? () => onSelect(microCase.id) : undefined}
    >
      {/* Completado badge */}
      {isCompleted && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5">
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">✓ {bestScore} pts</span>
        </div>
      )}

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pr-16">
          <h3 className="text-sm font-semibold text-slate-900 leading-snug">{microCase.title}</h3>
          {!isPublished && (
            <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Bloqueado</span>
          )}
        </div>

        {/* Summary */}
        {microCase.summary && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{microCase.summary}</p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {diffMeta && (
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${diffMeta.color}`}>
              {diffMeta.icon} {diffMeta.label}
            </span>
          )}
          {microCase.estimated_minutes && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
              ⏱ {formatDuration(microCase.estimated_minutes)}
            </span>
          )}
          {Array.isArray(microCase.recommended_roles) && microCase.recommended_roles.slice(0, 3).map((r) => (
            <span key={r} className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {ROLE_LABELS[String(r).toLowerCase()] || r}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      {isPublished && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-medium text-[#0A3D91]">
            {isCompleted ? '🔄 Reintentar' : 'Iniciar caso →'}
          </span>
          {/* Mini difficulty bar */}
          <div className="flex gap-0.5">
            {['facil','intermedio','avanzado'].map((d, i) => {
              const levels = { facil: 1, intermedio: 2, avanzado: 3 };
              const myLevel = levels[diffKey] || 0;
              return (
                <span key={d} className={`h-1.5 w-3.5 rounded-full transition-colors ${i < myLevel ? (diffMeta?.dot || 'bg-slate-300') : 'bg-slate-100'}`} />
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

/* ─── QuickTraining page ────────────────────────────────────── */
export default function QuickTraining() {
  const { session, ready, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading]               = useState(true);
  const [cases, setCases]                   = useState(EMPTY_STATE);
  const [error, setError]                   = useState("");
  const [completedAttempts, setCompletedAttempts] = useState([]);
  const [activeFilter, setActiveFilter]     = useState("all");

  const participantRole = useMemo(() => {
    const raw = String(profile?.rol || "").toLowerCase();
    if (raw.includes("enfer")) return "enfermeria";
    if (raw.includes("farm"))  return "farmacia";
    return "medico";
  }, [profile]);

  const token = useMemo(() => session?.access_token ?? null, [session]);

  const [attemptsSummary, setAttemptsSummary] = useState({});

  useEffect(() => {
    if (!ready || !token) return;
    let isMounted = true;
    async function loadCases() {
      setLoading(true);
      setError("");
      try {
        const [listResponse, summaryResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/micro_cases?action=list`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/micro_cases?action=attempts_summary`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!listResponse.ok) throw new Error(`No se pudo cargar el listado (${listResponse.status})`);
        const listJson = await parseJsonResponse(listResponse, "No se pudo leer la lista de microcasos.");
        if (!listJson?.ok) throw new Error(listJson?.error || 'Respuesta inválida del servidor');
        if (isMounted) setCases(listJson.cases || EMPTY_STATE);

        if (summaryResponse.ok) {
          const summaryJson = await parseJsonResponse(summaryResponse, 'summary_error').catch(() => null);
          if (isMounted && summaryJson?.ok) setAttemptsSummary(summaryJson.summary || {});
        }
      } catch (err) {
        console.error('[QuickTraining] list error', err);
        if (isMounted) setError(err.message || 'No se pudo obtener el listado.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCases();
    return () => { isMounted = false; };
  }, [ready, token]);

  /* Best score per case: DB summary overridden by in-session higher scores */
  const bestScores = useMemo(() => {
    const map = {};
    for (const [caseId, info] of Object.entries(attemptsSummary)) {
      if (info?.best_score != null) map[caseId] = info.best_score;
    }
    for (const att of completedAttempts) {
      if (map[att.caseId] == null || att.score > map[att.caseId]) {
        map[att.caseId] = att.score;
      }
    }
    return map;
  }, [attemptsSummary, completedAttempts]);

  /* Filtered cases */
  const filteredCases = useMemo(() => {
    if (activeFilter === "all") return cases;
    return cases.filter(c => String(c.difficulty || "").toLowerCase() === activeFilter);
  }, [cases, activeFilter]);

  /* Counts per difficulty */
  const counts = useMemo(() => {
    const c = { all: cases.length, facil: 0, intermedio: 0, avanzado: 0 };
    cases.forEach(mc => {
      const k = String(mc.difficulty || "").toLowerCase();
      if (c[k] !== undefined) c[k]++;
    });
    return c;
  }, [cases]);

  function handleSelectCase(caseId) {
    if (!caseId) return;
    navigate(`/entrenamiento-rapido/${caseId}`);
  }

  async function handleSubmitAttempt(payload) {
    if (!token) return { ok: false, error: 'missing_token' };
    try {
      const response = await fetch(`${API_BASE_URL}/micro_cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'submit', participantRole, ...payload })
      });
      const json = await parseJsonResponse(response, 'No se pudo procesar la respuesta.').catch(() => null);
      if (!response.ok || !json?.ok) {
        return { ok: false, error: json?.error || `http_${response.status}`, detail: json?.detail };
      }
      setCompletedAttempts(prev => [
        { caseId: payload.caseId, attemptId: json.attempt_id, score: payload.scoreTotal, role: participantRole, completedAt: new Date().toISOString() },
        ...prev
      ].slice(0, 20));
      return json;
    } catch (err) {
      console.warn('[QuickTraining] submit attempt error', err);
      return { ok: false, error: err?.message || 'network_error' };
    }
  }

  /* Stats for hero */
  const completedCount = Object.keys(bestScores).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="private" />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-6xl mx-auto px-5 py-8 text-white relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Casos rápidos</p>
              <h1 className="text-2xl md:text-3xl font-semibold">Microcasos clínicos interactivos</h1>
              <p className="opacity-80 mt-2 text-sm max-w-xl">
                Toma de decisiones con consecuencias clínicas reales. Cada opción puntúa.
              </p>
              {participantRole && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  Rol: {ROLE_LABELS[participantRole] || participantRole}
                </div>
              )}
            </div>
            {/* Stats mini */}
            {cases.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center">
                  <p className="text-2xl font-bold text-white">{cases.length}</p>
                  <p className="text-[10px] text-white/70 uppercase tracking-wide">Casos</p>
                </div>
                {completedCount > 0 && (
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/20 px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-emerald-200">{completedCount}</p>
                    <p className="text-[10px] text-emerald-200/80 uppercase tracking-wide">Completados</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* ── Filtros de dificultad ── */}
        {!loading && cases.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition
                  ${activeFilter === tab.key
                    ? 'bg-[#0A3D91] border-[#0A3D91] text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-[#0A3D91]/40 hover:text-[#0A3D91]'}`}
              >
                {tab.key !== 'all' && DIFFICULTY_META[tab.key]?.icon} {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${activeFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Listado ── */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner centered /></div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCases.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-600">
                {cases.length === 0 ? 'Aún no hay microcasos publicados. Vuelve pronto.' : 'No hay casos con este nivel de dificultad.'}
              </div>
            ) : (
              filteredCases.map(mc => (
                <CaseCard
                  key={mc.id}
                  microCase={mc}
                  onSelect={handleSelectCase}
                  bestScore={bestScores[mc.id] ?? null}
                />
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}
