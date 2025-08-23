// src/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth';

export default function ProtectedRoute() {
  const { ready, session, emailConfirmed, approved } = useAuth();

  // Espera a tener estado resuelto antes de decidir
  if (!ready) return null; // o spinner minúsculo

  if (!session) return <Navigate to="/" replace />;

  if (!emailConfirmed) return <Navigate to="/pendiente?reason=email" replace />;

  if (!approved) return <Navigate to="/pendiente?reason=approval" replace />;

  return <Outlet />;
}