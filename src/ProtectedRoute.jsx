// src/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";

export default function ProtectedRoute() {
  const { loading, session, emailConfirmed, isApproved } = useAuth();
  const location = useLocation();

  // 1) Mientras cargamos estado auth
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-slate-600">Cargando…</div>
      </div>
    );
  }

  // 2) No logueado -> a landing
  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // 3) Logueado pero sin email verificado o sin aprobar -> a /pendiente
  if (!emailConfirmed || !isApproved) {
    return <Navigate to="/pendiente" replace />;
  }

  // 4) OK
  return <Outlet />;
}