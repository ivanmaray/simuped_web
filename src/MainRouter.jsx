// src/MainRouter.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'                        // Landing con login
import ProtectedRoute from './ProtectedRoute.jsx'  // wrapper
import Dashboard from './pages/Dashboard.jsx'
import Simulacion from './pages/Simulacion.jsx'
import Escenarios from './pages/Escenarios.jsx'
import Evaluacion from './pages/Evaluacion.jsx'
import Perfil from './pages/Perfil.jsx'

export default function MainRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pública */}
        <Route path="/" element={<App />} />

        {/* Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/simulacion" element={<Simulacion />} />
          <Route path="/escenarios" element={<Escenarios />} />
          <Route path="/evaluacion" element={<Evaluacion />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}