// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

/* -------------------- formatters -------------------- */
export function formatLevel(level) {
  const key = String(level || '').toLowerCase();
  const map = { basico: 'Básico', básico: 'Básico', medio: 'Medio', avanzado: 'Avanzado' };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : '');
}
export function formatMode(mode) {
  const key = String(mode || '').toLowerCase();
  const map = { online: 'Online', presencial: 'Presencial' };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : '');
}
export function formatRole(rol) {
  const key = String(rol || '').toLowerCase();
  if (key.includes('medic')) return 'Médico';
  if (key.includes('enfer')) return 'Enfermería';
  if (key.includes('farm')) return 'Farmacia';
  return key ? key[0].toUpperCase() + key.slice(1) : '';
}
/* ---------------------------------------------------- */

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Perfil
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");

  // Escenarios + filtros
  const [escenarios, setEscenarios] = useState([]);
  const [q, setQ] = useState("");
  const [nivel, setNivel] = useState("");       // basico|medio|avanzado
  const [modo, setModo] = useState("");         // online|presencial
  const [categoria, setCategoria] = useState(""); // nombre de categoría
  const [loadingEsc, setLoadingEsc] = useState(false);

  // Lista de categorías distintas (para el select)
  const categoriasDisponibles = useMemo(() => {
    const set = new Set();
    for (const e of escenarios) {
      const cats = e.scenario_categories?.map(sc => sc.categories?.name).filter(Boolean) || [];
      cats.forEach(c => set.add(c));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [escenarios]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) console.error("[Dashboard] getSession error:", error);
      const sess = data?.session ?? null;
      setSession(sess);
      if (!sess) {
        setLoading(false);
        navigate("/", { replace: true });
        return;
      }

      // Perfil: intenta profiles, si no, user_metadata
      const { data: prof } = await supabase
        .from("profiles")
        .select("nombre, rol")
        .eq("id", sess.user.id)
        .maybeSingle();

      setNombre(prof?.nombre ?? sess.user?.user_metadata?.nombre ?? "");
      setRol((prof?.rol ?? sess.user?.user_metadata?.rol ?? "").toString());

      await cargarEscenarios();
      setLoading(false);
    }

    async function cargarEscenarios() {
      setLoadingEsc(true);
      // Traer escenarios con categorías (N:M) anidadas
      // Requiere FKs correctas en scenario_categories:
      //   scenario_id -> scenarios.id (int)
      //   category_id -> categories.id (uuid)
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
        console.error("[Dashboard] cargarEscenarios error:", error);
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
      if (!sess) navigate("/", { replace: true });
    });
    return () => {
      mounted = false;
      try { listener?.subscription?.unsubscribe?.(); } catch {}
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando panel…</div>
      </div>
    );
  }
  if (!session) return null;

  const email = session?.user?.email ?? "";

  // Filtro en cliente
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1]">
        <div className="max-w-6xl mx-auto px-5 py-10 text-white">
          <p className="opacity-95">Bienvenido{nombre ? `, ${nombre}` : ""}</p>
          <h1 className="text-3xl md:text-4xl font-semibold mt-1">Tu panel de simulación clínica</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/30 text-white/90">{email}</span>
            {rol && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ring-1 bg-white/10 ring-white/30">
                {formatRole(rol)}
              </span>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {/* Accesos rápidos */}
        <h2 className="text-xl font-semibold mb-4 text-slate-800">Accesos rápidos</h2>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Escenarios" description="Explora y continúa tus casos clínicos." to="/escenarios" />
          <Card title="Simulación presencial" description="Sesiones presenciales asistidas con la herramienta SimuPed." to="/presencial" badge="Nuevo" badgeColor="bg-[#f2c28c] text-[#5c3b00]" />
          <Card title="Simulación online" description="Escenarios interactivos tipo test por rol." to="/simulacion" />
          <Card title="Evaluación del desempeño" description="Consulta métricas y evolución." to="/evaluacion" />
        </section>

        {/* Escenarios (desde BD) */}
        <section className="mt-10">
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
                  <p className="text-slate-600 mt-2 line-clamp-2">{esc.summary}</p>
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
        </section>

        {/* Perfil CTA */}
        <section className="mt-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">Tu perfil</h2>
                <p className="text-slate-700">Gestiona tu nombre, unidad y rol.</p>
              </div>
              <Link to="/perfil" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition">Ir a Perfil</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ title, description, to, badge, badgeColor }) {
  return (
    <Link to={to} className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
      <div className="flex items-start gap-4">
        <div className="shrink-0 h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br from-[#1a69b8]/10 via-[#1d99bf]/10 to-[#1fced1]/10 ring-1 ring-[#1a69b8]/15" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold group-hover:underline">{title}</h3>
            {badge ? (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-black/10 ${badgeColor}`}>{badge}</span>
            ) : null}
          </div>
          <p className="text-slate-600 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}