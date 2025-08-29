// src/auth.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext({
  ready: false,
  session: null,
  profile: null,
  emailConfirmed: false,
});

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  // Exponer en ventana para depuración rápida
  if (typeof window !== "undefined") {
    try {
      window.__auth = {
        get ready() {
          return ready;
        },
        get session() {
          return session;
        },
        get profile() {
          return profile;
        },
        get emailConfirmed() {
          const u = session?.user || {};
          return !!(u.email_confirmed_at || u.confirmed_at || u?.user_metadata?.email_confirmed);
        },
      };
    } catch {}
  }

  useEffect(() => {
    let mounted = true;
    let unsubscribeAuth = null; // <- guardamos aquí para limpiar correctamente

    const log = (...a) => console.log("[Auth]", ...a);
    const warn = (...a) => console.warn("[Auth]", ...a);

    async function loadProfile(uid) {
      log("loadProfile uid=", uid);
      try {
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select("id, email, nombre, apellidos, rol, unidad, approved, is_admin, updated_at")
          .eq("id", uid)
          .maybeSingle();

        if (pErr) warn("profile select error:", pErr);
        if (!mounted) return;

        setProfile(
          prof
            ? {
                ...prof,
                approved: !!prof.approved,
                is_admin: !!prof.is_admin,
              }
            : null
        );
      } catch (e) {
        warn("profile select throw:", e);
        if (mounted) setProfile(null);
      }
    }

    async function hydrateFromUrl() {
      if (typeof window === "undefined") return false;
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.get("code"); // ?code= de verificación/PKCE
        const hasError = url.searchParams.get("error");
        const hasHashAccessToken = window.location.hash.includes("access_token="); // #access_token de magic-link

        if (hasError) warn("auth error in URL:", url.searchParams.get("error_description") || hasError);

        if (hasCode) {
          log("exchangeCodeForSession (code en URL)...");
          try {
            await supabase.auth.exchangeCodeForSession(window.location.href);
            log("exchangeCodeForSession OK");
          } catch (ex) {
            warn("exchangeCodeForSession failed:", ex);
          }
        }

        // Limpia URL si venía con credenciales
        if (hasCode || hasHashAccessToken || hasError) {
          try {
            const clean = url.origin + url.pathname;
            window.history.replaceState({}, "", clean);
            log("URL limpiada tras hidratación");
          } catch {}
        }

        return !!(hasCode || hasHashAccessToken);
      } catch (e) {
        warn("hydrateFromUrl throw:", e);
        return false;
      }
    }

    async function init() {
      log("init start");
      const hadTokensInUrl = await hydrateFromUrl();

      // 1) Obtener sesión
      try {
        const { data, error } = await supabase.auth.getSession();
        log("getSession returned", !!data?.session);
        if (!mounted) return;
        if (error) warn("getSession error:", error);
        const sess = data?.session ?? null;
        setSession(sess);
        log("getSession ->", !!sess, sess?.user?.id);

        if (sess?.user?.id) {
          log("getSession found user:", sess.user.id);
          await loadProfile(sess.user.id);
        } else if (hadTokensInUrl) {
          log("no user yet, hadTokensInUrl -> retrying getSession in 150ms");
          // Espera breve y reintenta una vez (algunos navegadores aplican la sesión unos ms después)
          await new Promise((r) => setTimeout(r, 150));
          const { data: d2 } = await supabase.auth.getSession();
          const s2 = d2?.session ?? null;
          setSession(s2);
          log("retry getSession resolved:", !!s2, s2?.user?.id);
          if (s2?.user?.id) {
            log("retry loadProfile for:", s2.user.id);
            await loadProfile(s2.user.id);
          }
        } else {
          log("getSession: no user and no tokens in URL -> profile=null");
          setProfile(null);
        }
      } catch (e) {
        warn("getSession throw:", e);
        if (mounted) {
          setSession(null);
          setProfile(null);
        }
      } 
      finally {
        if (mounted) {
          // Marcamos ready solo después de haber resuelto sesión y perfil
          const hasUser = !!(session?.user?.id);
          const hasProfile = !!profile;
          log("ready=true", { hasUser, hasProfile });
          setReady(true);
        }
      }

      // 2) Suscribirse a cambios de autenticación (y guardar unsubscribe real)
      const { data: sub } = supabase.auth.onAuthStateChange(async (evt, newSess) => {
        if (!mounted) return;
        log("onAuthStateChange:", evt, { hasSession: !!newSess, user: newSess?.user?.id });
        setSession(newSess ?? null);
        if (newSess?.user?.id) {
          log("auth change -> loadProfile:", newSess.user.id);
          await loadProfile(newSess.user.id);
        }
        else setProfile(null);
      });
      unsubscribeAuth = () => {
        try {
          sub?.subscription?.unsubscribe?.();
        } catch {}
      };
    }

    init();

    return () => {
      mounted = false;
      // limpiar suscripción correctamente
      if (typeof unsubscribeAuth === "function") unsubscribeAuth();
    };
  }, []);

  // Detección robusta de email confirmado
  const emailConfirmed = (() => {
    const u = session?.user || {};
    return !!(u.email_confirmed_at || u.confirmed_at || u?.user_metadata?.email_confirmed);
  })();

  const value = useMemo(
    () => ({ ready, session, profile, emailConfirmed }),
    [ready, session, profile, emailConfirmed]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}