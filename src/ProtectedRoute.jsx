// src/ProtectedRoute.jsx
import { useEffect, useRef, useState } from "react";
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

  // Una vez hayamos renderizado el Outlet con sesión+perfil válidos, recordamos
  // los últimos valores buenos para no desmontar la página si el AuthProvider
  // pierde temporalmente session/profile (token refresh colgado, timeout de
  // red, etc.). Esto evita que el usuario vea "Cargando perfil…" en mitad de
  // una edición y pierda el estado de la página.
  const hasRenderedRef = useRef(false);
  const lastSessionRef = useRef(null);
  const lastProfileRef = useRef(null);

  if (session) lastSessionRef.current = session;
  if (profile) lastProfileRef.current = profile;

  const effectiveSession = session || lastSessionRef.current;
  const effectiveProfile = profile || lastProfileRef.current;

  // 1) Mientras el contexto no esté listo, no decidir (salvo que ya hayamos
  //    renderizado antes — entonces conservamos lo último).
  if (!ready && !hasRenderedRef.current) {
    return (
      <LoadingWithRecovery
        message="Cargando…"
        onRetry={() => window.location.reload()}
      />
    );
  }

  // 2) Sin sesión efectiva → landing (solo si nunca llegamos a renderizar).
  if (!effectiveSession) {
    if (hasRenderedRef.current) {
      // Mantén la página viva; la próxima navegación la sacará a "/" si sigue sin sesión.
      return (
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      );
    }
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // 3) Necesitamos el perfil para saber `approved` / `is_admin` — pero solo
  //    bloqueamos en el primer render. En renders posteriores usamos el último
  //    perfil válido.
  if (!effectiveProfile) {
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
    effectiveSession.user?.email_confirmed_at || effectiveSession.user?.confirmed_at
  );
  const approved = effectiveProfile?.approved === true;
  const isAdmin = !!effectiveProfile?.is_admin;

  // Permite acceder a /admin si es admin aunque el perfil no esté aprobado
  // (pero SIEMPRE exige email confirmado por seguridad)
  const canAccess = emailConfirmed && (approved || (isAdminPath && isAdmin));

  if (!canAccess) {
    // Evita bucles si ya estás en /pendiente
    if (isOnPending) {
      hasRenderedRef.current = true;
      return <Outlet />;
    }
    if (hasRenderedRef.current) {
      // No tirar la página en uso por un blip de auth.
      return (
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      );
    }
    return <Navigate to="/pendiente" replace />;
  }

  // 5) Si intenta entrar en /admin sin ser admin → dashboard
  if (isAdminPath && !isAdmin) {
    if (hasRenderedRef.current) {
      return (
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  // 6) OK → renderizar ruta protegida, envuelta en un ErrorBoundary que
  //    se reinicia al cambiar de ruta (key={pathname}) para que un fallo
  //    en una página no bloquee toda la app hasta un F5.
  hasRenderedRef.current = true;
  return (
    <ErrorBoundary key={location.pathname}>
      <Outlet />
    </ErrorBoundary>
  );
}
