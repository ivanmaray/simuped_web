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

function CaseCard({ microCase, onSelect }) {
  const EXCLUDED_TAGS = [
    "pediatria",
    "uci pediatrica",
    "uci pediátrica",
    "urgencias",
    "emergencias"
  ];

  function normalizeText(t) {
    if (!t) return "";
    try {
      return String(t).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    } catch (err) {
      // Fallback for environments without unicode property escapes
      return String(t).toLowerCase().replace(/[áÁ]/g, "a").replace(/[éÉ]/g, "e").replace(/[íÍ]/g, "i").replace(/[óÓ]/g, "o").replace(/[úÚ]/g, "u");
    }
  }
  // Clinical categories we want to highlight when present in tags
  const CLINICAL_CATEGORIES = {
    neurologico: "Neurológico",
    neurología: "Neurológico",
    neurologico: "Neurológico",
    infeccioso: "Infeccioso",
    infectologico: "Infeccioso",
    cardiaco: "Cardíaco",
    respiratorio: "Respiratorio",
    trauma: "Trauma",
    hemodinamico: "Hemodinámico",
    metabolico: "Metabólico",
    toxico: "Tóxico",
    pediatrico: "Pediátrico",
    nefrologico: "Nefrológico",
  };

  function extractClinicalCategories(tags = []) {
    const found = [];
    for (const t of tags || []) {
      const key = normalizeText(t);
      if (CLINICAL_CATEGORIES[key] && !found.includes(CLINICAL_CATEGORIES[key])) {
        found.push(CLINICAL_CATEGORIES[key]);
      }
    }
    return found;
  }

  function teaser(text, wordLimit = 12) {
    if (!text) return "";
    // Remove directive clauses starting with verbs that give away actions
    const forbiddenStarters = ["prioriza", "priorizar", "requiere", "se requiere", "evacuación", "evacuacion", "traslado", "traslada", "intubar", "intubación", "intubacion"];
    const lower = text.toLowerCase();
    for (const starter of forbiddenStarters) {
      const idx = lower.indexOf(starter);
      if (idx >= 0) {
        // cut text before the directive phrase to avoid giving hints
        text = text.substring(0, idx).trim();
        break;
      }
    }
    // Fallback to first N words
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= wordLimit) return words.join(" ");
    return words.slice(0, wordLimit).join(" ") + "...";
  }
  const DIFFICULTY_TONE = {
    basico: "bg-emerald-50 text-emerald-700 border-emerald-200",
    intermedio: "bg-amber-50 text-amber-700 border-amber-200",
    avanzado: "bg-red-50 text-red-700 border-red-200",
  };

  const isPublished = microCase.is_published !== false;
  const statusBadge = isPublished ? { label: "Disponible", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", button: { label: "Iniciar microcaso", variant: "bg-[#0A3D91] text-white hover:bg-[#0A3D91]/90" } } : { label: "Bloqueado", tone: "bg-slate-100 text-slate-500 border-slate-200", button: { label: "Ver opciones", variant: "bg-slate-900 text-white hover:bg-slate-800" } };

  return (
    <article className="relative flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-[0_24px_48px_-32px_rgba(10,61,145,0.35)]">
      { !isPublished ? (
        <div className="absolute right-6 top-6 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Bloqueado</div>
      ) : null }

      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-slate-900">{microCase.title}</h3>
          {/* show a neutral teaser only (no action hints, truncated) */}
          {microCase.summary ? <p className="text-sm text-slate-500">{teaser(microCase.summary)}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {microCase.difficulty ? (
            <span className={`rounded-full border px-3 py-1 font-semibold ${DIFFICULTY_TONE[String(microCase.difficulty).toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
              {microCase.difficulty ? String(microCase.difficulty).charAt(0).toUpperCase() + String(microCase.difficulty).slice(1) : ''}
            </span>
          ) : null}
          {microCase.estimated_minutes ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">{formatDuration(microCase.estimated_minutes)}</span>
          ) : null}
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge.tone}`}>
            {statusBadge.label}
          </span>
        </div>

        {/* Clinical categories (derived from tags) */}
        {extractClinicalCategories(microCase.tags).length ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {extractClinicalCategories(microCase.tags).map((c) => (
              <span key={`clin-${c}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium uppercase tracking-wider">{c}</span>
            ))}
          </div>
        ) : (
          /* fallback: show other tags (filtered) */
          (microCase.tags || []).filter((tag) => !EXCLUDED_TAGS.includes(normalizeText(tag))).length ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {(microCase.tags || []).filter((tag) => !EXCLUDED_TAGS.includes(normalizeText(tag))).map((tag) => (
                <span key={`tag-${tag}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium uppercase tracking-wider">{tag}</span>
              ))}
            </div>
          ) : null
        )}
      </div>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={() => onSelect(microCase.id)}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${statusBadge.button.variant}`}
        >
          {statusBadge.button.label}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" strokeLinecap="round" />
            <path d="m12 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </article>
  );
}

export default function QuickTraining() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState(EMPTY_STATE);
  const [error, setError] = useState("");
  const [completedAttempts, setCompletedAttempts] = useState([]);
  const [participantRole, setParticipantRole] = useState("medico");

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
        <div className="max-w-6xl mx-auto px-5 py-12 text-white relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-white/70 text-sm uppercase tracking-wide">Entrenamiento rápido</p>
              <h1 className="text-3xl md:text-4xl font-semibold mt-1">Microcasos interactivos</h1>
              <p className="opacity-95 mt-3 text-lg max-w-xl">
                Cambia de rol para entrenar la coordinación entre equipos. Cada enfoque ofrece preguntas y respuestas adaptadas a tu responsabilidad.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">Selecciona Rol</span>
                <div className="inline-flex rounded-full border border-white/25 bg-white/10 p-1">
                  {ROLE_OPTIONS.map((role) => {
                    const isActive = participantRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setParticipantRole(role)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${isActive ? 'bg-white text-[#0A3D91] shadow-sm' : 'text-white/85 hover:bg-white/15'}`}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    );
                  })}
                </div>
              </div>
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
