// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

const COLORS = {
  primary: "#1a69b8",
  sky: "#1d99bf",
  cyan: "#1fced1",
  coral: "#f6a9a3",
  sand: "#f2c28c",
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Perfil
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");

  // Escenarios
  const [escenarios, setEscenarios] = useState([]);
  const [q, setQ] = useState("");
  const [nivel, setNivel] = useState(""); // Basic | Medium | Advanced
  const [modo, setModo] = useState("");   // Online | Presencial
  const [loadingEsc, setLoadingEsc] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: sData } = await supabase.auth.getSession();
      const sess = sData?.session || null;
      if (!mounted) return;
      setSession(sess);

      if (!sess) {
        navigate("/", { replace: true });
        return;
      }

      // Perfil
      const { data: prof } = await supabase
        .from("profiles")
        .select("nombre, rol")
        .eq("id", sess.user.id)
        .maybeSingle();

      const meta = sess.user?.user_metadata || {};
      setNombre(prof?.nombre ?? meta.nombre ?? "");
      setRol(prof?.rol ?? meta.rol ?? "");

      // Escenarios (solo títulos por ahora)
      await cargarEscenarios();

      setLoading(false);
    }

    async function cargarEscenarios() {
      setLoadingEsc(true);
      // Traemos id, title, level, mode; si no tienes columnas exactas, ajusta aquí
      let query = supabase
        .from("scenarios")
        .select("id, title, level, mode")
        .order("created_at", { ascending: false });

      // Filtros en cliente al principio; más adelante se pueden pasar al server
      const { data, error } = await query;
      if (error) {
        console.error("[Dashboard] cargarEscenarios error:", error);
        setEscenarios([]);
        setLoadingEsc(false);
        return;
      }
      setEscenarios(data || []);
      setLoadingEsc(false);
    }

    init();
    return () => { mounted = false; };
  }, [navigate]);

  // Filtro en cliente (simple)
  const filtrados = escenarios.filter((e) => {
    const matchQ =
      !q ||
      e.title?.toLowerCase().includes(q.trim().toLowerCase());
    const matchNivel = !nivel || (e.level || "").toLowerCase() === nivel.toLowerCase();
    const matchModo = !modo || (e.mode || "").toLowerCase() === modo.toLowerCase();
    return matchQ && matchNivel && matchModo;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando panel…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <header className="max-w-6xl mx-auto px-5 pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Bienvenido{nombre ? `, ${nombre}` : ""} 👋
        </h1>
        <p className="text-slate-600 mt-1">
          {rol ? `Registrado como ${rol}.` : "Completa tu perfil para personalizar la plataforma."}
        </p>
      </header>

      {/* CTA rápida */}
      <div className="max-w-6xl mx-auto px-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Simulación online</h2>
            <p className="text-slate-600">Selecciona un escenario y empieza a entrenar.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/perfil")}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Editar perfil
            </button>
            <button
              onClick={() => document.getElementById('filtros-esc')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: COLORS.primary }}
            >
              Ver escenarios
            </button>
          </div>
        </div>
      </div>

      {/* Escenarios + Simulación online (fusionado) */}
      <section className="max-w-6xl mx-auto px-5 py-8">
        <div id="filtros-esc" className="mb-4 flex flex-col md:flex-row gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título…"
            className="w-full md:flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
          />
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Todos los niveles</option>
            <option value="basic">Básico</option>
            <option value="medium">Medio</option>
            <option value="advanced">Avanzado</option>
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loadingEsc && (
            <div className="col-span-full text-slate-600">Cargando escenarios…</div>
          )}

          {!loadingEsc && filtrados.length === 0 && (
            <div className="col-span-full text-slate-600">No hay escenarios que coincidan.</div>
          )}

          {!loadingEsc && filtrados.map((esc) => (
            <article
              key={esc.id}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition cursor-pointer"
              onClick={() => navigate(`/simulacion/${esc.id}`)} // vista futura
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900 group-hover:underline">
                  {esc.title || "Escenario sin título"}
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {esc.mode || "online"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {esc.level || "basic"}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">ID: {esc.id.slice(0, 8)}…</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Presencial (sección ligera) */}
      <section className="max-w-6xl mx-auto px-5 pb-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Simulación presencial</h2>
          <p className="text-slate-600 mb-3">
            Próximamente: coordinación de sesiones con instructor asistidas por SimuPed.
          </p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: COLORS.primary }}
            onClick={() => alert("Muy pronto")}
          >
            Solicitar sesión
          </button>
        </div>
      </section>
    </div>
  );
}