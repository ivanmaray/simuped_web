// src/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";

export default function ProtectedRoute() {
  const { ready, session, profile } = useAuth();
  const location = useLocation();
  const isOnPending = location.pathname.startsWith("/pendiente");

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

  // 3) Necesitamos el perfil para saber `approved`
  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando perfil…
      </div>
    );
  }

  // 4) Reglas de acceso
  const emailConfirmed = !!session.user?.email_confirmed_at; // Supabase
  const approved = profile.approved === true; // boolean estricto

  // Debug útil en desarrollo
  // console.debug("[ProtectedRoute] ready=", ready, "emailConfirmed=", emailConfirmed, "approved=", approved, "path=", location.pathname);

  if (!emailConfirmed || !approved) {
    // Evita bucles si ya estás en /pendiente
    if (isOnPending) return <Outlet />;
    return <Navigate to="/pendiente" replace />;
  }

  // 5) OK → renderizar ruta protegida
  return <Outlet />;
}