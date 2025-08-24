// src/auth.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext({ ready: false, session: null, profile: null });

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  // Exponer estado para depuración rápida en consola
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
    let timeoutId;

    async function boot() {
      console.debug("[Auth] boot start");
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("[Auth] getSession error:", error);

        const sess = data?.session ?? null;
        if (!mounted) return;
        setSession(sess);
        console.debug("[Auth] getSession -> hasSession:", !!sess, "email:", sess?.user?.email);

        if (sess) {
          // Carga de perfil (NO bloqueante)
          const { data: prof, error: pErr } = await supabase
            .from("profiles")
            .select("id, nombre, apellidos, rol, unidad, approved, is_admin, updated_at")
            .eq("id", sess.user.id)
            .maybeSingle();

          if (pErr) console.warn("[Auth] profile select error:", pErr);
          if (mounted) setProfile(prof ?? null);
        } else {
          if (mounted) setProfile(null);
        }
      } catch (e) {
        console.error("[Auth] boot catch:", e);
      } finally {
        if (mounted) {
          setReady(true);
          console.debug("[Auth] boot finished -> ready=true");
        }
      }
    }

    // Corte de seguridad: nunca quedarnos colgados más de 5s
    timeoutId = setTimeout(() => {
      if (!ready) {
        console.warn("[Auth] timeout 5s -> forzando ready=true (evitar spinner infinito)");
        setReady(true);
      }
    }, 5000);

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((evt, newSess) => {
      if (!mounted) return;
      console.debug("[Auth] onAuthStateChange:", evt, "hasSession:", !!newSess);
      setSession(newSess ?? null);
      if (!newSess) setProfile(null);
    });

    return () => {
      mounted = false;
      try { sub?.subscription?.unsubscribe?.(); } catch {}
      clearTimeout(timeoutId);
    };
  }, []);

  const value = useMemo(() => ({ ready, session, profile }), [ready, session, profile]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}