// src/pages/Simulacion.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

console.debug("[Simulacion] componente cargado");

function formatLevel(level) {
  const key = String(level || '').toLowerCase();
  const map = { basico: 'Básico', básico: 'Básico', medio: 'Medio', avanzado: 'Avanzado' };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : '');
}
function formatMode(mode) {
  const key = String(mode || '').toLowerCase();
  const map = { online: 'Online', presencial: 'Presencial' };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : '');
}

export default function Simulacion() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Escenarios + filtros
  const [escenarios, setEscenarios] = useState([]);
  const [q, setQ] = useState("");
  const [nivel, setNivel] = useState("");       // basico|medio|avanzado
  const [modo, setModo] = useState("online");   // por defecto 'online'
  const [categoria, setCategoria] = useState(""); // nombre de categoría
  const [loadingEsc, setLoadingEsc] = useState(false);

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
      const matchModo  = !modo  || String(e.mode  || '').toLowerCase() === modo;
      const matchCat   = !categoria || cats.includes(categoria);
      return matchQ && matchNivel && matchModo && matchCat;
    });
  }, [escenarios, q, nivel, modo, categoria]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        console.error("[Simulacion] getSession error:", error);
        setErrorMsg(error.message || "Error obteniendo sesión");
      }
      const sess = data?.session ?? null;
      setSession(sess);
      if (!sess) {
        setLoading(false);
        return;
      }

      await cargarEscenarios();
      setLoading(false);
    }

    async function cargarEscenarios() {
      setLoadingEsc(true);
      const { data, error } = await supabase
        .from("scenarios")
        .select(`
          id, title, summary, level, mode, created_at,
          scenario_categories (
            categories ( name )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Simulacion] cargarEscenarios error:", error);
        setErrorMsg(error.message || "Error cargando escenarios");
        setEscenarios([]);
      } else {
        setEscenarios(data || []);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando…</div>
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
      <section className="bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1]">
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
            className="w-full md:flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
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
            return (
              <article
                key={esc.id}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/simulacion/${esc.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:underline">
                    {esc.title || "Escenario sin título"}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    {formatMode(esc.mode)}
                  </span>
                </div>
                <p className="text-slate-600 mt-2 overflow-hidden text-ellipsis">{esc.summary}</p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {formatLevel(esc.level)}
                  </span>
                  {cats.length > 0 && <span className="text-slate-400">•</span>}
                  <span className="text-slate-600 truncate">{cats.join(" · ")}</span>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}