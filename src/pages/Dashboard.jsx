// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../auth";
import { AcademicCapIcon, DevicePhoneMobileIcon, ChartBarIcon } from "@heroicons/react/24/outline";

// Debug: marcar que Dashboard.jsx se ha cargado
console.debug("[Dashboard] componente cargado");

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

function ErrorBoundary({ children }) {
  try {
    return children;
  } catch (e) {
    console.error("[Dashboard render error]", e);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-xl mx-auto p-6 rounded-xl border border-red-200 bg-red-50 text-red-800">
          <h2 className="text-lg font-semibold mb-2">Se ha producido un error en el panel</h2>
          <p className="text-sm">Revisa la consola del navegador para más detalles.</p>
        </div>
      </div>
    );
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { ready, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Perfil
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");

  // Escenarios + filtros (si quieres mostrar un rápido conteo o futuras vistas)
  const [escenarios, setEscenarios] = useState([]);
  const [loadingEsc, setLoadingEsc] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!ready) return; // espera a que AuthProvider resuelva
      try {
        if (!session) {
          setLoading(false);
          // Si se cayó la sesión, volvemos al inicio
          navigate("/", { replace: true });
          return;
        }

        // Cargar perfil (no bloqueante si falla)
        try {
          const { data: prof, error: pErr } = await supabase
            .from("profiles")
            .select("nombre, rol")
            .eq("id", session.user.id)
            .maybeSingle();

          if (pErr) {
            console.warn("[Dashboard] profiles select error (no bloqueante):", pErr);
          }

          setNombre(prof?.nombre ?? session.user?.user_metadata?.nombre ?? "");
          setRol((prof?.rol ?? session.user?.user_metadata?.rol ?? "").toString());
        } catch (err) {
          console.warn("[Dashboard] profiles select throw (no bloqueante):", err);
        }

        await cargarEscenarios();
      } catch (e) {
        console.error("[Dashboard] init catch:", e);
        setErrorMsg(e?.message || "Error inicializando el panel");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function cargarEscenarios() {
      setLoadingEsc(true);
      const { data, error } = await supabase
        .from("scenarios")
        .select(`
          id, title, summary, level, mode, created_at
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Dashboard] cargarEscenarios error:", error);
        setErrorMsg(error.message || "Error cargando escenarios");
        setEscenarios([]);
      } else {
        setEscenarios(data || []);
      }
      setLoadingEsc(false);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [ready, session, navigate]);

  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando panel…</div>
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

  const email = session?.user?.email ?? "";

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {errorMsg && (
          <div className="bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 text-sm">
            {errorMsg}
          </div>
        )}

        <Navbar />

        {/* Hero */}
        <section className="bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1] border-b border-white/20">
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
            <Card
              title="Simulación online"
              description="Escoge un escenario y practica con casos interactivos."
              to="/simulacion"
              badge="Nuevo"
              badgeColor="bg-emerald-100 text-emerald-700"
              icon={DevicePhoneMobileIcon}
            />
            <Card
              title="Simulación presencial"
              description="Sesiones guiadas con instructor usando la herramienta SimuPed."
              to={null}
              badge="En construcción 🚧"
              badgeColor="bg-red-100 text-red-700"
              icon={AcademicCapIcon}
              titleAttr="En construcción: pronto disponible"
            />
            <Card
              title="Evaluación del desempeño"
              description="Consulta tus resultados y evolución por escenarios."
              to="/evaluacion"
              badge="En construcción 🚧"
              badgeColor="bg-red-100 text-red-700"
              icon={ChartBarIcon}
            />
          </section>

          {/* Perfil CTA */}
          <section className="mt-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Tu perfil</h2>
                  <p className="text-slate-700">Gestiona tu nombre, unidad y rol.</p>
                </div>
                <Link
                  to="/perfil"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition"
                >
                  Ir a Perfil
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}

function Card({ title, description, to, badge, badgeColor, icon: Icon, titleAttr }) {
  const content = (
    <div className="flex items-start gap-4">
      <div className="shrink-0 h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br from-[#1a69b8]/10 via-[#1d99bf]/10 to-[#1fced1]/10 ring-1 ring-[#1a69b8]/15">
        {Icon ? <Icon className="h-6 w-6 text-[#1a69b8]" /> : null}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold group-hover:underline">{title}</h3>
          {badge ? (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-black/10 ${badgeColor}`}>
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-slate-600 mt-1">{description}</p>
      </div>
    </div>
  );
  if (!to) {
    // Render as a non-clickable block
    return (
      <div
        className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm opacity-70 cursor-not-allowed"
        title={titleAttr || "Disponible próximamente"}
      >
        {content}
      </div>
    );
  }
  return (
    <Link
      to={to}
      title={titleAttr || title}
      className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
    >
      {content}
    </Link>
  );
}