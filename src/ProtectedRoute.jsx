// src/ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

function LoadingWithRecovery({ message, onRetry }) {
  const [stuckSecs, setStuckSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStuckSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const showRetry = stuckSecs >= 8;

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="flex items-center justify-center gap-3 text-slate-600">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
          <span>{message}</span>
        </div>
        {showRetry && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-sm text-amber-900">
              Está tardando más de lo normal. Puedes reintentar sin recargar la página.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A3D91] text-white text-sm px-3 py-1.5 hover:bg-[#0b4cb0] transition"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 text-slate-700 text-sm px-3 py-1.5 hover:bg-white transition"
              >
                Recargar página
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProtectedRoute() {
  const { ready, session, profile, refreshProfile } = useAuth();
  const location = useLocation();

  const isOnPending = location.pathname.startsWith("/pendiente");
  const isAdminPath = location.pathname.startsWith("/admin");

  // 1) Mientras el contexto no esté listo, no decidir
  if (!ready) {
    return (
      <LoadingWithRecovery
        message="Cargando…"
        onRetry={() => window.location.reload()}
      />
    );
  }

  // 2) Sin sesión → landing
  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // 3) Necesitamos el perfil para saber `approved` / `is_admin`
  if (!profile) {
    return (
      <LoadingWithRecovery
        message="Cargando perfil…"
        onRetry={() => { refreshProfile?.(); }}
      />
    );
  }

  // 4) Reglas de acceso
  // Supabase expone `email_confirmed_at` (y en algunos proyectos `confirmed_at`).
  const emailConfirmed = !!(
    session.user?.email_confirmed_at || session.user?.confirmed_at
  );
  const approved = profile?.approved === true;
  const isAdmin = !!profile?.is_admin;

  // Permite acceder a /admin si es admin aunque el perfil no esté aprobado
  // (pero SIEMPRE exige email confirmado por seguridad)
  const canAccess = emailConfirmed && (approved || (isAdminPath && isAdmin));

  if (!canAccess) {
    // Evita bucles si ya estás en /pendiente
    if (isOnPending) return <Outlet />;
    return <Navigate to="/pendiente" replace />;
  }

  // 5) Si intenta entrar en /admin sin ser admin → dashboard
  if (isAdminPath && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // 6) OK → renderizar ruta protegida, envuelta en un ErrorBoundary que
  //    se reinicia al cambiar de ruta (key={pathname}) para que un fallo
  //    en una página no bloquee toda la app hasta un F5.
  return (
    <ErrorBoundary key={location.pathname}>
      <Outlet />
    </ErrorBoundary>
  );
}
