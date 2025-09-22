// src/MainRouter.jsx
// Nota: imports usando rutas relativas (sin alias "@")
// Si en el futuro activas alias en Vite ("@" -> "/src"),
// podrás cambiar estos imports a '@/…'. De momento, los
// './features/…', './auth/…' y './supabaseClient' son correctos.
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

import Dashboard from "./features/principal/pages/Principal_Dashboard.jsx";
import Simulacion from "./features/online/pages/Online_Main.jsx";
import SimulacionDetalle from "./features/online/pages/Online_Detalle.jsx";
import SimulacionConfirm from "./features/online/pages/Online_Confirm.jsx";
import Evaluacion from "./features/evaluacion/pages/Evaluacion_Main.jsx";
import Perfil from "./features/principal/pages/Principal_Perfil.jsx";
import Registro from "./auth/pages/Auth_Registro.jsx";
import Pendiente from "./auth/pages/Auth_Pendiente.jsx";
import AttemptReview from "./features/online/pages/Online_AttemptReview.jsx";

import PresencialListado from "./features/presencial/pages/shared/Presencial_Listado.jsx";
import PresencialEscenario from "./features/presencial/pages/unica/Presencial_Escenario.jsx";
import PresencialConfirm from "./features/presencial/pages/shared/Presencial_Confirm.jsx";
import PresencialInstructor from "./features/presencial/pages/dual/Presencial_Instructor.jsx";
import PresencialAlumno from "./features/presencial/pages/dual/Presencial_Alumno.jsx";
import PresencialInfo from "./features/presencial/pages/shared/Presencial_Info.jsx";
import PresencialInforme from "./features/presencial/pages/shared/Presencial_Informe.jsx";

import Admin from "./features/admin/pages/Admin_Usuarios.jsx";

import { useAuth } from "./auth";

function DebugRouteLogger() {
  const location = useLocation();
  const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
  if (isDev) {
    console.debug("Montando ruta:", location.pathname + location.search);
  }
  return null;
}

function RequireAdmin({ children }) {
  const { ready, session, profile, isAdmin } = useAuth();

  if (!ready) return null;
  if (!session) return <Navigate to="/" replace />;

  if (!profile) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Cargando perfil…
      </div>
    );
  }

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

function EscenarioViaConfirmGate() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const hasSession = Boolean(searchParams.get("session"));

  if (!hasSession) {
    return <Navigate to={`/presencial/${id}/confirm`} replace />;
  }
  return <PresencialEscenario />;
}

function InstructorViaConfirmGate() {
  const { id } = useParams();
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
          <Route
            path="/evaluacion/informe/:sessionId"
            element={<PresencialInforme />}
          />

          {/* Perfil */}
          <Route path="/perfil" element={<Perfil />} />

          {/* Presencial (1 pantalla) - NO admin */}
          <Route path="/presencial" element={<PresencialListado />} />
          <Route path="/presencial/flow/dual" element={<PresencialListado />} />
          <Route
            path="/presencial/dual"
            element={<Navigate to="/presencial/flow/dual" replace />}
          />
          <Route
            path="/presencial-dual"
            element={<Navigate to="/presencial/flow/dual" replace />}
          />
          <Route
            path="/presencial/:id/confirm"
            element={<PresencialConfirm />}
          />
          <Route
            path="/presencial/:id/escenario"
            element={<EscenarioViaConfirmGate />}
          />
          <Route
            path="/presencial/:id/informe"
            element={<PresencialInforme />}
          />

          {/* Presencial (DUAL) - SOLO admin/instructor */}
          <Route element={<RequireAdmin />}>
            <Route
              path="/presencial/instructor"
              element={<Navigate to="/presencial" replace />}
            />
            <Route
              path="/presencial/instructor/:id"
              element={<InstructorViaConfirmGate />}
            />
            <Route
              path="/presencial/instructor/:id/:sessionId"
              element={<PresencialInstructor />}
            />
          </Route>

          {/* Admin panel */}
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
