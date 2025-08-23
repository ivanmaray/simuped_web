// src/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth'

export default function ProtectedRoute() {
  const location = useLocation()
  const { user, loading, emailConfirmed: emailConfirmedFromCtx, profile } = useAuth()

  // Fallbacks por si el perfil aún no cargó
  const userMeta = user?.user_metadata || {}
  const isAdmin = (profile?.is_admin ?? userMeta?.is_admin) === true
  const approved = (profile?.approved ?? userMeta?.approved) === true

  // Confirmación de email de forma defensiva
  const emailOk = Boolean(
    emailConfirmedFromCtx ??
    user?.email_confirmed_at ??
    user?.confirmed_at ??
    (Array.isArray(user?.identities) && user.identities.some(i => i?.identity_data?.email_verified))
  )

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
        <span>Cargando…</span>
      </div>
    )
  }

  if (!user) {
    console.debug('[ProtectedRoute] No hay usuario -> redirigir a /')
    // Guarda la ruta previa para poder volver tras aprobar/verificar
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Admin siempre entra
  if (isAdmin) {
    console.debug('[ProtectedRoute] Admin detectado -> acceso concedido')
    return <Outlet />
  }

  // Resto de usuarios: requieren email verificado y aprobación
  if (!emailOk) {
    console.debug('[ProtectedRoute] Email no creado -> mostrar mensaje', { emailOk, approved })
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
        <span>Email no creado</span>
      </div>
    )
  }

  if (emailOk && !approved) {
    console.debug('[ProtectedRoute] Cuenta no aprobada -> /pendiente', { emailOk, approved })
    // Guarda la ruta previa para poder volver tras aprobar/verificar
    return <Navigate to="/pendiente" state={{ from: location }} replace />
  }

  console.debug('[ProtectedRoute] Acceso concedido')
  return <Outlet />
}