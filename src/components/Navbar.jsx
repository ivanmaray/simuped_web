// src/components/Navbar.jsx
import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useOptionalAuth } from "../auth.jsx";
import logo from "../assets/logo-simuped.avif";

export default function Navbar({ variant = "auto" }) {
  const auth = useOptionalAuth();
  const session = auth?.session ?? null;
  const profile = auth?.profile ?? null;
  const isAdmin = auth?.isAdmin ?? !!profile?.is_admin;
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Inject navbar styles
  const navbarStyles = `
    .nav-link {
      transition: color 0.15s ease, background 0.15s ease;
    }
    .nav-link:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .nav-link.active {
      color: #0A3D91;
      background: #eff6ff;
    }
    .nav-cta {
      transition: all 0.15s ease;
    }
    .nav-cta:hover {
      opacity: 0.9;
    }
  `;

  // Privado si hay sesión o si se fuerza por prop
  const isPrivate = variant === "private" || (variant === "auto" && !!session);

  async function handleSignOut() {
    if (loggingOut) return; // Evitar múltiples llamadas
    setLoggingOut(true);
    try {
      await supabase.auth.signOut({ scope: "global" });
    } finally {
      setLoggingOut(false);
      navigate("/", { replace: true });
    }
  }

  return (
    <>
      <style>{navbarStyles}</style>
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          <div className="h-14 md:h-16 flex items-center gap-4">
            {/* Brand */}
            <Link to="/" aria-label="Inicio SimuPed" className="flex items-center gap-2 shrink-0">
              <img
                src={logo}
                alt="SimuPed"
                className="h-9 md:h-10 w-auto object-contain"
              />
              <span className="text-[#0A3D91] text-lg md:text-xl font-bold tracking-tight">SimuPed</span>
            </Link>

            {/* Desktop nav — links principales centrados */}
            <nav
              className="hidden md:flex flex-1 items-center gap-1"
              aria-label="Navegacion principal"
            >
              <NavItem to="/" label="Inicio" />

              {!isPrivate && (
                <>
                  <AnchorItem href="/#proyecto" label="Proyecto" />
                  <AnchorItem href="/#como-participar" label="Cómo participar" />
                </>
              )}

              {isPrivate && <NavItem to="/simulacion" label="Simulación online" />}
              {isPrivate && (
                <NavItem
                  to={isAdmin ? "/presencial" : "/presencial-info"}
                  label="Simulación presencial"
                />
              )}
              {isPrivate && isAdmin && (
                <EntrenamientoDropdown />
              )}
              {isPrivate && <NavItem to="/evaluacion" label="Evaluación" />}
              {isAdmin && <NavItem to="/admin" label="Admin" emphasize />}
            </nav>

            {/* Derecha: perfil + salir (o registro + entrar) */}
            <div className="hidden md:flex items-center gap-2 shrink-0 ml-auto pl-3 border-l border-slate-200">
              {isPrivate ? (
                <>
                  <NavLink
                    to="/perfil"
                    className={({ isActive }) =>
                      `px-3 py-1.5 text-sm font-medium rounded-lg border transition nav-link ${isActive ? "text-[#0A3D91] border-slate-200 bg-slate-50" : "text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"}`
                    }
                  >
                    Perfil
                  </NavLink>
                  <LogoutButton onClick={handleSignOut} disabled={loggingOut} />
                </>
              ) : (
                <>
                  <NavItem to="/registro" label="Registro" isCTA />
                  <a href="#login" className="nav-cta inline-flex px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: '#0A3D91' }}>
                    Entrar
                  </a>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={open ? "true" : "false"}
              onClick={() => setOpen(v => !v)}
              className="md:hidden ml-auto inline-flex items-center justify-center rounded-lg border border-slate-200 px-2.5 py-2 text-slate-600"
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
        <div className={`md:hidden transition-[max-height,opacity] duration-300 ease-out overflow-y-auto border-t border-slate-200 ${open ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="bg-white">
            <nav className="max-w-6xl mx-auto px-4 py-3 grid gap-2">
              <MobileItem to="/" label="Inicio" onClick={() => setOpen(false)} />

              {!isPrivate && (
                <>
                  <MobileAnchor href="/#proyecto" label="Proyecto" onClick={() => setOpen(false)} />
                  <MobileAnchor href="/#como-participar" label="Cómo participar" onClick={() => setOpen(false)} />
                </>
              )}

              {isPrivate && <MobileItem to="/simulacion" label="Simulación online" onClick={() => setOpen(false)} />}
              {isPrivate && (
                <MobileItem
                  to={isAdmin ? "/presencial" : "/presencial-info"}
                  label="Simulación presencial"
                  onClick={() => setOpen(false)}
                />
              )}
              {isPrivate && isAdmin && (
                <MobileItem
                  to="/entrenamiento-rapido"
                  label="Casos rápidos"
                  tag="En desarrollo"
                  onClick={() => setOpen(false)}
                />
              )}
              {isPrivate && isAdmin && (
                <MobileItem
                  to="/entrenamiento-interactivo"
                  label="Simulación virtual"
                  tag="En desarrollo"
                  onClick={() => setOpen(false)}
                />
              )}
              {isPrivate && <MobileItem to="/evaluacion" label="Evaluación" onClick={() => setOpen(false)} />}
              {isAdmin && <MobileItem to="/admin" label="Admin" emphasize onClick={() => setOpen(false)} />}

              {isPrivate ? (
                <>
                  <MobileItem to="/perfil" label="Perfil" onClick={() => setOpen(false)} />
                  <button
                    type="button"
                    onClick={async () => { setOpen(false); await handleSignOut(); }}
                    disabled={loggingOut}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-800 disabled:opacity-50"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    Salir
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

function EntrenamientoDropdown() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isActive = location.pathname.startsWith("/entrenamiento");

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium rounded-lg nav-link transition whitespace-nowrap ${isActive ? "active text-slate-900" : "text-slate-700"}`}
      >
        Entrenamiento
        <svg className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1 z-50">
          <NavLink
            to="/entrenamiento-rapido"
            className={({ isActive }) =>
              `flex flex-col px-4 py-2.5 text-sm hover:bg-slate-50 transition ${isActive ? "text-[#0A3D91] font-medium" : "text-slate-700"}`
            }
          >
            <span>Casos rápidos</span>
            <span className="text-xs text-amber-600 font-normal">En desarrollo</span>
          </NavLink>
          <NavLink
            to="/entrenamiento-interactivo"
            className={({ isActive }) =>
              `flex flex-col px-4 py-2.5 text-sm hover:bg-slate-50 transition ${isActive ? "text-[#0A3D91] font-medium" : "text-slate-700"}`
            }
          >
            <span>Simulación virtual</span>
            <span className="text-xs text-amber-600 font-normal">En desarrollo</span>
          </NavLink>
        </div>
      )}
    </div>
  );
}

