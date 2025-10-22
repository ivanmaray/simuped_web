// src/auth.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

const log = (...args) => { try { console.debug("[Auth]", ...args); } catch {} };

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [emailConfirmedAt, setEmailConfirmedAt] = useState(null);

  const unsubRef = useRef(null);
  const loadingProfileRef = useRef(false);

  function clearBrokenSessionStorage() {
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('sb-')) localStorage.removeItem(k);
      }
    } catch {}
    try {
      const keys = Object.keys(sessionStorage);
      for (const k of keys) {
        if (k.startsWith('sb-')) sessionStorage.removeItem(k);
      }
    } catch {}
  }

  // Helper to read the auth user and set email confirmation timestamp
  const readAuthUser = useCallback(async () => {
    // Do not call getUser if there's no active session to avoid AuthSessionMissingError
    const { data: sessData } = await supabase.auth.getSession();
    const hasSession = !!sessData?.session;
    if (!hasSession) {
      setEmailConfirmedAt(null);
      return null;
    }

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      try { console.debug("[Auth] getUser error (non-fatal):", error); } catch {}
      const msg = (error.message || "").toLowerCase();
      if (error.status === 403 || msg.includes("sub claim") || msg.includes("does not exist")) {
        // Token apunta a un usuario que ya no existe en Auth → limpiar sesión local
        try { await supabase.auth.signOut({ scope: "local" }); } catch {}
        clearBrokenSessionStorage();
        setSession(null);
        setProfile(null);
        setEmailConfirmedAt(null);
      } else {
        setEmailConfirmedAt(null);
      }
      return null;
    }
    const u = data?.user ?? null;
    setEmailConfirmedAt(u?.email_confirmed_at ?? null);
    return u;
  }, []);

  // Carga el perfil desde RLS; si no existe, lo crea (upsert) con id/email del auth user.
  const loadProfile = useCallback(async (uid, email) => {
    if (!uid || loadingProfileRef.current) return;
    loadingProfileRef.current = true;
    try {
      const sel = "id,email,nombre,apellidos,rol,unidad,approved,approved_at,is_admin,updated_at";
      const { data, error, status } = await supabase
        .from("profiles")
        .select(sel)
        .eq("id", uid)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        return;
      }

      // Si no hay fila (status 406 / data null), intentamos crear el perfil mínimo.
      const missing = (!data && !error) || status === 406 || (error && (error.code === "PGRST116"));
      if (missing) {
        log("profile missing, creating minimal row for", uid);
        const { data: up, error: upErr } = await supabase
          .from("profiles")
          .upsert({ id: uid, email: email ?? null }, { onConflict: "id" })
          .select(sel)
          .maybeSingle();

        if (upErr) {
          console.warn("[Auth] upsert profile failed:", upErr);
          setProfile(null);
          return;
        }
        setProfile(up ?? null);
        return;
      }

      // Otros errores (p.ej. 500 por CHECK/RLS) → no bloquear app, seguir sin perfil
      if (error) {
        console.warn("[Auth] loadProfile error:", error);
        setProfile(null);
      }
    } finally {
      loadingProfileRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      console.log("[Auth] init start");
      log("Supabase URL:", supabase?.rest?.url ?? "(unknown)");
      try {
        // 1) Intenta hidratar credenciales desde la URL si procede
        try {
          const url = new URL(window.location.href);
          const hasCode = url.searchParams.get("code");
          const hasError = url.searchParams.get("error");
          const hasHashAccessToken = window.location.hash.includes("access_token=");

          if (hasError) console.warn("[Auth] auth error in URL:", url.searchParams.get("error_description") || hasError);

          if (hasCode) {
            try {
              await supabase.auth.exchangeCodeForSession(window.location.href);
              console.log("[Auth] exchangeCodeForSession OK");
            } catch (ex) {
              console.warn("[Auth] exchangeCodeForSession failed:", ex);
            }
          } else if (hasHashAccessToken) {
            // Magic link and recovery flows deliver tokens in the hash fragment.
            try {
              const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
              const params = new URLSearchParams(hash);
              const access_token = params.get('access_token');
              const refresh_token = params.get('refresh_token');
              if (access_token && refresh_token) {
                const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
                if (setErr) console.warn('[Auth] setSession from hash failed:', setErr);
                else console.log('[Auth] setSession from hash OK');
              }
            } catch (ex) {
              console.warn('[Auth] parse hash tokens failed:', ex);
            }
          }

          if (hasCode || hasHashAccessToken || hasError) {
            try {
              const clean = url.origin + url.pathname + (url.search ? url.search.replace(/([?&])(code|error|type)=[^&]*/g, '$1').replace(/[?&]$/, '') : '');
              window.history.replaceState({}, "", clean);
              console.log("[Auth] URL cleaned after hydration");
            } catch {}
          }
        } catch {}

        // 2) Carga sesión actual
        const { data: sessRes } = await supabase.auth.getSession();
        const sess = sessRes ?? null;
        if (!mounted) return;
        setSession(sess?.session ?? null);
        log("session user:", sess?.session?.user?.id, sess?.session?.user?.email);

        let uidToLoad = null;
        let emailToLoad = null;

        if (sess?.session?.user) {
          // We have a session; optionally refresh user info
          const u = await readAuthUser();
          uidToLoad = (u?.id) || sess.session.user.id;
          emailToLoad = (u?.email) || sess.session.user.email || null;
        } else {
          // No session yet; skip readAuthUser to avoid warnings
          uidToLoad = null;
          emailToLoad = null;
        }

        if (uidToLoad) loadProfile(uidToLoad, emailToLoad);

        // 3) Suscripción a cambios de auth
        try { unsubRef.current?.subscription?.unsubscribe?.(); } catch {}
        const { data: sub } = supabase.auth.onAuthStateChange(async (evt, newSess) => {
          if (!mounted) return;
          setSession(newSess ?? null);
          if (evt === 'SIGNED_OUT') {
            setProfile(null);
            setEmailConfirmedAt(null);
            return;
          }
          if (newSess?.user) {
            await readAuthUser();
            const uid = newSess.user.id;
            const email = newSess.user.email || null;
            await loadProfile(uid, email);
          } else {
            setProfile(null);
            setEmailConfirmedAt(null);
          }
        });
        unsubRef.current = sub;
      } finally {
        // ¡Muy importante! No bloquear UI: marcamos ready aunque el perfil aún esté cargando
        if (mounted) setReady(true);
      }
    }

    init();
    return () => {
      mounted = false;
      try { unsubRef.current?.subscription?.unsubscribe?.(); } catch {}
    };
  }, [loadProfile, readAuthUser]);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    const email = session?.user?.email || null;
    if (uid) await loadProfile(uid, email);
  }, [session, loadProfile]);

  const refreshAuthUser = useCallback(async () => {
    await readAuthUser();
  }, [readAuthUser]);

  const value = useMemo(() => {
    const emailConfirmed = !!emailConfirmedAt;
    const user = session?.user ?? null;
    const metaIsAdmin = Boolean(user?.user_metadata?.is_admin || user?.app_metadata?.is_admin);
    const profileIsAdmin = profile?.is_admin === true;
    const isAdmin = metaIsAdmin || profileIsAdmin;
    const approved = profile?.approved === true;
    const rawRole = profile?.rol ?? user?.user_metadata?.rol ?? user?.app_metadata?.rol ?? "";
    const role = typeof rawRole === "string" ? rawRole : "";

    return {
      ready,
      session,
      user,
      profile,
      emailConfirmedAt,
      emailConfirmed,
      isAdmin,
      approved,
      role,
      refreshProfile,
      refreshAuthUser,
    };
  }, [ready, session, profile, emailConfirmedAt, refreshProfile, refreshAuthUser]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function useOptionalAuth() {
  return useContext(AuthCtx);
}
