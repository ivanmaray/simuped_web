// src/auth.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  async function readAuthUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn("[Auth] getUser error:", error);
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
  }

  // Carga el perfil desde RLS; si no existe, lo crea (upsert) con id/email del auth user.
  async function loadProfile(uid, email) {
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
  }

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
          }

          if (hasCode || hasHashAccessToken || hasError) {
            try {
              const clean = url.origin + url.pathname;
              window.history.replaceState({}, "", clean);
              console.log("[Auth] URL cleaned after hydration");
            } catch {}
          }
        } catch {}

        // 2) Carga sesión actual
        const { data: sessRes } = await supabase.auth.getSession();
        const sess = sessRes?.session ?? null;
        if (!mounted) return;
        setSession(sess);
        log("session user:", sess?.user?.id, sess?.user?.email);
        const u = await readAuthUser();
        const uidToLoad = u?.id || sess?.user?.id;
        const emailToLoad = u?.email || sess?.user?.email || null;
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
          await readAuthUser();
          const uid = newSess?.user?.id;
          const email = newSess?.user?.email || null;
          if (uid) await loadProfile(uid, email); else setProfile(null);
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
  }, []);

  const value = useMemo(() => {
    const emailConfirmed = !!emailConfirmedAt;
    return {
      ready,
      session,
      profile,
      emailConfirmedAt,
      emailConfirmed,
      refreshProfile: async () => {
        const uid = session?.user?.id;
        const email = session?.user?.email || null;
        if (uid) await loadProfile(uid, email);
      },
      refreshAuthUser: async () => { await readAuthUser(); },
    };
  }, [ready, session, profile, emailConfirmedAt]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}