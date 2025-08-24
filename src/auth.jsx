// src/auth.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

// Mantiene la misma forma del contexto para no romper consumidores
const AuthCtx = createContext({ ready: false, session: null, profile: null });

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  // Exponer estado para depuración rápida en consola (sin romper nada)
  if (typeof window !== "undefined") {
    try {
      Object.defineProperty(window, "__auth", {
        configurable: true,
        value: {
          get ready() { return ready; },
          get session() { return session; },
          get profile() { return profile; },
        },
      });
    } catch {}
  }

  useEffect(() => {
    let mounted = true;
    setReady(true); // ✅ Provider optimista: no bloqueamos la UI

    async function loadProfile(uid) {
      try {
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select("id, nombre, apellidos, rol, unidad, approved, is_admin, updated_at")
          .eq("id", uid)
          .maybeSingle();
        if (pErr) console.warn("[Auth] profile select error:", pErr);
        if (mounted) setProfile(prof ?? null);
      } catch (e) {
        console.warn("[Auth] profile select throw:", e);
        if (mounted) setProfile(null);
      }
    }

    // 1) Hidratar sesión en 2º plano (no bloquea)
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) console.warn("[Auth] getSession error:", error);
        const sess = data?.session ?? null;
        setSession(sess);
        if (sess?.user?.id) loadProfile(sess.user.id);
        else setProfile(null);
      })
      .catch((e) => {
        if (mounted) {
          console.warn("[Auth] getSession throw:", e);
          setSession(null);
          setProfile(null);
        }
      });

    // 2) Suscribirse a cambios de autenticación
    const { data } = supabase.auth.onAuthStateChange((_evt, newSess) => {
      if (!mounted) return;
      setSession(newSess ?? null);
      if (newSess?.user?.id) loadProfile(newSess.user.id);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      try { data?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  const value = useMemo(() => ({ ready, session, profile }), [ready, session, profile]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}