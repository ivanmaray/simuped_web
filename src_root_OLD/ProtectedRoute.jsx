// src/ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { supabase } from "./supabaseClient";

export default function ProtectedRoute() {
  const { ready, session, profile } = useAuth();
  const location = useLocation();
  const isOnPending = location.pathname.startsWith("/pendiente");

  // Evitar decidir antes de que el perfil haya tenido oportunidad de cargarse.
  // Damos un “tick” para que el efecto de carga en Auth se complete.
  const [checkedProfileOnce, setCheckedProfileOnce] = useState(false);
  // Resolved flag for approved (fallback a consulta directa si el profile aún no llegó)
  const [approvedEff, setApprovedEff] = useState(null);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setCheckedProfileOnce(true), 0);
    return () => clearTimeout(id);
  }, [ready, session?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function resolveApproved() {
      // Sin sesión, no podemos saber
      if (!session?.user?.id) {
        if (!cancelled) setApprovedEff(null);
        return;
      }
      // Si el profile ya trae approved booleano, úsalo
      if (profile && typeof profile.approved === "boolean") {
        if (!cancelled) setApprovedEff(!!profile.approved);
        return;
      }
      // Fallback: consulta directa a profiles por id
      try {
        const { data } = await supabase
          .from("profiles")
          .select("approved")
          .eq("id", session.user.id)
          .maybeSingle();
        if (!cancelled) setApprovedEff(!!data?.approved);
      } catch (_e) {
        if (!cancelled) setApprovedEff(null);
      }
    }
    resolveApproved();
    return () => { cancelled = true; };
  }, [session?.user?.id, profile?.approved]);

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

  // Si aún no llegó el profile, pero ya resolvimos approved por fallback, podemos continuar
  if (profile == null && approvedEff == null) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando perfil…
      </div>
    );
  }

  // 5) Comprobaciones reales
  const emailConfirmed = !!session.user?.email_confirmed_at;
  const approved = typeof approvedEff === "boolean" ? approvedEff : !!profile?.approved;

  // eslint-disable-next-line no-console
  console.debug("[ProtectedRoute] emailConfirmed:", emailConfirmed, "approved:", approved);
  // eslint-disable-next-line no-console
  console.debug("[ProtectedRoute] path:", location.pathname, "isOnPending:", isOnPending);
  // eslint-disable-next-line no-console
  console.debug("[ProtectedRoute] approvedEff:", approvedEff);

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