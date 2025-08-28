// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import logo from "../assets/logo.png";
import logoWhite from "../assets/logo-white.png";

// helper for active link styles
function navLinkClass(isPrivate, active) {
  const base = isPrivate ? "text-slate-700 hover:text-slate-900" : "text-white hover:text-white/80";
  const activeCls = isPrivate ? "font-semibold underline underline-offset-4" : "font-semibold";
  return `${base} ${active ? activeCls : ""}`;
}

export default function Navbar() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(null);   // null | boolean
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    let mounted = true;

    async function loadSessionAndProfile() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const sess = data?.session ?? null;
      setSession(sess);
      setLoading(false);

      if (sess?.user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("approved, is_admin")
          .eq("id", sess.user.id)
          .maybeSingle();
        if (!mounted) return;
        setApproved(prof?.approved ?? null);
        setIsAdmin(!!prof?.is_admin);
      } else {
        setApproved(null);
        setIsAdmin(false);
      }
    }

    loadSessionAndProfile();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess ?? null);
      setLoading(false);

      if (sess?.user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("approved, is_admin")
          .eq("id", sess.user.id)
          .maybeSingle();
        if (!mounted) return;
        setApproved(prof?.approved ?? null);
        setIsAdmin(!!prof?.is_admin);
      } else {
        setApproved(null);
        setIsAdmin(false);
      }
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
  const isActive = (p) => pathname === p || pathname.startsWith(p + "/");

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
            <a href="#que-es" className={navLinkClass(false, false)}>¿Qué es?</a>
            <a href="#proyecto" className={navLinkClass(false, false)}>Proyecto</a>
            <a href="#equipo" className={navLinkClass(false, false)}>Equipo</a>
            <a href="#como-participar" className={navLinkClass(false, false)}>Participar</a>
            <Link
              to="/registro"
              className="px-3 py-1.5 rounded-lg font-medium bg-white/10 text-white hover:bg-white/20 transition"
            >
              Solicitar acceso
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
            {/* Email + estado */}
            <span
              className="hidden md:inline px-2.5 py-1 rounded-full text-sm bg-slate-100 text-slate-700"
              title={session?.user?.email || ""}
            >
              {session?.user?.email}
            </span>
            {approved === false && (
              <Link
                to="/pendiente"
                className="px-2.5 py-1 rounded-full text-xs bg-amber-100 text-amber-800 border border-amber-200"
                title="Cuenta pendiente de verificación/aprobación"
              >
                Pendiente
              </Link>
            )}
            {/* Navegación privada */}
            <Link to="/dashboard" className={navLinkClass(true, isActive("/dashboard"))}>Inicio</Link>
            <Link to="/simulacion" className={navLinkClass(true, isActive("/simulacion"))}>Simulaciones</Link>
            <Link to="/evaluacion" className={navLinkClass(true, isActive("/evaluacion"))}>Evaluación</Link>
            <Link to="/perfil" className={navLinkClass(true, isActive("/perfil"))}>Perfil</Link>
            {isAdmin && (
              <Link to="/admin" className={navLinkClass(true, isActive("/admin"))}>Admin</Link>
            )}
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