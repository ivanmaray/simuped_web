// src/MainRouter.jsx
// Nota: imports usando rutas relativas (sin alias "@")
// Si en el futuro activas alias en Vite ("@" -> "/src"),
// podrás cambiar estos imports a '@/…'. De momento, los
// './features/…', './auth/…' y './supabaseClient' son correctos.
import React, { Suspense } from "react";
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
import Spinner from "./components/Spinner.jsx";

// Lazy-loaded pages (reduce initial bundle)
const Dashboard = React.lazy(() => import("./features/principal/pages/Principal_Dashboard.jsx"));
const ScheduledSessions = React.lazy(() => import("./features/principal/pages/ScheduledSessions.jsx"));
const CreateScheduledSession = React.lazy(() => import("./features/principal/pages/CreateScheduledSession.jsx"));
const ConfirmInvite = React.lazy(() => import("./features/principal/pages/ConfirmInvite.jsx"));
const LegalPrivacidad = React.lazy(() => import("./features/principal/pages/Legal_Privacidad.jsx"));
const LegalCookies = React.lazy(() => import("./features/principal/pages/Legal_Cookies.jsx"));
const Simulacion = React.lazy(() => import("./features/online/pages/Online_Main.jsx"));
const SimulacionDetalle = React.lazy(() => import("./features/online/pages/Online_Detalle.jsx"));
const SimulacionConfirm = React.lazy(() => import("./features/online/pages/Online_Confirm.jsx"));
const Evaluacion = React.lazy(() => import("./features/evaluacion/pages/Evaluacion_Main.jsx"));
const Perfil = React.lazy(() => import("./features/principal/pages/Principal_Perfil.jsx"));
const Certificate = React.lazy(() => import("./features/principal/pages/Certificate.jsx"));
const Registro = React.lazy(() => import("./auth/pages/Auth_Registro.jsx"));
const Pendiente = React.lazy(() => import("./auth/pages/Auth_Pendiente.jsx"));
const AttemptReview = React.lazy(() => import("./features/online/pages/Online_AttemptReview.jsx"));

const PresencialListado = React.lazy(() => import("./features/presencial/pages/shared/Presencial_Listado.jsx"));
const PresencialEscenario = React.lazy(() => import("./features/presencial/pages/unica/Presencial_Escenario.jsx"));
const PresencialConfirm = React.lazy(() => import("./features/presencial/pages/shared/Presencial_Confirm.jsx"));
const PresencialInstructor = React.lazy(() => import("./features/presencial/pages/dual/Presencial_Instructor.jsx"));
const PresencialAlumno = React.lazy(() => import("./features/presencial/pages/dual/Presencial_Alumno.jsx"));
const PresencialInfo = React.lazy(() => import("./features/presencial/pages/shared/Presencial_Info.jsx"));
const PresencialInforme = React.lazy(() => import("./features/presencial/pages/shared/Presencial_Informe.jsx"));

const Admin = React.lazy(() => import("./features/admin/pages/Admin_Usuarios.jsx"));

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
    <Route path="/registro" element={<Suspense fallback={<Spinner centered />}><Registro /></Suspense>} />
    <Route path="/pendiente" element={<Suspense fallback={<Spinner centered />}><Pendiente /></Suspense>} />
    <Route path="/presencial-info" element={<Suspense fallback={<Spinner centered />}><PresencialInfo /></Suspense>} />
  <Route path="/privacidad" element={<Suspense fallback={<Spinner centered />}><LegalPrivacidad /></Suspense>} />
  <Route path="/cookies" element={<Suspense fallback={<Spinner centered />}><LegalCookies /></Suspense>} />

        {/* Pantalla pública de alumnos por código */}
  <Route path="/presencial/alumno/:code" element={<Suspense fallback={<Spinner centered />}><PresencialAlumno /></Suspense>} />
  <Route path="/presencial-alumno/:code" element={<Suspense fallback={<Spinner centered />}><PresencialAlumno /></Suspense>} />
  <Route path="/confirm-invite" element={<Suspense fallback={<Spinner centered />}><ConfirmInvite /></Suspense>} />

        {/* Requieren usuario autenticado */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Suspense fallback={<Spinner centered />}><Dashboard /></Suspense>} />
          <Route path="/sesiones-programadas" element={<Suspense fallback={<Spinner centered />}><ScheduledSessions /></Suspense>} />
          <Route element={<RequireAdmin />}>
            <Route path="/sesiones-programadas/crear" element={<Suspense fallback={<Spinner centered />}><CreateScheduledSession /></Suspense>} />
          </Route>

          {/* Online */}
          <Route path="/simulacion" element={<Suspense fallback={<Spinner centered />}><Simulacion /></Suspense>} />
          <Route
            path="/simulacion/:id/confirm"
            element={<Suspense fallback={<Spinner centered />}><SimulacionConfirm /></Suspense>}
          />
          <Route path="/simulacion/:id" element={<Suspense fallback={<Spinner centered />}><SimulacionDetalle /></Suspense>} />

          {/* Evaluación */}
          <Route path="/evaluacion" element={<Suspense fallback={<Spinner centered />}><Evaluacion /></Suspense>} />
          <Route
            path="/evaluacion/attempt/:attemptId"
            element={<Suspense fallback={<Spinner centered />}><AttemptReview /></Suspense>}
          />
          <Route
            path="/evaluacion/informe/:sessionId"
            element={<PresencialInforme />}
          />

          {/* Perfil */}
          <Route path="/perfil" element={<Suspense fallback={<Spinner centered />}><Perfil /></Suspense>} />
          <Route path="/certificado" element={<Suspense fallback={<Spinner centered />}><Certificate /></Suspense>} />

          {/* Presencial (1 pantalla) - NO admin */}
          <Route path="/presencial" element={<Suspense fallback={<Spinner centered />}><PresencialListado /></Suspense>} />
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
            element={<Suspense fallback={<Spinner centered />}><PresencialConfirm /></Suspense>}
          />
          <Route
            path="/presencial/:id/escenario"
            element={<EscenarioViaConfirmGate />}
          />
          <Route
            path="/presencial/:id/informe"
            element={<Suspense fallback={<Spinner centered />}><PresencialInforme /></Suspense>}
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
              element={<Suspense fallback={<Spinner centered />}><PresencialInstructor /></Suspense>}
            />
          </Route>

          {/* Admin panel */}
          <Route path="/admin" element={<Suspense fallback={<Spinner />}><Admin /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
