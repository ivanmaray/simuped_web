// src/ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function ProtectedRoute() {
  const [checking, setChecking] = useState(true);
  const [allow, setAllow] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        // 1) Sesión
        const { data: sessData, error: sessErr } = await supabase.auth.getSession();
        if (!mounted) return;
        if (sessErr) {
          console.warn("[ProtectedRoute] getSession error:", sessErr);
        }
        const session = sessData?.session ?? null;
        if (!session) {
          console.log("[ProtectedRoute] No hay sesión -> '/'");
          setAllow(false);
          setChecking(false);
          navigate("/", { replace: true, state: { from: location.pathname } });
          return;
        }

        // 2) Usuario y email confirmado
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (!mounted) return;
        if (userErr) {
          console.warn("[ProtectedRoute] getUser error:", userErr);
        }
        const user = userData?.user ?? null;
        const emailConfirmed = !!user?.email_confirmed_at;
        if (!emailConfirmed) {
          console.log("[ProtectedRoute] Email NO confirmado -> '/pendiente?reason=email'");
          setAllow(false);
          setChecking(false);
          navigate("/pendiente?reason=email", { replace: true });
          return;
        }

        // 3) Perfil (approved / is_admin)
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("approved, is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (profErr) {
          console.warn("[ProtectedRoute] profiles select error:", profErr);
          // en caso de error de lectura de perfil, bloqueamos y mandamos a pendiente con motivo genérico
          setAllow(false);
          setChecking(false);
          navigate("/pendiente?reason=profile", { replace: true });
          return;
        }

        const approved = !!prof?.approved;
        const isAdmin = !!prof?.is_admin;

        if (approved || isAdmin) {
          console.log("[ProtectedRoute] Aprobado/Admin -> acceso concedido");
          setAllow(true);
          setChecking(false);
          return;
        }

        // Si no está aprobado y no es admin -> pendiente
        console.log("[ProtectedRoute] Cuenta NO aprobada -> '/pendiente?reason=approval'");
        setAllow(false);
        setChecking(false);
        navigate("/pendiente?reason=approval", { replace: true });
      } catch (e) {
        console.error("[ProtectedRoute] Error inesperado:", e);
        setAllow(false);
        setChecking(false);
        navigate("/pendiente?reason=error", { replace: true });
      }
    }

    check();

    // también nos suscribimos a cambios de auth para re-evaluar
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, _sess) => {
      if (!mounted) return;
      // re-evaluar rápido
      setChecking(true);
      setAllow(false);
      check();
    });

    return () => {
      mounted = false;
      try { sub?.subscription?.unsubscribe?.(); } catch {}
    };
    // IMPORTANTE: no pongas 'navigate' ni 'location' de dependencias para evitar bucles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-slate-600">Cargando…</div>
      </div>
    );
  }

  if (!allow) {
    // El navigate ya se hizo en el efecto; devolvemos un fallback por si acaso
    return <Navigate to="/pendiente" replace />;
  }

  return <Outlet />;
}