// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import logo from "../assets/logo.png";
import logoWhite from "../assets/logo-white.png";

export default function Navbar() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    let mounted = true;

    // sesión actual
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session ?? null);
      if (mounted) setLoading(false);
    });

    // escuchar cambios (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (mounted) setSession(sess ?? null);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      // Asegura limpieza total del estado de auth en el cliente
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      window.location.href = "/"; // fuerza navegación limpia a la landing
    }
  };

  const isPrivate = !!session;
  const loginHref = pathname === "/" ? "#login" : "/#login";

  if (loading) {
    // Puedes devolver null o un placeholder del header para evitar parpadeos
    return <header className="h-16" />;
  }

  return (
    <header
      className={`border-b border-slate-200 sticky top-0 z-50 ${
        isPrivate
          ? "bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
          : "bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1]"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={isPrivate ? logo : logoWhite} alt="SimuPed" className="h-8 md:h-9 w-auto object-contain" />
          <span className={`text-lg font-semibold ${isPrivate ? "text-slate-900" : "text-white"}`}>SimuPed</span>
        </Link>

        {!isPrivate ? (
          // Navbar público (landing)
          <div className="flex items-center gap-4">
            <a href="#que-es" className="text-white hover:text-white/80">¿Qué es?</a>
            <a href="#equipo" className="text-white hover:text-white/80">Equipo</a>
            <a href="#proyecto" className="text-white hover:text-white/80">Proyecto</a>
            <a href="#como-participar" className="text-white hover:text-white/80">Participar</a>
            <Link
              to="/registro"
              className="px-3 py-1.5 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 transition"
            >
              Solicitar acceso
            </Link>
            <Link
              to="/pendiente"
              className="px-3 py-1.5 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 transition"
            >
              Ya tengo invitación
            </Link>
            <a
              href={loginHref}
              className="ml-2 px-3 py-1.5 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 transition"
              aria-label="Ir al formulario de acceso"
            >
              Entrar
            </a>
          </div>
        ) : (
          // Navbar privado (logueado)
          <div className="flex items-center gap-4">
            <span
              className="hidden sm:inline px-2.5 py-1 rounded-full text-sm bg-slate-100 text-slate-700"
              title={session?.user?.email || ""}
            >
              {session?.user?.email}
            </span>
            <Link to="/dashboard" className="text-slate-700 hover:text-slate-900">Página Principal</Link>
            <Link to="/perfil" className="text-slate-700 hover:text-slate-900">Perfil</Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
              title={session?.user?.email || "Cerrar sesión"}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}