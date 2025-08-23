// src/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [approved, setApproved] = useState(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;

      const sess = data?.session ?? null;
      setSession(sess);

      // Sin sesión -> landing
      if (!sess) {
        setLoading(false);
        return;
      }

      // Email verificado (v2): user.email_confirmed_at (o confirmed_at)
      const u = sess.user;
      const confirmed =
        !!u?.email_confirmed_at ||
        !!u?.confirmed_at ||
        // fallback: algunas identidades marcan verificación
        (Array.isArray(u?.identities) &&
          u.identities.some((id) => id?.identity_data?.email && id?.verified));
      setEmailConfirmed(!!confirmed);

      // Carga approved desde profiles
      const { data: prof, error: eProf } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", u.id)
        .maybeSingle();

      if (!alive) return;
      if (eProf) {
        console.warn("[ProtectedRoute] error leyendo profiles.approved:", eProf);
        setApproved(false);
      } else {
        setApproved(!!prof?.approved);
      }

      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess ?? null);
    });

    return () => {
      alive = false;
      try { sub?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando…
      </div>
    );
  }

  // Sin sesión -> a la landing
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Con sesión pero email sin verificar o sin aprobar -> a /pendiente
  if (!emailConfirmed || approved === false) {
    return <Navigate to="/pendiente" replace />;
  }

  // Autenticado + verificado + aprobado
  return <Outlet />;
}