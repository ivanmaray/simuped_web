import { Navigate, useParams } from "react-router-dom";
import Navbar from "../../../components/Navbar.jsx";
import MicroCasePlayer from "../components/MicroCasePlayer.jsx";
import { useAuth } from "../../../auth";
import { useEffect, useMemo, useState } from "react";

// Keep the same env var and fallback used across the quicktraining pages
const API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_MICROCASE_API_BASE_URL) || "/api";

function profileRole(profile) {
  const raw = String(profile?.rol || "").toLowerCase();
  if (raw.includes("enfer")) return "enfermeria";
  if (raw.includes("farm"))  return "farmacia";
  return "medico";
}

export default function MicroCasePage() {
  const { caseId } = useParams();
  const { session, ready, profile, isAdmin } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const participantRole = useMemo(() => profileRole(profile), [profile]);
  const isNursing = String(profile?.rol || "").toLowerCase().includes("enfer");

  const token = session?.access_token ?? null;

  useEffect(() => {
    if (!ready || !token || !caseId) return;

    let cancelled = false;
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setError((prev) => prev || "La carga tardó demasiado. Comprueba tu conexión y recarga.");
      }
    }, 12000);

    async function fetchCase() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ action: 'get', id: caseId });
        const response = await fetch(`${API_BASE_URL}/micro_cases?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error(`No se pudo cargar el microcaso (${response.status})`);
        }
        const json = await parseJsonResponse(response, "No se pudo leer el detalle del microcaso.");
        if (!json?.ok) {
          throw new Error(json?.error || 'Respuesta inválida del servidor');
        }
        if (!cancelled) setCaseData(json.case);
      } catch (err) {
        console.error('[MicroCasePage] fetch error', err);
        if (!cancelled) setError(err.message || 'No se pudo cargar el microcaso.');
      } finally {
        clearTimeout(safetyTimer);
        if (!cancelled) setLoading(false);
      }
    }

    fetchCase();
    return () => { cancelled = true; clearTimeout(safetyTimer); };
  }, [ready, token, caseId]);

  async function handleSubmitAttempt(payload) {
    if (!token) return { ok: false, error: 'missing_token' };
    try {
      const response = await fetch(`${API_BASE_URL}/micro_cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'submit', participantRole, ...payload })
      });
      const json = await parseJsonResponse(response, 'No se pudo procesar la respuesta del intento.').catch(() => null);
      if (!response.ok) {
        console.warn('[MicroCasePage] submit attempt failed', response.status, json);
        return { ok: false, error: json?.error || `http_${response.status}`, detail: json?.detail };
      }
      return json || { ok: true };
    } catch (err) {
      console.error('[MicroCasePage] submit error', err);
      return { ok: false, error: err?.message || 'network_error' };
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar variant="private" />
        <div className="flex justify-center py-12">
          <div className="text-sm text-slate-600">Cargando...</div>
        </div>
      </div>
    );
  }

  if (isNursing && !isAdmin) return <Navigate to="/panel" replace />;

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
              <h1 className="text-3xl md:text-4xl font-semibold mt-1">Microcaso en progreso</h1>
              <p className="opacity-95 mt-3 text-lg max-w-xl">
                Sigue el flujo clínico y registra tus decisiones para completar el caso.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-sm text-slate-600">Cargando microcaso...</div>
          </div>
        ) : caseData ? (
          <MicroCasePlayer
            key={`${caseData.id}-${participantRole}`}
            microCase={caseData}
            participantRole={participantRole}
            token={token}
            onSubmitAttempt={handleSubmitAttempt}
          />
        ) : (
          <div className="text-sm text-slate-500">No se pudo cargar el microcaso.</div>
        )}
      </main>
    </div>
  );
}

// Robust JSON parser similar to the one used in QuickTraining.jsx.
function parseJsonResponse(response, fallbackErrorMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  // Some environments may return JSON with a different content-type or as text.
  return response.text().then((text) => {
    try {
      return JSON.parse(text);
    } catch (err) {
      console.warn('[MicroCasePage] No JSON body', err);
      throw new Error(fallbackErrorMessage);
    }
  }).catch(() => {
    throw new Error(fallbackErrorMessage);
  });
}