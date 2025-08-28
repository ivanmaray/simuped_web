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

  const [brief, setBrief] = useState(null);
  const [loadingBrief, setLoadingBrief] = useState(true);

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

      // 3b) Cargar case brief (pre-brief general)
      try {
        setLoadingBrief(true);
        const { data: b, error: bErr } = await supabase
          .from("case_briefs")
          .select("*")
          .eq("scenario_id", scenarioId)
          .maybeSingle();
        if (bErr) {
          console.warn("[Confirm] brief error (no bloqueante):", bErr);
          setBrief(null);
        } else {
          setBrief(b || null);
        }
      } finally {
        setLoadingBrief(false);
      }

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

        {/* PRE-BRIEF GENERAL (reglas, objetivos y evaluación) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white grid place-items-center">ℹ️</div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-slate-900">Introducción</h2>
              <p className="text-sm text-slate-600 mt-1">
                Este es un entorno seguro de aprendizaje. Puedes equivocarte: lo importante es el proceso y el razonamiento clínico.
              </p>
              <div className="mt-3 grid sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Objetivo docente</div>
                  <ul className="mt-1 text-sm text-slate-700 list-disc pl-5">
                    {brief?.learning_objective
                      ? <li>{brief.learning_objective}</li>
                      : <li>{scenario?.title || "Revisión de un caso clínico"}</li>}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Reglas de la simulación</div>
                  <ul className="mt-1 text-sm text-slate-700 list-disc pl-5">
                    <li>Algunos pasos contienen preguntas <span className="font-medium">críticas</span>.</li>
                    <li>Puedes pedir <span className="font-medium">pistas</span> (si están disponibles); restan puntuación.</li>
                    <li>En ciertos pasos verás <span className="font-medium">urgencia</span> y límite de tiempo.</li>
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Criterios de evaluación</div>
                  <ul className="mt-1 text-sm text-slate-700 list-disc pl-5">
                    <li>Nota = % aciertos – penalización por pistas.</li>
                    <li>Se señalarán las <span className="font-medium">preguntas críticas falladas</span> en el debrief.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          {/* Objetivos por rol */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Objetivos por rol</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">Médico</div>
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {(brief?.objectives?.MED || []).map((line, i) => <li key={i}>{line}</li>)}
                  {!((brief?.objectives?.MED || []).length) && <li className="text-slate-500">—</li>}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">Enfermería</div>
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {(brief?.objectives?.NUR || []).map((line, i) => <li key={i}>{line}</li>)}
                  {!((brief?.objectives?.NUR || []).length) && <li className="text-slate-500">—</li>}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">Farmacia</div>
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {(brief?.objectives?.PHARM || []).map((line, i) => <li key={i}>{line}</li>)}
                  {!((brief?.objectives?.PHARM || []).length) && <li className="text-slate-500">—</li>}
                </ul>
              </div>
            </div>
          </div>
          {/* Acciones críticas */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Acciones críticas del caso</h3>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
              {(brief?.critical_actions || []).map((r, i) => (
                <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">⚠️ {r}</li>
              ))}
              {!brief?.critical_actions?.length && <li className="text-slate-500">—</li>}
            </ul>
          </div>
          {/* Competencias */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Competencias del escenario</h3>
            <ul className="grid sm:grid-cols-3 gap-2 text-sm text-slate-700">
              {(brief?.competencies || []).map((c, i) => (
                <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">{c}</li>
              ))}
              {!brief?.competencies?.length && <li className="text-slate-500">—</li>}
            </ul>
          </div>
        </section>

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