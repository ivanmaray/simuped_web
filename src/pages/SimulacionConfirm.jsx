// src/pages/SimulacionConfirm.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

const MAX_ATTEMPTS = 3;
const DEFAULT_LIMIT_SECS = 900; // 15 minutos por intento

function formatLevel(level) {
  const key = String(level || "").toLowerCase();
  const map = { basico: "Básico", básico: "Básico", medio: "Medio", avanzado: "Avanzado" };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : "");
}
function formatMode(mode) {
  const key = String(mode || "").toLowerCase();
  const map = { online: "Online", presencial: "Presencial" };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : "");
}
function formatRole(rol) {
  const key = String(rol || "").toLowerCase();
  if (key.includes("medic")) return "Médico";
  if (key.includes("enfer")) return "Enfermería";
  if (key.includes("farm")) return "Farmacia";
  return key ? key[0].toUpperCase() + key.slice(1) : "";
}
function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (!s) return { text: "", className: "" };
  if (s.includes("disponible")) {
    return { text: "Disponible", className: "bg-emerald-100 text-emerald-700 ring-emerald-200" };
  }
  if (s.includes("sin iniciar")) {
    return { text: "En construcción: sin iniciar", className: "bg-red-100 text-red-700 ring-red-200" };
  }
  if (s.includes("en proceso") || s.includes("proceso")) {
    return { text: "En construcción: en proceso", className: "bg-amber-100 text-amber-700 ring-amber-200" };
  }
  // genérico
  return { text: status, className: "bg-slate-100 text-slate-700 ring-slate-200" };
}

