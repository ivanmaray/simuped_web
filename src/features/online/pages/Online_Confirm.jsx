// Este componente maneja creación/reanudación de intentos SIN RPC (opción B): validamos intento abierto, si no existe insertamos, y si hay 23505 recuperamos el existente.
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";

function renderStars(weight) {
  // Map numeric weight (e.g., 0-100) to 1-5 stars. Default to 3 if undefined.
  const w = Number.isFinite(Number(weight)) ? Number(weight) : 60;
  const stars = Math.max(1, Math.min(5, Math.round(w / 20)));
  const filled = "★".repeat(stars);
  const empty = "☆".repeat(5 - stars);
  return `${filled}${empty}`;
}

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
    return { text: "Disponible", className: "bg-[#0A3D91]/10 text-[#0A3D91] ring-[#0A3D91]/20" };
  }
  if (s.includes("sin iniciar")) {
    return { text: "En construcción: sin iniciar", className: "bg-slate-200 text-slate-600 ring-slate-300" };
  }
  if (s.includes("en proceso") || s.includes("proceso")) {
    return { text: "En construcción: en proceso", className: "bg-[#4FA3E3]/10 text-[#1E6ACB] ring-[#1E6ACB]/20" };
  }
  // genérico
  return { text: status, className: "bg-slate-100 text-slate-700 ring-slate-200" };
}

