// src/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth'

export default function ProtectedRoute() {
  const { user, loading, emailConfirmed, profile } = useAuth()
  const approved = profile?.approved ?? false

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
        <span>Cargando…</span>
      </div>
    )
  }

  if (!user) {
    console.debug("[ProtectedRoute] No hay usuario -> redirigir a /")
    return <Navigate to="/" replace />
  }

  if (!emailConfirmed || !approved) {
    console.debug("[ProtectedRoute] Email no confirmado o cuenta no aprobada -> redirigir a /pendiente")
    return <Navigate to="/pendiente" replace />
  }

  console.debug("[ProtectedRoute] Acceso concedido")
  return <Outlet />
}