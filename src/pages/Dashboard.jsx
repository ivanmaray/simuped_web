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
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
      if (!data.session) {
        navigate("/", { replace: true });
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!mounted) return;
      setSession(sess ?? null);
      if (!sess) navigate("/", { replace: true });
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando panel…</div>
      </div>
    );
  }

  // Ya hay sesión garantizada aquí
  const nombre = session?.user.user_metadata?.nombre;
  const email = session?.user?.email ?? "";
  const rol = session?.user.user_metadata?.rol;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Bienvenido{nombre ? `, ${nombre}` : email}.
            {rol ? ` Rol: ${rol}` : ""}
          </p>
        </header>

        {/* Accesos rápidos */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            title="Escenarios"
            description="Explora y continúa tus casos clínicos."
            to="/escenarios"
          />
          <Card
            title="Simulación presencial"
            description="Sesiones presenciales asistidas con la herramienta SimuPed."
            to="/presencial"
          />
          <Card
            title="Simulación online"
            description="Selecciona escenarios interactivos para practicar preguntas tipo test."
            to="/simulacion"
          />
          <Card
            title="Evaluación del desempeño"
            description="Consulta métricas, fortalezas y áreas de mejora."
            to="/evaluacion"
          />
        </section>

        {/* Perfil */}
        <section className="mt-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Tu perfil</h2>
            <p className="text-slate-700">Gestiona tus datos y contraseña.</p>
            <div className="mt-4">
              <Link
                to="/perfil"
                className="inline-block px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                Ir a Perfil
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ title, description, to }) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
    >
      <h3 className="text-lg font-semibold mb-1 group-hover:underline">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </Link>
  );
}