export default function Online_Confirm() {
  const navigate = useNavigate();
  const { id } = useParams(); // scenario id (string)
  const scenarioId = Number(id);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState({ nombre: "", rol: "" });
  const [esAdmin, setEsAdmin] = useState(false);
  const [userRole, setUserRole] = useState(""); // 'medico' | 'enfermeria' | 'farmacia'
  const [showAllObjectives, setShowAllObjectives] = useState(false);

  const [scenario, setScenario] = useState(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [openAttemptId, setOpenAttemptId] = useState(null);
  const [openAttemptLimitSecs, setOpenAttemptLimitSecs] = useState(null);
  const [customMinutes, setCustomMinutes] = useState("");

  const [brief, setBrief] = useState(null);
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  function checkBriefReady(brief) {
    const missing = [];
    if (!brief) {
      missing.push('brief');
      return { ready: false, missing };
    }
    const tri = brief.triangle || {};
    if (!tri.appearance || !tri.breathing || !tri.circulation) {
      missing.push('triangle');
    }
    const hasRedFlags = Array.isArray(brief.red_flags) && brief.red_flags.length > 0;
    const hasCriticalActions = Array.isArray(brief.critical_actions) && brief.critical_actions.length > 0;
    if (!hasRedFlags && !hasCriticalActions) {
      missing.push('alarm_signs');
    }
    return { ready: missing.length === 0, missing };
  }
  const briefCheck = checkBriefReady(brief);

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
        // Normalizar y guardar el rol del usuario para filtrar objetivos
        let r = (prof?.rol ?? (sess.user?.user_metadata?.rol ?? "")).toString().toLowerCase();
        if (r.includes("medic")) r = "medico";
        else if (r.includes("enfer")) r = "enfermeria";
        else if (r.includes("farm")) r = "farmacia";
        setUserRole(r);
      }

      // 3) Cargar escenario
      // Cargar escenario (no solicitar `time_limit_minutes` porque puede no existir en algunas migraciones)
      const { data: esc, error: eErr } = await supabase
        .from("scenarios")
        .select("id, title, summary, level, mode, status, estimated_minutes")
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

      // 3c) Cargar lecturas / bibliografía recomendada
      try {
        setLoadingResources(true);
        const { data: res, error: rErr } = await supabase
          .from("case_resources")
          .select("id, title, url, source, type, year, free_access, weight")
          .eq("scenario_id", scenarioId)
          .order("weight", { ascending: true })
          .limit(12);
        if (rErr) {
          console.warn("[Confirm] resources error (no bloqueante):", rErr);
          setResources([]);
        } else {
          setResources(res || []);
        }
      } finally {
        setLoadingResources(false);
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

        // 🔄 Reset por si venimos con estado previo en memoria
        setOpenAttemptId(null);

        // 🧹 Pre-clean: cerrar intentos "en curso" ya expirados (evita que aparezcan como activos)
        try {
          let nowRef = new Date();
          try {
            const { data: nowData } = await supabase.rpc("now_utc");
            if (nowData) nowRef = new Date(nowData);
          } catch { /* noop */ }
          await supabase
            .from("attempts")
            .update({ status: "finalizado", finished_at: nowRef.toISOString() })
            .eq("user_id", sess.user.id)
            .eq("scenario_id", scenarioId)
            .eq("status", "en curso")
            .is("finished_at", null)
            .not("expires_at", "is", null)
            .lte("expires_at", nowRef.toISOString());
        } catch { /* noop */ }
      }

      // 5) Intento abierto (para reanudar) — solo si está realmente en curso y no expirado
      const { data: openAttempt, error: oaErr } = await supabase
        .from("attempts")
        .select("id, status, started_at, expires_at, finished_at, time_limit")
        .eq("user_id", sess.user.id)
        .eq("scenario_id", scenarioId)
        .in("status", ["en_curso", "en curso"])
        .is("finished_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (oaErr) {
        console.warn("[Confirm] open attempt check error:", oaErr);
        setOpenAttemptId(null);
        setOpenAttemptLimitSecs(null);
      } else if (openAttempt && openAttempt.id) {
        // validar expiración con hora del servidor (si está disponible)
        let nowRef = new Date();
        try {
          const { data: nowData } = await supabase.rpc("now_utc");
          if (nowData) nowRef = new Date(nowData);
        } catch { /* noop */ }

        const exp = openAttempt.expires_at ? new Date(openAttempt.expires_at) : null;
        const notExpired = !!(exp && nowRef < exp);
        console.debug("[Confirm] openAttempt check:", {
          id: openAttempt.id,
          exp: openAttempt.expires_at,
          now: nowRef.toISOString(),
          notExpired,
          time_limit: openAttempt.time_limit,
        });

        if (notExpired) {
          setOpenAttemptId(openAttempt.id);   // reanudar solo si ya corría el tiempo
          const tl = Number(openAttempt.time_limit);
          setOpenAttemptLimitSecs(Number.isFinite(tl) && tl > 0 ? Math.floor(tl) : null);
        } else {
          setOpenAttemptId(null);             // si expires_at es null o pasado, no mostrar reanudar
          setOpenAttemptLimitSecs(null);
        }
      } else {
        setOpenAttemptId(null);
        setOpenAttemptLimitSecs(null);
      }

      setLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSess) => {
      if (!mounted) return;
      setSession(newSess ?? null);
      if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        navigate("/", { replace: true });
      } else {
        try { console.debug("[Confirm] auth state:", event, !!newSess); } catch {}
      }
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

  // Tiempo estimado base del escenario (prioridad: scenario.estimated_minutes > brief.estimated_minutes > 15)
  const baseEstimatedMinutes = (() => {
    const a = Number(scenario?.estimated_minutes);
    if (Number.isFinite(a) && a > 0) return a;
    const b = Number(brief?.estimated_minutes);
    if (Number.isFinite(b) && b > 0) return b;
    return 15;
  })();

  // Minutos efectivos que se mostrarán: si hay intento abierto con time_limit, usamos ese;
  // en caso contrario usamos la estimación base.
  const effectiveMinutes = (() => {
    const tl = Number(openAttemptLimitSecs);
    if (Number.isFinite(tl) && tl > 0) {
      return Math.max(1, Math.round(tl / 60));
    }
    return baseEstimatedMinutes;
  })();

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

    setCreating(true);
    // 🔧 Pre-clean: cerrar "abiertos" ya expirados (evita conflictos con el índice único)
    try {
      await supabase
        .from("attempts")
        .update({ status: "finalizado", finished_at: new Date().toISOString() })
        .eq("user_id", session.user.id)
        .eq("scenario_id", scenarioId)
        .eq("status", "en curso")
        .is("finished_at", null)
        .not("expires_at", "is", null)
        .lte("expires_at", new Date().toISOString());
    } catch { /* noop */ }
    try {
      // 0) Parámetros de tiempo
      let baseMinutes = baseEstimatedMinutes;
      if (esAdmin) {
        const nCustom = Number(customMinutes);
        if (Number.isFinite(nCustom) && nCustom > 0) {
          baseMinutes = Math.max(1, nCustom);
        }
      }
      const limitSecs = Math.max(60, Math.floor(baseMinutes * 60));

      // 1) Revalidar en servidor si hay un intento abierto (por seguridad frente a estados desfasados)
      const { data: open, error: openErr } = await supabase
        .from("attempts")
        .select("id, expires_at, finished_at")
        .eq("user_id", session.user.id)
        .eq("scenario_id", scenarioId)
        .in("status", ["en_curso", "en curso"])
        .is("finished_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!openErr && open?.id) {
        // Si ya existe un intento abierto (corriendo o pendiente), úsalo sin crear otro.
        navigate(`/simulacion/${scenarioId}?attempt=${open.id}`, { replace: true });
        return;
      }

      // 3) Crear intento nuevo
      const { data: inserted, error } = await supabase
        .from("attempts")
        .insert({
          user_id: session.user.id,
          scenario_id: scenarioId,
          time_limit: limitSecs,
          status: "en curso", // no fijamos started_at/expires_at aquí; el tiempo arranca en Online_Detalle
        })
        .select("id")
        .single();

      if (error) {
        if (String(error.code) === "23505") {
          console.debug("[Confirm] 23505: reuse existing open attempt (running or pending)");
          const { data: existing } = await supabase
            .from("attempts")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("scenario_id", scenarioId)
            .in("status", ["en_curso", "en curso"])
            .is("finished_at", null)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existing?.id) {
            navigate(`/simulacion/${scenarioId}?attempt=${existing.id}`, { replace: true });
            return;
          }
        }
        console.error("[Confirm] insert attempt error:", error);
        setErrorMsg(error.message || "No se pudo crear el intento.");
        setCreating(false);
        return;
      }

      navigate(`/simulacion/${scenarioId}?attempt=${inserted.id}`, { replace: true });
      return;
    } catch (e) {
      console.error("[Confirm] unexpected error:", e);
      setErrorMsg("Se produjo un error inesperado.");
      setCreating(false);
      return;
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
          <Link to="/simulacion" className="inline-block mt-4 text-[#0A3D91] hover:underline">
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
      <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <p className="opacity-95">{formatMode(scenario.mode)} • {formatLevel(scenario.level)} • ~{effectiveMinutes} min</p>
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

      <main className="max-w-6xl mx-auto px-5 py-10">

        {/* PRE-BRIEF GENERAL (reglas, objetivos y evaluación) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white grid place-items-center">ℹ️</div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Introducción {scenario?.title ? <span className="font-normal text-slate-600">· {scenario.title}</span> : null}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Este es un entorno seguro de aprendizaje. Puedes equivocarte: lo importante es el proceso y el razonamiento clínico.
              </p>
              <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 text-sky-900 p-3 text-sm">
                <div className="font-medium">¿Cómo funciona esta simulación?</div>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Primero verás el <b>briefing</b> del caso (evaluación inicial del paciente) con elementos interactivos.</li>
                  <li>Desde el momento en que se abre el briefing, <b>empieza a contar el tiempo</b> del intento.</li>
                  <li>Tras ese briefing, pasarás a las <b>preguntas por pasos</b> donde se evalúan tus decisiones.</li>
                </ul>
              </div>
              <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          {/* Objetivos por rol (con filtro por rol del usuario) */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">
                {showAllObjectives
                  ? "Objetivos por rol"
                  : userRole
                    ? `Objetivos de tu rol (${userRole === "medico" ? "Médico" : userRole === "enfermeria" ? "Enfermería" : "Farmacia"})`
                    : "Objetivos por rol"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAllObjectives(v => !v)}
                className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                title={showAllObjectives ? "Ver solo tu rol" : "Ver todos"}
              >
                {showAllObjectives ? "Ver solo mi rol" : "Ver todos"}
              </button>
            </div>

            {(() => {
              const roleKey =
                userRole === "medico" ? "MED" :
                userRole === "enfermeria" ? "NUR" :
                userRole === "farmacia" ? "PHARM" : null;

              if (!showAllObjectives && roleKey) {
                const title =
                  userRole === "medico" ? "Médico" :
                  userRole === "enfermeria" ? "Enfermería" : "Farmacia";
                const items = brief?.objectives?.[roleKey] || [];
                return (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="text-xs font-semibold text-slate-500 mb-1">{title}</div>
                    <ul className="list-disc pl-5 text-sm text-slate-700">
                      {items.length ? items.map((line, i) => <li key={i}>{line}</li>) : <li className="text-slate-500">—</li>}
                    </ul>
                  </div>
                );
              }

              // Ver todos
              return (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              );
            })()}
          </div>
          {/* Competencias */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Competencias del escenario</h3>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-slate-700">
              {(brief?.competencies || []).map((c, i) => {
                if (typeof c === 'string') {
                  return (
                    <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="font-medium">{c}</div>
                    </li>
                  );
                }
                const label = String(c?.label || '').trim();
                const expected = String(c?.expected || '').trim();
                const notes = String(c?.notes || '').trim();
                return (
                  <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="font-medium">{label || '—'}</div>
                    <div className="text-xs text-slate-600">Nivel esperado: {expected || '—'}</div>
                    {notes && <div className="text-xs text-slate-500 mt-1">{notes}</div>}
                  </li>
                );
              })}
              {!brief?.competencies?.length && <li className="text-slate-500">—</li>}
            </ul>
          </div>
        </section>

        {/* LECTURAS / BIBLIOGRAFÍA RECOMENDADA */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-[#0A3D91] text-white grid place-items-center">📚</div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Lecturas recomendadas <span className="font-normal text-slate-600">· antes de iniciar el caso</span>
              </h2>

              {loadingResources ? (
                <p className="mt-2 text-sm text-slate-600">Cargando recursos…</p>
              ) : (resources?.length ?? 0) === 0 ? (
                <p className="mt-2 text-sm text-slate-500">El autor del caso aún no ha añadido bibliografía aquí.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {resources.slice(0, 8).map((r) => (
                    <li key={r.id} className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[15px] font-medium text-[#0A3D91] hover:underline"
                            title={r.url}
                          >
                            {r.title}
                          </a>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {[
                              r.source || null,
                              r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) : null,
                              r.year || null,
                              r.free_access ? "Acceso libre" : null,
                            ].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <span
                          className="text-xs font-medium text-amber-600"
                          title={`Relevancia: ${renderStars(r.weight)} (${Number.isFinite(Number(r.weight)) ? Math.max(1, Math.min(5, Math.round(Number(r.weight) / 20))) : 3}/5)`}
                          aria-label="Relevancia"
                        >
                          {renderStars(r.weight)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
            Al iniciar este escenario se consumirá <b>1 intento</b> (el <b>tiempo comienza al pulsar “Comenzar ahora”</b>, no solamente al ver el briefing). Dispones de un máximo de <b>{MAX_ATTEMPTS}</b> intentos por escenario. Primero realizarás la <b>evaluación inicial del paciente</b> en el briefing y, a continuación, responderás a <b>preguntas por pasos</b>. Tus respuestas quedarán registradas para consultar tu desempeño posteriormente.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
              Intentos usados: {attemptsCount}/{MAX_ATTEMPTS}{openAttemptId ? " · intento activo" : ""}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
              Tiempo estimado: ~{effectiveMinutes} min
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
            {/* Si el briefing no está listo, enviamos al usuario a la pantalla de detalle (briefing).
                Si está listo, ejecutamos la creación/reanudación del intento. */}
            <button
              onClick={() => {
                if (!briefCheck.ready) {
                  try {
                        console.debug('[Confirm] brief incomplete - navigating to detalle', { scenarioId });
                        navigate(`/simulacion/${scenarioId}?view=briefing`);
                  } catch (e) {
                        console.warn('[Confirm] navigate failed, fallback to location.href', e);
                        window.location.href = `/simulacion/${scenarioId}?view=briefing`;
                  }
                  // fallback shortly after in case navigate didn't update (helps in some edge cases)
                  setTimeout(() => {
                        if (window.location.pathname + window.location.search !== `/simulacion/${scenarioId}?view=briefing`) {
                          window.location.href = `/simulacion/${scenarioId}?view=briefing`;
                    }
                  }, 80);
                  return;
                }
                handleStart();
              }}
              disabled={creating || alreadyMaxed || isBlockedByStatus}
              className={`px-4 py-2 rounded-lg transition ${
  creating || alreadyMaxed || isBlockedByStatus
    ? "bg-slate-400 cursor-not-allowed text-white"
    : "bg-[#4FA3E3] hover:bg-[#1E6ACB] text-slate-900 font-semibold hover:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6ACB]"
}`}
            >
              {creating
                ? "Creando intento…"
                : openAttemptId
                  ? "Reanudar intento"
                  : (!briefCheck.ready ? "Ver briefing" : "Comenzar ahora")}
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
