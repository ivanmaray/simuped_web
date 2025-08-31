// src/components/Navbar.jsx
import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth.jsx";
import logo from "../assets/logo.png";

export default function Navbar({ variant = "auto" }) {
  const { session, profile } = useAuth?.() || { session: null, profile: null };
  const isAdmin = !!profile?.is_admin;
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Público si no hay sesión
  const isPrivate = variant === "private" || (variant === "auto" && !!session);

  async function handleSignOut() {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } finally {
      navigate("/", { replace: true });
    }
  }

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <div className="h-14 md:h-16 flex items-center justify-between gap-3">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src={logo} alt="SimuPed" className="h-8 w-auto object-contain" />
              <span className="sr-only">SimuPed</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              <NavItem to="/" label="Inicio" />
              {isPrivate && <NavItem to="/simulacion" label="Simulaciones" />}
              {isPrivate && <NavItem to="/evaluacion" label="Evaluación" />}
              {isAdmin && <NavItem to="/admin" label="Admin" emphasize />}

              {isPrivate ? (
                <div className="flex items-center gap-2">
                  <NavItem to="/perfil" label="Perfil" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <NavItem to="/registro" label="Registro" />
                  {/* Entra al hero/login de la home */}
                  <NavItem to="/" label="Entrar" />
                </div>
              )}
            </nav>

            {/* Mobile toggle */}
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={open ? "true" : "false"}
              onClick={() => setOpen(v => !v)}
              className="md:hidden inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-slate-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        <div className={`md:hidden transition-[max-height,opacity] duration-300 ease-out overflow-hidden border-t border-slate-200 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="bg-white">
            <nav className="max-w-6xl mx-auto px-4 py-3 grid gap-2">
              <MobileItem to="/" label="Inicio" onClick={() => setOpen(false)} />
              {isPrivate && <MobileItem to="/simulacion" label="Simulaciones" onClick={() => setOpen(false)} />}
              {isPrivate && <MobileItem to="/evaluacion" label="Evaluación" onClick={() => setOpen(false)} />}
              {isAdmin && <MobileItem to="/admin" label="Admin" emphasize onClick={() => setOpen(false)} />}

              {isPrivate ? (
                <>
                  <MobileItem to="/perfil" label="Perfil" onClick={() => setOpen(false)} />
                  <button
                    type="button"
                    onClick={async () => { setOpen(false); await handleSignOut(); }}
                    className="w-full px-3 py-2 text-base rounded-lg border border-slate-200 bg-white text-slate-800 text-left"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <MobileItem to="/registro" label="Registro" onClick={() => setOpen(false)} />
                  <MobileItem to="/" label="Entrar" onClick={() => setOpen(false)} />
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Spacer to avoid overlap with fixed header */}
      <div className="h-14 md:h-16" />
    </>
  );
}

function NavItem({ to, label, emphasize = false }) {
  const base = "px-3 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 transition whitespace-nowrap";
  const cls = emphasize ? base + " text-white bg-slate-900 hover:bg-slate-800" : base + " text-slate-700";
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive && !emphasize ? base + " text-slate-900 bg-slate-100" : cls
      }
    >
      {label}
    </NavLink>
  );
}

function MobileItem({ to, label, emphasize = false, onClick }) {
  const base = "w-full px-3 py-2 text-base rounded-lg border border-slate-200";
  const cls = emphasize ? base + " bg-slate-900 text-white" : base + " bg-white text-slate-800";
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        isActive && !emphasize ? base + " bg-slate-100 text-slate-900 border-slate-300" : cls
      }
    >
      {label}
    </NavLink>
  );
}