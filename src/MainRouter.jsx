// src/MainRouter.jsx
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import App from "./App.jsx"; // Landing pública con login/marketing
import ProtectedRoute from "./ProtectedRoute.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Simulacion from "./pages/Simulacion.jsx";
import SimulacionDetalle from "./pages/SimulacionDetalle.jsx";
import SimulacionConfirm from "./pages/SimulacionConfirm.jsx";
import Evaluacion from "./pages/Evaluacion.jsx";
import Perfil from "./pages/Perfil.jsx";
import Registro from "./pages/Registro.jsx";
import Pendiente from "./pages/Pendiente.jsx";
import AttemptReview from "./pages/AttemptReview.jsx";
import PresencialListado from "./pages/PresencialListado.jsx";
import PresencialEscenario from "./pages/PresencialEscenario.jsx";
import PresencialConfirm from "./pages/PresencialConfirm.jsx";
import PresencialInstructor from "./pages/PresencialInstructor.jsx";
import PresencialAlumno from "./pages/PresencialAlumno.jsx";
import Admin from "./pages/Admin.jsx";

import { useAuth } from "./auth";
import { supabase } from "./supabaseClient";

function DebugRouteLogger() {
  const location = useLocation();
  console.debug("Montando ruta:", location.pathname);
  return null;
}

const BYPASS_ADMIN_GUARD = true; // TODO: set to false when ready

function RequireAdmin({ children }) {
  const { ready, session } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!ready) return;
      if (!session) { setIsAdmin(false); return; }

      const metaAdmin = Boolean(
        session?.user?.user_metadata?.is_admin ||
        session?.user?.app_metadata?.is_admin
      );

      if (metaAdmin) { if (!cancelled) setIsAdmin(true); return; }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .maybeSingle();
        if (error) console.debug('[RequireAdmin] profiles error:', error);
        if (!cancelled) setIsAdmin(Boolean(data?.is_admin));
      } catch (e) {
        console.debug('[RequireAdmin] profiles throw:', e);
        if (!cancelled) setIsAdmin(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [ready, session]);

  // Debug logs for routing issues
  React.useEffect(() => {
    console.debug('[RequireAdmin] ready:', ready, 'session:', !!session, 'isAdmin:', isAdmin);
  }, [ready, session, isAdmin]);

  if (BYPASS_ADMIN_GUARD) {
    // TEMP: allow navigation while we finish wiring roles; keep logs visible
    return children;
  }

  if (!ready || isAdmin === null) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Comprobando permisos…
      </div>
    );
  }

  if (!session) return <Navigate to="/" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-700 p-6">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">Acceso restringido</h2>
          <p className="text-sm">Esta sección es solo para instructores/administradores.</p>
          <a href="/dashboard" className="inline-block mt-4 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100">Volver al panel</a>
        </div>
      </div>
    );
  }

  return children;
}

export default function MainRouter() {
  return (
    <>
      <DebugRouteLogger />
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<App />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/pendiente" element={<Pendiente />} />
        <Route path="/presencial/alumno/:code" element={<PresencialAlumno />} />
        <Route path="/presencial-alumno/:code" element={<PresencialAlumno />} />

        {/* Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/simulacion" element={<Simulacion />} />
          <Route path="/simulacion/:id/confirm" element={<SimulacionConfirm />} />
          <Route path="/simulacion/:id" element={<SimulacionDetalle />} />
          <Route path="/evaluacion" element={<Evaluacion />} />
          <Route path="/evaluacion/attempt/:attemptId" element={<AttemptReview />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/presencial" element={<PresencialListado />} />
          <Route path="/presencial/:id" element={<PresencialEscenario />} />
          <Route path="/presencial/:id/confirm" element={<PresencialConfirm />} />
          <Route path="/presencial/confirm/:id/:sessionId" element={<PresencialConfirm />} />
          <Route
            path="/presencial/instructor"
            element={
              <RequireAdmin>
                <PresencialInstructor />
              </RequireAdmin>
            }
          />
          <Route
            path="/presencial/instructor/:id/:sessionId"
            element={
              <RequireAdmin>
                <PresencialInstructor />
              </RequireAdmin>
            }
          />
          <Route path="/simulacion/:id/presencial" element={<PresencialEscenario />} />
          <Route path="/simulacion/:id/presencial/confirm" element={<PresencialConfirm />} />
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}