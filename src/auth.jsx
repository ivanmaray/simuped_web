// src/auth.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [approved, setApproved] = useState(null); // null = aún no sabemos
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carga inicial + suscripción a cambios de sesión
  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        setLoading(true);
        const { data: s } = await supabase.auth.getSession();
        const session = s?.session ?? null;
        const u = session?.user ?? null;
        if (!mounted) return;

        setUser(u);
        setEmailConfirmed(Boolean(u?.email_confirmed_at)); // si no está, será false

        if (u) {
          // Trae approved y is_admin de profiles (RLS: la política debe permitir leer tu propia fila)
          const { data, error } = await supabase
            .from("profiles")
            .select("approved,is_admin")
            .eq("id", u.id)
            .maybeSingle();

          if (error) {
            console.warn("[Auth] error loading profile:", error);
            // Cuando no se puede leer, pon approved=null -> ProtectedRoute te llevará a /pendiente
            setApproved(null);
            setIsAdmin(false);
          } else {
            setApproved(Boolean(data?.approved));
            setIsAdmin(Boolean(data?.is_admin));
          }
        } else {
          // Sin user
          setApproved(null);
          setIsAdmin(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    hydrate();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      const u = sess?.user ?? null;
      setUser(u);
      setEmailConfirmed(Boolean(u?.email_confirmed_at));

      if (u) {
        const { data, error } = await supabase
          .from("profiles")
          .select("approved,is_admin")
          .eq("id", u.id)
          .maybeSingle();

        if (error) {
          console.warn("[Auth] error loading profile:", error);
          setApproved(null);
          setIsAdmin(false);
        } else {
          setApproved(Boolean(data?.approved));
          setIsAdmin(Boolean(data?.is_admin));
        }
      } else {
        setApproved(null);
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      emailConfirmed,
      approved,  // true/false/null
      isAdmin,
      loading,
      async signOut() {
        await supabase.auth.signOut({ scope: "global" }).catch(() => {});
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      },
    }),
    [user, emailConfirmed, approved, isAdmin, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}