function NavItem({ to, label, emphasize = false, tag, isCTA = false }) {
  const base = "inline-flex px-2.5 py-1.5 text-sm font-medium leading-tight rounded-lg nav-link transition whitespace-nowrap";

  if (isCTA) {
    return (
      <NavLink
        to={to}
        className="nav-cta inline-flex min-h-[36px] px-4 py-2 text-sm font-semibold text-white rounded-lg"
        style={{ background: '#0A3D91' }}
      >
        <span>{label}</span>
      </NavLink>
    );
  }

  if (emphasize) {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          base + " font-semibold " + (isActive ? "text-[#0A3D91] active" : "text-[#0A3D91]")
        }
      >
        {label}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) => base + (isActive ? " active text-[#0A3D91]" : " text-slate-600 hover:text-slate-900")}
    >
      {label}
    </NavLink>
  );
}

function AnchorItem({ href, label }) {
  const base = "inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg nav-link text-slate-700 transition whitespace-nowrap";
  return (
    <a href={href} className={base}>
      {label}
    </a>
  );
}

function LogoutButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="nav-cta inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      style={{ background: '#0A3D91' }}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Salir
    </button>
  );
}

function MobileItem({ to, label, emphasize = false, tag, onClick }) {
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
      <div className="flex flex-col gap-1">
        <span>{label}</span>
        {tag ? (
          <span className="inline-flex w-fit rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-amber-700 whitespace-nowrap">
            {tag}
          </span>
        ) : null}
      </div>
    </NavLink>
  );
}

function MobileAnchor({ href, label, onClick }) {
  const base = "w-full px-3 py-2 text-base rounded-lg border border-slate-200 bg-white text-slate-800";
  return (
    <a href={href} onClick={onClick} className={base}>
      {label}
    </a>
  );
}
