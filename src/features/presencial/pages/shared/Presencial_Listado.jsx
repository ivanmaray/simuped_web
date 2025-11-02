// src/pages/PresencialListado.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../../../supabaseClient";
import Navbar from "../../../../components/Navbar.jsx";
import {
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

console.debug("[PresencialListado] componente cargado");

const estadoStyles = {
  "Disponible": { label: "Disponible", color: "bg-[#0A3D91]/10 text-[#0A3D91] font-medium", clickable: true },
  "En construcción: en proceso": { label: "En construcción: en proceso", color: "bg-[#4FA3E3]/10 text-[#1E6ACB] font-medium", clickable: true },
  "En construcción: sin iniciar": {
    label: "En construcción: sin iniciar",
    color: "bg-slate-200 text-slate-600 font-medium",
    clickable: false
  },
};

function formatLevel(level) {
  const key = String(level || "").toLowerCase();
  const map = { basico: "Básico", básico: "Básico", medio: "Medio", avanzado: "Avanzado" };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : "");
}

function HeroStat({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-10 w-10 rounded-xl bg-white/15 grid place-items-center">
          {Icon ? <Icon className="h-5 w-5 text-white/90" /> : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
          <p className="text-2xl font-semibold text-white leading-tight">{value}</p>
          {helper ? <p className="text-[11px] text-white/70 mt-1">{helper}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function Presencial_Listado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDual = (searchParams.get('flow') || '').toLowerCase() === 'dual';

  // Escenarios + filtros
  const [escenarios, setEscenarios] = useState([]);
  const [q, setQ] = useState("");
  const [nivel, setNivel] = useState("");          // basico|medio|avanzado
  const [categoria, setCategoria] = useState("");  // nombre de categoría
  const [estado, setEstado] = useState("");
  const [loadingEsc, setLoadingEsc] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Lista de categorías (para el select)
  const categoriasDisponibles = useMemo(() => {
    const set = new Set();
    for (const e of escenarios) {
      const cats = e.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
      cats.forEach(c => set.add(c));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [escenarios]);
  const estadosDisponibles = useMemo(() => {
    return Object.keys(estadoStyles).map((key) => ({
      value: key.toLowerCase(),
      label: estadoStyles[key].label,
    }));
  }, []);

  // Filtro en cliente (modo = presencial fijo)
  const filtrados = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return escenarios.filter((e) => {
      const cats = e.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
      const matchQ = !qn
        || (e.title || '').toLowerCase().includes(qn)
        || (e.summary || '').toLowerCase().includes(qn);
      const matchNivel = !nivel || String(e.level || "").toLowerCase() === nivel;
      const modeArr = Array.isArray(e.mode) ? e.mode : (e.mode ? [e.mode] : []);
      const matchModo = modeArr.map(m => String(m).toLowerCase()).includes('presencial');
      const matchCat   = !categoria || cats.includes(categoria);
      const matchEstado = !estado || String(e.status || '').toLowerCase() === estado;
      return matchQ && matchNivel && matchModo && matchCat && matchEstado;
    });
  }, [escenarios, q, nivel, categoria, estado]);

  useEffect(() => {
    let mounted = true;

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

      if (!mounted) return;

      if (error) {
        console.error("[PresencialListado] cargarEscenarios error:", error);
        setErrorMsg(error.message || "Error cargando escenarios");
        setEscenarios([]);
      } else {
        // Orden: status → título (misma estética que Simulacion.jsx)
        const statusPriority = {
          "Disponible": 1,
          "En construcción: en proceso": 2,
          "En construcción: sin iniciar": 3,
        };
        const sorted = (data || []).slice().sort((a, b) => {
          const pa = statusPriority[a.status] ?? 99;
          const pb = statusPriority[b.status] ?? 99;
          if (pa !== pb) return pa - pb;
          const ta = (a.title || "").toLocaleLowerCase("es");
          const tb = (b.title || "").toLocaleLowerCase("es");
          return ta.localeCompare(tb, "es");
        });
        setEscenarios(sorted);
      }
      setLoadingEsc(false);
    }

    cargarEscenarios();
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      setFiltersOpen(true);
    }
    return () => { mounted = false; };
  }, []);

  const totalPresencial = useMemo(() => {
    return escenarios.filter((e) => {
      const modeArr = Array.isArray(e.mode) ? e.mode : (e.mode ? [e.mode] : []);
      return modeArr.map((m) => String(m).toLowerCase()).includes('presencial');
    });
  }, [escenarios]);

  const disponibleCount = useMemo(() => totalPresencial.filter((e) => String(e.status || '').toLowerCase() === 'disponible').length, [totalPresencial]);
  const buildingCount = useMemo(() => totalPresencial.filter((e) => String(e.status || '').toLowerCase().includes('construcción')).length, [totalPresencial]);

  const heroMetrics = useMemo(() => [
    {
      key: 'total',
      label: 'Escenarios presenciales',
      value: totalPresencial.length,
      helper: isDual ? 'Modo dual instructor + alumnos' : 'Versión 1 pantalla para instructor',
      icon: UsersIcon,
    },
    {
      key: 'available',
      label: 'Disponibles',
      value: disponibleCount,
      helper: buildingCount ? `${buildingCount} en construcción` : 'Listos para lanzar',
      icon: ClockIcon,
    },
    {
      key: 'filters',
      label: 'Escenarios filtrados',
      value: filtrados.length,
      helper: filtroSummary({ q, nivel, categoria, estado }),
      icon: AcademicCapIcon,
    },
  ], [totalPresencial.length, disponibleCount, buildingCount, filtrados.length, q, nivel, categoria, estado, isDual]);

  function filtroSummary(filters) {
    const parts = [];
    if (filters.q) parts.push(`Búsqueda: "${filters.q}"`);
    if (filters.nivel) parts.push(`Nivel ${formatLevel(filters.nivel)}`);
    if (filters.categoria) parts.push(`Categoría ${filters.categoria}`);
    if (filters.estado) {
      const estadoLabel = Object.entries(estadoStyles).find(([key]) => key.toLowerCase() === filters.estado)?.[1]?.label;
      parts.push(`Estado ${estadoLabel || filters.estado}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Sin filtros activos';
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-6xl mx-auto px-5 py-12 text-white relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-white/70 text-sm uppercase tracking-wide">Simulación presencial</p>
              <h1 className="text-3xl md:text-4xl font-semibold">{isDual ? 'Modo dual (instructor + alumnos)' : 'Consola presencial'}</h1>
              <p className="opacity-95 max-w-2xl text-lg">
                {isDual
                  ? 'Selecciona un escenario, genera el código dual y sincroniza pantallas para coordinar al equipo en tiempo real.'
                  : 'Selecciona un escenario y configura si la experiencia será en una o dos pantallas durante la confirmación.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {heroMetrics.map((metric) => (
                <HeroStat key={metric.key} icon={metric.icon} label={metric.label} value={metric.value} helper={metric.helper} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        {errorMsg && (
          <div className="mb-4 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 text-sm rounded-lg">
            {errorMsg}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_40px_-30px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-900/5 text-slate-900 grid place-items-center">
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Filtrar escenarios</h2>
                <p className="text-sm text-slate-500">Combina búsqueda, nivel y estado para encontrar tu sesión presencial.</p>
              </div>
            </div>
            <button
              type="button"
              className="md:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              {filtersOpen ? 'Ocultar' : 'Mostrar'}
              <ArrowRightIcon className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-90' : ''}`} />
            </button>
          </div>
          <div className={`${filtersOpen ? 'grid' : 'hidden'} md:grid grid-cols-1 gap-4 border-b border-slate-100 px-5 py-5 md:grid-cols-[1.3fr_1fr_1fr_1fr]`}>
            <label className="block text-sm text-slate-600">
              <span className="text-xs uppercase tracking-wide text-slate-400">Búsqueda</span>
              <div className="mt-1 relative flex items-center">
                <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-slate-400" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Shock séptico, parada, briefing…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/70 focus:border-transparent"
                />
              </div>
            </label>
            <label className="block text-sm text-slate-600">
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
            <label className="block text-sm text-slate-600">
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
            <label className="block text-sm text-slate-600">
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
          <div className={`${filtersOpen ? 'flex' : 'hidden'} md:flex items-center justify-end gap-3 px-5 py-4`}>
            <button
              type="button"
              onClick={() => {
                setQ('');
                setNivel('');
                setCategoria('');
                setEstado('');
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          </div>
        </section>

        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {loadingEsc && Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`pres-skeleton-${idx}`}
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

            {!loadingEsc && filtrados.length === 0 && (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                No hay escenarios presenciales que coincidan con los filtros.
              </div>
            )}

            {!loadingEsc && filtrados.map((esc) => {
              const cats = esc.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
              const estado = esc.status || "Disponible";
              const estadoStyle = estadoStyles[estado] || { label: estado, color: "bg-gray-100 text-gray-800", clickable: true };
              const isClickable = estadoStyle.clickable;
              const modeArr = Array.isArray(esc.mode) ? esc.mode : (esc.mode ? [esc.mode] : []);

              const handleNavigate = () => {
                if (!isClickable) return;
                if (isDual) {
                  navigate(`/presencial/${esc.id}/confirm?flow=dual`);
                } else {
                  navigate(`/presencial/${esc.id}/confirm`);
                }
              };

              return (
                <article
                  key={esc.id}
                  className={`group relative overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_-28px_rgba(15,23,42,0.5)] ${!isClickable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={handleNavigate}
                >
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-[#0A3D91]/8 via-transparent to-transparent" aria-hidden="true" />
                  <div className="relative z-10 flex flex-col h-full gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#0A3D91]/10 px-3 py-1 text-xs font-medium text-[#0A3D91]">
                          <AcademicCapIcon className="h-4 w-4" />
                          Escenario presencial
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
                      {esc.summary || 'Escenario presencial con checklist y cronómetro integrado.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 transition-colors group-hover:bg-slate-900/10">
                        Nivel {formatLevel(esc.level) || '—'}
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
                          {isDual ? 'Preparar sesión dual' : 'Abrir consola'}
                          <ArrowRightIcon className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
