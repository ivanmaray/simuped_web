import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../auth";
import Navbar from "../../../components/Navbar.jsx";
import MicroCasePlayer from "../components/MicroCasePlayer.jsx";
import Spinner from "../../../components/Spinner.jsx";

const EMPTY_STATE = [];
const API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_MICROCASE_API_BASE_URL) || "/api";

async function parseJsonResponse(response, devHint) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const baseMessage = devHint || "Respuesta inesperada del servicio de microcasos.";
    const suffix = import.meta.env?.DEV
      ? " En desarrollo levanta el backend (p.ej. con `vercel dev`) o configura VITE_MICROCASE_API_BASE_URL para apuntar a tu entorno remoto."
      : "";
    throw new Error(`${baseMessage}${suffix}`);
  }
  return response.json();
}

function formatDuration(minutes) {
  if (!minutes || Number.isNaN(minutes)) return "5 min aprox.";
  if (minutes < 1) return "< 1 min";
  if (minutes === 1) return "1 minuto";
  return `${minutes} minutos`;
}

function CaseCard({ microCase, onSelect }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="p-5">
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

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {microCase.difficulty ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
              {microCase.difficulty === "facil" ? "Nivel básico" : microCase.difficulty === "avanzado" ? "Nivel avanzado" : "Nivel intermedio"}
            </span>
          ) : null}
          {(microCase.recommended_roles || []).map((role) => (
            <span key={`role-${role}`} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              {role}
            </span>
          ))}
          {(microCase.recommended_units || []).map((unit) => (
            <span key={`unit-${unit}`} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
              {unit}
            </span>
          ))}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => onSelect(microCase)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0A3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A3D91]/90"
          >
            Iniciar microcaso
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
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [fetchingCase, setFetchingCase] = useState(false);
  const [completedAttempts, setCompletedAttempts] = useState([]);

  const token = useMemo(() => session?.access_token ?? null, [session]);

  useEffect(() => {
    if (!ready || !token) return;

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
        if (json?.ok) {
          setCases(json.cases || EMPTY_STATE);
        } else {
          throw new Error(json?.error || 'Respuesta inválida del servidor');
        }
      } catch (err) {
        console.error('[QuickTraining] list error', err);
        setError(err.message || 'No se pudo obtener el listado de microcasos.');
      } finally {
        setLoading(false);
      }
    }

    loadCases();
  }, [ready, token]);

  async function handleSelectCase(microCase) {
    setSelectedCase(microCase);
    setCaseData(null);
    setFetchingCase(true);
    setError("");

    try {
      const params = new URLSearchParams({ action: 'get', id: microCase.id });
      const response = await fetch(`${API_BASE_URL}/micro_cases?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error(`No se pudo cargar el microcaso (${response.status})`);
      }
      const json = await parseJsonResponse(response, "No se pudo leer el detalle del microcaso seleccionado.");
      if (!json?.ok) {
        throw new Error(json?.error || 'Respuesta inválida del servidor');
      }
      setCaseData(json.case);
    } catch (err) {
      console.error('[QuickTraining] case error', err);
      setError(err.message || 'No se pudo cargar el microcaso seleccionado.');
    } finally {
      setFetchingCase(false);
    }
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
        body: JSON.stringify({ action: 'submit', ...payload })
      });
      if (!response.ok) {
        console.warn('[QuickTraining] submit attempt failed', response.status);
      } else {
        const json = await parseJsonResponse(response, 'No se pudo procesar la respuesta del intento.');
        if (json?.ok) {
          setCompletedAttempts((prev) => [
            { caseId: payload.caseId, attemptId: json.attempt_id, score: payload.scoreTotal, completedAt: new Date().toISOString() },
            ...prev
          ].slice(0, 10));
        }
      }
    } catch (err) {
      console.warn('[QuickTraining] submit attempt error', err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="private" />

      <main className="max-w-6xl mx-auto px-5 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Entrenamiento rápido</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">Microcasos interactivos</h1>
          <p className="text-slate-600 max-w-2xl">
            Resuelve situaciones clínicas en menos de 10 minutos. Cada decisión ofrece feedback inmediato para reforzar habilidades clave entre sesiones presenciales.
          </p>
        </header>

        {completedAttempts.length > 0 && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
            <h2 className="text-sm font-semibold text-emerald-900 mb-3">Historial reciente</h2>
            <ul className="text-sm text-emerald-900 space-y-1">
              {completedAttempts.map((attempt) => (
                <li key={attempt.attemptId} className="flex items-center justify-between">
                  <span>Microcaso completado ✓</span>
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

        {selectedCase && (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.35)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{selectedCase.title}</h2>
                <p className="mt-1 text-sm text-slate-500">Sigue el flujo clínico y registra tus decisiones.</p>
              </div>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setSelectedCase(null);
                  setCaseData(null);
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
                  key={caseData.id}
                  microCase={caseData}
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
