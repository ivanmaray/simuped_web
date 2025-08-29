// src/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";

export default function ProtectedRoute() {
  const { ready, session, profile } = useAuth();
  const location = useLocation();

  const isOnPending = location.pathname.startsWith("/pendiente");
  const isAdminPath = location.pathname.startsWith("/admin");

  // 1) Mientras el contexto no esté listo, no decidir
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando…
      </div>
    );
  }

  // 2) Sin sesión → landing
  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // 3) Necesitamos el perfil para saber `approved` / `is_admin`
  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando perfil…
      </div>
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

  // 6) OK → renderizar ruta protegida
  return <Outlet />;
}