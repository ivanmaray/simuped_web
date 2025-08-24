// src/MainRouter.jsx
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

function DebugRouteLogger() {
  const location = useLocation();
  console.debug("Montando ruta:", location.pathname);
  return null;
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

        {/* Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/simulacion" element={<Simulacion />} />
          <Route path="/simulacion/:id/confirm" element={<SimulacionConfirm />} />
          <Route path="/simulacion/:id" element={<SimulacionDetalle />} />
          <Route path="/escenarios" element={<Escenarios />} />
          <Route path="/evaluacion" element={<Evaluacion />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}