import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth";
import Navbar from "../../../components/Navbar.jsx";
import Spinner from "../../../components/Spinner.jsx";

const EMPTY_STATE = [];
const ROLE_OPTIONS = ["medico", "enfermeria", "farmacia"];
const ROLE_LABELS = {
  medico: "Medicina",
  enfermeria: "Enfermeria",
  farmacia: "Farmacia"
};
const ROLE_DETAILS = {
  medico: {
    headline: "Visión clínica integradora",
    description: "Marca prioridades, integra datos dinamicos y coordina la escalada terapeutica con el resto del equipo."
  },
  enfermeria: {
    headline: "Ejecucion y vigilancia continua",
    description: "Opera el plan, asegura vias y dispositivos, monitoriza tendencias y comunica cambios oportunamente."
  },
  farmacia: {
    headline: "Gestión farmacologica segura",
    description: "Evalua dosis y compatibilidades, anticipa interacciones y sostiene decisiones seguras en terapias combinadas."
  }
};
const API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_MICROCASE_API_BASE_URL) || "/api";

async function parseJsonResponse(response, fallbackErrorMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

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

function RoleSummary({ role }) {
  if (!role) return null;
  const info = ROLE_DETAILS[role];
  if (!info) return null;
  return (
    <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-white shadow-sm backdrop-blur">
      <p className="text-xs uppercase tracking-[0.3em] text-white/70">Enfoque del rol</p>
      <h3 className="mt-1 text-base font-semibold text-white">{info.headline}</h3>
      <p className="mt-1 text-sm text-white/80">{info.description}</p>
    </div>
  );
}

const DIFFICULTY_LABEL = { basico: "Básico", intermedio: "Intermedio", avanzado: "Avanzado" };
const DIFFICULTY_COLOR = {
  basico:    "bg-emerald-50 text-emerald-700",
  intermedio:"bg-amber-50 text-amber-700",
  avanzado:  "bg-red-50 text-red-700",
};

function CaseCard({ microCase, onSelect }) {
  const isPublished = microCase.is_published !== false;
  const diffKey = String(microCase.difficulty || "").toLowerCase();

  return (
    <article
      className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition
        ${isPublished ? "hover:-translate-y-0.5 hover:shadow-md hover:border-[#0A3D91]/30 cursor-pointer" : "opacity-60"}`}
      style={{ borderColor: "rgba(0,0,0,0.08)" }}
      onClick={isPublished ? () => onSelect(microCase.id) : undefined}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
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
          {diffKey && DIFFICULTY_LABEL[diffKey] && (
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${DIFFICULTY_COLOR[diffKey]}`}>
              {DIFFICULTY_LABEL[diffKey]}
            </span>
          )}
          {microCase.estimated_minutes && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
              {formatDuration(microCase.estimated_minutes)}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      {isPublished && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-medium text-[#0A3D91]">Iniciar caso →</span>
        </div>
      )}
    </article>
  );
}

export default function QuickTraining() {
  const { session, ready, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState(EMPTY_STATE);
  const [error, setError] = useState("");
  const [completedAttempts, setCompletedAttempts] = useState([]);

  // Rol del perfil del usuario, normalizado
  const participantRole = useMemo(() => {
    const raw = String(profile?.rol || "").toLowerCase();
    if (raw.includes("enfer")) return "enfermeria";
    if (raw.includes("farm"))  return "farmacia";
    return "medico"; // default
  }, [profile]);

  const token = useMemo(() => session?.access_token ?? null, [session]);

  useEffect(() => {
    if (!ready || !token) return;
    let isMounted = true;

    async function loadCases() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/micro_cases?action=list`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error(`No se pudo cargar el listado (${response.status})`);
        }
        const json = await parseJsonResponse(response, "No se pudo leer la lista de microcasos.");
        if (!json?.ok) {
          throw new Error(json?.error || 'Respuesta inválida del servidor');
        }
        if (isMounted) {
          setCases(json.cases || EMPTY_STATE);
        }
      } catch (err) {
        console.error('[QuickTraining] list error', err);
        if (isMounted) {
          setError(err.message || 'No se pudo obtener el listado de microcasos.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCases();
    return () => {
      isMounted = false;
    };
  }, [ready, token]);

  function handleSelectCase(caseId) {
    if (!caseId) return;
    navigate(`/entrenamiento-rapido/${caseId}`);
  }

  async function handleSubmitAttempt(payload) {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/micro_cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'submit', participantRole, ...payload })
      });
      if (!response.ok) {
        console.warn('[QuickTraining] submit attempt failed', response.status);
        return;
      }
      const json = await parseJsonResponse(response, 'No se pudo procesar la respuesta del intento.');
      if (json?.ok) {
        setCompletedAttempts((prev) => [
          {
            caseId: payload.caseId,
            attemptId: json.attempt_id,
            score: payload.scoreTotal,
            role: participantRole,
            completedAt: new Date().toISOString()
          },
          ...prev
        ].slice(0, 10));
      }
    } catch (err) {
      console.warn('[QuickTraining] submit attempt error', err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="private" />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-6xl mx-auto px-5 py-8 text-white relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Casos rápidos</p>
              <h1 className="text-2xl md:text-3xl font-semibold">Microcasos clínicos interactivos</h1>
              <p className="opacity-80 mt-2 text-sm max-w-xl">
                Casos breves de toma de decisiones. Cada opción tiene consecuencias clínicas reales.
              </p>
              {participantRole && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  Rol: {ROLE_LABELS[participantRole] || participantRole}
                </div>
              )}
            </div>
            <RoleSummary role={participantRole} />
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {completedAttempts.length > 0 && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
            <h2 className="text-sm font-semibold text-emerald-900 mb-3">Historial reciente</h2>
            <ul className="text-sm text-emerald-900 space-y-1">
              {completedAttempts.map((attempt) => (
                <li key={attempt.attemptId} className="flex items-center justify-between">
                  <span>
                    Microcaso completado ✓
                    {attempt.role ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                        {ROLE_LABELS[attempt.role] || attempt.role}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-emerald-700 font-medium">{attempt.score ?? 0} pts</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner centered /></div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cases.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-600">
                Aún no hay microcasos publicados. Vuelve pronto.
              </div>
            ) : (
              cases.map((microCase) => (
                <CaseCard
                  key={microCase.id}
                  microCase={microCase}
                  onSelect={handleSelectCase}
                />
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}
