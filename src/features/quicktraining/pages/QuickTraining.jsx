import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../auth";
import Navbar from "../../../components/Navbar.jsx";
import MicroCasePlayer from "../components/MicroCasePlayer.jsx";
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

function CaseCard({ microCase, onSelect, isSelected }) {
  return (
    <article
      className={`rounded-2xl border transition overflow-hidden ${isSelected ? 'border-[#0A3D91] shadow-[0_18px_32px_-18px_rgba(10,61,145,0.55)]' : 'border-slate-200 shadow-sm hover:shadow-md'} bg-white`}
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{microCase.title}</h3>
            {microCase.summary ? (
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">{microCase.summary}</p>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {formatDuration(microCase.estimated_minutes)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {microCase.difficulty ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
              {microCase.difficulty === "facil" ? "Nivel básico" : microCase.difficulty === "avanzado" ? "Nivel avanzado" : "Nivel intermedio"}
            </span>
          ) : null}
          {(microCase.recommended_roles || []).map((role) => (
            <span key={`role-${role}`} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
              {ROLE_LABELS[role] || role}
            </span>
          ))}
          {(microCase.recommended_units || []).map((unit) => (
            <span key={`unit-${unit}`} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
              {unit}
            </span>
          ))}
          {(microCase.tags || []).map((tag) => (
            <span key={`tag-${tag}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              {tag}
            </span>
          ))}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onSelect(microCase.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${isSelected ? 'bg-[#0A3D91] text-white shadow-sm' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
          >
            {isSelected ? 'Revisando…' : 'Iniciar microcaso'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function QuickTraining() {
  const { session, ready } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState(EMPTY_STATE);
  const [error, setError] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [fetchingCase, setFetchingCase] = useState(false);
  const [completedAttempts, setCompletedAttempts] = useState([]);
  const [participantRole, setParticipantRole] = useState("medico");
  const [caseRequestNonce, setCaseRequestNonce] = useState(0);

  const token = useMemo(() => session?.access_token ?? null, [session]);
  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

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

  useEffect(() => {
    if (!selectedCaseId || !token) return;
    let isMounted = true;

    async function fetchCase() {
      setFetchingCase(true);
      setCaseData(null);
      setError("");
      try {
        const params = new URLSearchParams({ action: 'get', id: selectedCaseId });
        if (participantRole) {
          params.set('role', participantRole);
        }
        const response = await fetch(`${API_BASE_URL}/micro_cases?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error(`No se pudo cargar el microcaso (${response.status})`);
        }
        const json = await parseJsonResponse(response, "No se pudo leer el detalle del microcaso seleccionado.");
        if (!json?.ok) {
          throw new Error(json?.error || 'Respuesta inválida del servidor');
        }
        if (isMounted) {
          setCaseData(json.case);
        }
      } catch (err) {
        console.error('[QuickTraining] case error', err);
        if (isMounted) {
          setError(err.message || 'No se pudo cargar el microcaso seleccionado.');
        }
      } finally {
        if (isMounted) {
          setFetchingCase(false);
        }
      }
    }

    fetchCase();
    return () => {
      isMounted = false;
    };
  }, [selectedCaseId, participantRole, token, caseRequestNonce]);

  function handleSelectCase(caseId) {
    if (!caseId) return;
    setCaseData(null);
    setError("");
    setSelectedCaseId(caseId);
    setCaseRequestNonce((prev) => prev + 1);
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
                  isSelected={selectedCaseId === microCase.id}
                />
              ))
            )}
          </section>
        )}

        {selectedCase && (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.35)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{selectedCase.title}</h2>
                <p className="mt-1 text-sm text-slate-500">Sigue el flujo clínico y registra tus decisiones.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {(selectedCase.recommended_roles || []).map((role) => (
                    <span key={`detail-role-${role}`} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                      {ROLE_LABELS[role] || role}
                    </span>
                  ))}
                  {(caseData?.available_roles || []).map((role) => (
                    <span key={`available-role-${role}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                      Disponible: {ROLE_LABELS[role] || role}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setSelectedCaseId(null);
                  setCaseData(null);
                  setError("");
                }}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6">
              {fetchingCase && (
                <div className="flex justify-center py-8"><Spinner centered /></div>
              )}
              {!fetchingCase && caseData && (
                <MicroCasePlayer
                  key={`${caseData.id}-${participantRole}`}
                  microCase={caseData}
                  participantRole={participantRole}
                  onSubmitAttempt={handleSubmitAttempt}
                />
              )}
              {!fetchingCase && !caseData && !error && (
                <div className="text-sm text-slate-500">Selecciona un caso para comenzar.</div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
