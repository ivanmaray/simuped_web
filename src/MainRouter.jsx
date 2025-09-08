// src/MainRouter.jsx
import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  Outlet,
  useParams,
  useSearchParams
} from "react-router-dom";

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
import PresencialInfo from "./pages/PresencialInfo.jsx";
import PresencialInforme from "./pages/PresencialInforme.jsx";

import Admin from "./pages/Admin.jsx";

import { useAuth } from "./auth";
import { supabase } from "./supabaseClient";

function DebugRouteLogger() {
  const location = useLocation();
  console.debug("Montando ruta:", location.pathname);
  return null;
}

// Guard Admin con tri-estado: mientras isAdmin === null no redirige
function RequireAdmin({ children }) {
  const { ready, session } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(null); // null = cargando, true/false = decidido

  React.useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!ready) return; // espera a AuthProvider
      if (!session) {
        setIsAdmin(false);
        return;
      }

      // 1) Metadatos del token
      const metaAdmin = Boolean(
        session?.user?.user_metadata?.is_admin ||
          session?.user?.app_metadata?.is_admin
      );
      if (metaAdmin) {
        if (!cancelled) setIsAdmin(true);
        return;
      }

      // 2) Fallback: tabla profiles
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .maybeSingle();
        if (error) console.debug("[RequireAdmin] profiles error:", error);
        if (!cancelled) setIsAdmin(Boolean(data?.is_admin));
      } catch (e) {
        console.debug("[RequireAdmin] profiles throw:", e);
        if (!cancelled) setIsAdmin(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  React.useEffect(() => {
    console.debug(
      "[RequireAdmin] ready:",
      ready,
      "session:",
      !!session,
      "isAdmin:",
      isAdmin
    );
  }, [ready, session, isAdmin]);

  // Aún cargando → no bloquear rutas ni redirigir todavía
  if (!ready || isAdmin === null) return null;

  if (!session) return <Navigate to="/" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-700 p-6">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">Acceso restringido</h2>
          <p className="text-sm">
            Esta sección es solo para instructores/administradores.
          </p>
          <a
            href="/dashboard"
            className="inline-block mt-4 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
          >
            Volver al panel
          </a>
        </div>
      </div>
    );
  }

  return children ?? <Outlet />;
}

/** Puerta de acceso al escenario 1 pantalla: exige venir de Confirm con ?session= */
function EscenarioViaConfirmGate() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const hasSession = Boolean(searchParams.get("session"));

  if (!hasSession) {
    // Si no trae ?session= obligamos a pasar por la confirmación
    return <Navigate to={`/presencial/${id}/confirm`} replace />;
  }
  return <PresencialEscenario />;
}

/** Si el instructor entra sin :sessionId, lo mandamos a Confirm en modo dual */
function InstructorViaConfirmGate() {
  const { id } = useParams();
  // IMPORTANTE: usamos flow=dual (no 'mode')
  return <Navigate to={`/presencial/${id}/confirm?flow=dual`} replace />;
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
        <Route path="/presencial-info" element={<PresencialInfo />} />

        {/* Pantalla pública de alumnos por código */}
        <Route path="/presencial/alumno/:code" element={<PresencialAlumno />} />
        <Route path="/presencial-alumno/:code" element={<PresencialAlumno />} />

        {/* Requieren usuario autenticado */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Online */}
          <Route path="/simulacion" element={<Simulacion />} />
          <Route
            path="/simulacion/:id/confirm"
            element={<SimulacionConfirm />}
          />
          <Route path="/simulacion/:id" element={<SimulacionDetalle />} />

          {/* Evaluación */}
          <Route path="/evaluacion" element={<Evaluacion />} />
          <Route
            path="/evaluacion/attempt/:attemptId"
            element={<AttemptReview />}
          />
          {/* Informe presencial visto desde Evaluación */}
          <Route
            path="/evaluacion/informe/:sessionId"
            element={<PresencialInforme />}
          />

          {/* Perfil */}
          <Route path="/perfil" element={<Perfil />} />

          {/* Presencial (1 pantalla) - NO admin */}
          <Route path="/presencial" element={<PresencialListado />} />
          {/* Alias directo al listado en modo DUAL */}
          <Route
            path="/presencial/dual"
            element={<Navigate to="/presencial?flow=dual" replace />}
          />
          <Route
            path="/presencial/:id/confirm"
            element={<PresencialConfirm />}
          />
          {/* El escenario exige venir de Confirm con ?session= */}
          <Route
            path="/presencial/:id/escenario"
            element={<EscenarioViaConfirmGate />}
          />
          {/* Informe presencial accesible a autenticados */}
          <Route
            path="/presencial/:id/informe"
            element={<PresencialInforme />}
          />

          {/* Presencial (DUAL) - SOLO admin/instructor */}
          <Route element={<RequireAdmin />}>
            {/* Atajo sin id -> listado (o lo que prefieras) */}
            <Route
              path="/presencial/instructor"
              element={<Navigate to="/presencial" replace />}
            />
            {/* Si no trae sessionId, fuerza confirm con flow=dual */}
            <Route
              path="/presencial/instructor/:id"
              element={<InstructorViaConfirmGate />}
            />
            {/* Dual ya con sesión creada */}
            <Route
              path="/presencial/instructor/:id/:sessionId"
              element={<PresencialInstructor />}
            />
          </Route>

          {/* Admin panel (si lo usáis) */}
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}