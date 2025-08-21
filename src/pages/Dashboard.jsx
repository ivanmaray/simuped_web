// src/pages/Dashboard.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

/**
 * Paleta usada en la landing:
 * coral: #f6a9a3
 * mango: #f2c28c
 * ocean: #1a69b8
 * sky:   #1d99bf
 * aqua:  #1fced1
 */

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) console.error('[Dashboard] getSession error:', error);
        setSession(data?.session ?? null);
        setLoading(false);
        if (!data?.session) navigate('/', { replace: true });
      } catch (e) {
        console.error('[Dashboard] init crash:', e);
        setLoading(false);
        navigate('/', { replace: true });
      }
    }
    init();
    const { data: { subscription } = { subscription: null } } =
      supabase.auth.onAuthStateChange((_evt, sess) => {
        if (!mounted) return;
        setSession(sess ?? null);
        if (!sess) navigate('/', { replace: true });
      });
    return () => {
      mounted = false;
      try { subscription?.unsubscribe?.(); } catch {}
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando panel…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div>
          <p className="font-medium">No hay sesión activa.</p>
          <p className="text-sm opacity-80">Redirigiendo a la página principal…</p>
        </div>
      </div>
    );
  }

  // Ya hay sesión garantizada aquí
  const nombre = session?.user.user_metadata?.nombre;
  const email = session?.user?.email ?? "";
  const rawRol = session?.user?.user_metadata?.rol;
  const rol = typeof rawRol === 'string' ? rawRol.toLowerCase() : '';

  const rolChip = useMemo(() => {
    // Colores por rol, usando la paleta
    const base =
      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ring-1";
    if (rol.includes("médico") || rol.includes("medico")) {
      return (
        <span className={`${base} text-white bg-[#1a69b8] ring-[#165898]`}>
          <StethIcon className="h-4 w-4" /> Médico
        </span>
      );
    }
    if (rol.includes("enfer")) {
      return (
        <span className={`${base} text-[#0b3a4e] bg-[#1fced1]/20 ring-[#1fced1]`}>
          <NurseIcon className="h-4 w-4" /> Enfermería
        </span>
      );
    }
    if (rol.includes("farm")) {
      return (
        <span className={`${base} text-[#0b3a4e] bg-[#f2c28c]/30 ring-[#f2c28c]`}>
          <PillIcon className="h-4 w-4" /> Farmacia
        </span>
      );
    }
    return null;
  }, [rol]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ErrorBoundary><Navbar /></ErrorBoundary>

      {/* HERO / WELCOME */}
      <section className="bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1]">
        <div className="max-w-6xl mx-auto px-5 py-10 text-white">
          <p className="opacity-95">Bienvenido{nombre ? `, ${nombre}` : ""}</p>
          <h1 className="text-3xl md:text-4xl font-semibold mt-1">
            Tu panel de simulación clínica
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/30 text-white/90">
              {email}
            </span>
            {rolChip}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {/* Accesos rápidos */}
        <h2 className="text-xl font-semibold mb-4 text-slate-800">
          Accesos rápidos
        </h2>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            title="Escenarios"
            description="Explora y continúa tus casos clínicos."
            to="/escenarios"
            icon={<CaseIcon />}
          />
          <Card
            title="Simulación presencial"
            description="Sesiones presenciales asistidas con la herramienta SimuPed."
            to="/presencial"
            icon={<PeopleIcon />}
            badge="Nuevo"
            badgeColor="bg-[#f2c28c] text-[#5c3b00]"
          />
          <Card
            title="Simulación online"
            description="Selecciona escenarios interactivos para practicar preguntas tipo test."
            to="/simulacion"
            icon={<MonitorIcon />}
          />
          <Card
            title="Evaluación del desempeño"
            description="Consulta métricas, fortalezas y áreas de mejora."
            to="/evaluacion"
            icon={<ChartIcon />}
          />
        </section>

        {/* Perfil */}
        <section className="mt-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">Tu perfil</h2>
                <p className="text-slate-700">
                  Gestiona tus datos y contraseña.
                </p>
              </div>
              <Link
                to="/perfil"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition"
              >
                <UserIcon className="h-5 w-5" />
                Ir a Perfil
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------- Tarjeta reusable con icono ---------- */
function Card({ title, description, to, icon, badge, badgeColor }) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br from-[#1a69b8]/10 via-[#1d99bf]/10 to-[#1fced1]/10 ring-1 ring-[#1a69b8]/15">
          {/* icon */}
          <div className="text-[#1a69b8] group-hover:scale-110 transition">
            {icon}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold group-hover:underline">
              {title}
            </h3>
            {badge ? (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-black/10 ${badgeColor}`}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <p className="text-slate-600 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}

/* ---------- Iconos (SVG Inline, sin dependencias) ---------- */
function StethIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 2a1 1 0 0 1 1 1v5a3 3 0 1 0 6 0V3a1 1 0 1 1 2 0v5a5 5 0 0 1-4 4.9V17a3 3 0 1 0 6 0v-1a1 1 0 1 1 2 0v1a5 5 0 1 1-10 0v-4.1A5 5 0 0 1 5 8V3a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
function NurseIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c3 0 6 .7 6 .7v3.6c0 2-2.7 3.7-6 3.7s-6-1.7-6-3.7V2.7S9 2 12 2Zm0 10c4 0 8 1.3 8 4v3H4v-3c0-2.7 4-4 8-4Zm1-6h-2v2H9v2h2v2h2v-2h2V8h-2V6Z" />
    </svg>
  );
}
function PillIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 3a6 6 0 0 0 0 12h2l8-8A6 6 0 0 0 7 3Zm10 8-8 8a6 6 0 1 0 8-8Z" />
    </svg>
  );
}
function CaseIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 3h6a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v3H1V8a2 2 0 0 1 2-2h3V5a2 2 0 0 1 2-2Zm8 3V5a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v1h9ZM1 12h22v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-6Zm11 1a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2h-3Z" />
    </svg>
  );
}
function PeopleIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4Zm10 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM2 20a5 5 0 0 1 10 0v1H2Zm11 1v-1a6 6 0 0 1 7-5.92A4 4 0 0 0 15 17v4h-2Z" />
    </svg>
  );
}
function MonitorIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 4h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm9 14h5a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h5Z" />
    </svg>
  );
}
function ChartIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 13a1 1 0 0 1 1-1h2v7H5a1 1 0 0 1-1-1v-5Zm6-4a1 1 0 0 1 1-1h2v12h-3a1 1 0 0 1-1-1V9Zm8-6h2a1 1 0 0 1 1 1v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2h17V3Z" />
    </svg>
  );
}
function UserIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm7 9H5a1 1 0 0 1-1-1 8 8 0 0 1 16 0 1 1 0 0 1-1 1Z" />
    </svg>
  );
}

function ErrorBoundary({ children }) {
  const [err, setErr] = useState(null);
  if (err) {
    console.error('[Dashboard] Navbar error boundary:', err);
    return null;
  }
  return (
    <ErrorCatcher onError={setErr}>
      {children}
    </ErrorCatcher>
  );s
}
function ErrorCatcher({ onError, children }) {
  try {
    return children;
  } catch (e) {
    onError?.(e);
    return null;
  }
}