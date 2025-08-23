// src/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth'

// Helper robusto para castear booleanos que puedan venir como true/'true'/'t'/1
function toBool(v) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  if (typeof v === 'string') return ['true', 't', '1', 'yes', 'si', 'sí'].includes(v.toLowerCase())
  return false
}

export default function ProtectedRoute() {
  const location = useLocation()
  const { user, loading, emailConfirmed: emailConfirmedFromCtx, profile } = useAuth()

  // Fallbacks por si el perfil aún no cargó
  const userMeta = user?.user_metadata || {}

  // Normalizamos admin/aprobado desde profile o metadata
  const isAdmin = toBool(profile?.is_admin ?? userMeta?.is_admin)
  const approved = toBool(profile?.approved ?? userMeta?.approved)

  // Confirmación de email de forma defensiva (Supabase puede exponer distintos campos)
  const emailOk = Boolean(
    emailConfirmedFromCtx ??
    user?.email_confirmed_at ??
    user?.confirmed_at ??
    (Array.isArray(user?.identities) && user.identities.some(i => i?.identity_data?.email_verified))
  )

  // 1) Mientras el contexto Auth esté resolviendo sesión/perfil
  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
        <span>Cargando…</span>
      </div>
    )
  }

  // 2) Sin usuario => a inicio (guardamos origen)
  if (!user) {
    console.debug('[ProtectedRoute] No hay usuario -> redirigir a /')
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // 3) Admin siempre entra
  if (isAdmin) {
    console.debug('[ProtectedRoute] Admin detectado -> acceso concedido')
    return <Outlet />
  }

  // 4) Email no verificado/creado -> mostramos aviso (sin redirección para evitar bucles)
  if (!emailOk) {
    console.debug('[ProtectedRoute] Email no creado -> bloquear acceso', { emailOk, approved })
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:'1rem' }}>
        <div style={{ maxWidth: 560, width:'100%', textAlign:'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>Email no creado</h1>
          <p style={{ color: '#475569' }}>
            Tu dirección de correo aún no está verificada/creada. Por favor, revisa tu bandeja y completa el proceso.
          </p>
          <div style={{ marginTop: 16 }}>
            <a href="/" style={{ padding:'8px 12px', border:'1px solid #cbd5e1', borderRadius:8, textDecoration:'none' }}>
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    )
  }

  // 5) Email ok pero no aprobado por admin => redirigimos a /pendiente (guardando origen)
  if (emailOk && !approved) {
    console.debug('[ProtectedRoute] Cuenta no aprobada -> /pendiente', { emailOk, approved })
    return <Navigate to="/pendiente" state={{ from: location }} replace />
  }

  // 6) Todo correcto
  console.debug('[ProtectedRoute] Acceso concedido')
  return <Outlet />
}