export default function SimulacionConfirm() {
  const navigate = useNavigate();
  const { id } = useParams(); // scenario id (string)
  const scenarioId = Number(id);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState({ nombre: "", rol: "" });
  const [esAdmin, setEsAdmin] = useState(false);

  const [scenario, setScenario] = useState(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [openAttemptId, setOpenAttemptId] = useState(null);
  const [forceNew, setForceNew] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(15); // solo para admins

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setErrorMsg("");

      // 1) Sesión
      const { data: sdata, error: sErr } = await supabase.auth.getSession();
      if (sErr) console.error("[Confirm] getSession error:", sErr);
      const sess = sdata?.session ?? null;

      if (!mounted) return;
      setSession(sess);

      if (!sess) {
        setLoading(false);
        // No sesión: vuelve a landing
        navigate("/", { replace: true });
        return;
      }

      // 2) Perfil (para mostrar rol en cabecera)
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("nombre, rol, is_admin")
        .eq("id", sess.user.id)
        .maybeSingle();
      if (pErr) {
        console.warn("[Confirm] perfiles error (no bloqueante):", pErr);
      } else {
        setPerfil({
          nombre: prof?.nombre ?? "",
          rol: prof?.rol ?? (sess.user?.user_metadata?.rol ?? ""),
        });
        setEsAdmin(!!prof?.is_admin); // true si is_admin es true
      }

      // 3) Cargar escenario
      const { data: esc, error: eErr } = await supabase
        .from("scenarios")
        .select("id, title, summary, level, mode, status")
        .eq("id", scenarioId)
        .maybeSingle();

      if (!mounted) return;

      if (eErr) {
        console.error("[Confirm] escenario error:", eErr);
        setErrorMsg(eErr.message || "No se pudo cargar el escenario.");
        setScenario(null);
        setLoading(false);
        return;
      }
      if (!esc) {
        setErrorMsg("Escenario no encontrado.");
        setScenario(null);
        setLoading(false);
        return;
      }
      setScenario(esc);

      // 4) Contar intentos del usuario para este escenario
      const { count, error: cErr } = await supabase
        .from("attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", sess.user.id)
        .eq("scenario_id", scenarioId);

      if (!mounted) return;

      if (cErr) {
        console.error("[Confirm] attempts count error:", cErr);
        setErrorMsg(cErr.message || "No se pudieron obtener los intentos.");
        setAttemptsCount(0);
      } else {
        setAttemptsCount(count ?? 0);
      }

      // 5) Intento abierto (para reanudar)
      const { data: openAttempt, error: oaErr } = await supabase
        .from("attempts")
        .select("id")
        .eq("user_id", sess.user.id)
        .eq("scenario_id", scenarioId)
        .is("finished_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (oaErr) {
        console.warn("[Confirm] open attempt check error:", oaErr);
        setOpenAttemptId(null);
      } else {
        setOpenAttemptId(openAttempt?.id ?? null);
      }

      setLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!mounted) return;
      setSession(sess ?? null);
      if (!sess) navigate("/", { replace: true });
    });

    return () => {
      mounted = false;
      try {
        listener?.subscription?.unsubscribe?.();
      } catch {}
    };
  }, [navigate, scenarioId]);

  const alreadyMaxed = !esAdmin && attemptsCount >= MAX_ATTEMPTS && !openAttemptId;
  const status = scenario?.status || "";
  const badge = statusBadge(status);

  const isBlockedByStatus =
    status.toLowerCase().startsWith("en construcción") &&
    status.toLowerCase().includes("sin iniciar");

  async function handleStart() {
    setErrorMsg("");
    if (!session || !scenarioId) return;
    if (alreadyMaxed) {
      setErrorMsg(`Has alcanzado el máximo de ${MAX_ATTEMPTS} intentos para este escenario.`);
      return;
    }
    if (isBlockedByStatus) {
      setErrorMsg("Este escenario está marcado como “En construcción: sin iniciar”. Todavía no se puede comenzar.");
      return;
    }

    // Si existe un intento abierto y NO forzamos nuevo, reanudar
    if (openAttemptId && !forceNew) {
      navigate(`/simulacion/${scenarioId}?attempt=${openAttemptId}`, { replace: true });
      return;
    }

    setCreating(true);
    try {
      const now = new Date();
      const limitSecs = esAdmin ? Math.max(1, Number(customMinutes) || 0) * 60 : DEFAULT_LIMIT_SECS;
      const expires = new Date(now.getTime() + limitSecs * 1000);

      const { data, error } = await supabase
        .from("attempts")
        .insert({
          user_id: session.user.id,
          scenario_id: scenarioId,
          started_at: now.toISOString(),
          expires_at: expires.toISOString(),
          time_limit: limitSecs,
          status: "en curso",
        })
        .select("id")
        .single();

      if (error) {
        console.error("[Confirm] insert attempt error:", error);
        setErrorMsg(error.message || "No se pudo crear el intento.");
        setCreating(false);
        return;
      }

      const attemptId = data?.id;
      if (!attemptId) {
        setErrorMsg("No se pudo crear el intento (sin ID).");
        setCreating(false);
        return;
      }

      // Redirigir al detalle con el attempt en la URL
      navigate(`/simulacion/${scenarioId}?attempt=${attemptId}`, { replace: true });
    } catch (e) {
      console.error("[Confirm] unexpected error:", e);
      setErrorMsg("Se produjo un error inesperado.");
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <div className="max-w-3xl mx-auto px-5 py-16">
          <div className="text-slate-600">Cargando…</div>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <div className="max-w-3xl mx-auto px-5 py-16">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            {errorMsg || "No se encontró el escenario."}
          </div>
          <Link to="/simulacion" className="inline-block mt-4 text-[#1a69b8] hover:underline">
            ← Volver a Simulación
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1] text-white">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <p className="opacity-95">{formatMode(scenario.mode)} • {formatLevel(scenario.level)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-semibold">{scenario.title}</h1>
            {perfil.rol ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/30 text-white/90 text-sm">
                Rol: {formatRole(perfil.rol)}
              </span>
            ) : null}
            {badge.text ? (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full ring-1 text-sm ${badge.className}`}>
                {badge.text}
              </span>
            ) : null}
          </div>
          {scenario.summary ? <p className="opacity-95 mt-1">{scenario.summary}</p> : null}
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-5 py-10">
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
            {errorMsg}
          </div>
        )}

        {/* Aviso */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-2">Antes de comenzar</h2>
          <p className="text-slate-700">
            Al iniciar este escenario se consumirá <b>1 intento</b>. Dispones de un máximo de{" "}
            <b>{MAX_ATTEMPTS}</b> intentos por escenario. Tus respuestas quedarán registradas
            para consultar tu desempeño posteriormente.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
              Intentos usados: {attemptsCount}/{MAX_ATTEMPTS}{openAttemptId ? " · tienes un intento en curso" : ""}
            </span>
            {badge.text && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full ring-1 text-sm ${badge.className}`}>
                {badge.text}
              </span>
            )}
          </div>

          {isBlockedByStatus && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
              Este escenario está marcado como <b>“En construcción: sin iniciar”</b>. Aún no está disponible.
            </div>
          )}

          {alreadyMaxed && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
              Has alcanzado el máximo de intentos para este escenario.
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleStart}
              disabled={creating || alreadyMaxed || isBlockedByStatus}
              className={`px-4 py-2 rounded-lg text-white transition
                ${creating || alreadyMaxed || isBlockedByStatus
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-[#1a69b8] hover:bg-[#155a9d]"
                }`}
            >
              {creating ? "Creando intento…" : (openAttemptId ? "Reanudar intento" : "Comenzar ahora")}
            </button>

            <Link
              to="/simulacion"
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition"
            >
              Volver
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}