// src/pages/PresencialListado.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

console.debug("[PresencialListado] componente cargado");

const estadoStyles = {
  "Disponible": { label: "Disponible", color: "bg-[#0A3D91]/10 text-[#0A3D91] font-medium", clickable: true },
  "En construcción: en proceso": { label: "En construcción: en proceso", color: "bg-[#4FA3E3]/10 text-[#1E6ACB] font-medium", clickable: true },
  "En construcción: sin iniciar": { label: "En construcción: sin iniciar", color: "bg-slate-200 text-slate-600 font-medium", clickable: false },
};

function formatLevel(level) {
  const key = String(level || "").toLowerCase();
  const map = { basico: "Básico", básico: "Básico", medio: "Medio", avanzado: "Avanzado" };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : "");
}

export default function PresencialListado() {
  const navigate = useNavigate();

  // Escenarios + filtros
  const [escenarios, setEscenarios] = useState([]);
  const [q, setQ] = useState("");
  const [nivel, setNivel] = useState("");          // basico|medio|avanzado
  const [categoria, setCategoria] = useState("");  // nombre de categoría
  const [loadingEsc, setLoadingEsc] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Lista de categorías (para el select)
  const categoriasDisponibles = useMemo(() => {
    const set = new Set();
    for (const e of escenarios) {
      const cats = e.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
      cats.forEach(c => set.add(c));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [escenarios]);

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
      return matchQ && matchNivel && matchModo && matchCat;
    });
  }, [escenarios, q, nivel, categoria]);

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
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* Hero (misma estética que Simulacion.jsx) */}
      <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]">
        <div className="max-w-6xl mx-auto px-5 py-10 text-white">
          <h1 className="text-3xl md:text-4xl font-semibold">Simulación presencial</h1>
          <p className="opacity-95 mt-1">Elige un escenario y abre el toolkit presencial.</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {errorMsg && (
          <div className="mb-4 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 text-sm rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Filtros (idéntico look&feel; sin selector de modo) */}
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

        {/* Grid de tarjetas (idéntico estilo) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loadingEsc && (
            <div className="col-span-full text-slate-600">Cargando escenarios…</div>
          )}

          {!loadingEsc && filtrados.length === 0 && (
            <div className="col-span-full text-slate-600">No hay escenarios presenciales.</div>
          )}

          {!loadingEsc && filtrados.map((esc) => {
            const cats = esc.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
            const estado = esc.status || "Disponible";
            const estadoStyle = estadoStyles[estado] || { label: estado, color: "bg-gray-100 text-gray-800", clickable: true };
            const isClickable = estadoStyle.clickable;

            return (
              <article
                key={esc.id}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : -1}
                className={`group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition ${!isClickable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => { if (isClickable) navigate(`/simulacion/${esc.id}/presencial/confirm`); }}
                onKeyDown={(e) => {
                  if (!isClickable) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/simulacion/${esc.id}/presencial/confirm`);
                  }
                }}
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
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}