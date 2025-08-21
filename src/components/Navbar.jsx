// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import logo from "../assets/logo.png";

export default function Navbar() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    let mounted = true;

    // sesión actual
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session ?? null);
    });

    // escuchar cambios (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (mounted) setSession(sess ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/"); // vuelve a la landing
  };

  const isPrivate = !!session; // si hay sesión, navbar “privado”

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="SimuPed" className="h-10 w-10 object-contain" />
          <span className="text-lg font-semibold text-slate-900">SimuPed</span>
        </Link>

        {!isPrivate ? (
          // Navbar público (landing)
          <div className="flex items-center gap-4">
            <a href="#que-es" className="text-slate-700 hover:text-slate-900">¿Qué es?</a>
            <a href="#equipo" className="text-slate-700 hover:text-slate-900">Equipo</a>
            <a href="#proyecto" className="text-slate-700 hover:text-slate-900">Proyecto</a>
            <a href="#como-participar" className="text-slate-700 hover:text-slate-900">Participar</a>
            {pathname !== "/" && (
              <Link
                to="/"
                className="ml-2 px-3 py-1.5 rounded-lg font-medium text-slate-900"
                style={{ background: "#1fced1" }}
              >
                Entrar
              </Link>
            )}
          </div>
        ) : (
          // Navbar privado (logueado)
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-slate-700 hover:text-slate-900">Página Principal</Link>
            <Link to="/perfil" className="text-slate-700 hover:text-slate-900">Perfil</Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
              title={session.user?.email || "Cerrar sesión"}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}