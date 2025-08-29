// src/auth.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const unsubRef = useRef(null);
  const loadingProfileRef = useRef(false);

  async function loadProfile(uid) {
    if (!uid || loadingProfileRef.current) return;
    loadingProfileRef.current = true;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,nombre,apellidos,rol,unidad,approved,is_admin,updated_at")
        .eq("id", uid)
        .maybeSingle();

      if (error) {
        console.warn("[Auth] loadProfile error:", error);
        setProfile(null);
        return;
      }
      setProfile(data ?? null);
    } finally {
      loadingProfileRef.current = false;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      console.log("[Auth] init start");
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
        if (sess?.user?.id) loadProfile(sess.user.id);

        // 3) Suscripción a cambios de auth
        try { unsubRef.current?.subscription?.unsubscribe?.(); } catch {}
        const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSess) => {
          if (!mounted) return;
          setSession(newSess ?? null);
          const uid = newSess?.user?.id;
          if (uid) await loadProfile(uid); else setProfile(null);
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

  const value = useMemo(() => ({
    ready,
    session,
    profile,
    refreshProfile: async () => {
      const uid = session?.user?.id;
      if (uid) await loadProfile(uid);
    },
  }), [ready, session, profile]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}