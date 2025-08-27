// src/ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";

export default function ProtectedRoute() {
  const { ready, session, profile } = useAuth();
  const location = useLocation();
  const isOnPending = location.pathname.startsWith("/pendiente");

  // Evitar decidir antes de que el perfil haya tenido oportunidad de cargarse.
  // Damos un “tick” para que el efecto de carga en Auth se complete.
  const [checkedProfileOnce, setCheckedProfileOnce] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setCheckedProfileOnce(true), 0);
    return () => clearTimeout(id);
  }, [ready, session?.user?.id]);

  // DEBUG útil: mira en consola cómo va avanzando
  // eslint-disable-next-line no-console
  console.debug("[ProtectedRoute] ready:", ready, "hasSession:", !!session, "profile:", profile);

  // 1) Aún no está listo el contexto de auth → spinner
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando…
      </div>
    );
  }

  // 2) Sin sesión → al landing
  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // 3) Esperar a que Auth haya intentado cargar el perfil al menos una vez
  if (!checkedProfileOnce) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando…
      </div>
    );
  }

  // 4) Si aún no hay perfil, muestra spinner corto (evita salto a /pendiente por lag)
  //    Si tu app garantiza que siempre hay fila en profiles, esto no debería durar.
  if (profile == null) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando perfil…
      </div>
    );
  }

  // 5) Comprobaciones reales
  const emailConfirmed = !!session.user?.email_confirmed_at;
  const approved = !!profile.approved;

  // eslint-disable-next-line no-console
  console.debug("[ProtectedRoute] emailConfirmed:", emailConfirmed, "approved:", approved);
  // eslint-disable-next-line no-console
  console.debug("[ProtectedRoute] path:", location.pathname, "isOnPending:", isOnPending);

  if (!emailConfirmed || !approved) {
    // Si ya estamos en /pendiente, no navegamos otra vez (evita bucle/flash)
    if (isOnPending) {
      return <Outlet />;
    }
    return <Navigate to="/pendiente" replace />;
  }

  // 6) OK → renderiza la ruta protegida
  return <Outlet />;
}