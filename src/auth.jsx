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

    async function hydrateSessionFromUrl() {
      if (typeof window === "undefined") return;
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.get("code"); // PKCE / email OTP con ?code=
        const hasError = url.searchParams.get("error");
        const hasHashAccessToken = window.location.hash.includes("access_token="); // email magic-link con #access_token

        if (hasError) {
          console.warn("[Auth] auth error in URL:", url.searchParams.get("error_description") || hasError);
        }

        // 1) Flujos con ?code= requieren el intercambio explícito
        if (hasCode) {
          try {
            await supabase.auth.exchangeCodeForSession(window.location.href);
          } catch (ex) {
            console.warn("[Auth] exchangeCodeForSession failed:", ex);
          }
        }

        // 2) Para los magic-link con #access_token, el cliente del browser ya lo procesa
        // al llamar a getSession() por primera vez, pero lo dejamos claro en el orden.

        // 3) Limpiar la URL (sin query ni hash) para evitar re-intentos/errores visuales
        if (hasCode || hasHashAccessToken || hasError) {
          try {
            const clean = url.origin + url.pathname; // conserva ruta base
            window.history.replaceState({}, "", clean);
          } catch {}
        }
      } catch (e) {
        console.warn("[Auth] hydrateSessionFromUrl throw:", e);
      }
    }

    async function init() {
      await hydrateSessionFromUrl();

      // 1) Hidratar sesión inicial
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) console.warn("[Auth] getSession error:", error);
        const sess = data?.session ?? null;
        setSession(sess);
        if (sess?.user?.id) await loadProfile(sess.user.id);
        else setProfile(null);
      } catch (e) {
        if (mounted) {
          console.warn("[Auth] getSession throw:", e);
          setSession(null);
          setProfile(null);
        }
      } finally {
        // ✅ `ready` se marca al terminar la hidratación inicial (evita parpadeos de UI)
        if (mounted) setReady(true);
      }

      // 2) Suscribirse a cambios de autenticación
      const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSess) => {
        if (!mounted) return;
        setSession(newSess ?? null);
        if (newSess?.user?.id) await loadProfile(newSess.user.id);
        else setProfile(null);
      });

      return () => {
        try { sub?.subscription?.unsubscribe?.(); } catch {}
      };
    }

    const cleanup = init();

    return () => {
      mounted = false;
      // ejecutar el cleanup del onAuthStateChange si llega a ser una promesa que devuelve función
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  const value = useMemo(() => ({ ready, session, profile }), [ready, session, profile]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}