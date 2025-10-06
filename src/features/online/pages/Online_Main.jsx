// src/pages/Simulacion.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";


console.debug("[Simulacion] componente cargado");

const ROLES_VALIDOS = ["medico", "enfermeria", "farmacia"];
const MAX_ATTEMPTS = 3; // denominador para "Intentos usados"
const NEW_THRESHOLD_DAYS = 30;

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

function HeroStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-8 w-8 rounded-xl bg-white/15 grid place-items-center">
          {Icon ? <Icon className="h-4 w-4 text-white/90" /> : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
          <p className="text-xl font-semibold text-white leading-tight">{value ?? 0}</p>
        </div>
      </div>
    </div>
  );
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
  const [estado, setEstado] = useState("");
  const [loadingEsc, setLoadingEsc] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const estadosDisponibles = useMemo(() => {
    return Object.keys(estadoStyles || {}).map((key) => ({
      value: key.toLowerCase(),
      label: estadoStyles[key]?.label || key,
    }));
  }, []);

  const recomendados = useMemo(() => {
    const items = [];
    for (const esc of escenarios) {
      const stat = attemptStats[esc.id];
      if (!stat) continue;
      const count = stat.count ?? 0;
      const avg = typeof stat.avg === 'number' ? stat.avg : null;
      const hasOpen = Boolean(stat.openAttemptId);
      const needsScore = avg != null && avg < 70;
      const needsCompletion = count > 0 && count < MAX_ATTEMPTS;
      if (!hasOpen && !needsScore && !needsCompletion) continue;

      const priority = (hasOpen ? 0 : 200) + (needsScore ? avg ?? 100 : 300) + (needsCompletion ? 0 : 100) + count;
      items.push({ esc, stat, avg, hasOpen, needsScore, needsCompletion, priority });
    }

    return items
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 4);
  }, [escenarios, attemptStats]);

  const resetFilters = () => {
    setQ("");
    setNivel("");
    setModo("online");
    setCategoria("");
    setEstado("");
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      setFiltersOpen(true);
    }
  }, []);

  // Filtro en cliente (asegura orden de hooks estable)
  const filtrados = useMemo(() => {
    return escenarios.filter((e) => {
      const cats = e.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
      const matchQ = !q || e.title?.toLowerCase().includes(q.trim().toLowerCase()) || e.summary?.toLowerCase().includes(q.trim().toLowerCase());
      const matchNivel = !nivel || String(e.level || '').toLowerCase() === nivel;
      const modeArr = Array.isArray(e.mode) ? e.mode : (e.mode ? [e.mode] : []);
      const matchModo = !modo || modeArr.map(m => String(m).toLowerCase()).includes(modo);
      const matchCat   = !categoria || cats.includes(categoria);
      const matchEstado = !estado || String(e.status || '').toLowerCase() === estado;
      return matchQ && matchNivel && matchModo && matchCat && matchEstado;
    });
  }, [escenarios, q, nivel, modo, categoria, estado]);

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

  const totalEscenarios = escenarios.length;
  const totalIntentos = Object.values(attemptStats).reduce((acc, stat) => acc + (stat?.count ?? 0), 0);
  const escenariosCompletados = Object.values(attemptStats).filter((stat) => (stat?.count ?? 0) >= MAX_ATTEMPTS).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-6xl mx-auto px-5 py-12 text-white relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-white/70 text-sm uppercase tracking-wide">Área de entrenamiento</p>
              <h1 className="text-3xl md:text-4xl font-semibold mt-1">Simulación online</h1>
              <p className="opacity-95 mt-3 text-lg max-w-xl">
                Explora escenarios interactivos, continúa intentos activos y refuerza tus decisiones clínicas paso a paso.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <HeroStat label="Escenarios disponibles" value={totalEscenarios} icon={AdjustmentsHorizontalIcon} />
              <HeroStat label="Escenarios completados" value={escenariosCompletados} icon={CheckCircleIcon} />
              <HeroStat label="Intentos registrados" value={totalIntentos} icon={ClockIcon} />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {errorMsg && (
          <div className="mb-4 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 text-sm rounded-lg">
            {errorMsg}
          </div>
        )}
        <section className="mb-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_40px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-900/5 text-slate-900 grid place-items-center">
                  <AdjustmentsHorizontalIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Filtrar escenarios</h2>
                  <p className="text-sm text-slate-500">Combina criterios para encontrar la simulación que necesitas.</p>
                </div>
              </div>
              <button
                type="button"
                className="md:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                onClick={() => setFiltersOpen((prev) => !prev)}
              >
                {filtersOpen ? "Ocultar" : "Mostrar"}
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            <div className={`${filtersOpen ? "grid" : "hidden"} md:grid grid-cols-1 gap-4 border-b border-slate-100 px-5 py-5 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]`}
            >
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Búsqueda</span>
                <div className="mt-1 relative flex items-center">
                  <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-slate-400" />
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Pulso, shock, farmacoterapia…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/70 focus:border-transparent"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Nivel</span>
                <select
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/70 focus:border-transparent"
                >
                  <option value="">Todos los niveles</option>
                  <option value="basico">Básico</option>
                  <option value="medio">Medio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Modo</span>
                <select
                  value={modo}
                  onChange={(e) => setModo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/70 focus:border-transparent"
                >
                  <option value="">Todos los modos</option>
                  <option value="online">Online</option>
                  <option value="presencial">Presencial</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Categoría</span>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/70 focus:border-transparent"
                >
                  <option value="">Todas las categorías</option>
                  {categoriasDisponibles.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Estado</span>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/70 focus:border-transparent"
                >
                  <option value="">Todos los estados</option>
                  {estadosDisponibles.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className={`${filtersOpen ? "flex" : "hidden"} md:flex items-center justify-end gap-3 px-5 py-4`}>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </section>

        {recomendados.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="text-lg font-semibold text-slate-800">Recomendados para retomar</h3>
              <span className="text-xs uppercase tracking-wide text-slate-400 hidden sm:inline">Basado en tus intentos recientes</span>
            </div>
            <div className="relative -mx-5 md:mx-0">
              <div className="flex gap-4 overflow-x-auto px-5 md:px-0 pb-1">
                {recomendados.map(({ esc, stat, avg, hasOpen, needsScore, needsCompletion }) => {
                  const reasonChips = [
                    hasOpen ? "Intento activo" : null,
                    needsScore ? "Reforzar nota" : null,
                    needsCompletion ? "Quedan intentos" : null,
                  ].filter(Boolean);
                  return (
                    <article
                      key={`reco-${esc.id}`}
                      className="min-w-[240px] flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_-28px_rgba(15,23,42,0.45)]"
                    >
                      <h4 className="text-base font-semibold text-slate-900 line-clamp-2">{esc.title || "Escenario"}</h4>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-3">{esc.summary || "Refuerza este escenario para consolidar decisiones clave."}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
                        {reasonChips.map((reason) => (
                          <span key={reason} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                            {reason}
                          </span>
                        ))}
                        {avg != null && !needsScore && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1">
                            Nota {avg.toFixed(0)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0A3D91] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#0A3D91]/90"
                        onClick={() => {
                          if (hasOpen && stat.openAttemptId) {
                            navigate(`/simulacion/${esc.id}?attempt=${stat.openAttemptId}`);
                          } else {
                            navigate(`/simulacion/${esc.id}/confirm`);
                          }
                        }}
                      >
                        Continuar
                        <ArrowRightIcon className="h-4 w-4" />
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {!loadingEsc && filtrados.length === 0 && (
            <div className="col-span-full text-slate-600">No hay escenarios que coincidan.</div>
          )}

          {loadingEsc && Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="h-64 rounded-3xl border border-white/80 bg-white/70 p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.25)] animate-pulse"
            >
              <div className="h-5 w-24 rounded-full bg-slate-200/80" />
              <div className="mt-4 h-6 w-3/4 rounded bg-slate-200/70" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded bg-slate-200/60" />
                <div className="h-3 w-5/6 rounded bg-slate-200/50" />
              </div>
              <div className="mt-6 flex gap-2">
                <div className="h-6 w-20 rounded-full bg-slate-200/50" />
                <div className="h-6 w-24 rounded-full bg-slate-200/40" />
              </div>
              <div className="mt-6 h-8 w-32 rounded bg-slate-200/60" />
            </div>
          ))}

          {!loadingEsc && filtrados.map((esc) => {
            const cats = esc.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
            const estado = esc.status || "Disponible";
            const estadoStyle = estadoStyles[estado] || { label: estado, color: "bg-gray-100 text-gray-800", clickable: true };
            const isClickable = estadoStyle.clickable;
            const stat = attemptStats[esc.id];
            const notaMedia = stat?.scored ? stat.avg.toFixed(1) : null;
            const modeArr = Array.isArray(esc.mode) ? esc.mode : (esc.mode ? [esc.mode] : []);
            const createdAt = esc.created_at ? new Date(esc.created_at) : null;
            const isNuevo = createdAt ? ((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) <= NEW_THRESHOLD_DAYS : false;
            return (
              <article
                key={esc.id}
                className={`group relative overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_-28px_rgba(15,23,42,0.5)] ${!isClickable ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => { if (isClickable) navigate(`/simulacion/${esc.id}/confirm`); }}
              >
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-[#0A3D91]/8 via-transparent to-transparent" aria-hidden="true" />
                <div className="relative z-10 flex flex-col h-full gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 whitespace-nowrap sm:flex-nowrap flex-wrap">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#0A3D91]/10 px-3 py-1 text-xs font-medium text-[#0A3D91]">
                          <AcademicCapIcon className="h-4 w-4" />
                          Escenario clínico
                        </span>
                        {isNuevo && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                            Nuevo
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-slate-900 group-hover:underline decoration-[#0A3D91]/40">
                        {esc.title || "Escenario sin título"}
                      </h3>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {modeArr.map((m) => {
                        const k = String(m || '').toLowerCase();
                        const label = k === 'online' ? 'Online' : k === 'presencial' ? 'Presencial' : (m || '');
                        return (
                          <span
                            key={label}
                            className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/80 ring-1 ring-slate-200 text-slate-700"
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed max-h-20 overflow-hidden">
                    {esc.summary || "Sin descripción disponible."}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 transition-colors group-hover:bg-slate-900/10">
                      Nivel {formatLevel(esc.level) || "—"}
                    </span>
                    {cats.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 rounded-full bg-[#0A3D91]/10 text-[#0A3D91] px-2.5 py-1 transition-colors group-hover:bg-[#0A3D91]/15"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${estadoStyle.color}`}>
                      <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" />
                      {estadoStyle.label}
                    </span>
                    {isClickable && (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-[#0A3D91]">
                        Iniciar
                        <ArrowRightIcon className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  {stat && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <p className="font-medium text-slate-600">
                        Intentos usados: {stat.count}/{MAX_ATTEMPTS}{stat.openAttemptId ? " · intento activo" : ""}
                        {notaMedia ? ` · nota media ${notaMedia}/100` : ""}
                      </p>
                      {stat.openAttemptId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/simulacion/${esc.id}?attempt=${stat.openAttemptId}`); }}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
                        >
                          Reanudar intento
                          <ClockIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
