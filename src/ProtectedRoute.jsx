// src/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
        <span>Cargando…</span>
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />
  return <Outlet />
}