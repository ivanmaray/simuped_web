// src/auth.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // Sesión actual
      const { data: sessData } = await supabase.auth.getSession();
      const session = sessData?.session ?? null;
      const u = session?.user ?? null;
      if (!mounted) return;

      setUser(u);
      setEmailConfirmed(!!u?.email_confirmed_at);

      if (u) {
        // Perfil (approved, is_admin, etc.)
        const { data: prof } = await supabase
          .from("profiles")
          .select("approved, is_admin")
          .eq("id", u.id)
          .maybeSingle();

        setApproved(!!prof?.approved);
        setIsAdmin(!!prof?.is_admin);
      } else {
        setApproved(false);
        setIsAdmin(false);
      }

      setLoading(false);
    }

    load();

    // Suscribirse a cambios de auth
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      const u = sess?.user ?? null;
      setUser(u);
      setEmailConfirmed(!!u?.email_confirmed_at);

      if (u) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("approved, is_admin")
          .eq("id", u.id)
          .maybeSingle();

        setApproved(!!prof?.approved);
        setIsAdmin(!!prof?.is_admin);
      } else {
        setApproved(false);
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      try { sub?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  const value = { user, emailConfirmed, approved, isAdmin, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export default AuthProvider;