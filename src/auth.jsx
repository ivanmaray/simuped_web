// src/auth.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

/**
 * Expone en el contexto:
 * - user: usuario de Supabase (o null)
 * - loading: cargando sesión/perfil
 * - profile: fila de public.profiles (o null)
 * - approved: booleano (si el perfil está aprobado)
 * - emailConfirmed: booleano (si el email está confirmado)
 */
const AuthContext = createContext({ user: null, loading: true, profile: null, approved: false, emailConfirmed: false })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [approved, setApproved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [emailConfirmed, setEmailConfirmed] = useState(false)

  // Carga inicial de sesión
  useEffect(() => {
    let mounted = true

    async function loadSessionAndProfile() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted) return
        if (error) {
          console.error('[Auth] getSession error:', error)
        }
        const u = data?.session?.user ?? null
        setUser(u)
        setEmailConfirmed(Boolean(u?.email_confirmed_at))

        if (u) {
          // Cargar perfil
          const { data: prof, error: perr } = await supabase
            .from('profiles')
            .select('id, nombre, apellidos, rol, unidad, dni, areas_interes, approved, is_admin')
            .eq('id', u.id)
            .maybeSingle()

          if (perr) {
            console.error('[Auth] profiles select error:', perr)
            setProfile(null)
            setApproved(false)
          } else {
            setProfile(prof ?? null)
            setApproved(Boolean(prof?.approved))
          }
        } else {
          setProfile(null)
          setApproved(false)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadSessionAndProfile()

    // Suscripción a cambios (login/logout/refresh)
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      setEmailConfirmed(Boolean(u?.email_confirmed_at))
      // Cuando cambie el usuario, recarga perfil
      ;(async () => {
        if (u) {
          const { data: prof, error } = await supabase
            .from('profiles')
            .select('id, nombre, apellidos, rol, unidad, dni, areas_interes, approved, is_admin')
            .eq('id', u.id)
            .maybeSingle()
          if (error) {
            console.error('[Auth] profiles select (onAuthStateChange) error:', error)
            setProfile(null)
            setApproved(false)
          } else {
            setProfile(prof ?? null)
            setApproved(Boolean(prof?.approved))
          }
        } else {
          setProfile(null)
          setApproved(false)
        }
      })()
    })

    return () => {
      mounted = false
      try { subscription.subscription.unsubscribe() } catch {}
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, profile, approved, emailConfirmed }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}