// src/components/ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1) Sesión
      const { data: sesRes } = await supabase.auth.getSession();
      const sess = sesRes?.session || null;
      if (!mounted) return;
      setHasSession(!!sess);

      if (!sess) {
        setReady(true);
        // No hay sesión → si no ya estamos en inicio, vete a inicio
        if (location.pathname !== "/") {
          navigate("/", { replace: true });
        }
        return;
      }

      // 2) Usuario (verificación email)
      const { data: usrRes } = await supabase.auth.getUser();
      const user = usrRes?.user || null;
      if (!mounted) return;
      const confirmed = !!user?.email_confirmed_at;
      setEmailConfirmed(confirmed);

      // 3) Aprobación en profiles
      let isApproved = false;
      if (user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("approved")
          .eq("id", user.id)
          .maybeSingle();
        isApproved = !!prof?.approved;
      }
      if (!mounted) return;
      setApproved(isApproved);

      setReady(true);

      // 4) Redirecciones de acceso
      const isOnPending = location.pathname.startsWith("/pendiente");
      if (!confirmed || !isApproved) {
        // Si no está verificado/aprobado y no estamos ya en /pendiente, redirige
        if (!isOnPending) navigate("/pendiente", { replace: true });
        return;
      }

      // Si está todo ok y está en /pendiente, muévelo al dashboard
      if (isOnPending) navigate("/dashboard", { replace: true });
    })();

    return () => { mounted = false; };
  }, [location.pathname, navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando…</div>
      </div>
    );
  }

  if (!hasSession) return null; // ya navegamos a inicio

  // Si llega aquí, tiene sesión y está verificado + aprobado, o está en pending y ya se redirigió
  return children;
}