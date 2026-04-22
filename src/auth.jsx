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
    let sessData;
    try {
      ({ data: sessData } = await withTimeout(supabase.auth.getSession(), 6000, 'getSession'));
    } catch (e) {
      console.warn('[Auth] getSession timeout in readAuthUser:', e?.message || e);
      return null;
    }
    const hasSession = !!sessData?.session;
    if (!hasSession) {
      setEmailConfirmedAt(null);
      return null;
    }

    // Intento con 1 reintento si el error es un 403 posiblemente transitorio
    // (token en refresh, latencia de red, etc.). Solo cerramos sesión local si
    // el segundo intento también falla con un error claramente fatal.
    async function callGetUser() {
      return await withTimeout(supabase.auth.getUser(), 6000, 'getUser');
    }

    let data, error;
    try {
      ({ data, error } = await callGetUser());
    } catch (e) {
      console.warn('[Auth] getUser timeout/throw:', e?.message || e);
      return null;
    }
    if (error) {
      const msg1 = (error.message || "").toLowerCase();
      const looksFatal = msg1.includes("sub claim") || msg1.includes("does not exist");
      const transient = error.status === 403 && !looksFatal;
      if (transient) {
        try { console.debug("[Auth] getUser 403 transitorio, reintentando…"); } catch {}
        // breve espera (300ms) para dejar acabar un posible refresh en curso
        await new Promise((r) => setTimeout(r, 300));
        ({ data, error } = await callGetUser());
      }
    }

    if (error) {
      try { console.debug("[Auth] getUser error (non-fatal):", error); } catch {}
      const msg = (error.message || "").toLowerCase();
      const fatal = msg.includes("sub claim") || msg.includes("does not exist");
      if (fatal) {
        // Token apunta a un usuario que ya no existe en Auth → limpiar sesión local
        try { await supabase.auth.signOut({ scope: "local" }); } catch {}
        clearBrokenSessionStorage();
        setSession(null);
        setProfile(null);
        setEmailConfirmedAt(null);
      } else {
        // 403 transitorio persistente u otro error: no cerramos sesión,
        // solo dejamos emailConfirmedAt como estaba (o null si no teníamos).
        setEmailConfirmedAt((prev) => prev ?? null);
      }
      return null;
    }
    const u = data?.user ?? null;
    setEmailConfirmedAt(u?.email_confirmed_at ?? null);
    return u;
  }, []);

  // Race a promise against a timeout; rejects if the promise doesn't settle in time.
  function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        reject(new Error(`${label || 'operation'}_timeout_${ms}ms`));
      }, ms);
      promise.then(
        (v) => { clearTimeout(t); resolve(v); },
        (e) => { clearTimeout(t); reject(e); }
      );
    });
  }

  // Carga el perfil desde RLS; si no existe, lo crea (upsert) con id/email del auth user.
  // force=true permite saltarse el guard in-flight (útil para reintentos manuales).
  const loadProfile = useCallback(async (uid, email, { force = false } = {}) => {
    if (!uid) return;
    if (loadingProfileRef.current && !force) return;
    loadingProfileRef.current = true;
    try {
      const sel = "id,email,nombre,apellidos,rol,unidad,approved,approved_at,is_admin,updated_at";
      const { data, error, status } = await withTimeout(
        supabase.from("profiles").select(sel).eq("id", uid).maybeSingle(),
        10000,
        'loadProfile_select'
      );

      if (!error && data) {
        setProfile(data);
        return;
      }

      // Si no hay fila (status 406 / data null), intentamos crear el perfil mínimo.
      const missing = (!data && !error) || status === 406 || (error && (error.code === "PGRST116"));
      if (missing) {
        log("profile missing, creating minimal row for", uid);
        const { data: up, error: upErr } = await withTimeout(
          supabase.from("profiles").upsert({ id: uid, email: email ?? null }, { onConflict: "id" }).select(sel).maybeSingle(),
          10000,
          'loadProfile_upsert'
        );

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
    } catch (e) {
      // Timeout u otro error de red: no dejes la app colgada, permite reintento.
      console.warn("[Auth] loadProfile failed:", e?.message || e);
      setProfile(null);
    } finally {
      loadingProfileRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Safety net: si algo en init() se cuelga (red, supabase down), liberamos
    // la UI tras 10s para que ProtectedRoute pueda mostrar su fallback de
    // "Cargando perfil…" o redirigir a "/" en vez de quedar en "Cargando…".
    const readyFallback = setTimeout(() => {
      if (!mounted) return;
      console.warn('[Auth] init stalled >10s, forcing ready=true');
      setReady(true);
    }, 10000);

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
          // Detect recovery flow: hash may carry type=recovery, or query may have type=recovery
          const hashType = hasHashAccessToken
            ? new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type')
            : null;
          const isRecoveryFlow = hashType === 'recovery' || url.searchParams.get('type') === 'recovery';

          if (hasError) console.warn("[Auth] auth error in URL:", url.searchParams.get("error_description") || hasError);

          if (hasCode) {
            try {
              // PKCE flow: exchange authorization code for session
              const code = url.searchParams.get("code");
              await supabase.auth.exchangeCodeForSession(code);
              console.log("[Auth] exchangeCodeForSession OK");
            } catch (ex) {
              console.warn("[Auth] exchangeCodeForSession failed:", ex);
            }
          } else if (hasHashAccessToken) {
            // Implicit / magic-link / recovery flows deliver tokens in the hash fragment.
            // Note: supabase client with detectSessionInUrl:true may handle this automatically,
            // but we process it explicitly as a safety net.
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
              // Clean auth params from URL but preserve app params (set_password, etc.)
              const cleanUrl = new URL(url.origin + url.pathname);
              const authParams = new Set(['code', 'error', 'error_description', 'error_code']);
              for (const [k, v] of url.searchParams.entries()) {
                if (!authParams.has(k)) cleanUrl.searchParams.set(k, v);
              }
              // If this was a recovery flow, ensure set_password flag is present for profile page
              if (isRecoveryFlow && !cleanUrl.searchParams.has('set_password')) {
                cleanUrl.searchParams.set('set_password', '1');
              }
              window.history.replaceState({}, "", cleanUrl.toString());
              console.log("[Auth] URL cleaned after hydration:", cleanUrl.pathname + cleanUrl.search);
            } catch {}
          }
        } catch {}

        // 2) Carga sesión actual (con timeout para no bloquear init)
        let sessRes;
        try {
          ({ data: sessRes } = await withTimeout(supabase.auth.getSession(), 6000, 'init_getSession'));
        } catch (e) {
          console.warn('[Auth] init getSession timeout:', e?.message || e);
          sessRes = null;
        }
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
        clearTimeout(readyFallback);
        if (mounted) setReady(true);
      }
    }

    init();

    // Revalidar al volver a la pestaña (tokens caducados tras background, etc.)
    let lastVisibleAt = Date.now();
    async function onVisibilityChange() {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
        lastVisibleAt = Date.now();
        return;
      }
      const awaySecs = Math.floor((Date.now() - lastVisibleAt) / 1000);
      lastVisibleAt = Date.now();
      // Solo revalida si la pestaña ha estado oculta más de 60 s
      if (awaySecs < 60) return;
      try {
        const { data: sessRes } = await supabase.auth.getSession();
        const sess = sessRes?.session ?? null;
        if (!mounted) return;
        setSession(sess);
        if (sess?.user) {
          await readAuthUser();
          await loadProfile(sess.user.id, sess.user.email || null, { force: true });
        }
      } catch (e) {
        console.warn('[Auth] visibility revalidation failed:', e?.message || e);
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      mounted = false;
      clearTimeout(readyFallback);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      try { unsubRef.current?.subscription?.unsubscribe?.(); } catch {}
    };
  }, [loadProfile, readAuthUser]);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    const email = session?.user?.email || null;
    if (uid) await loadProfile(uid, email, { force: true });
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
