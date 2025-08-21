// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) console.error("[Dashboard] getSession error:", error);
      setSession(data?.session ?? null);
      setLoading(false);
      if (!data?.session) navigate("/", { replace: true });
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

  const nombre = session?.user?.user_metadata?.nombre;
  const email = session?.user?.email ?? "";
  const rol = (session?.user?.user_metadata?.rol || "").toLowerCase();

  const RolChip = () => {
    const base = "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ring-1";
    if (rol.includes("médico") || rol.includes("medico")) {
      return <span className={`${base} text-white bg-[#1a69b8] ring-[#165898]`}>Médico</span>;
    }
    if (rol.includes("enfer")) {
      return <span className={`${base} text-[#0b3a4e] bg-[#1fced1]/20 ring-[#1fced1]`}>Enfermería</span>;
    }
    if (rol.includes("farm")) {
      return <span className={`${base} text-[#5c3b00] bg-[#f2c28c]/30 ring-[#f2c28c]`}>Farmacia</span>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <section className="bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1]">
        <div className="max-w-6xl mx-auto px-5 py-10 text-white">
          <p className="opacity-95">Bienvenido{nombre ? `, ${nombre}` : ""}</p>
          <h1 className="text-3xl md:text-4xl font-semibold mt-1">Tu panel de simulación clínica</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/30 text-white/90">{email}</span>
            <RolChip />
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
        <h2 className="text-xl font-semibold mb-4 text-slate-800">Accesos rápidos</h2>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Escenarios" description="Explora y continúa tus casos clínicos." to="/escenarios" />
          <Card title="Simulación presencial" description="Sesiones presenciales asistidas con la herramienta SimuPed." to="/presencial" badge="Nuevo" badgeColor="bg-[#f2c28c] text-[#5c3b00]" />
          <Card title="Simulación online" description="Escenarios interactivos tipo test por rol." to="/simulacion" />
          <Card title="Evaluación del desempeño" description="Consulta métricas y evolución." to="/evaluacion" />
        </section>

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