// src/pages/Simulacion.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";


console.debug("[Simulacion] componente cargado");

const ROLES_VALIDOS = ["medico", "enfermeria", "farmacia"];
const MAX_ATTEMPTS = 3; // denominador para "Intentos usados"

const estadoStyles = {
  "Disponible": { label: "Disponible", color: "bg-green-100 text-green-800", clickable: true },
  "En construcción: en proceso": { label: "En construcción: en proceso", color: "bg-yellow-100 text-yellow-800", clickable: true },
  "En construcción: sin iniciar": { label: "En construcción: sin iniciar", color: "bg-red-100 text-red-800", clickable: false },
};

function formatLevel(level) {
  const key = String(level || '').toLowerCase();
  const map = { basico: 'Básico', básico: 'Básico', medio: 'Medio', avanzado: 'Avanzado' };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : '');
}
function formatMode(modes) {
  const arr = Array.isArray(modes) ? modes : (modes ? [modes] : []);
  const map = { online: 'Online', presencial: 'Presencial' };
  return arr
    .map(m => String(m || '').toLowerCase())
    .filter(Boolean)
    .map(k => map[k] || (k ? k[0].toUpperCase() + k.slice(1) : ''))
    .join(' · ');
}

export default function Online_Main() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [rol, setRol] = useState("");
  const [roleChecked, setRoleChecked] = useState(false);

  // Escenarios + filtros
  const [escenarios, setEscenarios] = useState([]);
  const [q, setQ] = useState("");
  const [nivel, setNivel] = useState("");       // basico|medio|avanzado
  const [modo, setModo] = useState("online");   // por defecto 'online'
  const [categoria, setCategoria] = useState(""); // nombre de categoría
  const [loadingEsc, setLoadingEsc] = useState(false);

  const [attemptStats, setAttemptStats] = useState({}); // { [scenario_id]: { count, scored, avg } }

  // Cuenta atrás para redirigir al perfil si falta el rol
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Lista de categorías (para el select)
  const categoriasDisponibles = useMemo(() => {
    const set = new Set();
    for (const e of escenarios) {
      const cats = e.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
      cats.forEach(c => set.add(c));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [escenarios]);

  // Filtro en cliente (asegura orden de hooks estable)
  const filtrados = useMemo(() => {
    return escenarios.filter((e) => {
      const cats = e.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
      const matchQ = !q || e.title?.toLowerCase().includes(q.trim().toLowerCase()) || e.summary?.toLowerCase().includes(q.trim().toLowerCase());
      const matchNivel = !nivel || String(e.level || '').toLowerCase() === nivel;
      const modeArr = Array.isArray(e.mode) ? e.mode : (e.mode ? [e.mode] : []);
      const matchModo = !modo || modeArr.map(m => String(m).toLowerCase()).includes(modo);
      const matchCat   = !categoria || cats.includes(categoria);
      return matchQ && matchNivel && matchModo && matchCat;
    });
  }, [escenarios, q, nivel, modo, categoria]);

  useEffect(() => {
    let mounted = true;

    async function cargarIntentos(userId) {
      try {
        const { data, error } = await supabase
          .from("attempts")
          .select("id, scenario_id, score, status, started_at, expires_at")
          .eq("user_id", userId)
          .order("started_at", { ascending: false });
        if (error) {
          console.error("[Simulacion] cargarIntentos error:", error);
          setAttemptStats({});
          return;
        }
        const now = new Date();
        const by = {};
        for (const row of data || []) {
          const sid = row.scenario_id;
          if (!by[sid]) by[sid] = { count: 0, scored: 0, sum: 0, openAttemptId: null };
          by[sid].count += 1;
          const s = Number(row.score);
          if (!Number.isNaN(s)) {
            by[sid].scored += 1;
            by[sid].sum += s;
          }
          const status = String(row.status || "").toLowerCase();
          const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
          const notExpired = !expiresAt || now < expiresAt;
          const isOpen = status === "en curso" && notExpired;
          if (isOpen && !by[sid].openAttemptId) {
            by[sid].openAttemptId = row.id; // first in order is the most recent
          }
        }
        const stats = {};
        for (const [sid, v] of Object.entries(by)) {
          stats[sid] = {
            count: v.count,
            scored: v.scored,
            avg: v.scored > 0 ? v.sum / v.scored : null,
            openAttemptId: v.openAttemptId,
          };
        }
        setAttemptStats(stats);
      } catch (e) {
        console.error("[Simulacion] excepción cargarIntentos:", e);
        setAttemptStats({});
      }
    }

    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        console.error("[Simulacion] getSession error:", error);
        setErrorMsg(error.message || "Error obteniendo sesión");
      }
      const sess = data?.session ?? null;
      setSession(sess);
      if (sess) {
        // Cargar el rol del perfil
        try {
          const { data: prof, error: perr } = await supabase
            .from("profiles")
            .select("rol")
            .eq("id", sess.user.id)
            .maybeSingle();

          if (perr) {
            console.error("[Simulacion] cargar rol error:", perr);
          }
          const r = (prof?.rol || "").toString().toLowerCase();
          setRol(r);
        } catch (e) {
          console.error("[Simulacion] excepción cargando rol:", e);
        } finally {
          setRoleChecked(true);
        }
      } else {
        setRoleChecked(true);
      }
      if (!sess) {
        setLoading(false);
        return;
      }

      await cargarEscenarios();
      await cargarIntentos(sess.user.id);
      setLoading(false);
    }

    async function cargarEscenarios() {
      setLoadingEsc(true);
      const { data, error } = await supabase
        .from("scenarios")
        .select(`
          id, title, summary, level, mode, created_at, status,
          scenario_categories (
            categories ( name )
          )
        `)
        .order("title", { ascending: true });

      if (error) {
        console.error("[Simulacion] cargarEscenarios error:", error);
        setErrorMsg(error.message || "Error cargando escenarios");
        setEscenarios([]);
      } else {
        // Custom sort: status priority then title
        const statusPriority = {
          "Disponible": 1,
          "En construcción: en proceso": 2,
          "En construcción: sin iniciar": 3,
        };
        const sorted = (data || []).slice().sort((a, b) => {
          const pa = statusPriority[a.status] ?? 99;
          const pb = statusPriority[b.status] ?? 99;
          if (pa !== pb) return pa - pb;
          // fallback: alphabetic by title
          const ta = (a.title || "").toLocaleLowerCase("es");
          const tb = (b.title || "").toLocaleLowerCase("es");
          return ta.localeCompare(tb, "es");
        });
        setEscenarios(sorted);
      }
      setLoadingEsc(false);
    }

    init();
    const { data: listener } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!mounted) return;
      setSession(sess ?? null);
    });
    return () => {
      mounted = false;
      try { listener?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  // Si falta el rol, arrancamos una pequeña cuenta atrás
  useEffect(() => {
    if (session && roleChecked && (!rol || !ROLES_VALIDOS.includes(rol))) {
      setRedirectCountdown(5);
      const t = setInterval(() => {
        setRedirectCountdown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
      return () => clearInterval(t);
    }
  }, [session, roleChecked, rol]);

  // Cuando llega a 0, navegamos a /perfil automáticamente
  useEffect(() => {
    if (redirectCountdown === 0 && session && roleChecked && (!rol || !ROLES_VALIDOS.includes(rol))) {
      navigate("/perfil", { replace: true });
    }
  }, [redirectCountdown, session, roleChecked, rol, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando…</div>
      </div>
    );
  }
  // Si ya sabemos el rol y no es válido, mostramos aviso y CTA para completar perfil
  if (session && roleChecked && (!rol || !ROLES_VALIDOS.includes(rol))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-5">
        <div className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-slate-900">Rol no seleccionado</h1>
          <p className="text-slate-700 mt-2">
            Para poder realizar simulaciones, debes indicar tu perfil profesional
            (<span className="font-medium">Médico</span>, <span className="font-medium">Enfermería</span> o <span className="font-medium">Farmacia</span>).
          </p>
          <p className="text-slate-600 mt-2">
            Te redirigiremos a <span className="font-medium">Mi perfil</span> para completarlo.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/perfil")}
              className="px-4 py-2 rounded-lg bg-[#1d99bf] text-white hover:opacity-90 transition"
            >
              Ir a mi perfil ahora
            </button>
            <span className="text-sm text-slate-500">
              Redirigiendo en {redirectCountdown}s…
            </span>
          </div>
        </div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-800">No has iniciado sesión</h1>
          <p className="text-slate-600 mt-2">Por favor, vuelve a la página de inicio para acceder.</p>
          <a href="/" className="inline-block mt-4 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100">Ir al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]">
        <div className="max-w-6xl mx-auto px-5 py-10 text-white">
          <h1 className="text-3xl md:text-4xl font-semibold">Simulación online</h1>
          <p className="opacity-95 mt-1">Escoge un escenario y empieza la práctica.</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {errorMsg && (
          <div className="mb-4 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 text-sm rounded-lg">
            {errorMsg}
          </div>
        )}

        <div className="mb-4 flex flex-col md:flex-row gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título o resumen…"
            className="w-full md:flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
          />
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Todos los niveles</option>
            <option value="basico">Básico</option>
            <option value="medio">Medio</option>
            <option value="avanzado">Avanzado</option>
          </select>
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Todos los modos</option>
            <option value="online">Online</option>
            <option value="presencial">Presencial</option>
          </select>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Todas las categorías</option>
            {categoriasDisponibles.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loadingEsc && (
            <div className="col-span-full text-slate-600">Cargando escenarios…</div>
          )}

          {!loadingEsc && filtrados.length === 0 && (
            <div className="col-span-full text-slate-600">No hay escenarios que coincidan.</div>
          )}

          {!loadingEsc && filtrados.map((esc) => {
            const cats = esc.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
            const estado = esc.status || "Disponible";
            const estadoStyle = estadoStyles[estado] || { label: estado, color: "bg-gray-100 text-gray-800", clickable: true };
            const isClickable = estadoStyle.clickable;
            return (
              <article
                key={esc.id}
                className={`group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition ${!isClickable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => { if (isClickable) navigate(`/simulacion/${esc.id}/confirm`); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:underline">
                    {esc.title || "Escenario sin título"}
                  </h3>
                  <div className="flex items-center gap-1">
                    {(Array.isArray(esc.mode) ? esc.mode : (esc.mode ? [esc.mode] : []))
                      .map((m) => {
                        const k = String(m || '').toLowerCase();
                        const label = k === 'online' ? 'Online' : k === 'presencial' ? 'Presencial' : (m || '');
                        return (
                          <span
                            key={label}
                            className="px-2 py-0.5 rounded-full text-[11px] bg-white ring-1 ring-slate-200 text-slate-700 whitespace-nowrap"
                          >
                            {label}
                          </span>
                        );
                      })}
                  </div>
                </div>
                <p className="text-slate-600 mt-2 overflow-hidden text-ellipsis">{esc.summary}</p>
                <div className="mt-3 flex items-center gap-2 text-sm flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {formatLevel(esc.level)}
                  </span>
                  {cats.length > 0 && <span className="text-slate-400">•</span>}
                  <span className="text-slate-600 truncate">{cats.join(" · ")}</span>
                </div>
                <div className="mt-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${estadoStyle.color}`}>
                    {estadoStyle.label}
                  </span>
                </div>
                {/* CTA to reanudar open attempt */}
                {attemptStats[esc.id]?.openAttemptId && (
                  <div className="mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/simulacion/${esc.id}?attempt=${attemptStats[esc.id].openAttemptId}`); }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-slate-900 text-white hover:opacity-90"
                      title="Reanudar tu intento activo"
                    >
                      ⏱️ Reanudar intento
                    </button>
                  </div>
                )}
                {attemptStats[esc.id] && (
                  <p className="mt-2 text-xs text-slate-500">
                    Intentos usados: {attemptStats[esc.id].count}/{MAX_ATTEMPTS}{attemptStats[esc.id].openAttemptId ? " · intento activo" : ""}
                    {attemptStats[esc.id].scored > 0 && (
                      <>
                        {" · "}Nota media: {attemptStats[esc.id].avg.toFixed(1)}/100
                      </>
                    )}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}